
import React, { useState, useEffect } from 'react';
import { ArrowRight, Globe, Car, Zap, Sparkles, Plane, Activity, Shield, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { Language } from '../types';

const SLIDES = (lang: Language) => [
  {
    title: lang === Language.EN ? "Travel Protection" : "Proteksi Perjalanan",
    highlight: lang === Language.EN ? "Global Network" : "Jaringan Global",
    desc: lang === Language.EN
      ? "Perlindungan perjalanan ke seluruh dunia. Instant activation with lightning-fast verification."
      : "Perlindungan perjalanan instan ke seluruh dunia. Aktif instan dengan protokol verifikasi secepat kilat.",
    image: null,
    bgClass: "bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900",
    highlightClass: "text-emerald-400",
    iconClass: "text-emerald-500",
    pattern: (
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
        <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] text-white opacity-20" />
      </div>
    ),
    icon: Plane,
    cta: lang === Language.EN ? "Check Plans" : "Cek Asuransi Travel",
    actionId: "buy-travel",
  },
  {
    title: lang === Language.EN ? "Auto Matrix v4" : "Matriks Mobil v4",
    highlight: lang === Language.EN ? "Visual Audit" : "Audit Visual AI",
    desc: lang === Language.EN
      ? "Protect your vehicle with visual AI audit. Forget manual forms, just snap for instant verification."
      : "Proteksi kendaraan dengan audit visual AI. Lupakan formulir manual, cukup ambil foto untuk verifikasi instan.",
    image: null,
    bgClass: "bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950",
    highlightClass: "text-blue-400",
    iconClass: "text-blue-500",
    pattern: (
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        <Car className="absolute bottom-10 right-10 w-[400px] h-[400px] text-white opacity-10 rotate-12" />
      </div>
    ),
    icon: Car,
    cta: lang === Language.EN ? "Protect Your Car" : "Beli Asuransi Mobil",
    actionId: "buy-car",
  },
  {
    title: lang === Language.EN ? "Fast-Path Claims" : "Klaim Jalur Cepat",
    highlight: lang === Language.EN ? "Autonomous" : "Otonom",
    desc: lang === Language.EN
      ? "Settle your claims in seconds. Cash paid directly to your node wallet without bureaucracy."
      : "Selesaikan klaim Anda dalam hitungan detik. Dana cair langsung ke node dompet Anda tanpa drama birokrasi.",
    image: null,
    bgClass: "bg-gradient-to-br from-rose-700 via-orange-800 to-slate-950",
    highlightClass: "text-rose-400",
    iconClass: "text-rose-500",
    pattern: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-ping opacity-20"></div>
        <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] text-white opacity-10 animate-pulse" />
      </div>
    ),
    icon: Zap,
    cta: lang === Language.EN ? "Start Claim" : "Lapor Klaim AI",
    actionId: "claim",
  }
];

const QuickActions = ({ onAction, lang }: { onAction: (id: string) => void; lang: Language }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const actions = [
    { id: 'buy-travel', label: t('Travel', 'Travel'), icon: Plane, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'buy-car', label: t('Auto', 'Mobil'), icon: Car, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'claim', label: t('Claim', 'Klaim'), icon: Zap, gradient: 'from-rose-500 to-orange-600' },
    { id: 'products', label: t('More', 'Lainnya'), icon: TrendingUp, gradient: 'from-violet-500 to-purple-600' },
  ];
  return (
    <div className="grid grid-cols-4 gap-3 mt-4">
      {actions.map(({ id, label, icon: Icon, gradient }) => (
        <button
          key={id}
          onClick={() => onAction(id)}
          className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300 active:scale-95"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={18} className="text-white" />
          </div>
          <span className="text-[0.55rem] font-black text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">{label}</span>
        </button>
      ))}
    </div>
  );
};

const PolicyStatusCard = ({ lang }: { lang: Language }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-2xl mt-4">
      {/* Animated gradient shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Shield size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[0.55rem] font-black text-gray-500 uppercase tracking-widest">{t('Active Policy', 'Polis Aktif')}</p>
            <p className="text-xs font-black text-white">SP-2024-TRV-001</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <CheckCircle2 size={10} className="text-emerald-400" />
          <span className="text-[0.5rem] font-black text-emerald-400 uppercase tracking-widest">{t('Active', 'Aktif')}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('Coverage', 'Perlindungan'), value: 'Rp 500 JT', icon: Shield, color: 'text-emerald-400' },
          { label: t('Expires', 'Berlaku'), value: '31 Des 2025', icon: Clock, color: 'text-amber-400' },
          { label: t('Trust Score', 'Skor Kepercayaan'), value: '98/100', icon: TrendingUp, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="text-center space-y-1">
            <Icon size={14} className={`mx-auto ${color}`} />
            <p className="text-[0.6rem] font-black text-white">{value}</p>
            <p className="text-[0.45rem] font-bold text-gray-600 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PortalHero = ({ onAction, lang = Language.ID }: { onAction: (id: string) => void, lang?: Language }) => {
  const [current, setCurrent] = useState(0);
  const slides = SLIDES(lang);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="space-y-0">
      {/* Hero Carousel */}
      <div className="relative h-[26rem] rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/10 transition-all duration-1000">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-110'} ${slide.bgClass}`}
          >
            {slide.pattern}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>
            <div className="absolute inset-0 p-12 flex flex-col justify-end">
              <div className={`space-y-6 transition-all duration-700 delay-300 ${i === current ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-5 py-2 rounded-full border border-white/20 shadow-xl">
                  <Sparkles size={16} className="text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="text-[0.65rem] font-black text-white uppercase tracking-[0.25em]">
                    {lang === Language.EN ? 'Recommended For You' : 'Rekomendasi Untukmu'}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter uppercase">
                    {slide.title}
                  </h2>
                  <h3 className={`text-4xl md:text-5xl font-black tracking-tighter uppercase ${slide.highlightClass}`}>
                    {slide.highlight}
                  </h3>
                </div>
                <p className="text-sm text-gray-200 max-w-[320px] font-medium leading-relaxed opacity-90">
                  {slide.desc}
                </p>
                <button
                  onClick={() => onAction(slide.actionId)}
                  className="mt-4 px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-[0.7rem] tracking-[0.3em] w-fit shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
                  <slide.icon size={18} className={slide.iconClass} />
                  <span className="relative z-10">{slide.cta}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform text-gray-400 relative z-10" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="absolute bottom-12 right-12 flex gap-3 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`transition-all duration-700 rounded-full h-2.5 shadow-lg border border-white/20 ${i === current ? 'w-12 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      </div>

      {/* Policy Status Card with glassmorphism */}
      <PolicyStatusCard lang={lang} />

      {/* Quick Action Buttons */}
      <QuickActions onAction={onAction} lang={lang} />
    </div>
  );
};

export default PortalHero;
