
import React from 'react';
import { Zap, ArrowRight, ShieldCheck, Cpu, Globe, Terminal, Briefcase } from 'lucide-react';

interface AppSelectorProps {
  onSelect: (app: 'AGENT' | 'CLAIM' | 'HQ') => void;
  userName: string;
}

const AppSelector: React.FC<AppSelectorProps> = ({ onSelect, userName }) => {
  const APPS = [
    { 
      id: 'AGENT' as const, 
      label: 'Agent Module', 
      desc: 'Commission matrix & product deployment.', 
      icon: Briefcase, 
      color: 'bg-emerald-500', 
      tag: 'Partner Node'
    },
    { 
      id: 'CLAIM' as const, 
      label: 'Claim AI', 
      desc: '60s autonomous damage audit engine.', 
      icon: Zap, 
      color: 'bg-emerald-500', 
      tag: 'Express Path'
    },
    { 
      id: 'HQ' as const, 
      label: 'HQ Control', 
      desc: 'Global ledger & digital monitoring.', 
      icon: Terminal, 
      color: 'bg-blue-600', 
      tag: 'Command Level'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f0fdf9] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/5 opacity-100 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      
      <div className="max-w-5xl w-full space-y-16 animate-fade-in relative z-10">
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-xl border border-emerald-100 mb-4 animate-float">
             <ShieldCheck size={16} className="text-emerald-500"/>
             <span className="text-[0.7rem] font-black text-emerald-700 uppercase tracking-[0.4em]">Biometric ID Verified</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-midnight uppercase tracking-tighter leading-none">
            Welcome, <br/>
            <span className="text-emerald-500 text-glow-emerald">Pathfinder</span> {userName.split(' ')[0]}
          </h2>
          <div className="flex justify-center items-center gap-6 pt-4">
             <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-6 py-2 rounded-full border border-emerald-100 shadow-sm"><Globe size={14} className="text-emerald-500"/><span className="text-[0.65rem] font-black text-gray-600 uppercase tracking-widest">Node: JKT-S01</span></div>
             <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-6 py-2 rounded-full border border-emerald-100 shadow-sm"><Cpu size={14} className="text-emerald-500"/><span className="text-[0.65rem] font-black text-gray-600 uppercase tracking-widest">Sync: Active</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => onSelect(app.id)}
              className="group relative text-left glass-card rounded-[4rem] p-10 border-2 border-emerald-100 bg-white/90 hover:border-emerald-500 hover:shadow-[0_40px_80px_-20px_rgba(16,185,129,0.3)] transition-all duration-500 hover:scale-[1.05] hover:-translate-y-3 overflow-hidden active:scale-95"
            >
              <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-125 transition-all duration-1000">
                <app.icon size={240} />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className={`w-20 h-20 ${app.color} rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700 group-hover:rotate-6 group-hover:scale-110 shadow-emerald-500/20`}>
                  <app.icon size={36} />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${app.color} animate-pulse`}></div>
                     <span className="text-[0.6rem] font-black text-gray-400 uppercase tracking-widest">{app.tag}</span>
                  </div>
                  <h3 className="text-3xl font-black text-midnight uppercase tracking-tighter group-hover:text-emerald-600 transition-colors leading-none">{app.label}</h3>
                  <p className="text-[0.8rem] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    {app.desc}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[0.7rem] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 tracking-[0.25em]">
                  Initialize Node <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-10 text-center">
            <p className="text-[0.65rem] font-black text-emerald-800/30 uppercase tracking-[0.5em] animate-pulse">Select Environment to proceed through proses selanjutnya</p>
        </div>
      </div>
    </div>
  );
};

export default AppSelector;
