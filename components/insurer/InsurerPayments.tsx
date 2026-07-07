// InsurerPayments.tsx — Bayar tab. Payment list + reconciliation summary.

import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, CheckCircle2, Clock } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { UnderlineTabs, EmptyState, SkeletonCard, useToast } from '../ui';
import { listInsurerPayments, type InsurerPayment } from '../../services/insurerService';

interface Props {
  authToken: string;
  lang: Language;
  refreshTick: number;
}

const STATUS_TABS = [
  { id: 'PAID',    label: 'Lunas' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'ALL',     label: 'Semua' },
];

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const InsurerPayments: React.FC<Props> = ({ authToken, refreshTick }) => {
  const toast = useToast();
  const [allPayments, setAllPayments] = useState<InsurerPayment[]>([]);
  const [activeStatus, setActiveStatus] = useState('PAID');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInsurerPayments(authToken);
      setAllPayments(data);
    } catch (e: any) {
      console.error('InsurerPayments load:', e);
      toast.error(`Gagal memuat pembayaran: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [authToken, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const filtered = allPayments.filter(p => activeStatus === 'ALL' || p.status === activeStatus);

  const totalPaid = allPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.paid_amount ?? p.amount ?? 0), 0);
  const totalPending = allPayments.filter(p => p.status === 'PENDING').reduce((s, p) => s + (p.amount ?? 0), 0);

  const handleExportCSV = () => {
    if (allPayments.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const rows: [string, string][] = [
      ['=== RINGKASAN ===', ''],
      ['Total Lunas', fmtIdr(totalPaid)],
      ['Total Pending', fmtIdr(totalPending)],
      ['', ''],
      ['=== DETAIL PEMBAYARAN ===', ''],
      ['No. Order', ''],
      ['Nasabah', ''],
      ['Produk', ''],
      ['Jumlah', ''],
      ['Status', ''],
      ['Metode', ''],
      ['Tanggal Bayar', ''],
    ];
    for (const p of allPayments) {
      rows.push(['', '']);
      rows.push(['No. Order', p.order_number ?? '-']);
      rows.push(['Nasabah', p.client_name ?? '-']);
      rows.push(['Produk', p.product_name ?? '-']);
      rows.push(['Jumlah', fmtIdr(p.paid_amount ?? p.amount)]);
      rows.push(['Status', p.status]);
      rows.push(['Metode', `${p.payment_method ?? '-'} ${p.payment_channel ?? ''}`.trim()]);
      rows.push(['Tanggal Bayar', p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID') : '-']);
    }
    const csv = rows.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SurePath_Payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV berhasil didownload');
  };

  if (loading) {
    return (
      <div className="px-5 pt-5 space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 space-y-4 pb-4">
      <SectionLabel action={{ label: 'Export CSV', onClick: handleExportCSV }}>
        Notifikasi Pembayaran
      </SectionLabel>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-ds-border bg-ds-card">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 bg-ds-card2 px-2 py-0.5 rounded-full">
              {allPayments.filter(p => p.status === 'PAID').length}
            </span>
          </div>
          <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mt-2">Total Lunas</p>
          <p className="text-xl font-black text-emerald-500 mt-0.5">{fmtIdr(totalPaid)}</p>
        </div>
        <div className="p-4 rounded-2xl border border-ds-border bg-ds-card">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <Clock size={18} className="text-amber-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 bg-ds-card2 px-2 py-0.5 rounded-full">
              {allPayments.filter(p => p.status === 'PENDING').length}
            </span>
          </div>
          <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mt-2">Total Pending</p>
          <p className="text-xl font-black text-amber-500 mt-0.5">{fmtIdr(totalPending)}</p>
        </div>
      </div>

      <UnderlineTabs
        tabs={STATUS_TABS.map(t => ({ id: t.id, label: t.label }))}
        activeId={activeStatus}
        onChange={setActiveStatus}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Tidak ada pembayaran"
          description="Notifikasi pembayaran akan muncul di sini saat nasabah membayar premi."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="p-4 rounded-2xl border border-ds-border bg-ds-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-ds-ink3">{p.order_number ?? p.order_id.slice(0, 8)}</p>
                  <p className="text-sm font-bold text-ds-ink mt-0.5 truncate">{p.client_name ?? '-'}</p>
                  <p className="text-xs text-ds-ink2 mt-0.5">{p.product_name ?? '-'}</p>
                  <p className="text-sm font-black text-purple-500 mt-1">{fmtIdr(p.paid_amount ?? p.amount)}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-ds-ink3">
                    <span>{p.payment_method ?? '-'} {p.payment_channel ?? ''}</span>
                    {p.paid_at && <span>· {new Date(p.paid_at).toLocaleString('id-ID')}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                  p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : p.status === 'PENDING' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsurerPayments;
