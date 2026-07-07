import React, { useState } from 'react';
import { X, Car, ShieldCheck, CheckCircle, Circle, XCircle } from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import { cancelMyOrder, type SpPolicyOrder } from '../../services/supabaseService';

interface Props {
  order: SpPolicyOrder;
  lang: Language;
  onClose: () => void;
  onCancelled: () => void;
  onResubmit: (page: string) => void;
}

const policyStatusMap: Record<string, { label: string; cls: string }> = {
  SUBMITTED:    { label: 'Menunggu Review',  cls: 'bg-amber-50 text-amber-700' },
  UNDER_REVIEW: { label: 'Sedang Dikaji',    cls: 'bg-blue-50 text-blue-700' },
  APPROVED:     { label: 'Disetujui',        cls: 'bg-blue-50 text-blue-700' },
  ISSUED:       { label: 'Polis Aktif',      cls: 'bg-emerald-50 text-emerald-700' },
  REJECTED:     { label: 'Ditolak',          cls: 'bg-rose-50 text-rose-700' },
  CANCELLED:    { label: 'Dibatalkan',       cls: 'bg-gray-100 text-gray-500' },
};

const STATUS_FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ISSUED'];

const OrderDetailSheet: React.FC<Props> = ({ order, lang, onClose, onCancelled, onResubmit }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [cancelling, setCancelling] = useState(false);

  const meta = policyStatusMap[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-500' };
  const isTerminal = order.status === 'REJECTED' || order.status === 'CANCELLED';
  const canCancel = order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW';
  const resubmitPage = order.vehicle_type === 'CAR' ? 'buy-car' : 'products';

  const handleCancel = async () => {
    if (!window.confirm(t('Cancel this submission?', 'Batalkan pengajuan ini?'))) return;
    setCancelling(true);
    const result = await cancelMyOrder(order.id);
    setCancelling(false);
    if (result) {
      onCancelled();
    } else {
      console.warn(t('Failed to cancel submission.', 'Gagal membatalkan pengajuan.'));
    }
  };

  const handleResubmit = async () => {
    if (canCancel) {
      if (!window.confirm(t('Cancel current submission and resubmit?', 'Batalkan pengajuan ini dan ajukan ulang?'))) return;
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
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-ds-border'}`}>
                  {done ? <CheckCircle size={12} className="text-white" /> : <Circle size={10} className="text-ds-ink3" />}
                </div>
                <span className={`text-xs font-bold ${done ? 'text-ds-ink' : 'text-ds-ink3'}`}>
                  {policyStatusMap[s]?.label ?? s}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isRejected ? 'bg-rose-500' : 'bg-gray-300'}`}>
              <XCircle size={12} className="text-white" />
            </div>
            <span className={`text-xs font-bold ${isRejected ? 'text-rose-600' : 'text-gray-500'}`}>
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
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-ds-border'}`}>
                {done ? <CheckCircle size={12} className="text-white" /> : <Circle size={10} className="text-ds-ink3" />}
              </div>
              <span className={`text-xs font-bold ${current ? 'text-emerald-600' : done ? 'text-ds-ink' : 'text-ds-ink3'}`}>
                {policyStatusMap[s]?.label ?? s}
              </span>
              {current && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
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
                <div className="flex justify-between"><span className="text-xs text-ds-ink3">{t('Discount', 'Diskon')}</span><span className="text-xs font-bold text-emerald-600">- {formatIDR(order.discount_amount ?? 0)}</span></div>
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
            {canCancel && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full py-3 rounded-2xl border-2 border-rose-400 text-rose-600 font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
                >
                  {cancelling ? t('Cancelling...', 'Membatalkan...') : t('Cancel Submission', 'Batalkan Pengajuan')}
                </button>
                <button
                  onClick={handleResubmit}
                  disabled={cancelling}
                  className="w-full py-3 rounded-2xl bg-ds-green text-white font-black text-sm shadow-ds-green active:scale-95 transition-transform disabled:opacity-50"
                >
                  {t('Modify & Resubmit', 'Ubah & Ajukan Ulang')}
                </button>
              </>
            )}
            {isTerminal && (
              <button
                onClick={() => onResubmit(resubmitPage)}
                className="w-full py-3 rounded-2xl bg-ds-green text-white font-black text-sm shadow-ds-green active:scale-95 transition-transform"
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
