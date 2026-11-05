import React from 'react';
import { ChevronRight, Upload, Layers } from 'lucide-react';
import { Language } from '../../types';
import { type SpB2BSubmission, type SpB2BQuote, type SpB2BBatch } from '../../services/supabaseService';
import { HeroCard } from '../shared/cards';
import ModuleIcon from '../shared/ModuleIcon';

interface Props {
  client: any;
  submissions: SpB2BSubmission[];
  quotes: SpB2BQuote[];
  /** Bulk fleet TLO batches (v2.7.51+) — previously invisible on this screen
   *  even though it's the primary way a multifinance partner uses this
   *  portal. Optional so this component degrades gracefully if a caller
   *  hasn't wired it up yet. */
  bulkBatches?: SpB2BBatch[];
  onNavigate: (tab: string) => void;
  /** Navigates to a tab AND switches it into bulk mode (B2BPortal's mode
   *  toggle) — distinct from onNavigate since "Ajuan"/"Buat" each default
   *  to the single-submission view. */
  onNavigateBulk?: (tab: string) => void;
  lang: Language;
}

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  REVIEWING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  QUOTED:    'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  ACCEPTED:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  REJECTED:  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const BATCH_STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  INVOICED:  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  PAID:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  ISSUED:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const BATCH_STATUS_LABEL_ID: Record<string, string> = {
  DRAFT: 'Draf', SUBMITTED: 'Diajukan', INVOICED: 'Ditagih', PAID: 'Lunas', ISSUED: 'Terbit', CANCELLED: 'Batal',
};

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const PRODUCT_LABEL: Record<string, string> = {
  FLEET_MV:     'Fleet MV',
  BONDING:      'Bonding',
  GROUP_HEALTH: 'Group Health',
};

const B2BHome: React.FC<Props> = ({ client, submissions, quotes, bulkBatches = [], onNavigate, onNavigateBulk, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const companyName = client?.company_name ?? 'Perusahaan';
  const initials = companyName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();

  const pendingCount  = submissions.filter(s => ['SUBMITTED', 'REVIEWING'].includes(s.status)).length;
  const receivedCount = quotes.length;
  const acceptedCount = quotes.filter(q => q.status === 'ACCEPTED').length;

  const batchAwaitingPayment = bulkBatches.filter(b => b.status === 'SUBMITTED' || b.status === 'INVOICED').length;
  const batchTotalUnits = bulkBatches.reduce((s, b) => s + (b.item_count ?? 0), 0);

  const recent = submissions.slice().sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 3);

  const recentBatches = bulkBatches.slice().sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 3);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(
    lang === Language.EN ? 'en-GB' : 'id-ID',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
      {/* Welcome hero */}
      <HeroCard>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-lg font-black text-white">
            {initials}
          </div>
          <div>
            <p className="text-2xs font-black text-white/55 uppercase tracking-wider">{t('B2B Portal', 'Portal B2B')}</p>
            <p className="font-black text-base leading-tight text-white">{companyName}</p>
          </div>
        </div>
        <p className="text-xs text-white/60 leading-snug">
          {t('Manage your B2B insurance submissions and quotes here.', 'Kelola pengajuan dan penawaran asuransi B2B Anda di sini.')}
        </p>
      </HeroCard>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('Pending', 'Pending'), value: pendingCount,  color: 'text-ds-amber' },
          { label: t('Quotes',  'Penawaran'), value: receivedCount, color: 'text-ds-green' },
          { label: t('Accepted','Diterima'),  value: acceptedCount, color: 'text-ds-green' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-3 text-center shadow-sm">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* CTAs — single submission (primary) and bulk fleet import (secondary).
          Bulk import previously had no entry point from this screen at all;
          a multifinance partner landing here saw only the single-order
          path, even though bulk is the one they actually came to use. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('new')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-ds-green text-ds-on-green py-4 font-black text-sm active:scale-95 transition-transform shadow-ds-green"
        >
          <ModuleIcon id="quotes" size={28} />
          {t('New Submission', 'Pengajuan Baru')}
        </button>
        <button
          onClick={() => onNavigateBulk?.('new')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-white/5 border-2 border-ds-green/30 text-ds-green py-4 font-black text-sm active:scale-95 transition-transform"
        >
          <Upload size={18} strokeWidth={2.5} />
          {t('Bulk Fleet Import', 'Impor Massal Fleet')}
        </button>
      </div>

      {/* Bulk batch summary — surfaces the flagship fleet-import feature on
          the home screen instead of leaving it discoverable only by digging
          into the "Ajuan" tab's mode toggle. */}
      {bulkBatches.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-ds-green" />
              <h3 className="font-black text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">
                {t('Fleet Batches', 'Batch Fleet')}
              </h3>
            </div>
            <button
              onClick={() => onNavigateBulk?.('submissions')}
              className="text-ds-green text-xs font-bold flex items-center gap-0.5"
            >
              {t('See all', 'Lihat semua')} <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-ds-amber">{batchAwaitingPayment}</div>
              <div className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5">
                {t('Awaiting payment', 'Menunggu bayar')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-ds-green">{batchTotalUnits}</div>
              <div className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5">
                {t('Total units', 'Total unit')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent bulk batches */}
      {recentBatches.length > 0 && (
        <div>
          <h3 className="font-black text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-3">
            {t('Recent Batches', 'Batch Terbaru')}
          </h3>
          <div className="space-y-3">
            {recentBatches.map(b => (
              <div
                key={b.id}
                className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-white font-mono">{b.batch_number}</div>
                    <div className="text-[11px] text-ds-ink3 mt-0.5">
                      {b.item_count} {t('units', 'unit')} · {fmtIDR(b.total_amount)} · {fmtDate(b.created_at)}
                    </div>
                  </div>
                  <span className={`text-2xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${BATCH_STATUS_BADGE[b.status] ?? ''}`}>
                    {lang === Language.EN ? b.status : (BATCH_STATUS_LABEL_ID[b.status] ?? b.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent submissions */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
              {t('Recent Submissions', 'Pengajuan Terbaru')}
            </h3>
            <button
              onClick={() => onNavigate('submissions')}
              className="text-ds-green text-xs font-bold flex items-center gap-0.5"
            >
              {t('See all', 'Lihat semua')} <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recent.map(sub => (
              <div
                key={sub.id}
                className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-white">{sub.company_name}</div>
                    <div className="text-[11px] text-ds-ink3 mt-0.5">
                      {PRODUCT_LABEL[sub.product_type] ?? sub.product_type} · {fmtDate(sub.created_at)}
                    </div>
                  </div>
                  <span className={`text-2xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_BADGE[sub.status] ?? ''}`}>
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BHome;
