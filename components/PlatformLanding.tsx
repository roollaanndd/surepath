import React from 'react';
import { Language } from '../types';
import { ShieldCheck, ArrowRight, Zap, TrendingUp, Handshake, CheckCircle2, ChevronRight, Smartphone } from 'lucide-react';
import { SurePathLogo } from './Navbar';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-700 font-sans">
      {/* Navbar Minimalist */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SurePathLogo className="w-10 h-10" />
            <span className="font-black text-2xl tracking-tighter uppercase">Sure<span className="text-emerald-500">Path</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
              className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors"
            >
              {lang === Language.EN ? 'ID' : 'EN'}
            </button>
            <button 
              onClick={onSignIn}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              {t('Masuk / Daftar', 'Masuk / Daftar')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
              <ShieldCheck size={16} /> {t('Asuransi yang Lebih Baik', 'Asuransi yang Lebih Baik')}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1]">
              {t('Asuransi digital yang', 'Asuransi digital yang')}<br/>
              <span className="text-emerald-500">{t('benar-benar mudah.', 'benar-benar mudah.')}</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              {t('Beli asuransi tanpa ribet, ajukan klaim hanya lewat HP, dan bergabunglah sebagai mitra agen untuk menambah penghasilan. SurePath membuat semuanya transparan dan cepat.', 'Beli asuransi tanpa ribet, ajukan klaim hanya lewat HP, dan bergabunglah sebagai mitra agen untuk menambah penghasilan. SurePath membuat semuanya transparan dan cepat.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <button onClick={onSignIn} className="px-8 py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                  {t('Mulai Sekarang', 'Mulai Sekarang')} <ArrowRight size={18} />
               </button>
               <button onClick={onSignIn} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all">
                  {t('Gabung Jadi Agen', 'Gabung Jadi Agen')}
               </button>
            </div>
          </div>
          
          {/* Futuristic clean visual representation of phone app */}
          <div className="relative mx-auto w-full max-w-sm">
             <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-blue-500/30 rounded-[3rem] blur-3xl"></div>
             <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] p-6 border-8 border-slate-100 dark:border-slate-800 shadow-2xl skew-y-2 hover:skew-y-0 transition-transform duration-700">
                <div className="space-y-6">
                   <div className="flex justify-between items-center mb-8">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center"><Smartphone size={20}/></div>
                        <div>
                          <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded-full mb-2"></div>
                          <div className="w-12 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                        </div>
                      </div>
                   </div>
                   {/* Mock policies */}
                   {[1, 2, 3].map((i) => (
                     <div key={i} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-white/5">
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20"></div>
                          <div className="space-y-2">
                             <div className="w-24 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                             <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          </div>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                     </div>
                   ))}
                   <div className="pt-4">
                     <div className="w-full h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                       <span className="text-white text-xs font-bold w-1/3 h-2 bg-white/30 rounded-full"></span>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="max-w-7xl mx-auto mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{t('Mengapa Memilih SurePath?', 'Mengapa Memilih SurePath?')}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">{t('Platform kami menyediakan kemudahan untuk semua pihak: pembeli asuransi, mitra penjual, dan investor.', 'Platform kami menyediakan kemudahan untuk semua pihak: pembeli asuransi, mitra penjual, dan investor.')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
             {/* For Users */}
             <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                   <Zap size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{t('Klaim Super Cepat', 'Klaim Super Cepat')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{t('Teknologi AI cerdas kami membaca dokumen seperti KTP dan STNK seketika. Proses klaim yang biasanya memakan waktu berminggu-minggu kini bisa selesai dalam hitungan menit.', 'Teknologi AI cerdas kami membaca dokumen seperti KTP dan STNK seketika. Proses klaim yang biasanya memakan waktu berminggu-minggu kini bisa selesai dalam hitungan menit.')}</p>
                <div className="flex items-center text-blue-500 text-sm font-bold cursor-pointer hover:underline" onClick={onSignIn}>Cari Asuransi <ChevronRight size={16}/></div>
             </div>
             
             {/* For Agents */}
             <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                   <Handshake size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{t('Peluang Mitra & Agen', 'Peluang Mitra & Agen')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{t('Punya jaringan luas? Jual asuransi dengan mudah melalui aplikasi kami. Lacak komisi Anda secara transparan dan tarik penghasilan Anda kapan saja tanpa potongan tersembunyi.', 'Punya jaringan luas? Jual asuransi dengan mudah melalui aplikasi kami. Lacak komisi Anda secara transparan dan tarik penghasilan Anda kapan saja tanpa potongan tersembunyi.')}</p>
                <div className="flex items-center text-emerald-500 text-sm font-bold cursor-pointer hover:underline" onClick={onSignIn}>Gabung Agen <ChevronRight size={16}/></div>
             </div>

             {/* For Investors */}
             <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5">
                <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                   <TrendingUp size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{t('Evolusi Industri', 'Evolusi Industri')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{t('Kami merampingkan biaya operasional asuransi dengan teknologi hemat biaya tanpa mengurangi kemampuan. Kami memberikan ekosistem yang sehat dan menguntungkan.', 'Kami merampingkan biaya operasional asuransi dengan teknologi hemat biaya tanpa mengurangi kemampuan. Kami memberikan ekosistem yang sehat dan menguntungkan.')}</p>
                <div className="flex items-center text-purple-500 text-sm font-bold cursor-pointer hover:underline" onClick={onSignIn}>Selengkapnya <ChevronRight size={16}/></div>
             </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-slate-200 dark:border-white/10 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} SurePath Technologies. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

export default PlatformLanding;
