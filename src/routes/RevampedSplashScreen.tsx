import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';
import { PathyMascot } from './splash';

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
  const bg = darkMode ? '#071a13' : '#f5fbf7';
  const fg = darkMode ? '#e8fff3' : '#064e3b';

  return (
    <main role="status" aria-live="polite" aria-label={copy.loading[step]}
      className="fixed inset-0 z-[5000] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{ background: `radial-gradient(ellipse at 50% 30%, ${darkMode ? 'rgba(0,193,106,.18)' : 'rgba(0,193,106,.12)'} 0%, transparent 48%), ${bg}`, color: fg, fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @keyframes sp-new-shimmer { from { transform:translateX(-130%); } to { transform:translateX(280%); } }
        @keyframes sp-new-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
        @keyframes sp-new-glow { 0%,100% { opacity:.45; transform:scale(.94); } 50% { opacity:.85; transform:scale(1.06); } }
        @media (prefers-reduced-motion: reduce) { .sp-new-motion, .sp-new-motion * { animation:none !important; transition:none !important; } }
      `}</style>
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" style={{ background: 'rgba(0,193,106,.10)' }}>
        <span className="absolute inset-y-0 left-0 w-2/5" style={{ background: 'linear-gradient(90deg,transparent,#00C16A,#B7F34A,transparent)', animation: 'sp-new-shimmer 1.5s ease-in-out infinite' }} />
      </div>
      <div className="absolute -top-20 h-72 w-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,.10)' }} />
      <div className="sp-new-motion relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="relative mb-4 flex h-48 w-48 items-center justify-center">
          <div className="absolute inset-4 rounded-full" style={{ background: 'linear-gradient(135deg,rgba(0,193,106,.12),rgba(183,243,74,.08))', animation: 'sp-new-glow 3s ease-in-out infinite' }} />
          <div className="absolute inset-2 rounded-full border" style={{ borderColor: darkMode ? 'rgba(52,211,153,.28)' : 'rgba(5,150,105,.20)' }} />
          <div style={{ animation: 'sp-new-float 3s ease-in-out infinite' }}><PathyMascot accentRgb="0,193,106" size={132} /></div>
          <span className="absolute right-2 top-8 rounded-full px-3 py-1 text-xs font-bold shadow-sm" style={{ background: '#B7F34A', color: '#064e3b' }}>Hi!</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: fg }}>{copy.welcome}</h1>
        <p className="mt-2 text-sm" style={{ color: darkMode ? '#9ac8b5' : '#52796b' }}>{copy.tagline}</p>
        <div className="mt-7 w-full max-w-[260px]">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold" style={{ color: darkMode ? '#a7f3d0' : '#28745a' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: '#00C16A' }} />
            <span>{copy.loading[step]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: darkMode ? '#17392c' : '#dcefe5' }}>
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#00C16A,#B7F34A)' }} />
          </div>
          <div className="mt-3 flex justify-between text-2xs font-bold tracking-[.18em]" style={{ color: darkMode ? '#739d8a' : '#86a99b' }}>
            <span>SUREPATH</span><span>{progress}%</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-7 flex items-center gap-3">
        <span className="text-2xs font-semibold tracking-[.14em]" style={{ color: darkMode ? '#739d8a' : '#86a99b' }}>{copy.ready}</span>
        <span style={{ color: darkMode ? '#739d8a' : '#86a99b' }}>·</span>
        {(['ID', 'EN'] as const).map(l => <button key={l} onClick={() => setLang(l as Language)} className="rounded-full px-2 py-1 text-2xs font-bold" style={{ color: lang === l ? '#064e3b' : (darkMode ? '#9ac8b5' : '#52796b'), background: lang === l ? '#B7F34A' : 'transparent' }}>{l}</button>)}
      </div>
    </main>
  );
};

type EntryProps = { name: string; onDone: () => void; lang: Language; darkMode: boolean };

export const RevampedAppEntryScreen: React.FC<EntryProps> = ({ name, onDone, lang, darkMode }) => {
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const t = window.setTimeout(() => doneRef.current(), 2100);
    return () => window.clearTimeout(t);
  }, []);
  const copy = COPY[lang === Language.EN ? 'EN' : 'ID'];
  const bg = darkMode ? '#071a13' : '#f5fbf7';
  const fg = darkMode ? '#e8fff3' : '#064e3b';
  return (
    <main className="fixed inset-0 z-[4999] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{ background: bg, color: fg, fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @keyframes sp-new-shimmer { from { transform:translateX(-130%); } to { transform:translateX(280%); } }
        @keyframes sp-new-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
        @media (prefers-reduced-motion: reduce) { .sp-new-motion, .sp-new-motion * { animation:none !important; transition:none !important; } }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 38%,rgba(0,193,106,.14),transparent 55%)' }} />
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-5" style={{ animation: 'sp-new-float 2.8s ease-in-out infinite' }}><PathyMascot accentRgb="0,193,106" size={124} /></div>
        <p className="text-sm font-semibold" style={{ color: '#00a968' }}>{copy.back}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{name}</h1>
        <p className="mt-3 rounded-full px-4 py-2 text-xs font-semibold" style={{ background: darkMode ? '#123b2b' : '#e0f7eb', color: darkMode ? '#a7f3d0' : '#08764d' }}>✓ {copy.verified}</p>
        <div className="mt-7 h-1.5 w-36 overflow-hidden rounded-full" style={{ background: darkMode ? '#17392c' : '#dcefe5' }}>
          <div className="h-full w-2/3 rounded-full" style={{ background: 'linear-gradient(90deg,#00C16A,#B7F34A)', animation: 'sp-new-shimmer 1.4s ease-in-out infinite' }} />
        </div>
      </div>
    </main>
  );
};

export default RevampedSplashScreen;
