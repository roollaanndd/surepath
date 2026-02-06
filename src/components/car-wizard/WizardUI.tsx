import React from 'react';
import { Cpu, Zap, ShieldCheck, Activity, Radio, Globe, Terminal } from 'lucide-react';

// Reusable Neural Bot Component for various states
export const NeuralBot = ({ className = "w-24 h-24", mood = "scanning" }: { className?: string, mood?: 'happy' | 'thinking' | 'scanning' }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="botGradientSmall" x1="0" y1="0" x2="200" y2="200">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>
    
    <g className="animate-float">
      {/* Body */}
      <rect x="40" y="50" width="120" height="100" rx="40" fill="url(#botGradientSmall)" stroke="#cbd5e1" strokeWidth="2" />
      
      {/* Face Screen */}
      <rect x="55" y="75" width="90" height="50" rx="15" fill="#0f172a" />
      
      {/* Eyes */}
      <g className={mood === 'scanning' ? 'animate-pulse' : ''}>
        {mood === 'happy' && (
          <>
            <circle cx="80" cy="100" r="8" fill="#10b981" className="animate-blink" />
            <circle cx="120" cy="100" r="8" fill="#10b981" className="animate-blink" />
            <path d="M 85 115 Q 100 123 115 115" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {mood === 'scanning' && (
          <>
             <rect x="65" y="95" width="20" height="8" rx="2" fill="#3b82f6" />
             <rect x="115" y="95" width="20" height="8" rx="2" fill="#3b82f6" />
             <rect x="60" y="90" width="80" height="18" rx="5" fill="#60a5fa" opacity="0.2" className="animate-pulse" />
          </>
        )}
        {mood === 'thinking' && (
             <g className="fill-orange-400">
                <circle cx="75" cy="100" r="4" className="animate-bounce" />
                <circle cx="100" cy="100" r="4" className="animate-bounce delay-100" />
                <circle cx="125" cy="100" r="4" className="animate-bounce delay-200" />
             </g>
        )}
      </g>

      {/* Antenna */}
      <line x1="100" y1="50" x2="100" y2="30" stroke="#cbd5e1" strokeWidth="4" />
      <circle cx="100" cy="25" r="6" fill={mood === 'thinking' ? '#fb923c' : '#10b981'} className="animate-ping" />
    </g>
  </svg>
);

export const NeuralProcessingView = ({ label, sublabel }: { label: string, sublabel?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in relative min-h-[400px]">
    {/* Concentric Rotating Rings */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-40">
       <div className="w-[300px] h-[300px] border border-primary-500 rounded-full animate-spin-slow"></div>
       <div className="absolute w-[240px] h-[240px] border border-dashed border-brand-500 rounded-full animate-reverse-spin opacity-50"></div>
       <div className="absolute w-[180px] h-[180px] border border-primary-300 rounded-full animate-pulse"></div>
    </div>

    {/* mascot */}
    <div className="relative mb-10 group">
       <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full group-hover:bg-brand-500/30 transition-colors duration-1000"></div>
       <NeuralBot className="w-40 h-40 relative z-10" mood="thinking" />
       
       {/* Data Nodes orbiting */}
       <div className="absolute top-0 right-0 p-2 bg-white dark:bg-white/10 rounded-xl shadow-lg border border-black/5 animate-float"><Cpu size={16} className="text-primary-500"/></div>
       <div className="absolute bottom-4 left-0 p-2 bg-white dark:bg-white/10 rounded-xl shadow-lg border border-black/5 animate-float animation-delay-2000"><Zap size={16} className="text-brand-500"/></div>
    </div>

    <div className="space-y-4 relative z-10">
       <div className="flex items-center justify-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
          <h3 className="text-xl font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">{label}</h3>
       </div>
       <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-[0.3em] max-w-[280px] mx-auto leading-relaxed">
          {sublabel || "Establishing secure connection to the SurePath Neural Engine cluster."}
       </p>
       
       {/* Refined Progress Bar */}
       <div className="w-64 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mx-auto shadow-inner mt-4">
          <div className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-brand-400 shadow-[0_0_15px_#f97316] animate-shimmer-fast w-[60%] rounded-full"></div>
       </div>
    </div>
    
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes shimmerFast {
        0% { transform: translateX(-150%); }
        100% { transform: translateX(150%); }
      }
      .animate-shimmer-fast {
        animation: shimmerFast 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
    ` }} />
  </div>
);

export const ScannerOverlay = ({ label }: { label: string }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in overflow-hidden">
    {/* Background Grid */}
    <div className="absolute inset-0 opacity-20" 
         style={{ 
             backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(20deg) scale(1.5)'
         }}>
    </div>

    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Bot Animation */}
      <div className="relative mb-8">
         <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full"></div>
         <NeuralBot className="w-32 h-32 relative z-10" mood="scanning" />
         
         {/* Scanning Beam from Eyes */}
         <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-48 h-64 bg-gradient-to-b from-blue-400/30 to-transparent clip-path-beam animate-scan-beam z-0 pointer-events-none"></div>
      </div>
      
      {/* Reticle Corners */}
      <div className="absolute top-8 left-8 w-10 h-10 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
      <div className="absolute top-8 right-8 w-10 h-10 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
      <div className="absolute bottom-8 left-8 w-10 h-10 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
      <div className="absolute bottom-8 right-8 w-10 h-10 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>

      <div className="relative z-30 flex flex-col items-center gap-3 text-center">
          <p className="text-[0.9rem] font-black uppercase text-white tracking-[0.5em] drop-shadow-xl animate-pulse">{label}</p>
          <div className="flex items-center justify-center gap-3">
             <div className="flex gap-1">
                <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce delay-200"></div>
             </div>
             <p className="text-[0.6rem] font-bold text-gray-300 uppercase tracking-widest">Neural Mesh Sync</p>
          </div>
      </div>
    </div>
    
    <style dangerouslySetInnerHTML={{ __html: `
      .clip-path-beam {
        clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
      }
      @keyframes scanBeam {
        0%, 100% { opacity: 0.2; transform: translateX(-50%) scaleY(0.8); }
        50% { opacity: 0.6; transform: translateX(-50%) scaleY(1.1); }
      }
      .animate-scan-beam {
        animation: scanBeam 2s ease-in-out infinite;
      }
    ` }} />
  </div>
);

export const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[0.5rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>
      {children}
    </span>
  );
};

export const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
