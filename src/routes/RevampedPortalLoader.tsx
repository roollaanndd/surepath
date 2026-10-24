import React from 'react';
import { Language } from '../../types';

const COPY = {
  EN: { loading: 'Getting your space ready', detail: 'Your protection, made simple.' },
  ID: { loading: 'Menyiapkan ruang kamu', detail: 'Perlindungan kamu, dibuat mudah.' },
};

export const RevampedPortalLoader: React.FC<{ lang?: Language }> = ({ lang = Language.ID }) => {
  const copy = COPY[lang === Language.EN ? 'EN' : 'ID'];
  return (
    <main role="status" aria-live="polite" aria-label={copy.loading}
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden"
      style={{ background:'#ffffff', color:'#064e3b' }}>
      <style>{`
        @keyframes sp-loader-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes sp-loader-pulse { 0%,100% { opacity:.5; transform:scale(.96); } 50% { opacity:1; transform:scale(1.03); } }
        @keyframes sp-loader-sweep { from { transform:translateX(-130%); } to { transform:translateX(260%); } }
        @keyframes sp-loader-dot { 0%,80%,100% { opacity:.28; transform:translateY(0); } 40% { opacity:1; transform:translateY(-3px); } }
        @media (prefers-reduced-motion:reduce) { .sp-loader-motion,.sp-loader-motion * { animation:none !important; } }
      `}</style>
      <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden" style={{background:'#edf4ef'}}>
        <span className="absolute inset-y-0 left-0 w-2/5" style={{background:'linear-gradient(90deg,transparent,#00A85B,#B7D84B,#F28C28,transparent)',animation:'sp-loader-sweep 1.5s ease-in-out infinite'}} />
      </div>
      <div className="sp-loader-motion relative flex flex-col items-center px-6 text-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-3 rounded-full" style={{background:'radial-gradient(circle,rgba(0,193,106,.10),rgba(242,140,40,.025) 65%,transparent)',animation:'sp-loader-pulse 2.8s ease-in-out infinite'}} />
          <div className="absolute inset-1 rounded-full border" style={{borderColor:'#e6efe9'}} />
          <div className="absolute inset-1 rounded-full border-[2px] border-transparent" style={{borderTopColor:'#00A85B',borderRightColor:'#B7D84B',borderBottomColor:'#F28C28',animation:'sp-loader-spin 2.4s linear infinite'}} />
          <img src="/logo-sm.png" alt="SurePath" width="76" height="86" className="relative z-10 object-contain" />
          <span className="absolute right-1 top-5 h-2.5 w-2.5 rounded-full" style={{background:'#F28C28',boxShadow:'0 0 0 4px rgba(242,140,40,.10)'}} />
        </div>
        <div className="mt-6 text-base font-bold tracking-[.18em]" style={{fontFamily:"'Sora',sans-serif",color:'#064e3b'}}>SurePath</div>
        <p className="mt-2 text-sm" style={{color:'#638276'}}>{copy.detail}</p>
        <div className="mt-7 h-1.5 w-44 overflow-hidden rounded-full" style={{background:'#edf4ef'}}>
          <span className="block h-full w-2/5 rounded-full" style={{background:'linear-gradient(90deg,#08784E,#00A85B,#B7D84B,#F28C28)',animation:'sp-loader-sweep 1.5s ease-in-out infinite'}} />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-medium" style={{color:'#638276'}}>
          <span>{copy.loading}</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0,1,2].map(i => <i key={i} className="block h-1 w-1 rounded-full" style={{background:i===2?'#F28C28':'#00A85B',animation:`sp-loader-dot 1.15s ease-in-out ${i*.16}s infinite`}} />)}
          </span>
        </div>
      </div>
      <div className="absolute bottom-7 text-[10px] font-semibold tracking-[.18em]" style={{color:'#8ba79a'}}>SAFE • SIMPLE • SURE</div>
    </main>
  );
};

export default RevampedPortalLoader;
