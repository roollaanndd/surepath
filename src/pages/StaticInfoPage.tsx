import React, { useEffect, useState } from 'react';
import {
  Briefcase, Award, Handshake,
  Lock, ScrollText, Shield, ArrowRight, Sparkles,
} from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useSiteTheme, Reveal3D, use3DTilt, SectionLabel } from './site/siteKit';
import { Language } from '../../types';
import { STATIC_CONTENT, Loc } from './staticPagesContent';

interface Props extends SitePageProps {
  pageId: string;
}

type Meta = { Icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string; color2: string; label: Loc };

const META: Record<string, Meta> = {
  careers:     { Icon: Briefcase,  color: '#2563eb', color2: '#7c3aed', label: ['Karir', 'Careers'] },
  agents:      { Icon: Award,      color: '#d97706', color2: '#dc2626', label: ['Program Agen', 'Agent Program'] },
  partnership: { Icon: Handshake,  color: '#0891b2', color2: '#2563eb', label: ['Kemitraan', 'Partnership'] },
  privacy:     { Icon: Lock,       color: '#64748b', color2: '#0891b2', label: ['Legal', 'Legal'] },
  terms:       { Icon: ScrollText, color: '#64748b', color2: '#7c3aed', label: ['Legal', 'Legal'] },
  security:    { Icon: Shield,     color: '#16a34a', color2: '#0891b2', label: ['Keamanan', 'Security'] },
  cookie:      { Icon: Shield,     color: '#64748b', color2: '#d97706', label: ['Legal', 'Legal'] },
};

// ── Scroll progress bar — thin accent line that fills as you read ─────────────
const ScrollProgress: React.FC<{ color: string; color2: string }> = ({ color, color2 }) => {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none">
      <div className="h-full transition-[width] duration-150 ease-out rounded-r-full"
        style={{ width: `${p * 100}%`, background: `linear-gradient(90deg, ${color}, ${color2})`, boxShadow: `0 0 12px ${color}80` }} />
    </div>
  );
};

// ── Tilt card — 3D mouse-tracking wrapper (one hook instance per card) ────────
const TiltCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => {
  const { ref, onMove, onLeave } = use3DTilt();
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`card-3d ${className}`} style={style}>
      {children}
    </div>
  );
};

const StaticInfoPage: React.FC<Props> = (props) => {
  const { pageId, lang, navigate, onSignIn, darkMode } = props;
  const content = STATIC_CONTENT[pageId];
  const meta = META[pageId];
  const isEN = lang === Language.EN;
  const L = (loc: Loc) => (isEN ? loc[1] : loc[0]);
  const th = useSiteTheme(darkMode);

  if (!content || !meta) {
    return (
      <SiteLayout {...props}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="mb-4" style={{ color: th.textMain }}>{isEN ? 'Page not found.' : 'Halaman tidak ditemukan.'}</p>
            <button onClick={() => navigate('/')} className="text-sm font-bold" style={{ color: th.accent }}>
              ← {isEN ? 'Back to Home' : 'Kembali ke Beranda'}
            </button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const { Icon, color, color2 } = meta;
  const cta = content.ctaLabel;
  // careers/partnership use mailto; everything else opens the app sign-in.
  const mailtoFor: Record<string, string> = {
    careers:     'mailto:careers@surepath.id',
    partnership: 'mailto:partnership@surepath.id',
  };
  const handleCta = () => {
    const mail = mailtoFor[pageId];
    if (mail) { window.location.href = mail; return; }
    onSignIn();
  };

  return (
    <SiteLayout {...props}>
      <ScrollProgress color={color} color2={color2} />

      {/* ═══ Hero ═══ */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden" style={{ background: th.sectionBg1 }}>
        {/* Drifting aurora blobs in the page's two accent colors */}
        <div className="absolute -top-20 left-[12%] w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}${darkMode ? '30' : '20'}, transparent 68%)`, animation: 'spx-drift 11s ease-in-out infinite' }} />
        <div className="absolute top-10 right-[8%] w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color2}${darkMode ? '26' : '18'}, transparent 68%)`, animation: 'spx-drift 14s ease-in-out infinite reverse' }} />
        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(28,25,23,0.05)'} 1px, transparent 1px)`,
          backgroundSize: '32px 32px' }} />
        {/* Spinning dashed ring behind the icon */}
        <div className="absolute left-1/2 top-24 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none animate-spin-slow"
          style={{ border: `1.5px dashed ${color}35` }} />

        <Reveal3D className="relative max-w-3xl mx-auto text-center">
          <div className="animate-float inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-7 relative"
            style={{ background: `linear-gradient(135deg, ${color}1c, ${color2}14)`, border: `1px solid ${color}35`, boxShadow: `0 20px 50px -18px ${color}90` }}>
            <Icon size={34} style={{ color }} />
            <Sparkles size={14} className="absolute -top-1.5 -right-1.5 animate-pulse" style={{ color: color2 }} />
          </div>
          <div><SectionLabel darkMode={darkMode}>{L(meta.label)}</SectionLabel></div>
          <h1 className="font-black tracking-tight mb-5 leading-[1.05]" style={{ fontSize: 'clamp(2.2rem,5.5vw,3.6rem)', color: th.textMain }}>
            {L(content.title)}
          </h1>
          <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: th.textMuted }}>{L(content.subtitle)}</p>
          {/* Animated underline */}
          <div className="mx-auto mt-7 h-1 rounded-full"
            style={{ width: 76, background: `linear-gradient(90deg, ${color}, ${color2})`, boxShadow: `0 2px 14px ${color}70` }} />
        </Reveal3D>
      </section>

      {/* ═══ Sections — alternating 3D reveals, tilt on hover ═══ */}
      <section className="pb-24 px-6" style={{ background: th.sectionBg1 }}>
        <div className="max-w-3xl mx-auto space-y-6">
          {content.sections.map((s, i) => (
            <Reveal3D key={i} delay={i * 70} from={i % 2 === 0 ? 'left' : 'right'}>
              <TiltCard className="spx-card spx-sheen relative p-7 sm:p-8 rounded-3xl overflow-hidden"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow, ['--spx-accent' as string]: color }}>
                {/* Corner accent wash */}
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${i % 2 === 0 ? color : color2}${darkMode ? '20' : '12'}, transparent 70%)` }} />

                <div className="relative flex items-center gap-4 mb-5">
                  {/* Numbered chip */}
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0"
                    style={{ background: `${color}12`, border: `1.5px solid ${color}30`, color }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h2 className="text-lg font-black tracking-tight" style={{ color: th.textMain }}>{L(s.heading)}</h2>
                </div>

                {/* Loc is itself a tuple (array), so check the first element to tell
                    a list of Locs apart from a single paragraph Loc. */}
                {Array.isArray(s.body[0]) ? (
                  <ul className="relative space-y-1">
                    {(s.body as Loc[]).map((item, j) => (
                      <li key={j}
                        className="group flex items-start gap-3 text-sm leading-relaxed py-2 px-3 -mx-3 rounded-xl transition-all duration-300 hover:translate-x-1.5"
                        style={{ color: th.textMuted }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${color}0c`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-150"
                          style={{ background: `linear-gradient(135deg, ${color}, ${color2})` }} />
                        <span className="transition-colors duration-300" style={{ color: 'inherit' }}>{L(item)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="relative text-sm leading-[1.8]" style={{ color: th.textMuted }}>{L(s.body as Loc)}</p>
                )}
              </TiltCard>
            </Reveal3D>
          ))}

          {/* ═══ CTA ═══ */}
          {cta && (
            <Reveal3D delay={content.sections.length * 70}>
              <div className="spx-grid relative mt-12 text-center py-14 px-8 rounded-[2rem] overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color}${darkMode ? '14' : '0a'}, ${color2}${darkMode ? '0e' : '07'})`,
                  border: `1px solid ${color}28`, ['--spx-accent' as string]: color }}>
                <div className="spx-grid-tex" />
                {/* Pulsing glow behind the button */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32 rounded-full blur-3xl pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${color}${darkMode ? '38' : '22'}, transparent 70%)`, animation: 'spx-drift 8s ease-in-out infinite' }} />
                <p className="relative text-sm font-bold mb-6 uppercase tracking-[0.2em]" style={{ color: th.textMuted }}>
                  {isEN ? 'Ready to take the next step?' : 'Siap melangkah lebih jauh?'}
                </p>
                <button onClick={handleCta}
                  className="group relative inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.04] active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color2})`, boxShadow: `0 14px 38px -10px ${color}90` }}>
                  {L(cta)}
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                </button>
              </div>
            </Reveal3D>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default StaticInfoPage;
