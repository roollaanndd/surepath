import React, { useState } from 'react';
import { X, Car, ShieldCheck, CheckCircle, Circle, XCircle, Download } from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import { cancelMyOrder, type SpPolicyOrder } from '../../services/supabaseService';
import { publishAndDownloadQuotation } from '../../services/quotationService';
import { fromCustomerOrder } from '../../services/quotationSlipAdapter';
import { useToast, useConfirmDialog } from '../ui';

interface Props {
  order: SpPolicyOrder;
  lang: Language;
  onClose: () => void;
  onCancelled: () => void;
  onResubmit: (page: string) => void;
}

const policyStatusMap: Record<string, { label: string; cls: string }> = {
  SUBMITTED:    { label: 'Menunggu Review',  cls: 'bg-ds-amber-lt text-ds-amber' },
  UNDER_REVIEW: { label: 'Sedang Dikaji',    cls: 'bg-ds-amber-lt text-ds-amber' },
  APPROVED:     { label: 'Disetujui',        cls: 'bg-ds-amber-lt text-ds-amber' },
  ISSUED:       { label: 'Polis Aktif',      cls: 'bg-ds-green-tint text-ds-green' },
  REJECTED:     { label: 'Ditolak',          cls: 'bg-ds-red-lt text-ds-red' },
  CANCELLED:    { label: 'Dibatalkan',       cls: 'bg-ds-card2 text-ds-ink3' },
};

const STATUS_FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ISSUED'];

const OrderDetailSheet: React.FC<Props> = ({ order, lang, onClose, onCancelled, onResubmit }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [cancelling, setCancelling] = useState(false);
  const [downloadingQuote, setDownloadingQuote] = useState(false);

  const handleDownloadQuote = async () => {
    if (downloadingQuote) return;
    setDownloadingQuote(true);
    try {
      const slipData = fromCustomerOrder(order as any);
      await publishAndDownloadQuotation(slipData, { sourceApp: 'CUSTOMER', orderId: (order as any).id, totalPremiumNumeric: (order as any).total_premium ?? undefined });
      toast.success(t('Quotation slip downloaded', 'Slip penawaran berhasil diunduh'));
    } catch (e: any) {
      console.error('Quotation slip download failed:', e);
      toast.error(t('Failed to generate quotation. Please try again.', 'Gagal membuat quotation. Coba lagi.'));
    } finally {
      setDownloadingQuote(false);
    }
  };

  const meta = policyStatusMap[order.status] ?? { label: order.status, cls: 'bg-ds-card2 text-ds-ink3' };
  const isTerminal = order.status === 'REJECTED' || order.status === 'CANCELLED';
  const canCancel = order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW';
  const resubmitPage = order.vehicle_type === 'CAR' ? 'buy-car' : 'products';

  const handleCancel = async () => {
    const ok = await confirm({
      title: t('Cancel Submission?', 'Batalkan Pengajuan?'),
      description: t('This will cancel your current insurance submission.', 'Pengajuan asuransi Anda yang sedang berjalan akan dibatalkan.'),
      confirmLabel: t('Yes, Cancel', 'Ya, Batalkan'),
      cancelLabel: t('Keep', 'Tetap'),
    });
    if (!ok) return;
    setCancelling(true);
    const result = await cancelMyOrder(order.id);
    setCancelling(false);
    if (result) {
      toast.success(t('Submission cancelled', 'Pengajuan dibatalkan'));
      onCancelled();
    } else {
      toast.error(t('Failed to cancel submission.', 'Gagal membatalkan pengajuan.'));
    }
  };

  const handleResubmit = async () => {
    if (canCancel) {
      const ok = await confirm({
        title: t('Cancel & Resubmit?', 'Batalkan & Ajukan Ulang?'),
        description: t('This will cancel your current submission and start a new one.', 'Pengajuan saat ini akan dibatalkan dan Anda akan mengajukan ulang.'),
        confirmLabel: t('Yes, Resubmit', 'Ya, Ajukan Ulang'),
        cancelLabel: t('Cancel', 'Batal'),
      });
      if (!ok) return;
      setCancelling(true);
      await cancelMyOrder(order.id);
      setCancelling(false);
    }
    onResubmit(resubmitPage);
  };

  const renderTimeline = () => {
    if (order.status === 'REJECTED' || order.status === 'CANCELLED') {
      const isRejected = order.status === 'REJECTED';
      return (
        <div className="space-y-2">
          {STATUS_FLOW.map((s) => {
            const done = s === 'SUBMITTED';
            return (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-ds-green' : 'bg-ds-border'}`}>
                  {done ? <CheckCircle size={12} className="text-white" /> : <Circle size={10} className="text-ds-ink3" />}
                </div>
                <span className={`text-xs font-bold ${done ? 'text-ds-ink' : 'text-ds-ink3'}`}>
                  {policyStatusMap[s]?.label ?? s}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isRejected ? 'bg-ds-red' : 'bg-ds-border'}`}>
              <XCircle size={12} className="text-white" />
            </div>
            <span className={`text-xs font-bold ${isRejected ? 'text-ds-red' : 'text-ds-ink3'}`}>
              {isRejected ? t('Rejected', 'Ditolak') : t('Cancelled', 'Dibatalkan')}
            </span>
          </div>
        </div>
      );
    }

    const currentIdx = STATUS_FLOW.indexOf(order.status);
    return (
      <div className="space-y-2">
        {STATUS_FLOW.map((s, i) => {
          const done = i <= currentIdx;
          const current = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-ds-green' : 'bg-ds-border'}`}>
                {done ? <CheckCircle size={12} className="text-white" /> : <Circle size={10} className="text-ds-ink3" />}
              </div>
              <span className={`text-xs font-bold ${current ? 'text-ds-green' : done ? 'text-ds-ink' : 'text-ds-ink3'}`}>
                {policyStatusMap[s]?.label ?? s}
              </span>
              {current && (
                <span className="text-[9px] font-black text-ds-green bg-ds-green-tint px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                  {t('Now', 'Sekarang')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button aria-label={t('Close', 'Tutup')} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default" />
      <div className="relative sp-glass-strong rounded-t-3xl overflow-y-auto max-h-[88vh] no-scrollbar">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-ds-border" />
        </div>
        <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-ds-border">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-0.5">{t('Submission Detail', 'Detail Pengajuan')}</p>
            <h3 className="text-lg font-black text-ds-ink tracking-tight">
              {order.policy_number ?? order.order_number ?? order.id.slice(0, 8).toUpperCase()}
            </h3>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${meta.cls}`}>{meta.label}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-ds-card2 flex items-center justify-center active:scale-90 transition-transform mt-1">
            <X size={14} className="text-ds-ink3" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Status timeline */}
          <div className="sp-glass rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">{t('Status', 'Status')}</p>
            {renderTimeline()}
            {order.reviewer_notes && (
              <p className="mt-3 text-xs text-ds-ink3 italic bg-ds-card2 rounded-xl px-3 py-2 leading-relaxed">{order.reviewer_notes}</p>
            )}
          </div>

          {/* Kendaraan */}
          {order.vehicle_type && (
            <div className="sp-glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car size={14} className="text-ds-green" />
                <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">{t('Vehicle', 'Kendaraan')}</p>
              </div>
              <div className="space-y-1.5">
                {order.vehicle_details?.make && (
                  <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Make', 'Merek')}</span><span className="text-xs font-bold text-ds-ink">{order.vehicle_details.make}</span></div>
                )}
                {order.vehicle_details?.model && (
                  <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Model', 'Model')}</span><span className="text-xs font-bold text-ds-ink">{order.vehicle_details.model}</span></div>
                )}
                {order.vehicle_details?.year && (
                  <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Year', 'Tahun')}</span><span className="text-xs font-bold text-ds-ink">{order.vehicle_details.year}</span></div>
                )}
                {order.vehicle_details?.plate && (
                  <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Plate', 'Plat')}</span><span className="text-xs font-bold text-ds-ink uppercase">{order.vehicle_details.plate}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Perlindungan */}
          <div className="sp-glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-ds-green" />
              <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">{t('Coverage', 'Perlindungan')}</p>
            </div>
            <div className="space-y-1.5">
              {order.coverage_type && (
                <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Type', 'Tipe')}</span><span className="text-xs font-bold text-ds-ink">{order.coverage_type}</span></div>
              )}
              {order.insurer_name && (
                <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Insurer', 'Penanggung')}</span><span className="text-xs font-bold text-ds-ink">{order.insurer_name}</span></div>
              )}
              {order.end_date && (
                <div className="flex justify-between">
                  <span className="text-xs text-ds-ink3">{t('Expiry', 'Berakhir')}</span>
                  <span className="text-xs font-bold text-ds-ink">{new Date(order.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rincian Premi */}
          <div className="sp-glass rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">{t('Premium Breakdown', 'Rincian Premi')}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Base Premium', 'Premi Dasar')}</span><span className="text-xs font-bold text-ds-ink">{formatIDR(order.base_premium ?? 0)}</span></div>
              {(order.addon_premium ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Add-on', 'Tambahan')}</span><span className="text-xs font-bold text-ds-ink">{formatIDR(order.addon_premium ?? 0)}</span></div>
              )}
              {(order.admin_fee ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Admin Fee', 'Biaya Admin')}</span><span className="text-xs font-bold text-ds-ink">{formatIDR(order.admin_fee ?? 0)}</span></div>
              )}
              {(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Discount', 'Diskon')}</span><span className="text-xs font-bold text-ds-green">- {formatIDR(order.discount_amount ?? 0)}</span></div>
              )}
              <div className="border-t border-ds-border mt-2 pt-2 flex justify-between">
                <span className="text-sm font-black text-ds-ink">{t('Total Premium', 'Total Premi')}</span>
                <span className="text-sm font-black text-ds-green">{formatIDR(order.total_premium ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Survei AI */}
          {((order.ai_score ?? 0) > 0 || order.ai_verdict) && (
            <div className="sp-glass rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">{t('AI Survey', 'Survei AI')}</p>
              <div className="space-y-1.5">
                {(order.ai_score ?? 0) > 0 && (
                  <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('AI Score', 'Skor AI')}</span><span className="text-xs font-black text-ds-green">{order.ai_score}/100</span></div>
                )}
                {order.ai_verdict && (
                  <div className="flex justify-between items-start gap-2"><span className="text-xs text-ds-ink3 flex-shrink-0">{t('Verdict', 'Keputusan')}</span><span className="text-xs font-bold text-ds-ink text-right">{order.ai_verdict}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="sp-glass rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">{t('Order Info', 'Info Pengajuan')}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-ds-ink3">{t('Order No.', 'No. Pengajuan')}</span>
                <span className="text-xs font-bold text-ds-ink font-mono">{order.order_number ?? order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-ds-ink3">{t('Submitted', 'Diajukan')}</span>
                <span className="text-xs font-bold text-ds-ink">{new Date(order.created_at ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pb-6">
            {/* Generate Quotation Slip — always available */}
            <button
              onClick={handleDownloadQuote}
              disabled={downloadingQuote}
              className="w-full py-3 rounded-2xl bg-ds-green text-ds-on-green font-black text-sm shadow-ds-green active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {downloadingQuote ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {t('Generating...', 'Membuat...')}
                </>
              ) : (
                <>
                  <Download size={16} />
                  {t('Download Quotation Slip', 'Unduh Slip Penawaran')}
                </>
              )}
            </button>

            {canCancel && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full py-3 rounded-2xl border-2 border-ds-red text-ds-red font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
                >
                  {cancelling ? t('Cancelling...', 'Membatalkan...') : t('Cancel Submission', 'Batalkan Pengajuan')}
                </button>
                <button
                  onClick={handleResubmit}
                  disabled={cancelling}
                  className="w-full py-3 rounded-2xl bg-ds-green text-ds-on-green font-black text-sm shadow-ds-green active:scale-95 transition-transform disabled:opacity-50"
                >
                  {t('Modify & Resubmit', 'Ubah & Ajukan Ulang')}
                </button>
              </>
            )}
            {isTerminal && (
              <button
                onClick={() => onResubmit(resubmitPage)}
                className="w-full py-3 rounded-2xl bg-ds-green text-ds-on-green font-black text-sm shadow-ds-green active:scale-95 transition-transform"
              >
                {t('Resubmit', 'Ajukan Ulang')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailSheet;
