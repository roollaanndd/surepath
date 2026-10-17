import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowRight, Banknote,
  BriefcaseBusiness, Building2, CalendarClock, CheckCircle2, ChevronRight,
  CircleDollarSign, ClipboardCheck, CreditCard, FileCheck2, FileClock, FileText,
  Gauge, HandCoins, LayoutDashboard, LoaderCircle, LockKeyhole, Plus, RefreshCw,
  Search, Settings2, ShieldCheck, Users, Wallet, X,
} from 'lucide-react';
import type { SitePageProps } from '../site/siteKit';
import { financingRequest, type FinancingApplication, type FinancingOverview, type FinancingProduct, type FinancingRow } from './financingCoreApi';

type ModuleKey = 'overview' | 'applications' | 'customers' | 'credit' | 'contracts' | 'disbursements' | 'repayments' | 'collections' | 'products' | 'reports' | 'settings';
const nav: { label: string; key: ModuleKey; icon: React.ElementType }[] = [
  { label: 'Overview', key: 'overview', icon: LayoutDashboard },
  { label: 'Applications', key: 'applications', icon: FileText },
  { label: 'Customers', key: 'customers', icon: Users },
  { label: 'Credit & risk', key: 'credit', icon: Gauge },
  { label: 'Contracts', key: 'contracts', icon: FileCheck2 },
  { label: 'Disbursements', key: 'disbursements', icon: Banknote },
  { label: 'Repayment ledger', key: 'repayments', icon: CreditCard },
  { label: 'Collections', key: 'collections', icon: HandCoins },
  { label: 'Products & pricing', key: 'products', icon: BriefcaseBusiness },
  { label: 'Reports & audit', key: 'reports', icon: Activity },
  { label: 'Settings', key: 'settings', icon: Settings2 },
];
const moduleTitle = Object.fromEntries(nav.map((item) => [item.key, item.label])) as Record<ModuleKey, string>;
const rupiah = (value: unknown) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateLabel = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusTone = (status: string) => {
  if (['approved', 'active', 'signed', 'settled', 'paid', 'resolved'].includes(status)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (['rejected', 'failed', 'written_off'].includes(status)) return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (['credit_review', 'pending_approval', 'overdue', 'high', 'critical'].includes(status)) return 'bg-amber-50 text-amber-800 ring-amber-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const FinancingCoreWorkspace: React.FC<SitePageProps> = () => {
  const [module, setModule] = useState<ModuleKey>('overview');
  const [health, setHealth] = useState<{ configured: boolean; mode?: string; persistence?: string } | null>(null);
  const [overview, setOverview] = useState<FinancingOverview | null>(null);
  const [products, setProducts] = useState<FinancingProduct[]>([]);
  const [applications, setApplications] = useState<FinancingApplication[]>([]);
  const [rows, setRows] = useState<FinancingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [productCode, setProductCode] = useState('MOTOR');
  const [amount, setAmount] = useState('250000000');
  const [tenor, setTenor] = useState('36');
  const [purpose, setPurpose] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async (currentModule: ModuleKey, quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const status = await financingRequest<any>('health');
      setHealth(status);
      if (!status.configured) {
        setOverview(null); setApplications([]); setProducts([]); setRows([]);
        setError('Backend belum dikonfigurasi. Tambahkan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY dan jalankan migration Financing Core sebelum memakai data persisten.');
        return;
      }
      const [productResult, overviewResult] = await Promise.all([
        financingRequest<{ data: FinancingProduct[] }>('products'),
        financingRequest<{ data: FinancingOverview }>('overview'),
      ]);
      setProducts(productResult.data || []);
      setOverview(overviewResult.data || null);
      const routes: Partial<Record<ModuleKey, string>> = {
        applications: 'applications', credit: 'applications', customers: 'customers',
        contracts: 'contracts', disbursements: 'disbursements', repayments: 'repayments',
        collections: 'collections', reports: 'audit-events',
      };
      if (routes[currentModule]) {
        const result = await financingRequest<{ data: any[] }>(routes[currentModule] as string, {
          query: currentModule === 'credit' ? { status: 'credit_review' } : undefined,
        });
        if (currentModule === 'applications' || currentModule === 'credit') setApplications(result.data || []);
        else setRows(result.data || []);
      } else if (currentModule === 'overview') {
        const result = await financingRequest<{ data: FinancingApplication[] }>('applications', { query: { limit: '8' } });
        setApplications(result.data || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Tidak dapat memuat Financing Core.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(module); }, [module, load]);

  const filteredApplications = useMemo(() => applications.filter((item) => {
    const text = [item.application_number, item.customer?.display_name, item.product?.name, item.status].join(' ').toLowerCase();
    return text.includes(search.toLowerCase());
  }), [applications, search]);

  const createApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId('create');
    setError('');
    try {
      const result = await financingRequest<{ data: FinancingApplication }>('applications', {
        method: 'POST',
        body: { customerName, productCode, requestedAmount: Number(amount), tenorMonths: Number(tenor), purpose },
      });
      setApplications((current) => [result.data, ...current]);
      setShowCreate(false); setCustomerName(''); setPurpose('');
      setNotice(`Application ${result.data.application_number} saved to the Financing Core database.`);
      setModule('applications');
      await load('applications', true);
    } catch (e: any) {
      setError(e?.message || 'Application could not be saved.');
    } finally { setBusyId(''); }
  };

  const changeStatus = async (application: FinancingApplication, status: string) => {
    setBusyId(application.id); setError('');
    try {
      await financingRequest(`applications/${application.id}`, { method: 'PATCH', body: { status } });
      setNotice(`${application.application_number} moved to ${statusLabel(status)}.`);
      await load(module, true);
    } catch (e: any) { setError(e?.message || 'Status could not be changed.'); }
    finally { setBusyId(''); }
  };

  const decide = async (application: FinancingApplication, decision: 'approve' | 'reject' | 'refer') => {
    const rationale = window.prompt('Enter a concise decision rationale. This will be recorded in the audit trail:');
    if (!rationale?.trim()) return;
    const scoreText = window.prompt('Optional credit score from 0 to 100. Leave blank if not scored:', '');
    const score = scoreText?.trim() ? Number(scoreText) : null;
    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) {
      setError('Credit score must be a whole number between 0 and 100.'); return;
    }
    setBusyId(application.id); setError('');
    try {
      await financingRequest(`applications/${application.id}/decision`, {
        method: 'POST', body: { decision, rationale: rationale.trim(), score, policyVersion: 'pilot-v1' },
      });
      setNotice(`Decision recorded for ${application.application_number}.`);
      await load(module, true);
    } catch (e: any) { setError(e?.message || 'Decision could not be saved.'); }
    finally { setBusyId(''); }
  };

  const panel = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,.035)]';
  const renderApplications = (creditOnly = false) => (
    <section className={panel + ' overflow-hidden'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 className="font-bold text-slate-900">{creditOnly ? 'Credit review queue' : 'Application pipeline'}</h2><p className="mt-1 text-xs text-slate-500">Database-backed records · tenant scoped</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records" className="w-48 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"/></label>
          {!creditOnly && <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800"><Plus size={15}/> New application</button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500"><tr><th className="px-5 py-3">Application</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Tenor</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Workflow</th></tr></thead>
          <tbody>{filteredApplications.filter((item) => !creditOnly || item.status === 'credit_review').map((item) => <tr key={item.id} className="border-t border-slate-100 hover:bg-emerald-50/30">
            <td className="px-5 py-4"><p className="font-bold text-slate-900">{item.customer?.display_name || 'Customer record'}</p><p className="mt-1 text-xs text-slate-400">{item.application_number}</p></td>
            <td className="px-5 py-4 text-slate-600">{item.product?.name || '—'}</td><td className="px-5 py-4 font-semibold tabular-nums">{rupiah(item.requested_amount)}</td>
            <td className="px-5 py-4 text-slate-600">{item.tenor_months} months</td>
            <td className="px-5 py-4"><span className={'rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ' + statusTone(item.status)}>{statusLabel(item.status)}</span></td>
            <td className="px-5 py-4 text-slate-500">{dateLabel(item.submitted_at)}</td>
            <td className="px-5 py-4"><div className="flex min-w-[210px] flex-wrap gap-1.5">
              {item.status === 'new' && <button disabled={busyId === item.id} onClick={() => void changeStatus(item, 'documents_pending')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:border-emerald-400 disabled:opacity-50">Request docs</button>}
              {item.status === 'documents_pending' && <button disabled={busyId === item.id} onClick={() => void changeStatus(item, 'documents_verified')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:border-emerald-400 disabled:opacity-50">Verify docs</button>}
              {item.status === 'documents_verified' && <button disabled={busyId === item.id} onClick={() => void changeStatus(item, 'credit_review')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:border-emerald-400 disabled:opacity-50">Send to credit</button>}
              {item.status === 'credit_review' && <><button disabled={busyId === item.id} onClick={() => void decide(item, 'approve')} className="rounded-lg bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">Approve</button><button disabled={busyId === item.id} onClick={() => void decide(item, 'reject')} className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-50">Reject</button><button disabled={busyId === item.id} onClick={() => void decide(item, 'refer')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold disabled:opacity-50">Refer</button></>}
              {busyId === item.id && <LoaderCircle size={15} className="animate-spin text-emerald-700"/>}
            </div></td>
          </tr>)}
          {!filteredApplications.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">{loading ? 'Loading records…' : 'No application records found.'}</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );

  const renderRows = () => {
    const rowsToShow = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
    if (module === 'customers') return <section className={panel + ' overflow-hidden'}><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Customer directory</h2><p className="mt-1 text-xs text-slate-500">Only minimum display fields are returned to the dashboard.</p></div><div className="divide-y divide-slate-100">{rowsToShow.map((row) => <div key={row.id} className="flex items-center gap-3 px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800"><Users size={17}/></span><div className="min-w-0 flex-1"><p className="font-semibold">{String(row.display_name || 'Customer')}</p><p className="mt-1 text-xs text-slate-400">{String(row.customer_type || '—')} · {String(row.external_ref || 'No external reference')}</p></div><span className="text-xs text-slate-400">{dateLabel(row.created_at)}</span></div>)}{!rowsToShow.length && <EmptyState text="No customer records are available for this tenant."/>}</div></section>;
    const definitions: Record<string, string[]> = {
      contracts: ['contract_number','application_id','status','principal_amount','annual_rate','tenor_months','terms_version','signed_at','created_at'],
      disbursements: ['loan_account_id','amount','beneficiary_ref','status','maker_id','checker_id','created_at'],
      repayments: ['loan_account_id','amount','currency','payment_date','channel','external_reference','status'],
      collections: ['loan_account_id','severity','status','assigned_to','promise_to_pay_date','last_contact_at'],
      reports: ['action','entity_type','entity_id','actor_id','created_at','request_id'],
    };
    const fields = definitions[module] || Object.keys(rowsToShow[0] || {}).filter((key) => key !== 'id' && key !== 'tenant_id').slice(0, 8);
    return <section className={panel + ' overflow-hidden'}><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">{moduleTitle[module]}</h2><p className="mt-1 text-xs text-slate-500">{module === 'reports' ? 'Auditable system events from the database.' : 'Records are loaded from the tenant-scoped API.'}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr>{fields.map((field) => <th key={field} className="px-4 py-3">{field.replace(/_/g,' ')}</th>)}</tr></thead><tbody>{rowsToShow.map((row) => <tr key={row.id} className="border-t border-slate-100">{fields.map((field) => <td key={field} className="max-w-[260px] truncate px-4 py-3 text-slate-600">{field === 'amount' || field === 'principal_amount' ? rupiah(row[field]) : field === 'created_at' || field === 'signed_at' || field === 'payment_date' || field === 'promise_to_pay_date' || field === 'last_contact_at' ? dateLabel(row[field]) : field === 'status' || field === 'severity' ? <span className={'rounded-full px-2 py-1 text-[11px] ring-1 ring-inset ' + statusTone(String(row[field] || ''))}>{statusLabel(String(row[field] || '—'))}</span> : String(row[field] ?? '—')}</td>)}</tr>)}{!rowsToShow.length && <tr><td colSpan={fields.length} className="px-5 py-12 text-center text-sm text-slate-500">No records available yet.</td></tr>}</tbody></table></div></section>;
  };

  return <div className="min-h-screen bg-[#f4f7f6] text-slate-900">
    <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white"><Building2 size={21}/></span><div><p className="text-sm font-black">SurePath <span className="text-emerald-700">Financing Core</span></p><p className="mt-0.5 text-[10px] text-slate-500">Loan origination · servicing · collections · audit</p></div></div><div className="flex items-center gap-2"><span className={'hidden rounded-full px-3 py-2 text-xs font-semibold sm:inline-flex ' + (health?.mode === 'sandbox' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>{health?.mode === 'sandbox' ? 'Isolated sandbox' : 'Authenticated workspace'}</span><button onClick={() => void load(module, true)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Refresh data"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/></button><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-900"><Plus size={15}/> New application</button></div></div></header>
    <main className="mx-auto max-w-[1600px] px-3 pb-12 pt-5 sm:px-5 lg:px-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 px-5 py-4 text-white shadow-lg shadow-emerald-950/10"><div><div className="flex items-center gap-2"><p className="font-bold">Multifinance Control Center</p><span className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">{health?.mode === 'sandbox' ? 'Sandbox' : 'Partner tenant'}</span></div><p className="mt-1 text-xs text-emerald-100/75">Origination to repayment — a single operational record</p></div><p className="text-xs text-emerald-100/70">IDR · Indonesia</p></div>
      {error && <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><AlertTriangle size={17} className="mt-0.5 shrink-0"/><div className="min-w-0 flex-1"><p className="font-bold">Backend / access notice</p><p className="mt-1 break-words text-xs leading-5">{error}</p>{!health?.configured && <p className="mt-2 text-xs">Required setup: apply <code>supabase/migrations/202610180001_financing_core.sql</code>, then configure the server-only Supabase service key and enable sandbox mode only for the isolated demo deployment.</p>}</div><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}
      {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 size={17}/><span className="flex-1">{notice}</span><button onClick={() => setNotice('')}><X size={15}/></button></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className={panel + ' p-3'}><div className="mb-3 rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Workspace</p><div className="mt-2 flex items-center gap-2"><Building2 size={17} className="text-emerald-700"/><span className="text-xs font-bold">Financing tenant</span></div></div>{nav.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => { setModule(item.key); setSearch(''); }} className={'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ' + (module === item.key ? 'bg-emerald-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100')}><Icon size={16}/><span className="flex-1">{item.label}</span>{module === item.key && <ChevronRight size={14}/>}</button>; })}<div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><ShieldCheck size={16} className="text-emerald-800"/><p className="mt-2 text-[10px] font-bold text-emerald-950">Control-first design</p><p className="mt-1 text-[10px] leading-4 text-emerald-900/75">Tenant isolation, status gates and audit events. Real funding actions are not enabled by this dashboard.</p></div></aside>
        <section className="min-w-0"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="flex items-center gap-1.5 text-xs text-slate-400"><span>Financing Core</span><ChevronRight size={12}/><span className="font-semibold text-slate-600">{moduleTitle[module]}</span></p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{moduleTitle[module]}</h1><p className="mt-1 text-sm text-slate-500">{module === 'overview' ? 'Operational view calculated from persisted records.' : 'Tenant-scoped records and controlled workflow actions.'}</p></div>{loading && <span className="inline-flex items-center gap-2 text-xs text-slate-400"><LoaderCircle size={15} className="animate-spin"/> Loading</span>}</div>
          {module === 'overview' && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            {label:'Applications', value: overview ? String(overview.applications) : '—', icon:FileText, note:'Persisted records'},
            {label:'Requested financing', value:overview ? rupiah(overview.requestedAmount) : '—', icon:CircleDollarSign, note:'Total submitted amount'},
            {label:'Credit review queue', value:overview ? String(overview.pendingCreditReview) : '—', icon:ClipboardCheck, note:'Awaiting decision'},
            {label:'Outstanding principal', value:overview ? rupiah(overview.outstandingPrincipal) : '—', icon:Wallet, note:`${overview?.activeAccounts ?? '—'} active accounts`},
          ].map((item)=><div key={item.label} className={panel+' p-4 sm:p-5'}><div className="flex items-start justify-between"><p className="text-xs font-semibold text-slate-500">{item.label}</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><item.icon size={18}/></span></div><p className="mt-4 break-words text-xl font-black tracking-tight text-slate-900">{item.value}</p><p className="mt-1 text-[11px] text-slate-400">{item.note}</p></div>)}</div><div className="mt-4 grid gap-4 xl:grid-cols-2"><div className={panel+' p-5'}><div className="flex items-center gap-2"><CalendarClock size={18} className="text-emerald-700"/><h2 className="font-bold">Portfolio signals</h2></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Collection rate</p><p className="mt-2 text-xl font-black">{overview?.collectionRate == null ? '—' : overview.collectionRate.toFixed(2)+'%'}</p><p className="mt-1 text-[10px] text-slate-400">From scheduled due vs paid</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Open collection cases</p><p className="mt-2 text-xl font-black">{overview?.openCollectionCases ?? '—'}</p><p className="mt-1 text-[10px] text-slate-400">Unresolved cases</p></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Metrics show dashes until the database contains records. No illustrative portfolio totals are presented as live results.</p></div><div className={panel+' p-5'}><div className="flex items-center gap-2"><ArrowDownLeft size={18} className="text-emerald-700"/><h2 className="font-bold">Recent applications</h2></div><div className="mt-3">{applications.slice(0,5).map((item)=><div key={item.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileText size={16}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.customer?.display_name || item.application_number}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.application_number} · {item.product?.name || 'Product'} </p></div><span className="text-xs font-bold">{rupiah(item.requested_amount)}</span></div>)}{!applications.length && <EmptyState text="New applications will appear here after they are saved."/>}</div><button onClick={()=>setModule('applications')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Open applications <ArrowRight size={13}/></button></div></div></>}
          {module === 'applications' && renderApplications(false)}
          {module === 'credit' && <>{renderApplications(true)}<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><LockKeyhole size={16} className="mb-2"/> Credit decisions require the credit-manager role outside the isolated sandbox. All decisions require a written rationale and are recorded in the audit trail; the interface does not auto-approve customers.</div></>}
          {['customers','contracts','disbursements','repayments','collections','reports'].includes(module) && renderRows()}
          {module === 'products' && <section className={panel+' overflow-hidden'}><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Financing product catalogue</h2><p className="mt-1 text-xs text-slate-500">Partner-configured limits and tenor rules</p></div><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product)=><div key={product.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><BriefcaseBusiness size={19}/></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{product.code}</span></div><h3 className="mt-4 font-bold">{product.name}</h3><p className="mt-1 text-xs text-slate-500">{statusLabel(product.category)}</p><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Amount limits</p><p className="mt-1 text-sm font-bold">{rupiah(product.min_amount)} – {rupiah(product.max_amount)}</p><p className="mt-2 text-xs text-slate-500">Tenor: {product.tenor_min_months}–{product.tenor_max_months} months</p></div></div>)}{!products.length && <EmptyState text="No active products are configured for this tenant."/>}</div></section>}
          {module === 'settings' && <section className={panel+' p-5 sm:p-6'}><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Settings2 size={20}/></span><div><h2 className="font-bold">Tenant configuration</h2><p className="mt-1 text-xs text-slate-500">Access and operating controls</p></div></div><div className="mt-5 divide-y divide-slate-100">{[{title:'Tenant boundary',desc:'API queries are scoped by financing_tenant_id from verified Supabase app metadata.'},{title:'Roles',desc:'tenant_admin, operations_manager, credit_manager, credit_analyst and viewer.'},{title:'Approval controls',desc:'Credit approval and rejection are separate audited actions; production disbursement rails are not exposed.'},{title:'Product policy',desc:'Products, amount limits and tenor limits are validated server-side.'},{title:'Audit',desc:'Application creation, status transitions and credit decisions emit audit events.'},{title:'Deployment mode',desc:health?.mode === 'sandbox' ? 'Isolated sandbox is enabled. Keep this flag disabled for partner production deployments.' : 'Authenticated mode. Assign tenant and role through trusted server-side app metadata.'}].map((item)=><div key={item.title} className="py-4"><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p></div>)}</div></section>}
        </section>
      </div>
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-400"><span>SurePath Financing Core · v1 foundation</span><span className="inline-flex items-center gap-1"><ShieldCheck size={12}/> Financial execution rails remain disabled</span></footer>
    </main>
    {showCreate && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={createApplication} className="w-full max-w-lg rounded-2xl border border-white/50 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><Plus size={20}/></span><h2 className="mt-4 text-xl font-black">New financing application</h2><p className="mt-1 text-sm text-slate-500">Saved to the tenant database with an audit event.</p></div><button type="button" onClick={()=>setShowCreate(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Customer / business name<input required maxLength={160} value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="e.g. PT Contoh Sejahtera" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold">Financing product<select value={productCode} onChange={(e)=>setProductCode(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal">{products.map((product)=><option key={product.id} value={product.code}>{product.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Requested amount (IDR)<input required type="number" min="1" step="1000000" value={amount} onChange={(e)=>setAmount(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold">Tenor (months)<input required type="number" min="1" max="120" value={tenor} onChange={(e)=>setTenor(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500"/></label></div><label className="block text-sm font-semibold">Financing purpose (optional)<textarea maxLength={500} value={purpose} onChange={(e)=>setPurpose(e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500"/></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={busyId==='create' || !products.length} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId==='create'&&<LoaderCircle size={15} className="animate-spin"/>}Save application</button></div></form></div>}
  </div>;
};

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileClock size={19}/></div><p className="mt-3 text-sm text-slate-500">{text}</p></div>;
}

export default FinancingCoreWorkspace;
