import React, { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { ArtKeyframes, ArtProtection, ArtClaim, ArtSupport, ArtQuote, ArtCommission, ArtNetwork } from './OnboardingArt';
import { fetchWebsiteSection } from '../services/supabaseService';

/* ─── Gojek-style illustrated onboarding — fullscreen slides, role-aware ────
   Storage: SP_ONBOARDED_<role> so customer and agent each see their own tour. */

type Role = 'CUSTOMER' | 'AGENT';

interface OnboardingFlowProps {
  role: Role;
  onComplete: () => void;
  lang: 'ID' | 'EN';
}

export const onboardingKey = (role: Role) => `SP_ONBOARDED_${role}`;
export const needsOnboarding = (role: Role) =>
  typeof window !== 'undefined' && localStorage.getItem(onboardingKey(role)) !== '1';

/* ── Slides — illustrative vector scenes per role ── */

const SLIDES: Record<Role, { Art: React.ElementType; id: [string, string]; en: [string, string] }[]> = {
  CUSTOMER: [
    {
      Art: ArtProtection,
      id: ['Semua perlindungan, satu aplikasi', 'Mobil, jiwa, perjalanan, sampai gadget — bandingkan dan beli dalam hitungan menit dengan tarif resmi OJK.'],
      en: ['All protection, one app', 'Car, life, travel, gadgets — compare and buy in minutes with official OJK rates.'],
    },
    {
      Art: ArtClaim,
      id: ['Klaim cukup lewat foto', 'Foto kerusakan dari HP kamu, AI kami langsung menilai. Tanpa formulir ribet, tanpa antre.'],
      en: ['Claim with just a photo', 'Snap the damage from your phone — our AI assesses it instantly. No forms, no queues.'],
    },
    {
      Art: ArtSupport,
      id: ['Ada manusia di balik teknologi', 'Agen berlisensi dan asisten Pathy siap bantu 24/7 — dari pilih polis sampai proses klaim.'],
      en: ['Real humans behind the tech', 'Licensed agents and Pathy assistant, ready 24/7 — from choosing a policy to settling a claim.'],
    },
  ],
  AGENT: [
    {
      Art: ArtQuote,
      id: ['Jual polis lebih cepat', 'Hitung premi tarif OJK, buat penawaran, dan kirim ke klien — semua dari genggaman.'],
      en: ['Sell policies faster', 'Quote official OJK rates, build offers, send to clients — all from your hand.'],
    },
    {
      Art: ArtCommission,
      id: ['Komisi transparan, cair jelas', 'Lihat komisi per polis secara real-time dan tarik dana langsung dari dompet aplikasi.'],
      en: ['Transparent commission', 'Track commission per policy in real time and withdraw straight from your in-app wallet.'],
    },
    {
      Art: ArtNetwork,
      id: ['Bangun jaringan & naik level', 'Kelola klien, pantau order, dan kembangkan tim downline — semua terukur di satu dashboard.'],
      en: ['Grow your network', 'Manage clients, track orders, grow your downline team — all measured in one dashboard.'],
    },
  ],
};

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ role, onComplete, lang }) => {
  const slides = SLIDES[role];
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // CMS kill-switch: admin can hide the tour via Website Editor > Onboarding Apps
  useEffect(() => {
    fetchWebsiteSection('onboarding')
      .then(cfg => { if (cfg && cfg.is_visible === false) onComplete(); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isID = lang === 'ID';
  const last = step === slides.length - 1;

  const finish = () => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem(onboardingKey(role), '1');
      onComplete();
    }, 420);
  };

  return (
    <div className={`fixed inset-0 z-[3000] flex flex-col transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(170deg, #064e3b 0%, #065f46 42%, #047857 100%)' }}>
      <style>{`
        @keyframes ob-spin { to { transform: rotate(360deg); } }
        @keyframes ob-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ob-slide-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .ob-anim, .ob-anim * { animation: none !important; } }
      `}</style>

      {/* skip */}
      <div className="flex justify-end px-6 pt-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <button onClick={finish}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-white bg-white/10 border border-white/15 backdrop-blur-md transition-colors active:scale-95">
          {isID ? 'Lewati' : 'Skip'} <X size={12} />
        </button>
      </div>

      {/* illustration */}
      <div className="ob-anim oa flex-1 flex items-center justify-center" key={`scene-${step}`} style={{ animation: 'ob-slide-in 0.45s cubic-bezier(.22,1,.36,1)' }}>
        <ArtKeyframes />
        {React.createElement(slides[step].Art)}
      </div>

      {/* bottom glass card */}
      <div className="px-5 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="sp-glass-strong rounded-[2.2rem] px-7 pt-8 pb-7 text-center" key={`copy-${step}`}
          style={{ animation: 'ob-slide-in 0.45s cubic-bezier(.22,1,.36,1)' }}>
          <h2 className="text-[1.45rem] font-black tracking-tight leading-snug text-ds-ink dark:text-white mb-2.5">
            {isID ? slides[step].id[0] : slides[step].en[0]}
          </h2>
          <p className="text-sm leading-relaxed text-ds-ink2 dark:text-slate-300 max-w-xs mx-auto mb-7">
            {isID ? slides[step].id[1] : slides[step].en[1]}
          </p>

          {/* dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} aria-label={`slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{ width: i === step ? 26 : 8, height: 8, background: i === step ? '#059669' : 'rgba(5,150,105,0.25)' }} />
            ))}
          </div>

          <button onClick={() => (last ? finish() : setStep(s => s + 1))}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 14px 30px -12px rgba(5,150,105,0.65)' }}>
            {last ? (isID ? 'Mulai Sekarang' : 'Get Started') : (isID ? 'Lanjut' : 'Next')}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
