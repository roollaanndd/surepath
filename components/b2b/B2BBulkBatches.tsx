import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2, ChevronLeft, ExternalLink, FileDown, CheckCircle2, Clock,
  AlertTriangle, RefreshCw,
} from 'lucide-react';
import { Language } from '../../types';
import {
  getB2BBulkBatches, getB2BBulkBatch, createB2BBulkInvoice,
  type SpB2BBatch, type SpB2BBatchItem,
} from '../../services/supabaseService';
import { generateB2BBulkSchedulePDF } from '../../services/pdfService';

interface Props {
  clientId: string;
  lang: Language;
}

const STATUS_LABEL: Record<string, [string, string]> = {
  DRAFT:     ['Draft', 'Draf'],
  SUBMITTED: ['Awaiting Invoice', 'Menunggu Invoice'],
  INVOICED:  ['Awaiting Payment', 'Menunggu Pembayaran'],
  PAID:      ['Paid — Awaiting Policy', 'Dibayar — Menunggu Polis'],
  ISSUED:    ['Policy Issued', 'Polis Terbit'],
  CANCELLED: ['Cancelled', 'Dibatalkan'],
};

const STATUS_CLS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-ds-ink3',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  INVOICED:  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  PAID:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  ISSUED:    'bg-emerald-500 text-white',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const B2BBulkBatches: React.FC<Props> = ({ lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [batches, setBatches] = useState<SpB2BBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ batch: SpB2BBatch; items: SpB2BBatchItem[]; payment: { invoice_url: string | null; status: string } | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getB2BBulkBatches();
      setBatches(data);
      setError('');
    } catch (e) {
      // v2.7.56: getB2BBulkBatches kini melempar error — tampilkan, jangan
      // diam-diam tampil sebagai daftar batch kosong.
      console.error('Unable to load B2B bulk batches:', e);
      setError('Batch belum dapat dimuat. Periksa koneksi lalu tarik ke bawah untuk mencoba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openBatch = async (batchId: string) => {
    setDetailLoading(true);
    setError('');
    const data = await getB2BBulkBatch(batchId);
    setDetailLoading(false);
    if (data) setSelected(data as any);
  };

  const handleInvoice = async () => {
    if (!selected) return;
    setInvoiceLoading(true);
    const res = await createB2BBulkInvoice(selected.batch.id);
    setInvoiceLoading(false);
    if (res?.invoice_url) {
      setSelected(prev => prev ? { ...prev, batch: { ...prev.batch, status: 'INVOICED' }, payment: { invoice_url: res.invoice_url, status: 'PENDING' } } : prev);
      load();
    } else {
      setError(t('Failed to create invoice. Try again.', 'Gagal membuat invoice. Coba lagi.'));
    }
  };

  const handleDownloadSchedule = () => {
    if (!selected || !selected.batch.master_policy_number) return;
    generateB2BBulkSchedulePDF({
      batchNumber: selected.batch.batch_number,
      companyName: selected.batch.company_name,
      masterPolicyNumber: selected.batch.master_policy_number,
      insurerName: selected.batch.insurer_name,
      issuedAt: selected.batch.issued_at ?? new Date().toISOString(),
      totalAmount: selected.batch.total_amount,
      rows: selected.items.map(it => ({
        rowNo: it.row_no, nasabahName: it.nasabah_name, make: it.make, model: it.model,
        plateNo: it.plate_no, totalPremium: it.total_premium,
      })),
    });
  };

  // ─── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    const { batch, items, payment } = selected;
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs font-bold text-ds-ink3">
          <ChevronLeft size={14} /> {t('Back to batches', 'Kembali ke daftar batch')}
        </button>

        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-sm font-black">{batch.batch_number}</div>
            <div className="text-xs text-ds-ink3">{fmtDate(batch.created_at)} · {batch.item_count} {t('units', 'unit')}</div>
          </div>
          <span className={`text-2xs font-black uppercase tracking-widest px-2 py-1 rounded-full ${STATUS_CLS[batch.status] ?? ''}`}>
            {lang === Language.EN ? STATUS_LABEL[batch.status]?.[0] : STATUS_LABEL[batch.status]?.[1]}
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Gross Premium', 'Premi Gross')}</span><span className="font-bold">{fmtIDR(batch.total_premium_gross)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Discount', 'Diskon')}</span><span className="font-bold">-{fmtIDR(batch.total_discount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Admin Fee', 'Biaya Admin')}</span><span className="font-bold">{fmtIDR(batch.total_admin_fee)}</span></div>
          <div className="flex justify-between text-base border-t border-slate-100 dark:border-white/10 pt-2 mt-1">
            <span className="font-black">{t('Total', 'Total')}</span>
            <span className="font-black text-ds-green">{fmtIDR(batch.total_amount)}</span>
          </div>
        </div>

        {batch.status === 'SUBMITTED' && (
          <button
            disabled={invoiceLoading}
            onClick={handleInvoice}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-black disabled:opacity-60"
          >
            {invoiceLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('Create Invoice', 'Buat Invoice')}
          </button>
        )}

        {batch.status === 'INVOICED' && payment?.invoice_url && (
          <a
            href={payment.invoice_url} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-black"
          >
            {t('Pay Now', 'Bayar Sekarang')} <ExternalLink size={14} />
          </a>
        )}

        {batch.status === 'PAID' && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-xs text-ds-green dark:text-emerald-300">
            <Clock size={14} className="flex-shrink-0" />
            {t('Payment received. Waiting for the insurer to issue the master policy.', 'Pembayaran diterima. Menunggu polis induk diterbitkan oleh penanggung.')}
          </div>
        )}

        {batch.status === 'ISSUED' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-xs text-ds-green dark:text-emerald-300">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {t('Policy No.', 'No. Polis')}: <span className="font-mono font-bold">{batch.master_policy_number}</span>
            </div>
            {batch.master_policy_document_url && (
              <a
                href={batch.master_policy_document_url} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-ds-green dark:text-emerald-400 text-xs font-black"
              >
                <ExternalLink size={13} /> {t('Download Master Policy (PDF)', 'Unduh Polis Induk (PDF)')}
              </a>
            )}
            <button
              onClick={handleDownloadSchedule}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-black text-ds-ink2"
            >
              <FileDown size={13} /> {t('Download Vehicle Schedule (PDF)', 'Unduh Lampiran Daftar Kendaraan (PDF)')}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-white/5 text-ds-ink3 uppercase text-2xs">
              <tr>
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">{t('Name', 'Nama')}</th>
                <th className="px-2 py-2 text-left">{t('Vehicle', 'Kendaraan')}</th>
                <th className="px-2 py-2 text-right">{t('Total', 'Total')}</th>
                <th className="px-2 py-2 text-left">{t('Status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {items.map(it => (
                <tr key={it.id}>
                  <td className="px-2 py-1.5 text-ds-ink3">{it.row_no}</td>
                  <td className="px-2 py-1.5 font-bold max-w-[160px] truncate">{it.nasabah_name}</td>
                  <td className="px-2 py-1.5">{[it.make, it.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-2 py-1.5 text-right">{fmtIDR(it.total_premium)}</td>
                  <td className="px-2 py-1.5">{it.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg">{t('Bulk Batches', 'Daftar Batch Massal')}</h2>
        <button onClick={load} className="p-2 rounded-xl text-ds-ink3"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {detailLoading && (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-ds-green" /></div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-ds-green" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 text-ds-ink3 text-sm">{t('No bulk batches yet.', 'Belum ada batch massal.')}</div>
      ) : (
        <div className="space-y-3">
          {batches.map(b => (
            <button
              key={b.id}
              onClick={() => openBatch(b.id)}
              className="w-full text-left rounded-2xl bg-ds-card border border-ds-border p-4 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs font-black">{b.batch_number}</div>
                  <div className="text-2xs text-ds-ink3 mt-0.5">{fmtDate(b.created_at)} · {b.item_count} {t('units', 'unit')}</div>
                </div>
                <span className={`text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_CLS[b.status] ?? ''}`}>
                  {lang === Language.EN ? STATUS_LABEL[b.status]?.[0] : STATUS_LABEL[b.status]?.[1]}
                </span>
              </div>
              <div className="text-lg font-black text-ds-green">{fmtIDR(b.total_amount)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default B2BBulkBatches;
