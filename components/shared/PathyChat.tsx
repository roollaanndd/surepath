import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../../types';
import { pathyChat, PathyError } from '../../services/supabaseService';
import type { PathyCard } from '../../services/supabaseService';
import { SUREPATH_WHATSAPP } from '../../constants';

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

const PathyCardView: React.FC<{ card: PathyCard; en: boolean }> = ({ card, en }) => {
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
      const res = await pathyChat(msg, history);
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
  }, [pushMessage, t]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    void ask(msg);
  }, [input, ask]);

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
                    <PathyCardView key={`${m.id}-${i}`} card={card} en={en} />
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

          {/* Text input */}
          <div className="flex-shrink-0 px-3 pt-2 pb-1 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900">
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
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || loading}
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
