import React from 'react';
import { Button, Badge } from '../shared/UI';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';

// Fixed: Added lang prop to Hero to resolve TS error in DesktopWebsite.tsx
const Hero = ({ onAction, lang = 'ID' }: { onAction: () => void, lang?: string }) => {
  return (
    <section className="relative pt-40 pb-20 overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-50/50 -z-10 rounded-bl-[10rem]"></div>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8 animate-fade-in">
          <Badge variant="success">
            <CheckCircle2 size={14} /> {lang === 'EN' ? 'Trusted & Supervised by OJK' : 'Terpercaya & Diawasi OJK'}
          </Badge>
          
          <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter">
            {lang === 'EN' ? 'Insurance Without' : 'Asuransi Tanpa'} <br/>
            <span className="text-emerald-500">{lang === 'EN' ? 'Complex Language.' : 'Bahasa Ribet.'}</span>
          </h1>
          
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
            {lang === 'EN' 
              ? 'SurePath is here to give you peace of mind. Lightning fast claim process, paperless, supported by a smart assistant ready to help 24/7.'
              : 'SurePath hadir untuk memberikan ketenangan hati. Proses klaim mudah secepat kilat, tanpa tumpukan kertas, didukung asisten pintar yang selalu siap membantu Anda 24/7.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={onAction} className="group">
              {lang === 'EN' ? 'Start Protection' : 'Mulai Proteksi'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <button className="flex items-center gap-3 px-8 py-4 font-bold text-slate-600 hover:text-emerald-600 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-emerald-500">
                <Play size={16} fill="currentColor" />
              </div>
              {lang === 'EN' ? 'How it Works' : 'Lihat Cara Kerja'}
            </button>
          </div>

          <div className="flex gap-10 pt-4 opacity-60">
            <div>
              <p className="text-2xl font-black text-slate-900">50k+</p>
              <p className="text-xs font-bold text-slate-400 uppercase">{lang === 'EN' ? 'Active Users' : 'Pengguna Aktif'}</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div>
              <p className="text-2xl font-black text-slate-900">99%</p>
              <p className="text-xs font-bold text-slate-400 uppercase">{lang === 'EN' ? 'Claims Approved' : 'Klaim Disetujui'}</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div>
              <p className="text-2xl font-black text-slate-900">5 Mins</p>
              <p className="text-xs font-bold text-slate-400 uppercase">{lang === 'EN' ? 'Reg Process' : 'Proses Daftar'}</p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block relative animate-pop-in">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
          <img 
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop" 
            className="w-full h-[500px] object-cover rounded-[4rem] shadow-2xl relative z-10"
            alt="Approachable Insurance"
          />
          <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[3rem] shadow-2xl z-20 max-w-xs border border-slate-50">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <CheckCircle2 size={24} />
              </div>
              <span className="font-black text-slate-900">{lang === 'EN' ? 'Claim Paid!' : 'Klaim Cair!'}</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">"Foto kerusakan dikirim jam 10.00, dana cair jam 10.05. Luar biasa!"</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase mt-4 tracking-widest">- Pak Budi, Jakarta</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
