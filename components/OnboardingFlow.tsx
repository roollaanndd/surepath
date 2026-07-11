import React, { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { ArtKeyframes, ArtProtection, ArtClaim, ArtSupport } from './OnboardingArt';
import {
  AgentArtKeyframes, ObWelcome, ObQuote, ObWallet, ObGrowth,
  ObOpsQueue, ObOpsReview, ObOpsPayout, ObOpsVerify, ObInsIssue,
} from './agent/AgentArt';
import { fetchWebsiteSection } from '../services/supabaseService';

/* ─── Gojek-style illustrated onboarding — fullscreen slides, role-aware ────
   Storage: SP_ONBOARDED_<role> so customer and agent each see their own tour. */

type Role = 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'INSURER';

/* Per-role visual accent — INSURER uses the purple identity, others emerald */
const ACCENT: Record<Role, { bg: string; btn: string; btnShadow: string; dot: string; dotDim: string }> = {
  CUSTOMER: { bg: 'linear-gradient(170deg, #064e3b 0%, #065f46 42%, #047857 100%)', btn: 'linear-gradient(135deg, #059669, #047857)', btnShadow: '0 14px 30px -12px rgba(5,150,105,0.65)', dot: '#059669', dotDim: 'rgba(5,150,105,0.25)' },
  AGENT:    { bg: 'linear-gradient(170deg, #064e3b 0%, #065f46 42%, #047857 100%)', btn: 'linear-gradient(135deg, #059669, #047857)', btnShadow: '0 14px 30px -12px rgba(5,150,105,0.65)', dot: '#059669', dotDim: 'rgba(5,150,105,0.25)' },
  OPERATOR: { bg: 'linear-gradient(170deg, #064e3b 0%, #065f46 42%, #047857 100%)', btn: 'linear-gradient(135deg, #059669, #047857)', btnShadow: '0 14px 30px -12px rgba(5,150,105,0.65)', dot: '#059669', dotDim: 'rgba(5,150,105,0.25)' },
  INSURER:  { bg: 'linear-gradient(170deg, #1E1B4B 0%, #2E1065 42%, #5B21B6 100%)', btn: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', btnShadow: '0 14px 30px -12px rgba(124,58,237,0.65)', dot: '#7c3aed', dotDim: 'rgba(124,58,237,0.25)' },
};

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
      id: ['Ada manusia di balik teknologi', 'Mitra berlisensi dan asisten Pathy siap bantu 24/7 — dari pilih polis sampai proses klaim.'],
      en: ['Real humans behind the tech', 'Licensed agents and Pathy assistant, ready 24/7 — from choosing a policy to settling a claim.'],
    },
  ],
  AGENT: [
    {
      Art: ObWelcome,
      id: ['Kantor asuransi di genggaman', 'Selamat datang, Mitra SurePath. Dashboard bisnis, polis, dan klien Anda — rapi dalam satu aplikasi berstandar perbankan.'],
      en: ['Your insurance office, in hand', 'Welcome, SurePath Partner. Your business dashboard, policies, and clients — organized in one bank-grade app.'],
    },
    {
      Art: ObQuote,
      id: ['Buat penawaran dalam hitungan detik', 'Hitung premi tarif resmi OJK, terbitkan quotation slip PDF profesional, dan kirim ke klien langsung dari aplikasi.'],
      en: ['Quotes in seconds', 'Calculate official OJK rates, generate a professional PDF quotation slip, and send it to clients straight from the app.'],
    },
    {
      Art: ObWallet,
      id: ['Komisi transparan, cair cepat', 'Pantau komisi per polis secara real-time di dompet Anda dan tarik dana langsung ke rekening bank.'],
      en: ['Transparent commission, fast payout', 'Track commission per policy in real time and withdraw straight to your bank account.'],
    },
    {
      Art: ObGrowth,
      id: ['Naik level bersama tim Anda', 'Kelola klien, kembangkan jaringan mitra, kejar peringkat leaderboard, dan raih tier Elite dengan benefit eksklusif.'],
      en: ['Level up with your team', 'Manage clients, grow your partner network, climb the leaderboard, and reach Elite tier with exclusive benefits.'],
    },
  ],
  OPERATOR: [
    {
      Art: ObOpsQueue,
      id: ['Pusat kendali operasional', 'Semua antrean — polis, klaim, penarikan, verifikasi — masuk real-time ke satu dashboard. Notifikasi pop-up otomatis setiap ada pengajuan baru.'],
      en: ['Your operations command center', 'Every queue — policies, claims, withdrawals, verifications — flows in real time to one dashboard, with automatic pop-up alerts.'],
    },
    {
      Art: ObOpsReview,
      id: ['Review cepat, keputusan tepat', 'Periksa dokumen, foto kendaraan, dan skor AI survey dalam satu layar — lalu setujui, minta info, atau tolak dengan satu ketukan.'],
      en: ['Fast review, right decision', 'Check documents, vehicle photos, and AI survey scores on one screen — then approve, request info, or decline in one tap.'],
    },
    {
      Art: ObOpsPayout,
      id: ['Pencairan dana yang aman', 'Proses penarikan komisi agen dengan persetujuan berlapis L1/L2/L3 — setiap rupiah tercatat dan terjaga.'],
      en: ['Payouts, guarded', 'Process agent withdrawals with layered L1/L2/L3 approvals — every rupiah logged and protected.'],
    },
    {
      Art: ObOpsVerify,
      id: ['Jaga kualitas jaringan mitra', 'Verifikasi agen baru, tinjau kelengkapan dokumen, dan pastikan hanya mitra terpercaya yang mewakili SurePath.'],
      en: ['Keep the partner network strong', 'Verify new agents, review their documents, and make sure only trusted partners represent SurePath.'],
    },
  ],
  INSURER: [
    {
      Art: ObOpsQueue,
      id: ['Pengajuan masuk secara real-time', 'Setiap penutupan yang ditempatkan SurePath ke perusahaan Anda langsung muncul di dashboard — lengkap dengan notifikasi pop-up.'],
      en: ['Submissions arrive in real time', 'Every placement SurePath routes to your company appears instantly on your dashboard, with pop-up alerts.'],
    },
    {
      Art: ObOpsReview,
      id: ['Review lengkap dalam satu layar', 'Data nasabah, detail kendaraan, foto, dan skor AI survey — lalu setujui, minta info tambahan, atau tolak dengan satu ketukan.'],
      en: ['Full review on one screen', 'Customer data, vehicle details, photos, and AI survey scores — approve, request info, or decline in one tap.'],
    },
    {
      Art: ObInsIssue,
      id: ['Terbitkan polis tanpa hambatan', 'Upload PDF polis beserta nomornya — nasabah dan tim SurePath langsung menerima notifikasi penerbitan.'],
      en: ['Issue policies without friction', 'Upload the policy PDF with its number — the customer and SurePath team are notified instantly.'],
    },
    {
      Art: ObWallet,
      id: ['Pantau premi & pembayaran', 'Lacak pembayaran premi setiap polis yang Anda terbitkan — transparan, tercatat, dan real-time.'],
      en: ['Track premiums & payments', 'Follow premium payments for every policy you issue — transparent, logged, and real-time.'],
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

  const accent = ACCENT[role];

  return (
    <div className={`fixed inset-0 z-[3000] flex flex-col transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: accent.bg }}>
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
        <AgentArtKeyframes />
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
                style={{ width: i === step ? 26 : 8, height: 8, background: i === step ? accent.dot : accent.dotDim }} />
            ))}
          </div>

          <button onClick={() => (last ? finish() : setStep(s => s + 1))}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-[0.98]"
            style={{ background: accent.btn, boxShadow: accent.btnShadow }}>
            {last ? (isID ? 'Mulai Sekarang' : 'Get Started') : (isID ? 'Lanjut' : 'Next')}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
