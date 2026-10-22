import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Language } from '../../types';

const COPY = {
  ID: {
    welcome: 'Halo, selamat datang!',
    tagline: 'Perlindungan kamu, dibuat mudah.',
    loading: ['Menyiapkan pengalamanmu', 'Memuat ruang SurePath', 'Menyiapkan perlindunganmu', 'Hampir selesai'],
    ready: 'Aman • Simpel • Pasti',
    back: 'Selamat datang kembali',
    verified: 'Akun siap digunakan',
    skip: 'Lewati',
    skipHint: 'Ketuk di mana saja untuk melewati',
  },
  EN: {
    welcome: 'Hello, welcome!',
    tagline: 'Your protection, made simple.',
    loading: ['Preparing your experience', 'Loading your SurePath space', 'Getting your protection ready', 'Almost there'],
    ready: 'Safe • Simple • Sure',
    back: 'Welcome back',
    verified: 'Your account is ready',
    skip: 'Skip',
    skipHint: 'Tap anywhere to skip',
  },
} as const;

/* ------------------------------------------------------------------ *
 * Brand choreography CSS.
 *
 * Every animated element declares its FINAL state as its base style and
 * animates towards it with `animation-fill-mode: both`. That means the
 * `prefers-reduced-motion` block only has to switch animations off: what
 * is left is a calm, correct, final frame.
 *
 * All delays/durations are scaled by `--t` so the same mark can play at
 * full length on the splash (--t: 1) and compressed on the entry screen.
 * ------------------------------------------------------------------ */
const BRAND_CSS = `
@keyframes sp-wow-draw      { from { stroke-dashoffset: 376; } to { stroke-dashoffset: 0; } }
@keyframes sp-wow-flood     { from { transform: translateY(168px); } to { transform: translateY(0); } }
@keyframes sp-wow-trace     { from { stroke-dashoffset: 150; } to { stroke-dashoffset: 0; } }
@keyframes sp-wow-unfurl    { 0% { opacity: 0; transform: scale(.25) rotate(-22deg); } 60% { opacity: 1; } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
@keyframes sp-wow-markout   { from { opacity: 1; } to { opacity: 0; } }
@keyframes sp-wow-logoin    { from { opacity: 0; transform: scale(1.045); } to { opacity: 1; transform: scale(1); } }
@keyframes sp-wow-halo      { 0%, 100% { opacity: .42; transform: scale(.95); } 50% { opacity: .78; transform: scale(1.05); } }
@keyframes sp-wow-spin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes sp-wow-settle    { from { opacity: 0; transform: translateY(12px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes sp-wow-letter    { from { opacity: 0; transform: translateY(16px) rotate(-3deg); } to { opacity: 1; transform: translateY(0) rotate(0deg); } }
@keyframes sp-wow-rise      { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sp-wow-prog      { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes sp-wow-shimmer   { from { transform: translateX(-130%); } to { transform: translateX(280%); } }
@keyframes sp-wow-exit      { from { opacity: 1; } to { opacity: 0; } }
@keyframes sp-wow-liftoff   { from { transform: scale(1); } to { transform: scale(1.055); } }
@keyframes sp-wow-motes     { 0% { opacity: 0; transform: translateY(0) rotate(0deg); } 18% { opacity: .55; } 100% { opacity: 0; transform: translateY(-150px) rotate(140deg); } }
@keyframes sp-wow-ride      { 0% { offset-distance: 0%; opacity: 0; } 12% { opacity: 1; } 82% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }

.sp-wow-mark      { position: relative; display: block; }
.sp-wow-halo      { position: absolute; inset: -16%; border-radius: 50%; opacity: .6; animation: sp-wow-halo 3.8s ease-in-out infinite; pointer-events: none; }
.sp-wow-ring      { position: absolute; left: 50%; top: 50%; border-radius: 50%; animation: sp-wow-spin 26s linear infinite; pointer-events: none; }
.sp-wow-svg       { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0;
                    animation: sp-wow-markout calc(500ms * var(--t)) cubic-bezier(.4,0,.2,1) calc(2080ms * var(--t)) both; }
.sp-wow-logo      { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 1;
                    animation: sp-wow-logoin calc(560ms * var(--t)) cubic-bezier(.33,1,.68,1) calc(2060ms * var(--t)) both; }
.sp-wow-shield    { stroke-dasharray: 376; stroke-dashoffset: 0;
                    animation: sp-wow-draw calc(960ms * var(--t)) cubic-bezier(.65,.02,.32,1) calc(80ms * var(--t)) both; }
.sp-wow-flood     { transform: translateY(0);
                    animation: sp-wow-flood calc(880ms * var(--t)) cubic-bezier(.28,.74,.28,1) calc(840ms * var(--t)) both; }
.sp-wow-trace     { stroke-dasharray: 150; stroke-dashoffset: 0;
                    animation: sp-wow-trace calc(800ms * var(--t)) cubic-bezier(.45,.08,.25,1) calc(1140ms * var(--t)) both; }
.sp-wow-spark     { opacity: 0; offset-path: path('M101 27 C 83 46, 56 56, 46 84 C 38 108, 50 124, 64 134'); offset-rotate: 0deg;
                    animation: sp-wow-ride calc(800ms * var(--t)) cubic-bezier(.45,.08,.25,1) calc(1140ms * var(--t)) both; }
.sp-wow-leaf      { transform-box: fill-box; transform-origin: 18% 88%; opacity: 1;
                    animation: sp-wow-unfurl calc(560ms * var(--t)) cubic-bezier(.22,.9,.3,1) calc(1660ms * var(--t)) both; }

.sp-wow-stage     { animation: sp-wow-liftoff 460ms cubic-bezier(.4,0,.2,1) 2860ms both; }
.sp-wow-fade      { animation: sp-wow-exit 320ms cubic-bezier(.4,0,1,1) 2980ms forwards; }
.sp-wow-fade-e    { animation: sp-wow-exit 300ms cubic-bezier(.4,0,1,1) 1800ms forwards; }
.sp-wow-stage-e   { animation: sp-wow-liftoff 420ms cubic-bezier(.4,0,.2,1) 1700ms both; }
.sp-wow-in        { opacity: 1; transform: none; animation: sp-wow-settle 720ms cubic-bezier(.22,1,.36,1) both; }
.sp-wow-up        { opacity: 1; transform: none; animation: sp-wow-rise 620ms cubic-bezier(.22,1,.36,1) both; }
.sp-wow-ltr       { display: inline-block; opacity: 1; transform: none;
                    animation: sp-wow-letter 640ms cubic-bezier(.22,1,.36,1) both; }
.sp-wow-bar       { transform-origin: left center; transform: scaleX(1);
                    animation: sp-wow-prog 2860ms cubic-bezier(.35,.5,.3,1) 120ms both; }
.sp-wow-sheen     { animation: sp-wow-shimmer 1.9s cubic-bezier(.4,0,.2,1) infinite; }
.sp-wow-mote      { opacity: 0; animation: sp-wow-motes 9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .sp-wow, .sp-wow * { animation: none !important; transition: none !important; }
  .sp-wow-svg, .sp-wow-spark { opacity: 0 !important; }
  .sp-wow-logo, .sp-wow-in, .sp-wow-up, .sp-wow-ltr, .sp-wow-leaf { opacity: 1 !important; transform: none !important; }
  .sp-wow-mote { opacity: 0 !important; }
}
`;

type MarkProps = { size: number; uid: string; speed?: number };

/** Inline, animatable recreation of the SurePath mark: shield + green
 *  swooshes + the white "path" sweeping through it + the leaf. The real
 *  /logo.png cross-fades on top at the end so the final frame is exact. */
const BrandMark: React.FC<MarkProps> = ({ size, uid, speed = 1 }) => {
  const h = Math.round(size * 1.1667);
  const g = (n: string) => `sp-${n}-${uid}`;
  return (
    <div
      className="sp-wow-mark"
      style={{ ['--t' as string]: speed, width: size, height: h } as React.CSSProperties}
    >
      <div
        className="sp-wow-halo"
        style={{ background: 'radial-gradient(circle at 50% 46%, rgba(0,193,106,.34), rgba(183,243,74,.12) 46%, transparent 72%)' }}
      />
      <div
        className="sp-wow-ring"
        style={{
          width: h * 1.04,
          height: h * 1.04,
          marginLeft: -(h * 1.04) / 2,
          marginTop: -(h * 1.04) / 2,
          border: '1px dashed rgba(0,193,106,.22)',
        }}
      />

      <svg className="sp-wow-svg" viewBox="0 0 120 140" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={g('body')} x1="0.05" y1="1" x2="0.95" y2="0">
            <stop offset="0" stopColor="#0B5F31" />
            <stop offset="0.34" stopColor="#15823C" />
            <stop offset="0.66" stopColor="#7CC243" />
            <stop offset="1" stopColor="#B7F34A" />
          </linearGradient>
          <linearGradient id={g('stroke')} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#0E7A3C" />
            <stop offset="0.55" stopColor="#7CC243" />
            <stop offset="1" stopColor="#B7F34A" />
          </linearGradient>
          <linearGradient id={g('flood')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.13" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <clipPath id={g('clip')}>
            <path d="M60 6 L110 26 V70 C110 104 88 126 60 134 C32 126 10 104 10 70 V26 Z" />
          </clipPath>
          <mask id={g('mask')} maskUnits="userSpaceOnUse" x="-12" y="-22" width="146" height="168">
            <rect className="sp-wow-flood" x="-12" y="-22" width="146" height="166" fill={`url(#${g('flood')})`} />
          </mask>
        </defs>

        {/* 2 — the green body floods in from the base of the shield */}
        <g clipPath={`url(#${g('clip')})`} mask={`url(#${g('mask')})`}>
          <path d="M60 6 L110 26 V70 C110 104 88 126 60 134 C32 126 10 104 10 70 V26 Z" fill={`url(#${g('body')})`} />
          {/* deep forest swoosh, lower-left */}
          <path d="M8 34 C 2 92, 26 124, 60 138 C 30 114, 20 80, 32 30 Z" fill="#05431F" opacity="0.42" />
          {/* bright leaf swoosh, upper band */}
          <path d="M60 2 C 32 10, 14 26, 8 50 C 38 26, 80 20, 114 34 L 112 20 Z" fill="#C8F76A" opacity="0.38" />
          {/* lime glance, right flank */}
          <path d="M116 22 C 120 70, 104 108, 70 140 L 118 132 Z" fill="#B7F34A" opacity="0.3" />
        </g>

        {/* 1 — the shield draws itself */}
        <path
          className="sp-wow-shield"
          d="M60 6 L110 26 V70 C110 104 88 126 60 134 C32 126 10 104 10 70 V26 Z"
          stroke={`url(#${g('stroke')})`}
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 3 — the white path is traced through the shield */}
        <g clipPath={`url(#${g('clip')})`}>
          <path
            className="sp-wow-trace"
            d="M101 27 C 83 46, 56 56, 46 84 C 38 108, 50 124, 64 134"
            stroke="#FFFFFF"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* travelling spark riding the head of the path */}
          <circle className="sp-wow-spark" r="3.2" fill="#F4FFDE" style={{ filter: 'drop-shadow(0 0 4px rgba(183,243,74,.9))' }} />
        </g>

        {/* 4 — the leaf unfurls */}
        <g className="sp-wow-leaf">
          <path d="M52 52 C 47 33, 60 22, 79 22 C 80 42, 69 56, 52 52 Z" fill="#FFFFFF" />
          <path d="M54 51 C 61 41, 69 33, 78 27" stroke="#0E7A3C" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>

      </svg>

      <img className="sp-wow-logo" src="/logo.png" alt="" width={size} height={h} />
    </div>
  );
};

const MOTES = [
  { left: '18%', size: 7, delay: '0.2s', dur: '9.5s' },
  { left: '34%', size: 5, delay: '2.6s', dur: '11s' },
  { left: '64%', size: 6, delay: '1.4s', dur: '10s' },
  { left: '82%', size: 4, delay: '3.8s', dur: '12s' },
];

const Motes: React.FC = () => (
  <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 overflow-hidden" aria-hidden="true">
    {MOTES.map(m => (
      <span
        key={m.left}
        className="sp-wow-mote absolute bottom-10"
        style={{
          left: m.left,
          width: m.size,
          height: m.size,
          borderRadius: '0 60% 0 60%',
          background: 'linear-gradient(135deg,#7CC243,#00C16A)',
          animationDelay: m.delay,
          animationDuration: m.dur,
        }}
      />
    ))}
  </div>
);

const WORDMARK = 'SurePath'.split('');

type Props = { lang: Language; setLang: (lang: Language) => void; darkMode: boolean; onFinish: () => void };

export const RevampedSplashScreen: React.FC<Props> = ({ lang, setLang, darkMode, onFinish }) => {
  const [step, setStep] = useState(0);
  const finishRef = useRef(onFinish);
  const firedRef = useRef(false);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  const finish = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    finishRef.current();
  }, []);

  // Hard contract with App.tsx: the splash hands over after exactly 3300ms.
  useEffect(() => {
    const done = window.setTimeout(finish, 3300);
    return () => window.clearTimeout(done);
  }, [finish]);

  useEffect(() => {
    const start = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setStep(Math.min(COPY[lang].loading.length - 1, Math.floor(elapsed / 760)));
    }, 120);
    return () => window.clearInterval(tick);
  }, [lang]);

  const copy = COPY[lang === Language.EN ? 'EN' : 'ID'];
  const bg = darkMode ? '#071a13' : '#f5fbf7';
  const fg = darkMode ? '#e8fff3' : '#064e3b';
  const accent = darkMode ? '#B7F34A' : '#00A95C';
  const muted = darkMode ? '#9ac8b5' : '#52796b';
  const faint = darkMode ? '#739d8a' : '#86a99b';

  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={`${copy.welcome} ${copy.loading[step]}`}
      onClick={finish}
      className="sp-wow sp-wow-fade fixed inset-0 z-[5000] flex min-h-[100dvh] cursor-pointer flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{
        background: `radial-gradient(ellipse at 50% 28%, ${darkMode ? 'rgba(0,193,106,.20)' : 'rgba(0,193,106,.13)'} 0%, transparent 52%), ${bg}`,
        color: fg,
        fontFamily: "'Sora', sans-serif",
      }}
    >
      <style>{BRAND_CSS}</style>

      {/* hairline progress sheen at the very top */}
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" style={{ background: 'rgba(0,193,106,.10)' }}>
        <span
          className="sp-wow-sheen absolute inset-y-0 left-0 w-2/5"
          style={{ background: 'linear-gradient(90deg,transparent,#00C16A,#B7F34A,transparent)' }}
        />
      </div>

      <Motes />

      <button
        type="button"
        onClick={finish}
        aria-label={copy.skipHint}
        className="sp-wow-up absolute right-4 top-5 z-20 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide"
        style={{
          color: muted,
          border: `1px solid ${darkMode ? 'rgba(183,243,74,.22)' : 'rgba(6,78,59,.14)'}`,
          background: darkMode ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.6)',
          animationDelay: '900ms',
        }}
      >
        {copy.skip} ›
      </button>

      <div className="sp-wow-stage relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="mb-7 flex items-center justify-center" style={{ height: 196 }}>
          <BrandMark size={168} uid="s" />
        </div>

        <h1 className="flex items-end justify-center text-[2.6rem] font-extrabold leading-none tracking-tight">
          {WORDMARK.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="sp-wow-ltr"
              style={{ color: i < 4 ? fg : accent, animationDelay: `${2200 + i * 38}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <p className="sp-wow-up mt-3 text-sm" style={{ color: muted, animationDelay: '2520ms' }}>
          {copy.tagline}
        </p>

        <div className="sp-wow-up mt-8 w-full max-w-[240px]" style={{ animationDelay: '1000ms' }}>
          <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold" style={{ color: darkMode ? '#a7f3d0' : '#28745a' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#00C16A' }} />
            <span>{copy.loading[step]}</span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full" style={{ background: darkMode ? '#17392c' : '#dcefe5' }}>
            <div className="sp-wow-bar h-full rounded-full" style={{ background: 'linear-gradient(90deg,#00C16A,#B7F34A)' }} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-7 flex items-center gap-3">
        <span className="sp-wow-up text-[10px] font-semibold tracking-[.14em]" style={{ color: faint, animationDelay: '2620ms' }}>
          {copy.ready}
        </span>
        <span style={{ color: faint }}>·</span>
        {(['ID', 'EN'] as const).map(l => (
          <button
            key={l}
            onClick={e => { e.stopPropagation(); setLang(l as Language); }}
            className="rounded-full px-2 py-1 text-[10px] font-bold"
            style={{
              color: lang === l ? '#064e3b' : muted,
              background: lang === l ? '#B7F34A' : 'transparent',
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </main>
  );
};

type EntryProps = { name: string; onDone: () => void; lang: Language; darkMode: boolean };

export const RevampedAppEntryScreen: React.FC<EntryProps> = ({ name, onDone, lang, darkMode }) => {
  const doneRef = useRef(onDone);
  const firedRef = useRef(false);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);

  const done = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    doneRef.current();
  }, []);

  // Hard contract with App.tsx: the entry screen hands over after 2100ms.
  useEffect(() => {
    const t = window.setTimeout(done, 2100);
    return () => window.clearTimeout(t);
  }, [done]);

  const copy = COPY[lang === Language.EN ? 'EN' : 'ID'];
  const bg = darkMode ? '#071a13' : '#f5fbf7';
  const fg = darkMode ? '#e8fff3' : '#064e3b';
  const muted = darkMode ? '#9ac8b5' : '#52796b';

  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={`${copy.back} ${name}`}
      onClick={done}
      className="sp-wow sp-wow-fade-e fixed inset-0 z-[4999] flex min-h-[100dvh] cursor-pointer flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{ background: bg, color: fg, fontFamily: "'Sora', sans-serif" }}
    >
      <style>{BRAND_CSS}</style>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 36%, ${darkMode ? 'rgba(0,193,106,.20)' : 'rgba(0,193,106,.14)'}, transparent 56%)` }}
      />

      <button
        type="button"
        onClick={done}
        aria-label={copy.skipHint}
        className="sp-wow-up absolute right-4 top-5 z-20 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide"
        style={{
          color: muted,
          border: `1px solid ${darkMode ? 'rgba(183,243,74,.22)' : 'rgba(6,78,59,.14)'}`,
          background: darkMode ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.6)',
          animationDelay: '600ms',
        }}
      >
        {copy.skip} ›
      </button>

      <div className="sp-wow-stage-e relative z-10 flex flex-col items-center">
        <div className="mb-6 flex items-center justify-center" style={{ height: 152 }}>
          <BrandMark size={130} uid="e" speed={0.42} />
        </div>
        <p className="sp-wow-up text-sm font-semibold" style={{ color: '#00a968', animationDelay: '1120ms' }}>
          {copy.back}
        </p>
        <h1 className="sp-wow-in mt-2 text-3xl font-extrabold tracking-tight" style={{ animationDelay: '1220ms' }}>
          {name}
        </h1>
        <p
          className="sp-wow-up mt-3 rounded-full px-4 py-2 text-xs font-semibold"
          style={{
            background: darkMode ? '#123b2b' : '#e0f7eb',
            color: darkMode ? '#a7f3d0' : '#08764d',
            animationDelay: '1400ms',
          }}
        >
          ✓ {copy.verified}
        </p>
        <div className="mt-7 h-1.5 w-36 overflow-hidden rounded-full" style={{ background: darkMode ? '#17392c' : '#dcefe5' }}>
          <div
            className="sp-wow-sheen h-full w-2/3 rounded-full"
            style={{ background: 'linear-gradient(90deg,#00C16A,#B7F34A)' }}
          />
        </div>
      </div>
    </main>
  );
};

export default RevampedSplashScreen;
