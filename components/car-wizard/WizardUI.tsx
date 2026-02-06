
import React from 'react';
import { Cpu, Zap, ShieldCheck, Activity, Radio, Globe, Terminal } from 'lucide-react';

// Reusable Page Transition Wrapper
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-pop-in w-full h-full">
    {children}
  </div>
);

// Reusable Neural Bot Component 2.0 - More Premium
export const NeuralBot = ({ 
  className = "w-24 h-24", 
  mood = "scanning",
  color = "emerald" 
}: { 
  className?: string, 
  mood?: 'happy' | 'thinking' | 'scanning' | 'wave',
  color?: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate' | 'indigo' | 'purple'
}) => {
  const colorMap = {
    emerald: '#10b981',
    blue: '#3b82f6',
    rose: '#f43f5e',
    amber: '#f59e0b',
    slate: '#64748b',
    indigo: '#6366f1',
    purple: '#a855f7'
  };

  const accentColor = colorMap[color] || colorMap.emerald;

  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="botChassis" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
        <filter id="botShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="rgba(0,0,0,0.1)" />
        </filter>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      
      <g className="animate-float" filter="url(#botShadow)">
        {/* Main Chassis */}
        <rect x="30" y="40" width="140" height="120" rx="55" fill="url(#botChassis)" stroke="#d1d5db" strokeWidth="1" />
        
        {/* Inner Screen Surface */}
        <rect x="45" y="65" width="110" height="65" rx="25" fill="#0f172a" />
        
        {/* Subtle Bezel Highlight */}
        <rect x="47" y="67" width="106" height="61" rx="23" stroke="white" strokeOpacity="0.05" fill="none" />
        
        {/* Interactive Face */}
        <g className={mood === 'scanning' ? 'animate-pulse' : ''}>
          {(mood === 'happy' || mood === 'wave') && (
            <>
              <circle cx="75" cy="95" r="10" fill="url(#eyeGlow)" opacity="0.3" className="animate-pulse" />
              <circle cx="125" cy="95" r="10" fill="url(#eyeGlow)" opacity="0.3" className="animate-pulse" />
              <circle cx="75" cy="95" r="5" fill={accentColor} className="animate-blink" />
              <circle cx="125" cy="95" r="5" fill={accentColor} className="animate-blink" />
              <path d="M 80 115 Q 100 125 120 115" stroke={accentColor} strokeWidth="5" strokeLinecap="round" />
            </>
          )}
          {mood === 'scanning' && (
            <>
               <rect x="60" y="92" width="30" height="6" rx="3" fill={accentColor} />
               <rect x="110" y="92" width="30" height="6" rx="3" fill={accentColor} />
               <rect x="50" y="80" width="100" height="30" rx="8" fill={accentColor} opacity="0.1" />
               <line x1="50" y1="95" x2="150" y2="95" stroke={accentColor} strokeWidth="1" opacity="0.5" className="animate-scan-line" />
            </>
          )}
          {mood === 'thinking' && (
             <g className="fill-amber-400">
                <circle cx="70" cy="95" r="6" className="animate-bounce" />
                <circle cx="100" cy="95" r="6" className="animate-bounce delay-100" />
                <circle cx="130" cy="95" r="6" className="animate-bounce delay-200" />
             </g>
          )}
        </g>

        {/* Improved Antenna */}
        <path d="M 100 40 L 100 20" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
        <circle cx="100" cy="15" r="8" fill={mood === 'thinking' ? '#f59e0b' : accentColor} className="animate-ping" />
        
        {mood === 'wave' && (
          <path d="M 170 110 Q 195 90 185 60" stroke="#f97316" strokeWidth="8" strokeLinecap="round" className="animate-bounce" />
        )}
      </g>
    </svg>
  );
};

export const NeuralProcessingView = ({ label, sublabel }: { label: string, sublabel?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in relative min-h-[400px]">
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-40">
       <div className="w-[340px] h-[340px] border-2 border-primary-500/30 rounded-full animate-spin-slow"></div>
       <div className="absolute w-[280px] h-[280px] border-2 border-dashed border-brand-500/30 rounded-full animate-reverse-spin opacity-50"></div>
    </div>

    <div className="relative mb-10 group">
       <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
       <NeuralBot className="w-48 h-48 relative z-10" mood="thinking" />
    </div>

    <div className="space-y-4 relative z-10">
       <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          <h3 className="text-2xl font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">{label}</h3>
       </div>
       <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-[300px] mx-auto leading-relaxed italic">
          {sublabel || "Sabar ya, asisten AI SurePath sedang memproses permintaanmu..."}
       </p>
       
       <div className="w-72 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mx-auto shadow-inner mt-6">
          <div className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-brand-400 shadow-[0_0_15px_#f97316] animate-shimmer-fast w-[65%] rounded-full"></div>
       </div>
    </div>
  </div>
);

export const ScannerOverlay = ({ label }: { label: string }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in overflow-hidden">
    <div className="absolute inset-0 opacity-20" 
         style={{ 
             backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.4) 1px, transparent 1px)', 
             backgroundSize: '50px 50px',
             transform: 'perspective(600px) rotateX(25deg) scale(1.8)'
         }}>
    </div>

    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative mb-12">
         <div className="absolute inset-0 bg-primary-500/30 blur-[60px] rounded-full scale-150 animate-pulse"></div>
         <NeuralBot className="w-40 h-40 relative z-10" mood="scanning" />
         <div className="absolute top-[70%] left-1/2 -translate-x-1/2 w-64 h-80 bg-gradient-to-b from-blue-400/40 via-blue-500/10 to-transparent clip-path-beam animate-scan-beam z-0 pointer-events-none"></div>
      </div>
      
      <div className="relative z-30 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-black uppercase text-white tracking-[0.6em] drop-shadow-2xl animate-pulse">{label}</p>
          <div className="flex gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce delay-100"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce delay-200"></div>
          </div>
          <p className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest opacity-80">Sinkronisasi Matriks Neural</p>
      </div>
    </div>
  </div>
);

export const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
export const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };
  return (
    <span className={`px-3 py-1.5 rounded-xl text-[0.55rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>
      {children}
    </span>
  );
};
