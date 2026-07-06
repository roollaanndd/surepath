import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../../types';
import { pathyChat } from '../../services/supabaseService';

const WHATSAPP_NUMBER = '6280000000000'; // placeholder — do NOT treat as a real number

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
  answerEn: string; answerId: string;
  action?: 'whatsapp';
}

const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'claim',
    chipEn: 'How to claim?', chipId: 'Cara klaim?',
    answerEn: 'Filing a claim is easy: open the Claim tab, snap a photo of the damage, fill in the short form, and submit. Our AI reviews it and you can track the status anytime in History.',
    answerId: 'Klaim itu mudah: buka tab Klaim, foto kerusakannya, isi formulir singkat, lalu kirim. AI kami akan meninjau dan kamu bisa pantau statusnya kapan saja di Riwayat.',
  },
  {
    id: 'status',
    chipEn: 'Policy status', chipId: 'Status polis',
    answerEn: 'You can see all your active policies and their expiry dates in the History tab. Each policy shows whether it is active, under review, or issued.',
    answerId: 'Kamu bisa melihat semua polis aktif dan tanggal berakhirnya di tab Riwayat. Setiap polis menampilkan status: aktif, sedang dikaji, atau sudah terbit.',
  },
  {
    id: 'premium',
    chipEn: 'Calculate premium', chipId: 'Hitung premi',
    answerEn: 'To get an estimate, open the Buy tab and pick a product. The wizard calculates your premium based on your details in a few taps.',
    answerId: 'Untuk estimasi, buka tab Beli lalu pilih produk. Wizard akan menghitung premimu berdasarkan datamu dalam beberapa ketukan.',
  },
  {
    id: 'whatsapp',
    chipEn: 'Chat WhatsApp agent', chipId: 'Chat WhatsApp agen',
    answerEn: 'Opening WhatsApp so you can chat with a SurePath agent...',
    answerId: 'Membuka WhatsApp agar kamu bisa mengobrol dengan agen SurePath...',
    action: 'whatsapp',
  },
];

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
}

interface PathyChatProps {
  lang: Lang;
  currentUser?: { name?: string; id?: string; role?: string };
}

const PathyChat: React.FC<PathyChatProps> = ({ lang, currentUser }) => {
  const en = isEN(lang);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const msgIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { ensurePathyChatKeyframes(); }, []);

  const t = (idText: string, enText: string) => (en ? enText : idText);

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

  const pushMessage = useCallback((from: 'bot' | 'user', text: string) => {
    msgIdRef.current += 1;
    const id = msgIdRef.current;
    setMessages(prev => [...prev, { id, from, text }]);
  }, []);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    pushMessage('user', msg);
    setLoading(true);
    try {
      const reply = await pathyChat(msg);
      pushMessage('bot', reply);
    } catch (e: any) {
      const notConfigured = String(e?.message ?? '').toLowerCase().includes('not configured');
      pushMessage('bot', notConfigured
        ? t('Fitur AI Pathy akan segera hadir! Sementara itu, gunakan pilihan cepat di bawah.', 'Pathy AI is coming soon! For now, use the quick actions below.')
        : t('Maaf, ada gangguan sementara. Silakan coba lagi.', 'Sorry, a temporary issue occurred. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, pushMessage, t]);

  const handleQuick = useCallback((qr: QuickReply) => {
    pushMessage('user', en ? qr.chipEn : qr.chipId);
    const answer = en ? qr.answerEn : qr.answerId;
    window.setTimeout(() => {
      pushMessage('bot', answer);
      if (qr.action === 'whatsapp') {
        const text = encodeURIComponent(
          en ? 'Hi SurePath, I need help with insurance.' : 'Halo SurePath, saya butuh bantuan soal asuransi.',
        );
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
      }
    }, 350);
  }, [en, pushMessage]);

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
                'Pathy dapat melihat data kamu tetapi tidak dapat mengubah apapun.',
                'Pathy can view your data but cannot modify anything.',
              )}
            </p>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#fafaf9] dark:bg-[#0a0a0a]">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-xs font-medium leading-relaxed rounded-2xl ${
                    m.from === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md border border-slate-100 dark:border-white/5 shadow-sm'
                  }`}
                >
                  {m.text}
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
              {QUICK_REPLIES.map(qr => (
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
