// InsurerHero — reusable premium hero card (v2.7.59 redesign).
//
// Emerald bank-grade gradient dengan dekorasi concentric rings + pulsing
// status dot. Dipakai di Dashboard; bisa diadopsi tab lain yang butuh
// "command center" feel. Konten di dalam fleksibel via children, tapi
// heading + eyebrow + description sudah distandarkan.
//
// Dekorasi di-position absolute di dalam clip-overflow, jadi tidak
// mendorong konten. Prefers-reduced-motion mematikan animasi pulse.
import React from 'react';

interface Props {
  /** Teks eyebrow kecil di atas judul (uppercase, letter-spaced). */
  eyebrow: string;
  /** Judul utama — biasanya nama insurer. */
  title: string;
  /** Deskripsi 1–2 baris di bawah judul. */
  description?: React.ReactNode;
  /** Chip pills row di bawah deskripsi (optional). */
  chips?: React.ReactNode;
  /** Extra content di luar slot standar (jarang dipakai). */
  children?: React.ReactNode;
  /** Pulse dot indicator next to eyebrow. Default true. */
  pulse?: boolean;
}

const InsurerHero: React.FC<Props> = ({
  eyebrow, title, description, chips, children, pulse = true,
}) => {
  return (
    <div
      className="relative overflow-hidden rounded-3xl text-white"
      style={{
        background: 'linear-gradient(135deg, #052E1C 0%, #065F46 55%, #047857 100%)',
        boxShadow: '0 20px 60px -24px rgba(6,78,59,0.55), 0 4px 16px -8px rgba(6,78,59,0.25)',
      }}
    >
      {/* Decorative concentric rings — intentionally soft, won't fight with
          content. Clipped by rounded-3xl + overflow-hidden on parent. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{ top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.3), transparent 65%)' }}
      />
      <svg
        aria-hidden
        className="absolute pointer-events-none"
        style={{ top: -40, right: -40, width: 220, height: 220 }}
        viewBox="0 0 220 220"
        fill="none"
      >
        <circle cx="180" cy="40" r="90" stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" />
        <circle cx="180" cy="40" r="64" stroke="rgba(255,255,255,0.11)" strokeWidth="1.5" />
        <circle cx="180" cy="40" r="36" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 px-6 py-6 sm:px-7 sm:py-7">
        <div className="flex items-center gap-2">
          {pulse && (
            <span
              className="inline-block w-2 h-2 rounded-full bg-emerald-400"
              style={{ animation: 'spHeroPulse 2s ease-in-out infinite' }}
            />
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {description}
          </p>
        )}
        {chips && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips}
          </div>
        )}
        {children}
      </div>

      <style>{`
        @keyframes spHeroPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="spHeroPulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

// Chip helper — biar call site bersih di Dashboard/Orders/dll
export const InsurerHeroChip: React.FC<{
  children: React.ReactNode;
  tone?: 'neutral' | 'amber' | 'emerald';
}> = ({ children, tone = 'neutral' }) => {
  const toneCls = tone === 'amber'
    ? 'bg-amber-400/20 text-amber-100 border border-amber-300/20'
    : tone === 'emerald'
    ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/20'
    : 'bg-white/10 text-emerald-50 border border-white/10';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${toneCls}`}>
      {children}
    </span>
  );
};

export default InsurerHero;
