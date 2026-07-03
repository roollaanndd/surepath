import React, { useEffect, useState } from 'react';

/* ─── SuccessBurst — celebratory overlay for successful actions ──────────────
   Confetti burst + draw-in check + message. Auto-dismisses after `duration`ms
   (default 2200) or stays until user taps when `sticky`. Reused for payment
   success, order submitted, withdrawal requested, etc. */

interface SuccessBurstProps {
  title: string;
  subtitle?: string;
  onDone?: () => void;
  duration?: number;   // ms; ignored when sticky
  sticky?: boolean;    // require tap to dismiss
  ctaLabel?: string;   // label for sticky dismiss button
}

const CONFETTI = [
  { x: '14%', y: '26%', d: 0,    c: '#34d399', s: 10, r: '50%' },
  { x: '82%', y: '20%', d: 0.10, c: '#fbbf24', s: 8,  r: '2px' },
  { x: '26%', y: '64%', d: 0.18, c: '#059669', s: 9,  r: '50%' },
  { x: '74%', y: '60%', d: 0.26, c: '#6ee7b7', s: 11, r: '2px' },
  { x: '50%', y: '14%', d: 0.34, c: '#a7f3d0', s: 7,  r: '50%' },
  { x: '8%',  y: '48%', d: 0.42, c: '#fbbf24', s: 7,  r: '50%' },
  { x: '92%', y: '42%', d: 0.30, c: '#34d399', s: 8,  r: '2px' },
  { x: '38%', y: '80%', d: 0.22, c: '#10b981', s: 8,  r: '50%' },
  { x: '64%', y: '82%', d: 0.38, c: '#fde047', s: 6,  r: '50%' },
];

const SuccessBurst: React.FC<SuccessBurstProps> = ({ title, subtitle, onDone, duration = 2200, sticky = false, ctaLabel }) => {
  const [visible, setVisible] = useState(false);
  const [fade, setFade] = useState(false);

  const dismiss = () => {
    setFade(true);
    setTimeout(() => onDone?.(), 420);
  };

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 30);
    let t1: ReturnType<typeof setTimeout> | undefined;
    if (!sticky) t1 = setTimeout(dismiss, duration);
    return () => { clearTimeout(t0); if (t1) clearTimeout(t1); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-400 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'rgba(6,25,18,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      <style>{`
        @keyframes sb-pop { 0% { opacity: 0; transform: scale(0) rotate(0deg); } 55% { opacity: 1; transform: scale(1.3) rotate(120deg); } 100% { opacity: 0; transform: scale(0.4) rotate(200deg) translateY(30px); } }
        @keyframes sb-ring { 0% { transform: scale(0.55); opacity: 0.55; } 100% { transform: scale(2.0); opacity: 0; } }
        @keyframes sb-bounce-in { 0% { transform: scale(0.3); opacity: 0; } 55% { transform: scale(1.12); opacity: 1; } 75% { transform: scale(0.96); } 100% { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .sb * { animation: none !important; } }
      `}</style>

      <div className="sb relative flex flex-col items-center px-8 text-center">
        {/* confetti */}
        {visible && CONFETTI.map((p, i) => (
          <span key={i} style={{
            position: 'fixed', left: p.x, top: p.y, width: p.s, height: p.s,
            background: p.c, borderRadius: p.r,
            animation: `sb-pop 1.3s cubic-bezier(.22,1,.36,1) ${p.d}s both`,
          }} />
        ))}

        {/* badge */}
        <div className="relative mb-7" style={{ width: 116, height: 116, animation: visible ? 'sb-bounce-in 0.65s cubic-bezier(.22,1.4,.36,1) both' : undefined }}>
          {[0, 0.55].map(dl => (
            <span key={dl} style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid rgba(52,211,153,0.55)',
              animation: `sb-ring 1.6s ease-out ${dl}s infinite`,
            }} />
          ))}
          <div className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #10b981, #047857)', boxShadow: '0 22px 50px -14px rgba(16,185,129,0.75), inset 0 2px 0 rgba(255,255,255,0.25)' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
              <path d="M4.5 12.5L9.8 17.8L19.5 6.8" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 30, strokeDashoffset: visible ? 0 : 30, transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1) 0.35s' }} />
            </svg>
          </div>
        </div>

        <h3 className="text-white font-black text-2xl tracking-tight mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>{title}</h3>
        {subtitle && <p className="text-emerald-100/85 text-sm max-w-xs leading-relaxed">{subtitle}</p>}

        {sticky && (
          <button onClick={dismiss}
            className="mt-8 px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-emerald-900 bg-white active:scale-95 transition-transform"
            style={{ boxShadow: '0 14px 32px -12px rgba(0,0,0,0.45)' }}>
            {ctaLabel ?? 'Lanjut'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SuccessBurst;
