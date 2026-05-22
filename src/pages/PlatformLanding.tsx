import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  ArrowRight,
  Car,
  Plane,
  Shield,
  Smartphone,
  Heart,
  Camera,
  FileText,
  Send,
  CheckCircle,
  Star,
  ChevronRight,
  Users,
  Clock,
  Award,
  TrendingUp,
} from 'lucide-react';
import { Language } from '../../types';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

// ─── Reveal hook ────────────────────────────────────────────────────────────
const useReveal = <T extends HTMLElement>(threshold = 0.12) => {
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
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible } as const;
};

// ─── Reveal wrapper ──────────────────────────────────────────────────────────
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ─── Canvas Background ───────────────────────────────────────────────────────
const CanvasBackground: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const blobs = [
      { ax: 0.7, ay: 0.5, bx: 0.3, by: 0.7, fx: 0.0007, fy: 0.0011, r: 380, color: darkMode ? 'rgba(124,58,237,' : 'rgba(139,92,246,' },
      { ax: 0.6, ay: 0.4, bx: 0.5, by: 0.5, fx: 0.0009, fy: 0.0006, r: 320, color: darkMode ? 'rgba(37,99,235,' : 'rgba(99,102,241,' },
      { ax: 0.3, ay: 0.6, bx: 0.7, by: 0.3, fx: 0.0005, fy: 0.0013, r: 290, color: darkMode ? 'rgba(5,150,105,' : 'rgba(16,185,129,' },
      { ax: 0.5, ay: 0.3, bx: 0.4, by: 0.6, fx: 0.0011, fy: 0.0008, r: 260, color: darkMode ? 'rgba(217,70,239,' : 'rgba(236,72,153,' },
    ];

    const resizeObs = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    resizeObs.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const alpha = darkMode ? 0.75 : 0.35;
    let t = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      blobs.forEach((b) => {
        const cx = W * (b.ax + b.bx * Math.sin(b.fx * t));
        const cy = H * (b.ay + b.by * Math.cos(b.fy * t));
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        grad.addColorStop(0, `${b.color}${alpha})`);
        grad.addColorStop(1, `${b.color}0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        t += 0.5;
      });
      t += 0.5;

      rafId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [quoteTab, setQuoteTab] = useState(0);
  const [showPrice, setShowPrice] = useState(false);
  const [quoteBrand, setQuoteBrand] = useState('');
  const [quoteYear, setQuoteYear] = useState('');
  const [quoteCoverage, setQuoteCoverage] = useState('');
  const [quoteValue, setQuoteValue] = useState('');
  const [quoteProvince, setQuoteProvince] = useState('');

  const t = (id: string, en: string) => (lang === Language.EN ? en : id);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleLang = () => setLang(lang === Language.EN ? Language.ID : Language.EN);
  const toggleDark = () => setDarkMode(!darkMode);

  // Quote tab labels
  const quoteTabs = [
    { id: 0, label: t('Kendaraan', 'Vehicle') },
    { id: 1, label: t('Perjalanan', 'Travel') },
    { id: 2, label: t('Jiwa', 'Life') },
    { id: 3, label: t('Gadget', 'Gadget') },
  ];

  const products = [
    {
      icon: Car,
      name: t('Kendaraan', 'Vehicle'),
      desc: t('Perlindungan komprehensif mobil & motor dari benturan hingga bencana alam.', 'Comprehensive vehicle protection from collision to natural disasters.'),
      price: t('Rp 1,2 Jt/tahun', 'Rp 1.2M/year'),
      badge: t('Terlaris', 'Best Seller'),
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      icon: Plane,
      name: t('Perjalanan', 'Travel'),
      desc: t('Perjalanan aman ke seluruh dunia dengan perlindungan medis & bagasi.', 'Safe travel worldwide with medical & baggage protection.'),
      price: t('Rp 89rb/trip', 'Rp 89K/trip'),
      badge: '',
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      icon: Shield,
      name: t('Jiwa & PA', 'Life & PA'),
      desc: t('Santunan jiwa dan kecelakaan diri dengan proses klaim super cepat.', 'Life and personal accident benefits with ultra-fast claim processing.'),
      price: t('Rp 120rb/bln', 'Rp 120K/mo'),
      badge: '',
      gradient: 'from-violet-600 to-purple-600',
    },
    {
      icon: Smartphone,
      name: t('Gadget', 'Gadget'),
      desc: t('Lindungi smartphone, laptop, dan elektronik dari kerusakan tak terduga.', 'Protect smartphones, laptops and electronics from unexpected damage.'),
      price: t('Rp 45rb/bln', 'Rp 45K/mo'),
      badge: '',
      gradient: 'from-orange-600 to-rose-600',
    },
    {
      icon: Heart,
      name: t('Kesehatan', 'Health'),
      desc: t('Asuransi kesehatan lengkap dengan jaringan rumah sakit terluas di Indonesia.', 'Complete health insurance with the widest hospital network in Indonesia.'),
      price: t('Rp 250rb/bln', 'Rp 250K/mo'),
      badge: '',
      gradient: 'from-pink-600 to-rose-600',
    },
  ];

  const testimonials = [
    { name: 'Andi Prasetyo', meta: t('Jakarta · Asuransi Mobil', 'Jakarta · Car Insurance'), quote: t('"Proses klaim cuma 10 menit! Foto, upload, selesai. Nggak perlu ribet ke kantor."', '"Claim took just 10 minutes! Photo, upload, done. No hassle going to the office."'), rating: 5, init: 'A' },
    { name: 'Sari Dewi', meta: t('Surabaya · Perjalanan', 'Surabaya · Travel'), quote: t('"Bagasi hilang di Singapura, klaim langsung cair di hari yang sama. Luar biasa!"', '"Luggage lost in Singapore, claim disbursed the same day. Incredible!"'), rating: 5, init: 'S' },
    { name: 'Budi Santoso', meta: t('Bandung · Jiwa & PA', 'Bandung · Life & PA'), quote: t('"SurePath jauh lebih murah dari asuransi konvensional dengan manfaat yang sama."', '"SurePath is much cheaper than conventional insurance with the same benefits."'), rating: 5, init: 'B' },
    { name: 'Ratna Indah', meta: t('Medan · Gadget', 'Medan · Gadget'), quote: t('"HP jatuh dan layar pecah. Klaim disetujui dalam 30 menit. Recommended banget!"', '"Phone dropped, screen cracked. Claim approved in 30 minutes. Highly recommended!"'), rating: 5, init: 'R' },
    { name: 'Denny Kurniawan', meta: t('Bali · Kesehatan', 'Bali · Health'), quote: t('"Asisten AI-nya bantu aku temukan rumah sakit dan langsung proses klaim online."', '"The AI assistant helped me find a hospital and process the claim online instantly."'), rating: 5, init: 'D' },
  ];

  const claimSteps = [
    { icon: Camera, title: t('Foto Insiden', 'Photo Incident'), desc: t('Ambil foto kerusakan langsung dari HP.', 'Take photos of damage directly from your phone.'), time: '~30 dtk', highlight: true },
    { icon: FileText, title: t('Isi Formulir', 'Fill Form'), desc: t('Form singkat 3 field, dibantu AI.', 'Short 3-field form, assisted by AI.'), time: '~1 mnt', highlight: false },
    { icon: Send, title: t('Submit', 'Submit'), desc: t('Kirim laporan langsung ke penanggung.', 'Send report directly to the insurer.'), time: '~10 dtk', highlight: false },
    { icon: CheckCircle, title: t('Lacak Status', 'Track Status'), desc: t('Notifikasi real-time hingga pembayaran.', 'Real-time notifications until payment.'), time: t('Real-time', 'Real-time'), highlight: false },
  ];

  const howItWorks = [
    { num: '01', title: t('Isi Detail', 'Fill Details'), desc: t('Lengkapi informasi kendaraan, tujuan, atau item yang ingin diasuransikan.', 'Complete information about vehicle, destination, or item to be insured.') },
    { num: '02', title: t('Bandingkan Insurer', 'Compare Insurers'), desc: t('Lihat penawaran dari 15+ insurer OJK terdaftar dan pilih yang terbaik.', 'View offers from 15+ OJK-registered insurers and choose the best.') },
    { num: '03', title: t('Bayar & Polis', 'Pay & Get Policy'), desc: t('Bayar online, polis dikirim ke email & WhatsApp dalam 60 detik.', 'Pay online, policy sent to email & WhatsApp in 60 seconds.') },
  ];

  const stats = [
    { val: '50K+', label: t('Polis Aktif', 'Active Policies'), icon: Users },
    { val: 'Rp 2T+', label: t('Total Pertanggungan', 'Total Coverage'), icon: TrendingUp },
    { val: '60 Dtk', label: t('Laporan Klaim', 'Claim Filing'), icon: Clock },
    { val: '4.9★', label: t('8.400+ Ulasan', '8,400+ Reviews'), icon: Award },
  ];

  const insurers = [
    'Sinarmas', 'Astra Insurance', 'Allianz', 'Adira Insurance',
    'Zurich', 'ACA', 'Tugu Insurance', 'Sompo', 'MSIG',
    'Prudential', 'Manulife', 'AXA Mandiri', '+3 Lainnya',
  ];

  const footerProducts = [
    t('Asuransi Kendaraan', 'Vehicle Insurance'),
    t('Asuransi Perjalanan', 'Travel Insurance'),
    t('Jiwa & PA', 'Life & PA'),
    t('Asuransi Gadget', 'Gadget Insurance'),
    t('Asuransi Kesehatan', 'Health Insurance'),
  ];
  const footerCompany = [
    t('Tentang Kami', 'About Us'),
    t('Karir', 'Careers'),
    t('Blog', 'Blog'),
    t('Mitra / Partners', 'Partners'),
    t('Press', 'Press'),
  ];
  const footerHelp = [
    t('Pusat Bantuan', 'Help Center'),
    t('Hubungi Kami', 'Contact Us'),
    t('Cek Klaim', 'Track Claim'),
    t('FAQ', 'FAQ'),
    t('Syarat & Ketentuan', 'Terms & Conditions'),
  ];

  const isDark = darkMode;
  const bg = isDark ? 'bg-[#080c14]' : 'bg-[#f8fafc]';
  const surface = isDark ? 'bg-[#0c1120]' : 'bg-[#f1f5f9]';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-white/10' : 'border-slate-200';

  return (
    <>
      {/* ── Inline keyframe styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes spFloat1 {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes spFloat2 {
          0%, 100% { transform: translateY(0px) rotate(1.5deg); }
          50% { transform: translateY(-13px) rotate(1.5deg); }
        }
        @keyframes spMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes spGradShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 200% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sp-float-1 { animation: spFloat1 4.2s ease-in-out infinite; }
        .sp-float-2 { animation: spFloat2 5.1s ease-in-out infinite; animation-delay: 0.8s; }
        .sp-marquee { animation: spMarquee 28s linear infinite; }
        .sp-grad-text {
          background: linear-gradient(135deg, #7c3aed, #2563eb, #7c3aed);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: spGradShift 4s ease-in-out infinite;
        }
        .sp-spin { animation: spSpin 8s linear infinite; }
        .sp-card-hover {
          transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s, border-color 0.3s;
        }
        .sp-card-hover:hover {
          transform: translateY(-7px);
          box-shadow: 0 24px 60px rgba(124,58,237,0.18);
          border-color: rgba(124,58,237,0.5);
        }
      `}</style>

      <div className={`${bg} ${text} min-h-screen overflow-x-hidden font-sans`}>

        {/* ══════════════════════════════════════════════════════════════════
            NAV
        ═══════════════════════════════════════════════════════════════════ */}
        <nav
          className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
            isScrolled
              ? isDark
                ? 'bg-[#0c1120]/80 backdrop-blur-xl border-b border-white/10 shadow-xl shadow-black/30'
                : 'bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-lg'
              : 'bg-transparent'
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <Shield size={18} className="text-white" />
              </div>
              <span className={`font-black text-xl tracking-tight ${text}`}>
                Sure<span className="sp-grad-text">Path</span>
              </span>
            </div>

            {/* Links */}
            <div className="hidden lg:flex items-center gap-8">
              {[
                { href: '#products', label: t('Produk', 'Products') },
                { href: '#claims', label: t('Klaim', 'Claims') },
                { href: '#partners', label: t('Mitra', 'Partners') },
                { href: '#about', label: t('Tentang', 'About') },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium ${muted} hover:text-violet-500 transition-colors`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLang}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${border} ${muted} hover:text-violet-500 hover:border-violet-500/50 transition-all`}
              >
                {lang}
              </button>
              <button
                onClick={toggleDark}
                className={`p-2 rounded-lg border ${border} ${muted} hover:text-violet-500 transition-all`}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={onSignIn}
                className={`hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold border ${border} ${muted} hover:text-violet-500 hover:border-violet-500/50 transition-all`}
              >
                {t('Masuk', 'Login')}
              </button>
              <button
                onClick={onSignIn}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-105 transition-all"
              >
                {t('Mulai Gratis', 'Get Started')}
              </button>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
          {/* Canvas bg */}
          <CanvasBackground darkMode={isDark} />

          {/* Vignette */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, transparent 30%, #080c14 85%)'
                : 'radial-gradient(ellipse at center, transparent 30%, #f8fafc 85%)',
            }}
          />

          <div className="relative z-[2] max-w-7xl mx-auto px-6 w-full py-20 grid lg:grid-cols-2 gap-12 items-center">
            {/* ── Left ── */}
            <div className="flex flex-col gap-6">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 w-fit">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                  {t('OJK Terdaftar · Resmi', 'OJK Registered · Official')}
                </span>
              </div>

              {/* H1 */}
              <h1 className={`text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight ${text}`}>
                {lang === Language.ID ? (
                  <>Ngapain Ribet<br /><span className="sp-grad-text">Beli Asuransi?</span></>
                ) : (
                  <>Why Bother<br /><span className="sp-grad-text">Buying Insurance?</span></>
                )}
              </h1>

              <p className={`text-lg ${muted} leading-relaxed max-w-md`}>
                {t(
                  'Bandingkan 15+ insurer terbaik, beli dalam 3 menit, dan klaim cukup dengan foto HP.',
                  'Compare 15+ top insurers, buy in 3 minutes, and claim with just a phone photo.'
                )}
              </p>

              {/* ── Quote Widget ── */}
              <div
                className={`rounded-2xl border ${border} p-5 ${
                  isDark
                    ? 'bg-[#0c1120]/80 backdrop-blur-xl'
                    : 'bg-white/80 backdrop-blur-xl shadow-xl'
                }`}
              >
                {/* Tabs */}
                <div className="flex gap-1 mb-4 p-1 rounded-xl bg-black/10 dark-compatible">
                  {quoteTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setQuoteTab(tab.id); setShowPrice(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        quoteTab === tab.id
                          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md'
                          : `${muted} hover:text-violet-500`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Form */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { ph: t('Merek', 'Brand'), val: quoteBrand, set: setQuoteBrand },
                    { ph: t('Tahun', 'Year'), val: quoteYear, set: setQuoteYear },
                    { ph: t('Tipe Asuransi', 'Coverage Type'), val: quoteCoverage, set: setQuoteCoverage },
                    { ph: t('Nilai (Rp)', 'Value (Rp)'), val: quoteValue, set: setQuoteValue },
                  ].map((f, i) => (
                    <input
                      key={i}
                      placeholder={f.ph}
                      value={f.val}
                      onChange={(e) => f.set(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-xs border ${border} ${
                        isDark ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'
                      } focus:outline-none focus:border-violet-500 transition-colors`}
                    />
                  ))}
                  <select
                    value={quoteProvince}
                    onChange={(e) => setQuoteProvince(e.target.value)}
                    className={`col-span-2 w-full px-3 py-2 rounded-lg text-xs border ${border} ${
                      isDark ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-900'
                    } focus:outline-none focus:border-violet-500 transition-colors`}
                  >
                    <option value="">{t('Pilih Provinsi', 'Select Province')}</option>
                    {['DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Jawa Tengah', 'Bali', 'Sumatera Utara'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowPrice(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] transition-all"
                >
                  {t('Bandingkan Harga', 'Compare Prices')}
                </button>

                {showPrice && (
                  <div className={`mt-3 p-3 rounded-xl border border-violet-500/30 bg-violet-500/10 flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold text-violet-400">{t('Mulai dari', 'Starting from')}</p>
                      <p className={`text-base font-black ${text}`}>Rp 1,2 Jt/tahun</p>
                    </div>
                    <button
                      onClick={onSignIn}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:scale-105 transition-all flex items-center gap-1"
                    >
                      {t('Pilih & Beli', 'Choose & Buy')} <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Insurance Cards ── */}
            <div className="hidden lg:flex flex-col items-end gap-4 relative">
              {/* Card 1 */}
              <div
                className="sp-float-1 w-72 rounded-2xl p-5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-600/30"
                style={{ transform: 'rotate(-2deg)' }}
              >
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <p className="text-xs font-bold opacity-70 uppercase tracking-wider">{t('Asuransi Mobil', 'Car Insurance')}</p>
                    <p className="text-lg font-black mt-1">Toyota Avanza</p>
                  </div>
                  <Car size={28} className="opacity-80" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs opacity-60">{t('Premi Tahunan', 'Annual Premium')}</p>
                    <p className="text-xl font-black">Rp 2,4 Jt</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white/20 text-xs font-bold">Aktif</span>
                </div>
              </div>

              {/* Card 2 */}
              <div
                className="sp-float-2 w-64 rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 -mt-2 mr-8"
                style={{ transform: 'rotate(1.5deg)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold opacity-70">{t('Perjalanan', 'Travel')}</p>
                    <p className="font-black">SG · HK · JP</p>
                  </div>
                  <Plane size={22} className="opacity-80" />
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="opacity-80" />
                  <span className="text-xs font-bold opacity-80">{t('Klaim disetujui · Rp 3,2 Jt', 'Claim approved · Rp 3.2M')}</span>
                </div>
              </div>

              {/* Card 3 */}
              <div
                className={`w-60 rounded-2xl p-4 border ${border} shadow-lg ${
                  isDark ? 'bg-[#0c1120]' : 'bg-white'
                } -mt-2 mr-4`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Shield size={16} className="text-violet-500" />
                  </div>
                  <div>
                    <p className={`text-xs font-black ${text}`}>{t('Jiwa & PA', 'Life & PA')}</p>
                    <p className={`text-xs ${muted}`}>{t('Aktif hingga Des 2025', 'Active until Dec 2025')}</p>
                  </div>
                </div>
                <div className={`text-xs ${muted} flex items-center gap-1`}>
                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-yellow-500">4.9</span>
                  <span>{t('· Sinarmas Life', '· Sinarmas Life')}</span>
                </div>
              </div>

              {/* Floating pills */}
              <div className="absolute top-0 -left-4 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center gap-2">
                <Users size={12} />
                50K+ {t('Pengguna', 'Users')}
              </div>
              <div className={`absolute bottom-4 -left-8 px-3 py-2 rounded-xl border ${border} text-xs font-bold shadow-lg flex items-center gap-2 ${
                isDark ? 'bg-[#0c1120] text-white' : 'bg-white text-slate-900'
              }`}>
                <Clock size={12} className="text-emerald-500" />
                {t('Klaim dalam 60 dtk', 'Claim in 60 secs')}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TICKER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className={`relative py-4 border-y ${border} overflow-hidden`}>
          {/* Left fade */}
          <div
            className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: isDark ? 'linear-gradient(to right, #080c14, transparent)' : 'linear-gradient(to right, #f8fafc, transparent)' }}
          />
          {/* Right fade */}
          <div
            className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: isDark ? 'linear-gradient(to left, #080c14, transparent)' : 'linear-gradient(to left, #f8fafc, transparent)' }}
          />
          <div className="flex sp-marquee whitespace-nowrap">
            {[
              '50K+ Polis Aktif', 'Rp 2T+ Pertanggungan', 'Laporan Klaim 60 Detik',
              'OJK Terdaftar', '4.9/5 Rating', '15+ Insurer OJK',
              '50K+ Polis Aktif', 'Rp 2T+ Pertanggungan', 'Laporan Klaim 60 Detik',
              'OJK Terdaftar', '4.9/5 Rating', '15+ Insurer OJK',
            ].map((item, i) => (
              <span key={i} className={`inline-flex items-center gap-2 px-8 text-sm font-bold ${muted}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TRUST STRIP
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-12 max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: Award, val: 'OJK', label: t('Terdaftar & Diawasi', 'Registered & Supervised') },
                { icon: Clock, val: '60 Dtk', label: t('Laporan Klaim', 'Claim Filing') },
                { icon: Shield, val: 'ISO 27001', label: t('Keamanan Data', 'Data Security') },
                { icon: Users, val: '50K+', label: t('Pengguna Aktif', 'Active Users') },
                { icon: Star, val: '4.9', label: t('Rating Pengguna', 'User Rating') },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${border} ${surface} text-center`}>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <item.icon size={18} className="text-violet-500" />
                    </div>
                    <p className={`text-lg font-black ${text}`}>{item.val}</p>
                    <p className={`text-xs ${muted}`}>{item.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            PRODUCTS GRID
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="products" className="py-20 max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">
              {t('Produk Kami', 'Our Products')}
            </p>
            <h2 className={`text-4xl font-black ${text} leading-tight`}>
              {t('Semua Kebutuhan Proteksimu', 'All Your Protection Needs')}
            </h2>
            <p className={`${muted} mt-2 text-sm max-w-xl mx-auto`}>
              {t('Dari kendaraan hingga kesehatan — kami punya solusinya.', 'From vehicles to health — we have the solution.')}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((prod, i) => (
              <Reveal key={i} delay={i * 70}>
                <div
                  className={`sp-card-hover relative rounded-2xl p-6 border ${border} ${
                    isDark ? 'bg-[#0c1120]' : 'bg-white'
                  } cursor-pointer overflow-hidden`}
                  onMouseMove={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
                    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
                    (e.currentTarget as HTMLDivElement).style.transform = `translateY(-7px) rotateX(${-y}deg) rotateY(${x}deg)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                  }}
                  onClick={onSignIn}
                  style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                >
                  {prod.badge && (
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold shadow">
                      {prod.badge}
                    </div>
                  )}
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${prod.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <prod.icon size={22} className="text-white" />
                  </div>
                  <h3 className={`text-lg font-black ${text} mb-1`}>{prod.name}</h3>
                  <p className={`text-sm ${muted} leading-relaxed mb-4`}>{prod.desc}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-black ${text}`}>
                      <span className="text-xs font-normal text-violet-500 mr-1">{t('Mulai dari', 'From')}</span>
                      {prod.price}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSignIn(); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:scale-105 transition-transform flex items-center gap-1"
                    >
                      {t('Hitung & Beli', 'Quote & Buy')} <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CLAIM SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="claims" className={`py-20 ${isDark ? 'bg-[#0c1120]' : 'bg-[#f1f5f9]'}`}>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <Reveal>
                <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">
                  {t('Cara Klaim', 'How to Claim')}
                </p>
                <h2 className={`text-4xl font-black ${text} leading-tight mb-6`}>
                  {t('Laporkan Insiden dalam', 'Report an Incident in')}{' '}
                  <span className="sp-grad-text">{t('60 Detik', '60 Seconds')}</span>
                </h2>
              </Reveal>
              <div className="flex flex-col gap-3">
                {claimSteps.map((step, i) => (
                  <Reveal key={i} delay={i * 100}>
                    <div
                      className={`p-4 rounded-xl border ${
                        step.highlight ? 'border-violet-500/50 bg-violet-500/10' : `${border} ${isDark ? 'bg-[#080c14]' : 'bg-white'}`
                      } flex items-start gap-4`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        step.highlight ? 'bg-violet-600 text-white' : 'bg-violet-500/10 text-violet-500'
                      }`}>
                        <step.icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${text}`}>{step.title}</p>
                        <p className={`text-xs ${muted} mt-0.5`}>{step.desc}</p>
                      </div>
                      <span className="text-xs font-bold text-violet-400 flex-shrink-0">{step.time}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Right: Phone mockups */}
            <Reveal delay={200}>
              <div className="flex gap-4 items-center justify-center">
                {/* Phone 1 */}
                <div className={`w-44 h-80 rounded-3xl border-2 ${border} ${isDark ? 'bg-[#080c14]' : 'bg-white'} shadow-2xl p-4 flex flex-col gap-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className={`flex-1 rounded-2xl border ${border} flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <Camera size={32} className="text-violet-500" />
                    <p className={`text-xs font-bold text-center ${text}`}>{t('Foto Kerusakan', 'Photo Damage')}</p>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg">
                      <Camera size={14} className="text-white" />
                    </div>
                  </div>
                  <p className={`text-xs text-center ${muted}`}>{t('Ambil Foto', 'Capture')}</p>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center">
                  <ArrowRight size={20} className="text-violet-500" />
                </div>

                {/* Phone 2 */}
                <div className={`w-44 h-80 rounded-3xl border-2 ${border} ${isDark ? 'bg-[#080c14]' : 'bg-white'} shadow-2xl p-4 flex flex-col gap-2`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <p className={`text-xs font-bold ${text}`}>{t('Status Klaim', 'Claim Status')}</p>
                  {[
                    { label: t('Dilaporkan', 'Reported'), done: true },
                    { label: t('Diverifikasi', 'Verified'), done: true },
                    { label: t('Diproses', 'Processing'), done: false },
                    { label: t('Dibayar', 'Paid'), done: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        s.done ? 'bg-emerald-500' : `border-2 ${border}`
                      }`}>
                        {s.done && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className={`h-1.5 rounded-full ${s.done ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-slate-200'} transition-all`} style={{ width: s.done ? '100%' : '40%' }} />
                      </div>
                      <p className={`text-xs ${s.done ? 'text-emerald-500 font-bold' : muted}`}>{s.label}</p>
                    </div>
                  ))}
                  <div className={`mt-auto p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30`}>
                    <p className="text-xs font-bold text-emerald-500">{t('Estimasi: 60 menit', 'ETA: 60 minutes')}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            HOW IT WORKS
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">
              {t('Cara Kerja', 'How It Works')}
            </p>
            <h2 className={`text-4xl font-black ${text}`}>
              {t('3 Langkah Mudah', '3 Simple Steps')}
            </h2>
          </Reveal>

          <div className="relative grid lg:grid-cols-3 gap-6">
            {/* Connector line */}
            <div
              className="hidden lg:block absolute top-[52px] left-[20%] right-[20%] h-px pointer-events-none"
              style={{ background: 'linear-gradient(to right, #7c3aed, #2563eb)' }}
            />

            {howItWorks.map((step, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className={`relative p-6 rounded-2xl border ${border} ${isDark ? 'bg-[#0c1120]' : 'bg-white'}`}>
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-600/30">
                    <span className="text-white font-black text-sm">{step.num}</span>
                  </div>
                  <h3 className={`font-black text-lg ${text} mb-2`}>{step.title}</h3>
                  <p className={`text-sm ${muted} leading-relaxed`}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            STATS
        ═══════════════════════════════════════════════════════════════════ */}
        <section className={`py-16 ${isDark ? 'bg-[#0c1120]' : 'bg-[#f1f5f9]'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border ${border} rounded-2xl overflow-hidden">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className={`p-8 flex flex-col items-center gap-2 text-center border ${border} ${isDark ? 'bg-[#080c14]' : 'bg-white'}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-1">
                      <s.icon size={18} className="text-violet-500" />
                    </div>
                    <p className={`text-3xl font-black sp-grad-text`}>{s.val}</p>
                    <p className={`text-xs font-medium ${muted}`}>{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TESTIMONIALS
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-10">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">
              {t('Testimoni', 'Testimonials')}
            </p>
            <h2 className={`text-4xl font-black ${text}`}>
              {t('Cerita Nyata Pengguna', 'Real User Stories')}
            </h2>
          </Reveal>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {testimonials.map((tm, i) => (
              <div
                key={i}
                className={`flex-shrink-0 w-72 snap-start p-6 rounded-2xl border ${border} ${
                  isDark ? 'bg-[#0c1120]' : 'bg-white'
                } flex flex-col gap-4`}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: tm.rating }).map((_, j) => (
                    <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className={`text-sm italic ${muted} leading-relaxed`}>{tm.quote}</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                    {tm.init}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${text}`}>{tm.name}</p>
                    <p className={`text-xs ${muted}`}>{tm.meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            INSURER LOGOS
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="partners" className={`py-16 ${isDark ? 'bg-[#0c1120]' : 'bg-[#f1f5f9]'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <Reveal className="text-center mb-8">
              <p className={`text-sm font-bold ${muted} uppercase tracking-widest`}>
                {t('15+ Mitra Insurer OJK Terdaftar', '15+ OJK-Registered Insurer Partners')}
              </p>
            </Reveal>
            <Reveal>
              <div className="flex flex-wrap gap-2 justify-center">
                {insurers.map((ins, i) => (
                  <span
                    key={i}
                    className={`px-4 py-2 rounded-xl border ${border} text-sm font-semibold ${muted} ${
                      isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50'
                    } transition-colors cursor-default`}
                  >
                    {ins}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CTA SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="about" className="py-24 max-w-7xl mx-auto px-6">
          <Reveal>
            <div
              className="relative rounded-3xl overflow-hidden p-12 text-center"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #1e0b4a 0%, #0c1120 50%, #0a1628 100%)'
                  : 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 50%, #ede9fe 100%)',
              }}
            >
              {/* Spinning ring */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-violet-500/20 pointer-events-none sp-spin"
                style={{ borderStyle: 'dashed' }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-blue-500/10 pointer-events-none"
                style={{ animation: 'spSpin 12s linear infinite reverse', borderStyle: 'dashed' }}
              />

              <div className="relative z-10">
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">
                  {t('Mulai Sekarang', 'Start Now')}
                </p>
                <h2 className={`text-4xl lg:text-5xl font-black ${text} mb-4 leading-tight`}>
                  {t('Terlindungi dalam', 'Covered in')}{' '}
                  <span className="sp-grad-text">{t('3 Menit', '3 Minutes')}</span>
                </h2>
                <p className={`text-sm ${muted} mb-8 max-w-md mx-auto`}>
                  {t(
                    'Daftar gratis, bandingkan penawaran terbaik, dan dapatkan polis dalam hitungan menit.',
                    'Sign up free, compare the best offers, and get your policy in minutes.'
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={onSignIn}
                    className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    {t('Mulai Gratis Sekarang', 'Get Started Free')} <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={onSignIn}
                    className={`px-8 py-3 rounded-xl font-bold border ${border} ${muted} hover:text-violet-500 hover:border-violet-500/50 transition-all`}
                  >
                    {t('Pelajari Lebih Lanjut', 'Learn More')}
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        <footer className={`border-t ${border} ${isDark ? 'bg-[#0c1120]' : 'bg-[#f1f5f9]'}`}>
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg">
                  <Shield size={18} className="text-white" />
                </div>
                <span className={`font-black text-xl tracking-tight ${text}`}>
                  Sure<span className="sp-grad-text">Path</span>
                </span>
              </div>
              <p className={`text-sm ${muted} leading-relaxed`}>
                {t('Asuransi cepat & pintar untuk semua. Beli, klaim, dan pantau polis langsung dari genggaman.', 'Fast & smart insurance for all. Buy, claim, and track your policy right from your hand.')}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'OJK', color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
                  { label: 'ISO 27001', color: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
                  { label: '4.9 ★', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' },
                ].map((badge) => (
                  <span key={badge.label} className={`px-2 py-1 rounded-lg text-xs font-bold border ${badge.color}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Products */}
            <div>
              <p className={`text-xs font-black ${text} uppercase tracking-widest mb-4`}>{t('Produk', 'Products')}</p>
              <ul className="flex flex-col gap-2">
                {footerProducts.map((p) => (
                  <li key={p}>
                    <button onClick={onSignIn} className={`text-sm ${muted} hover:text-violet-500 transition-colors text-left`}>{p}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className={`text-xs font-black ${text} uppercase tracking-widest mb-4`}>{t('Perusahaan', 'Company')}</p>
              <ul className="flex flex-col gap-2">
                {footerCompany.map((p) => (
                  <li key={p}>
                    <button onClick={() => {}} className={`text-sm ${muted} hover:text-violet-500 transition-colors text-left`}>{p}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help */}
            <div>
              <p className={`text-xs font-black ${text} uppercase tracking-widest mb-4`}>{t('Bantuan', 'Help')}</p>
              <ul className="flex flex-col gap-2">
                {footerHelp.map((p) => (
                  <li key={p}>
                    <button onClick={() => {}} className={`text-sm ${muted} hover:text-violet-500 transition-colors text-left`}>{p}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom row */}
          <div className={`border-t ${border} px-6 py-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2`}>
            <p className={`text-xs ${muted}`}>
              © 2025 SurePath Technologies. {t('Hak cipta dilindungi.', 'All rights reserved.')}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg">🇮🇩</span>
              <p className={`text-xs ${muted}`}>Indonesia</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default PlatformLanding;
