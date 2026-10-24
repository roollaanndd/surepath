// InsurerOrders.tsx — Polis tab. List + filter + detail sheet with
// 3 decision buttons (Setujui/Minta Info/Tolak) + policy PDF upload.

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Search, CheckCircle2, XCircle, Eye, AlertTriangle, ImageIcon, ExternalLink, Car, User, Phone, ShieldCheck, Sparkles, Upload, CheckCircle, Download } from 'lucide-react';
import { Language } from '../../types';
import { AgentArtKeyframes, AgentHero, SpotOrders as SpotOrdersArt, AgentEmpty } from '../agent/AgentArt';
import { UnderlineTabs, SkeletonCard, useToast } from '../ui';
import { useT } from '../../src/i18n';
import { getInsurerDashboard, submitInsurerDecisionAuthed, uploadInsurerPolicy, type InsurerOrder } from '../../services/insurerService';
import { publishAndDownloadQuotation } from '../../services/quotationService';
import { fromCustomerOrder } from '../../services/quotationSlipAdapter';
import InsurerAIPanel from '../shared/InsurerAIPanel';

interface Props {
  authToken: string;
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

// Explicit dark mode (matches operator app pattern)
const SHEET_BG = 'bg-white dark:bg-[#0F1829]';
const SHEET_TEXT = 'text-gray-900 dark:text-white';
const SHEET_TEXT_MUTED = 'text-gray-500 dark:text-gray-400';
const SHEET_BORDER = 'border-gray-200 dark:border-[#1E2D3D]';
const SHEET_INSET = 'bg-gray-50 dark:bg-[#162035]';

const InsurerOrders: React.FC<Props> = ({ authToken, lang, refreshTick }) => {
  const t = useT(lang);
  void t; // i18n helper — strings will be translated incrementally
  const toast = useToast();
  const [allOrders, setAllOrders] = useState<InsurerOrder[]>([]);
  const [activeStatus, setActiveStatus] = useState('SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<InsurerOrder | null>(null);
  const [decisionMode, setDecisionMode] = useState<'APPROVED' | 'REQUEST_INFO' | 'DECLINED' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [policyNumber, setPolicyNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [insurerName, setInsurerName] = useState('');
  const [downloadingSlip, setDownloadingSlip] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getInsurerDashboard(authToken);
      setAllOrders(d.orders);
      setInsurerName(d.insurer?.name ?? '');
    } catch (e: any) {
      console.error('InsurerOrders load:', e);
      toast.error(`Gagal memuat order: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [authToken, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const filtered = allOrders.filter(o => {
    const matchStatus = activeStatus === 'ALL' || o.status === activeStatus;
    if (!matchStatus) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (o.order_number ?? '').toLowerCase().includes(q)
      || (o.client_name ?? '').toLowerCase().includes(q)
      || (o.product_name ?? '').toLowerCase().includes(q);
  });

  const handleDecisionSubmit = async () => {
    if (!selectedOrder || !decisionMode) return;
    if ((decisionMode === 'REQUEST_INFO' || decisionMode === 'DECLINED') && notes.trim().length < 5) {
      toast.error('Catatan wajib diisi (min 5 karakter) untuk Minta Info dan Tolak');
      return;
    }
    setSubmitting(true);
    try {
      await submitInsurerDecisionAuthed(authToken, selectedOrder.id, decisionMode, notes);
      const label = decisionMode === 'APPROVED' ? 'disetujui'
        : decisionMode === 'REQUEST_INFO' ? 'permintaan info dikirim'
        : 'ditolak';
      toast.success(`Pengajuan ${label}. Notifikasi terkirim ke nasabah & tim SurePath.`);
      setDecisionMode(null);
      setNotes('');
      setSelectedOrder(null);
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSlip = async (o: InsurerOrder) => {
    if (downloadingSlip) return;
    setDownloadingSlip(true);
    try {
      await publishAndDownloadQuotation(fromCustomerOrder({ ...o, insurer_name: insurerName || undefined } as any), { sourceApp: 'INSURER', orderId: o.id, totalPremiumNumeric: o.total_premium ?? undefined });
    } catch (e: any) {
      console.error('Quotation slip download failed:', e);
      toast.error('Gagal membuat quotation slip. Coba lagi.');
    } finally {
      setDownloadingSlip(false);
    }
  };

  const handlePolicyUpload = async () => {
    if (!selectedOrder || !file) {
      toast.error('Pilih file PDF terlebih dahulu');
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error('File harus PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB');
      return;
    }
    if (!policyNumber.trim()) {
      toast.error('Nomor polis wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      await uploadInsurerPolicy(authToken, selectedOrder.id, file, policyNumber.trim());
      toast.success('Polis berhasil diupload. Status → ISSUED. Notifikasi terkirim ke nasabah.');
      setUploadMode(false);
      setFile(null);
      setPolicyNumber('');
      setSelectedOrder(null);
      load();
    } catch (e: any) {
      toast.error(`Gagal upload: ${e.message}`);
    } finally {
      setSubmitting(false);
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
        tone="emerald"
        title="Pengajuan Polis"
        subtitle="Review, putuskan, dan terbitkan polis dari penempatan SurePath."
        art={<SpotOrdersArt size={72} />}
      />

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-ink3" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari order / nasabah / produk…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ds-card border border-ds-border text-sm text-ds-ink placeholder-ds-ink3 outline-none focus:border-emerald-500"
        />
      </div>

      <UnderlineTabs
        tabs={STATUS_TABS.map(t => ({ id: t.id, label: t.label }))}
        activeId={activeStatus}
        onChange={setActiveStatus}
      />

      {filtered.length === 0 ? (
        <AgentEmpty
          title="Tidak ada order"
          desc="Tidak ada pengajuan untuk status ini."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const statusColor = {
              SUBMITTED:     'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
              UNDER_REVIEW:  'bg-amber-50 text-ds-amber dark:bg-amber-950/30 dark:text-amber-400',
              APPROVED:      'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400',
              ISSUED:        'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400',
              REJECTED:      'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
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
                  <span className={`text-2xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${statusColor}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ds-border">
                  <button
                    onClick={() => { setSelectedOrder(o); setDecisionMode(null); setUploadMode(false); }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-card2 text-ds-ink2 active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Eye size={12} /> Detail
                  </button>
                  {o.status === 'SUBMITTED' && !o.insurer_decision && (
                    <button
                      onClick={() => { setSelectedOrder(o); setDecisionMode('APPROVED'); }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Review
                    </button>
                  )}
                  {o.status === 'APPROVED' && o.insurer_decision === 'APPROVED' && !o.policy_document_url && (
                    <button
                      onClick={() => { setSelectedOrder(o); setUploadMode(true); }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <Upload size={12} /> Upload Polis
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Decision / Upload sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => { setSelectedOrder(null); setDecisionMode(null); setUploadMode(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative w-full ${SHEET_BG} rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 pt-3 pb-2 bg-inherit">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between px-5">
                <h3 className={`text-lg font-black ${SHEET_TEXT}`}>
                  {uploadMode ? 'Upload Polis PDF' : decisionMode ? `Konfirmasi ${decisionMode === 'APPROVED' ? 'Persetujuan' : decisionMode === 'REQUEST_INFO' ? 'Permintaan Info' : 'Penolakan'}` : 'Detail Pengajuan'}
                </h3>
                <button
                  onClick={() => { setSelectedOrder(null); setDecisionMode(null); setUploadMode(false); setNotes(''); setFile(null); setPolicyNumber(''); }}
                  className={`w-8 h-8 rounded-full ${SHEET_INSET} ${SHEET_TEXT_MUTED} flex items-center justify-center text-lg`}
                >✕</button>
              </div>
            </div>

            <div className="px-5 pb-28 space-y-5">
              {/* Upload mode */}
              {uploadMode ? (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-4 ${SHEET_INSET}`}>
                    <p className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED}`}>Order</p>
                    <p className={`text-sm font-mono font-bold ${SHEET_TEXT} mt-0.5`}>{selectedOrder.order_number}</p>
                    <p className={`text-xs ${SHEET_TEXT_MUTED} mt-0.5`}>{selectedOrder.client_name} · {selectedOrder.product_name}</p>
                  </div>
                  <div>
                    <label className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED} block mb-2`}>Nomor Polis (dari insurer)</label>
                    <input
                      type="text"
                      value={policyNumber}
                      onChange={e => setPolicyNumber(e.target.value)}
                      placeholder="cth: POL-2026-001234"
                      className={`w-full px-3 py-2.5 rounded-xl border ${SHEET_BORDER} ${SHEET_BG} ${SHEET_TEXT} text-sm outline-none focus:border-emerald-500`}
                    />
                  </div>
                  <div>
                    <label className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED} block mb-2`}>File PDF Polis (maks 10MB)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className={`w-full px-3 py-2.5 rounded-xl border ${SHEET_BORDER} ${SHEET_BG} ${SHEET_TEXT} text-xs outline-none`}
                    />
                    {file && (
                      <p className={`text-2xs ${SHEET_TEXT_MUTED} mt-1`}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                    )}
                  </div>
                  <button
                    onClick={handlePolicyUpload}
                    disabled={submitting || !file || !policyNumber.trim()}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Mengupload…</> : <><Upload size={14} /> Upload & Terbitkan Polis</>}
                  </button>
                </div>
              ) : decisionMode ? (
                /* Decision mode */
                <div className="space-y-4">
                  <div className={`rounded-2xl p-4 ${SHEET_INSET}`}>
                    <p className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED}`}>Order</p>
                    <p className={`text-sm font-mono font-bold ${SHEET_TEXT} mt-0.5`}>{selectedOrder.order_number}</p>
                    <p className={`text-xs ${SHEET_TEXT_MUTED} mt-0.5`}>{selectedOrder.client_name} · {selectedOrder.product_name}</p>
                  </div>
                  <div>
                    <label className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED} block mb-2`}>
                      Catatan {(decisionMode === 'REQUEST_INFO' || decisionMode === 'DECLINED') ? '(wajib — min 5 karakter)' : '(opsional)'}
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={4}
                      placeholder={
                        decisionMode === 'APPROVED' ? 'Catatan persetujuan (opsional)…'
                        : decisionMode === 'REQUEST_INFO' ? 'Contoh: Foto STNK kurang jelas, mohon kirim ulang dengan resolusi lebih tinggi…'
                        : 'Alasan penolakan (wajib)…'
                      }
                      className={`w-full px-3 py-2.5 rounded-xl border ${SHEET_BORDER} ${SHEET_BG} ${SHEET_TEXT} text-sm outline-none focus:border-emerald-500 resize-none`}
                    />
                  </div>
                  <button
                    onClick={handleDecisionSubmit}
                    disabled={submitting}
                    className={`w-full py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 ${
                      decisionMode === 'APPROVED' ? 'bg-emerald-500'
                      : decisionMode === 'REQUEST_INFO' ? 'bg-amber-500'
                      : 'bg-rose-500'
                    }`}
                  >
                    {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Mengirim…</> : `Konfirmasi ${decisionMode === 'APPROVED' ? 'Persetujuan' : decisionMode === 'REQUEST_INFO' ? 'Permintaan Info' : 'Penolakan'}`}
                  </button>
                </div>
              ) : (
                /* Detail view */
                <>
                  {/* Order header */}
                  <div className={`rounded-2xl p-4 ${SHEET_INSET}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED}`}>No. Order</p>
                        <p className={`text-sm font-mono font-bold ${SHEET_TEXT} mt-0.5`}>{selectedOrder.order_number ?? selectedOrder.id.slice(0, 8)}</p>
                      </div>
                      <span className={`text-2xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                        selectedOrder.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : selectedOrder.status === 'ISSUED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : selectedOrder.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {selectedOrder.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED}`}>Dibuat</p>
                        <p className={`font-medium ${SHEET_TEXT}`}>{new Date(selectedOrder.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className={`text-2xs font-bold uppercase tracking-wider ${SHEET_TEXT_MUTED}`}>Produk</p>
                        <p className={`font-medium ${SHEET_TEXT}`}>{selectedOrder.product_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer info */}
                  <Section icon={<User size={14} />} title="Data Nasabah" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                    <DetailRow label="Nama" value={selectedOrder.client_name} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                    <DetailRow label="Telepon" value={selectedOrder.client_phone ?? '-'} icon={<Phone size={11} />} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                  </Section>

                  {/* Vehicle info */}
                  {selectedOrder.vehicle_details && (
                    <Section icon={<Car size={14} />} title="Data Kendaraan" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                      {(() => {
                        const vd = selectedOrder.vehicle_details ?? {};
                        return (
                          <>
                            <DetailRow label="Merk / Model" value={`${vd.make ?? '-'} ${vd.model ?? ''}`.trim()} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                            <DetailRow label="Tahun" value={vd.year ? String(vd.year) : '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                            <DetailRow label="Warna" value={vd.color ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                            <DetailRow label="No. Plat" value={(vd.plate ?? `${vd.plateCode ?? ''} ${vd.plateNum ?? ''} ${vd.plateSuffix ?? ''}`.trim()) || '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                            <DetailRow label="No. Rangka" value={vd.chassis ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                            <DetailRow label="No. Mesin" value={vd.engine ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                            <DetailRow label="Penggunaan" value={vd.usage ?? '-'} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                          </>
                        );
                      })()}
                    </Section>
                  )}

                  {/* Document viewer */}
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
                        Tidak ada foto kendaraan
                      </div>
                    )}
                    {selectedOrder.policy_document_url && (
                      <a
                        href={selectedOrder.policy_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-2 flex items-center gap-3 p-3 rounded-xl border ${SHEET_BORDER} ${SHEET_INSET} active:scale-[0.98] transition-transform`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                          <FileText size={16} className="text-ds-green dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${SHEET_TEXT}`}>Polis PDF</p>
                          <p className={`text-2xs ${SHEET_TEXT_MUTED}`}>{selectedOrder.policy_number ?? 'No. polis belum diisi'}</p>
                        </div>
                        <ExternalLink size={14} className={SHEET_TEXT_MUTED} />
                      </a>
                    )}
                  </Section>

                  {/* Coverage & premium */}
                  <Section icon={<ShieldCheck size={14} />} title="Coverage & Premi" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                    <DetailRow label="Coverage Type" value={selectedOrder.coverage_type} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                    <DetailRow label="Sum Insured" value={fmtIdr(selectedOrder.sum_insured)} sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} />
                    <div className={`flex justify-between gap-3 py-2 mt-1 pt-3 border-t-2 ${SHEET_BORDER}`}>
                      <span className={`text-xs font-black uppercase tracking-widest ${SHEET_TEXT}`}>Total Premi</span>
                      <span className="text-sm font-black text-ds-green dark:text-emerald-400">{fmtIdr(selectedOrder.total_premium)}</span>
                    </div>
                  </Section>

                  {/* Quotation slip download */}
                  <button
                    onClick={() => handleDownloadSlip(selectedOrder)}
                    disabled={downloadingSlip}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border ${SHEET_BORDER} ${SHEET_INSET} active:scale-[0.98] transition-transform disabled:opacity-50`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
                      <Download size={16} className="text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-bold ${SHEET_TEXT}`}>{downloadingSlip ? 'Menyiapkan PDF…' : 'Unduh Quotation Slip (PDF)'}</p>
                      <p className={`text-2xs ${SHEET_TEXT_MUTED}`}>Ringkasan penawaran 4 halaman</p>
                    </div>
                    <ExternalLink size={14} className={SHEET_TEXT_MUTED} />
                  </button>

                  {/* Insurer decision (if already decided) */}
                  {selectedOrder.insurer_decision && (
                    <Section icon={<Sparkles size={14} />} title="Keputusan Anda" sheetText={SHEET_TEXT} sheetMuted={SHEET_TEXT_MUTED} sheetBorder={SHEET_BORDER}>
                      <div className={`p-3 rounded-xl mb-2 ${
                        selectedOrder.insurer_decision === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30'
                        : selectedOrder.insurer_decision === 'REQUEST_INFO' ? 'bg-amber-50 dark:bg-amber-950/30'
                        : 'bg-rose-50 dark:bg-rose-950/30'
                      }`}>
                        <p className={`text-xs font-bold ${SHEET_TEXT}`}>
                          {selectedOrder.insurer_decision === 'APPROVED' ? '✓ Disetujui'
                          : selectedOrder.insurer_decision === 'REQUEST_INFO' ? '? Perlu Info Tambahan'
                          : '✗ Ditolak'}
                        </p>
                        {selectedOrder.insurer_decision_notes && (
                          <p className={`text-xs ${SHEET_TEXT_MUTED} mt-1`}>{selectedOrder.insurer_decision_notes}</p>
                        )}
                        {selectedOrder.insurer_decision_at && (
                          <p className={`text-2xs ${SHEET_TEXT_MUTED} mt-1`}>{new Date(selectedOrder.insurer_decision_at).toLocaleString('id-ID')}</p>
                        )}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </div>

            {/* InsurerAI — AI recommendation before insurer makes decision */}
            {!uploadMode && !decisionMode && !selectedOrder.insurer_decision && (
              <div className="px-5 pb-4">
                <InsurerAIPanel
                  orderData={{
                    orderNumber: selectedOrder.order_number ?? selectedOrder.id,
                    clientName: selectedOrder.client_name ?? '-',
                    vehicleBrand: (selectedOrder as any).vehicle_details?.make ?? '-',
                    vehicleModel: (selectedOrder as any).vehicle_details?.model ?? '',
                    vehicleYear: (selectedOrder as any).vehicle_details?.year ?? new Date().getFullYear(),
                    sumInsured: selectedOrder.sum_insured ?? 0,
                    totalPremium: selectedOrder.total_premium ?? 0,
                    coverageType: selectedOrder.coverage_type ?? 'COMPREHENSIVE',
                    insurerName: (selectedOrder as any).insurer_name ?? 'Insurer',
                    agentName: (selectedOrder as any).agent_name ?? 'Agent',
                    agentVerified: true,
                    promoCode: (selectedOrder as any).promo_code,
                    discountRate: (selectedOrder as any).discount_rate,
                    previousClaims: 0,
                  }}
                />
              </div>
            )}

            {/* Sticky action footer — only in detail view (not upload/decision mode) */}
            {!uploadMode && !decisionMode && (
              <div className={`shrink-0 border-t ${SHEET_BORDER} ${SHEET_BG} px-5 pt-3 pb-28 safe-area-pb`}>
                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'SUBMITTED' && !selectedOrder.insurer_decision && (
                    <>
                      <button
                        onClick={() => setDecisionMode('APPROVED')}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                      >
                        <CheckCircle2 size={14} /> Setujui
                      </button>
                      <button
                        onClick={() => setDecisionMode('REQUEST_INFO')}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30"
                      >
                        <AlertTriangle size={14} /> Minta Info
                      </button>
                      <button
                        onClick={() => setDecisionMode('DECLINED')}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-rose-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30"
                      >
                        <XCircle size={14} /> Tolak
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'APPROVED' && selectedOrder.insurer_decision === 'APPROVED' && !selectedOrder.policy_document_url && (
                    <button
                      onClick={() => setUploadMode(true)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                    >
                      <Upload size={14} /> Upload Polis PDF
                    </button>
                  )}
                  {selectedOrder.status === 'ISSUED' && (
                    <div className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-50 dark:bg-emerald-950/30 text-ds-green dark:text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} /> Polis Diterbitkan
                    </div>
                  )}
                  {selectedOrder.insurer_decision && selectedOrder.insurer_decision !== 'APPROVED' && (
                    <div className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${
                      selectedOrder.insurer_decision === 'REQUEST_INFO' ? 'bg-amber-50 dark:bg-amber-950/30 text-ds-amber dark:text-amber-400'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {selectedOrder.insurer_decision === 'REQUEST_INFO' ? <AlertTriangle size={14} /> : <XCircle size={14} />}
                      {selectedOrder.insurer_decision === 'REQUEST_INFO' ? 'Menunggu info dari nasabah' : 'Pengajuan Ditolak'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center">✕</button>
          <img loading="lazy" src={lightboxUrl} alt="Dokumen" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
};

// Sub-components
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
        <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-ds-green dark:text-emerald-400">
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
    <span className={`text-2xs font-bold uppercase tracking-wider ${sheetMuted} flex items-center gap-1.5`}>
      {icon}{label}
    </span>
    <span className={`text-xs font-medium text-right break-all ${sheetText} max-w-[60%]`}>{value}</span>
  </div>
);

export default InsurerOrders;
