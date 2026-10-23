import React from 'react';
import { Language } from '../../types';

const COPY = {
  EN: { loading: 'Getting your space ready', detail: 'Your protection, made simple.' },
  ID: { loading: 'Menyiapkan ruang kamu', detail: 'Perlindungan kamu, dibuat mudah.' },
};

export const RevampedPortalLoader: React.FC<{ lang?: Language }> = ({ lang = Language.ID }) => {
  const copy = COPY[lang === Language.EN ? 'EN' : 'ID'];
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={copy.loading}
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 38%, #e8fff3 0%, #f6fbf8 42%, #ffffff 100%)', color: '#064e3b' }}
    >
      <style>{`
        @keyframes surepath-loader-float { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-9px) rotate(1deg); } }
        @keyframes surepath-loader-pulse { 0%,100% { transform: scaleX(1); opacity:.2; } 50% { transform: scaleX(.72); opacity:.1; } }
        @keyframes surepath-loader-shimmer { from { transform: translateX(-110%); } to { transform: translateX(220%); } }
        @keyframes surepath-loader-dot { 0%,80%,100% { opacity:.28; transform:translateY(0); } 40% { opacity:1; transform:translateY(-3px); } }
        @media (prefers-reduced-motion: reduce) { .surepath-loader-motion, .surepath-loader-motion * { animation:none !important; } }
      `}</style>
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" style={{ background: 'rgba(0,193,106,.08)' }}>
        <span className="absolute inset-y-0 left-0 w-2/5" style={{ background: 'linear-gradient(90deg,transparent,#00C16A,#B7F34A,transparent)', animation: 'surepath-loader-shimmer 1.5s ease-in-out infinite' }} />
      </div>
      <div className="surepath-loader-motion relative flex flex-col items-center px-6 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <div className="absolute inset-1 rounded-[2.4rem]" style={{ background: 'linear-gradient(145deg,rgba(0,193,106,.16),rgba(183,243,74,.08))', boxShadow: '0 18px 55px rgba(0,105,75,.12)' }} />
          <div className="absolute inset-0 rounded-[2.4rem] border border-emerald-200/80" />
          <img src="/logo-sm.png" alt="SurePath" width="100" height="112" className="relative z-10 object-contain" style={{ animation: 'surepath-loader-float 2.8s ease-in-out infinite', filter: 'drop-shadow(0 12px 18px rgba(0,105,75,.22))' }} />
          <span className="absolute -right-1 top-5 h-3 w-3 rounded-full" style={{ background:'#B7F34A', boxShadow:'0 0 0 6px rgba(183,243,74,.16)' }} />
          <span className="absolute -left-2 bottom-7 h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-8 text-[1.05rem] font-extrabold tracking-[.24em]" style={{ fontFamily: "'Sora',sans-serif", color:'#064e3b' }}>SUREPATH</div>
        <p className="mt-2 text-sm font-medium" style={{ color:'#4b7667' }}>{copy.detail}</p>
        <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full" style={{ background:'#d8f3e5' }}>
          <span className="block h-full w-2/5 rounded-full" style={{ background:'linear-gradient(90deg,#00C16A,#B7F34A)', animation:'surepath-loader-shimmer 1.6s ease-in-out infinite' }} />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold" style={{ color:'#39715d' }}>
          <span>{copy.loading}</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0,1,2].map(i => <i key={i} className="block h-1 w-1 rounded-full bg-emerald-600" style={{ animation:`surepath-loader-dot 1.15s ease-in-out ${i*.16}s infinite` }} />)}
          </span>
        </div>
        <div className="mt-10 h-2 w-24 rounded-full" style={{ background:'radial-gradient(ellipse,rgba(6,78,59,.28),transparent 70%)', animation:'surepath-loader-pulse 2.8s ease-in-out infinite' }} />
      </div>
      <div className="absolute bottom-7 text-2xs font-bold tracking-[.22em]" style={{ color:'#86a99b' }}>SAFE • SIMPLE • SURE</div>
    </main>
  );
};

export default RevampedPortalLoader;
