import React from 'react';
import { Button, Badge } from '../shared/UI';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';

// Fixed: Added lang prop to Hero to resolve TS error in DesktopWebsite.tsx
const Hero = ({ onAction, lang = 'ID' }: { onAction: () => void, lang?: string }) => {
  return (
    <section className="relative pt-40 pb-32 overflow-hidden bg-[#fafaf9] dark:bg-[#050505] transition-colors duration-700">
      
      {/* Antigravity Gradients & Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-[0.15]"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-primary-500/10 dark:bg-primary-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left Content Column */}
        <div className="space-y-10 animate-fade-in relative z-20">
          <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 glass-premium px-4 py-1.5">
            <CheckCircle2 size={14} className="animate-pulse" /> 
            {lang === 'EN' ? 'Trusted & Supervised by OJK' : 'Terpercaya & Diawasi OJK'}
          </Badge>
          
          <div className="space-y-4">
             <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white leading-[0.95] tracking-tighter">
               {lang === 'EN' ? 'DEFY' : 'LEWATI'} <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-primary-500 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                 {lang === 'EN' ? 'GRAVITY.' : 'BATASAN.'}
               </span>
             </h1>
             <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium tracking-tight">
               {lang === 'EN' ? 'Insurance re-engineered for the neural age.' : 'Asuransi berevolusi untuk era neural.'}
             </p>
          </div>
          
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg font-medium">
            {lang === 'EN' 
              ? 'SurePath strips away the archaic friction of traditional insurance. Experience frictionless protection, zero-document claims, and 24/7 AI-driven support.'
              : 'SurePath menghilangkan kerumitan asuransi tradisional. Rasakan proteksi tanpa hambatan, klaim nol-dokumen, dan dukungan AI 24/7 murni.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 pt-4">
            <button 
              onClick={onAction} 
              className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-sm tracking-widest rounded-2xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] dark:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center gap-3">
                {lang === 'EN' ? 'Initialize Coverage' : 'Inisialisasi Proteksi'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="flex items-center gap-3 px-8 py-4 font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors group">
              <div className="w-12 h-12 rounded-full border border-slate-200 dark:border-white/10 glass-premium flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                <Play size={16} fill="currentColor" className="group-hover:scale-110 transition-transform"/>
              </div>
              <span className="uppercase text-xs tracking-widest">{lang === 'EN' ? 'Neural Demo' : 'Demo Sistem'}</span>
            </button>
          </div>

          <div className="flex gap-12 pt-10 border-t border-slate-200 dark:border-white/10">
            <div className="space-y-1">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">50k<span className="text-emerald-500">+</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang === 'EN' ? 'Active Nodes' : 'Node Aktif'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">99<span className="text-emerald-500">%</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang === 'EN' ? 'System Auth' : 'Otorisasi'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">5<span className="text-emerald-500">m</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang === 'EN' ? 'Sync Time' : 'Waktu Sync'}</p>
            </div>
          </div>
        </div>

        {/* Right Content - Abstract Antigravity UI */}
        <div className="hidden lg:flex relative items-center justify-center h-[600px] w-full animate-fade-in perspective-1000">
          {/* Central Gravity Well */}
          <div className="absolute w-[400px] h-[400px] rounded-full border border-emerald-500/20 dark:border-emerald-500/30 bg-radial-glow animate-glow-pulse flex items-center justify-center backdrop-blur-sm z-0">
             <div className="w-[300px] h-[300px] rounded-full border border-primary-500/20 border-dashed animate-[spin_40s_linear_infinite]"></div>
             <div className="absolute w-[200px] h-[200px] rounded-full bg-emerald-500/5 backdrop-blur-md border border-white/10 dark:border-white/5 animate-[spin_30s_linear_infinite_reverse]"></div>
          </div>
          
          {/* Floating Orb 1 */}
          <div className="absolute top-10 right-20 w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 animate-antigravity-orb shadow-[0_0_50px_rgba(16,185,129,0.5)] z-20 flex items-center justify-center">
             <div className="w-full h-full rounded-full bg-white/20 blur-md absolute inset-0"></div>
          </div>
          
          {/* Floating Orb 2 */}
          <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 animate-antigravity-orb animation-delay-2000 shadow-[0_0_40px_rgba(249,115,22,0.5)] z-10"></div>
          
          {/* Floating Glass Component (Simulated UI) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 glass-premium p-6 rounded-3xl w-72 animate-antigravity-float animation-delay-4000 border border-white/40 dark:border-white/10 shadow-2xl z-30">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                   <CheckCircle2 size={24} className="animate-pulse" />
                </div>
                <div>
                   <span className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest">{lang === 'EN' ? 'Claim Synced' : 'Klaim Sync'}</span>
                   <p className="text-[10px] text-emerald-500 font-bold tracking-widest mt-0.5">STATUS 200 OK</p>
                </div>
             </div>
             <div className="space-y-3">
                <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full w-[100%] bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest">
                   <span>{lang === 'EN' ? 'Neural Validation' : 'Validasi Neural'}</span>
                   <span className="text-emerald-500">100%</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
