import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2,
  AlertTriangle, FileText, Building2, Heart,
} from 'lucide-react';
import {
  getAllB2BSubmissions,
  updateB2BSubmissionStatus,
  createB2BQuote,
  getAllLifeApplications,
  updateLifeApplicationStatus,
  type SpB2BSubmission,
  type SpB2BQuote,
  type SpLifeApplication,
} from '../../services/supabaseService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Badge maps ───────────────────────────────────────────────────────────────

const B2B_STATUS_CLS: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REVIEWING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  QUOTED:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ACCEPTED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const LIFE_STATUS_CLS: Record<string, string> = {
  SUBMITTED:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UNDERWRITING:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DECLINED:    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  ISSUED:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DRAFT:       'bg-ds-card2 text-ds-ink2 dark:bg-slate-800 dark:text-ds-ink3',
};

const PRODUCT_TYPE_CLS: Record<string, string> = {
  FLEET_MV:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BONDING:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  GROUP_HEALTH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const B2B_STATUSES = ['SUBMITTED', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'REJECTED'];
const LIFE_STATUSES = ['SUBMITTED', 'UNDERWRITING', 'APPROVED', 'DECLINED', 'ISSUED'];

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ msg: string; onDone: () => void }> = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-2xl shadow-xl text-sm font-semibold animate-fade-in">
      <CheckCircle2 size={16} /> {msg}
    </div>
  );
};

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2 rounded-xl border border-ds-border dark:border-ds-border bg-white dark:bg-ds-card2 text-ds-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
const TEXTAREA = INPUT + ' resize-none';

const Badge: React.FC<{ cls: string; label: string }> = ({ cls, label }) => (
  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
);

// ─── B2B Quote Form ───────────────────────────────────────────────────────────

interface QuoteFormProps {
  submissionId: string;
  clientId: string;
  onSaved: () => void;
  onClose: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ submissionId, clientId, onSaved, onClose }) => {
  const [insurerName, setInsurerName] = useState('');
  const [premiumAmount, setPremiumAmount] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [terms, setTerms] = useState('');
  const [rows, setRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const addRow = () => { if (rows.length < 10) setRows(r => [...r, { key: '', value: '' }]); };
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'key' | 'value', val: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const save = async () => {
    if (!insurerName || !premiumAmount || !validUntil) { setErr('Insurer, premium, and valid-until are required.'); return; }
    setSaving(true);
    const coverageDetails: Record<string, string> = {};
    rows.filter(r => r.key.trim()).forEach(r => { coverageDetails[r.key.trim()] = r.value; });
    const quoteData: Omit<SpB2BQuote, 'id' | 'created_at' | 'updated_at'> = {
      submission_id: submissionId,
      client_id: clientId,
      insurer_name: insurerName,
      premium_amount: premiumAmount,
      coverage_details: coverageDetails,
      valid_until: validUntil,
      terms,
      status: 'PENDING',
    };
    const ok = await createB2BQuote(quoteData);
    if (ok) {
      await updateB2BSubmissionStatus(submissionId, 'QUOTED');
      onSaved();
    } else {
      setErr('Failed to save quote. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="mt-3 p-4 bg-slate-50 dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-ds-ink dark:text-white">Add Quote</p>
        <button onClick={onClose} className="text-ds-ink3 hover:text-ds-ink2"><ChevronUp size={16} /></button>
      </div>
      {err && <p className="text-xs text-rose-500 flex items-center gap-1"><AlertTriangle size={12} />{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-ds-ink3 mb-1">Insurer Name</label>
          <input value={insurerName} onChange={e => setInsurerName(e.target.value)} className={INPUT} placeholder="e.g. Prudential" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ds-ink3 mb-1">Premium (IDR)</label>
          <input type="number" value={premiumAmount} onChange={e => setPremiumAmount(Number(e.target.value))} className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ds-ink3 mb-1">Valid Until</label>
          <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={INPUT} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-ds-ink3">Coverage Details</label>
          <button onClick={addRow} className="text-xs text-ds-green font-semibold flex items-center gap-1"><Plus size={12} />Add Row</button>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={row.key} onChange={e => updateRow(i, 'key', e.target.value)} placeholder="Key" className={INPUT + ' flex-1'} />
              <input value={row.value} onChange={e => updateRow(i, 'value', e.target.value)} placeholder="Value" className={INPUT + ' flex-1'} />
              {rows.length > 1 && <button onClick={() => removeRow(i)}><Trash2 size={14} className="text-rose-400" /></button>}
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ds-ink3 mb-1">Terms</label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className={TEXTAREA} />
      </div>
      <button
        onClick={save} disabled={saving}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Save Quote
      </button>
    </div>
  );
};

// ─── B2B Submission Card ──────────────────────────────────────────────────────

const B2BCard: React.FC<{ sub: SpB2BSubmission; onUpdated: () => void; onToast: (m: string) => void }> = ({ sub, onUpdated, onToast }) => {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [status, setStatus] = useState(sub.status);
  const [notes, setNotes] = useState(sub.admin_notes ?? '');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const changeStatus = async (s: string) => {
    setStatus(s as SpB2BSubmission['status']);
    setUpdatingStatus(true);
    await updateB2BSubmissionStatus(sub.id, s);
    setUpdatingStatus(false);
    onToast('Status updated');
    onUpdated();
  };

  const saveNotes = async () => {
    await updateB2BSubmissionStatus(sub.id, status, notes);
    onToast('Notes saved');
  };

  const docs: { doc_type?: string; filename?: string }[] = (sub.submission_data?.documents as unknown[])?.map?.(d => d as { doc_type?: string; filename?: string }) ?? [];

  return (
    <div className="p-4 bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge cls={PRODUCT_TYPE_CLS[sub.product_type] ?? ''} label={sub.product_type} />
            <Badge cls={B2B_STATUS_CLS[status] ?? ''} label={status} />
          </div>
          <p className="font-bold text-ds-ink dark:text-white text-sm">{sub.company_name}</p>
          <p className="text-xs text-ds-ink3">{sub.pic_name} · {sub.pic_phone}</p>
          <p className="text-xs text-ds-ink3">{fmtDate(sub.created_at)}</p>
        </div>
        {updatingStatus && <RefreshCw size={14} className="text-ds-ink3 animate-spin flex-shrink-0 mt-1" />}
      </div>

      {/* Status Dropdown */}
      <div>
        <label className="block text-[10px] font-semibold text-ds-ink3 uppercase mb-1">Change Status</label>
        <div className="relative">
          <select
            value={status}
            onChange={e => changeStatus(e.target.value)}
            className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-ds-border dark:border-ds-border bg-white dark:bg-ds-card2 text-ds-ink dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {B2B_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-ink3 pointer-events-none" />
        </div>
      </div>

      {/* Admin Notes */}
      <div>
        <label className="block text-[10px] font-semibold text-ds-ink3 uppercase mb-1">Admin Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={2}
          className={TEXTAREA}
          placeholder="Internal notes…"
        />
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-ds-ink3 uppercase mb-1">Documents</p>
          <div className="flex flex-wrap gap-1.5">
            {docs.map((d, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-ds-card2 dark:bg-ds-card2 rounded-lg text-ds-ink2 dark:text-ds-ink2">
                <FileText size={10} />{d.doc_type ?? 'doc'}: {d.filename ?? '—'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Quote Button */}
      <button
        onClick={() => setShowQuoteForm(v => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-ds-green hover:underline"
      >
        {showQuoteForm ? <ChevronUp size={14} /> : <Plus size={14} />}
        {showQuoteForm ? 'Close Quote Form' : 'Add Quote'}
      </button>

      {showQuoteForm && (
        <QuoteForm
          submissionId={sub.id}
          clientId={sub.client_id}
          onSaved={() => { setShowQuoteForm(false); onToast('Quote saved — status set to QUOTED'); onUpdated(); }}
          onClose={() => setShowQuoteForm(false)}
        />
      )}
    </div>
  );
};

// ─── Life Application Card ────────────────────────────────────────────────────

const LifeCard: React.FC<{ app: SpLifeApplication; onUpdated: () => void; onToast: (m: string) => void }> = ({ app, onUpdated, onToast }) => {
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.insurer_notes ?? '');
  const [policyNumber, setPolicyNumber] = useState(app.policy_number ?? '');
  const [saving, setSaving] = useState(false);

  const age = (() => {
    if (!app.client_dob) return '?';
    const today = new Date();
    const birth = new Date(app.client_dob);
    return today.getFullYear() - birth.getFullYear();
  })();

  const yesAnswers = Object.entries(app.health_declaration).filter(([, v]) => v).map(([k]) => Number(k));
  const showPolicyNumber = status === 'APPROVED' || status === 'ISSUED';

  const handleUpdate = async () => {
    setSaving(true);
    const ok = await updateLifeApplicationStatus(app.id, status, notes, showPolicyNumber ? policyNumber : undefined);
    setSaving(false);
    if (ok) { onToast('Application updated'); onUpdated(); }
  };

  return (
    <div className="p-4 bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 font-mono">{app.order_number}</span>
            <Badge cls={LIFE_STATUS_CLS[status] ?? ''} label={status} />
          </div>
          <p className="font-bold text-ds-ink dark:text-white text-sm">{app.client_name}</p>
          <p className="text-xs text-ds-ink3">{age} yo · {app.client_gender === 'M' ? 'Male' : 'Female'} · {app.smoker ? 'Smoker' : 'Non-smoker'}</p>
          <p className="text-xs text-ds-ink3">{app.product_code.replace('_', ' ')} · UP {fmtIDR(app.sum_assured)}</p>
          <p className="text-xs text-ds-ink3">Indicative premium/yr: {fmtIDR(app.indicative_premium)}</p>
        </div>
        <Heart size={16} className="text-rose-400 flex-shrink-0 mt-1" />
      </div>

      {/* Riders */}
      {app.riders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.riders.map(r => (
            <span key={r} className="text-[10px] px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 rounded-full font-semibold">{r.replace('_', ' ')}</span>
          ))}
        </div>
      )}

      {/* Health — Yes answers highlighted */}
      {yesAnswers.length > 0 && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
          <p className="text-[10px] font-semibold text-ds-amber uppercase mb-1 flex items-center gap-1"><AlertTriangle size={10} />Health Flags</p>
          {yesAnswers.map(qi => (
            <p key={qi} className="text-xs text-amber-700 dark:text-amber-400">Q{qi + 1}: Yes</p>
          ))}
        </div>
      )}

      {/* Beneficiary */}
      <div className="text-xs text-ds-ink3">
        Beneficiary: <span className="font-semibold text-ds-ink2 dark:text-ds-ink2">{app.beneficiary_name}</span> ({app.beneficiary_relation}, {app.beneficiary_percentage}%)
      </div>

      {/* Status Update */}
      <div>
        <label className="block text-[10px] font-semibold text-ds-ink3 uppercase mb-1">Change Status</label>
        <div className="relative">
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-ds-border dark:border-ds-border bg-white dark:bg-ds-card2 text-ds-ink dark:text-white text-xs font-semibold focus:outline-none"
          >
            {LIFE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-ink3 pointer-events-none" />
        </div>
      </div>

      {/* Policy Number */}
      {showPolicyNumber && (
        <div>
          <label className="block text-[10px] font-semibold text-ds-ink3 uppercase mb-1">Policy Number</label>
          <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className={INPUT} placeholder="e.g. PRU-LIFE-2026-XXXXX" />
        </div>
      )}

      {/* Insurer Notes */}
      <div>
        <label className="block text-[10px] font-semibold text-ds-ink3 uppercase mb-1">Insurer Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={TEXTAREA} placeholder="Underwriting notes…" />
      </div>

      <button
        onClick={handleUpdate} disabled={saving}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Update
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const B2BAdminView: React.FC = () => {
  const [tab, setTab] = useState<'b2b' | 'life'>('b2b');
  const [b2bSubs, setB2bSubs] = useState<SpB2BSubmission[]>([]);
  const [lifeApps, setLifeApps] = useState<SpLifeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [b2bFilter, setB2bFilter] = useState('ALL');
  const [lifeFilter, setLifeFilter] = useState('ALL');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [subs, apps] = await Promise.all([getAllB2BSubmissions(), getAllLifeApplications()]);
      setB2bSubs(subs);
      setLifeApps(apps);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat pengajuan B2B dan aplikasi jiwa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => setToast(msg);

  const visibleB2b = b2bFilter === 'ALL' ? b2bSubs : b2bSubs.filter(s => s.status === b2bFilter);
  const visibleLife = lifeFilter === 'ALL' ? lifeApps : lifeApps.filter(a => a.status === lifeFilter);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-ds-card">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-5 pt-5 pb-3">
        <TabBtn active={tab === 'b2b'} onClick={() => setTab('b2b')} icon={<Building2 size={14} />} label="B2B Submissions" />
        <TabBtn active={tab === 'life'} onClick={() => setTab('life')} icon={<Heart size={14} />} label="Life Applications" />
        <button onClick={load} className="ml-auto p-2 rounded-xl text-ds-ink3 hover:text-ds-ink2 dark:hover:text-white">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
        {tab === 'b2b'
          ? ['ALL', ...B2B_STATUSES].map(f => (
              <FilterPill key={f} label={f} active={b2bFilter === f} onClick={() => setB2bFilter(f)} />
            ))
          : ['ALL', ...LIFE_STATUSES].map(f => (
              <FilterPill key={f} label={f} active={lifeFilter === f} onClick={() => setLifeFilter(f)} />
            ))}
      </div>

      {/* Content */}
      <div className="px-5 pb-8 space-y-3">
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <span><strong>Data belum berhasil dimuat.</strong> {loadError}</span>
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-current px-3 py-2 font-semibold">
              <RefreshCw size={14} /> Coba lagi
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-ds-ink3 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading…
          </div>
        ) : tab === 'b2b' ? (
          visibleB2b.length === 0 ? (
            <Empty />
          ) : (
            visibleB2b.map(sub => (
              <B2BCard key={sub.id} sub={sub} onUpdated={load} onToast={showToast} />
            ))
          )
        ) : (
          visibleLife.length === 0 ? (
            <Empty />
          ) : (
            visibleLife.map(app => (
              <LifeCard key={app.id} app={app} onUpdated={load} onToast={showToast} />
            ))
          )
        )}
      </div>
    </div>
  );
};

// ─── Minor atoms ──────────────────────────────────────────────────────────────

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
      active ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border text-ds-ink2 dark:text-ds-ink2'
    }`}
  >
    {icon}{label}
  </button>
);

const FilterPill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
      active ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border text-ds-ink3 dark:text-ds-ink3'
    }`}
  >
    {label}
  </button>
);

const Empty: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-ds-ink3">
    <FileText size={32} className="mb-3 opacity-40" />
    <p className="text-sm">No records found</p>
  </div>
);

export default B2BAdminView;
