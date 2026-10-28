import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../../types';
import { pathyChat, PathyError } from '../../services/supabaseService';
import type { PathyCard, PathyDocument } from '../../services/supabaseService';
import { getAgentOrders, getCustomerOrders, getLeaderboard } from '../../services/supabaseService';
import { SUREPATH_WHATSAPP } from '../../constants';
import { extractDocumentOcr, type DocKind } from '../../services/docOcr';
import { requestClaimStart } from '../../services/claimHandoff';
import {
  isSpeechSupported, startDictation, type DictationHandle,
  isTtsSupported, speakAnswer, stopSpeaking,
} from '../../services/speech';

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
  action?: 'whatsapp' | 'flow';
  /** v2.7.11: taps are role-shaped, not one pile for everybody. */
  agentOnly?: boolean; customerOnly?: boolean;
}

// v2.7.11 — the taps rebuilt. The old list mixed agent and customer intents in
// one pile and led with reading, not acting. Now each side gets the three
// actions that pay for themselves — the greet card and the footer chips render
// the same set, so "what can Pathy do for me" costs one glance.
const CUSTOMER_TAPS: QuickReply[] = [
  {
    id: 'status',
    chipEn: 'Status polis', chipId: 'Status polis',
    promptEn: 'Show my policies and their current status.',
    promptId: 'Tampilkan polis saya beserta statusnya saat ini.',
  },
  {
    id: 'pay',
    chipEn: 'How to pay', chipId: 'Cara bayar',
    promptEn: 'How do I pay for my policy invoice?',
    promptId: 'Bagaimana cara membayar tagihan polisku?',
  },
  {
    id: 'claim',
    chipEn: 'File a claim', chipId: 'Ajukan klaim',
    promptEn: 'I want to file a claim — help me prepare the form.',
    promptId: 'Aku mau mengajukan klaim, siapkan formulirnya.',
  },
  {
    id: 'whatsapp',
    chipEn: 'Chat WhatsApp agent', chipId: 'Chat WhatsApp agen',
    answerEn: 'Opening WhatsApp so you can chat with a SurePath agent...',
    answerId: 'Membuka WhatsApp agar kamu bisa mengobrol dengan agen SurePath...',
    action: 'whatsapp', customerOnly: true,
  },
];

const AGENT_TAPS: QuickReply[] = [
  {
    id: 'quote3',
    chipEn: 'Quick quote', chipId: 'Buat kutipan',
    // The 3-tap quotation: product → STNK photo → package. Built by the
    // client-side flow, using tools that already run (OCR + compare_offers).
    action: 'flow',
  },
  {
    id: 'followup',
    chipEn: 'Draft a WhatsApp reply', chipId: 'Tulis balasan',
    promptEn: 'Draft a WhatsApp follow-up message for a client who has not been followed up yet.',
    promptId: 'Buatkan draf pesan WhatsApp follow-up untuk nasabah yang belum di-follow-up.',
  },
  {
    id: 'commission',
    chipEn: 'My commission', chipId: 'Cek komisi',
    promptEn: 'Show my commission forecast and wallet balance.',
    promptId: 'Tampilkan perkiraan komisi dan saldo dompetku.',
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

/**
 * Pathy answers cover questions with an INDICATION, never a decision — the
 * insurer decides liability after survey. The card says so in as many words,
 * because a green "Covered" tick reads as a promise no matter what the prose
 * underneath it says.
 */
type Indication = 'LIKELY_COVERED' | 'LIKELY_NOT_COVERED' | 'NEEDS_REVIEW';

const INDICATION_TONE: Record<Indication, { bg: string; text: string; icon: string; glyph: string }> = {
  LIKELY_COVERED: {
    bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-ds-green', glyph: '≈',
  },
  LIKELY_NOT_COVERED: {
    bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300',
    icon: 'text-rose-600', glyph: '≉',
  },
  NEEDS_REVIEW: {
    bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-ds-amber', glyph: '?',
  },
};

const indicationLabel = (ind: Indication, en: boolean) =>
  ind === 'LIKELY_COVERED'
    ? (en ? 'Indication: likely covered' : 'Indikasi: kemungkinan besar dijamin')
    : ind === 'LIKELY_NOT_COVERED'
      ? (en ? 'Indication: likely not covered' : 'Indikasi: kemungkinan besar tidak dijamin')
      : (en ? 'Indication: insurer review needed' : 'Indikasi: perlu ditinjau insurer');

/** Reads the v2.5.0 field, falling back to the old boolean on an older function. */
const indicationOf = (d: any, legacy?: boolean): Indication => {
  const v = String(d?.indication ?? '').toUpperCase();
  if (v === 'LIKELY_COVERED' || v === 'LIKELY_NOT_COVERED' || v === 'NEEDS_REVIEW') return v;
  return (legacy ?? d?.covered) === true ? 'LIKELY_COVERED' : 'LIKELY_NOT_COVERED';
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
      <p className="text-[0.62rem] font-bold text-emerald-600 dark:text-emerald-400" data-pathychat-anim style={{ animation: 'pathychat-pop 0.4s ease-out' }}>
        {t('🎉 Kutipan jadi — siap kirim!', '🎉 Quotation ready — ready to send!')}
      </p>
      <Row label={t('Nomor', 'Number')} value={data.quotationNumber} />
      <Row label={t('Untuk', 'For')} value={data.clientName} />
      <Row label={t('Kendaraan', 'Vehicle')} value={[data.vehicle, data.plate].filter(Boolean).join(' · ')} />
      <Row label={t('Paket', 'Package')} value={data.optionLabel} />
      <Row label={t('Pertanggungan', 'Sum insured')} value={rp(data.sumInsured)} />
      <div className="pt-1.5 border-t border-slate-100 dark:border-white/10">
        <Row
          label={<span className="font-black">{t('Total premi', 'Total premium')}</span>}
          value={<span className="text-ds-green dark:text-emerald-400">{rp(data.totalPremium)}</span>}
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
      {/* v2.7.11 — share the offer straight to WhatsApp: the owner-approved
          safest path. Text-first wa.me link works before AND after the PDF is
          downloaded; the OS share sheet on the follow-up card covers apps
          beyond WhatsApp. */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(
          `${t('Halo! Berikut penawaran', 'Hi! Here is the offer for')} ${data?.clientName ?? ''}: ${[data?.vehicle, data?.plate].filter(Boolean).join(' ')} — ${rp(data?.totalPremium)} (${data?.optionLabel}). ${t('PDF-nya bisa kusertakan juga, mau lanjut buat polisnya?', 'I can also send the PDF — ready to proceed with the policy?')} SurePath 🚗`,
        )}`}
        target="_blank" rel="noopener noreferrer"
        className="w-full py-2 rounded-xl text-center text-[0.66rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 active:scale-[0.98] transition-transform"
      >
        {t('Bagikan penawaran ke WhatsApp', 'Share offer to WhatsApp')}
      </a>
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
  const [shared, setShared] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the text is on screen and selectable */ }
  };

  /**
   * v2.7.11 — the OS share sheet, Web Share API. The user picks the app
   * (WhatsApp, Telegram, …) themselves. When the device has no share sheet
   * (desktop) the button degrades to the wa.me link below, which is why both
   * stay on the card: two ways to the same harmless action, nothing is ever
   * sent on the agent's behalf by either path.
   */
  const shareOs = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'SurePath', text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // user dismissed the sheet
        // fall through to copy — the draft must still move somehow
      }
    }
    await copy();
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
        <button onClick={shareOs}
          className="flex-1 py-2 rounded-xl text-[0.62rem] font-black uppercase tracking-wider text-white text-center active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
          aria-label={t('Bagikan pesan', 'Share message')}>
          {shared ? t('Terbagikan', 'Shared') : t('Bagikan', 'Share')}
        </button>
        <button onClick={copy}
          className="flex-1 py-2 rounded-xl text-[0.62rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 active:scale-[0.98] transition-transform">
          {copied ? t('Tersalin', 'Copied') : t('Salin', 'Copy')}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 rounded-xl text-[0.62rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-center active:scale-[0.98] transition-transform"
        >
          WhatsApp
        </a>
      </div>
      <p className="text-[0.55rem] text-slate-400 leading-snug">
        {t('Pathy tidak mengirim pesan. Kamu yang memilih penerima dan menekan kirim.',
           'Pathy does not send messages. You pick the recipient and hit send.')}
      </p>
    </CardShell>
  );
};

const PathyCardView: React.FC<{
  card: PathyCard; en: boolean; isAgent: boolean;
  /** v2.7.11 — client-assembled cards act through these callbacks; server
   *  cards ignore them, which keeps the trust split legible: data from the
   *  agent, buttons from us. */
  onAsk?: (msg: string) => void;
  onFlow?: (action: string, value?: string) => void;
  onCamera?: () => void;
}> = ({ card, en, isAgent, onAsk, onFlow, onCamera }) => {
  const t = (id: string, e: string) => (en ? e : id);
  const d = card.data ?? {};

  switch (card.type) {
    // ── v2.7.11 — kartu yang dirakit client (P0/P1/P3/P4, tanpa AI) ──
    case 'greet': {
      const openTap = (id: string) => {
        const qr = (isAgent ? AGENT_TAPS : CUSTOMER_TAPS).find(x => x.id === id);
        if (!qr) return;
        if (qr.action === 'flow') { onFlow?.('start-quote'); return; }
        onAsk?.((en ? qr.promptEn : qr.promptId) ?? (en ? qr.chipEn : qr.chipId));
      };
      const taps = isAgent
        ? [{ id: 'quote3', label: t('Buat kutipan', 'Quick quote') },
           { id: 'followup', label: t('Tulis balasan', 'Draft a WhatsApp reply') },
           { id: 'commission', label: t('Cek komisi', 'My commission') }]
        : [{ id: 'status', label: t('Status polis', 'Policy status') },
           { id: 'pay', label: t('Cara bayar', 'How to pay') },
           { id: 'claim', label: t('Ajukan klaim', 'File a claim') }];
      return (
        <CardShell title={t('Mau mulai dari mana?', 'Where shall we start?')}>
          <div className="grid gap-2">
            {taps.map(tap => (
              <button key={tap.id} type="button" onClick={() => openTap(tap.id)}
                className="w-full py-2.5 px-3 rounded-xl text-left text-[0.7rem] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 active:scale-[0.98] transition-transform">
                {tap.label}
              </button>
            ))}
          </div>
          <p className="text-[0.55rem] text-slate-400">
            {t('Satu ketukan = satu aksi nyata.', 'One tap = one real action.')}
          </p>
        </CardShell>
      );
    }
    case 'quote_flow': {
      if (d.step === 'product') {
        return (
          <CardShell title={t('Kutipan 3 ketukan', '3-tap quotation')}>
            <p className="text-[0.62rem] text-slate-500 dark:text-slate-400">
              {t('Produk apa yang mau dikutip?', 'Which product shall we quote?')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onFlow?.('product', 'CAR')}
                className="py-2.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 active:scale-[0.98] transition-transform">
                🚗 {t('Mobil', 'Car')}
              </button>
              <button type="button" onClick={() => onFlow?.('product', 'MOTOR')}
                className="py-2.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 active:scale-[0.98] transition-transform">
                🏍️ {t('Motor', 'Motorbike')}
              </button>
            </div>
            <p className="text-[0.55rem] text-slate-400">
              {t('Lalu cukup foto STNK — angkanya aku hitung dari data pasar.', 'Then just photograph the registration — I do the math from market data.')}
            </p>
          </CardShell>
        );
      }
      return (
        <CardShell title={t('Ketuk 2: foto STNK', 'Tap 2: photograph the registration')}>
          <p className="text-[0.62rem] text-slate-500 dark:text-slate-400 leading-snug">
            {t('Seluruh kartu STNK masuk frame, cahaya cukup — hasil bacaannya akan kutinggalkan di chip di bawah untuk kamu periksa.', 'Fit the whole card in frame with good light — the read lands in a chip below for you to check.')}
          </p>
          <button type="button" onClick={() => onCamera?.()}
            className="w-full py-2.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wide bg-emerald-500 text-white active:scale-[0.98] transition-transform">
            📷 {t('Buka kamera', 'Open camera')}
          </button>
        </CardShell>
      );
    }
    case 'briefing': {
      const rank = Math.max(0, Number(d.rank) || 0);
      const total = Math.max(0, Number(d.totalAgents) || 0);
      return (
        <CardShell title={t('Briefing pagi', 'Morning briefing')}>
          <Row
            label={t('Pipeline menunggu tindak lanjut', 'Pipeline awaiting follow-up')}
            value={<span className="text-ds-green dark:text-emerald-400">{String(d.pending ?? 0)}</span>}
          />
          {rank > 0 && total > 0 && (
            <Row label={t('Peringkat kamu bulan ini', 'Your rank this month')} value={`#${rank} ${t('dari', 'of')} ${total}`} />
          )}
          <button type="button"
            onClick={() => onAsk?.(
              t('Tampilkan pipeline yang belum di-follow-up dan draf balasannya.', 'Show the pipeline awaiting follow-up and draft replies for it.'),
            )}
            className="w-full py-2 rounded-xl text-[0.66rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20 active:scale-[0.98] transition-transform">
            {t('Bantu saya follow-up sekarang', 'Help me follow up now')}
          </button>
          <p className="text-[0.55rem] text-slate-400 leading-snug">
            {t('Dibangun dari datamu sendiri — angka uang tetap aman di halaman Ledger.',
               'Built from your own data — money figures stay safe on the Ledger page.')}
          </p>
        </CardShell>
      );
    }
    case 'resume_prompt':
      return (
        <CardShell title={t('Lanjutkan percakapan terakhir?', 'Resume your last conversation?')}>
          <p className="text-[0.62rem] text-slate-500 dark:text-slate-400">
            {t('Kamu terakhir kirim pesan', 'You last messaged')} {d?.when ?? '—'}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onFlow?.('resume')}
              className="py-2 rounded-xl text-[0.66rem] font-black uppercase tracking-wider text-white bg-emerald-500 active:scale-[0.98] transition-transform">
              {t('Lanjutkan', 'Resume')}
            </button>
            <button type="button" onClick={() => onFlow?.('fresh')}
              className="py-2 rounded-xl text-[0.66rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 active:scale-[0.98] transition-transform">
              {t('Mulai baru', 'Start fresh')}
            </button>
          </div>
        </CardShell>
      );
    case 'renewal_care': {
      const rows = (Array.isArray(d.rows) ? d.rows : []) as any[];
      return (
        <CardShell title={t('Sekadar perhatian', 'Just checking in')}>
          <p className="text-[0.62rem] text-slate-600 dark:text-slate-300 leading-snug">
            {t('Asuransimu berikutnya akan jatuh tempo:', 'Your next insurance expiry is coming up:')}
          </p>
          {rows.map((row, idx) => (
            <Row key={idx} label={[row.label, row.plate].filter(Boolean).join(' · ')} value={shortDate(row.end_date)} />
          ))}
          <button type="button"
            onClick={() => onAsk?.(
              t('Buatkan penawaran perpanjangan untuk polis yang akan jatuh tempo ya.', 'Please prepare renewal offers for the policies about to expire.'),
            )}
            className="w-full py-2 rounded-xl text-[0.66rem] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20 active:scale-[0.98] transition-transform">
            {t('Siapkan penawaran perpanjangan', 'Prepare a renewal offer')}
          </button>
        </CardShell>
      );
    }

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
            <Row label={<span className="font-black">{t('Total estimasi', 'Estimated total')}</span>} value={<span className="text-ds-green dark:text-emerald-400">{rp(d.total)}</span>} />
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
          <Row label={t('Estimasi premi', 'Estimated premium')} value={<span className="text-ds-green dark:text-emerald-400">{rp(d.premium_estimate)}</span>} />
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
              <Row label={t('Saldo dompet', 'Wallet balance')} value={<span className="text-ds-green dark:text-emerald-400">{rp(d.wallet.balance)}</span>} />
            </div>
          )}
        </CardShell>
      );
    case 'document_read': {
      const f = (d.fields ?? {}) as Record<string, any>;
      const conf = typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : null;

      // STNK and KTP get a curated row order because those two drive the quote
      // and the insured's identity. Everything else (SIM, policy, invoice, a
      // letter) is shown as whatever the reader actually found — the point of
      // accepting any document is not knowing its shape in advance.
      const CURATED: Record<string, Array<[string, any]>> = {
        KTP: [
          [t('Nama', 'Name'), f.name],
          [t('NIK', 'ID number'), f.nik],
          [t('Alamat', 'Address'), f.address],
        ],
        STNK: [
          [t('Nomor Polisi', 'Plate'), f.plate],
          [t('Merk / Tipe', 'Make / model'), [f.brand, f.model].filter(Boolean).join(' ')],
          [t('Tahun', 'Year'), f.year],
          [t('Nomor Rangka', 'VIN'), f.vin],
          [t('Pemilik', 'Owner'), f.owner_name],
          [t('Nilai pertanggungan', 'Sum insured'), f.market_value ? rp(f.market_value) : null],
        ],
      };

      const humanKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const entries: Array<[string, any]> = CURATED[String(d.type)]
        ?? Object.entries(f).slice(0, 10).map(([k, v]) => [humanKey(k), v] as [string, any]);

      const title = d.label
        ? t(`Hasil baca ${d.label}`, `${d.label} read`)
        : t('Hasil baca dokumen', 'Document read');

      return (
        <CardShell title={title}>
          {entries.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
            <Row key={k} label={k} value={String(v)} />
          ))}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">
            {conf != null ? t(`Keyakinan ${conf}%. `, `${conf}% confident. `) : ''}
            {t('Hasil baca AI bisa keliru — ada yang salah? Ketik koreksinya, aku perbaiki.',
               'AI reading can be wrong — something off? Just type the correction.')}
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
                <span className="font-black text-[0.78rem] text-ds-green dark:text-emerald-400 tabular-nums">{rp(o.total)}</span>
              </div>
              <p className="text-[0.6rem] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{o.blurb}</p>
              <p className="text-[0.55rem] text-slate-400 mt-1">{t('Tarif', 'Rate')} {o.ratePercent}%</p>
            </div>
          ))}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">{d.disclaimer}</p>
        </CardShell>
      );
    }
    case 'document_saved': {
      const saved = (d.saved_fields ?? []) as string[];
      const skipped = (d.skipped_fields ?? []) as string[];
      const LABELS: Record<string, [string, string]> = {
        name: ['Nama', 'Name'], phone: ['Telepon', 'Phone'],
        ktp: ['NIK', 'ID number'], address: ['Alamat', 'Address'],
      };
      const pretty = (k: string) => (LABELS[k] ? t(LABELS[k][0], LABELS[k][1]) : k);
      return (
        <CardShell title={d.target === 'CLIENT' ? t('Data klien tersimpan', 'Client data saved') : t('Data profil tersimpan', 'Profile data saved')}>
          {d.client_name && <Row label={t('Klien', 'Client')} value={d.client_name} />}
          <Row label={t('Dari dokumen', 'From document')} value={d.doc_type} />
          <Row
            label={t('Tersimpan', 'Saved')}
            value={saved.length > 0 ? saved.map(pretty).join(', ') : t('tidak ada yang baru', 'nothing new')}
          />
          {skipped.length > 0 && (
            <p className="text-[0.6rem] text-slate-500 dark:text-slate-400 leading-snug">
              {t('Tidak ditimpa karena sudah terisi: ', 'Left as-is (already filled): ')}{skipped.map(pretty).join(', ')}
            </p>
          )}
          <p className="text-[0.55rem] text-slate-400 leading-snug pt-1">
            {t('Hasil OCR bisa keliru — cek lagi di menu profil kalau ada yang salah.',
               'OCR can misread — check your profile page if something looks wrong.')}
          </p>
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
      // Never a verdict. `indication` is the v2.5.0 shape; `covered` is kept
      // for the window where the web build is ahead of the deployed function.
      const ind = indicationOf(d);
      const tone = INDICATION_TONE[ind];
      return (
        <CardShell title={t('Cek jaminan', 'Coverage check')}>
          <div className={`flex items-start gap-2 px-2.5 py-2 rounded-xl ${tone.bg}`}>
            <span className={`mt-0.5 text-[0.8rem] font-black ${tone.icon}`}>{tone.glyph}</span>
            <div className="min-w-0">
              <p className={`text-[0.7rem] font-black ${tone.text}`}>
                {indicationLabel(ind, en)}
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
      const ind = indicationOf(d, d.eligible === true);
      const tone = INDICATION_TONE[ind];
      return (
        <CardShell title={t('Siapkan klaim', 'Prepare a claim')}>
          <p className="text-[0.68rem] font-bold text-slate-800 dark:text-slate-100">{d.peril_label}</p>
          <p className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[0.58rem] font-black ${tone.bg} ${tone.text}`}>
            {tone.glyph} {indicationLabel(ind, en)}
          </p>
          {(d.period_warning || (ind !== 'LIKELY_COVERED' && d.coverage_reason)) && (
            <p className="text-[0.66rem] text-ds-amber dark:text-amber-400 leading-snug">
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
                  <span className="text-ds-green">•</span><span>{doc}</span>
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
                <p key={j} className="text-[0.6rem] text-ds-amber dark:text-amber-400 leading-snug">⚠ {m}</p>
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
                <span className={`text-[0.6rem] font-black ${Number(r.days_left) <= 14 ? 'text-rose-600' : 'text-ds-amber'}`}>
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
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-ds-green mb-0.5">{t('Ditanggung', 'Covered')}</p>
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
                <p className="text-[0.6rem] text-ds-amber dark:text-amber-400 leading-snug">{o.hint}</p>
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
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-ds-amber mb-0.5">{t('Penawaran hampir kedaluwarsa', 'Quotes expiring')}</p>
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
  /** Caveat for this turn (who the real authority is). Bot messages only. */
  disclaimer?: string;
  /** Thumbnails of what the user attached, echoed in their own bubble. */
  attachments?: Array<{ id: string; label: string; preview: string }>;
}

/**
 * An attachment while it is still in the composer.
 *
 * `preview` is a local object URL and never leaves the browser — only `doc`
 * (the extracted fields) is sent to Pathy. Photographing an ID and having the
 * image itself uploaded somewhere is exactly what this design avoids.
 */
interface Attachment {
  id: string;
  doc: PathyDocument;
  preview: string;
  label: string;
}

/** Fired by a portal to open Pathy from its own chrome (e.g. the bottom-nav
 *  centre action) instead of the floating launcher. */
export const PATHY_OPEN_EVENT = 'surepath:pathy-open';

interface PathyChatProps {
  lang: Lang;
  currentUser?: { name?: string; id?: string; role?: string };
  /** Hide the floating launcher — the portal opens Pathy itself via
   *  PATHY_OPEN_EVENT, so there is only one entry point on screen. */
  hideLauncher?: boolean;
}

// ─── v2.7.11 helpers (session resume, deterministic daily cards) ─────────────

const RESUME_TEXT_MAX = 400;
const RESUME_DEPTH = 14;

/** "tadi / kemarin / <date>" style label for the resume card. */
function relativeWhen(iso: unknown, en: boolean): string {
  const d = new Date(String(iso ?? ''));
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const dayMs = 86_400_000;
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / dayMs);
  const time = d.toLocaleTimeString(en ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit' });
  if (diffDays <= 0) return en ? `earlier today ${time}` : `tadi ${time}`;
  if (diffDays === 1) return en ? `yesterday ${time}` : `kemarin pukul ${time}`;
  return d.toLocaleDateString(en ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short' });
}

interface SavedThreadMsg { r: 'b' | 'u'; k: string; }

function readThread(key: string): { at: string; msgs: SavedThreadMsg[] } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.msgs) && parsed.msgs.length > 0
      ? { at: String(parsed.at ?? ''), msgs: parsed.msgs as SavedThreadMsg[] }
      : null;
  } catch { return null; }
}

/**
 * Deterministic "one suggestion" anchor for the agent briefing (P1): which
 * order statuses still owe the agent an action. Pure read, no money — the
 * briefing never writes a money table (trust rules of pathy-agent).
 */
const PIPELINE_OPEN_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW', 'ANALYZING']);

const PathyChat: React.FC<PathyChatProps> = ({ lang, currentUser, hideLauncher = false }) => {
  const en = isEN(lang);
  const isAgent = AGENT_ROLES.has(String(currentUser?.role ?? '').toUpperCase());
  // Stable across renders so the callbacks below are not rebuilt on every keystroke.
  const t = useCallback((idText: string, enText: string) => (en ? enText : idText), [en]);
  // v2.7.11 — taps are role-shaped: the agent gets acting taps (quote, reply,
  // commission), the customer gets service taps (status, pay, claim). The greet
  // card and the footer chips render this same set.
  const quickReplies = isAgent ? AGENT_TAPS : CUSTOMER_TAPS;
  const [open, setOpen] = useState(false);

  // ── P2: TTS is off until the user says otherwise (owner decision 2.7.11) —
  // the toggle lives in the header and remembers its state per device.
  const TTS_KEY = 'sp_pathy_tts';
  const [ttsOn, setTtsOn] = useState(() => {
    try { return localStorage.getItem(TTS_KEY) === '1'; } catch { return false; }
  });
  const ttsOk = useRef(isTtsSupported()).current;
  const toggleTts = useCallback(() => {
    setTtsOn(on => {
      const next = !on;
      try { localStorage.setItem(TTS_KEY, next ? '1' : '0'); } catch { /* private mode */ }
      if (!next) stopSpeaking();
      else speakAnswer(t('Suara Pathy dinyalakan.', 'Pathy voice is on.'), en ? 'en' : 'id');
      return next;
    });
  }, [t, en]);

  // Session resume storage key, per user, on-device only.
  const threadKey = `sp_pathy_thread_${currentUser?.id || 'anon'}`;

  // Portals with Pathy in their bottom nav open the panel through this event.
  useEffect(() => {
    const openPathy = () => setOpen(true);
    window.addEventListener(PATHY_OPEN_EVENT, openPathy);
    return () => window.removeEventListener(PATHY_OPEN_EVENT, openPathy);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Documents attached to the NEXT message. OCR runs here, not in the agent —
  // the browser already owns stnk-ocr, the KTP reader and the vehicle price
  // database, so only extracted fields travel to the server.
  const [pending, setPending] = useState<Attachment[]>([]);
  const [scanning, setScanning] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  /** Gallery / files — no `capture`, so the OS offers everything the user has. */
  const uploadRef = useRef<HTMLInputElement>(null);
  /** Straight to the camera, for the "photograph it now" case. */
  const cameraRef = useRef<HTMLInputElement>(null);
  const attachIdRef = useRef(0);
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

  const greeting = currentUser?.name
    ? t(
        `Halo, ${currentUser.name}! Aku Pathy. ${isAgent ? 'Mau mulai dari mana?' : 'Ada yang bisa kubantu?'}`,
        `Hi, ${currentUser.name}! I'm Pathy. ${isAgent ? 'Where shall we start?' : 'How can I help?'}`,
      )
    : t(
        'Halo! Aku Pathy, asisten SurePath. Pilih salah satu di bawah atau ketik langsung ya.',
        "Hi! I'm Pathy, your SurePath assistant. Pick an option below or just type.",
      );

  useEffect(() => {
    if (!open || messages.length > 0) return;

    // v2.7.11 — P0 session resume: the last transcript (texts only, never
    // attachments or previews) is kept on this device. A fresh open offers it
    // back instead of pretending yesterday never happened.
    msgIdRef.current += 1;
    const base: Message[] = [{
      id: msgIdRef.current,
      from: 'bot',
      text: greeting,
      cards: [{ type: 'greet', data: {} }],
    }];
    const saved = readThread(threadKey);
    if (saved) {
      resumeSavedRef.current = saved;
      msgIdRef.current += 1;
      base.push({
        id: msgIdRef.current,
        from: 'bot',
        text: t('Kembali lagi 👋', 'Welcome back 👋'),
        cards: [{ type: 'resume_prompt', data: { when: relativeWhen(saved.at, en) } }],
      });
    }
    setMessages(base);
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
    extra?: Partial<Omit<Message, 'id' | 'from' | 'text'>>,
  ) => {
    msgIdRef.current += 1;
    const id = msgIdRef.current;
    setMessages(prev => [...prev, { id, from, text, ...extra }]);
  }, []);

  // ── v2.7.11 state machine ────────────────────────────────────────────────
  // flowRef drives the 3-tap quotation: idle → await-photo (after the product
  // tap, until an OCR'd STNK lands) → idle with an auto-sent turn. Saving the
  // transcript (text only, device-local) powers the resume prompt. askRef lets
  // early callbacks (attachment flow, hold-to-talk, local cards) reach `ask`
  // without a declaration-order tangle.
  const flowRef = useRef<'idle' | 'await-photo'>('idle');
  const cameraHintRef = useRef<DocKind | undefined>(undefined);
  const resumeSavedRef = useRef<{ at: string; msgs: SavedThreadMsg[] } | null>(null);
  const askRef = useRef<(msg: string, override?: Attachment[]) => void>(() => undefined);

  /** Persist the last texts so the next open can offer "lanjut?" (P0 item 4). */
  useEffect(() => {
    if (!messages.some(m => m.from === 'user')) return; // greet-only session is not a history
    const msgs: SavedThreadMsg[] = messages.slice(-RESUME_DEPTH).map(m => ({
      r: m.from === 'bot' ? 'b' : 'u',
      k: m.text.slice(0, RESUME_TEXT_MAX),
    }));
    try { localStorage.setItem(threadKey, JSON.stringify({ at: new Date().toISOString(), msgs })); } catch { /* quota */ }
  }, [messages, threadKey]);

  // P1 — agent briefing, once per day, deterministic: leaderboard rank + open
  // pipeline count, straight from the same gateway reads the Home screen
  // already makes. No model call, so no quota burn; and by the briefing trust
  // rule it recites counts, never a money table.
  useEffect(() => {
    if (!open || !isAgent) return;
    const key = `sp_pathy_briefing_${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { return; }
    void (async () => {
      try {
        const [leaderboard, orders] = await Promise.all([
          getLeaderboard().catch(() => [] as Array<{ agent_id: string; agent_name: string; agent_code: string; tier: string | null; total_commission: number }>),
          getAgentOrders(currentUser?.id ?? '').catch(() => [] as Array<Record<string, unknown>>),
        ]);
        const idx = leaderboard.findIndex(e => e.agent_id === currentUser?.id);
        const pending = orders.filter(o =>
          PIPELINE_OPEN_STATUSES.has(String(o?.status ?? '').toUpperCase()),
        ).length;
        if (!pending && idx === -1) return; // nothing to say — no noise
        pushMessage('bot', t('Briefing pagi — dari datamu, bukan tebakan:', 'Morning briefing — from your data, not guesswork:'), {
          cards: [{ type: 'briefing', data: { pending, rank: idx >= 0 ? idx + 1 : 0, totalAgents: leaderboard.length } }],
        });
      } catch { /* data not ready — the briefing skips, the chat keeps working */ }
    })();
  }, [open, isAgent, currentUser?.id, pushMessage, t]);  

  // P3 — customer renewal check-in, once per day: orders expiring within 14
  // days get a warm card and one CTA. Read-only; softens the renewal chase
  // instead of the panic reminder the app had no piece for before.
  useEffect(() => {
    if (!open || isAgent) return;
    const key = `sp_pathy_renewal_${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { return; }
    void (async () => {
      try {
        const orders = await getCustomerOrders(currentUser?.id ?? '').catch(() => [] as Array<Record<string, unknown>>);
        const rows = orders
          .map(o => ({ o, ts: new Date(String((o as any)?.end_date ?? '')).getTime() }))
          .filter(x => !isNaN(x.ts))
          .filter(x => {
            const diffDays = (x.ts - Date.now()) / 86_400_000;
            return diffDays >= 0 && diffDays <= 14;
          })
          .sort((a, b) => a.ts - b.ts)
          .slice(0, 3)
          .map(x => ({
            label: String((x.o as any)?.product_name ?? (x.o as any)?.product ?? '').slice(0, 30) || t('Polis', 'Policy'),
            plate: String((x.o as any)?.plate ?? '').trim() || undefined,
            end_date: (x.o as any)?.end_date,
          }));
        if (rows.length === 0) return;
        pushMessage('bot', t('Aku sempat intip datamu — biar tidak kebablasan:', 'I glanced at your data — so nothing slips by:'), {
          cards: [{ type: 'renewal_care', data: { rows } }],
        });
      } catch { /* fail-quiet */ }
    })();
  }, [open, isAgent, currentUser?.id, pushMessage, t]);  

  const startQuoteFlow = useCallback(() => {
    pushMessage('bot', t('Kutipan 3 ketukan — pilih produknya:', '3-tap quotation — pick the product:'), {
      cards: [{ type: 'quote_flow', data: { step: 'product' } }],
    });
  }, [pushMessage, t]);

  const handleFlow = useCallback((action: string, _value?: string) => {
    if (action === 'start-quote') { startQuoteFlow(); return; }
    if (action === 'product') {
      // The next camera shot is a registration card on purpose (hint), and the
      // next successful OCR read auto-sends the price request (flowRef).
      cameraHintRef.current = 'STNK';
      flowRef.current = 'await-photo';
      pushMessage('bot', t('Mantap. Ketuk 2: repro STNK-nya ya.', 'Great. Tap 2: photograph the registration.'), {
        cards: [{ type: 'quote_flow', data: { step: 'foto' } }],
      });
      return;
    }
    if (action === 'foto') { cameraRef.current?.click(); return; }
    if (action === 'resume') {
      const saved = resumeSavedRef.current;
      if (!saved) return;
      resumeSavedRef.current = null;
      const restored: Message[] = saved.msgs.slice(-RESUME_DEPTH).map(m0 => {
        msgIdRef.current += 1;
        return { id: msgIdRef.current, from: m0.r === 'b' ? 'bot' : 'user', text: m0.k };
      });
      msgIdRef.current += 1;
      setMessages([
        ...restored,
        { id: msgIdRef.current, from: 'bot', text: t('Kita lanjut dari sini 👍', 'Picking up right here 👍') },
      ]);
      return;
    }
    if (action === 'fresh') {
      resumeSavedRef.current = null;
      pushMessage('bot', t('Oke, kita mulai baru. Ada yang bisa kubantu?', 'Okay, a clean slate. What can I do for you?'));
    }
  }, [startQuoteFlow, pushMessage, t]);

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  /** Object URLs are revoked on unmount so a long chat does not leak them. */
  const previewsRef = useRef<string[]>([]);
  useEffect(() => () => { previewsRef.current.forEach(u => URL.revokeObjectURL(u)); }, []);

  const MAX_ATTACHMENTS = 4;

  /**
   * Attach any photo or document.
   *
   * `hint` is only set by the "Foto STNK" shortcut; with no hint the reader
   * classifies the image itself, which is the whole point — nobody should have
   * to tell a chat app what kind of paper they are holding.
   */
  const attachDocument = useCallback(async (file: File, hint?: DocKind) => {
    if (!file.type.startsWith('image/')) {
      setScanError(t('Untuk sekarang aku baru bisa membaca foto/gambar. PDF belum ya.',
                     'For now I can only read photos or images — PDF not yet.'));
      return;
    }
    // Phone photos are routinely 5-10 MB; anything past this is not a document
    // photo and the compressor would choke on it.
    if (file.size > 12 * 1024 * 1024) {
      setScanError(t('Fotonya terlalu besar (maks 12 MB). Coba foto ulang dengan resolusi lebih kecil.',
                     'That photo is too large (max 12 MB). Try a smaller one.'));
      return;
    }

    setScanning(hint ?? t('dokumen', 'document'));
    setScanError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await extractDocumentOcr(dataUrl, hint);
      if (!res) {
        setScanError(t('Dokumennya belum terbaca. Pastikan seluruh dokumen masuk frame dan cahayanya cukup.',
                       'I could not read that. Fit the whole document in frame with good light.'));
        return;
      }

      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      attachIdRef.current += 1;
      const attachment: Attachment = {
        id: `att-${attachIdRef.current}`,
        preview,
        label: res.label,
        doc: { type: res.type, label: res.label, fields: res.fields, confidence: res.confidence },
      };

      setPending(prev => {
        // One of each specialist type: a second STNK replaces the first, since
        // it is a correction, not a second vehicle in the same breath.
        const deduped = res.type === 'STNK' || res.type === 'KTP'
          ? prev.filter(a => a.doc.type !== res.type)
          : prev;
        return [...deduped, attachment].slice(-MAX_ATTACHMENTS);
      });

      // v2.7.11 — an STNK photographed mid-quote-flow is a complete request:
      // the goal was already stated by the product tap, and the composer rule
      // "nobody types a sentence to explain their own STNK" becomes automatic.
      // The override array keeps `ask` from reading its render-time `pending`
      // (state set this tick is not yet visible to its closure).
      if (flowRef.current === 'await-photo' && res.type === 'STNK') {
        flowRef.current = 'idle';
        cameraHintRef.current = undefined;
        pushMessage('bot', t(
          'STNK terbaca! Aku minta server hitung paket-paketnya sekarang…',
          'Registration read! Getting the package numbers from the server now…',
        ));
        askRef.current(
          t('Tolong buatkan penawaran dengan beberapa opsi paket dari STNK ini ya.',
            'Please build a few package options from this registration.'),
          [attachment],
        );
        if (!res.notes) return;
      }

      if (res.notes) setScanError(res.notes);
    } catch (e) {
      console.error('Pathy attachment:', e);
      setScanError(t('Gagal membaca dokumen. Coba lagi ya.', 'Could not read the document. Please try again.'));
    } finally {
      setScanning(null);
    }
  }, [t, pushMessage]);

  // Shared by the composer, the quick-action chips and the client cards so a
  // tap answer is the real, data-backed one rather than a canned paragraph.
  const ask = useCallback(async (msg: string, overrideAttachments?: Attachment[]) => {
    if (!msg || loadingRef.current) return;
    loadingRef.current = true;
    const attached = overrideAttachments ?? pending;
    pushMessage('user', msg, attached.length > 0
      ? { attachments: attached.map(a => ({ id: a.id, label: a.label, preview: a.preview })) }
      : undefined);
    setLoading(true);
    try {
      const history = messagesRef.current
        .filter(m => !m.degraded || m.from === 'user')
        .slice(-8)
        .map(m => ({
          role: (m.from === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        }));
      setPending([]);
      setScanError(null);
      const res = await pathyChat(msg, history, attached.map(a => a.doc));
      pushMessage('bot', res.reply, {
        cards: res.cards,
        degraded: res.degraded,
        disclaimer: res.disclaimer,
      });
      // P2 — when the user turned the voice on, the answer is also read aloud
      // (toggle-first: nothing here speaks unprompted). setPending([]) set
      // state, but the live toggle is read from storage so the callback cannot
      // go stale.
      let speakNow = false;
      try { speakNow = localStorage.getItem(TTS_KEY) === '1'; } catch { /* private mode */ }
      if (speakNow) speakAnswer(res.reply, en ? 'en' : 'id');
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
  }, [pushMessage, t, pending, en]);

  // Early callbacks (attachment auto-send, hold-to-talk) call `ask` through
  // this ref so none of them needs to be declared after it.
  useEffect(() => { askRef.current = ask; }, [ask]);

  // ── Voice input. Two modes (v2.7.11):
  //   • tap-toggle (original): transcript lands in the box, user reads and
  //     fixes it before sending — dictation misreads names and plates.
  //   • press-and-hold (P2): press starts, release stops; the finished
  //     transcript goes STRAIGHT out. It is the "ask while holding the phone
  //     one-handed" case — waiting to read a draft would defeat it.
  const [listening, setListening] = useState(false);
  const dictationRef = useRef<DictationHandle | null>(null);
  /** Whatever was already typed when the mic opened — dictation appends to it. */
  const dictationBaseRef = useRef('');
  const speechOk = useRef(isSpeechSupported()).current;
  const holdModeRef = useRef(false);
  const holdFinalRef = useRef('');

  useEffect(() => () => {
    dictationRef.current?.stop();
    stopSpeaking();
  }, []);

  const beginDictation = useCallback((mode: 'toggle' | 'hold') => {
    setScanError(null);
    dictationBaseRef.current = mode === 'hold' || !input.trim() ? '' : `${input.trim()} `;
    holdModeRef.current = mode === 'hold';
    holdFinalRef.current = '';
    const join = (text: string) => `${dictationBaseRef.current}${text}`;
    const handle = startDictation({
      lang: en ? 'en-US' : 'id-ID',
      onPartial: text => setInput(join(text)),
      onFinal: text => {
        if (holdModeRef.current) { holdFinalRef.current = text.trim(); return; }
        if (text) setInput(join(text));
      },
      onError: msg => setScanError(msg),
      onEnd: () => {
        setListening(false);
        dictationRef.current = null;
        if (holdModeRef.current) {
          const said = holdFinalRef.current;
          holdFinalRef.current = '';
          if (said) askRef.current(said);
          else setScanError(t('Suara tidak menangkap kalimat. Coba lagi ya.', 'Nothing was captured. Try again.'));
        }
      },
    });
    if (!handle) { setScanError(t('Mikrofon belum didukung browser ini.', 'This browser has no microphone input.')); return; }
    dictationRef.current = handle;
    setListening(true);
  }, [en, input, t]);

  const handleSend = useCallback(() => {
    // An attachment on its own is a complete request — nobody should have to
    // type a sentence to explain a photo of their own STNK.
    const msg = input.trim() || (
      pending.some(a => a.doc.type === 'STNK')
        ? t('Tolong buatkan penawaran dari dokumen ini, beberapa opsi ya.', 'Please build me a few quote options from this document.')
        : t('Tolong baca dokumen ini dan simpan datanya kalau relevan.', 'Please read this document and keep the data if it is useful.')
    );
    if (!input.trim() && pending.length === 0) return;
    setInput('');
    void ask(msg);
  }, [input, ask, pending, t]);

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
    if (qr.action === 'flow') { startQuoteFlow(); return; }
    void ask((en ? qr.promptEn : qr.promptId) ?? (en ? qr.chipEn : qr.chipId));
  }, [en, ask, pushMessage, startQuoteFlow]);

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Floating action button — hidden when the portal supplies its own
          entry point (e.g. the raised centre tab in the customer nav). */}
      {!hideLauncher && (
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
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Asisten Pathy', 'Pathy assistant')}
          data-pathychat-anim
          // Layar penuh. Pathy menampilkan proposal, tabel opsi dan kartu PDF —
          // isi yang di panel 22rem/70vh harus digulir dalam lubang kecil.
          // aria-modal ikut jadi true karena sekarang ia memang menutupi
          // seluruh layar; bilang "false" akan membohongi pembaca layar.
          className="fixed inset-0 z-[70] w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900"
          style={{
            animation: 'pathychat-pop 0.28s cubic-bezier(.22,1,.36,1)',
            // Hormati notch//gesture bar di APK dan iOS.
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
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
            {/* P2 — voice output toggle. OFF by default; the user flips it,
                the state is remembered per device, and closing the panel stops
                any playback immediately. */}
            {ttsOk && (
              <button
                type="button"
                onClick={toggleTts}
                aria-label={ttsOn ? t('Matikan suara Pathy', 'Turn Pathy voice off') : t('Nyalakan suara Pathy', 'Turn Pathy voice on')}
                aria-pressed={ttsOn}
                className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  ttsOn ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4z" />
                  {ttsOn ? (
                    <>
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                      <path d="M18.5 5.5a9.5 9.5 0 0 1 0 13" />
                    </>
                  ) : (
                    <path d="M22 9l-6 6m0-6l6 6" />
                  )}
                </svg>
              </button>
            )}
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
                'Pathy AI bisa keliru dan tidak memutuskan klaim — keputusan dijamin atau tidak ada pada pihak asuransi.',
                'Pathy is AI, can be wrong, and does not decide claims — cover decisions rest with the insurer.',
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
                  {(m.attachments?.length ?? 0) > 0 && (
                    <div className={`flex flex-wrap gap-1.5 mt-1.5 ${m.from === 'user' ? 'justify-end' : ''}`}>
                      {m.attachments!.map(att => (
                        <span key={att.id} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-white/10">
                          <img src={att.preview} alt="" className="w-7 h-7 rounded-lg object-cover" />
                          <span className="text-[0.58rem] font-bold text-slate-600 dark:text-slate-300 max-w-[8rem] truncate">{att.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {m.cards?.map((card, i) => (
                    <PathyCardView
                      key={`${m.id}-${i}`}
                      card={card}
                      en={en}
                      isAgent={isAgent}
                      onAsk={(msg: string) => { askRef.current(msg); }}
                      onFlow={handleFlow}
                      onCamera={() => cameraRef.current?.click()}
                    />
                  ))}
                  {m.from === 'bot' && m.disclaimer && (
                    <p className="mt-1 px-1 text-[0.55rem] text-slate-400 dark:text-slate-500 leading-snug">
                      {m.disclaimer}
                    </p>
                  )}
                  {m.degraded && (
                    <p className="mt-1 px-1 text-[0.55rem] text-ds-amber dark:text-amber-400 leading-snug">
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
              everyone can produce, and it is what the proposal flow runs on.

              Two inputs, deliberately. The upload one has NO `capture`
              attribute, which is what makes the OS offer the gallery, files and
              recent screenshots; with `capture` set (as this used to be) a
              phone jumps straight to the camera and a photo the user already
              has is unreachable — the "there is no upload" complaint. */}
          <div className="flex-shrink-0 px-3 pt-2 pb-1 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900">
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void attachDocument(f, cameraHintRef.current); }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void attachDocument(f, cameraHintRef.current); }}
            />

            {(pending.length > 0 || scanning || scanError) && (
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {pending.map(att => (
                  <span key={att.id} className="inline-flex items-center gap-1.5 pl-1 pr-1 py-1 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
                    <img
                      src={att.preview}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/30"
                    />
                    <span className="text-[0.6rem] font-black text-emerald-700 dark:text-emerald-300 max-w-[9rem] truncate">
                      {att.label} · {t('terbaca', 'read')}
                    </span>
                    <button
                      type="button"
                      aria-label={t(`Hapus ${att.label}`, `Remove ${att.label}`)}
                      onClick={() => setPending(prev => prev.filter(x => x.id !== att.id))}
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
                {scanError && (
                  <span className="text-[0.6rem] font-medium text-ds-amber dark:text-amber-400 flex items-center gap-1.5">
                    {scanError}
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      disabled={!!scanning}
                      className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 font-black active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {t('Coba lagi', 'Retry')}
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 pb-2">
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                disabled={!!scanning || pending.length >= 4}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-[0.62rem] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 active:scale-95 transition-transform disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v13M7 8l5-5 5 5" /></svg>
                {t('Unggah gambar', 'Upload image')}
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={!!scanning || pending.length >= 4}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[0.62rem] font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition-transform disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                {t('Kamera', 'Camera')}
              </button>
              <span className="text-[0.55rem] text-slate-400 leading-tight">
                {t('STNK · KTP · SIM · polis · kuitansi', 'Registration · ID · licence · policy · receipt')}
              </span>
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
                  /* Press-and-hold to ask (P2): left/right press starts,
                     release stops and the finished words go straight out.
                     A plain tap still toggles live-caption mode via onClick
                     fallback when a browser fires click without the hold. */
                  onPointerDown={e => { e.preventDefault(); if (!listening) beginDictation('hold'); }}
                  onPointerUp={e => { e.preventDefault(); if (listening && holdModeRef.current) dictationRef.current?.stop(); }}
                  onPointerLeave={() => { if (listening && holdModeRef.current) dictationRef.current?.stop(); }}
                  onContextMenu={e => e.preventDefault()}
                  disabled={loading}
                  aria-label={listening ? t('Lepas untuk mengirim', 'Release to send') : t('Tahan untuk bicara', 'Hold to talk')}
                  aria-pressed={listening}
                  className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 flex-shrink-0 ${
                    listening ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}
                  style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', ...(listening ? { animation: 'pathy-mic 1.1s ease-in-out infinite' } : {}) }}
                >
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && pending.length === 0) || loading}
                className="w-7 h-7 rounded-full bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 flex items-center justify-center active:scale-90 transition-all duration-150 flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick reply chips — role-shaped (v2.7.11): the agent sees acting
              taps, the customer sees service taps. Same set the greet card
              shows, so nothing surprises twice. */}
          <div className="flex-shrink-0 px-3 pt-1 pb-3 bg-white dark:bg-slate-900">
            <p className="text-[0.55rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">
              {t('Ketukan Cepat', 'Quick Taps')}
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
