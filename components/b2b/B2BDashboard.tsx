// B2B Dashboard home — the data-forward replacement for B2BHome.
//
// Was: welcome hero + 3 stat pills + 2 CTA buttons + list cards. That is the
// consumer-app layout the other mobile portals share; on a corporate laptop
// at 1440px it took up ~480px of the viewport and 70% stayed empty.
//
// Now: company hero line + 4 KPI cards + 2 compact tables (recent
// submissions + recent batches) + a quote pulse panel + Pathy CTA panel.
// All three content columns fit on a 1280px viewport, and the page still
// reflows cleanly below lg. Data shape unchanged — this consumes exactly
// the same lists B2BPortal already fetches and passes down.

import React from 'react';
import { FileCheck, FilePlus, Layers, Upload, Sparkles, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { Language } from '../../types';
import type { SpB2BSubmission, SpB2BQuote, SpB2BBatch } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import {
  B2BGlass, B2BKpi, B2BPill, B2BSectionHeader, B2BTable, B2BButton,
  B2BKpiSkeleton, B2BSkeleton,
  type B2BColumn, type B2BPillTone,
} from './dashboard/ui';

interface Props {
  client: { company_name?: string; name?: string; role?: string };
  submissions: SpB2BSubmission[];
  quotes: SpB2BQuote[];
  bulkBatches: SpB2BBatch[];
  onNavigate: (section: string) => void;
  onNavigateBulk?: (section: string) => void;
  onPathyOpen?: () => void;
  companyByClient?: Record<string, string>;
  lang: Language;
  /** When true, KPI + table areas render shimmering skeletons instead of
   *  the "0" / "No submissions yet" empty state — distinguishes fetching
   *  from genuinely empty so a first-time client doesn't flash "0" at the
   *  user before their data arrives. */
  loading?: boolean;
}

const STATUS_PILL: Record<string, { tone: B2BPillTone; id: string; en: string }> = {
  SUBMITTED: { tone: 'warn',    id: 'Menunggu',       en: 'Awaiting' },
  REVIEWING: { tone: 'info',    id: 'Dikaji',         en: 'Reviewing' },
  QUOTED:    { tone: 'accent',  id: 'Ada Penawaran',  en: 'Quoted' },
  ACCEPTED:  { tone: 'success', id: 'Diterima',       en: 'Accepted' },
  REJECTED:  { tone: 'danger',  id: 'Ditolak',        en: 'Rejected' },
};
const BATCH_STATUS_PILL: Record<string, { tone: B2BPillTone; id: string; en: string }> = {
  DRAFT:     { tone: 'neutral', id: 'Draf',      en: 'Draft' },
  SUBMITTED: { tone: 'info',    id: 'Diajukan',  en: 'Submitted' },
  INVOICED:  { tone: 'warn',    id: 'Ditagih',   en: 'Invoiced' },
  PAID:      { tone: 'success', id: 'Lunas',     en: 'Paid' },
  ISSUED:    { tone: 'success', id: 'Terbit',    en: 'Issued' },
  CANCELLED: { tone: 'danger',  id: 'Batal',     en: 'Cancelled' },
};
const PRODUCT_LABEL: Record<string, string> = {
  FLEET_MV:     'Fleet MV',
  BONDING:      'Bonding',
  GROUP_HEALTH: 'Group Health',
};

const fmtDate = (iso: string, lang: Language) =>
  new Date(iso).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', {
    day: '2-digit', month: 'short', year: '2-digit',
  });

const B2BDashboard: React.FC<Props> = ({
  client, submissions, quotes, bulkBatches, onNavigate, onNavigateBulk,
  onPathyOpen, companyByClient, lang, loading = false,
}) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const companyName = client?.company_name ?? client?.name ?? 'Perusahaan';

  /* KPIs — all pre-computed from already-fetched lists so the dashboard is a
     pure render, no extra network calls. */
  const pending   = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'REVIEWING').length;
  const quoted    = quotes.filter(q => q.status === 'PENDING').length;
  const accepted  = quotes.filter(q => q.status === 'ACCEPTED').length;
  const batchOpen = bulkBatches.filter(b => b.status === 'SUBMITTED' || b.status === 'INVOICED').length;
  const batchTotalUnits = bulkBatches.reduce((s, b) => s + (b.item_count ?? 0), 0);
  const batchPaidAmount = bulkBatches
    .filter(b => b.status === 'PAID' || b.status === 'ISSUED')
    .reduce((s, b) => s + (b.total_amount ?? 0), 0);

  /* Recent slices — same sort direction (newest first) across both tables. */
  const recentSubs = submissions.slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentBatches = bulkBatches.slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const openQuotes = quotes
    .filter(q => q.status === 'PENDING')
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const subColumns: B2BColumn<SpB2BSubmission>[] = [
    {
      key: 'company', header: t('Company', 'Perusahaan'),
      render: (s) => (
        <div>
          <div className="font-bold text-slate-900 truncate max-w-[180px]">{s.company_name}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{PRODUCT_LABEL[s.product_type] ?? s.product_type}</div>
        </div>
      ),
    },
    {
      key: 'date', header: t('Submitted', 'Tgl Ajuan'), hideBelow: 'md',
      render: (s) => <span className="text-slate-500">{fmtDate(s.created_at, lang)}</span>,
    },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (s) => {
        const m = STATUS_PILL[s.status] ?? { tone: 'neutral', id: s.status, en: s.status };
        return <B2BPill tone={m.tone}>{lang === Language.EN ? m.en : m.id}</B2BPill>;
      },
    },
  ];

  const batchColumns: B2BColumn<SpB2BBatch>[] = [
    {
      key: 'batch', header: 'Batch',
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900" style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
            {b.batch_number}
          </div>
          {companyByClient?.[b.client_id] && (
            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[160px]">
              {companyByClient[b.client_id]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'units', header: 'Unit', align: 'right', hideBelow: 'md',
      render: (b) => <span className="font-bold text-slate-700 tabular-nums">{b.item_count ?? 0}</span>,
    },
    {
      key: 'amount', header: 'Nilai', align: 'right', hideBelow: 'md',
      render: (b) => (
        <span className="font-black text-emerald-700 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
          {formatIDR(b.total_amount)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (b) => {
        const m = BATCH_STATUS_PILL[b.status] ?? { tone: 'neutral', id: b.status, en: b.status };
        return <B2BPill tone={m.tone}>{lang === Language.EN ? m.en : m.id}</B2BPill>;
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Hero line — company, role, quick actions ────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
              {t('B2B Dashboard', 'Dashboard B2B')}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900" style={{ letterSpacing: '-0.025em' }}>
            {t('Welcome back, ', 'Selamat datang, ')}
            <span style={{ background: 'linear-gradient(115deg, #4338ca, #059669)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {companyName}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('Overview of your fleet policies, quotes, and bulk batches.',
               'Ringkasan polis armada, penawaran, dan batch massal Anda.')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <B2BButton variant="ghost" icon={FilePlus} onClick={() => onNavigate('new-single')}>
            {t('New Submission', 'Pengajuan Baru')}
          </B2BButton>
          <B2BButton variant="primary" icon={Upload} onClick={() => onNavigateBulk?.('new-bulk')}>
            {t('Bulk Import', 'Impor Massal')}
          </B2BButton>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 b2b-stagger">
          <B2BKpiSkeleton />
          <B2BKpiSkeleton />
          <B2BKpiSkeleton />
          <B2BKpiSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 b2b-stagger">
        <B2BKpi
          label={t('Pending Review', 'Menunggu Review')}
          value={pending}
          hint={t('awaiting insurer response', 'menunggu respon penanggung')}
          tone={pending > 0 ? 'warn' : 'default'}
          icon={Clock}
        />
        <B2BKpi
          label={t('Open Quotes', 'Penawaran Aktif')}
          value={quoted}
          hint={t('awaiting your decision', 'menunggu keputusan Anda')}
          tone={quoted > 0 ? 'accent' : 'default'}
          icon={FileCheck}
        />
        <B2BKpi
          label={t('Policies Issued', 'Polis Terbit')}
          value={accepted + bulkBatches.filter(b => b.status === 'ISSUED').length}
          hint={t('this period', 'periode berjalan')}
          tone="success"
          icon={TrendingUp}
        />
        <B2BKpi
          label={t('Fleet Units', 'Unit Armada')}
          value={batchTotalUnits}
          hint={t(`across ${bulkBatches.length} batches`, `di ${bulkBatches.length} batch`)}
          tone="default"
          icon={Layers}
        />
      </div>
      )}

      {/* ── Tables + side panel row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Recent submissions — 2/3 width on desktop */}
        <div className="lg:col-span-2">
          <B2BGlass className="p-6">
            <B2BSectionHeader
              title={t('Recent Submissions', 'Pengajuan Terbaru')}
              subtitle={t(`${submissions.length} total`, `${submissions.length} total`)}
              action={
                submissions.length > 0 && (
                  <button onClick={() => onNavigate('submissions')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    {t('View all', 'Lihat semua')} <ArrowRight size={11} />
                  </button>
                )
              }
            />
            <B2BTable
              columns={subColumns}
              rows={recentSubs}
              onRowClick={() => onNavigate('submissions')}
              loading={loading}
              empty={t('No submissions yet. Create your first one above.',
                       'Belum ada pengajuan. Buat yang pertama di atas.')}
            />
          </B2BGlass>
        </div>

        {/* Quote pulse + Pathy — 1/3 width on desktop */}
        <div className="space-y-4">
          {/* Open quotes callout */}
          <B2BGlass strong className="p-5"
            style={{
              background: openQuotes.length > 0
                ? 'linear-gradient(135deg, rgba(67,56,202,0.08), rgba(5,150,105,0.04))'
                : undefined,
              borderColor: openQuotes.length > 0 ? 'rgba(67,56,202,0.25)' : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FileCheck size={13} className="text-indigo-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {t('Open Quotes', 'Penawaran Aktif')}
                </h3>
              </div>
              {openQuotes.length > 0 && <B2BPill tone="accent">{openQuotes.length}</B2BPill>}
            </div>
            {loading ? (
              <div className="space-y-2.5 b2b-stagger">
                <div className="flex items-center gap-3 py-2 px-3">
                  <div className="flex-1">
                    <B2BSkeleton width="60%" height={12} />
                    <B2BSkeleton width="40%" height={10} className="mt-1.5" />
                  </div>
                  <B2BSkeleton width={70} height={14} />
                </div>
                <div className="flex items-center gap-3 py-2 px-3">
                  <div className="flex-1">
                    <B2BSkeleton width="70%" height={12} />
                    <B2BSkeleton width="35%" height={10} className="mt-1.5" />
                  </div>
                  <B2BSkeleton width={70} height={14} />
                </div>
              </div>
            ) : openQuotes.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('No open quotes. Submit a request and insurers will respond here.',
                   'Belum ada penawaran aktif. Ajukan permintaan dan penanggung akan membalas di sini.')}
              </p>
            ) : (
              <>
                <div className="space-y-2.5 mb-3">
                  {openQuotes.map(q => (
                    <button
                      key={q.id}
                      onClick={() => onNavigate('quotes')}
                      className="w-full text-left flex items-center justify-between gap-2 py-2 px-3 rounded-xl hover:bg-white/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{q.insurer_name ?? t('Insurer', 'Penanggung')}</div>
                        <div className="text-[10px] text-slate-500 truncate">{fmtDate(q.created_at, lang)}</div>
                      </div>
                      <span className="text-xs font-black text-emerald-700 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace' }}>
                        {formatIDR(q.premium_amount ?? 0)}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate('quotes')}
                  className="w-full text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 py-1"
                >
                  {t('Review all quotes', 'Tinjau semua penawaran')} <ArrowRight size={11} />
                </button>
              </>
            )}
          </B2BGlass>

          {/* Pathy launcher — pocket-sized, not a 56px FAB */}
          {onPathyOpen && (
            <button
              type="button"
              onClick={onPathyOpen}
              className="w-full text-left p-5 rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #062f28 0%, #07563f 60%, #087a58 100%)',
                boxShadow: '0 12px 32px -16px rgba(5,150,105,0.5)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Sparkles size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-xs font-black text-white" style={{ letterSpacing: '-0.015em' }}>Pathy AI</div>
                  <div className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-widest">Asisten Armada</div>
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                {t('Ask Pathy to analyze a fleet Excel, compute premiums per row, or help structure a submission.',
                   'Minta Pathy menganalisis Excel armada, hitung premi per baris, atau susun pengajuan.')}
              </p>
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk batches full-width row (only when batches exist) ───────── */}
      {bulkBatches.length > 0 && (
        <B2BGlass className="p-6">
          <B2BSectionHeader
            title={t('Fleet Batches', 'Batch Armada')}
            subtitle={t(
              `${batchOpen} open · ${formatIDR(batchPaidAmount)} paid`,
              `${batchOpen} aktif · ${formatIDR(batchPaidAmount)} lunas`,
            )}
            action={
              <button onClick={() => onNavigateBulk?.('submissions')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                {t('View all', 'Lihat semua')} <ArrowRight size={11} />
              </button>
            }
          />
          <B2BTable
            columns={batchColumns}
            rows={recentBatches}
            onRowClick={() => onNavigateBulk?.('submissions')}
            loading={loading}
          />
        </B2BGlass>
      )}
    </div>
  );
};

export default B2BDashboard;
