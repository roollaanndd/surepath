// B2BBulkBatches — bulk fleet batches as a dashboard table + detail view.
// Keeps the full invoice/pay/issue workflow intact (createB2BBulkInvoice,
// schedule PDF, master policy link); only the chrome changed.

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
import {
  B2BGlass, B2BTable, B2BPill, B2BSectionHeader, B2BSearchInput, B2BButton, useB2BToast,
  type B2BColumn, type B2BPillTone,
} from './dashboard/ui';

interface Props {
  clientId: string;
  lang: Language;
  allClients?: boolean;
}

const STATUS_MAP: Record<string, { tone: B2BPillTone; en: string; id: string }> = {
  DRAFT:     { tone: 'neutral', en: 'Draft',             id: 'Draf' },
  SUBMITTED: { tone: 'info',    en: 'Awaiting Invoice',  id: 'Menunggu Invoice' },
  INVOICED:  { tone: 'warn',    en: 'Awaiting Payment',  id: 'Menunggu Bayar' },
  PAID:      { tone: 'success', en: 'Paid',              id: 'Lunas' },
  ISSUED:    { tone: 'success', en: 'Policy Issued',     id: 'Polis Terbit' },
  CANCELLED: { tone: 'danger',  en: 'Cancelled',         id: 'Dibatalkan' },
};

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const B2BBulkBatches: React.FC<Props> = ({ lang, allClients }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const toast = useB2BToast();

  const [batches, setBatches] = useState<SpB2BBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ batch: SpB2BBatch; items: SpB2BBatchItem[]; payment: { invoice_url: string | null; status: string } | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getB2BBulkBatches(allClients ? { all: true } : {});
    setBatches(data);
    setLoading(false);
  }, [allClients]);

  useEffect(() => { void load(); }, [load]);

  const openBatch = async (batchId: string) => {
    setDetailLoading(true); setError('');
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
      toast.success(t('Invoice created. Ready to pay.', 'Invoice dibuat. Siap untuk dibayar.'));
    } else {
      setError(t('Failed to create invoice. Try again.', 'Gagal membuat invoice. Coba lagi.'));
      toast.error(t('Failed to create invoice. Try again.', 'Gagal membuat invoice. Coba lagi.'));
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

  /* ── Detail view ──────────────────────────────────────────────────────── */
  if (selected) {
    const { batch, items, payment } = selected;
    const status = STATUS_MAP[batch.status] ?? { tone: 'neutral' as B2BPillTone, en: batch.status, id: batch.status };
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={14} /> {t('Back to batches', 'Kembali ke daftar batch')}
        </button>

        <B2BGlass className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-xl text-slate-900 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace', letterSpacing: '-0.02em' }}>
                  {batch.batch_number}
                </span>
                <B2BPill tone={status.tone}>{lang === Language.EN ? status.en : status.id}</B2BPill>
              </div>
              {allClients && batch.company_name && (
                <div className="text-sm font-bold text-slate-700">{batch.company_name}</div>
              )}
              <div className="text-xs text-slate-500 mt-0.5">
                {fmtDate(batch.created_at)} · {batch.item_count} {t('units', 'unit')}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {batch.status === 'SUBMITTED' && !allClients && (
                <B2BButton variant="primary" onClick={handleInvoice} disabled={invoiceLoading}>
                  {invoiceLoading && <Loader2 size={13} className="animate-spin" />}
                  {t('Create Invoice', 'Buat Invoice')}
                </B2BButton>
              )}
              {batch.status === 'INVOICED' && payment?.invoice_url && !allClients && (
                <a
                  href={payment.invoice_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all duration-150 active:scale-[0.97]"
                  style={{ background: 'linear-gradient(115deg, #059669 0%, #10b981 100%)' }}
                >
                  {t('Pay Now', 'Bayar Sekarang')} <ExternalLink size={13} />
                </a>
              )}
              {batch.status === 'ISSUED' && batch.master_policy_document_url && (
                <a
                  href={batch.master_policy_document_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-emerald-700 border border-emerald-200 bg-white/70 hover:bg-emerald-50 transition-colors"
                >
                  <ExternalLink size={13} /> {t('Master Policy', 'Polis Induk')}
                </a>
              )}
              {batch.status === 'ISSUED' && (
                <B2BButton variant="ghost" icon={FileDown} onClick={handleDownloadSchedule}>
                  {t('Vehicle Schedule', 'Lampiran Kendaraan')}
                </B2BButton>
              )}
            </div>
          </div>

          {batch.status === 'PAID' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <Clock size={14} className="flex-shrink-0" />
              {t('Payment received. Waiting for the insurer to issue the master policy.',
                 'Pembayaran diterima. Menunggu polis induk diterbitkan oleh penanggung.')}
            </div>
          )}

          {batch.status === 'ISSUED' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              {t('Policy No.', 'No. Polis')}: <span className="font-mono font-bold">{batch.master_policy_number}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Totals grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <TotalCard label={t('Gross Premium', 'Premi Gross')} value={fmtIDR(batch.total_premium_gross)} />
            <TotalCard label={t('Discount', 'Diskon')} value={`- ${fmtIDR(batch.total_discount)}`} />
            <TotalCard label={t('Admin Fee', 'Biaya Admin')} value={fmtIDR(batch.total_admin_fee)} />
            <TotalCard label={t('Total', 'Total')} value={fmtIDR(batch.total_amount)} accent />
          </div>
        </B2BGlass>

        {/* Items table */}
        <B2BGlass className="p-6">
          <B2BSectionHeader
            title={t('Vehicles in Batch', 'Kendaraan di Batch')}
            subtitle={`${items.length} ${t('rows', 'baris')}`}
          />
          <div className="b2b-scroll overflow-x-auto -mx-6 px-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="py-2.5 px-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest text-left w-12">#</th>
                  <th className="py-2.5 px-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest text-left">{t('Name', 'Nama')}</th>
                  <th className="py-2.5 px-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest text-left hidden md:table-cell">{t('Vehicle', 'Kendaraan')}</th>
                  <th className="py-2.5 px-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest text-left hidden lg:table-cell">{t('Plate', 'Plat')}</th>
                  <th className="py-2.5 px-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest text-right">{t('Premium', 'Premi')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-b border-slate-100/70 last:border-0 hover:bg-indigo-50/40">
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">{it.row_no}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 max-w-[200px] truncate">{it.nasabah_name}</td>
                    <td className="py-2.5 px-3 text-slate-600 hidden md:table-cell">
                      {[it.make, it.model].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono hidden lg:table-cell">{it.plate_no || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace' }}>
                      {fmtIDR(it.total_premium)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </B2BGlass>
      </div>
    );
  }

  /* ── List view ────────────────────────────────────────────────────────── */
  const filtered = batches
    .filter(b => !search ||
      b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      (b.company_name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const columns: B2BColumn<SpB2BBatch>[] = [
    {
      key: 'batch', header: 'Batch',
      render: (b) => (
        <div>
          <div className="font-black text-slate-900 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
            {b.batch_number}
          </div>
          {allClients && b.company_name && (
            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">{b.company_name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'date', header: t('Created', 'Dibuat'), hideBelow: 'md',
      render: (b) => <span className="text-slate-500 tabular-nums">{fmtDate(b.created_at)}</span>,
    },
    {
      key: 'units', header: 'Unit', align: 'right', hideBelow: 'md',
      render: (b) => <span className="font-bold text-slate-700 tabular-nums">{b.item_count ?? 0}</span>,
    },
    {
      key: 'amount', header: 'Nilai', align: 'right',
      render: (b) => (
        <span className="font-black text-emerald-700 tabular-nums" style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>
          {fmtIDR(b.total_amount)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', align: 'right',
      render: (b) => {
        const m = STATUS_MAP[b.status] ?? { tone: 'neutral' as B2BPillTone, en: b.status, id: b.status };
        return <B2BPill tone={m.tone}>{lang === Language.EN ? m.en : m.id}</B2BPill>;
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <B2BGlass className="p-6">
        <B2BSectionHeader
          title={t('Bulk Batches', 'Daftar Batch Massal')}
          subtitle={t(`${filtered.length} of ${batches.length} total`, `${filtered.length} dari ${batches.length} total`)}
          action={
            <div className="flex items-center gap-2">
              <B2BSearchInput value={search} onChange={setSearch} placeholder={t('Search batch…', 'Cari batch…')} className="w-40 lg:w-56" />
              <button
                onClick={load}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                aria-label={t('Refresh', 'Muat ulang')}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          }
        />
        {detailLoading && (
          <div className="py-4 text-center"><Loader2 size={18} className="animate-spin text-indigo-500 mx-auto" /></div>
        )}
        <B2BTable
          columns={columns}
          rows={filtered}
          onRowClick={(b) => openBatch(b.id)}
          loading={loading}
          empty={t('No bulk batches yet.', 'Belum ada batch massal.')}
        />
      </B2BGlass>
    </div>
  );
};

const TotalCard: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div
    className={`rounded-xl p-3 ${accent ? '' : 'bg-slate-50 border border-slate-200/70'}`}
    style={accent ? {
      background: 'linear-gradient(115deg, rgba(5,150,105,0.08), rgba(5,150,105,0.04))',
      border: '1px solid rgba(5,150,105,0.2)',
    } : undefined}
  >
    <div className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-emerald-700' : 'text-slate-500'}`}>
      {label}
    </div>
    <div
      className={`font-black mt-1 tabular-nums ${accent ? 'text-lg text-emerald-700' : 'text-sm text-slate-900'}`}
      style={{ fontFamily: '"JetBrains Mono",monospace', letterSpacing: '-0.015em' }}
    >
      {value}
    </div>
  </div>
);

export default B2BBulkBatches;
