import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';

const COPY = {
  ID: {
    welcome: 'Halo, selamat datang!',
    tagline: 'Perlindungan kamu, dibuat mudah.',
    loading: ['Menyiapkan pengalamanmu', 'Memuat ruang SurePath', 'Menyiapkan perlindunganmu', 'Hampir selesai'],
    ready: 'Aman • Simpel • Pasti',
    back: 'Selamat datang kembali',
    verified: 'Akun siap digunakan',
  },
  EN: {
    welcome: 'Hello, welcome!',
    tagline: 'Your protection, made simple.',
    loading: ['Preparing your experience', 'Loading your SurePath space', 'Getting your protection ready', 'Almost there'],
    ready: 'Safe • Simple • Sure',
    back: 'Welcome back',
    verified: 'Your account is ready',
  },
} as const;

type Props = { lang: Language; setLang: (lang: Language) => void; darkMode: boolean; onFinish: () => void };

const BrandMark: React.FC<{ size?: number }> = ({ size = 112 }) => (
  <img src="/logo-sm.png" width={size} height={size} alt="SurePath" className="sp-brand-mark" />
);

export const RevampedSplashScreen: React.FC<Props> = ({ lang, setLang, darkMode, onFinish }) => {
  const [progress, setProgress] = useState(4);
  const [step, setStep] = useState(0);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const start = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, Math.round((elapsed / 2900) * 100)));
      setStep(Math.min(COPY[lang].loading.length - 1, Math.floor(elapsed / 760)));
    }, 90);
    const done = window.setTimeout(() => finishRef.current(), 3300);
    return () => { window.clearInterval(tick); window.clearTimeout(done); };
  }, [lang]);

  const copy = COPY[lang];
  const bg = darkMode ? '#071a13' : '#ffffff';
  const fg = darkMode ? '#e8fff3' : '#064e3b';
  const muted = darkMode ? '#9ac8b5' : '#638276';

  return (
    <main role="status" aria-live="polite" aria-label={copy.loading[step]}
      className="sp-splash fixed inset-0 z-[5000] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{ background: bg, color: fg, fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @keyframes sp-brand-arrive { from { opacity:0; transform:translateY(9px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes sp-brand-orbit { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes sp-brand-breathe { 0%,100% { opacity:.45; transform:scale(.94); } 50% { opacity:.85; transform:scale(1.04); } }
        @keyframes sp-brand-progress { from { transform:translateX(-120%); } to { transform:translateX(260%); } }
        .sp-brand-mark { object-fit:contain; display:block; animation:sp-brand-arrive .7s cubic-bezier(.2,.8,.2,1) both; }
        .sp-splash-orbit { position:absolute; inset:4px; border:1.5px solid ${darkMode ? 'rgba(52,211,153,.25)' : 'rgba(0,105,65,.12)'}; border-top-color:#F28C28; border-radius:999px; animation:sp-brand-orbit 3.8s linear infinite; }
        @media (prefers-reduced-motion:reduce) { .sp-brand-mark,.sp-splash-orbit,.sp-splash-glow,.sp-splash-progress { animation:none !important; } }
      `}</style>
      <div className="absolute -top-24 h-80 w-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: darkMode ? 'rgba(0,193,106,.10)' : 'rgba(0,193,106,.055)' }} />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="relative mb-7 flex h-40 w-40 items-center justify-center">
          <div className="sp-splash-glow absolute inset-4 rounded-full" style={{ background:'radial-gradient(circle,rgba(0,193,106,.10),rgba(242,140,40,.035) 58%,transparent 72%)', animation:'sp-brand-breathe 3.2s ease-in-out infinite' }} />
          <div className="sp-splash-orbit" />
          <BrandMark size={106} />
          <span className="absolute right-2 top-5 h-3 w-3 rounded-full" style={{ background:'#F28C28', boxShadow:'0 0 0 5px rgba(242,140,40,.10)' }} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color:fg }}>SurePath</h1>
        <p className="mt-2 text-sm" style={{ color:muted }}>{copy.tagline}</p>
        <div className="mt-8 w-full max-w-[260px]">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium" style={{ color:muted }}>
            <span>{copy.loading[step]}</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              {[0,1,2].map(i => <i key={i} className="block h-1 w-1 rounded-full" style={{ background:i===2?'#F28C28':'#00A85B', animation:`sp-brand-breathe 1.2s ease-in-out ${i*.16}s infinite` }} />)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background:darkMode?'#17392c':'#edf4ef' }}>
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width:`${progress}%`, background:'linear-gradient(90deg,#08784E,#00A85B,#B7D84B,#F28C28)' }} />
          </div>
          <div className="mt-3 flex justify-between text-2xs font-semibold tracking-[.16em]" style={{ color:muted }}>
            <span>SUREPATH</span><span>{progress}%</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-7 flex items-center gap-3">
        <span className="text-2xs font-semibold tracking-[.12em]" style={{ color:muted }}>{copy.ready}</span>
        <span style={{ color:muted }}>·</span>
        {(['ID', 'EN'] as const).map(l => <button key={l} onClick={() => setLang(l as Language)} className="rounded-full px-2 py-1 text-2xs font-bold" style={{ color:lang===l?'#064e3b':muted, background:lang===l?'#e8f5ec':'transparent', borderBottom:lang===l?'2px solid #F28C28':'2px solid transparent' }}>{l}</button>)}
      </div>
    </main>
  );
};

type EntryProps = { name: string; onDone: () => void; lang: Language; darkMode: boolean };

export const RevampedAppEntryScreen: React.FC<EntryProps> = ({ name, onDone, lang, darkMode }) => {
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const t = window.setTimeout(() => doneRef.current(), 1700);
    return () => window.clearTimeout(t);
  }, []);
  const copy = COPY[lang === Language.EN ? 'EN' : 'ID'];
  const bg = darkMode ? '#071a13' : '#ffffff';
  const fg = darkMode ? '#e8fff3' : '#064e3b';
  return (
    <main className="fixed inset-0 z-[4999] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{ background:bg, color:fg, fontFamily:"'Sora',sans-serif" }}>
      <style>{`
        @keyframes sp-entry-arrive { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion:reduce) { .sp-entry-motion,.sp-entry-motion * { animation:none !important; transition:none !important; } }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 50% 40%,rgba(0,193,106,.07),transparent 54%)' }} />
      <div className="sp-entry-motion relative z-10 flex flex-col items-center" style={{ animation:'sp-entry-arrive .45s ease-out both' }}>
        <BrandMark size={96} />
        <p className="mt-5 text-sm font-semibold" style={{ color:'#078451' }}>{copy.back}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{name}</h1>
        <p className="mt-3 rounded-full px-4 py-2 text-xs font-semibold" style={{ background:darkMode?'#123b2b':'#f1f8f3', color:darkMode?'#a7f3d0':'#08764d', border:'1px solid rgba(0,168,91,.12)' }}>✓ {copy.verified}</p>
        <div className="mt-7 h-1.5 w-36 overflow-hidden rounded-full" style={{ background:darkMode?'#17392c':'#edf4ef' }}>
          <div className="h-full w-2/3 rounded-full" style={{ background:'linear-gradient(90deg,#00A85B,#B7D84B,#F28C28)', animation:'sp-entry-arrive 1s ease-out both' }} />
        </div>
      </div>
    </main>
  );
};

export default RevampedSplashScreen;
