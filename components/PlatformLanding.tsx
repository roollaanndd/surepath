import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { ShieldCheck, ArrowRight, Zap, TrendingUp, Handshake, CheckCircle2, ChevronRight, Smartphone, Moon, Sun, Camera, FileText, Check } from 'lucide-react';
import { SurePathLogo } from './Navbar';
import { motion } from 'motion/react';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const AnimatedPhoneHero = () => {
  return (
    <div className="relative mx-auto w-full max-w-sm ml-auto z-10">
      {/* Glow Behind Phone */}
      <motion.div 
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-tr from-emerald-500/40 to-blue-500/40 rounded-[3rem] blur-3xl"
      />

      <div className="relative bg-white dark:bg-slate-900 rounded-[3.5rem] p-4 border-[10px] border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden h-[600px] flex flex-col">
          {/* Dynamic Island */}
          <div className="absolute top-0 inset-x-0 h-6 flex justify-center mt-2 z-20">
             <div className="w-32 h-6 bg-slate-950 rounded-full"></div>
          </div>

          <div className="pt-10 flex-1 flex flex-col relative z-10">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="flex justify-between items-center mb-8 px-2"
             >
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center"><SurePathLogo className="w-6 h-6"/></div>
                  <div>
                    <div className="text-sm font-black tracking-tight text-slate-900 dark:text-white">SurePath</div>
                    <div className="text-[0.6rem] uppercase tracking-widest font-bold text-emerald-500">Active Protection</div>
                  </div>
                </div>
             </motion.div>

             {/* Animated Claim Process Simulation */}
             <div className="flex-1 space-y-4 px-2 relative">
                
                {/* Simulated Camera Scan */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.9] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
                  className="absolute inset-x-2 top-0 bottom-32 bg-slate-100 dark:bg-slate-800 rounded-3xl border-2 border-emerald-500/50 flex flex-col items-center justify-center overflow-hidden z-20"
                >
                    <div className="w-full h-1 bg-emerald-500 absolute top-1/2 -mt-1 shadow-[0_0_15px_#10b981] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <Camera size={40} className="text-slate-400 mb-4 opacity-50" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scanning Document...</span>
                </motion.div>

                <motion.div 
                   animate={{ opacity: [1, 0, 0, 1] }}
                   transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
                   className="space-y-4 h-full"
                >
                   <div className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl text-white shadow-lg shadow-emerald-500/20 mb-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-medium text-emerald-100 mb-1">Toyota Yaris Cross</p>
                          <p className="font-black text-xl tracking-tight">Active Policy</p>
                        </div>
                        <ShieldCheck size={28} className="text-emerald-100" />
                      </div>
                      <div className="pt-4 border-t border-white/20">
                         <div className="w-24 h-1.5 bg-white/30 rounded-full mb-2"></div>
                         <div className="w-16 h-1.5 bg-white/20 rounded-full"></div>
                      </div>
                   </div>

                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Recent Activity</p>

                   {/* Mock Notifications */}
                   {[1, 2].map((i) => (
                     <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + (i * 0.1) }}
                        className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-white/5"
                      >
                        <div className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 1 ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                            {i === 1 ? <FileText size={18}/> : <Zap size={18}/>}
                          </div>
                          <div className="space-y-1.5">
                             <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{i === 1 ? 'Claim Approved' : 'Policy Renewed'}</div>
                             <div className="text-[0.65rem] text-slate-500 uppercase tracking-wider">{i === 1 ? 'Just now' : 'Yesterday'}</div>
                          </div>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                     </motion.div>
                   ))}
                </motion.div>
             </div>

             {/* Fake Button */}
             <div className="mt-auto pt-4 px-2">
               <div className="w-full h-14 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-xl">
                 <span className="text-white dark:text-slate-900 text-sm font-black tracking-widest uppercase">File a Claim</span>
               </div>
               <div className="h-1 w-1/3 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-6"></div>
             </div>
          </div>
      </div>
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-80px); }
          50% { transform: translateY(80px); }
        }
      `}</style>
    </div>
  );
};

const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const isDark = darkMode;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-700 font-sans selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-100">
      
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-0" 
           style={{ backgroundImage: `radial-gradient(circle at center, ${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
      />

      {/* Navbar Minimalist */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 transition-colors duration-700">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SurePathLogo className="w-8 h-8" />
            <span className="font-black tracking-tighter text-xl">Sure<span className="text-emerald-500">Path</span></span>
          </div>
          <div className="flex items-center gap-6">
            <button 
               onClick={() => setDarkMode(!darkMode)}
               className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
            >
               {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
              className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"
            >
              {lang === Language.EN ? 'ID' : 'EN'}
            </button>
            <button 
              onClick={onSignIn}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {t('Login Portal', 'Portal Masuk')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center min-h-[70vh]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
              <Zap size={14} className="text-emerald-500" /> {t('Welcome to the Future of Insurance', 'Masa Depan Asuransi Ada di Sini')}
            </div>
            
            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1] text-slate-900 dark:text-white">
              {t('Insurance,', 'Asuransi,')}<br/>
              <span className="text-emerald-500">{t('simplified.', 'tanpa ribet.')}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-medium">
              {t('Experience lightning-fast claims powered by AI, honest pricing, and an ecosystem built for you. Whether buying protection or joining as a partner.', 'Rasakan cepatnya proses klaim hitungan menit dibantu AI. Harga jujur, proses transparan, baik bagi Anda yang butuh proteksi maupun yang ingin jadi mitra.')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <button onClick={onSignIn} className="px-8 py-4 bg-emerald-500 text-white rounded-full text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all">
                  {t('Get Protected', 'Cari Asuransi')} <ArrowRight size={18} />
               </button>
               <button onClick={onSignIn} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5 active:scale-95 transition-all">
                  {t('Partner With Us', 'Jadi Mitra Kami')}
               </button>
            </div>

            {/* Micro proof points */}
            <div className="flex items-center gap-6 pt-8 text-sm font-medium text-slate-500">
               <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500"/> AI Document Scan</div>
               <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500"/> Instant Payouts</div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <AnimatedPhoneHero />
          </motion.div>
        </div>

        {/* Value Proposition */}
        <div className="max-w-7xl mx-auto mt-32 md:mt-48">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">{t('Why SurePath?', 'Kenapa Memilih SurePath?')}</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">{t('We rebuilt insurance from the ground up to be fair, transparent, and incredibly fast for everyone involved.', 'Kami membangun ulang asuransi dari awal untuk menjadi adil, transparan, dan sangat cepat untuk semua orang.')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
             {/* For Users */}
             <motion.div 
               whileHover={{ y: -5 }}
               className="bg-slate-50 dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 transition-all"
             >
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mb-8">
                   <Zap size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{t('Lightning Fast Claims', 'Klaim Super Cepat')}</h3>
                <p className="text-slate-500 leading-relaxed mb-8">{t('Our intelligent AI reads documents like IDs and registrations instantly. Claims that took weeks now resolve in minutes, without the headache.', 'AI cerdas kami membaca dokumen Anda seketika. Klaim yang biasanya memakan waktu berminggu-minggu kini selesai dalam beberapa menit tanpa pusing.')}</p>
                <div className="flex items-center text-blue-500 text-sm font-bold uppercase tracking-widest cursor-pointer hover:gap-2 transition-all" onClick={onSignIn}>{t('Browse Coverage', 'Lihat Proteksi')} <ChevronRight size={16}/></div>
             </motion.div>
             
             {/* For Agents */}
             <motion.div 
               whileHover={{ y: -5 }}
               className="bg-slate-50 dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 transition-all"
             >
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mb-8">
                   <Handshake size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{t('Empowered Partners', 'Untuk Mitra & Agen')}</h3>
                <p className="text-slate-500 leading-relaxed mb-8">{t('Have a network? Sell insurance seamlessly through our app. Track commissions natively and withdraw your earnings anytime with zero hidden fees.', 'Punya jaringan? Jualan asuransi dengan mudah. Lacak komisi langsung di aplikasi dan cairkan kapan saja tanpa potongan sembunyi.')}</p>
                <div className="flex items-center text-emerald-500 text-sm font-bold uppercase tracking-widest cursor-pointer hover:gap-2 transition-all" onClick={onSignIn}>{t('Join Agent Network', 'Gabung Jadi Agen')} <ChevronRight size={16}/></div>
             </motion.div>

             {/* For Investors */}
             <motion.div 
               whileHover={{ y: -5 }}
               className="bg-slate-50 dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 transition-all"
             >
                <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-3xl flex items-center justify-center mb-8">
                   <TrendingUp size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{t('Efficient Architecture', 'Evolusi Industri')}</h3>
                <p className="text-slate-500 leading-relaxed mb-8">{t('We slash overhead costs using highly optimized AI APIs. This near-zero operational friction translates to a highly profitable and scalable ecosystem.', 'Kami memangkas biaya operasional menggunakan teknologi API dan AI yang efisien (hampir tanpa biaya server). Menciptakan ekosistem untung maksimal.')}</p>
                <div className="flex items-center text-purple-500 text-sm font-bold uppercase tracking-widest cursor-pointer hover:gap-2 transition-all" onClick={onSignIn}>{t('Learn More', 'Pelajari Lanjut')} <ChevronRight size={16}/></div>
             </motion.div>
          </div>
        </div>

        {/* Call to Action Bottom */}
        <div className="max-w-7xl mx-auto mt-32 bg-slate-900 dark:bg-slate-800 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 blur-3xl"></div>
           <div className="relative z-10">
             <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">{t('Ready for Insurance without the BS?', 'Siap Asuransi Tanpa Ribet?')}</h2>
             <p className="text-slate-300 mb-10 max-w-xl mx-auto text-lg">{t('Join thousands of users and agents who have upgraded to SurePath.', 'Bergabung bersama ribuan pengguna dan agen yang sudah beralih ke SurePath.')}</p>
             <button onClick={onSignIn} className="px-10 py-5 bg-emerald-500 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-emerald-400 shadow-2xl active:scale-95 transition-all">
                {t('Open the App', 'Buka Aplikasi')}
             </button>
           </div>
        </div>

        {/* Footer info */}
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-slate-200 dark:border-white/5 text-center text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <SurePathLogo className="w-5 h-5 text-slate-400 grayscale" />
            <span className="font-bold tracking-tight text-slate-400">SurePath</span>
          </div>
          <p className="text-sm font-medium">&copy; {new Date().getFullYear()} SurePath Technologies. Asuransi Masa Depan.</p>
        </div>
      </main>
    </div>
  );
};

export default PlatformLanding;
