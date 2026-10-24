// OperatorClaims.tsx — Klaim tab. Approve/reject claims.
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Language } from '../../types';
import { AgentArtKeyframes, AgentHero, SpotClaims, AgentEmpty } from '../agent/AgentArt';
import { UnderlineTabs, SkeletonCard, useToast, useConfirmDialog } from '../ui';
import { useT } from '../../src/i18n';
import { listClaims, updateClaimStatus, type OperatorClaim } from '../../services/operatorService';

interface Props {
  operator: any;
  lang: Language;
  refreshTick: number;
}

const STATUS_TABS = [
  { id: 'SUBMITTED',     label: 'Baru' },
  { id: 'UNDER_REVIEW',  label: 'Ditinjau' },
  { id: 'APPROVED',      label: 'Disetujui' },
  { id: 'REJECTED',      label: 'Ditolak' },
  { id: 'PAID',          label: 'Dibayar' },
  { id: 'ALL',           label: 'Semua' },
];

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const OperatorClaims: React.FC<Props> = ({ lang, refreshTick }) => {
  const t = useT(lang);
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [activeStatus, setActiveStatus] = useState('SUBMITTED');
  const [claims, setClaims] = useState<OperatorClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<OperatorClaim | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeStatus === 'ALL' ? undefined : activeStatus;
      const data = await listClaims(status, 200);
      setClaims(data);
    } catch (e: any) {
      console.error('OperatorClaims load:', e);
      toast.error(`Gagal memuat klaim: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const handleApprove = async (c: OperatorClaim) => {
    const ok = await confirm({
      title: 'Setujui Klaim',
      description: `Setujui klaim ${c.id.slice(0, 8)} atas ${c.claim_type ?? 'Klaim'}? Estimasi: ${fmtIdr(c.amount_estimated)}`,
      confirmLabel: 'Setujui',
      variant: 'primary',
    });
    if (!ok) return;
    try {
      await updateClaimStatus(c.id, 'APPROVED', 'Disetujui oleh operator');
      toast.success('Klaim disetujui');
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
  };

  const handleReject = async (c: OperatorClaim) => {
    const ok = await confirm({
      title: 'Tolak Klaim',
      description: `Tolak klaim ${c.id.slice(0, 8)}? Aksi ini akan memberi tahu nasabah bahwa klaimnya ditolak.`,
      confirmLabel: 'Tolak',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await updateClaimStatus(c.id, 'REJECTED', 'Ditolak oleh operator');
      toast.info('Klaim ditolak');
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
        title="Antrian Klaim"
        subtitle={t('Review claim evidence and decide quickly & fairly.', 'Tinjau bukti klaim dan putuskan dengan cepat & adil.')}
        art={<SpotClaims size={72} />}
      />

      <UnderlineTabs
        tabs={STATUS_TABS.map(t => ({ id: t.id, label: t.label }))}
        activeId={activeStatus}
        onChange={setActiveStatus}
      />

      {claims.length === 0 ? (
        <AgentEmpty
          title="Tidak ada klaim"
          desc="Antrian klaim kosong untuk status ini."
        />
      ) : (
        <div className="space-y-3">
          {claims.map(c => {
            const statusColor = {
              SUBMITTED:     'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
              UNDER_REVIEW:  'bg-amber-50 text-ds-amber dark:bg-amber-950/30 dark:text-amber-400',
              APPROVED:      'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400',
              REJECTED:      'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
              PAID:          'bg-ds-green-tint text-ds-green',
            }[c.status] ?? 'bg-ds-card2 text-ds-ink3';
            return (
              <div key={c.id} className="p-4 rounded-2xl border border-ds-border bg-ds-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-ds-ink3">{c.id.slice(0, 8)}</p>
                    <p className="text-sm font-bold text-ds-ink mt-0.5">{c.claim_type ?? 'Klaim'}</p>
                    <p className="text-xs text-ds-ink2 mt-0.5 line-clamp-2">{c.description ?? '-'}</p>
                    <p className="text-xs text-ds-ink3 mt-1">Estimasi: {fmtIdr(c.amount_estimated)}</p>
                    <p className="text-[10px] text-ds-ink3 mt-1">{new Date(c.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${statusColor}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ds-border">
                  <button
                    onClick={() => setSelectedClaim(c)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-card2 text-ds-ink2 active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Eye size={12} /> Detail
                  </button>
                  {(c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW') && (
                    <>
                      <button
                        onClick={() => handleApprove(c)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Setujui
                      </button>
                      <button
                        onClick={() => handleReject(c)}
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

      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedClaim(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full bg-white dark:bg-[#0F1829] rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 pt-3 pb-2 bg-inherit">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between px-5">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Detail Klaim</h3>
                <button onClick={() => setSelectedClaim(null)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#162035] text-gray-500 dark:text-gray-400 flex items-center justify-center text-lg">✕</button>
              </div>
            </div>
            <div className="px-5 pb-8 space-y-2 text-sm">
              <Row label="ID" value={selectedClaim.id.slice(0, 8)} />
              <Row label="Tipe" value={selectedClaim.claim_type ?? '-'} />
              <Row label="Lokasi" value={selectedClaim.location ?? '-'} />
              <Row label="Deskripsi" value={selectedClaim.description ?? '-'} />
              <Row label="Estimasi" value={fmtIdr(selectedClaim.amount_estimated)} />
              <Row label="Disetujui" value={fmtIdr(selectedClaim.amount_approved)} />
              <Row label="Status" value={selectedClaim.status} />
              <Row label="Adjuster Notes" value={selectedClaim.adjuster_notes ?? '-'} />
              <Row label="Dibuat" value={new Date(selectedClaim.created_at).toLocaleString('id-ID')} />
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

export default OperatorClaims;
