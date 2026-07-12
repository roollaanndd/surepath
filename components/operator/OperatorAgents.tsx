// OperatorAgents.tsx — Agen tab. List pending agents for verification.
// Operator can inspect: profile photo, KTP document image, agreement details,
// then approve or reject. Approval sets verified=true + trust_score=85.
// Rejection sets verified=false + trust_score=50 + sends admin notification.

import React, { useEffect, useState, useCallback } from 'react';
import { UserCheck, CheckCircle2, XCircle, Eye, FileText, ImageIcon, Phone, MapPin, CreditCard, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { Language } from '../../types';
import { AgentArtKeyframes, AgentHero, SpotProfile, AgentEmpty } from '../agent/AgentArt';
import { SectionLabel } from '../shared/cards';
import { UnderlineTabs, EmptyState, SkeletonCard, useToast, useConfirmDialog } from '../ui';
import { listAgents, getAgentDetail, verifyAgent, rejectAgent, type OperatorAgent, type AgentDetail } from '../../services/operatorService';
import { resolveDocumentUrl } from '../../services/storage';

interface Props {
  operator: any;
  lang: Language;
  refreshTick: number;
}

const STATUS_TABS = [
  { id: 'PENDING',    label: 'Menunggu' },
  { id: 'VERIFIED',   label: 'Diverifikasi' },
  { id: 'ALL',        label: 'Semua' },
];

// Explicit dark mode (matches OperatorOrders detail sheet)
const SHEET_BG = 'bg-white dark:bg-[#0F1829]';
const SHEET_TEXT = 'text-gray-900 dark:text-white';
const SHEET_TEXT_MUTED = 'text-gray-500 dark:text-gray-400';
const SHEET_BORDER = 'border-gray-200 dark:border-[#1E2D3D]';
const SHEET_INSET = 'bg-gray-50 dark:bg-[#162035]';

const OperatorAgents: React.FC<Props> = ({ refreshTick }) => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [agents, setAgents] = useState<OperatorAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OperatorAgent | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [resolvedKtpUrl, setResolvedKtpUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Pass the active tab to the API so the gateway filters server-side.
      // This fixes the bug where VERIFIED and ALL tabs were always empty.
      const data = await listAgents(activeStatus as 'PENDING' | 'VERIFIED' | 'ALL');
      setAgents(data);
    } catch (e: any) {
      console.error('OperatorAgents load:', e);
      toast.error(`Gagal memuat agen: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  // When an agent is selected, fetch full detail (agreements + all fields)
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setResolvedKtpUrl(null);
      return;
    }
    setDetailLoading(true);
    setResolvedKtpUrl(null);
    getAgentDetail(selected.id)
      .then(async (d) => {
        setDetail(d);
        // KTP document is in a private bucket — resolve to signed URL
        if (d.agent.ktp_document_url) {
          const signed = await resolveDocumentUrl(d.agent.ktp_document_url).catch(() => null);
          setResolvedKtpUrl(signed);
        }
      })
      .catch(e => {
        toast.error(`Gagal memuat detail: ${e.message}`);
        setSelected(null);
      })
      .finally(() => setDetailLoading(false));
  }, [selected, toast]);

  const handleVerify = async (a: OperatorAgent) => {
    const ok = await confirm({
      title: 'Verifikasi Agen',
      description: `Setujui ${a.name} sebagai agen terverifikasi? Agen akan dapat mulai bertransaksi setelah diverifikasi.`,
      confirmLabel: 'Verifikasi',
      variant: 'primary',
    });
    if (!ok) return;
    try {
      await verifyAgent(a.id);
      toast.success(`${a.name} berhasil diverifikasi`);
      load();
      setSelected(null);
    } catch (e: any) {
      toast.error(`Gagal verifikasi: ${e.message}`);
    }
  };

  const handleReject = async (a: OperatorAgent) => {
    const ok = await confirm({
      title: 'Tolak Agen',
      description: `Tolak ${a.name}? Agen akan ditandai tidak terverifikasi dan tidak dapat bertransaksi sampai diperbaiki.`,
      confirmLabel: 'Tolak',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await rejectAgent(a.id);
      toast.info(`${a.name} ditolak`);
      load();
      setSelected(null);
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
        title="Verifikasi Agen"
        subtitle="Pastikan hanya mitra terpercaya yang mewakili SurePath."
        art={<SpotProfile size={72} />}
      />

      <UnderlineTabs
        tabs={STATUS_TABS.map(t => ({ id: t.id, label: t.label }))}
        activeId={activeStatus}
        onChange={setActiveStatus}
      />

      {agents.length === 0 ? (
        <AgentEmpty
          title="Tidak ada agen"
          desc={activeStatus === 'PENDING'
            ? 'Tidak ada agen menunggu verifikasi saat ini.'
            : 'Tidak ada agen pada kategori ini.'}
        />
      ) : (
        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} className="p-4 rounded-2xl border border-ds-border bg-ds-card">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-ds-green-tint flex items-center justify-center shrink-0">
                  {a.profile_photo_url ? (
                    <img src={a.profile_photo_url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-ds-green">{(a.name?.charAt(0) ?? '?').toUpperCase()}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{a.name}</p>
                  <p className="text-xs text-ds-ink3 truncate">{a.email}</p>
                  <p className="text-[10px] text-ds-ink3 mt-0.5">{a.agent_code ?? 'SP-AGT-???'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      a.verified
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {a.verified ? 'Diverifikasi' : 'Pending'}
                    </span>
                    {a.ktp_document_url && (
                      <span className="text-[9px] font-bold text-ds-ink3 flex items-center gap-0.5">
                        <FileText size={9} /> KTP
                      </span>
                    )}
                    {a.agreement && (
                      <span className="text-[9px] font-bold text-ds-ink3 flex items-center gap-0.5">
                        <ShieldCheck size={9} /> Agreement
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ds-border">
                <button
                  onClick={() => setSelected(a)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-card2 text-ds-ink2 active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Eye size={12} /> Inspect
                </button>
                {!a.verified && (
                  <>
                    <button
                      onClick={() => handleVerify(a)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Verifikasi
                    </button>
                    <button
                      onClick={() => handleReject(a)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <XCircle size={12} /> Tolak
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent detail + document viewer sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative w-full ${SHEET_BG} rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col`}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle + header */}
            <div className="shrink-0 pt-3 pb-2 bg-inherit">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between px-5">
                <h3 className={`text-lg font-black ${SHEET_TEXT}`}>Verifikasi Agen</h3>
                <button
                  onClick={() => setSelected(null)}
                  className={`w-8 h-8 rounded-full ${SHEET_INSET} ${SHEET_TEXT_MUTED} flex items-center justify-center text-lg`}
                  aria-label="Tutup"
                >✕</button>
              </div>
            </div>

            {detailLoading ? (
              <div className="px-5 py-12 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              </div>
            ) : detail ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 pb-44 space-y-5">
                {/* Agent header */}
                <div className={`rounded-2xl p-4 ${SHEET_INSET}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                      {detail.agent.profile_photo_url ? (
                        <img src={detail.agent.profile_photo_url} alt={detail.agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {(detail.agent.name?.charAt(0) ?? '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-black ${SHEET_TEXT}`}>{detail.agent.name}</p>
                      <p className={`text-xs ${SHEET_TEXT_MUTED}`}>{detail.agent.email}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${SHEET_TEXT_MUTED} mt-0.5`}>
                        {detail.agent.agent_code ?? 'SP-AGT-???'}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      detail.agent.verified
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    }`}>
                      {detail.agent.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Personal info */}
                <Section icon={<UserCheck size={14} />} title="Data Pribadi" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                  <DetailRow label="Nama" value={detail.agent.name} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  <DetailRow label="Email" value={detail.agent.email} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  <DetailRow label="Telepon" value={detail.agent.phone ?? '-'} icon={<Phone size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  <DetailRow label="No. KTP" value={detail.agent.ktp ?? '-'} icon={<CreditCard size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  <DetailRow label="Alamat" value={detail.agent.address ?? '-'} icon={<MapPin size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  <DetailRow label="Trust Score" value={String(detail.agent.trust_score ?? '-')} icon={<ShieldCheck size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  <DetailRow label="Bergabung" value={new Date(detail.agent.created_at).toLocaleString('id-ID')} icon={<Calendar size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                </Section>

                {/* Documents */}
                <Section icon={<ImageIcon size={14} />} title="Dokumen Upload" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                  {/* KTP document image */}
                  {resolvedKtpUrl ? (
                    <button
                      onClick={() => setLightboxUrl(resolvedKtpUrl)}
                      className={`w-full rounded-xl overflow-hidden border ${SHEET_BORDER} active:scale-[0.98] transition-transform`}
                    >
                      <img
                        src={resolvedKtpUrl}
                        alt="Foto KTP"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div class="p-6 text-center text-xs text-gray-500 dark:text-gray-400">Foto KTP gagal dimuat</div>';
                        }}
                      />
                      <div className={`px-3 py-2 flex items-center gap-2 ${SHEET_INSET}`}>
                        <FileText size={12} className={SHEET_TEXT_MUTED} />
                        <span className={`text-xs font-bold ${SHEET_TEXT}`}>Foto KTP</span>
                        <Eye size={12} className={`ml-auto ${SHEET_TEXT_MUTED}`} />
                      </div>
                    </button>
                  ) : (
                    <div className={`p-4 rounded-xl text-center text-xs ${SHEET_INSET} ${SHEET_TEXT_MUTED}`}>
                      <FileText size={24} className="mx-auto mb-2 opacity-40" />
                      KTP belum diupload oleh agen
                    </div>
                  )}

                  {/* Profile photo (smaller, optional) */}
                  {detail.agent.profile_photo_url && (
                    <button
                      onClick={() => setLightboxUrl(detail.agent.profile_photo_url)}
                      className={`mt-2 w-full flex items-center gap-3 p-3 rounded-xl border ${SHEET_BORDER} ${SHEET_INSET} active:scale-[0.98] transition-transform`}
                    >
                      <img src={detail.agent.profile_photo_url} alt="Foto profil" className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 text-left">
                        <p className={`text-xs font-bold ${SHEET_TEXT}`}>Foto Profil</p>
                        <p className={`text-[10px] ${SHEET_TEXT_MUTED}`}>Klik untuk perbesar</p>
                      </div>
                      <Eye size={12} className={SHEET_TEXT_MUTED} />
                    </button>
                  )}
                </Section>

                {/* Agreement */}
                {detail.agreements && detail.agreements.length > 0 ? (
                  <Section icon={<ShieldCheck size={14} />} title="Surat Perjanjian" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                    {detail.agreements.map((agr, i) => (
                      <div key={agr.id} className={`p-3 ${SHEET_INSET} ${i > 0 ? 'mt-2 rounded-xl' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black ${SHEET_TEXT}`}>{agr.agreement_no}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400`}>
                            {agr.doc_version}
                          </span>
                        </div>
                        <DetailRow label="Nama Legal" value={agr.full_name} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                        <DetailRow label="KTP (di agreement)" value={agr.ktp_number} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                        <DetailRow label="Disetujui" value={new Date(agr.accepted_at).toLocaleString('id-ID')} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                        {agr.user_agent && (
                          <DetailRow label="User Agent" value={agr.user_agent.slice(0, 50) + (agr.user_agent.length > 50 ? '…' : '')} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                        )}
                      </div>
                    ))}
                  </Section>
                ) : (
                  <div className={`p-4 rounded-xl text-center text-xs ${SHEET_INSET} ${SHEET_TEXT_MUTED} flex items-center justify-center gap-2`}>
                    <AlertCircle size={14} />
                    <span>Agen belum menandatangani surat perjanjian</span>
                  </div>
                )}

                {/* Action buttons — moved to sticky footer */}
                </div>

                {/* Sticky footer with action buttons */}
                {!detail.agent.verified && (
                  <div className={`shrink-0 border-t ${SHEET_BORDER} ${SHEET_BG} px-5 pt-3 pb-5 safe-area-pb`}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerify(selected)}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                      >
                        <CheckCircle2 size={14} /> Verifikasi Agen
                      </button>
                      <button
                        onClick={() => handleReject(selected)}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-rose-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30"
                      >
                        <XCircle size={14} /> Tolak
                      </button>
                    </div>
                  </div>
                )}
                {detail.agent.verified && (
                  <div className={`shrink-0 border-t ${SHEET_BORDER} ${SHEET_BG} px-5 pt-3 pb-5 safe-area-pb`}>
                    <div className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> Agen Sudah Diverifikasi
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Lightbox for documents */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center" aria-label="Tutup">✕</button>
          <img src={lightboxUrl} alt="Dokumen" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
};

// ── Sub-components (shared with OperatorOrders) ──────────────────────────────

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  sheetText: string;
  sheetMuted: string;
  sheetBorder: string;
  children: React.ReactNode;
}> = ({ icon, title, sheetText, sheetMuted, sheetBorder, children }) => {
  void sheetMuted;
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
}> = ({ label, value, icon, sheetText, sheetMuted }) => (
  <div className="flex justify-between items-center gap-3 px-3 py-2.5 bg-white dark:bg-[#0F1829]">
    <span className={`text-[10px] font-bold uppercase tracking-widest ${sheetMuted} flex items-center gap-1.5`}>
      {icon}{label}
    </span>
    <span className={`text-xs font-medium text-right break-all ${sheetText} max-w-[60%]`}>{value}</span>
  </div>
);

export default OperatorAgents;
