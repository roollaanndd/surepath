// OperatorWithdrawals.tsx — Tarik tab. L1 approve/reject agent withdrawal requests.
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Language } from '../../types';
import { useT } from '../../src/i18n';
import { AgentArtKeyframes, AgentHero, SpotWallet, AgentEmpty } from '../agent/AgentArt';
import { UnderlineTabs, SkeletonCard, useToast, useConfirmDialog } from '../ui';
import { listWithdrawals, approveWithdrawalL1, rejectWithdrawal, type OperatorWithdrawal } from '../../services/operatorService';

interface Props {
  operator: any;
  lang: Language;
  refreshTick: number;
}

const STATUS_TABS = [
  { id: 'PENDING_L1',    label: 'L1' },
  { id: 'PENDING_L2',    label: 'L2' },
  { id: 'PENDING_L3',    label: 'L3' },
  { id: 'APPROVED',      label: 'Disetujui' },
  { id: 'DISBURSED',     label: 'Dicairkan' },
  { id: 'REJECTED',      label: 'Ditolak' },
  { id: 'ALL',           label: 'Semua' },
];

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const OperatorWithdrawals: React.FC<Props> = ({ operator, lang, refreshTick }) => {
  const t = useT(lang);
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [activeStatus, setActiveStatus] = useState('PENDING_L1');
  const [withdrawals, setWithdrawals] = useState<OperatorWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OperatorWithdrawal | null>(null);
  const [rejectModal, setRejectModal] = useState<OperatorWithdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeStatus === 'ALL' ? undefined : activeStatus;
      const data = await listWithdrawals(status, 200);
      setWithdrawals(data);
    } catch (e: any) {
      console.error('OperatorWithdrawals load:', e);
      toast.error(`Gagal memuat penarikan: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const handleApproveL1 = async (w: OperatorWithdrawal) => {
    const ok = await confirm({
      title: 'Setujui Penarikan (L1)',
      description: `Setujui penarikan ${fmtIdr(w.amount)} oleh ${w.agent_name ?? 'agen'}? Akan diteruskan ke L2 untuk amount ≥ Rp 10jt.`,
      confirmLabel: 'Setujui L1',
      variant: 'primary',
    });
    if (!ok) return;
    try {
      await approveWithdrawalL1(w.id, operator.id);
      toast.success('Penarikan disetujui di L1');
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
  };

  const handleReject = (w: OperatorWithdrawal) => {
    // FIX v1.42.0: replace native prompt() with in-app modal
    setRejectModal(w);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error(t('Reason required', 'Alasan wajib diisi'));
      return;
    }
    try {
      await rejectWithdrawal(rejectModal.id, operator.id, reason);
      toast.info(t('Withdrawal rejected', 'Penarikan ditolak'));
      setRejectModal(null);
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
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
      <AgentArtKeyframes />
      <AgentHero
        title="Antrian Penarikan"
        subtitle="Approval multi-level L1/L2/L3 — setiap pencairan terjaga."
        art={<SpotWallet size={72} />}
      />

      <UnderlineTabs
        tabs={STATUS_TABS.map(t => ({ id: t.id, label: t.label }))}
        activeId={activeStatus}
        onChange={setActiveStatus}
      />

      {withdrawals.length === 0 ? (
        <AgentEmpty
          title="Tidak ada penarikan"
          desc="Antrian penarikan kosong untuk status ini."
        />
      ) : (
        <div className="space-y-3">
          {withdrawals.map(w => {
            const statusColor = {
              PENDING_L1:    'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
              PENDING_L2:    'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',
              PENDING_L3:    'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
              APPROVED:      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
              DISBURSED:     'bg-ds-green-tint text-ds-green',
              REJECTED:      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
              CANCELLED:     'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
            }[w.status] ?? 'bg-ds-card2 text-ds-ink3';
            return (
              <div key={w.id} className="p-4 rounded-2xl border border-ds-border bg-ds-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ds-ink">{w.agent_name ?? 'Agen'}</p>
                    <p className="text-xs text-ds-ink3 truncate">{w.agent_email ?? '-'}</p>
                    <p className="text-sm font-black text-ds-green mt-1">{fmtIdr(w.amount)}</p>
                    <p className="text-[10px] text-ds-ink3 mt-0.5">Net: {fmtIdr(w.net_amount)} · {w.bank_code ?? '-'} · {w.account_number ?? '-'}</p>
                    <p className="text-[10px] text-ds-ink3 mt-1">{new Date(w.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${statusColor}`}>
                    {w.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ds-border">
                  <button
                    onClick={() => setSelected(w)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-card2 text-ds-ink2 active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Eye size={12} /> Detail
                  </button>
                  {w.status === 'PENDING_L1' && (
                    <>
                      <button
                        onClick={() => handleApproveL1(w)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={12} /> L1
                      </button>
                      <button
                        onClick={() => handleReject(w)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                      >
                        <XCircle size={12} /> Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full bg-white dark:bg-[#0F1829] rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 pt-3 pb-2 bg-inherit">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between px-5">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Detail Penarikan</h3>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#162035] text-gray-500 dark:text-gray-400 flex items-center justify-center text-lg">✕</button>
              </div>
            </div>
            <div className="px-5 pb-8 space-y-2 text-sm">
              <Row label="ID" value={selected.id.slice(0, 8)} />
              <Row label="Agen" value={selected.agent_name ?? '-'} />
              <Row label="Email" value={selected.agent_email ?? '-'} />
              <Row label="Telepon" value={selected.agent_phone ?? '-'} />
              <Row label="Jumlah" value={fmtIdr(selected.amount)} />
              <Row label="Biaya Xendit" value={fmtIdr(selected.xendit_fee)} />
              <Row label="Net" value={fmtIdr(selected.net_amount)} />
              <Row label="Bank" value={selected.bank_code ?? '-'} />
              <Row label="No. Rekening" value={selected.account_number ?? '-'} />
              <Row label="Nama Pemilik" value={selected.account_holder_name ?? '-'} />
              <Row label="Status" value={selected.status.replace('_', ' ')} />
              <Row label="Dijadwalkan" value={selected.scheduled_disburse_at ? new Date(selected.scheduled_disburse_at).toLocaleString('id-ID') : '-'} />
              <Row label="Dibuat" value={new Date(selected.created_at).toLocaleString('id-ID')} />
            </div>
          </div>
        </div>
      )}

      {/* FIX v1.42.0: in-app modal for rejection reason (replaces native prompt) */}
      {rejectModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0F1829] text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-[#1E2D3D] shadow-2xl">
            <div className="p-5">
              <h3 className="text-base font-bold mb-1">{t('Reject Withdrawal?', 'Tolak Penarikan?')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('Provide a reason for rejecting this withdrawal request.', 'Berikan alasan penolakan untuk permintaan penarikan ini.')}
              </p>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder={t('Rejection reason...', 'Alasan penolakan...')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#1E2D3D] bg-white dark:bg-[#162035] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setRejectModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-[#1E2D3D] text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
                >
                  {t('Cancel', 'Batal')}
                </button>
                <button
                  onClick={confirmReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-500 text-white active:scale-95 transition-transform disabled:opacity-50"
                >
                  {t('Reject', 'Tolak')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-2.5 px-3 border-b border-gray-200 dark:border-[#1E2D3D] bg-white dark:bg-[#0F1829]">
    <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</span>
    <span className="text-gray-900 dark:text-white text-xs font-medium text-right break-all max-w-[60%]">{value}</span>
  </div>
);

export default OperatorWithdrawals;
