import React, { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, FileDown, AlertTriangle, RefreshCw } from 'lucide-react';
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

// `coverage_details` is free-form JSON an operator fills in, so the screen used
// to print its keys title-cased and its values with String(). In an Indonesian
// UI that rendered "Coverage Type / Deductible / Unit Count", and a deductible
// of 1_500_000 came out as the bare digits "1500000" on a corporate quote.
// Known keys get a proper label; anything else still falls back to the key.
const COVERAGE_LABEL: Record<string, [en: string, id: string]> = {
  coverage_type:   ['Coverage type', 'Jenis pertanggungan'],
  deductible:      ['Deductible', 'Risiko sendiri'],
  unit_count:      ['Units', 'Jumlah unit'],
  sum_insured:     ['Sum insured', 'Nilai pertanggungan'],
  period_months:   ['Period', 'Periode'],
  territory:       ['Territory', 'Wilayah'],
};

const COVERAGE_TYPE_LABEL: Record<string, string> = {
  COMPREHENSIVE: 'Komprehensif',
  TLO:           'Total Loss Only',
};

// Rupiah-bearing keys, so a number is read as money rather than a count.
const MONEY_KEYS = new Set(['deductible', 'sum_insured', 'premium', 'premium_amount']);

const coverageLabel = (key: string, lang: Language) => {
  const pair = COVERAGE_LABEL[key];
  if (!pair) return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return lang === Language.EN ? pair[0] : pair[1];
};

const coverageValue = (key: string, value: unknown) => {
  if (typeof value === 'number' && MONEY_KEYS.has(key)) return formatIDR(value);
  if (typeof value === 'number') return value.toLocaleString('id-ID');
  if (typeof value === 'string') return COVERAGE_TYPE_LABEL[value] ?? value;
  return String(value);
};

interface QuoteCardProps {
  quote: SpB2BQuote;
  lang: Language;
  companyName?: string;
  /** Returns false when the decision failed to save — the card shows the
   *  failure inline instead of silently keeping the stale PENDING badge. */
  onAction: (id: string, status: 'ACCEPTED' | 'REJECTED') => Promise<boolean>;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, lang, companyName, onAction }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [termsOpen, setTermsOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState(false);

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
    // Keputusan korporat (menerima/menolak penawaran) dikonfirmasi dulu —
    // sekali klik tanpa konfirmasi terlalu mudah salah sentuh di ponsel.
    const confirmMsg = status === 'ACCEPTED'
      ? t(
          'Accept this quote? The insurer will be notified and this decision is final.',
          'Terima penawaran ini? Penanggung akan diberi tahu dan keputusan ini final.',
        )
      : t(
          'Reject this quote? You will lose this offer and this decision is final.',
          'Tolak penawaran ini? Tawaran ini hangus dan keputusan ini final.',
        );
    if (!window.confirm(confirmMsg)) return;
    setActionError(false);
    setActing(true);
    const ok = await onAction(quote.id, status);
    setActing(false);
    if (!ok) setActionError(true);
  };

  return (
    <div className="rounded-2xl bg-ds-card border border-ds-border p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-black text-sm">{quote.insurer_name ?? t('Insurer', 'Penanggung')}</div>
          <div className="text-[11px] text-ds-ink3 mt-0.5">{t('Quoted', 'Ditawarkan')} {fmtDate(quote.created_at)}</div>
        </div>
        <span className={`text-2xs font-black px-2 py-1 rounded-full flex-shrink-0 ${STATUS_BADGE[quote.status] ?? ''}`}>
          {STATUS_LABEL[quote.status] ?? quote.status}
        </span>
      </div>

      {/* Premium */}
      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
        <div className="text-2xs font-bold text-ds-green uppercase tracking-widest">{t('Annual Premium', 'Premi Tahunan')}</div>
        <div className="text-xl font-black text-ds-green mt-0.5">{formatIDR(quote.premium_amount)}</div>
      </div>

      {/* Coverage details */}
      {Object.keys(quote.coverage_details ?? {}).length > 0 && (
        <div className="rounded-xl bg-ds-card2 p-3 space-y-1.5">
          {Object.entries(quote.coverage_details).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs gap-2">
              <span className="text-ds-ink3">{coverageLabel(k, lang)}</span>
              <span className="font-bold text-ds-ink2 text-right">{coverageValue(k, v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Valid until */}
      {quote.valid_until && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-ds-ink3">{t('Valid until', 'Berlaku s.d.')}</span>
          <span className="font-bold text-ds-ink2">{fmtDate(quote.valid_until)}</span>
        </div>
      )}

      {/* Terms */}
      {quote.terms && (
        <div>
          <button
            onClick={() => setTermsOpen(!termsOpen)}
            className="flex items-center gap-1 text-xs font-bold text-ds-ink3"
          >
            {termsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {t('Terms & Conditions', 'Syarat & Ketentuan')}
          </button>
          {termsOpen && (
            <div className="mt-2 rounded-xl border border-ds-border bg-ds-card2 p-3 text-xs text-ds-ink2 leading-relaxed">
              {quote.terms}
            </div>
          )}
        </div>
      )}

      {/* Download quotation slip */}
      <button
        disabled={downloading}
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-ds-green dark:text-emerald-400 text-xs font-black uppercase tracking-widest disabled:opacity-60"
      >
        {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
        {downloading ? t('Preparing PDF…', 'Menyiapkan PDF…') : t('Download Quotation (PDF)', 'Unduh Penawaran (PDF)')}
      </button>

      {/* Actions */}
      {quote.status === 'PENDING' && (
        <div className="space-y-2 pt-1">
          {actionError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 px-3 py-2.5">
              <AlertTriangle size={14} className="text-ds-amber dark:text-amber-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                {t('Could not save your decision. Check your connection and try again — the quote is still pending.', 'Keputusan belum tersimpan. Periksa koneksi lalu coba lagi — penawaran masih menunggu keputusan Anda.')}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={acting}
              onClick={() => handle('ACCEPTED')}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-ds-green text-ds-on-green text-xs font-black disabled:opacity-60"
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
        </div>
      )}
    </div>
  );
};

const B2BQuotes: React.FC<Props> = ({ clientId, lang, companyName }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [quotes, setQuotes] = useState<SpB2BQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterTab>('ALL');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!clientId) {
        setQuotes([]);
        setLoading(false);
        setLoadError(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getB2BQuotes(clientId);
        if (!cancelled) setQuotes(data);
      } catch (error) {
        console.error('Unable to load B2B quotes:', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [clientId, reloadKey]);

  const handleAction = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    const ok = await updateB2BQuoteStatus(id, status);
    if (ok) setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    return ok;
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
            className={`px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider transition-colors ${
              filter === f
                ? 'bg-ds-green text-ds-on-green'
                : 'bg-ds-card2 text-ds-ink3'
            }`}
          >
            {f === 'ALL' ? t('All', 'Semua') : (STATUS_LABEL[f] ?? f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-ds-green" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-5 text-center space-y-3">
          <AlertTriangle size={24} className="mx-auto text-ds-amber dark:text-amber-300" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">{t('Could not load quotes.', 'Penawaran belum dapat dimuat.')}</p>
          <p className="text-xs text-amber-700 dark:text-amber-200/80">{t('Check your connection and try again. No quote was changed.', 'Periksa koneksi lalu coba lagi. Tidak ada penawaran yang berubah.')}</p>
          <button type="button" onClick={() => setReloadKey(key => key + 1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
            <RefreshCw size={14} /> {t('Try again', 'Coba lagi')}
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-ds-ink3 text-sm">
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
