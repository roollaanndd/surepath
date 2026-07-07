// OperatorOrders.tsx — Polis tab. List of policy orders, filter by status,
// approve/reject/issue inline.
import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Search, CheckCircle2, XCircle, Eye, Clock } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { UnderlineTabs, EmptyState, SkeletonCard, useToast, useConfirmDialog } from '../ui';
import { listOrders, updateOrderStatus, type OperatorOrder } from '../../services/operatorService';

interface Props {
  operator: any;
  lang: Language;
  refreshTick: number;
}

const STATUS_TABS = [
  { id: 'SUBMITTED',     label: 'Baru' },
  { id: 'UNDER_REVIEW',  label: 'Ditinjau' },
  { id: 'APPROVED',      label: 'Disetujui' },
  { id: 'ISSUED',        label: 'Terbit' },
  { id: 'REJECTED',      label: 'Ditolak' },
  { id: 'ALL',           label: 'Semua' },
];

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const OperatorOrders: React.FC<Props> = ({ refreshTick }) => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [activeStatus, setActiveStatus] = useState('SUBMITTED');
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OperatorOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeStatus === 'ALL' ? undefined : activeStatus;
      const data = await listOrders(status, 200);
      setOrders(data);
    } catch (e: any) {
      console.error('OperatorOrders load:', e);
      toast.error(`Gagal memuat order: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const filtered = orders.filter(o => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (o.order_number ?? '').toLowerCase().includes(q)
      || (o.client_name ?? '').toLowerCase().includes(q)
      || (o.product_name ?? '').toLowerCase().includes(q);
  });

  const handleApprove = async (o: OperatorOrder) => {
    const ok = await confirm({
      title: 'Setujui Pengajuan Polis',
      description: `Setujui order ${o.order_number ?? o.id} untuk ${o.client_name}? Order akan diteruskan ke insurer untuk penerbitan polis.`,
      confirmLabel: 'Setujui',
      variant: 'primary',
    });
    if (!ok) return;
    try {
      await updateOrderStatus(o.id, 'APPROVED', 'Disetujui oleh operator');
      toast.success('Order disetujui');
      load();
    } catch (e: any) {
      toast.error(`Gagal menyetujui: ${e.message}`);
    }
  };

  const handleReject = async (o: OperatorOrder) => {
    const ok = await confirm({
      title: 'Tolak Pengajuan Polis',
      description: `Tolak order ${o.order_number ?? o.id}? Nasabah akan diminta melengkapi data.`,
      confirmLabel: 'Tolak',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await updateOrderStatus(o.id, 'REJECTED', 'Ditolak oleh operator');
      toast.info('Order ditolak');
      load();
    } catch (e: any) {
      toast.error(`Gagal menolak: ${e.message}`);
    }
  };

  const handleIssue = async (o: OperatorOrder) => {
    const policyNumber = await prompt('Nomor polis dari insurer:');
    if (!policyNumber) return;
    try {
      await updateOrderStatus(o.id, 'ISSUED', 'Polis diterbitkan', policyNumber);
      toast.success('Polis diterbitkan');
      load();
    } catch (e: any) {
      toast.error(`Gagal menerbitkan: ${e.message}`);
    }
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
      <SectionLabel>Antrian Polis</SectionLabel>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-ink3" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari order / nasabah / produk…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ds-card border border-ds-border text-sm text-ds-ink placeholder-ds-ink3 outline-none focus:border-ds-green"
        />
      </div>

      {/* Status tabs */}
      <UnderlineTabs
        tabs={STATUS_TABS.map(t => ({ id: t.id, label: t.label }))}
        activeId={activeStatus}
        onChange={setActiveStatus}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Tidak ada order"
          description="Antrian kosong untuk status ini. Notifikasi pop-up akan muncul saat ada order baru."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const statusColor = {
              SUBMITTED:     'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
              UNDER_REVIEW:  'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
              APPROVED:      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
              ISSUED:        'bg-ds-green-tint text-ds-green',
              REJECTED:      'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
              CANCELLED:     'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
            }[o.status] ?? 'bg-ds-card2 text-ds-ink3';
            return (
              <div key={o.id} className="p-4 rounded-2xl border border-ds-border bg-ds-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-ds-ink3">{o.order_number ?? o.id.slice(0, 8)}</p>
                    <p className="text-sm font-bold text-ds-ink mt-0.5 truncate">{o.client_name}</p>
                    <p className="text-xs text-ds-ink2 mt-0.5">{o.product_name}</p>
                    <p className="text-xs text-ds-ink3 mt-1">{o.coverage_type} · {fmtIdr(o.total_premium)}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${statusColor}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ds-border">
                  <button
                    onClick={() => setSelectedOrder(o)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-card2 text-ds-ink2 active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Eye size={12} /> Detail
                  </button>
                  {o.status === 'SUBMITTED' && (
                    <>
                      <button
                        onClick={() => handleApprove(o)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Setujui
                      </button>
                      <button
                        onClick={() => handleReject(o)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                      >
                        <XCircle size={12} /> Tolak
                      </button>
                    </>
                  )}
                  {o.status === 'UNDER_REVIEW' && (
                    <button
                      onClick={() => handleApprove(o)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Setujui
                    </button>
                  )}
                  {o.status === 'APPROVED' && (
                    <button
                      onClick={() => handleIssue(o)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <Clock size={12} /> Terbitkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedOrder(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full bg-ds-card rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-ds-border rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-ds-ink">Detail Order</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-ds-card2 text-ds-ink3">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <DetailRow label="No. Order" value={selectedOrder.order_number ?? selectedOrder.id} />
              <DetailRow label="Nasabah" value={selectedOrder.client_name} />
              <DetailRow label="Telepon" value={selectedOrder.client_phone ?? '-'} />
              <DetailRow label="Produk" value={selectedOrder.product_name} />
              <DetailRow label="Coverage" value={selectedOrder.coverage_type} />
              <DetailRow label="Sum Insured" value={fmtIdr(selectedOrder.sum_insured)} />
              <DetailRow label="Total Premi" value={fmtIdr(selectedOrder.total_premium)} />
              <DetailRow label="Net Premi" value={fmtIdr(selectedOrder.net_premium)} />
              <DetailRow label="Insurer" value={selectedOrder.insurer_name ?? '-'} />
              <DetailRow label="Status" value={selectedOrder.status} />
              <DetailRow label="Reviewer Notes" value={selectedOrder.reviewer_notes ?? '-'} />
              <DetailRow label="No. Polis" value={selectedOrder.policy_number ?? '-'} />
              <DetailRow label="Dibuat" value={new Date(selectedOrder.created_at).toLocaleString('id-ID')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-2 border-b border-ds-border">
    <span className="text-ds-ink3 text-xs font-bold uppercase tracking-widest">{label}</span>
    <span className="text-ds-ink text-sm font-medium text-right break-all">{value}</span>
  </div>
);

export default OperatorOrders;
