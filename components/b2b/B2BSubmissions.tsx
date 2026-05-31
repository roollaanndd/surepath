import React, { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, FileCheck } from 'lucide-react';
import { Language } from '../../types';
import { getB2BSubmissions, type SpB2BSubmission } from '../../services/supabaseService';

interface Props {
  clientId: string;
  lang: Language;
  onNavigate: (tab: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  REVIEWING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  QUOTED:    'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  ACCEPTED:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  REJECTED:  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const PRODUCT_COLOR: Record<string, string> = {
  FLEET_MV:     'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  BONDING:      'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  GROUP_HEALTH: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const PRODUCT_LABEL: Record<string, string> = {
  FLEET_MV: 'Fleet MV', BONDING: 'Bonding', GROUP_HEALTH: 'Group Health',
};

const FILTER_TABS = ['ALL', 'SUBMITTED', 'REVIEWING', 'QUOTED', 'ACCEPTED'] as const;
type FilterTab = typeof FILTER_TABS[number];

const SubmissionCard: React.FC<{ sub: SpB2BSubmission; lang: Language; onNavigate: (t: string) => void }> = ({ sub, lang, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(
    lang === Language.EN ? 'en-GB' : 'id-ID',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${PRODUCT_COLOR[sub.product_type] ?? ''}`}>
              {PRODUCT_LABEL[sub.product_type] ?? sub.product_type}
            </span>
          </div>
          <div className="font-black text-sm mt-1 truncate">{sub.company_name}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate(sub.created_at)}</div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0 ${STATUS_BADGE[sub.status] ?? ''}`}>
          {sub.status}
        </span>
      </div>

      {sub.admin_notes && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {t('Admin Notes', 'Catatan Admin')}
          </button>
          {expanded && (
            <div className="mt-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-3 text-xs text-slate-600 dark:text-slate-300">
              {sub.admin_notes}
            </div>
          )}
        </div>
      )}

      {sub.status === 'QUOTED' && (
        <button
          onClick={() => onNavigate('quotes')}
          className="flex items-center gap-2 w-full justify-center rounded-xl bg-green-500 text-white py-2.5 text-xs font-black"
        >
          <FileCheck size={14} />
          {t('View Quote', 'Lihat Penawaran')}
        </button>
      )}
    </div>
  );
};

const B2BSubmissions: React.FC<Props> = ({ clientId, lang, onNavigate }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [submissions, setSubmissions] = useState<SpB2BSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('ALL');

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    getB2BSubmissions(clientId).then(data => {
      setSubmissions(data);
      setLoading(false);
    });
  }, [clientId]);

  const filtered = filter === 'ALL' ? submissions : submissions.filter(s => s.status === filter);
  const sorted = filtered.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h2 className="font-black text-lg">{t('My Submissions', 'Pengajuan Saya')}</h2>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
              filter === f
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            {f === 'ALL' ? t('All', 'Semua') : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
          {t('No submissions found.', 'Belum ada pengajuan.')}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(sub => (
            <SubmissionCard key={sub.id} sub={sub} lang={lang} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default B2BSubmissions;
