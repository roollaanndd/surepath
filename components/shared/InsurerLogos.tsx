import React from 'react';

/* ─── Insurer brand marks — stylized SVG monograms with official brand hues ──
   Self-contained (CSP-safe, no external fetches). Keyed by provider id. */

export interface InsurerBrand {
  bg: string;          // badge background
  fg: string;          // mark color
  accent: string;      // UI accent (chips, glow)
  Mark: React.FC<{ size?: number }>;
}

const IntraMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M20 4l4.7 9.6L35 15.2l-7.5 7.3L29.3 33 20 28l-9.3 5 1.8-10.5L5 15.2l10.3-1.6L20 4z" fill="#e11d48" />
    <path d="M20 10.5l2.9 5.9 6.5 1-4.7 4.5 1.1 6.4L20 25.3l-5.8 3 1.1-6.4-4.7-4.5 6.5-1 2.9-5.9z" fill="#fff" opacity="0.9" />
  </svg>
);

const ZurichMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="16" fill="#1f4ea8" />
    <path d="M11 14h18l-12 12h12" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const TuguMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="6" y="6" width="28" height="28" rx="8" fill="#0e3a5d" />
    <path d="M13 15h14M20 15v12" stroke="#f6b93b" strokeWidth="3.6" strokeLinecap="round" />
    <path d="M14 27h12" stroke="#f6b93b" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
  </svg>
);

const SinarmasMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="16" fill="#d92027" />
    <circle cx="20" cy="20" r="6.5" fill="#ffc226" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <rect key={a} x="19" y="5.5" width="2.2" height="5.5" rx="1.1" fill="#ffc226"
        transform={`rotate(${a} 20 20)`} />
    ))}
  </svg>
);

const SompoMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="6" y="6" width="28" height="28" rx="14" fill="#c8102e" />
    <path d="M13 24c2.5-7 6-10.5 9.5-10.5 2.6 0 4.5 1.8 4.5 4.2 0 4.3-5.4 7.3-14 6.3z" fill="#fff" />
    <circle cx="26" cy="15" r="2" fill="#fff" opacity="0.85" />
  </svg>
);

export const INSURER_BRANDS: Record<string, InsurerBrand> = {
  intra:    { bg: '#fff1f2', fg: '#e11d48', accent: '#e11d48', Mark: IntraMark },
  zurich:   { bg: '#eff6ff', fg: '#1f4ea8', accent: '#1f4ea8', Mark: ZurichMark },
  tugu:     { bg: '#f0f7fc', fg: '#0e3a5d', accent: '#0e3a5d', Mark: TuguMark },
  sinarmas: { bg: '#fff7ed', fg: '#d92027', accent: '#d92027', Mark: SinarmasMark },
  sompo:    { bg: '#fff1f2', fg: '#c8102e', accent: '#c8102e', Mark: SompoMark },
};

export const InsurerLogo: React.FC<{ id: string; size?: number; className?: string }> = ({ id, size = 34, className }) => {
  const b = INSURER_BRANDS[id];
  if (!b) {
    return (
      <div className={className} style={{ width: size, height: size, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#059669', fontSize: size * 0.44 }}>
        {id.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return <b.Mark size={size} />;
};
