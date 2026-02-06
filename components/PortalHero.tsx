
import React, { useState, useEffect } from 'react';
import { ArrowRight, Globe, Car, Zap, ShieldCheck, Heart, Sparkles } from 'lucide-react';

const SLIDES = [
  {
    title: "Jalan-jalan Tenang",
    highlight: "Bersama Kami",
    desc: "Perlindungan perjalanan ke seluruh dunia. Aktif dalam 60 detik saja.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800",
    color: "emerald",
    icon: Globe,
    cta: "Cek Asuransi Travel"
  },
  {
    title: "Mobil Kesayangan",
    highlight: "Selalu Aman",
    desc: "Scan mobilmu dengan AI. Klaim jadi semudah ambil foto selfie.",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800",
    color: "blue",
    icon: Car,
    cta: "Lihat Asuransi Mobil"
  },
  {
    title: "Klaim Ga Pake",
    highlight: "Ribet!",
    desc: "Cairkan dana perbaikan dalam hitungan menit tanpa ribet kertas.",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800",
    color: "rose",
    icon: Zap,
    cta: "Lapor Klaim AI"
  }
];

const PortalHero = ({ onAction }: { onAction: (id: string) => void }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[24rem] rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/20 transition-all duration-1000">
      {SLIDES.map((slide, i) => (
        <div 
          key={i} 
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        >
          <img 
            src={slide.image} 
            className="absolute inset-0 w-full h-full object-cover" 
            alt={slide.title} 
          />
          {/* Friendly Soft Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
          
          <div className="absolute inset-0 p-10 flex flex-col justify-end">
            <div className={`space-y-4 transition-all duration-700 delay-300 ${i === current ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30">
                 <Sparkles size={14} className="text-amber-400 fill-amber-400" />
                 <span className="text-[0.6rem] font-black text-white uppercase tracking-widest">Baru Untukmu</span>
              </div>

              <h2 className="text-4xl font-black text-white leading-none tracking-tight uppercase">
                {slide.title} <br/> 
                <span className={`text-${slide.color}-400`}>{slide.highlight}</span>
              </h2>

              <p className="text-xs text-gray-200 max-w-[240px] font-medium leading-relaxed">
                {slide.desc}
              </p>

              <button 
                onClick={() => {
                  const target = slide.cta.toLowerCase().includes('travel') ? 'buy-travel' : 
                                 slide.cta.toLowerCase().includes('mobil') ? 'buy-car' : 
                                 slide.cta.toLowerCase().includes('klaim') ? 'claim' : 'products';
                  onAction(target);
                }}
                className="mt-2 px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[0.65rem] tracking-widest w-fit shadow-xl flex items-center gap-3 transition-all active:scale-95 group"
              >
                {slide.cta} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Friendly Indicators */}
      <div className="absolute bottom-10 right-10 flex gap-2 z-20">
        {SLIDES.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setCurrent(i)}
            className={`transition-all duration-500 rounded-full ${i === current ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PortalHero;
