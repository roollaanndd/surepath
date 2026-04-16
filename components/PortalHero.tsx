
import React, { useState, useEffect } from 'react';
import { ArrowRight, Globe, Car, Zap, Sparkles, Plane, Activity } from 'lucide-react';
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
    pattern: (
       <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
          <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] text-white opacity-20 animate-spin-slow" />
       </div>
    ),
    color: "emerald",
    icon: Plane,
    cta: lang === Language.EN ? "Check Plans" : "Cek Asuransi Travel"
  },
  {
    title: lang === Language.EN ? "Auto Matrix v4" : "Matriks Mobil v4",
    highlight: lang === Language.EN ? "Visual Audit" : "Audit Visual AI",
    desc: lang === Language.EN 
      ? "Protect your vehicle with visual AI audit. Forget manual forms, just snap for instant verification."
      : "Proteksi kendaraan dengan audit visual AI. Lupakan formulir manual, cukup ambil foto untuk verifikasi instan.",
    image: null,
    bgClass: "bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950",
    pattern: (
       <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
          <Car className="absolute bottom-10 right-10 w-[400px] h-[400px] text-white opacity-10 rotate-12" />
       </div>
    ),
    color: "blue",
    icon: Car,
    cta: lang === Language.EN ? "Protect Your Car" : "Beli Asuransi Mobil"
  },
  {
    title: lang === Language.EN ? "Fast-Path Claims" : "Klaim Jalur Cepat",
    highlight: lang === Language.EN ? "Autonomous" : "Otonom",
    desc: lang === Language.EN 
      ? "Settle your claims in seconds. Cash paid directly to your node wallet without bureaucracy."
      : "Selesaikan klaim Anda dalam hitungan detik. Dana cair langsung ke node dompet Anda tanpa drama birokrasi.",
    image: null,
    bgClass: "bg-gradient-to-br from-rose-700 via-orange-800 to-slate-950",
    pattern: (
       <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-ping opacity-20"></div>
          <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] text-white opacity-10 animate-pulse" />
       </div>
    ),
    color: "rose",
    icon: Zap,
    cta: lang === Language.EN ? "Start Claim" : "Lapor Klaim AI"
  }
];

const PortalHero = ({ onAction, lang = Language.ID }: { onAction: (id: string) => void, lang?: Language }) => {
  const [current, setCurrent] = useState(0);
  const slides = SLIDES(lang);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  return (
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
                 <span className="text-[0.65rem] font-black text-white uppercase tracking-[0.25em]">{t('Recommended For You', 'Rekomendasi Untukmu')}</span>
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter uppercase">
                  {slide.title}
                </h2>
                <h3 className={`text-4xl md:text-5xl font-black tracking-tighter uppercase text-${slide.color}-400`}>
                   {slide.highlight}
                </h3>
              </div>
              <p className="text-sm text-gray-200 max-w-[320px] font-medium leading-relaxed opacity-90">
                {slide.desc}
              </p>
              <button 
                onClick={() => {
                  const target = slide.cta.toLowerCase().includes('travel') ? 'buy-travel' : 
                                 slide.cta.toLowerCase().includes('mobil') || slide.cta.toLowerCase().includes('car') ? 'buy-car' : 
                                 slide.cta.toLowerCase().includes('klaim') || slide.cta.toLowerCase().includes('claim') ? 'claim' : 'products';
                  onAction(target);
                }}
                className="mt-4 px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-[0.7rem] tracking-[0.3em] w-fit shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
                <slide.icon size={18} className={`text-${slide.color}-500`}/>
                <span className="relative z-10">{slide.cta}</span>
                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform text-gray-400 relative z-10"/>
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
  );
};

export default PortalHero;
