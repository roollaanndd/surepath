import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Car,
  Plane,
  Shield,
  Package,
  Heart,
  Building2,
  Lock,
  Scale,
  Anchor,
  Users,
  Star,
  CheckCircle2,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  Cpu,
  Camera,
  Wallet,
  ShieldCheck,
  LineChart,
  Globe,
  ChevronDown,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Phone,
  Mail,
  Bell,
  Award,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { Language } from '../../types';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
}

// ---------- Reveal hook ----------
const useReveal = <T extends HTMLElement>(threshold = 0.15) => {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible } as const;
};

// ---------- Reveal wrapper ----------
const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
};

const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const t = (en: string, id: string) => (lang === Language.EN ? en : id);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleLang = () => setLang(lang === Language.EN ? Language.ID : Language.EN);
  const toggleDark = () => setDarkMode(!darkMode);

  const navLinks = [
    { href: '#products', label: t('Products', 'Produk') },
    { href: '#how-it-works', label: t('How it works', 'Cara Kerja') },
    { href: '#business', label: t('Business', 'Bisnis') },
    { href: '#technology', label: t('Technology', 'Teknologi') },
    { href: '#agents', label: t('Agents', 'Agen') },
  ];

  const products = [
    {
      icon: Car,
      title: t('Car Insurance', 'Asuransi Mobil'),
      desc: t(
        'Complete car protection. Claim with a photo, done in minutes.',
        'Perlindungan mobil lengkap. Klaim lewat foto, selesai dalam menit.'
      ),
      bg: 'bg-blue-500/10',
      ring: 'group-hover:ring-blue-500/40',
      glow: 'group-hover:shadow-blue-500/20',
      iconColor: 'text-blue-500',
    },
    {
      icon: Plane,
      title: t('Travel Insurance', 'Asuransi Perjalanan'),
      desc: t(
        'The world is your destination. We protect you every step of the way.',
        'Dunia adalah tujuanmu. Kami jaga kamu di setiap langkah.'
      ),
      bg: 'bg-emerald-500/10',
      ring: 'group-hover:ring-emerald-500/40',
      glow: 'group-hover:shadow-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    {
      icon: Shield,
      title: t('Personal Accident', 'Kecelakaan Diri'),
      desc: t(
        'Fast compensation when the unexpected happens. Sign up in 60 seconds.',
        'Santunan cepat jika hal tak terduga terjadi. Daftar dalam 60 detik.'
      ),
      bg: 'bg-rose-500/10',
      ring: 'group-hover:ring-rose-500/40',
      glow: 'group-hover:shadow-rose-500/20',
      iconColor: 'text-rose-500',
    },
    {
      icon: Package,
      title: t('Gadget Protection', 'Proteksi Gadget'),
      desc: t(
        'Phones, laptops, cameras protect everything you carry.',
        'HP, laptop, kamera lindungi semua barang berhargamu.'
      ),
      bg: 'bg-amber-500/10',
      ring: 'group-hover:ring-amber-500/40',
      glow: 'group-hover:shadow-amber-500/20',
      iconColor: 'text-amber-500',
    },
    {
      icon: Heart,
      title: t('Family Health', 'Kesehatan Keluarga'),
      desc: t(
        'Easier hospital access with the SurePath digital card.',
        'Akses rumah sakit lebih mudah dengan kartu digital SurePath.'
      ),
      bg: 'bg-pink-500/10',
      ring: 'group-hover:ring-pink-500/40',
      glow: 'group-hover:shadow-pink-500/20',
      iconColor: 'text-pink-500',
    },
  ];

  const corporate = [
    {
      icon: Building2,
      title: t('Fleet Management', 'Manajemen Armada'),
      desc: t('Centralized protection for your entire vehicle fleet.', 'Proteksi terpusat untuk seluruh armada kendaraan kamu.'),
    },
    {
      icon: Lock,
      title: t('Cyber Shield', 'Cyber Shield'),
      desc: t('Defend against breaches, ransomware, and data loss.', 'Lindungi dari peretasan, ransomware, dan kehilangan data.'),
    },
    {
      icon: Scale,
      title: t('Liability Protection', 'Proteksi Liabilitas'),
      desc: t('Professional and general liability coverage that scales.', 'Liabilitas profesional dan umum yang dapat diskalakan.'),
    },
    {
      icon: Anchor,
      title: t('Marine & Cargo', 'Marine & Cargo'),
      desc: t('Protect goods in transit across land, sea, and air.', 'Lindungi barang di darat, laut, dan udara.'),
    },
    {
      icon: Users,
      title: t('Employee Benefits', 'Tunjangan Karyawan'),
      desc: t('Group health, life and accident packages for your team.', 'Paket kesehatan, jiwa, dan kecelakaan untuk tim kamu.'),
    },
  ];

  const steps = [
    {
      n: '01',
      icon: Shield,
      title: t('Choose Protection', 'Pilih Proteksi'),
      desc: t(
        'Pick the product that fits your needs. An automatic premium calculator helps you decide.',
        'Pilih produk yang sesuai kebutuhan kamu. Kalkulator premi otomatis siap membantu.'
      ),
    },
    {
      n: '02',
      icon: Wallet,
      title: t('Pay & Activate Instantly', 'Bayar & Aktif Seketika'),
      desc: t(
        'Your policy is active right after payment. No more waiting days.',
        'Polis langsung aktif setelah pembayaran. Tidak perlu tunggu hari lagi.'
      ),
    },
    {
      n: '03',
      icon: Camera,
      title: t('Claim as Easy as a Photo', 'Klaim Semudah Foto'),
      desc: t(
        'Snap a photo, send it, and AI processes the claim in minutes.',
        'Ambil foto, kirim, dan klaim diproses AI dalam hitungan menit.'
      ),
    },
  ];

  const features = [
    {
      emoji: '🤖',
      icon: Cpu,
      title: t('AI Underwriting', 'AI Underwriting'),
      desc: t('Automated risk scoring no manual queues.', 'Penilaian risiko otomatis tanpa antre manual.'),
    },
    {
      emoji: '📸',
      icon: Camera,
      title: t('Vision Claims', 'Vision Claims'),
      desc: t('Photo of damage AI assesses claim approved.', 'Foto kerusakan AI menilai klaim disetujui.'),
    },
    {
      emoji: '💰',
      icon: Wallet,
      title: t('Instant Payout', 'Instant Payout'),
      desc: t('Claim funds land directly in your bank account.', 'Dana klaim langsung masuk ke rekening kamu.'),
    },
    {
      emoji: '🔒',
      icon: ShieldCheck,
      title: t('End-to-End Encryption', 'Enkripsi End-to-End'),
      desc: t('Bank-grade encryption keeps your data safe.', 'Data kamu aman dengan enkripsi level bank.'),
    },
    {
      emoji: '📊',
      icon: LineChart,
      title: t('Realtime Dashboard', 'Dashboard Real-time'),
      desc: t('Track every policy and claim on one screen.', 'Pantau semua polis dan klaim dalam satu layar.'),
    },
    {
      emoji: '🌐',
      icon: Globe,
      title: t('Multi-Insurer', 'Multi-Asuransi'),
      desc: t('Compare and choose from 40+ trusted partners.', 'Bandingkan dan pilih dari 40+ mitra asuransi terpercaya.'),
    },
  ];

  const testimonials = [
    {
      quote: t(
        'My car claim was settled in 8 minutes. I would not believe it without trying it myself.',
        'Klaim mobil saya selesai dalam 8 menit. Tidak percaya kalau tidak coba sendiri.'
      ),
      name: 'Budi S.',
      role: t('Jakarta · Driver', 'Jakarta · Pengemudi'),
      initial: 'B',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      quote: t(
        'Finally an insurance that is genuinely easy. Sign up on my phone, active right away.',
        'Akhirnya asuransi yang benar-benar mudah. Daftar di HP, langsung aktif.'
      ),
      name: 'Rina M.',
      role: t('Surabaya · Customer', 'Surabaya · Pelanggan'),
      initial: 'R',
      color: 'from-pink-500 to-rose-600',
    },
    {
      quote: t(
        'Managing a fleet of 50 vehicles is far easier with the SurePath dashboard.',
        'Manajemen fleet 50 kendaraan jadi jauh lebih mudah dengan dashboard SurePath.'
      ),
      name: 'PT Maju Bersama',
      role: t('Logistics · Corporate', 'Logistik · Korporat'),
      initial: 'M',
      color: 'from-blue-500 to-indigo-600',
    },
  ];

  const faqs = [
    {
      q: t('Is SurePath registered with OJK?', 'Apakah SurePath sudah terdaftar di OJK?'),
      a: t(
        'Yes. SurePath operates under the supervision of Indonesia Financial Services Authority (OJK) and partners only with licensed insurers.',
        'Ya. SurePath beroperasi di bawah pengawasan Otoritas Jasa Keuangan (OJK) dan bermitra hanya dengan perusahaan asuransi berlisensi.'
      ),
    },
    {
      q: t('How long does the claim process take?', 'Berapa lama proses klaim berlangsung?'),
      a: t(
        'Most photo-based claims are processed in under 5 minutes through Vision Claims. Complex cases may take up to 24 hours for human review.',
        'Sebagian besar klaim berbasis foto diproses dalam kurang dari 5 menit melalui Vision Claims. Kasus kompleks dapat memakan waktu hingga 24 jam untuk peninjauan manusia.'
      ),
    },
    {
      q: t('Are there hidden fees?', 'Apakah ada biaya tersembunyi?'),
      a: t(
        'No. The premium displayed in the app is the final amount. No platform fees, no surprises at claim time.',
        'Tidak. Premi yang ditampilkan di aplikasi adalah jumlah akhir. Tidak ada biaya platform, tidak ada kejutan saat klaim.'
      ),
    },
    {
      q: t('Can it be used for company insurance?', 'Bisa digunakan untuk asuransi perusahaan?'),
      a: t(
        'Absolutely. Our Business suite covers fleets, cyber, liability, marine, cargo, and employee benefits with a dedicated corporate dashboard.',
        'Tentu. Paket Bisnis kami mencakup armada, cyber, liabilitas, marine, kargo, dan tunjangan karyawan dengan dasbor korporat khusus.'
      ),
    },
    {
      q: t('How do I become a SurePath agent?', 'Bagaimana cara menjadi agen SurePath?'),
      a: t(
        'Sign up through the Agent page, complete a short training, and start earning commissions from your first sale.',
        'Daftar melalui halaman Agen, ikuti pelatihan singkat, dan mulai dapatkan komisi sejak penjualan pertama.'
      ),
    },
    {
      q: t('Is my data safe?', 'Apakah data saya aman?'),
      a: t(
        'Yes. We use bank-grade end-to-end encryption, ISO 27001 controls, and we never sell your personal data.',
        'Ya. Kami menggunakan enkripsi end-to-end kelas perbankan, kontrol ISO 27001, dan tidak pernah menjual data pribadi kamu.'
      ),
    },
  ];

  const tickerItems = [
    t('50,000+ Active Policies', '50.000+ Polis Aktif'),
    t('Rp 2T+ Claims Paid', 'Rp 2T+ Klaim Dibayar'),
    t('< 5 Min Average Claim', '< 5 Menit Rata-rata Klaim'),
    t('OJK Registered & Supervised', 'Terdaftar & Diawasi OJK'),
    t('4.9 User Rating', '4.9 Rating Pengguna'),
    t('40+ Insurance Partners', '40+ Mitra Asuransi'),
    t('24/7 Support', '24/7 Dukungan'),
  ];

  // Local style block (keyframes + helpers)
  const stylesheet = `
    @keyframes spMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes spFloat { 0%,100% { transform: translateY(0) rotate(var(--r, 0deg)); } 50% { transform: translateY(-14px) rotate(var(--r, 0deg)); } }
    @keyframes spFloatSlow { 0%,100% { transform: translateY(0) rotate(var(--r, 0deg)); } 50% { transform: translateY(-22px) rotate(var(--r, 0deg)); } }
    @keyframes spMeshShift {
      0% { background-position: 0% 0%, 100% 0%, 50% 100%; }
      50% { background-position: 100% 50%, 0% 100%, 50% 0%; }
      100% { background-position: 0% 0%, 100% 0%, 50% 100%; }
    }
    @keyframes spPulseRing { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
    @keyframes spBarGrow { 0% { transform: scaleY(0.3); } 100% { transform: scaleY(1); } }
    @keyframes spLineMove { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
    @keyframes spOrb { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.1); } 66% { transform: translate(-30px,20px) scale(0.95); } }
    @keyframes spBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    .sp-mesh {
      background-image:
        radial-gradient(at 20% 30%, rgba(16,185,129,0.35) 0px, transparent 50%),
        radial-gradient(at 80% 20%, rgba(20,184,166,0.30) 0px, transparent 50%),
        radial-gradient(at 60% 80%, rgba(5,150,105,0.30) 0px, transparent 50%);
      background-size: 200% 200%, 200% 200%, 200% 200%;
      animation: spMeshShift 18s ease-in-out infinite;
    }
    .sp-dotgrid {
      background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .sp-dotgrid-light {
      background-image: radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .sp-line-anim {
      background-image: linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.7) 50%, transparent 100%);
      background-size: 200% 100%;
      animation: spLineMove 3s linear infinite;
    }
    .sp-marquee-track { animation: spMarquee 38s linear infinite; }
    .sp-float { animation: spFloat 6s ease-in-out infinite; }
    .sp-float-slow { animation: spFloatSlow 9s ease-in-out infinite; }
    .sp-orb { animation: spOrb 14s ease-in-out infinite; }
    .sp-pulse-ring { animation: spPulseRing 2.2s ease-out infinite; }
    .sp-blink { animation: spBlink 1.6s ease-in-out infinite; }
  `;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#080808] text-slate-900 dark:text-white font-sans antialiased transition-colors duration-500 selection:bg-emerald-500/30 selection:text-emerald-50 overflow-x-hidden">
      <style>{stylesheet}</style>

      {/* ===================== NAVBAR ===================== */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 group">
            <img
              src="/logo.svg"
              alt="SurePath"
              className="w-9 h-9 rounded-xl object-contain transition-transform group-hover:scale-105"
            />
            <span className={`font-black text-xl sm:text-2xl tracking-tight ${isScrolled ? '' : 'text-white'}`}>
              Sure<span className="text-emerald-500">Path</span>
            </span>
          </a>

          <div className={`hidden lg:flex items-center gap-8 text-sm font-semibold transition-colors ${isScrolled ? 'text-slate-600 dark:text-gray-300' : 'text-gray-200'}`}>
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative hover:text-emerald-500 transition-colors after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-emerald-500 hover:after:w-full after:transition-all"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLang}
              className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-bold transition-colors ${
                isScrolled
                  ? 'border-slate-200 dark:border-white/15 text-slate-600 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-500'
                  : 'border-white/20 text-gray-200 hover:border-emerald-400 hover:text-emerald-300'
              }`}
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === Language.EN ? 'EN' : 'ID'}
            </button>
            <button
              onClick={toggleDark}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
                isScrolled
                  ? 'border-slate-200 dark:border-white/15 text-slate-600 dark:text-gray-300 hover:text-emerald-500 hover:border-emerald-500'
                  : 'border-white/20 text-gray-200 hover:text-emerald-300 hover:border-emerald-400'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onSignIn}
              className={`hidden md:inline-flex items-center h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                isScrolled ? 'text-slate-700 dark:text-gray-200 hover:text-emerald-500' : 'text-gray-200 hover:text-emerald-300'
              }`}
            >
              {t('Sign In', 'Masuk')}
            </button>
            <button
              onClick={onSignIn}
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-px"
            >
              {t('Get Started', 'Mulai Sekarang')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border ${
                isScrolled ? 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-gray-200' : 'border-white/20 text-gray-200'
              }`}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-[#080808] text-slate-900 dark:text-white flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="SurePath" className="w-9 h-9 rounded-xl" />
              <span className="font-black text-xl">
                Sure<span className="text-emerald-500">Path</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/15 flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 px-6 py-10 flex flex-col gap-6 text-2xl font-bold">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-emerald-500 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="px-6 py-6 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleLang}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-200 dark:border-white/15 text-sm font-bold"
              >
                <Globe className="w-4 h-4" />
                {lang === Language.EN ? 'EN' : 'ID'}
              </button>
              <button
                onClick={toggleDark}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-200 dark:border-white/15 text-sm font-bold"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode ? t('Light', 'Terang') : t('Dark', 'Gelap')}
              </button>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignIn();
              }}
              className="h-12 rounded-full border border-slate-200 dark:border-white/15 font-semibold"
            >
              {t('Sign In', 'Masuk')}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignIn();
              }}
              className="h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/30"
            >
              {t('Get Started', 'Mulai Sekarang')}
            </button>
          </div>
        </div>
      )}

      {/* ===================== HERO ===================== */}
      <section id="top" className="relative min-h-screen flex items-center overflow-hidden bg-[#050505] text-white">
        {/* Mesh gradient layer */}
        <div className="absolute inset-0 sp-mesh opacity-90" />
        {/* Dot grid */}
        <div className="absolute inset-0 sp-dotgrid opacity-40" />
        {/* Floating orbs */}
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-emerald-500/25 blur-[120px] animate-pulse sp-orb"
          style={{ animationDuration: '7s' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full bg-teal-500/20 blur-[120px] animate-pulse sp-orb"
          style={{ animationDelay: '1.4s', animationDuration: '9s' }}
        />
        <div
          className="absolute -bottom-40 left-1/3 w-[460px] h-[460px] rounded-full bg-emerald-400/15 blur-[120px] animate-pulse sp-orb"
          style={{ animationDelay: '0.7s', animationDuration: '11s' }}
        />
        {/* dark vignette so even in light mode the hero is dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#050505]" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 w-full pt-32 pb-24 grid lg:grid-cols-12 gap-12 items-center">
          {/* LEFT */}
          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-semibold text-emerald-300">
                <span className="relative inline-flex items-center justify-center w-2 h-2">
                  <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 sp-pulse-ring" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                {t('Now Live · Digital Protection', 'Sekarang Live · Proteksi Digital')}
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="mt-6 font-black tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-[0.95]">
                {t('Protection that is ', 'Proteksi yang ')}
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
                  {t('always there for you.', 'selalu ada untukmu.')}
                </span>
              </h1>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-6 max-w-xl text-base sm:text-lg text-gray-300 leading-relaxed">
                {t(
                  'Vehicle, travel, health insurance and more everything in one app. Sign up in 2 minutes, claim in 5.',
                  'Asuransi kendaraan, perjalanan, kesehatan, dan lebih semuanya dalam satu aplikasi. Daftar dalam 2 menit, klaim dalam 5 menit.'
                )}
              </p>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  onClick={onSignIn}
                  className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-400/50 transition-all hover:-translate-y-0.5"
                >
                  {t('Start Free', 'Mulai Gratis')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/15 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white font-semibold text-sm transition-all"
                >
                  {t('Watch Demo', 'Lihat Demo')}
                </a>
              </div>
            </Reveal>
            <Reveal delay={420}>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t('OJK Registered', 'Terdaftar OJK')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t('No hidden fees', 'Tanpa biaya tersembunyi')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t('Easy claims', 'Klaim mudah')}
                </span>
              </div>
            </Reveal>
          </div>

          {/* RIGHT floating mockup cards */}
          <div className="lg:col-span-5 relative hidden lg:block h-[560px]">
            {/* Policy card */}
            <div
              className="absolute top-0 right-0 w-[360px] rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl p-6 shadow-2xl shadow-emerald-500/10 sp-float-slow"
              style={{ ['--r' as any]: '-3deg', transform: 'rotate(-3deg) perspective(1200px) rotateX(6deg)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-medium">{t('Policy', 'Polis')}</div>
                    <div className="text-sm font-bold">SP-2026-08842</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {t('Active', 'Aktif')}
                </span>
              </div>
              <div className="mt-5">
                <div className="text-[11px] uppercase tracking-wider text-gray-400">
                  {t('Coverage', 'Perlindungan')}
                </div>
                <div className="text-xl font-extrabold mt-0.5">{t('Active Car Insurance', 'Asuransi Mobil Aktif')}</div>
                <div className="text-xs text-gray-400 mt-1">Toyota Avanza · B 1234 ABC</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                  <div className="text-gray-400">{t('Premium', 'Premi')}</div>
                  <div className="text-white font-bold mt-0.5">Rp 2.4jt/yr</div>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                  <div className="text-gray-400">{t('Valid until', 'Berlaku s/d')}</div>
                  <div className="text-white font-bold mt-0.5">22 May 2027</div>
                </div>
              </div>
            </div>

            {/* Claim approved notification */}
            <div
              className="absolute top-[260px] -left-6 w-[300px] rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl p-4 shadow-2xl shadow-emerald-500/10 sp-float"
              style={{ ['--r' as any]: '4deg', transform: 'rotate(4deg)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">
                      {t('Claim Approved', 'Klaim Disetujui')}
                    </span>
                    <Bell className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-sm font-bold mt-0.5">Rp 4.250.000</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {t('Funds sent to BCA · just now', 'Dana dikirim ke BCA · baru saja')}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Score mini card */}
            <div
              className="absolute bottom-2 right-4 w-[230px] rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl p-4 shadow-2xl shadow-emerald-500/10 sp-float"
              style={{ ['--r' as any]: '-2deg', transform: 'rotate(-2deg)', animationDelay: '1.2s' }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-gray-400">AI Score</div>
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-3xl font-black bg-gradient-to-br from-emerald-300 to-teal-500 bg-clip-text text-transparent">
                  982
                </div>
                <div className="text-xs text-emerald-300 font-semibold pb-1">+18</div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[88%] bg-gradient-to-r from-emerald-400 to-teal-400" />
              </div>
              <div className="mt-2 text-[10px] text-gray-400">
                {t('Low risk · eligible discount', 'Risiko rendah · diskon tersedia')}
              </div>
            </div>
          </div>
        </div>

        {/* fade out to next section */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-[#050505] pointer-events-none" />
      </section>

      {/* ===================== TICKER ===================== */}
      <section className="relative bg-[#050505] text-white py-6 border-y border-white/5 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="relative flex sp-marquee-track whitespace-nowrap will-change-transform">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((it, i) => (
            <div key={i} className="flex items-center gap-10 px-10 text-sm font-bold text-gray-300">
              <span>{it}</span>
              <span className="text-emerald-500">●</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== PRODUCTS ===================== */}
      <section id="products" className="relative py-24 sm:py-32 bg-stone-50 dark:bg-[#080808]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-3xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                {t('For You', 'Untukmu')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                {t('Everything you need, ', 'Semua yang kamu butuhkan, ')}
                <span className="text-emerald-500">{t('in one place.', 'dalam satu tempat.')}</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-gray-400 max-w-2xl">
                {t(
                  'Curated insurance products designed for Indonesians simple to buy, simpler to claim.',
                  'Produk asuransi pilihan untuk orang Indonesia mudah dibeli, lebih mudah diklaim.'
                )}
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {products.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.title} delay={i * 80}>
                  <div
                    className={`group relative h-full rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 p-6 ring-1 ring-transparent ${p.ring} hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-2xl ${p.glow}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${p.bg} flex items-center justify-center mb-5`}>
                      <Icon className={`w-6 h-6 ${p.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-extrabold tracking-tight">{p.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400 leading-relaxed">{p.desc}</p>
                    <button
                      onClick={onSignIn}
                      className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:gap-2 transition-all"
                    >
                      {t('Learn more', 'Pelajari')}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-transparent via-transparent to-emerald-500/[0.04]" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== BUSINESS ===================== */}
      <section id="business" className="relative py-24 sm:py-32 bg-slate-900 dark:bg-black text-white overflow-hidden">
        <div className="absolute inset-0 sp-dotgrid opacity-30" />
        <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute -bottom-40 -left-20 w-[420px] h-[420px] rounded-full bg-teal-500/10 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-400">
                <Building2 className="w-3.5 h-3.5" />
                {t('For Business', 'Untuk Bisnis')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                {t('SurePath ', 'SurePath ')}
                <span className="text-emerald-400">{t('for your business.', 'untuk bisnis kamu.')}</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 text-base sm:text-lg text-gray-300 max-w-xl">
                {t(
                  'Integrated corporate insurance solutions for companies of every size.',
                  'Solusi asuransi korporat terintegrasi untuk perusahaan dari semua ukuran.'
                )}
              </p>
            </Reveal>

            <div className="mt-10 flex flex-col gap-3">
              {corporate.map((c, i) => {
                const Icon = c.icon;
                return (
                  <Reveal key={c.title} delay={i * 70}>
                    <div className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-500/40 p-4 transition-all">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{c.title}</div>
                        <div className="text-xs sm:text-sm text-gray-400">{c.desc}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={300}>
              <button
                onClick={onSignIn}
                className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-2xl shadow-emerald-500/30 hover:-translate-y-0.5 transition-all"
              >
                {t('Contact Business Team', 'Hubungi Tim Bisnis')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Reveal>
          </div>

          {/* Right dashboard mockup */}
          <Reveal delay={200}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent blur-2xl" />
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                      {t('Corporate Dashboard', 'Dashboard Korporat')}
                    </div>
                    <div className="text-lg font-extrabold mt-0.5">PT Maju Bersama</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 sp-blink" />
                    <span className="text-xs text-gray-400 font-medium">{t('Live', 'Aktif')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: t('Policies', 'Polis'), value: '147', sub: '+12' },
                    { label: t('Claims', 'Klaim'), value: '23', sub: t('this mo.', 'bln ini') },
                    { label: t('Saved', 'Hemat'), value: 'Rp 1.2M', sub: 'YTD' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-2xl bg-black/30 border border-white/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-gray-400">{kpi.label}</div>
                      <div className="text-xl font-extrabold mt-1">{kpi.value}</div>
                      <div className="text-[10px] text-emerald-400 font-bold">{kpi.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Bar chart */}
                <div className="rounded-2xl bg-black/30 border border-white/5 p-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-gray-300">
                      {t('Claim Activity', 'Aktivitas Klaim')}
                    </div>
                    <div className="text-[10px] text-gray-500">12w</div>
                  </div>
                  <div className="flex items-end gap-1.5 h-24">
                    {[40, 65, 50, 80, 60, 90, 70, 95, 78, 88, 70, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 origin-bottom"
                        style={{
                          height: `${h}%`,
                          animation: 'spBarGrow 1s ease-out',
                          animationDelay: `${i * 60}ms`,
                          animationFillMode: 'both',
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Activity rows */}
                <div className="space-y-2">
                  {[
                    { c: 'B 8821 XX', s: t('Approved', 'Disetujui'), ok: true },
                    { c: 'B 2210 KL', s: t('Processing', 'Diproses'), ok: false },
                    { c: 'D 1142 PR', s: t('Approved', 'Disetujui'), ok: true },
                  ].map((r) => (
                    <div key={r.c} className="flex items-center justify-between rounded-xl bg-black/20 border border-white/5 px-3 py-2 text-xs">
                      <span className="font-mono text-gray-300">{r.c}</span>
                      <span
                        className={`font-bold ${
                          r.ok ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {r.s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how-it-works" className="relative py-24 sm:py-32 bg-stone-50 dark:bg-[#080808]">
        <div className="absolute inset-0 sp-dotgrid-light dark:hidden opacity-60" />
        <div className="absolute inset-0 sp-dotgrid hidden dark:block opacity-40" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                {t('How it works', 'Cara Kerja')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                {t('From signup to claim, ', 'Dari daftar sampai klaim, ')}
                <span className="text-emerald-500">{t('just 3 steps.', 'cuma 3 langkah.')}</span>
              </h2>
            </Reveal>
          </div>

          <div className="relative mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {/* connecting line behind */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px sp-line-anim" />
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.n} delay={i * 120}>
                  <div className="relative text-center md:text-left">
                    <div className="relative inline-flex flex-col items-center md:items-start">
                      <div className="relative w-24 h-24 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-md flex items-center justify-center mb-6">
                        <Icon className="w-9 h-9 text-emerald-500" />
                        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-widest">
                          {s.n}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight">{s.title}</h3>
                    <p className="mt-3 text-slate-600 dark:text-gray-400 leading-relaxed max-w-sm md:max-w-none">
                      {s.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== TECHNOLOGY ===================== */}
      <section id="technology" className="relative py-24 sm:py-32 bg-white dark:bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-1/3 -left-32 w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-3.5 h-3.5" />
                {t('Technology', 'Teknologi')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                {t('Technology that ', 'Teknologi yang ')}
                <span className="text-emerald-500">{t('works for you.', 'bekerja untuk kamu.')}</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-gray-400 max-w-xl">
                {t(
                  'Modern engineering under a friendly interface built so insurance feels effortless.',
                  'Rekayasa modern di balik antarmuka yang ramah dibuat agar asuransi terasa mudah.'
                )}
              </p>
            </Reveal>

            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.title} delay={i * 70}>
                    <div className="group rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg" aria-hidden>
                          {f.emoji}
                        </span>
                        <Icon className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-extrabold tracking-tight">{f.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-gray-400">{f.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* Right phone mockup */}
          <Reveal delay={200}>
            <div className="relative flex justify-center">
              <div className="absolute inset-0 mx-auto w-[280px] sm:w-[320px] rounded-[3rem] bg-gradient-to-tr from-emerald-500/30 to-teal-500/10 blur-3xl" />
              <div className="relative w-[280px] sm:w-[320px] aspect-[9/19] rounded-[3rem] bg-[#0a0a0a] border-[10px] border-[#181818] shadow-[0_30px_80px_-20px_rgba(16,185,129,0.4)] overflow-hidden">
                {/* notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-10" />
                {/* screen */}
                <div className="absolute inset-0 p-5 pt-10 text-white text-[11px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-400">{t('Hi, Budi', 'Hai, Budi')}</div>
                      <div className="font-extrabold text-base">{t('Your Protection', 'Proteksi Kamu')}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-black">
                      B
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4">
                    <div className="text-[10px] uppercase tracking-wider opacity-80">
                      {t('Total Coverage', 'Total Pertanggungan')}
                    </div>
                    <div className="text-xl font-black mt-1">Rp 850.000.000</div>
                    <div className="mt-3 flex items-center justify-between text-[10px] opacity-90">
                      <span>3 {t('active policies', 'polis aktif')}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/20">{t('Healthy', 'Sehat')}</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      { i: Car, label: t('Avanza B 1234', 'Avanza B 1234'), s: t('Active', 'Aktif'), c: 'bg-blue-500/20 text-blue-300' },
                      { i: Plane, label: t('Bali Trip', 'Bali Trip'), s: '3d', c: 'bg-emerald-500/20 text-emerald-300' },
                      { i: Heart, label: t('Family Health', 'Kesehatan Keluarga'), s: 'OK', c: 'bg-pink-500/20 text-pink-300' },
                    ].map((row, idx) => {
                      const RI = row.i;
                      return (
                        <div key={idx} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${row.c}`}>
                            <RI className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-[12px]">{row.label}</div>
                            <div className="text-[9px] text-gray-400">{t('Tap to view', 'Ketuk untuk lihat')}</div>
                          </div>
                          <div className="text-[10px] font-bold text-emerald-300">{row.s}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 flex items-center gap-3">
                    <Camera className="w-4 h-4 text-emerald-300" />
                    <div className="flex-1">
                      <div className="font-bold text-[12px]">{t('File a claim', 'Ajukan klaim')}</div>
                      <div className="text-[10px] text-gray-300">{t('Snap a photo, we do the rest', 'Foto saja, sisanya kami')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-300" />
                  </div>
                </div>
                {/* home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/30" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== AGENTS ===================== */}
      <section id="agents" className="relative py-24 sm:py-32 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full bg-teal-500/15 blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-700 dark:text-emerald-300">
              <Users className="w-3.5 h-3.5" />
              {t('Agent Network', 'Jaringan Agen')}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
              {t('Become a SurePath agent. ', 'Jadilah Agen SurePath. ')}
              <span className="text-emerald-600 dark:text-emerald-400">
                {t('Earn more.', 'Hasilkan lebih banyak.')}
              </span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-base sm:text-lg text-slate-700 dark:text-gray-300 max-w-2xl mx-auto">
              {t(
                'Join thousands of agents already earning attractive commissions with SurePath.',
                'Bergabunglah dengan ribuan agen yang sudah mendapatkan komisi menarik bersama SurePath.'
              )}
            </p>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { icon: TrendingUp, title: t('Competitive 15%+ Commission', 'Komisi Kompetitif 15%+'), desc: t('Industry-leading payouts on every closed policy.', 'Bayaran terdepan untuk setiap polis yang ditutup.') },
              { icon: Award, title: t('Leaderboard & Bonus', 'Leaderboard & Bonus'), desc: t('Monthly performance bonuses for top agents.', 'Bonus performa bulanan untuk agen terbaik.') },
              { icon: GraduationCap, title: t('Training & 24/7 Support', 'Pelatihan & Support 24/7'), desc: t('Free certifications and a dedicated success team.', 'Sertifikasi gratis dan tim sukses khusus.') },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <Reveal key={b.title} delay={i * 100}>
                  <div className="h-full rounded-3xl bg-white/80 dark:bg-white/5 backdrop-blur-md border border-emerald-200/80 dark:border-emerald-500/20 p-7 text-left hover:-translate-y-1 transition-all shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-extrabold tracking-tight">{b.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">{b.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={400}>
            <button
              onClick={onSignIn}
              className="mt-12 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-2xl shadow-emerald-500/30 hover:-translate-y-0.5 transition-all"
            >
              {t('Register as Agent', 'Daftar Jadi Agen')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section className="relative py-24 sm:py-32 bg-white dark:bg-[#080808]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="max-w-3xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                <Star className="w-3.5 h-3.5" />
                {t('Testimonials', 'Testimoni')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                {t('Trusted by people, ', 'Dipercaya orang, ')}
                <span className="text-emerald-500">{t('proven by stories.', 'dibuktikan cerita.')}</span>
              </h2>
            </Reveal>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {testimonials.map((tm, i) => (
              <Reveal key={tm.name} delay={i * 100}>
                <div className="h-full rounded-3xl border border-slate-200/80 dark:border-white/10 bg-stone-50 dark:bg-white/[0.03] p-7 flex flex-col">
                  <div className="flex items-center gap-1 text-amber-400 mb-5">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-base sm:text-lg font-medium leading-relaxed text-slate-800 dark:text-gray-100 flex-1">
                    &ldquo;{tm.quote}&rdquo;
                  </blockquote>
                  <div className="mt-7 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${tm.color} flex items-center justify-center text-white font-black`}>
                      {tm.initial}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{tm.name}</div>
                      <div className="text-xs text-slate-500 dark:text-gray-400">{tm.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="relative py-24 sm:py-32 bg-stone-50 dark:bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <div className="text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                FAQ
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                {t('Questions, ', 'Pertanyaan, ')}
                <span className="text-emerald-500">{t('answered.', 'kami jawab.')}</span>
              </h2>
            </Reveal>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 60}>
                  <div
                    className={`rounded-2xl border ${
                      open
                        ? 'border-emerald-500/50 bg-white dark:bg-white/[0.04]'
                        : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02]'
                    } transition-colors`}
                  >
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-5"
                      aria-expanded={open}
                    >
                      <span className="font-bold text-base sm:text-lg pr-2">{f.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 shrink-0 text-emerald-500 transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 sm:px-6 pb-5 text-slate-600 dark:text-gray-400 leading-relaxed">
                          {f.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="relative py-28 sm:py-36 bg-[#050505] text-white overflow-hidden">
        <div className="absolute inset-0 sp-mesh opacity-70" />
        <div className="absolute inset-0 sp-dotgrid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/20 blur-[140px] animate-pulse" />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center">
          <Reveal>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02]">
              {t('Ready to start your ', 'Siap memulai perjalanan ')}
              <span className="bg-gradient-to-br from-emerald-300 to-teal-500 bg-clip-text text-transparent">
                {t('protection journey?', 'proteksimu?')}
              </span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              {t(
                'Join 50,000+ Indonesians who already protect what matters with SurePath.',
                'Bergabung dengan 50.000+ orang Indonesia yang sudah melindungi yang berharga bersama SurePath.'
              )}
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base shadow-2xl shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
              >
                {t('Get Started Free', 'Mulai Sekarang Gratis')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 h-14 px-8 rounded-full border border-white/15 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white font-semibold text-base transition-all"
              >
                {t('Sign In to Account', 'Masuk ke Akun')}
              </button>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <p className="mt-6 text-xs text-gray-400">
              {t('No credit card needed. Setup in 2 minutes.', 'Tidak perlu kartu kredit. Setup dalam 2 menit.')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="relative bg-[#050505] text-gray-400 pt-20 pb-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <img src="/logo.svg" alt="SurePath" className="w-9 h-9 rounded-xl" />
                <span className="font-black text-xl text-white">
                  Sure<span className="text-emerald-500">Path</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                {t(
                  'Smart insurance for everyone. Built in Indonesia, made for the world.',
                  'Asuransi pintar untuk semua. Dibuat di Indonesia, untuk dunia.'
                )}
              </p>
              <div className="mt-5 flex items-center gap-3">
                {[Twitter, Linkedin, Instagram, Facebook].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                    aria-label="Social link"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="text-white font-bold text-sm uppercase tracking-widest mb-5">
                {t('Products', 'Produk')}
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  t('Car Insurance', 'Asuransi Mobil'),
                  t('Travel', 'Perjalanan'),
                  t('Health', 'Kesehatan'),
                  t('Gadget', 'Gadget'),
                  t('Business', 'Bisnis'),
                ].map((x) => (
                  <li key={x}>
                    <a href="#products" className="hover:text-emerald-400 transition-colors">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-white font-bold text-sm uppercase tracking-widest mb-5">
                {t('Company', 'Perusahaan')}
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  t('About', 'Tentang'),
                  t('Careers', 'Karier'),
                  t('Press', 'Pers'),
                  t('Partners', 'Mitra'),
                  t('Agents', 'Agen'),
                ].map((x) => (
                  <li key={x}>
                    <a href="#" className="hover:text-emerald-400 transition-colors">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-white font-bold text-sm uppercase tracking-widest mb-5">
                {t('Support', 'Dukungan')}
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <a href="tel:15007873" className="hover:text-emerald-400 transition-colors">
                    1500-SURE (7873)
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <a href="mailto:support@surepath.id" className="hover:text-emerald-400 transition-colors">
                    support@surepath.id
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-emerald-400 transition-colors">
                    {t('Help Center', 'Pusat Bantuan')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    {t('Status', 'Status Sistem')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-white/10 text-xs font-bold text-gray-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {t('OJK Registered', 'Terdaftar OJK')}
              </span>
              <span className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-white/10 text-xs font-bold text-gray-300">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                ISO 27001
              </span>
              <span className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-white/10 text-xs font-bold text-gray-300">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                4.9 / 5.0
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <a href="#" className="hover:text-emerald-400 transition-colors">
                {t('Privacy', 'Privasi')}
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                {t('Terms', 'Ketentuan')}
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                {t('Cookies', 'Cookie')}
              </a>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500">
            (c) {new Date().getFullYear()} SurePath Indonesia. {t('All rights reserved.', 'Hak cipta dilindungi.')} ·{' '}
            <span className="text-gray-400">Asuransi Pintar untuk Semua</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PlatformLanding;
