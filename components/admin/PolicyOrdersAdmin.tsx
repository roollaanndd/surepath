import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, CheckCircle, XCircle, Clock, Eye, Upload,
  Car, Bike, ChevronDown, Search, Download, RefreshCw, Link, Bell,
} from 'lucide-react';
import {
  getAllOrders, updateOrderStatus, uploadPolicyDocument,
  addNotification, addCommission, getAgentProfile, getProductConfig, awardCoins,
  createReviewToken, getAdminNotifications, markAdminNotificationRead,
  getPaymentsByOrderIds,
  type SpPolicyOrder, type SpAdminNotification, type SpPayment,
} from '../../services/supabaseService';
import { submitPolicyToInsurer } from '../../services/insurerApiService';
import { formatIDR } from '../car-wizard/WizardUI';
import { SecureDocLink } from '../shared/SecureDoc';
import { publishAndDownloadQuotation } from '../../services/quotationService';
import { fromCustomerOrder } from '../../services/quotationSlipAdapter';
import { useToast } from '../ui';

const STATUS_META: Record<SpPolicyOrder['status'], { label: string; color: string; Icon: any }> = {
  SUBMITTED:    { label: 'Submitted',    color: 'bg-amber-500/10 text-amber-400',   Icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-500/10 text-blue-400',     Icon: Eye },
  APPROVED:     { label: 'Approved',     color: 'bg-emerald-500/10 text-emerald-400', Icon: CheckCircle },
  ISSUED:       { label: 'Issued',       color: 'bg-emerald-500/10 text-ds-green', Icon: FileText },
  REJECTED:     { label: 'Rejected',     color: 'bg-rose-500/10 text-rose-400',     Icon: XCircle },
  CANCELLED:    { label: 'Cancelled',    color: 'bg-slate-500/10 text-ds-ink3',   Icon: XCircle },
};

const AI_SCORE_COLOR = (score?: number) => {
  if (!score) return 'text-ds-ink3';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
};

// ── Order Detail Modal ───────────────────────────────────────────────────────

interface DetailProps {
  order: SpPolicyOrder;
  onClose: () => void;
  onStatusChange: (id: string, status: SpPolicyOrder['status'], extras?: any) => void;
  payment?: SpPayment | null;
}

const OrderDetailModal: React.FC<DetailProps> = ({ order, onClose, onStatusChange, payment }) => {
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [insurerMsg, setInsurerMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleDownloadSlip = async () => {
    if (downloadingSlip) return;
    setDownloadingSlip(true);
    try {
      await publishAndDownloadQuotation(fromCustomerOrder(order as any), { sourceApp: 'ADMIN', orderId: (order as any).id, totalPremiumNumeric: (order as any).total_premium ?? undefined });
    } catch (e) {
      console.error('Quotation slip download failed:', e);
      toast.error('Gagal mengunduh slip penawaran. Coba lagi.');
    } finally {
      setDownloadingSlip(false);
    }
  };

  const handleSendReviewLink = async () => {
    setGeneratingLink(true);
    const token = await createReviewToken(order.id);
    setGeneratingLink(false);
    if (!token) { toast.error('Gagal membuat link ulasan. Coba lagi.'); return; }
    const url = `${window.location.origin}/review/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      // Clipboard is blocked without a secure context or user gesture. The link
      // is single-use and 7-day-expiring, so it is shown rather than lost — in a
      // toast the admin can read and select, not a native prompt() that ignores
      // the theme and blocks the thread.
      toast.error(`Clipboard diblokir browser. Link ulasan: ${url}`);
    }
  };

  const v = order.vehicle_details ?? {};

  const handleApprove = async () => {
    setSaving(true);
    await onStatusChange(order.id, 'APPROVED', { reviewer_notes: notes });
    setSaving(false);
  };

  const handleReject = async () => {
    if (!notes.trim()) { toast.error('Wajib isi catatan penolakan.'); return; }
    setSaving(true);
    await onStatusChange(order.id, 'REJECTED', { reviewer_notes: notes });
    setSaving(false);
  };

  const handleReview = async () => {
    setSaving(true);
    await onStatusChange(order.id, 'UNDER_REVIEW');
    setSaving(false);
  };

  const handleUploadPolicy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const docUrl = await uploadPolicyDocument(file, order.order_number ?? order.id);
    if (!docUrl) { setUploading(false); toast.error('Upload dokumen polis gagal. Coba lagi.'); return; }

    const policyNumber = order.policy_number
      ?? `SP-${(order.product_code ?? 'MRKB').replace(/_/g, '-')}-${Date.now().toString(36).toUpperCase()}`;

    await onStatusChange(order.id, 'ISSUED', {
      policy_number: policyNumber,
      policy_document_url: docUrl,
    });

    // Fetch product config for commission & coin rates
    const productConfig = await getProductConfig(order.product_code);
    const agentProfile = await getAgentProfile(order.agent_id);

    // Commission: use order's stored rate if set, else product config, else agent default
    const discountRate = order.discount_rate ?? 0;
    const baseCommRate = productConfig?.base_commission_rate
      ?? (agentProfile as any)?.commission_rate
      ?? 0.10;
    const effectiveCommRate = Math.max(0, baseCommRate - discountRate);
    const commissionAmount = Math.round(order.total_premium * effectiveCommRate);

    // Coin reward: use order's stored value if set, else calculate from product config
    const coinRate = productConfig?.coin_rate ?? 0.05;
    const coinReward = order.coin_reward && order.coin_reward > 0
      ? order.coin_reward
      : Math.floor(order.total_premium * coinRate / 1000);

    await addCommission({
      agent_id: order.agent_id,
      client_name: order.client_name,
      product_type: 'CAR',
      premium_amount: order.total_premium,
      commission_amount: commissionAmount,
      discount_rate: discountRate,
      coin_reward: coinReward,
      order_id: order.id,
      order_number: order.order_number,
      status: 'PENDING',
    });

    // Award coins
    if (coinReward > 0) {
      await awardCoins(
        order.agent_id,
        coinReward,
        order.id,
        `Koin dari order ${order.order_number} – ${order.client_name}`
      );
    }

    // Notify agent — policy issued
    await addNotification({
      agent_id: order.agent_id,
      type: 'SYSTEM',
      title: `Polis ${policyNumber} Telah Diterbitkan!`,
      body: `Order ${order.order_number} untuk ${order.client_name} telah disetujui dan polis dapat diunduh.`,
      metadata: { link: 'quotes', order_id: order.id, policy_document_url: docUrl },
    });

    // Notify agent — commission + coins earned
    await addNotification({
      agent_id: order.agent_id,
      type: 'COMMISSION_EARNED',
      title: `Komisi & Koin Diperoleh!`,
      body: `Komisi ${formatIDR(commissionAmount)} + ${coinReward} koin (Rp ${(coinReward * 1000).toLocaleString('id-ID')}) dari order ${order.order_number}.`,
      metadata: { link: 'wallet' },
    });

    // Submit to insurer via abstraction layer
    const submission = await submitPolicyToInsurer(order.id);
    if (submission.success && submission.method === 'API') {
      setInsurerMsg({ text: 'Polis berhasil dikirim ke sistem penanggung.', isError: false });
    } else if (submission.success && submission.method === 'MANUAL') {
      setInsurerMsg({ text: 'Dokumen perlu dikirim manual ke penanggung. Notifikasi admin telah dibuat.', isError: false });
    } else {
      setInsurerMsg({ text: submission.message ?? 'Gagal mengirim ke penanggung.', isError: true });
    }

    setUploading(false);
    // Keep modal open briefly to show the insurer submission message
    setTimeout(() => onClose(), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-ds-card rounded-[2.5rem] border border-ds-border w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ds-border">
          <div>
            <h3 className="font-black text-lg tracking-tight">{order.order_number ?? '—'}</h3>
            <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mt-0.5">
              {order.product_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(() => { const m = STATUS_META[order.status]; return (
              <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${m.color}`}>
                <m.Icon size={10} /> {m.label}
              </span>
            ); })()}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-ds-card2 flex items-center justify-center text-ds-ink3 hover:text-white">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Client info */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">Informasi Klien</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Nama', order.client_name],
                ['Telepon', order.client_phone ?? '-'],
                ['KTP', order.client_ktp ?? '-'],
              ].map(([k, v]) => (
                <div key={k} className="bg-ds-card2 rounded-2xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3">{k}</p>
                  <p className="text-sm font-bold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle details */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">Detail Kendaraan</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Jenis', order.vehicle_type === 'MOTORCYCLE' ? 'Roda 2 (Motor)' : 'Roda 4 (Mobil)'],
                ['Merk / Model', `${v.make ?? '-'} ${v.model ?? ''}`],
                ['Tahun', v.year ?? '-'],
                ['Warna', v.color ?? '-'],
                ['Plat Nomor', v.plate ?? '-'],
                ['No. Rangka', v.chassis ?? '-'],
                ['No. Mesin', v.engine ?? '-'],
                ['Penggunaan', v.usage ?? '-'],
                ['Provinsi / Zona', `${v.province ?? '-'} (Zona ${order.zone})`],
              ].map(([k, val]) => (
                <div key={k} className="bg-ds-card2 rounded-2xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3">{k}</p>
                  <p className="text-sm font-bold mt-0.5 break-all">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle image + AI score */}
          <div className="grid grid-cols-2 gap-4">
            {order.vehicle_image_url && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-2">Foto Kendaraan</p>
                <img
                  src={order.vehicle_image_url}
                  alt="Vehicle"
                  className="rounded-2xl w-full object-cover max-h-40 border border-ds-border"
                />
              </div>
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-2">Skor AI Survey</p>
              <div className="bg-ds-card2 rounded-2xl p-4 text-center">
                <p className={`text-4xl font-black ${AI_SCORE_COLOR(order.ai_score)}`}>
                  {order.ai_score ?? '—'}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3 mt-1">
                  {order.ai_verdict ?? '-'}
                </p>
              </div>
              {Array.isArray(order.ai_findings) && order.ai_findings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {(order.ai_findings as any[]).slice(0, 3).map((f: any, i: number) => (
                    <p key={i} className="text-[10px] text-ds-ink3 truncate">• {f.description ?? f}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Premium breakdown */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-3">Rincian Premi</p>
            <div className="bg-ds-card2 rounded-2xl p-4 space-y-2">
              {[
                ['Jenis Pertanggungan', order.coverage_type],
                ['Harga Pertanggungan', formatIDR(order.sum_insured)],
                ['OJK Rate', order.ojk_rate ? `${(order.ojk_rate * 100).toFixed(2)}%` : '-'],
                ['Premi Dasar', formatIDR(order.base_premium)],
                ['Premi Add-on', formatIDR(order.addon_premium)],
                ['Biaya Admin', formatIDR(order.admin_fee)],
                ['Bea Materai', formatIDR(order.stamp_duty)],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-ds-ink3 font-medium">{k}</span>
                  <span className="font-bold">{val}</span>
                </div>
              ))}
              <div className="border-t border-ds-border pt-2 flex justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-ds-ink2">Total Premi</span>
                <span className="font-black text-ds-green">{formatIDR(order.total_premium)}</span>
              </div>
            </div>
          </div>

          {/* Payment status */}
          {payment && (
            <div className={`p-4 rounded-2xl ${
              payment.status === 'PAID' ? 'bg-emerald-500/10 border border-emerald-500/20' :
              payment.status === 'PENDING' ? 'bg-amber-500/10 border border-amber-500/20' :
              'bg-slate-500/10 border border-slate-500/20'
            }`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-2">Status Pembayaran</p>
              {payment.status === 'PAID' ? (
                <div className="space-y-1">
                  <p className="text-sm font-black text-emerald-400">✓ Premi Telah Dibayar</p>
                  <p className="text-[10px] text-ds-ink3">{formatIDR(payment.paid_amount ?? payment.amount)} · {payment.payment_method ?? payment.payment_channel ?? '—'} · {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}</p>
                </div>
              ) : payment.status === 'PENDING' && payment.invoice_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-amber-400 font-semibold">Invoice aktif — menunggu pembayaran</p>
                  <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest flex items-center gap-1">
                    <Link size={10} /> Buka Invoice Xendit
                  </a>
                </div>
              ) : (
                <p className="text-xs text-ds-ink3 font-semibold">Invoice {payment.status}</p>
              )}
            </div>
          )}

          {/* Reviewer notes */}
          {(order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW') && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 block mb-2">
                Catatan Reviewer
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Catatan persetujuan atau alasan penolakan…"
                className="w-full bg-ds-card2 border border-ds-border rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          )}

          {order.reviewer_notes && (
            <div className="p-4 bg-blue-500/10 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Catatan Admin</p>
              <p className="text-sm text-blue-300">{order.reviewer_notes}</p>
            </div>
          )}

          {/* Issued policy link */}
          {order.policy_document_url && (
            <SecureDocLink
              url={order.policy_document_url}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
            >
              <Download size={14} />
              Download Polis ({order.policy_number ?? '—'})
            </SecureDocLink>
          )}

          {/* Insurer submission result */}
          {insurerMsg && (
            <div className={`p-4 rounded-2xl border text-sm font-bold ${
              insurerMsg.isError
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {insurerMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              disabled={downloadingSlip}
              onClick={handleDownloadSlip}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
            >
              <Download size={12} />
              {downloadingSlip ? 'Menyiapkan…' : 'Quotation Slip'}
            </button>
            {/* Send review link — available for all non-issued/rejected orders */}
            {(order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW' || order.status === 'APPROVED') && (
              <button
                disabled={generatingLink}
                onClick={handleSendReviewLink}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors ${
                  linkCopied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                }`}
              >
                <Link size={12} />
                {generatingLink ? '…' : linkCopied ? 'Link Tersalin!' : 'Kirim Link Review'}
              </button>
            )}
            {order.status === 'SUBMITTED' && (
              <button
                disabled={saving}
                onClick={handleReview}
                className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
              >
                {saving ? '…' : 'Mulai Review'}
              </button>
            )}
            {(order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW') && (
              <>
                <button
                  disabled={saving}
                  onClick={handleApprove}
                  className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  {saving ? '…' : 'Setujui'}
                </button>
                <button
                  disabled={saving}
                  onClick={handleReject}
                  className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  {saving ? '…' : 'Tolak'}
                </button>
              </>
            )}
            {order.status === 'APPROVED' && (
              <>
                <input ref={fileRef} type="file" accept=".pdf" onChange={handleUploadPolicy} className="hidden" />
                <button
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  <Upload size={14} />
                  {uploading ? 'Mengupload…' : 'Upload Polis PDF → Terbitkan'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const PolicyOrdersAdmin: React.FC = () => {
  const [orders, setOrders] = useState<SpPolicyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SpPolicyOrder | null>(null);
  const [adminNotifs, setAdminNotifs] = useState<SpAdminNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [payments, setPayments] = useState<Record<string, SpPayment>>({});

  const load = async () => {
    setLoading(true);
    const [data, notifs] = await Promise.all([getAllOrders(), getAdminNotifications()]);
    setOrders(data);
    setAdminNotifs(notifs);
    if (data.length > 0) {
      const pmts = await getPaymentsByOrderIds(data.map(o => o.id));
      const map: Record<string, SpPayment> = {};
      pmts.forEach(p => { if (!map[p.order_id]) map[p.order_id] = p; });
      setPayments(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unreadCount = adminNotifs.filter(n => !n.read).length;

  const handleStatusChange = async (id: string, status: SpPolicyOrder['status'], extras?: any) => {
    await updateOrderStatus(id, status, extras);
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, status, ...extras } : o
    ));
    setSelected(prev => prev && prev.id === id ? { ...prev, status, ...extras } : prev);
  };

  const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED'];

  const visible = orders.filter(o => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    const plate = (o.vehicle_details?.plate ?? '').toLowerCase();
    return (
      (o.client_name ?? '').toLowerCase().includes(q) ||
      (o.order_number ?? '').toLowerCase().includes(q) ||
      (o.product_name ?? '').toLowerCase().includes(q) ||
      (o.client_ktp ?? '').toLowerCase().includes(q) ||
      plate.includes(q)
    );
  });

  const counts: Record<string, number> = { ALL: orders.length };
  FILTERS.slice(1).forEach(f => { counts[f] = orders.filter(o => o.status === f).length; });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Admin notification inbox */}
      {adminNotifs.length > 0 && (
        <div>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="flex items-center gap-2 mb-3"
          >
            <div className="relative">
              <Bell size={14} className="text-ds-ink3" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[7px] font-black text-white flex items-center justify-center">{unreadCount}</span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">
              Notifikasi Admin ({unreadCount} baru)
            </span>
            <ChevronDown size={12} className={`text-ds-ink3 transition-transform ${showNotifs ? 'rotate-180' : ''}`} />
          </button>
          {showNotifs && (
            <div className="space-y-2 mb-4">
              {adminNotifs.slice(0, 10).map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${notif.read ? 'bg-white/[0.01] border-ds-border' : 'bg-violet-500/5 border-violet-500/20'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white">{notif.title}</p>
                      <p className="text-[10px] text-ds-ink3 mt-0.5">{notif.body}</p>
                      {notif.review_url && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(notif.review_url!).catch(() => {})}
                            className="text-[9px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 px-2.5 py-1 rounded-full"
                          >
                            Salin Link
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Tinjauan polis:\n${notif.review_url}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2.5 py-1 rounded-full"
                          >
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                    {!notif.read && (
                      <button
                        onClick={() => { markAdminNotificationRead(notif.id); setAdminNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n)); }}
                        className="text-[9px] text-ds-ink3 hover:text-white flex-shrink-0"
                      >
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FILTERS.slice(1).map(f => {
          const m = STATUS_META[f as SpPolicyOrder['status']];
          return (
            <div
              key={f}
              onClick={() => setFilter(f)}
              className={`p-4 rounded-[1.5rem] border cursor-pointer transition-all ${
                filter === f ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-ds-border bg-ds-card2 hover:border-ds-border'
              }`}
            >
              <p className={`text-2xl font-black ${counts[f] > 0 && f === 'SUBMITTED' ? 'text-amber-400' : 'text-white'}`}>{counts[f]}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3 mt-1">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ds-ink3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari order, klien, KTP, plat, produk…"
            className="w-full pl-10 pr-4 py-2.5 bg-ds-card2 border border-ds-border rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-emerald-500 text-white' : 'bg-ds-card2 text-ds-ink3 hover:bg-ds-card2'
              }`}
            >
              {f === 'ALL' ? 'Semua' : STATUS_META[f as SpPolicyOrder['status']].label}
              {` (${counts[f]})`}
            </button>
          ))}
        </div>
        <button onClick={load} className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center text-ds-ink3 hover:text-white">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-ds-ink3 text-sm font-bold">Tidak ada order ditemukan.</div>
      ) : (
        <div className="space-y-3">
          {visible.map(order => {
            const m = STATUS_META[order.status];
            const VIcon = order.vehicle_type === 'MOTORCYCLE' ? Bike : Car;
            return (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                className="p-5 bg-ds-card2 border border-ds-border rounded-[2rem] cursor-pointer hover:border-ds-border hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-ds-card2 flex items-center justify-center flex-shrink-0">
                    <VIcon size={20} className="text-ds-ink3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <p className="font-black text-sm">{order.client_name}</p>
                        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">
                          {order.order_number} · {order.product_name}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${m.color}`}>
                        <m.Icon size={9} /> {m.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-bold text-ds-green">{formatIDR(order.total_premium)}/tahun</span>
                      {order.ai_score !== undefined && order.ai_score !== null && (
                        <span className={`text-[9px] font-black uppercase tracking-widest ${AI_SCORE_COLOR(order.ai_score)}`}>
                          AI Score: {order.ai_score}
                        </span>
                      )}
                      {(() => {
                        const pmt = payments[order.id];
                        if (pmt?.status === 'PAID') return <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Lunas</span>;
                        if (pmt?.status === 'PENDING') return <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Invoice Aktif</span>;
                        return null;
                      })()}
                      <span className="text-[9px] text-ds-ink3">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : ''}
                      </span>
                      <span className="text-[9px] font-bold text-ds-ink3">Zona {order.zone} · {order.coverage_type}</span>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-ds-ink3 flex-shrink-0 -rotate-90 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          payment={payments[selected.id] ?? null}
        />
      )}
    </div>
  );
};

export default PolicyOrdersAdmin;
