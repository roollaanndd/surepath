// B2BQuotes — insurer quotes list as a data table, with side-panel detail
// and inline accept/reject. Monitor-mode (allClients) hides decision
// buttons; quotes still belong to the client, master admin only watches.

import React, { useState, useEffect } from 'react';
import { FileDown, ThumbsUp, ThumbsDown, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { Language } from '../../types';
import {
  getB2BQuotes, getAllB2BQuotes, updateB2BQuoteStatus, type SpB2BQuote,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { publishAndDownloadQuotation } from '../../services/quotationService';
import { fromB2BQuote } from '../../services/quotationSlipAdapter';
import {
  B2BGlass, B2BTable, B2BPill, B2BSectionHeader, B2BSearchInput,
  B2BSidePanel, B2BButton, useB2BToast,
  type B2BColumn, type B2BPillTone,
} from './dashboard/ui';

interface Props {
  clientId: string;
  lang: Language;
  companyName?: string;
  allClients?: boolean;
  companyByClient?: Record<string, string>;
}

const STATUS_MAP: Record<string, { tone: B2BPillTone; en: string; id: string }> = {
  PENDING:  { tone: 'warn',    en: 'Pending',  id: 'Menunggu Keputusan' },
  ACCEPTED: { tone: 'success', en: 'Accepted', id: 'Diterima' },
  REJECTED: { tone: 'danger',  en: 'Rejected', id: 'Ditolak' },
};

const FILTERS: Array<{ id: string; en: string; id_: string }> = [
  { id: 'ALL',      en: 'All',      id_: 'Semua' },
  { id: 'PENDING',  en: 'Pending',  id_: 'Menunggu' },
  { id: 'ACCEPTED', en: 'Accepted', id_: 'Diterima' },
  { id: 'REJECTED', en: 'Rejected', id_: 'Ditolak' },
];

const COVERAGE_LABEL: Record<string, [en: string, id: string]> = {
  coverage_type: ['Coverage type', 'Jenis pertanggungan'],
  deductible:    ['Deductible', 'Risiko sendiri'],
  unit_count:    ['Units', 'Jumlah unit'],
  sum_insured:   ['Sum insured', 'Nilai pertanggungan'],
  period_months: ['Period', 'Periode'],
  territory:     ['Territory', 'Wilayah'],
};
const COVERAGE_TYPE_LABEL: Record<string, string> = {
  COMPREHENSIVE: 'Komprehensif', TLO: 'Total Loss Only',
};
const MONEY_KEYS = new Set(['deductible', 'sum_insured', 'premium', 'premium_amount']);

const coverageLabel = (key: string, lang: Language) => {
  const pair = COVERAGE_LABEL[key];
  if (!pair) return key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  return lang === Language.EN ? pair[0] : pair[1];
};
const coverageValue = (key: string, value: unknown) => {
  if (typeof value === 'number' && MONEY_KEYS.has(key)) return formatIDR(value);
  if (typeof value === 'number') return value.toLocaleString('id-ID');
  if (typeof value === 'string') return COVERAGE_TYPE_LABEL[value] ?? value;
  return String(value);
};

const fmtDate = (iso?: string | null, lang: Language = Language.ID) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const B2BQuotes: React.FC<Props> = ({ clientId, lang, companyName, allClients, companyByClient }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const toast = useB2BToast();
  const [quotes, setQuotes] = useState<SpB2BQuote[]>([]);
  const [loading, setLoading] = useState(true);
  // v2.8.6 — layanan kini melempar; tangkap dan tampilkan panel Coba lagi
  // alih-alih menyamar jadi "tidak ada penawaran".
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SpB2BQuote | null>(null);
  const [acting, setActing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    if (!allClients && !clientId) return;
    setLoading(true); setLoadError(false);
    try {
      const data = allClients ? await getAllB2BQuotes() : await getB2BQuotes(clientId);
      setQuotes(data);
    } catch (err) {
      console.error('Unable to load B2B quotes:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [clientId, allClients, reloadKey]);

  const handleAction = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!selected) return;
    setActing(true);
    const ok = await updateB2BQuoteStatus(selected.id, status);
    setActing(false);
    if (ok) {
      setQuotes(prev => prev.map(q => q.id === selected.id ? { ...q, status } : q));
      setSelected(prev => prev ? { ...prev, status } : prev);
      toast.success(
        status === 'ACCEPTED'
          ? t('Quote accepted. Insurer will be notified.', 'Penawaran diterima. Penanggung akan diberi tahu.')
          : t('Quote rejected.', 'Penawaran ditolak.'),
      );
    } else {
      toast.error(t('Failed to update quote. Try again.', 'Gagal memperbarui penawaran. Coba lagi.'));
    }
  };

  const handleDownload = async () => {
    if (!selected || downloading) return;
    setDownloading(true);
    try {
      const resolvedCompany = companyByClient?.[selected.client_id] ?? companyName;
      await publishAndDownloadQuotation(
        fromB2BQuote(selected, resolvedCompany),
        { sourceApp: 'B2B', totalPremiumNumeric: selected.premium_amount ?? undefined },
      );
    } catch (err) {
      console.error('Quotation slip download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const filtered = quotes
    .filter(q => filter === 'ALL' || q.status === filter)
    .filter(q => {
      if (!search) return true;
      const needle = search.toLowerCase();
      const insurer = (q.insurer_name ?? '').toLowerCase();
      const company = (companyByClient?.[q.client_id] ?? '').toLowerCase();
      return insurer.includes(needle) || company.includes(needle);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const columns: B2BColumn<SpB2BQuote>[] = [
    {
      key: 'insurer', header: t('Insurer', 'Penanggung'),
      render: (q) => (
        <div>
          <div className="font-bold text-slate-900">{q.insurer_name ?? t('Insurer', 'Penanggung')}</div>
          {allClients && companyByClient?.[q.client_id] && (
            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">
              {companyByClient[q.client_id]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'premium', header: t('Annual Premium', 'Premi Tahunan'), align: 'right',
      render: (q) => (
        <span className="font-black text-emerald-700 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>
          {formatIDR(q.premium_amount ?? 0)}
        </span>
      ),
    },
    {
      key: 'valid', header: t('Valid Until', 'Berlaku s.d.'), align: 'right', hideBelow: 'lg',
      render: (q) => <span className="text-slate-500 tabular-nums">{fmtDate(q.valid_until, lang)}</span>,
    },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (q) => {
        const m = STATUS_MAP[q.status] ?? { tone: 'neutral' as B2BPillTone, en: q.status, id: q.status };
        return <B2BPill tone={m.tone}>{lang === Language.EN ? m.en : m.id}</B2BPill>;
      },
    },
  ];

  const selectedCompany = selected ? (companyByClient?.[selected.client_id] ?? companyName) : undefined;
  const detailStatus = selected ? (STATUS_MAP[selected.status] ?? null) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <B2BGlass className="p-6">
        <B2BSectionHeader
          title={allClients ? t('All Client Quotes', 'Penawaran Semua Klien') : t('Insurer Quotes', 'Penawaran Penanggung')}
          subtitle={t(`${filtered.length} of ${quotes.length} total`, `${filtered.length} dari ${quotes.length} total`)}
          action={<B2BSearchInput value={search} onChange={setSearch} placeholder={t('Search insurer…', 'Cari penanggung…')} className="w-48 lg:w-64" />}
        />

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
              <p className="text-sm font-bold text-amber-900">{t('Could not load quotes.', 'Penawaran belum dapat dimuat.')}</p>
              <p className="text-xs text-amber-700 mt-1">{t('Check your connection and try again. Nothing was changed.',
                                                              'Periksa koneksi lalu coba lagi. Tidak ada data yang berubah.')}</p>
              <B2BButton variant="ghost" icon={RefreshCw} onClick={() => setReloadKey(k => k + 1)} className="mt-3">
                {t('Try again', 'Coba lagi')}
              </B2BButton>
            </div>
          </div>
        ) : (
          <B2BTable
            columns={columns}
            rows={filtered}
            onRowClick={(q) => setSelected(q)}
            loading={loading}
            empty={t('No quotes match your filter.', 'Tidak ada penawaran dengan filter ini.')}
          />
        )}
      </B2BGlass>

      <B2BSidePanel
        open={selected !== null}
        onClose={() => { setSelected(null); setActing(false); }}
        title={selected?.insurer_name ?? t('Insurer', 'Penanggung')}
        subtitle={selectedCompany ? selectedCompany : undefined}
        footer={
          selected && selected.status === 'PENDING' && !allClients && (
            <div className="flex gap-2">
              <B2BButton
                variant="success"
                icon={ThumbsUp}
                onClick={() => handleAction('ACCEPTED')}
                disabled={acting}
                className="flex-1"
              >
                {t('Accept', 'Terima')}
              </B2BButton>
              <B2BButton
                variant="danger"
                icon={ThumbsDown}
                onClick={() => handleAction('REJECTED')}
                disabled={acting}
                className="flex-1"
              >
                {t('Reject', 'Tolak')}
              </B2BButton>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Premium card */}
            <div className="rounded-xl p-4" style={{ background: 'linear-gradient(115deg, rgba(5,150,105,0.08), rgba(5,150,105,0.04))', border: '1px solid rgba(5,150,105,0.2)' }}>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                {t('Annual Premium', 'Premi Tahunan')}
              </div>
              <div
                className="text-2xl font-black text-emerald-700 mt-1 tabular-nums"
                style={{ fontFamily: '"JetBrains Mono",monospace', letterSpacing: '-0.02em' }}
              >
                {formatIDR(selected.premium_amount ?? 0)}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
              {detailStatus && (
                <B2BPill tone={detailStatus.tone}>
                  {lang === Language.EN ? detailStatus.en : detailStatus.id}
                </B2BPill>
              )}
            </div>

            {/* Coverage */}
            {Object.keys(selected.coverage_details ?? {}).length > 0 && (
              <div className="border-t border-slate-200/70 pt-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                  {t('Coverage', 'Pertanggungan')}
                </span>
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-2">
                  {Object.entries(selected.coverage_details).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-500">{coverageLabel(k, lang)}</span>
                      <span className="font-bold text-slate-900 text-right">{coverageValue(k, v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validity + quoted date */}
            <div className="border-t border-slate-200/70 pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">{t('Quoted', 'Ditawarkan')}</span>
                <span className="font-bold text-slate-900">{fmtDate(selected.created_at, lang)}</span>
              </div>
              {selected.valid_until && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">{t('Valid until', 'Berlaku s.d.')}</span>
                  <span className="font-bold text-slate-900">{fmtDate(selected.valid_until, lang)}</span>
                </div>
              )}
            </div>

            {/* Terms */}
            {selected.terms && (
              <div className="border-t border-slate-200/70 pt-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <FileText size={11} />
                  {t('Terms & Conditions', 'Syarat & Ketentuan')}
                </span>
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selected.terms}
                </div>
              </div>
            )}

            {/* Download PDF */}
            <B2BButton
              variant="ghost"
              icon={FileDown}
              onClick={handleDownload}
              disabled={downloading}
              className="w-full"
            >
              {downloading ? t('Preparing PDF…', 'Menyiapkan PDF…') : t('Download Quotation (PDF)', 'Unduh Penawaran (PDF)')}
            </B2BButton>
          </div>
        )}
      </B2BSidePanel>
    </div>
  );
};

export default B2BQuotes;
