// OperatorOrders.tsx — Polis tab. List of policy orders, filter by status,
// approve/reject/issue inline. Detail sheet includes document viewer.
import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Search, CheckCircle2, XCircle, Eye, Clock, ImageIcon, ExternalLink, Car, User, Phone, CreditCard, Calendar, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
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

// Use explicit colors (not CSS vars) for the modal to ensure visibility in both light + dark
const SHEET_BG = 'bg-white dark:bg-[#0F1829]';
const SHEET_TEXT = 'text-gray-900 dark:text-white';
const SHEET_TEXT_MUTED = 'text-gray-500 dark:text-gray-400';
const SHEET_BORDER = 'border-gray-200 dark:border-[#1E2D3D]';
const SHEET_INSET = 'bg-gray-50 dark:bg-[#162035]';

const OperatorOrders: React.FC<Props> = ({ refreshTick }) => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [activeStatus, setActiveStatus] = useState('SUBMITTED');
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OperatorOrder | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

      {/* Detail sheet — rebuilt with explicit dark mode + document viewer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedOrder(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative w-full ${SHEET_BG} rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="sticky top-0 z-10 pt-3 pb-2 bg-inherit">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between px-5">
                <h3 className={`text-lg font-black ${SHEET_TEXT}`}>Detail Pengajuan</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className={`w-8 h-8 rounded-full ${SHEET_INSET} ${SHEET_TEXT_MUTED} flex items-center justify-center text-lg`}
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-5 pb-8 space-y-5">
              {/* Order header */}
              <div className={`rounded-2xl p-4 ${SHEET_INSET}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${SHEET_TEXT_MUTED}`}>No. Order</p>
                    <p className={`text-sm font-mono font-bold ${SHEET_TEXT} mt-0.5`}>{selectedOrder.order_number ?? selectedOrder.id.slice(0, 8)}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${SHEET_TEXT_MUTED}`}>Dibuat</p>
                    <p className={`font-medium ${SHEET_TEXT}`}>{new Date(selectedOrder.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${SHEET_TEXT_MUTED}`}>Produk</p>
                    <p className={`font-medium ${SHEET_TEXT}`}>{selectedOrder.product_name}</p>
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <Section icon={<User size={14} />} title="Data Nasabah" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                <DetailRow label="Nama" value={selectedOrder.client_name} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="Telepon" value={selectedOrder.client_phone ?? '-'} icon={<Phone size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="No. KTP" value={selectedOrder.client_ktp ?? '-'} icon={<CreditCard size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
              </Section>

              {/* Vehicle info */}
              {selectedOrder.vehicle_details && (
                <Section icon={<Car size={14} />} title="Data Kendaraan" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                  {(() => {
                    const vd = selectedOrder.vehicle_details ?? {};
                    return (
                      <>
                        <DetailRow label="Merk / Model" value={`${vd.make ?? '-'} ${vd.model ?? ''}`.trim()} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                        <DetailRow label="Tahun" value={vd.year ? String(vd.year) : '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                        <DetailRow label="Warna" value={vd.color ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                        <DetailRow label="No. Plat" value={(vd.plate ?? `${vd.plateCode ?? ''} ${vd.plateNum ?? ''} ${vd.plateSuffix ?? ''}`.trim()) || '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                        <DetailRow label="No. Rangka" value={vd.chassis ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                        <DetailRow label="No. Mesin" value={vd.engine ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                        <DetailRow label="Penggunaan" value={vd.usage ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                      </>
                    );
                  })()}
                </Section>
              )}

              {/* Document viewer — vehicle photo + policy doc */}
              <Section icon={<ImageIcon size={14} />} title="Dokumen Upload" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                {selectedOrder.vehicle_image_url ? (
                  <button
                    onClick={() => setLightboxUrl(selectedOrder.vehicle_image_url)}
                    className={`w-full rounded-xl overflow-hidden border ${SHEET_BORDER} active:scale-[0.98] transition-transform`}
                  >
                    <img
                      src={selectedOrder.vehicle_image_url}
                      alt="Foto kendaraan"
                      className="w-full h-44 object-cover"
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div class="p-6 text-center text-xs text-gray-500 dark:text-gray-400">Foto gagal dimuat</div>'; }}
                    />
                    <div className={`px-3 py-2 flex items-center gap-2 ${SHEET_INSET}`}>
                      <ImageIcon size={12} className={SHEET_TEXT_MUTED} />
                      <span className={`text-xs font-bold ${SHEET_TEXT}`}>Foto Kendaraan</span>
                      <ExternalLink size={12} className={`ml-auto ${SHEET_TEXT_MUTED}`} />
                    </div>
                  </button>
                ) : (
                  <div className={`p-4 rounded-xl text-center text-xs ${SHEET_INSET} ${SHEET_TEXT_MUTED}`}>
                    <ImageIcon size={24} className="mx-auto mb-2 opacity-40" />
                    Tidak ada foto kendaraan diupload
                  </div>
                )}

                {selectedOrder.policy_document_url && (
                  <a
                    href={selectedOrder.policy_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-2 flex items-center gap-3 p-3 rounded-xl border ${SHEET_BORDER} ${SHEET_INSET} active:scale-[0.98] transition-transform`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                      <FileText size={16} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${SHEET_TEXT}`}>Polis PDF</p>
                      <p className={`text-[10px] ${SHEET_TEXT_MUTED}`}>Klik untuk buka di tab baru</p>
                    </div>
                    <ExternalLink size={14} className={SHEET_TEXT_MUTED} />
                  </a>
                )}
              </Section>

              {/* Coverage & premium */}
              <Section icon={<ShieldCheck size={14} />} title="Coverage & Premi" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                <DetailRow label="Coverage Type" value={selectedOrder.coverage_type} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="Sum Insured" value={fmtIdr(selectedOrder.sum_insured)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="Base Premi" value={fmtIdr(selectedOrder.base_premium)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                {selectedOrder.addon_premium ? <DetailRow label="Addon Premi" value={fmtIdr(selectedOrder.addon_premium)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} /> : null}
                {selectedOrder.admin_fee ? <DetailRow label="Biaya Admin" value={fmtIdr(selectedOrder.admin_fee)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} /> : null}
                {selectedOrder.stamp_duty ? <DetailRow label="Biaya Meterai" value={fmtIdr(selectedOrder.stamp_duty)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} /> : null}
                {selectedOrder.application_fee ? <DetailRow label="Biaya Layanan" value={fmtIdr(selectedOrder.application_fee)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} /> : null}
                {selectedOrder.discount_amount ? <DetailRow label="Diskon" value={`- ${fmtIdr(selectedOrder.discount_amount)}`} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} /> : null}
                <div className={`flex justify-between gap-3 py-2 mt-1 pt-3 border-t-2 ${SHEET_BORDER}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${SHEET_TEXT}`}>Total Premi</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmtIdr(selectedOrder.total_premium)}</span>
                </div>
                {selectedOrder.promo_code && <DetailRow label="Promo Code" value={selectedOrder.promo_code} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />}
              </Section>

              {/* Insurer & policy */}
              <Section icon={<Calendar size={14} />} title="Insurer & Polis" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                <DetailRow label="Insurer" value={selectedOrder.insurer_name ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="No. Polis" value={selectedOrder.policy_number ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="Start Date" value={selectedOrder.start_date ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                <DetailRow label="End Date" value={selectedOrder.end_date ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />
                {selectedOrder.issued_at && <DetailRow label="Issued At" value={new Date(selectedOrder.issued_at).toLocaleString('id-ID')} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />}
                {selectedOrder.reviewed_at && <DetailRow label="Reviewed At" value={new Date(selectedOrder.reviewed_at).toLocaleString('id-ID')} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />}
                {selectedOrder.reviewer_notes && <DetailRow label="Reviewer Notes" value={selectedOrder.reviewer_notes} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER} />}
              </Section>

              {/* AI review (if present) */}
              {(selectedOrder.ai_admin_recommendation || selectedOrder.ai_admin_risk_level) && (
                <Section icon={<Sparkles size={14} />} title="AI Review" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                  {selectedOrder.ai_admin_risk_level && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl mb-2 ${
                      selectedOrder.ai_admin_risk_level === 'HIGH' ? 'bg-rose-50 dark:bg-rose-950/30' :
                      selectedOrder.ai_admin_risk_level === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-950/30' :
                      'bg-emerald-50 dark:bg-emerald-950/30'
                    }`}>
                      <AlertTriangle size={14} className={
                        selectedOrder.ai_admin_risk_level === 'HIGH' ? 'text-rose-600 dark:text-rose-400' :
                        selectedOrder.ai_admin_risk_level === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      } />
                      <span className={`text-xs font-bold ${SHEET_TEXT}`}>
                        Risk Level: {selectedOrder.ai_admin_risk_level}
                        {selectedOrder.ai_admin_confidence ? ` (${selectedOrder.ai_admin_confidence}% confidence)` : ''}
                      </span>
                    </div>
                  )}
                  {selectedOrder.ai_admin_recommendation && (
                    <div className={`p-3 rounded-xl ${SHEET_INSET} text-xs ${SHEET_TEXT} leading-relaxed`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${SHEET_TEXT_MUTED} mb-1`}>Recommendation</p>
                      {selectedOrder.ai_admin_recommendation}
                    </div>
                  )}
                  {selectedOrder.ai_admin_reasoning && (
                    <div className={`p-3 rounded-xl mt-2 ${SHEET_INSET} text-xs ${SHEET_TEXT} leading-relaxed`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${SHEET_TEXT_MUTED} mb-1`}>Reasoning</p>
                      {selectedOrder.ai_admin_reasoning}
                    </div>
                  )}
                </Section>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 sticky bottom-0 bg-inherit pb-2">
                {(selectedOrder.status === 'SUBMITTED' || selectedOrder.status === 'UNDER_REVIEW') && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedOrder)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                    >
                      <CheckCircle2 size={14} /> Setujui
                    </button>
                    <button
                      onClick={() => handleReject(selectedOrder)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold bg-rose-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30"
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                  </>
                )}
                {selectedOrder.status === 'APPROVED' && (
                  <button
                    onClick={() => handleIssue(selectedOrder)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                  >
                    <Clock size={14} /> Terbitkan Polis
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for vehicle photo */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center" aria-label="Tutup">✕</button>
          <img src={lightboxUrl} alt="Foto kendaraan" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
};

// ── Sub-components for the detail sheet ──────────────────────────────────────

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  sheetText: string;
  sheetMuted: string;
  sheetBorder: string;
  children: React.ReactNode;
}> = ({ icon, title, sheetText, sheetMuted, sheetBorder, children }) => {
  void sheetMuted; // accepted for API symmetry with DetailRow
  return (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <h4 className={`text-xs font-black uppercase tracking-widest ${sheetText}`}>{title}</h4>
    </div>
    <div className={`rounded-xl border ${sheetBorder} overflow-hidden divide-y ${sheetBorder}`}>
      {children}
    </div>
  </div>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
  sheetText: string;
  sheetMuted: string;
  sheetBorder: string;
}> = ({ label, value, icon, sheetText, sheetMuted, sheetBorder }) => {
  void sheetBorder;
  return (
  <div className="flex justify-between items-center gap-3 px-3 py-2.5 bg-white dark:bg-[#0F1829]">
    <span className={`text-[10px] font-bold uppercase tracking-widest ${sheetMuted} flex items-center gap-1.5`}>
      {icon}{label}
    </span>
    <span className={`text-xs font-medium text-right break-all ${sheetText} max-w-[60%]`}>{value}</span>
  </div>
  );
};

export default OperatorOrders;
