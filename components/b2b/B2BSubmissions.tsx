// B2BSubmissions — list of submissions as a Mercury-style data table.
//
// Was mobile-first stack of cards. For a corporate ops team scanning 20+
// pending submissions on a laptop that layout meant scrolling the same
// column of near-identical cards. The dashboard table surfaces more rows
// per viewport, keeps status + company + product on one line, and opens
// detail in a right-side panel instead of expanding in place.

import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw, FileCheck, FileText } from 'lucide-react';
import { Language } from '../../types';
import {
  getB2BSubmissions, getAllB2BSubmissions, type SpB2BSubmission,
} from '../../services/supabaseService';
import {
  B2BGlass, B2BTable, B2BPill, B2BSectionHeader, B2BSearchInput,
  B2BSidePanel, B2BButton,
  type B2BColumn, type B2BPillTone,
} from './dashboard/ui';

interface Props {
  clientId: string;
  lang: Language;
  onNavigate: (tab: string) => void;
  allClients?: boolean;
}

const STATUS_MAP: Record<string, { tone: B2BPillTone; en: string; id: string }> = {
  SUBMITTED: { tone: 'warn',    en: 'Awaiting',   id: 'Menunggu Review' },
  REVIEWING: { tone: 'info',    en: 'Reviewing',  id: 'Sedang Dikaji' },
  QUOTED:    { tone: 'accent',  en: 'Quoted',     id: 'Penawaran Siap' },
  ACCEPTED:  { tone: 'success', en: 'Accepted',   id: 'Diterima' },
  REJECTED:  { tone: 'danger',  en: 'Rejected',   id: 'Ditolak' },
};

const PRODUCT_LABEL: Record<string, string> = {
  FLEET_MV: 'Fleet MV', BONDING: 'Bonding', GROUP_HEALTH: 'Group Health',
};
const PRODUCT_PILL_TONE: Record<string, B2BPillTone> = {
  FLEET_MV: 'info', BONDING: 'accent', GROUP_HEALTH: 'danger',
};

const FILTERS: Array<{ id: string; en: string; id_: string }> = [
  { id: 'ALL',       en: 'All',         id_: 'Semua' },
  { id: 'SUBMITTED', en: 'Awaiting',    id_: 'Menunggu' },
  { id: 'REVIEWING', en: 'Reviewing',   id_: 'Dikaji' },
  { id: 'QUOTED',    en: 'Quoted',      id_: 'Siap Tawaran' },
  { id: 'ACCEPTED',  en: 'Accepted',    id_: 'Diterima' },
];

const fmtDate = (iso: string, lang: Language) =>
  new Date(iso).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const B2BSubmissions: React.FC<Props> = ({ clientId, lang, onNavigate, allClients }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [submissions, setSubmissions] = useState<SpB2BSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SpB2BSubmission | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!allClients && !clientId) {
        setSubmissions([]); setLoading(false); setLoadError(false); return;
      }
      setLoading(true); setLoadError(false);
      try {
        const data = allClients ? await getAllB2BSubmissions() : await getB2BSubmissions(clientId);
        if (!cancelled) setSubmissions(data);
      } catch (err) {
        console.error('Unable to load B2B submissions:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [clientId, allClients, reloadKey]);

  const filtered = submissions
    .filter(s => filter === 'ALL' || s.status === filter)
    .filter(s => !search || s.company_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const columns: B2BColumn<SpB2BSubmission>[] = [
    {
      key: 'company', header: t('Company', 'Perusahaan'),
      render: (s) => (
        <div>
          <div className="font-bold text-slate-900 truncate max-w-[220px]">{s.company_name}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">#{s.id.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: 'product', header: t('Product', 'Produk'), hideBelow: 'md',
      render: (s) => (
        <B2BPill tone={PRODUCT_PILL_TONE[s.product_type] ?? 'neutral'}>
          {PRODUCT_LABEL[s.product_type] ?? s.product_type}
        </B2BPill>
      ),
    },
    {
      key: 'date', header: t('Submitted', 'Tgl Ajuan'), hideBelow: 'lg',
      render: (s) => <span className="text-slate-500 tabular-nums">{fmtDate(s.created_at, lang)}</span>,
    },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (s) => {
        const m = STATUS_MAP[s.status] ?? { tone: 'neutral' as B2BPillTone, en: s.status, id: s.status };
        return <B2BPill tone={m.tone}>{lang === Language.EN ? m.en : m.id}</B2BPill>;
      },
    },
  ];

  const detailStatus = selected ? (STATUS_MAP[selected.status] ?? null) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <B2BGlass className="p-6">
        <B2BSectionHeader
          title={allClients ? t('All Client Submissions', 'Ajuan Semua Klien') : t('My Submissions', 'Pengajuan Saya')}
          subtitle={t(`${filtered.length} of ${submissions.length} total`,
                       `${filtered.length} dari ${submissions.length} total`)}
          action={<B2BSearchInput value={search} onChange={setSearch} placeholder={t('Search company…', 'Cari perusahaan…')} className="w-48 lg:w-64" />}
        />

        {/* Filter chips — carries status filtering, kept on one row */}
        <div className="flex gap-1.5 overflow-x-auto b2b-scroll pb-2 mb-3 -mx-1 px-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
                filter === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/60 text-slate-600 hover:bg-indigo-50'
              }`}
            >
              {lang === Language.EN ? f.en : f.id_}
            </button>
          ))}
        </div>

        {loadError ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">{t('Could not load submissions.', 'Pengajuan belum dapat dimuat.')}</p>
              <p className="text-xs text-amber-700 mt-1">{t('Check your connection and try again. Your submissions have not been changed.',
                                                              'Periksa koneksi lalu coba lagi. Data pengajuan tidak diubah.')}</p>
              <B2BButton variant="ghost" icon={RefreshCw} onClick={() => setReloadKey(k => k + 1)} className="mt-3">
                {t('Try again', 'Coba lagi')}
              </B2BButton>
            </div>
          </div>
        ) : loading ? (
          <div className="py-16 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-indigo-500" />
          </div>
        ) : (
          <B2BTable
            columns={columns}
            rows={filtered}
            onRowClick={(s) => setSelected(s)}
            empty={t('No submissions match your filter.', 'Tidak ada pengajuan dengan filter ini.')}
          />
        )}
      </B2BGlass>

      <B2BSidePanel
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.company_name ?? ''}
        subtitle={selected ? `${PRODUCT_LABEL[selected.product_type] ?? selected.product_type} · ${fmtDate(selected.created_at, lang)}` : undefined}
        footer={
          selected?.status === 'QUOTED' && (
            <B2BButton
              variant="primary"
              icon={FileCheck}
              onClick={() => { onNavigate('quotes'); setSelected(null); }}
              className="w-full"
            >
              {t('View Quote', 'Lihat Penawaran')}
            </B2BButton>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
              {detailStatus && (
                <B2BPill tone={detailStatus.tone}>
                  {lang === Language.EN ? detailStatus.en : detailStatus.id}
                </B2BPill>
              )}
            </div>

            <div className="border-t border-slate-200/70 pt-3 space-y-2.5">
              <DetailRow label={t('Submission ID', 'ID Pengajuan')} value={selected.id} mono />
              <DetailRow label={t('Product', 'Produk')} value={PRODUCT_LABEL[selected.product_type] ?? selected.product_type} />
              <DetailRow label={t('Submitted', 'Tgl Ajuan')} value={fmtDate(selected.created_at, lang)} />
            </div>

            {selected.admin_notes && (
              <div className="border-t border-slate-200/70 pt-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <FileText size={11} />
                  {t('Admin Notes', 'Catatan Admin')}
                </span>
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-xs text-slate-700 leading-relaxed">
                  {selected.admin_notes}
                </div>
              </div>
            )}
          </div>
        )}
      </B2BSidePanel>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-xs text-slate-500">{label}</span>
    <span
      className={`text-xs font-bold text-slate-900 text-right ${mono ? 'font-mono tabular-nums text-[11px]' : ''}`}
      style={mono ? { fontFamily: '"JetBrains Mono",monospace' } : undefined}
    >
      {value}
    </span>
  </div>
);

export default B2BSubmissions;
