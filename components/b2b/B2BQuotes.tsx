import React, { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { Language } from '../../types';
import { getB2BQuotes, updateB2BQuoteStatus, type SpB2BQuote } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { publishAndDownloadQuotation } from '../../services/quotationService';
import { fromB2BQuote } from '../../services/quotationSlipAdapter';

interface Props {
  clientId: string;
  lang: Language;
  companyName?: string;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:  'Menunggu Keputusan',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
};

type FilterTab = 'ALL' | 'PENDING' | 'ACCEPTED';

interface QuoteCardProps {
  quote: SpB2BQuote;
  lang: Language;
  companyName?: string;
  onAction: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<void>;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, lang, companyName, onAction }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [termsOpen, setTermsOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await publishAndDownloadQuotation(fromB2BQuote(quote, companyName), { sourceApp: 'B2B', totalPremiumNumeric: quote.premium_amount ?? undefined });
    } catch (e) {
      console.error('Quotation slip download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handle = async (status: 'ACCEPTED' | 'REJECTED') => {
    setActing(true);
    await onAction(quote.id, status);
    setActing(false);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-black text-sm">{quote.insurer_name ?? t('Insurer', 'Penanggung')}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{t('Quoted', 'Ditawarkan')} {fmtDate(quote.created_at)}</div>
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded-full flex-shrink-0 ${STATUS_BADGE[quote.status] ?? ''}`}>
          {STATUS_LABEL[quote.status] ?? quote.status}
        </span>
      </div>

      {/* Premium */}
      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t('Annual Premium', 'Premi Tahunan')}</div>
        <div className="text-xl font-black text-emerald-500 mt-0.5">{formatIDR(quote.premium_amount)}</div>
      </div>

      {/* Coverage details */}
      {Object.keys(quote.coverage_details ?? {}).length > 0 && (
        <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3 space-y-1.5">
          {Object.entries(quote.coverage_details).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs gap-2">
              <span className="text-slate-500 dark:text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-right">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Valid until */}
      {quote.valid_until && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t('Valid until', 'Berlaku s.d.')}</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{fmtDate(quote.valid_until)}</span>
        </div>
      )}

      {/* Terms */}
      {quote.terms && (
        <div>
          <button
            onClick={() => setTermsOpen(!termsOpen)}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
          >
            {termsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {t('Terms & Conditions', 'Syarat & Ketentuan')}
          </button>
          {termsOpen && (
            <div className="mt-2 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {quote.terms}
            </div>
          )}
        </div>
      )}

      {/* Download quotation slip */}
      <button
        disabled={downloading}
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest disabled:opacity-60"
      >
        {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
        {downloading ? t('Preparing PDF…', 'Menyiapkan PDF…') : t('Download Quotation (PDF)', 'Unduh Quotation (PDF)')}
      </button>

      {/* Actions */}
      {quote.status === 'PENDING' && (
        <div className="flex gap-2 pt-1">
          <button
            disabled={acting}
            onClick={() => handle('ACCEPTED')}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black disabled:opacity-60"
          >
            {acting ? <Loader2 size={12} className="animate-spin" /> : null}
            {t('Accept', 'Terima')}
          </button>
          <button
            disabled={acting}
            onClick={() => handle('REJECTED')}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-rose-500 text-white text-xs font-black disabled:opacity-60"
          >
            {t('Reject', 'Tolak')}
          </button>
        </div>
      )}
    </div>
  );
};

const B2BQuotes: React.FC<Props> = ({ clientId, lang, companyName }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [quotes, setQuotes] = useState<SpB2BQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const load = async () => {
    if (!clientId) return;
    setLoading(true);
    const data = await getB2BQuotes(clientId);
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const handleAction = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    const ok = await updateB2BQuoteStatus(id, status);
    if (ok) {
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    }
  };

  const filtered = filter === 'ALL' ? quotes : quotes.filter(q => q.status === filter);
  const sorted = filtered.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <h2 className="font-black text-lg">{t('Quotes', 'Penawaran')}</h2>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(['ALL', 'PENDING', 'ACCEPTED'] as FilterTab[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
              filter === f
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            {f === 'ALL' ? t('All', 'Semua') : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
          {t('No quotes yet.', 'Belum ada penawaran.')}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(q => (
            <QuoteCard key={q.id} quote={q} lang={lang} companyName={companyName} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
};

export default B2BQuotes;
