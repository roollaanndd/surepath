import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../../types';
import { pathyChat, PathyError } from '../../services/supabaseService';
import type { PathyCard, PathyDocument } from '../../services/supabaseService';
import { SUREPATH_WHATSAPP } from '../../constants';
import { extractStnkOcr } from '../../services/stnkOcr';
import { extractKtpOcr } from '../../services/ktpOcr';
import { getMarketValueForYear, getMarketValueForMotoYear } from '../../services/vehicleDatabase';
import { requestClaimStart } from '../../services/claimHandoff';
import { isSpeechSupported, startDictation, type DictationHandle } from '../../services/speech';

type Lang = Language | 'EN' | 'ID';
const isEN = (lang: Lang) => lang === Language.EN;

// ─── Pathy mascot (self-contained, animated) ──────────────────────────────────
const PathyFace: React.FC<{ size?: number; animate?: boolean }> = ({ size = 44, animate = true }) => {
  const W = size, H = Math.round(size * 1.16);
  return (
    <div style={{ position: 'relative', width: W, height: H, animation: animate ? 'pathy-bob 3.2s ease-in-out infinite' : 'none' }}>
      <svg viewBox="0 0 120 140" width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="pathychat-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2BE07A" />
            <stop offset="1" stopColor="#0E9D57" />
          </linearGradient>
        </defs>
        <path d="M60 6 L110 26 V70 C110 104 88 126 60 134 C32 126 10 104 10 70 V26 Z"
          fill="url(#pathychat-body)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M60 14 L100 30 V46 C84 36 70 33 60 33 C50 33 36 36 20 46 V30 Z" fill="rgba(255,255,255,0.16)" />
      </svg>
      {[W * 0.345, W * 0.525].map((lx, i) => (
        <div key={i} style={{ position: 'absolute', left: lx, top: H * 0.40, width: W * 0.13, height: W * 0.17, animation: animate ? `pathy-blink 4.2s ease-in-out ${i * 0.05}s infinite` : 'none', transformOrigin: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#0b3d24', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: '52%', top: '18%', width: '34%', height: '30%', background: '#fff', borderRadius: '50%' }} />
        </div>
      ))}
      <svg viewBox="0 0 40 20" width={W * 0.30} height={W * 0.15} style={{ position: 'absolute', left: '50%', top: H * 0.55, transform: 'translateX(-50%)' }}>
        <path d="M4 4 Q20 20 36 4" fill="none" stroke="#0b3d24" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', left: '50%', top: H * 0.70, transform: 'translateX(-50%)', width: W * 0.24, height: W * 0.24, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width={W * 0.14} height={W * 0.14} fill="none" stroke="#0E9D57" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: W * 0.80, top: H * 0.30, width: W * 0.20, height: W * 0.20, transformOrigin: '30% 80%', animation: animate ? 'pathy-wave 1.6s ease-in-out infinite' : 'none' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#2BE07A,#0E9D57)', borderRadius: '50% 50% 50% 20%', border: '1.5px solid rgba(255,255,255,0.45)', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }} />
      </div>
    </div>
  );
};

let keyframesInjected = false;
function ensurePathyChatKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-pathychat', '');
  style.textContent = `
    @keyframes pathy-bob   { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-6px) rotate(1deg); } }
    @keyframes pathy-wave  { 0%,60%,100% { transform: rotate(8deg); } 70% { transform: rotate(34deg); } 80% { transform: rotate(2deg); } 90% { transform: rotate(30deg); } }
    @keyframes pathy-blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(0.12); } }
    @keyframes pathychat-pop { 0% { opacity:0; transform: translateY(12px) scale(0.96); } 100% { opacity:1; transform: translateY(0) scale(1); } }
    @keyframes pathy-typing { 0%,80%,100% { transform: translateY(0); opacity:0.4; } 40% { transform: translateY(-5px); opacity:1; } }
    @keyframes pathy-mic    { 0%,100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.55); } 70% { box-shadow: 0 0 0 7px rgba(244,63,94,0); } }
    @media (prefers-reduced-motion: reduce) { [data-pathychat-anim] { animation: none !important; } }
  `;
  document.head.appendChild(style);
}

interface QuickReply {
  id: string;
  chipEn: string; chipId: string;
  /** Sent to Pathy as if the user typed it, so the answer uses their real data. */
  promptEn?: string; promptId?: string;
  /** Canned client-side answer — only for actions that never need the model. */
  answerEn?: string; answerId?: string;
  action?: 'whatsapp';
  agentOnly?: boolean;
}

// FIX: these used to be canned paragraphs ("open the History tab…") that never
// touched the user's account. They now ask Pathy the real question, so the
// answer comes back with the caller's own policies, claims and numbers.
const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'policies',
    chipEn: 'My policies', chipId: 'Polis saya',
    promptEn: 'Show my policies and their status.',
    promptId: 'Tampilkan daftar polis saya beserta statusnya.',
  },
  {
    id: 'claims',
    chipEn: 'Claim status', chipId: 'Status klaim',
    promptEn: 'What is the status of my claims?',
    promptId: 'Bagaimana status klaim saya?',
  },
  {
    id: 'quote',
    chipEn: 'Create a quote', chipId: 'Buat penawaran',
    promptEn: 'I want a car insurance quote.',
    promptId: 'Aku mau buat penawaran asuransi mobil.',
  },
  {
    id: 'proposal',
    chipEn: 'Proposal from STNK', chipId: 'Proposal dari STNK',
    promptEn: 'Build a quotation proposal with a few options — I will attach the registration.',
    promptId: 'Buatkan proposal penawaran beberapa opsi ya, STNK-nya aku lampirkan.',
  },
  {
    id: 'sales',
    chipEn: 'Sales report', chipId: 'Laporan penjualan',
    promptEn: 'Show my sales report for this month.',
    promptId: 'Tampilkan laporan penjualanku bulan ini.',
    agentOnly: true,
  },
  {
    id: 'whatsapp',
    chipEn: 'Chat WhatsApp agent', chipId: 'Chat WhatsApp agen',
    answerEn: 'Opening WhatsApp so you can chat with a SurePath agent...',
    answerId: 'Membuka WhatsApp agar kamu bisa mengobrol dengan agen SurePath...',
    action: 'whatsapp',
  },
];

const AGENT_ROLES = new Set(['AGENT', 'AGENT_LEADER', 'MASTER_ADMIN', 'ADMIN']);

// ─── Card rendering ──────────────────────────────────────────────────────────
// Numbers come straight from the tool result, not from the model's prose, so
// a premium or policy number can never drift in the retelling.

const rp = (n: unknown) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const shortDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_TONE: Record<string, string> = {
  ISSUED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  DRAFT: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  REVIEW: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  REJECTED: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  CANCELLED: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

const Pill: React.FC<{ value?: string | null }> = ({ value }) => {
  const key = String(value ?? '').toUpperCase();
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[0.55rem] font-black tracking-wide ${
      STATUS_TONE[key] ?? 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
    }`}>
      {key || '—'}
    </span>
  );
};

const CardShell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-white dark:bg-slate-800 overflow-hidden">
    <p className="px-3 py-1.5 text-[0.55rem] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
      {title}
    </p>
    <div className="px-3 py-2 space-y-2">{children}</div>
  </div>
);

const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3 text-[0.68rem]">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="font-bold text-slate-800 dark:text-slate-100 text-right">{value}</span>
  </div>
);

/**
 * The proposal card. Downloading runs the very same pipeline the car-buy wizard
 * uses (StepFinal.tsx): fromAgentQuote() → publishAndDownloadQuotation(), which
 * mints the e-quote code, snapshots it for the /q/{code} page, and renders the
 * 4-page SurePath slip. So a proposal made in chat is byte-for-byte the same
 * document as one made through the wizard.
 */
const QuotationCard: React.FC<{ data: any; en: boolean; sourceApp: 'AGENT' | 'CUSTOMER' }> = ({ data, en, sourceApp }) => {
  const t = (id: string, e: string) => (en ? e : id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const download = async () => {
    if (busy || !data?.quotation) return;
    setBusy(true);
    setErr(null);
    try {
      const [{ fromAgentQuote }, { publishAndDownloadQuotation }] = await Promise.all([
        import('../../services/quotationSlipAdapter'),
        import('../../services/quotationService'),
      ]);
      await publishAndDownloadQuotation(
        fromAgentQuote(data.quotation),
        { sourceApp, totalPremiumNumeric: data.totalPremium },
      );
    } catch (e) {
      console.error('Pathy quotation PDF:', e);
      setErr(t('PDF gagal dibuat. Coba lagi ya.', 'Could not build the PDF. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CardShell title={t('Proposal penawaran', 'Quotation proposal')}>
      <Row label={t('Nomor', 'Number')} value={data.quotationNumber} />
      <Row label={t('Untuk', 'For')} value={data.clientName} />
      <Row label={t('Kendaraan', 'Vehicle')} value={[data.vehicle, data.plate].filter(Boolean).join(' · ')} />
      <Row label={t('Paket', 'Package')} value={data.optionLabel} />
      <Row label={t('Pertanggungan', 'Sum insured')} value={rp(data.sumInsured)} />
      <div className="pt-1.5 border-t border-slate-100 dark:border-white/10">
        <Row
          label={<span className="font-black">{t('Total premi', 'Total premium')}</span>}
          value={<span className="text-emerald-600 dark:text-emerald-400">{rp(data.totalPremium)}</span>}
        />
      </div>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="mt-1 w-full py-2 rounded-xl bg-emerald-500 text-white text-[0.7rem] font-black disabled:opacity-60 active:scale-[0.98] transition-transform"
      >
        {busy ? t('Menyiapkan…', 'Preparing…') : t('Unduh PDF penawaran', 'Download quotation PDF')}
      </button>
      {err && <p className="text-[0.6rem] text-rose-500 leading-snug">{err}</p>}
      <p className="text-[0.55rem] text-slate-400 leading-snug">
        {t(
          `Berlaku sampai ${shortDate(data.validUntil)}. Penawaran indikatif — belum penerbitan polis.`,
          `Valid until ${shortDate(data.validUntil)}. Indicative quote — not a policy issuance.`,
        )}
      </p>
    </CardShell>
  );
};

// A follow-up message Pathy drafted for an agent. Two deliberate properties:
// the text is editable before it goes anywhere, and the send button is a plain
// wa.me link the AGENT taps — nothing is ever sent on their behalf.
const FollowupCard: React.FC<{ data: any; en: boolean }> = ({ data, en }) => {
  const t = (id: string, e: string) => (en ? e : id);
  const [text, setText] = useState<string>(String(data?.message ?? ''));
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the text is on screen and selectable */ }
  };

  return (
    <CardShell title={t('Draft pesan follow-up', 'Follow-up draft')}>
      <p className="text-[0.62rem] text-slate-500">{t('Untuk', 'For')}: <span className="font-bold text-slate-700 dark:text-slate-200">{data?.client_name}</span></p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 text-[0.66rem] leading-snug text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
        aria-label={t('Isi pesan', 'Message body')}
      />
      <div className="flex gap-2">
        <button onClick={copy}
          className="flex-1 py-2 rounded-xl text-[0.62rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 active:scale-[0.98] transition-transform">
          {copied ? t('Tersalin', 'Copied') : t('Salin', 'Copy')}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 rounded-xl text-[0.62rem] font-black uppercase tracking-wider text-white text-center active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
        >
          {t('Buka WhatsApp', 'Open WhatsApp')}
        </a>
      </div>
      <p className="text-[0.55rem] text-slate-400 leading-snug">
        {t('Pathy tidak mengirim pesan. Kamu yang memilih penerima dan menekan kirim.',
           'Pathy does not send messages. You pick the recipient and hit send.')}
      </p>
    </CardShell>
  );
};

const PathyCardView: React.FC<{ card: PathyCard; en: boolean; isAgent: boolean }> = ({ card, en, isAgent }) => {
  const t = (id: string, e: string) => (en ? e : id);
  const d = card.data ?? {};

  switch (card.type) {
    case 'policies': {
      const list = (d.policies ?? []) as any[];
      if (list.length === 0) {
        return (
          <CardShell title={t('Polis', 'Policies')}>
            <p className="text-[0.68rem] text-slate-500">{t('Belum ada polis pada akun ini.', 'No policies on this account yet.')}</p>
          </CardShell>
        );
      }
      return (
        <CardShell title={t(`Polis (${list.length})`, `Policies (${list.length})`)}>
          {list.map((o, i) => (
            <div key={o.order_number ?? i} className="pb-2 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-[0.7rem] text-slate-800 dark:text-slate-100">{o.policy_number || o.order_number}</span>
                <Pill value={o.status} />
              </div>
              <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">{o.product}{o.insurer ? ` · ${o.insurer}` : ''}</p>
              <div className="flex justify-between text-[0.62rem] text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{t('Premi', 'Premium')}: {rp(o.total_premium)}</span>
                <span>{t('s/d', 'until')} {shortDate(o.end_date)}</span>
              </div>
            </div>
          ))}
        </CardShell>
      );
    }
    case 'policy_detail':
      return (
        <CardShell title={t('Detail Polis', 'Policy Detail')}>
          <Row label={t('Nomor', 'Number')} value={d.policy_number || d.order_number} />
          <Row label={t('Produk', 'Product')} value={d.product} />
          <Row label="Status" value={<Pill value={d.status} />} />
          <Row label={t('Pertanggungan', 'Sum insured')} value={rp(d.sum_insured)} />
          <Row label={t('Total premi', 'Total premium')} value={rp(d.total_premium)} />
          <Row label={t('Periode', 'Period')} value={`${shortDate(d.start_date)} – ${shortDate(d.end_date)}`} />
        </CardShell>
      );
    case 'claims': {
      const list = (d.claims ?? []) as any[];
      if (list.length === 0) {
        return (
          <CardShell title={t('Klaim', 'Claims')}>
            <p className="text-[0.68rem] text-slate-500">{t('Belum ada klaim pada akun ini.', 'No claims on this account yet.')}</p>
          </CardShell>
        );
      }
      return (
        <CardShell title={t(`Klaim (${list.length})`, `Claims (${list.length})`)}>
          {list.map((c, i) => (
            <div key={c.claim_number ?? i} className="pb-2 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-[0.7rem] text-slate-800 dark:text-slate-100">{c.claim_number}</span>
                <Pill value={c.status} />
              </div>
              <div className="flex justify-between text-[0.62rem] text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{shortDate(c.incident_date)}</span>
                <span>{c.amount_approved != null ? `${t('Disetujui', 'Approved')}: ${rp(c.amount_approved)}` : `${t('Estimasi', 'Estimated')}: ${rp(c.amount_estimated)}`}</span>
              </div>
            </div>
          ))}
        </CardShell>
      );
    }
    case 'quotes': {
      const list = (d.quotes ?? []) as any[];
      if (list.length === 0) {
        return (
          <CardShell title={t('Penawaran', 'Quotes')}>
            <p className="text-[0.68rem] text-slate-500">{t('Belum ada penawaran tersimpan.', 'No saved quotes yet.')}</p>
          </CardShell>
        );
      }
      return (
        <CardShell title={t(`Penawaran (${list.length})`, `Quotes (${list.length})`)}>
          {list.map((q, i) => (
            <div key={q.id ?? i} className="flex items-center justify-between gap-2 text-[0.68rem]">
              <span className="truncate text-slate-700 dark:text-slate-200">{q.client_name} · {q.product_type}</span>
              <span className="font-black text-slate-800 dark:text-slate-100">{rp(q.premium_estimate)}</span>
            </div>
          ))}
        </CardShell>
      );
    }
    case 'premium':
      return (
        <CardShell title={t('Estimasi Premi', 'Premium Estimate')}>
          <Row label={t('Pertanggungan', 'Sum insured')} value={rp(d.sum_insured)} />
          <Row label={t('Jenis', 'Coverage')} value={d.coverageType} />
          <Row label={t('Zona OJK', 'OJK zone')} value={`${d.zone} · ${t('kategori', 'category')} ${d.category}`} />
          <Row label={t('Tarif dasar', 'Base rate')} value={`${d.ratePercent}%`} />
          <Row label={t('Premi dasar', 'Base premium')} value={rp(d.basePremium)} />
          {Number(d.addonPremium) > 0 && <Row label={t('Perluasan', 'Add-ons')} value={rp(d.addonPremium)} />}
          <Row label={t('Biaya admin + materai', 'Admin + stamp')} value={rp(Number(d.adminFee) + Number(d.stampDuty))} />
          <div className="pt-1.5 border-t border-slate-100 dark:border-white/10">
            <Row label={<span className="font-black">{t('Total estimasi', 'Estimated total')}</span>} value={<span className="text-emerald-600 dark:text-emerald-400">{rp(d.total)}</span>} />
          </div>
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">
            {t(
              `Tarif OJK ${d.rateSetVersion ?? ''} — estimasi indikatif, premi final ditentukan insurer.`,
              `OJK tariff ${d.rateSetVersion ?? ''} — indicative estimate; the insurer sets the final premium.`,
            )}
          </p>
        </CardShell>
      );
    case 'quote_created':
      return (
        <CardShell title={t('Penawaran Tersimpan', 'Quote Saved')}>
          <Row label={t('Untuk', 'For')} value={d.client_name} />
          <Row label={t('Produk', 'Product')} value={`${d.product_type} · ${d.coverage_type}`} />
          {d.vehicle_description && <Row label={t('Kendaraan', 'Vehicle')} value={d.vehicle_description} />}
          <Row label={t('Estimasi premi', 'Estimated premium')} value={<span className="text-emerald-600 dark:text-emerald-400">{rp(d.premium_estimate)}</span>} />
          <Row label={t('Berlaku s/d', 'Valid until')} value={shortDate(d.expires_at)} />
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">
            {t('Status DRAFT — ini penawaran indikatif, belum penerbitan polis.', 'DRAFT status — an indicative quote, not a policy issuance.')}
          </p>
        </CardShell>
      );
    case 'sales_report':
      return (
        <CardShell title={t('Laporan Penjualan', 'Sales Report')}>
          <Row label={t('Order', 'Orders')} value={`${d.total_orders} (${d.paid_orders} ${t('terbayar', 'paid')})`} />
          <Row label={t('Premi bruto', 'Gross premium')} value={rp(d.gross_premium)} />
          <Row label={t('Premi terbayar', 'Paid premium')} value={rp(d.paid_premium)} />
          <Row label={t('Komisi (terbayar)', 'Commission (paid)')} value={rp(d.commission_earned_on_paid)} />
          {d.wallet && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-white/10">
              <Row label={t('Saldo dompet', 'Wallet balance')} value={<span className="text-emerald-600 dark:text-emerald-400">{rp(d.wallet.balance)}</span>} />
            </div>
          )}
        </CardShell>
      );
    case 'document_read': {
      const f = (d.fields ?? {}) as Record<string, any>;
      const isKtp = d.type === 'KTP';
      const conf = typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : null;
      const entries: Array<[string, any]> = isKtp
        ? [
            [t('Nama', 'Name'), f.name],
            [t('NIK', 'ID number'), f.nik],
            [t('Alamat', 'Address'), f.address],
          ]
        : [
            [t('Nomor Polisi', 'Plate'), f.plate],
            [t('Merk / Tipe', 'Make / model'), [f.brand, f.model].filter(Boolean).join(' ')],
            [t('Tahun', 'Year'), f.year],
            [t('Nomor Rangka', 'VIN'), f.vin],
            [t('Pemilik', 'Owner'), f.owner_name],
            [t('Nilai pertanggungan', 'Sum insured'), f.market_value ? rp(f.market_value) : null],
          ];
      return (
        <CardShell title={isKtp ? t('Hasil baca KTP', 'KTP read') : t('Hasil baca STNK', 'STNK read')}>
          {entries.filter(([, v]) => v).map(([k, v]) => <Row key={k} label={k} value={String(v)} />)}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">
            {conf != null ? t(`Keyakinan ${conf}%. `, `${conf}% confident. `) : ''}
            {t('Ada yang salah? Ketik koreksinya, aku perbaiki.', 'Something wrong? Just type the correction.')}
          </p>
        </CardShell>
      );
    }
    case 'offers': {
      const list = (d.options ?? []) as any[];
      return (
        <CardShell title={t('Opsi penawaran', 'Quote options')}>
          {d.vehicle?.brand && (
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 -mt-0.5">
              {[d.vehicle.brand, d.vehicle.model, d.vehicle.year].filter(Boolean).join(' ')}
              {d.sumInsured ? ` · ${rp(d.sumInsured)}` : ''}{d.zone ? ` · ${t('Zona', 'Zone')} ${d.zone}` : ''}
            </p>
          )}
          {list.map((o, i) => (
            <div key={o.id ?? i} className="rounded-xl border border-slate-100 dark:border-white/10 px-2.5 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-black text-[0.7rem] text-slate-800 dark:text-slate-100">{o.label}</span>
                <span className="font-black text-[0.78rem] text-emerald-600 dark:text-emerald-400 tabular-nums">{rp(o.total)}</span>
              </div>
              <p className="text-[0.6rem] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{o.blurb}</p>
              <p className="text-[0.55rem] text-slate-400 mt-1">{t('Tarif', 'Rate')} {o.ratePercent}%</p>
            </div>
          ))}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">{d.disclaimer}</p>
        </CardShell>
      );
    }
    case 'quotation_ready':
      return <QuotationCard data={d} en={en} sourceApp={isAgent ? 'AGENT' : 'CUSTOMER'} />;
    case 'products':
      return (
        <CardShell title={t('Produk SurePath', 'SurePath Products')}>
          {((d.products ?? []) as any[]).map((pr, i) => (
            <div key={pr.code ?? i} className="text-[0.66rem]">
              <span className="font-black text-slate-800 dark:text-slate-100">{pr.name}</span>
              <p className="text-slate-500 dark:text-slate-400 leading-snug">{pr.summary}</p>
            </div>
          ))}
        </CardShell>
      );
    // ── v2.3.0 service cards ────────────────────────────────────────────────
    case 'coverage': {
      const ok = d.covered === true;
      return (
        <CardShell title={t('Cek jaminan', 'Coverage check')}>
          <div className={`flex items-start gap-2 px-2.5 py-2 rounded-xl ${ok ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            <span className={`mt-0.5 text-[0.8rem] font-black ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>{ok ? '✓' : '✕'}</span>
            <div className="min-w-0">
              <p className={`text-[0.7rem] font-black ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {ok ? t('Ditanggung', 'Covered') : t('Tidak ditanggung', 'Not covered')}
              </p>
              <p className="text-[0.66rem] text-slate-600 dark:text-slate-300 leading-snug">{d.peril_label}</p>
            </div>
          </div>
          <p className="text-[0.66rem] text-slate-600 dark:text-slate-300 leading-snug">{d.reason}</p>
          <Row label={t('Polis', 'Policy')} value={d.policy?.policy_number || d.policy?.order_number || '—'} />
          <Row label={t('Jenis', 'Type')} value={d.policy?.coverage_type} />
          {d.own_risk ? <Row label={t('Risiko sendiri', 'Own risk')} value={rp(d.own_risk)} /> : null}
          {(d.extensions ?? []).length > 0 && (
            <p className="text-[0.6rem] text-slate-500 leading-snug">
              {t('Perluasan aktif: ', 'Active extensions: ')}{(d.extensions as string[]).join(' · ')}
            </p>
          )}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">{d.disclaimer}</p>
        </CardShell>
      );
    }

    case 'claim_start': {
      const ok = d.eligible === true;
      return (
        <CardShell title={t('Siapkan klaim', 'Prepare a claim')}>
          <p className="text-[0.68rem] font-bold text-slate-800 dark:text-slate-100">{d.peril_label}</p>
          {!ok && (
            <p className="text-[0.66rem] text-amber-600 dark:text-amber-400 leading-snug">
              {d.period_warning || d.coverage_reason}
            </p>
          )}
          <Row label={t('Polis', 'Policy')} value={d.policy?.policy_number || d.policy?.order_number || '—'} />
          {d.own_risk ? <Row label={t('Risiko sendiri', 'Own risk')} value={rp(d.own_risk)} /> : null}
          <div className="pt-0.5">
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500 mb-1">{t('Siapkan dokumen', 'Documents needed')}</p>
            <ul className="space-y-0.5">
              {((d.documents ?? []) as string[]).map((doc, i) => (
                <li key={i} className="text-[0.65rem] text-slate-600 dark:text-slate-300 leading-snug flex gap-1.5">
                  <span className="text-emerald-500">•</span><span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => requestClaimStart(d.prefill)}
            className="w-full mt-1 py-2.5 rounded-xl text-[0.68rem] font-black uppercase tracking-widest text-white active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
          >
            {t('Buka formulir klaim', 'Open claim form')}
          </button>
          <p className="text-[0.55rem] text-slate-400 leading-snug">
            {t('Klaim belum dikirim. Kamu yang menekan kirim setelah foto diunggah.',
               'The claim is not submitted yet. You send it after uploading photos.')}
          </p>
        </CardShell>
      );
    }

    case 'claim_status': {
      const list = (d.claims ?? []) as any[];
      if (list.length === 0) {
        return <CardShell title={t('Klaim', 'Claims')}><p className="text-[0.68rem] text-slate-500">{t('Belum ada klaim.', 'No claims yet.')}</p></CardShell>;
      }
      return (
        <CardShell title={t('Status klaim', 'Claim status')}>
          {list.map((c, i) => (
            <div key={c.claim_number ?? i} className="pb-1.5 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] font-black text-slate-800 dark:text-slate-100">{c.claim_number}</span>
                <Pill value={c.status} />
              </div>
              <p className="text-[0.65rem] text-slate-600 dark:text-slate-300 leading-snug">{c.stage}</p>
              <p className="text-[0.62rem] text-emerald-700 dark:text-emerald-400 leading-snug">{c.next_step}</p>
              {((c.missing ?? []) as string[]).map((m, j) => (
                <p key={j} className="text-[0.6rem] text-amber-600 dark:text-amber-400 leading-snug">⚠ {m}</p>
              ))}
            </div>
          ))}
        </CardShell>
      );
    }

    case 'renewals': {
      const list = (d.renewals ?? []) as any[];
      if (list.length === 0) {
        return <CardShell title={t('Perpanjangan', 'Renewals')}><p className="text-[0.68rem] text-slate-500">{t('Tidak ada polis yang segera jatuh tempo.', 'No policies due soon.')}</p></CardShell>;
      }
      return (
        <CardShell title={t('Akan jatuh tempo', 'Coming up for renewal')}>
          {list.map((r, i) => (
            <div key={r.order_number ?? i} className="pb-1.5 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] font-black text-slate-800 dark:text-slate-100 truncate">{r.client_name || r.product}</span>
                <span className={`text-[0.6rem] font-black ${Number(r.days_left) <= 14 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {r.days_left} {t('hari', 'days')}
                </span>
              </div>
              <p className="text-[0.62rem] text-slate-500">{shortDate(r.end_date)} · {r.coverage_type}</p>
              {r.renewal_estimate != null && (
                <Row label={t('Estimasi perpanjangan', 'Renewal estimate')} value={rp(r.renewal_estimate)} />
              )}
            </div>
          ))}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">{d.disclaimer}</p>
        </CardShell>
      );
    }

    case 'policy_explainer': {
      const covered = (d.covered ?? []) as string[];
      const not = (d.not_covered ?? []) as string[];
      return (
        <CardShell title={t('Isi polis kamu', 'What your policy covers')}>
          <Row label={t('Polis', 'Policy')} value={d.policy?.policy_number || d.policy?.order_number || '—'} />
          <Row label={t('Jenis', 'Type')} value={d.policy?.coverage_type} />
          <Row label={t('Berlaku sampai', 'Valid until')} value={shortDate(d.policy?.end_date)} />
          <div className="pt-0.5">
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-emerald-600 mb-0.5">{t('Ditanggung', 'Covered')}</p>
            {covered.map((c, i) => <p key={i} className="text-[0.63rem] text-slate-600 dark:text-slate-300 leading-snug">✓ {c}</p>)}
          </div>
          <div className="pt-0.5">
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-rose-600 mb-0.5">{t('Tidak ditanggung', 'Not covered')}</p>
            {not.map((c, i) => <p key={i} className="text-[0.63rem] text-slate-500 dark:text-slate-400 leading-snug">✕ {c}</p>)}
          </div>
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">{d.own_risk_note}</p>
        </CardShell>
      );
    }

    case 'payment_help': {
      const list = (d.pending ?? []) as any[];
      if (list.length === 0) {
        return <CardShell title={t('Tagihan', 'Payments')}><p className="text-[0.68rem] text-slate-500">{t('Tidak ada tagihan tertunda.', 'Nothing outstanding.')}</p></CardShell>;
      }
      return (
        <CardShell title={t('Menunggu pembayaran', 'Awaiting payment')}>
          {list.map((o, i) => (
            <div key={o.order_number ?? i} className="pb-1.5 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] font-black text-slate-800 dark:text-slate-100 truncate">{o.order_number}</span>
                <span className="text-[0.68rem] font-black text-emerald-700 dark:text-emerald-300">{rp(o.amount)}</span>
              </div>
              <p className="text-[0.62rem] text-slate-500">{o.product}</p>
              {o.invoice_url ? (
                <a href={o.invoice_url} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-1 px-3 py-1.5 rounded-lg text-[0.62rem] font-black uppercase tracking-wider text-white"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                  {t('Bayar sekarang', 'Pay now')}
                </a>
              ) : (
                <p className="text-[0.6rem] text-amber-600 dark:text-amber-400 leading-snug">{o.hint}</p>
              )}
            </div>
          ))}
        </CardShell>
      );
    }

    case 'pipeline': {
      const quotes = (d.expiring_quotes ?? []) as any[];
      const stalled = (d.stalled_orders ?? []) as any[];
      return (
        <CardShell title={t('Tindak lanjut hari ini', 'Follow up today')}>
          {quotes.length === 0 && stalled.length === 0 && (
            <p className="text-[0.68rem] text-slate-500">{t('Tidak ada yang mendesak. Rapi 👌', 'Nothing urgent. All clear 👌')}</p>
          )}
          {quotes.length > 0 && (
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-amber-600 mb-0.5">{t('Penawaran hampir kedaluwarsa', 'Quotes expiring')}</p>
              {quotes.map((q, i) => (
                <div key={q.id ?? i} className="flex items-center justify-between gap-2 text-[0.65rem]">
                  <span className="text-slate-700 dark:text-slate-200 truncate">{q.client_name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 shrink-0">{rp(q.premium_estimate)} · {q.days_left}h</span>
                </div>
              ))}
            </div>
          )}
          {stalled.length > 0 && (
            <div className="pt-0.5">
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-rose-600 mb-0.5">{t('Menunggu pembayaran', 'Awaiting payment')}</p>
              {stalled.map((o, i) => (
                <div key={o.order_number ?? i} className="flex items-center justify-between gap-2 text-[0.65rem]">
                  <span className="text-slate-700 dark:text-slate-200 truncate">{o.client_name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 shrink-0">{rp(o.total_premium)} · {o.days_waiting}h</span>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      );
    }

    case 'commission_forecast':
      return (
        <CardShell title={t('Komisi', 'Commission')}>
          <Row label={t('Saldo dompet', 'Wallet balance')} value={rp(d.wallet_balance)} />
          <Row label={t('Komisi tertunda', 'Pending commission')} value={rp(d.commission_pending)} />
          <Row label={t('Sudah dibayar', 'Paid out')} value={rp(d.commission_paid)} />
          <Row label={t('Pengajuan berjalan', 'In-flight orders')} value={d.inflight_orders} />
          <Row label={t('Perkiraan dari yang berjalan', 'Expected from in-flight')} value={rp(d.expected_from_inflight)} />
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">{d.disclaimer}</p>
        </CardShell>
      );

    case 'followup_draft':
      return <FollowupCard data={d} en={en} />;

    default:
      return null;
  }
};

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  cards?: PathyCard[];
  /** Answered from the knowledge base only — Pathy could not reach the user's data. */
  degraded?: boolean;
}

interface PathyChatProps {
  lang: Lang;
  currentUser?: { name?: string; id?: string; role?: string };
}

const PathyChat: React.FC<PathyChatProps> = ({ lang, currentUser }) => {
  const en = isEN(lang);
  const isAgent = AGENT_ROLES.has(String(currentUser?.role ?? '').toUpperCase());
  const quickReplies = QUICK_REPLIES.filter(qr => !qr.agentOnly || isAgent);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Documents attached to the NEXT message. OCR runs here, not in the agent —
  // the browser already owns stnk-ocr, the KTP reader and the vehicle price
  // database, so only extracted fields travel to the server.
  const [pendingDocs, setPendingDocs] = useState<PathyDocument[]>([]);
  const [scanning, setScanning] = useState<'STNK' | 'KTP' | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const stnkFileRef = useRef<HTMLInputElement>(null);
  const ktpFileRef = useRef<HTMLInputElement>(null);
  const msgIdRef = useRef(0);
  // Read inside `ask` so the callback never closes over a stale transcript and
  // never needs `messages` in its dependency list (which would re-create it on
  // every keystroke-driven render).
  const messagesRef = useRef<Message[]>([]);
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { ensurePathyChatKeyframes(); }, []);

  // Stable across renders so the `ask` callback below is not rebuilt on every keystroke.
  const t = useCallback((idText: string, enText: string) => (en ? enText : idText), [en]);

  const greeting = currentUser?.name
    ? t(
        `Halo, ${currentUser.name}! Aku Pathy, asisten AI SurePath. Ketik pertanyaanmu atau pilih topik di bawah.`,
        `Hi, ${currentUser.name}! I'm Pathy, SurePath's AI assistant. Type a question or pick a topic below.`,
      )
    : t(
        'Halo! Aku Pathy, asisten SurePath. Ada yang bisa kubantu? Pilih salah satu di bawah ya.',
        "Hi! I'm Pathy, your SurePath assistant. How can I help? Pick one of the options below.",
      );

  useEffect(() => {
    if (open && messages.length === 0) {
      msgIdRef.current += 1;
      setMessages([{ id: msgIdRef.current, from: 'bot', text: greeting }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesRef.current = messages;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const pushMessage = useCallback((
    from: 'bot' | 'user',
    text: string,
    extra?: { cards?: PathyCard[]; degraded?: boolean },
  ) => {
    msgIdRef.current += 1;
    const id = msgIdRef.current;
    setMessages(prev => [...prev, { id, from, text, ...extra }]);
  }, []);

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  const attachDocument = useCallback(async (kind: 'STNK' | 'KTP', file: File) => {
    setScanning(kind);
    setScanError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);

      if (kind === 'KTP') {
        const res = await extractKtpOcr(dataUrl);
        if (res.status === 'UNCLEAR') {
          setScanError(res.notes ?? t('KTP belum terbaca. Coba foto ulang.', 'Could not read the ID. Try another photo.'));
          return;
        }
        setPendingDocs(prev => [
          ...prev.filter(d => d.type !== 'KTP'),
          { type: 'KTP', fields: { name: res.name, nik: res.nik, address: res.address }, confidence: res.ok ? 1 : 0.6 },
        ]);
        return;
      }

      const res = await extractStnkOcr(dataUrl);
      if (res.status === 'UNCLEAR' && !res.plate && !res.brand) {
        setScanError(t('STNK belum terbaca. Pastikan seluruh dokumen masuk frame.', 'Could not read the registration. Fit the whole document in frame.'));
        return;
      }
      // Resolve the market value here — the price database is a client asset and
      // is far too large to ship into an edge function.
      let marketValue: number | null = null;
      if (res.brand && res.model && res.year) {
        marketValue = getMarketValueForYear(res.brand, res.model, res.year)
          ?? getMarketValueForMotoYear(res.brand, res.model, res.year);
      }
      setPendingDocs(prev => [
        ...prev.filter(d => d.type !== 'STNK'),
        {
          type: 'STNK',
          confidence: res.confidence,
          fields: {
            plate: res.plate, brand: res.brand, model: res.model, variant: res.variant,
            year: res.year, vin: res.vin, engine_no: res.engineNo, color: res.color,
            owner_name: res.ownerName, province: res.region, zone: res.zone,
            market_value: marketValue,
          },
        },
      ]);
    } catch (e) {
      console.error('Pathy attachment:', e);
      setScanError(t('Gagal membaca dokumen. Coba lagi ya.', 'Could not read the document. Please try again.'));
    } finally {
      setScanning(null);
    }
  }, [t]);

  // Shared by the composer and the quick-action chips so a chip answer is the
  // real, data-backed one rather than a canned paragraph.
  const ask = useCallback(async (msg: string) => {
    if (!msg || loadingRef.current) return;
    loadingRef.current = true;
    pushMessage('user', msg);
    setLoading(true);
    try {
      const history = messagesRef.current
        .filter(m => !m.degraded || m.from === 'user')
        .slice(-8)
        .map(m => ({
          role: (m.from === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        }));
      const docs = pendingDocs;
      setPendingDocs([]);
      const res = await pathyChat(msg, history, docs);
      pushMessage('bot', res.reply, { cards: res.cards, degraded: res.degraded });
    } catch (e: any) {
      // FIX: every failure used to collapse into "Pathy AI is coming soon",
      // which hid expired sessions, rate limits and outages alike.
      const code = e instanceof PathyError ? e.code : 'UNAVAILABLE';
      const text =
        code === 'AUTH'
          ? t('Sesi kamu sudah berakhir. Login ulang dulu ya, biar aku bisa lihat data polismu.',
              'Your session has expired. Please log in again so I can see your policy data.')
        : code === 'RATE_LIMIT'
          ? t('Kita sudah ngobrol banyak jam ini 😅 Coba lagi sebentar lagi ya.',
              "We have chatted a lot this hour 😅 Please try again a little later.")
        : code === 'NOT_CONFIGURED'
          ? t('Layanan AI Pathy belum aktif di lingkungan ini. Sementara ini hubungi agen lewat WhatsApp ya.',
              'Pathy AI is not enabled in this environment yet. Please reach an agent on WhatsApp for now.')
          : t('Maaf, aku lagi ada gangguan. Coba lagi sebentar lagi ya 🙏',
              'Sorry, I am having trouble right now. Please try again shortly 🙏');
      pushMessage('bot', text);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [pushMessage, t, pendingDocs]);

  // ── Voice input. The transcript lands in the box, not straight into a send:
  // dictation misreads names and plate numbers, and the user must be able to
  // fix it before Pathy acts on it.
  const [listening, setListening] = useState(false);
  const dictationRef = useRef<DictationHandle | null>(null);
  /** Whatever was already typed when the mic opened — dictation appends to it. */
  const dictationBaseRef = useRef('');
  const speechOk = useRef(isSpeechSupported()).current;

  useEffect(() => () => { dictationRef.current?.stop(); }, []);

  const toggleDictation = useCallback(() => {
    if (listening) { dictationRef.current?.stop(); return; }
    setScanError(null);
    dictationBaseRef.current = input.trim() ? `${input.trim()} ` : '';
    const join = (text: string) => `${dictationBaseRef.current}${text}`;
    const handle = startDictation({
      lang: en ? 'en-US' : 'id-ID',
      onPartial: text => setInput(join(text)),
      onFinal: text => { if (text) setInput(join(text)); },
      onError: msg => setScanError(msg),
      onEnd: () => { setListening(false); dictationRef.current = null; },
    });
    if (!handle) { setScanError(t('Mikrofon belum didukung browser ini.', 'This browser has no microphone input.')); return; }
    dictationRef.current = handle;
    setListening(true);
  }, [listening, en, input, t]);

  const handleSend = useCallback(() => {
    // An attachment on its own is a complete request — nobody should have to
    // type a sentence to explain a photo of their own STNK.
    const msg = input.trim() || (
      pendingDocs.some(d => d.type === 'STNK')
        ? t('Tolong buatkan penawaran dari dokumen ini, beberapa opsi ya.', 'Please build me a few quote options from this document.')
        : t('Tolong baca dokumen ini.', 'Please read this document.')
    );
    if (!input.trim() && pendingDocs.length === 0) return;
    setInput('');
    void ask(msg);
  }, [input, ask, pendingDocs, t]);

  const handleQuick = useCallback((qr: QuickReply) => {
    if (qr.action === 'whatsapp') {
      pushMessage('user', en ? qr.chipEn : qr.chipId);
      const answer = (en ? qr.answerEn : qr.answerId) ?? '';
      window.setTimeout(() => {
        if (answer) pushMessage('bot', answer);
        const text = encodeURIComponent(
          en ? 'Hi SurePath, I need help with insurance.' : 'Halo SurePath, saya butuh bantuan soal asuransi.',
        );
        window.open(`https://wa.me/${SUREPATH_WHATSAPP}?text=${text}`, '_blank', 'noopener,noreferrer');
      }, 350);
      return;
    }
    void ask((en ? qr.promptEn : qr.promptId) ?? (en ? qr.chipEn : qr.chipId));
  }, [en, ask, pushMessage]);

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Floating action button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('Buka asisten Pathy', 'Open Pathy assistant')}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-28 right-4 z-[60] w-16 h-16 rounded-full bg-white dark:bg-slate-900 shadow-[0_12px_32px_-8px_rgba(16,157,87,0.6)] ring-2 ring-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50"
      >
        <span data-pathychat-anim>
          <PathyFace size={40} />
        </span>
        {!open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse motion-reduce:animate-none" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={t('Asisten Pathy', 'Pathy assistant')}
          data-pathychat-anim
          className="fixed bottom-48 right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)]"
          style={{ animation: 'pathychat-pop 0.28s cubic-bezier(.22,1,.36,1)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex-shrink-0">
            <span data-pathychat-anim className="flex-shrink-0">
              <PathyFace size={34} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black tracking-tight leading-none">Pathy</p>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest opacity-90 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse motion-reduce:animate-none" />
                {t('AI Asisten · SurePath', 'AI Assistant · SurePath')}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('Tutup', 'Close')}
              onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-90 transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* AI disclaimer banner */}
          <div className="flex-shrink-0 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-700/30">
            <p className="text-[0.58rem] text-amber-700 dark:text-amber-400 font-medium leading-snug text-center">
              {t(
                'Pathy bisa melihat polis & klaim kamu dan membuat draf penawaran — tidak bisa mengubah polis, klaim, atau dana.',
                'Pathy can read your policies & claims and draft a quote — it cannot change policies, claims, or money.',
              )}
            </p>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#fafaf9] dark:bg-[#0a0a0a]">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${m.from === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={`px-3.5 py-2.5 text-xs font-medium leading-relaxed rounded-2xl whitespace-pre-wrap ${
                      m.from === 'user'
                        ? 'bg-emerald-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md border border-slate-100 dark:border-white/5 shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.cards?.map((card, i) => (
                    <PathyCardView key={`${m.id}-${i}`} card={card} en={en} isAgent={isAgent} />
                  ))}
                  {m.degraded && (
                    <p className="mt-1 px-1 text-[0.55rem] text-amber-600 dark:text-amber-400 leading-snug">
                      {t(
                        'Jawaban umum — aku belum bisa membaca data akunmu saat ini.',
                        'General answer — I could not read your account data just now.',
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                      style={{ animation: `pathy-typing 1.2s ease-in-out ${delay}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer — attachments first: a photo is the input format
              everyone can produce, and it is what the proposal flow runs on. */}
          <div className="flex-shrink-0 px-3 pt-2 pb-1 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900">
            <input
              ref={stnkFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void attachDocument('STNK', f); }}
            />
            <input
              ref={ktpFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void attachDocument('KTP', f); }}
            />

            {(pendingDocs.length > 0 || scanning || scanError) && (
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {pendingDocs.map(doc => (
                  <span key={doc.type} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
                    <span className="text-[0.6rem] font-black text-emerald-700 dark:text-emerald-300">{doc.type} {t('terbaca', 'read')}</span>
                    <button
                      type="button"
                      aria-label={t(`Hapus ${doc.type}`, `Remove ${doc.type}`)}
                      onClick={() => setPendingDocs(prev => prev.filter(x => x.type !== doc.type))}
                      className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"
                    >
                      <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </span>
                ))}
                {scanning && (
                  <span className="text-[0.6rem] font-bold text-slate-500 dark:text-slate-400">
                    {t(`Membaca ${scanning}…`, `Reading ${scanning}…`)}
                  </span>
                )}
                {scanError && <span className="text-[0.6rem] font-medium text-amber-600 dark:text-amber-400">{scanError}</span>}
              </div>
            )}

            <div className="flex items-center gap-1.5 pb-2">
              <button
                type="button"
                onClick={() => stnkFileRef.current?.click()}
                disabled={!!scanning}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[0.62rem] font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition-transform disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                {t('Foto STNK', 'STNK photo')}
              </button>
              <button
                type="button"
                onClick={() => ktpFileRef.current?.click()}
                disabled={!!scanning}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[0.62rem] font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition-transform disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8.5" cy="11" r="2.2" /><path d="M14 10h4M14 14h4M5 16.5c.7-1.4 2-2.1 3.5-2.1s2.8.7 3.5 2.1" /></svg>
                {t('Foto KTP', 'ID photo')}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 py-2 ring-1 ring-slate-200 dark:ring-white/10 focus-within:ring-emerald-500/50">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleInputKey}
                disabled={loading}
                placeholder={t('Tanya Pathy…', 'Ask Pathy…')}
                className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none disabled:opacity-50"
              />
              {speechOk && (
                <button
                  type="button"
                  onClick={toggleDictation}
                  disabled={loading}
                  aria-label={listening ? t('Berhenti merekam', 'Stop recording') : t('Bicara', 'Speak')}
                  aria-pressed={listening}
                  className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 flex-shrink-0 ${
                    listening ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}
                  style={listening ? { animation: 'pathy-mic 1.1s ease-in-out infinite' } : undefined}
                >
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && pendingDocs.length === 0) || loading}
                className="w-7 h-7 rounded-full bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 flex items-center justify-center active:scale-90 transition-all duration-150 flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick reply chips */}
          <div className="flex-shrink-0 px-3 pt-1 pb-3 bg-white dark:bg-slate-900">
            <p className="text-[0.55rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">
              {t('Pilihan Cepat', 'Quick Actions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map(qr => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => handleQuick(qr)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-full text-[0.68rem] font-bold transition-all duration-200 motion-reduce:transition-none active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                    qr.action === 'whatsapp'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-600'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/15'
                  }`}
                >
                  {en ? qr.chipEn : qr.chipId}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PathyChat;
