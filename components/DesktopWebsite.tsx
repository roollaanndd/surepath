import React, { useState, useEffect } from 'react';
import { SurePathLogo } from './Navbar';
import { 
  // Added ShieldCheck to imports
  ArrowRight, Zap, Car, Plane, Package, 
  Smartphone, CheckCircle, ShieldCheck,
  Users, Anchor, Tractor, HeartPulse, CreditCard, Sparkles, Cpu, ShieldAlert
} from 'lucide-react';
import { Language } from '../types';

interface DesktopWebsiteProps {
  onEnterPortal: () => void;
  onAdminAccess: () => void;
  currentLang: Language;
  onLangChange: (l: Language) => void;
  section?: string;
}

const NeuralBackgroundIllustration = () => (
  <div className="absolute inset-0 w-full h-full pointer-events-none">
    {/* Floating Animated Blobs */}
    <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-500/10 blur-[100px] rounded-full animate-blob"></div>
    <div className="absolute bottom-1/4 left-10 w-[30rem] h-[30rem] bg-primary-500/5 blur-[120px] rounded-full animate-blob [animation-delay:2s]"></div>
    
    <svg className="w-full h-full opacity-30 dark:opacity-20" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Abstract Paths */}
      <path d="M-100 600 Q 200 400 400 600 T 900 300" stroke="url(#lineGrad)" strokeWidth="2" fill="none" className="animate-pulse-soft" />
      <path d="M-50 200 Q 150 500 450 250 T 850 600" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" className="animate-pulse-soft [animation-delay:1s]" />
      
      {/* Neural Nodes */}
      <circle cx="400" cy="400" r="4" fill="#10b981" className="animate-ping" />
      <circle cx="200" cy="500" r="3" fill="#f97316" className="animate-ping [animation-delay:0.5s]" />
      <circle cx="600" cy="300" r="3" fill="#10b981" className="animate-ping [animation-delay:1.2s]" />
    </svg>
    
    {/* Particle Grid Effect */}
    <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:40px_40px] opacity-20"></div>
  </div>
);

const DesktopWebsite: React.FC<DesktopWebsiteProps> = ({ onEnterPortal, section }) => {
  const [activeTab, setActiveTab] = useState<'RETAIL' | 'CORPORATE'>('RETAIL');

  useEffect(() => {
    if (section) {
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [section]);

  const retailProducts = [
    { title: "Asuransi Mobil", desc: "Foto kerusakan mobilmu lewat HP, AI kami langsung hitung biaya perbaikannya.", icon: Car, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Asuransi Travel", desc: "Proteksi delay pesawat dan bantuan medis internasional yang aktif seketika.", icon: Plane, color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Kecelakaan Diri", desc: "Santunan cepat untukmu dan keluarga tanpa ribet tumpukan kertas.", icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-50" },
    { title: "Proteksi Barang", desc: "Lindungi HP, Laptop, atau furnitur kesayanganmu dari kejadian tak terduga.", icon: Package, color: "text-amber-500", bg: "bg-amber-50" }
  ];

  const corporateProducts = [
    { title: "Kesehatan Karyawan", desc: "Asuransi grup untuk perusahaan dengan sistem klaim otomatis yang mudah.", icon: Users, color: "text-cyan-500", bg: "bg-cyan-50" },
    { title: "Pengiriman Logistik", desc: "Lindungi aset bisnismu selama perjalanan laut atau darat secara digital.", icon: Anchor, color: "text-indigo-500", bg: "bg-indigo-50" },
    { title: "Alat Berat", desc: "Perlindungan aset konstruksi dan industri dengan penilaian risiko yang akurat.", icon: Tractor, color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Keamanan Siber", desc: "Proteksi data dan operasional digital perusahaan dari serangan peretas.", icon: ShieldAlert, color: "text-slate-500", bg: "bg-slate-50" }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary-100">
      {/* Hero Section with Abstract Background */}
      <section id="home" className="hero-abstract-container pt-32 pb-32 px-8 relative border-b border-gray-100">
        <NeuralBackgroundIllustration />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-600 uppercase tracking-widest shadow-sm">
               <Sparkles size={14} className="fill-emerald-600 animate-pulse"/> Jaringan Proteksi Neural
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              Asuransi Tanpa <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-primary-500 drop-shadow-sm">Kertas & Drama.</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-lg font-medium leading-relaxed">
              Kami menggabungkan asisten AI pintar untuk membantu Anda menerbitkan polis dalam hitungan menit dan memproses klaim secepat Anda mengambil foto.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <button onClick={onEnterPortal} className="px-10 py-5 bg-primary-500 text-white rounded-2xl font-bold text-lg hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/25 flex items-center justify-center gap-3 group active:scale-95">
                Mulai Lindungi Aset <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
              </button>
              <button onClick={() => document.getElementById('products')?.scrollIntoView({behavior: 'smooth'})} className="px-10 py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl font-bold text-lg hover:border-brand-500/30 transition-all active:scale-95 shadow-sm">
                Lihat Produk
              </button>
            </div>
            
            {/* Trust Badges */}
            <div className="pt-8 flex items-center gap-8 grayscale opacity-60">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-brand-500" />
                <span className="text-xs font-black uppercase tracking-widest">OJK Terdaftar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-brand-500" />
                <span className="text-xs font-black uppercase tracking-widest">ISO 27001</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block relative animate-float">
             {/* Abstract Core Card replacing image */}
             <div className="relative p-10 bg-white/40 backdrop-blur-xl rounded-[4rem] border-2 border-white/60 shadow-[0_40px_100px_-20px_rgba(16,185,129,0.15)] overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-bl-[4rem]"></div>
                <div className="space-y-8 relative z-10">
                   <div className="flex justify-between items-center">
                      <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center text-white shadow-lg"><Cpu size={32}/></div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Status</p>
                         <p className="text-sm font-bold text-brand-600 uppercase">Synchronized</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                         <div className="h-full bg-brand-500 w-3/4 animate-shimmer-fast"></div>
                      </div>
                      <div className="h-2 w-2/3 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-primary-400 w-1/2 animate-shimmer-fast [animation-delay:0.5s]"></div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100 flex flex-col gap-2">
                         <span className="text-[10px] font-black text-brand-600 uppercase">Klaim Terproses</span>
                         <span className="text-3xl font-black text-brand-700 leading-none">0.4s</span>
                      </div>
                      <div className="p-6 bg-primary-50 rounded-3xl border border-primary-100 flex flex-col gap-2">
                         <span className="text-[10px] font-black text-primary-600 uppercase">Akurasi Audit</span>
                         <span className="text-3xl font-black text-primary-700 leading-none">99%</span>
                      </div>
                   </div>
                   <div className="p-6 bg-slate-900 rounded-[2.5rem] flex items-center justify-between text-white shadow-2xl">
                      <div className="flex items-center gap-3">
                         <Zap size={20} className="text-primary-500 fill-primary-500"/>
                         <span className="text-xs font-bold uppercase tracking-widest">Klaim Cair Langsung</span>
                      </div>
                      <ArrowRight size={20}/>
                   </div>
                </div>
                
                {/* Floating Elements inside the card space */}
                <div className="absolute -bottom-6 -right-6 p-10 bg-brand-500 rounded-full blur-[50px] opacity-10"></div>
             </div>
          </div>
        </div>
      </section>

      {/* How AI Helps - Bento Grid */}
      <section id="about" className="py-32 px-8">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24 space-y-4">
               <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Teknologi yang <span className="text-primary-500">Bisa Anda Percaya.</span></h2>
               <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">Bukan hanya janji, tapi solusi nyata untuk memangkas birokrasi asuransi yang lama.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
               <div className="p-12 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm hover:shadow-xl transition-all group active:scale-[0.98]">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner"><Cpu size={32}/></div>
                  <h3 className="text-2xl font-bold mb-4">Polis Kilat</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">AI kami memverifikasi data Anda dalam sekejap. Bayar premi hari ini, polis langsung terbit dan aktif menit itu juga.</p>
               </div>
               <div className="p-12 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl relative overflow-hidden group active:scale-[0.98]">
                  <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700"><Smartphone size={180}/></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-primary-500 text-white rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform shadow-lg shadow-primary-500/20"><Zap size={32}/></div>
                    <h3 className="text-2xl font-bold mb-4">Audit Visual AI</h3>
                    <p className="text-slate-400 leading-relaxed font-medium">Cukup ambil foto kerusakan mobil atau kuitansi medis. AI kami menganalisa tingkat kerusakan secara real-time untuk persetujuan dana.</p>
                  </div>
               </div>
               <div className="p-12 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm hover:shadow-xl transition-all group active:scale-[0.98]">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner"><CreditCard size={32}/></div>
                  <h3 className="text-2xl font-bold mb-4">Pembayaran Mulus</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">Integrasi pembayaran digital yang aman. Mulai dari cicilan premi hingga pencairan dana klaim langsung ke rekening Anda.</p>
               </div>
            </div>
         </div>
      </section>

      {/* Catalog Products */}
      <section id="products" className="py-32 px-8 bg-slate-50/50">
         <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
               <div className="space-y-4">
                  <h2 className="text-4xl font-extrabold text-slate-900">Perlindungan <span className="text-primary-500">Pilihan.</span></h2>
                  <p className="text-slate-500 font-medium">Solusi lengkap yang dirancang untuk kebutuhan unik setiap nasabah.</p>
               </div>
               <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
                  <button 
                    onClick={() => setActiveTab('RETAIL')}
                    className={`px-10 py-3.5 rounded-[1.4rem] text-sm font-bold transition-all ${activeTab === 'RETAIL' ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Individu
                  </button>
                  <button 
                    onClick={() => setActiveTab('CORPORATE')}
                    className={`px-10 py-3.5 rounded-[1.4rem] text-sm font-bold transition-all ${activeTab === 'CORPORATE' ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Bisnis
                  </button>
               </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in" key={activeTab}>
               {(activeTab === 'RETAIL' ? retailProducts : corporateProducts).map((p, i) => (
                  <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 group cursor-pointer flex flex-col h-full active:scale-[0.98]">
                     <div className={`w-16 h-16 ${p.bg} ${p.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner`}>
                        <p.icon size={32}/>
                     </div>
                     <h4 className="text-2xl font-bold mb-3 uppercase tracking-tight">{p.title}</h4>
                     <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-1">{p.desc}</p>
                     <div className="flex items-center gap-2 text-xs font-black text-primary-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Detail <ArrowRight size={16}/>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-8">
         <div className="max-w-5xl mx-auto bg-slate-900 rounded-[4rem] p-16 md:p-24 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-primary-500/20 opacity-40"></div>
            <div className="relative z-10 space-y-10">
               <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight uppercase">Mulai Lindungi Masa Depan <br className="hidden md:block"/> Anda Sekarang.</h2>
               <p className="text-xl text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">Bergabunglah dengan ribuan nasabah yang sudah beralih ke asuransi neural bersama SurePath.</p>
               <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <button onClick={onEnterPortal} className="px-12 py-5 bg-primary-500 text-white rounded-2xl font-bold text-lg hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/20 active:scale-95">Daftar Sekarang</button>
                  <button className="px-12 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95">Hubungi Tim Kami</button>
               </div>
            </div>
         </div>
      </section>

      <footer className="py-20 px-8 bg-white border-t border-slate-100">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-3">
               <SurePathLogo className="w-10 h-10"/><span className="font-bold text-2xl uppercase tracking-tighter">Sure<span className="text-primary-500">Path</span></span>
            </div>
            <p className="text-sm text-slate-400 font-medium tracking-wide">© 2025 SurePath Technologies. Member of Insurtech Indonesia. Terdaftar & Diawasi oleh OJK.</p>
         </div>
      </footer>
    </div>
  );
};

export default DesktopWebsite;