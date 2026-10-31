import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ShieldCheck, Sparkles } from 'lucide-react';
import { ArtKeyframes, ArtProtection, ArtClaim, ArtSupport } from './OnboardingArt';
import {
  AgentArtKeyframes, ObWelcome, ObQuote, ObWallet, ObGrowth,
  ObOpsQueue, ObOpsReview, ObOpsPayout, ObOpsVerify, ObInsIssue,
} from './agent/AgentArt';
import { fetchWebsiteSection } from '../services/supabaseService';

/* Role-aware onboarding. Visual-only refresh: slide copy, order, role access,
   CMS visibility switch, and completion persistence remain unchanged. */

type Role = 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'INSURER';

const ACCENT: Record<Role, { dot: string; dotDim: string }> = {
  CUSTOMER: { dot: '#08743b', dotDim: 'rgba(8,116,59,0.18)' },
  AGENT:    { dot: '#08743b', dotDim: 'rgba(8,116,59,0.18)' },
  OPERATOR: { dot: '#08743b', dotDim: 'rgba(8,116,59,0.18)' },
  INSURER:  { dot: '#08743b', dotDim: 'rgba(8,116,59,0.18)' },
};

interface OnboardingFlowProps {
  role: Role;
  onComplete: () => void;
  lang: 'ID' | 'EN';
}

export const onboardingKey = (role: Role) => `SP_ONBOARDED_${role}`;
export const needsOnboarding = (role: Role) =>
  typeof window !== 'undefined' && localStorage.getItem(onboardingKey(role)) !== '1';

type OnboardingSlide = {
  Art: React.ElementType;
  id: [string, string];
  en: [string, string];
  photo: string;
};

// Curated editorial lifestyle photography makes the welcome tour feel human and
// contemporary. If a remote image cannot load, the existing vector artwork is
// retained as a graceful fallback.
const PHOTO = {
  customerJourney: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
  customerDigital: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85',
  customerSupport: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85',
  partnerWelcome: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=85',
  partnerQuote: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=85',
  partnerWallet: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85',
  partnerGrowth: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=85',
};

const SLIDES: Record<Role, OnboardingSlide[]> = {
  CUSTOMER: [
    {
      Art: ArtProtection, photo: PHOTO.customerJourney,
      id: ['Semua perlindungan, satu aplikasi', 'Mobil, jiwa, perjalanan, sampai gadget — bandingkan dan beli dalam hitungan menit dengan tarif resmi OJK.'],
      en: ['All protection, one app', 'Car, life, travel, gadgets — compare and buy in minutes with official OJK rates.'],
    },
    {
      Art: ArtClaim, photo: PHOTO.customerDigital,
      id: ['Klaim cukup lewat foto', 'Foto kerusakan dari HP kamu, AI kami langsung menilai. Tanpa formulir ribet, tanpa antre.'],
      en: ['Claim with just a photo', 'Snap the damage from your phone — our AI assesses it instantly. No forms, no queues.'],
    },
    {
      Art: ArtSupport, photo: PHOTO.customerSupport,
      id: ['Ada manusia di balik teknologi', 'Mitra berlisensi dan asisten Pathy siap bantu 24/7 — dari pilih polis sampai proses klaim.'],
      en: ['Real humans behind the tech', 'Licensed agents and Pathy assistant, ready 24/7 — from choosing a policy to settling a claim.'],
    },
  ],
  AGENT: [
    {
      Art: ObWelcome, photo: PHOTO.partnerWelcome,
      id: ['Kantor asuransi di genggaman', 'Selamat datang, Mitra SurePath. Dashboard bisnis, polis, dan klien Anda — rapi dalam satu aplikasi berstandar perbankan.'],
      en: ['Your insurance office, in hand', 'Welcome, SurePath Partner. Your business dashboard, policies, and clients — organized in one bank-grade app.'],
    },
    {
      Art: ObQuote, photo: PHOTO.partnerQuote,
      id: ['Buat penawaran dalam hitungan detik', 'Hitung premi tarif resmi OJK, terbitkan quotation slip PDF profesional, dan kirim ke klien langsung dari aplikasi.'],
      en: ['Quotes in seconds', 'Calculate official OJK rates, generate a professional PDF quotation slip, and send it to clients straight from the app.'],
    },
    {
      Art: ObWallet, photo: PHOTO.partnerWallet,
      id: ['Komisi transparan, cair cepat', 'Pantau komisi per polis secara real-time di dompet Anda dan tarik dana langsung ke rekening bank.'],
      en: ['Transparent commission, fast payout', 'Track commission per policy in real time and withdraw straight to your bank account.'],
    },
    {
      Art: ObGrowth, photo: PHOTO.partnerGrowth,
      id: ['Naik level bersama tim Anda', 'Kelola klien, kembangkan jaringan mitra, kejar peringkat leaderboard, dan raih tier Elite dengan benefit eksklusif.'],
      en: ['Level up with your team', 'Manage clients, grow your partner network, climb the leaderboard, and reach Elite tier with exclusive benefits.'],
    },
  ],
  OPERATOR: [
    {
      Art: ObOpsQueue, photo: PHOTO.partnerWelcome,
      id: ['Pusat kendali operasional', 'Semua antrean — polis, klaim, penarikan, verifikasi — masuk real-time ke satu dashboard. Notifikasi pop-up otomatis setiap ada pengajuan baru.'],
      en: ['Your operations command center', 'Every queue — policies, claims, withdrawals, verifications — flows in real time to one dashboard, with automatic pop-up alerts.'],
    },
    {
      Art: ObOpsReview, photo: PHOTO.partnerQuote,
      id: ['Review cepat, keputusan tepat', 'Periksa dokumen, foto kendaraan, dan skor AI survey dalam satu layar — lalu setujui, minta info, atau tolak dengan satu ketukan.'],
      en: ['Fast review, right decision', 'Check documents, vehicle photos, and AI survey scores on one screen — then approve, request info, or decline in one tap.'],
    },
    {
      Art: ObOpsPayout, photo: PHOTO.partnerWallet,
      id: ['Pencairan dana yang aman', 'Proses penarikan komisi agen dengan persetujuan berlapis L1/L2/L3 — setiap rupiah tercatat dan terjaga.'],
      en: ['Payouts, guarded', 'Process agent withdrawals with layered L1/L2/L3 approvals — every rupiah logged and protected.'],
    },
    {
      Art: ObOpsVerify, photo: PHOTO.partnerGrowth,
      id: ['Jaga kualitas jaringan mitra', 'Verifikasi agen baru, tinjau kelengkapan dokumen, dan pastikan hanya mitra terpercaya yang mewakili SurePath.'],
      en: ['Keep the partner network strong', 'Verify new agents, review their documents, and make sure only trusted partners represent SurePath.'],
    },
  ],
  INSURER: [
    {
      Art: ObOpsQueue, photo: PHOTO.partnerWelcome,
      id: ['Pengajuan masuk secara real-time', 'Setiap penutupan yang ditempatkan SurePath ke perusahaan Anda langsung muncul di dashboard — lengkap dengan notifikasi pop-up.'],
      en: ['Submissions arrive in real time', 'Every placement SurePath routes to your company appears instantly on your dashboard, with pop-up alerts.'],
    },
    {
      Art: ObOpsReview, photo: PHOTO.partnerQuote,
      id: ['Review lengkap dalam satu layar', 'Data nasabah, detail kendaraan, foto, dan skor AI survey — lalu setujui, minta info tambahan, atau tolak dengan satu ketukan.'],
      en: ['Full review on one screen', 'Customer data, vehicle details, photos, and AI survey scores — approve, request info, or decline in one tap.'],
    },
    {
      Art: ObInsIssue, photo: PHOTO.partnerWallet,
      id: ['Terbitkan polis tanpa hambatan', 'Upload PDF polis beserta nomornya — nasabah dan tim SurePath langsung menerima notifikasi penerbitan.'],
      en: ['Issue policies without friction', 'Upload the policy PDF with its number — the customer and SurePath team are notified instantly.'],
    },
    {
      Art: ObWallet, photo: PHOTO.partnerGrowth,
      id: ['Pantau premi & pembayaran', 'Lacak pembayaran premi setiap polis yang Anda terbitkan — transparan, tercatat, dan real-time.'],
      en: ['Track premiums & payments', 'Follow premium payments for every policy you issue — transparent, logged, and real-time.'],
    },
  ],
};

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ role, onComplete, lang }) => {
  const slides = SLIDES[role];
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [leaving, setLeaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    fetchWebsiteSection('onboarding')
      .then(cfg => { if (cfg && cfg.is_visible === false) onComplete(); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setImageFailed(false); }, [step, role]);

  // Pre-load the next slide's image so the horizontal slide transition starts
  // smoothly rather than with a blank frame. Noop for CUSTOMER (vector-only).
  useEffect(() => {
    if (role === 'CUSTOMER') return;
    const next = slides[step + 1];
    if (next?.photo) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = next.photo;
    }
  }, [step, role, slides]);

  const goStep = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  // Swipe to advance (mobile — <= -40px = next, >= 40px = previous).
  const touchX = React.useRef<number | null>(null);
  const handleTouchStart: React.TouchEventHandler = (e) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const handleTouchEnd: React.TouchEventHandler = (e) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (dx <= -40 && step < slides.length - 1) goStep(step + 1);
    else if (dx >= 40 && step > 0) goStep(step - 1);
  };

  const isID = lang === 'ID';
  const last = step === slides.length - 1;
  const accent = ACCENT[role];

  const finish = () => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem(onboardingKey(role), '1');
      onComplete();
    }, 320);
  };

  return (
    <div
      className={`fixed inset-0 z-[3000] flex flex-col overflow-hidden transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #e1f4e8 0%, #f4f8f5 42%, #fbfcfb 100%)', color: '#132b22' }}
    >
      <style>{`
        @keyframes ob-slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ob-slide-in-right { from { opacity: 0; transform: translateX(32px) scale(.98); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes ob-slide-in-left { from { opacity: 0; transform: translateX(-32px) scale(.98); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes ob-scene-in-right { from { opacity: 0; transform: translateX(42px) scale(1.03); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes ob-scene-in-left { from { opacity: 0; transform: translateX(-42px) scale(1.03); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes ob-glow { 0%,100% { opacity: .35; transform: scale(.98); } 50% { opacity: .65; transform: scale(1.04); } }
        .ob-scene { background: radial-gradient(ellipse at 50% 15%, #176c4b 0%, #0b4935 52%, #092d25 100%); }
        .ob-scene-grid { background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 28px 28px; mask-image: linear-gradient(to bottom, black, transparent 88%); }
        .ob-anim { animation: ob-slide-in .42s cubic-bezier(.22,1,.36,1) both; }
        .ob-anim-copy-fwd { animation: ob-slide-in-right .5s cubic-bezier(.22,1,.36,1) both; }
        .ob-anim-copy-back { animation: ob-slide-in-left .5s cubic-bezier(.22,1,.36,1) both; }
        .ob-anim-scene-fwd { animation: ob-scene-in-right .55s cubic-bezier(.22,1,.36,1) both; }
        .ob-anim-scene-back { animation: ob-scene-in-left .55s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .ob-anim, .ob-anim-copy-fwd, .ob-anim-copy-back, .ob-anim-scene-fwd, .ob-anim-scene-back, .ob-glow {
            animation: none !important; transition: none !important;
          }
        }
      `}</style>

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6" style={{ paddingTop: 'max(1.1rem, env(safe-area-inset-top))' }}>
        <img src="/logo-full.png" alt="SurePath" className="h-8 sm:h-9 w-auto max-w-[165px] object-contain" />
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] font-semibold tracking-wide text-emerald-950/50">
            {isID ? 'LANGKAH' : 'STEP'} {step + 1} <span className="text-emerald-950/30">/ {slides.length}</span>
          </span>
          <button type="button" onClick={finish} className="flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-950/10 bg-white/80 px-4 py-2 text-[11px] font-bold text-emerald-900 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            {isID ? 'Lewati' : 'Skip'} <X size={13} />
          </button>
        </div>
      </header>

      <main
        className="relative z-10 flex min-h-0 flex-1 flex-col px-4 sm:px-7 pt-4 pb-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <section className="ob-scene relative mx-auto flex min-h-[235px] w-full max-w-[520px] flex-1 items-center justify-center overflow-hidden rounded-[30px] border border-white/50 shadow-[0_24px_70px_-32px_rgba(4,53,36,.65)] sm:rounded-[36px]" style={{ maxHeight: 'min(43vh, 430px)' }} aria-label={isID ? 'Ilustrasi fitur SurePath' : 'SurePath feature illustration'}>
          {/* Customer onboarding uses SurePath's own vector illustrations, never stock people photos. */}
          {role !== 'CUSTOMER' && !imageFailed && (
            <img
              src={slides[step].photo}
              alt=""
              aria-hidden="true"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
              loading={step === 0 ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#062a21]/90 via-[#073c2d]/35 to-[#0b4935]/20" aria-hidden="true" />
          <div className="ob-scene-grid absolute inset-0" aria-hidden="true" />
          <div className="ob-glow absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" style={{ animation: 'ob-glow 6s ease-in-out infinite' }} aria-hidden="true" />
          {role !== 'CUSTOMER' && !imageFailed && <div className="absolute inset-0 bg-emerald-950/10" aria-hidden="true" />}
          {(role === 'CUSTOMER' || imageFailed) && (
            <div className={`${direction === 1 ? 'ob-anim-scene-fwd' : 'ob-anim-scene-back'} relative z-10 flex w-full items-center justify-center px-3 pt-7 pb-2`} key={`scene-${step}`}>
              <ArtKeyframes />
              {role !== 'CUSTOMER' && <AgentArtKeyframes />}
              {React.createElement(slides[step].Art)}
            </div>
          )}
          <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-white/90 backdrop-blur-md sm:left-6 sm:top-6">
            <ShieldCheck size={12} className="text-emerald-200" />
            SurePath <span className="text-white/50">·</span> {isID ? 'Proteksi cerdas' : 'Smart protection'}
          </div>
          <div className="absolute bottom-4 left-5 flex items-center gap-2 text-[10px] font-semibold tracking-wide text-white/85 sm:left-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.9)]" />
            {isID ? 'Aman. Praktis. Terpercaya.' : 'Secure. Simple. Trusted.'}
          </div>
          <div className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-emerald-100 backdrop-blur-md" aria-hidden="true">
            <Sparkles size={16} />
          </div>
        </section>

        <section className={`${direction === 1 ? 'ob-anim-copy-fwd' : 'ob-anim-copy-back'} mx-auto mt-4 flex w-full max-w-[520px] flex-col rounded-[28px] border border-white/90 bg-white/90 px-5 pb-4 pt-5 shadow-[0_18px_50px_-28px_rgba(10,58,38,.24)] backdrop-blur-xl sm:mt-5 sm:rounded-[32px] sm:px-8 sm:pb-6 sm:pt-7`} key={`copy-${step}`}>
          <div className="mb-3 flex items-center justify-center gap-1.5" aria-label={`${step + 1} / ${slides.length}`}>
            {slides.map((_, i) => (
              <button key={i} type="button" onClick={() => goStep(i)} aria-label={`Go to slide ${i + 1}`} aria-current={i === step ? 'step' : undefined} className="h-1.5 rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" style={{ width: i === step ? 28 : 7, background: i === step ? accent.dot : accent.dotDim }} />
            ))}
          </div>
          <h1 className="mb-2 text-center text-[1.45rem] font-extrabold leading-[1.18] tracking-[-.035em] text-[#122c22] sm:text-[1.8rem]">
            {isID ? slides[step].id[0] : slides[step].en[0]}
          </h1>
          <p className="mx-auto mb-5 max-w-[390px] text-center text-[13px] leading-[1.65] text-slate-600 sm:mb-6 sm:text-sm">
            {isID ? slides[step].id[1] : slides[step].en[1]}
          </p>
          <button type="button" onClick={() => (last ? finish() : goStep(step + 1))} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0b6844] via-[#08743b] to-[#0b5739] px-5 py-3.5 text-[12px] font-extrabold uppercase tracking-[.12em] text-white shadow-[0_12px_26px_-12px_rgba(8,116,59,.62)] transition hover:brightness-105 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
            {last ? (isID ? 'Mulai Sekarang' : 'Get Started') : (isID ? 'Lanjut' : 'Continue')}
            <ChevronRight size={17} />
          </button>
          <p className="mt-3 text-center text-[10px] font-medium tracking-wide text-slate-400">
            {isID ? 'Perlindungan yang lebih mudah, dimulai di sini.' : 'A simpler way to protect what matters.'}
          </p>
        </section>
      </main>
    </div>
  );
};

export default OnboardingFlow;
