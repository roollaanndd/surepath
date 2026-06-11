import React from 'react';
import {
  Briefcase, Award, Handshake,
  Lock, ScrollText, Shield, ArrowRight,
} from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useSiteTheme, Reveal3D, SectionLabel } from './site/siteKit';
import { Language } from '../../types';
import { STATIC_CONTENT, Loc } from './staticPagesContent';

interface Props extends SitePageProps {
  pageId: string;
}

type Meta = { Icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string; label: Loc };

const META: Record<string, Meta> = {
  careers:     { Icon: Briefcase,  color: '#2563eb', label: ['Karir', 'Careers'] },
  agents:      { Icon: Award,      color: '#d97706', label: ['Program Agen', 'Agent Program'] },
  partnership: { Icon: Handshake,  color: '#0891b2', label: ['Kemitraan', 'Partnership'] },
  privacy:     { Icon: Lock,       color: '#64748b', label: ['Legal', 'Legal'] },
  terms:       { Icon: ScrollText, color: '#64748b', label: ['Legal', 'Legal'] },
  security:    { Icon: Shield,     color: '#16a34a', label: ['Keamanan', 'Security'] },
  cookie:      { Icon: Shield,     color: '#64748b', label: ['Legal', 'Legal'] },
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

  const { Icon, color } = meta;
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
      {/* Header */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden" style={{ background: th.sectionBg1 }}>
        {/* Soft color glow behind the icon */}
        <div className="absolute left-1/2 top-10 w-[28rem] h-56 -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}${darkMode ? '2e' : '1f'} 0%, transparent 70%)` }} />
        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(28,25,23,0.05)'} 1px, transparent 1px)`,
          backgroundSize: '32px 32px' }} />

        <Reveal3D className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-6 card-3d"
            style={{ background: `${color}14`, border: `1px solid ${color}30`, boxShadow: `0 14px 40px -16px ${color}80` }}>
            <Icon size={30} style={{ color }} />
          </div>
          <div><SectionLabel darkMode={darkMode}>{L(meta.label)}</SectionLabel></div>
          <h1 className="font-black tracking-tight mb-4" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', color: th.textMain }}>
            {L(content.title)}
          </h1>
          <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: th.textMuted }}>{L(content.subtitle)}</p>
        </Reveal3D>
      </section>

      {/* Sections */}
      <section className="pb-20 px-6" style={{ background: th.sectionBg1 }}>
        <div className="max-w-3xl mx-auto space-y-5">
          {content.sections.map((s, i) => (
            <Reveal3D key={i} delay={i * 60}>
              <div className="spx-card p-7 rounded-3xl"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow, ['--spx-accent' as string]: color }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <h2 className="text-base font-black" style={{ color: th.textMain }}>{L(s.heading)}</h2>
                </div>
                {/* Loc is itself a tuple (array), so check the first element to tell
                    a list of Locs apart from a single paragraph Loc. */}
                {Array.isArray(s.body[0]) ? (
                  <ul className="space-y-2.5 pl-1">
                    {(s.body as Loc[]).map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: th.textMuted }}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {L(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: th.textMuted }}>{L(s.body as Loc)}</p>
                )}
              </div>
            </Reveal3D>
          ))}

          {/* CTA */}
          {cta && (
            <Reveal3D delay={content.sections.length * 60}>
              <div className="mt-10 text-center py-12 px-8 rounded-3xl"
                style={{ background: `${color}${darkMode ? '0d' : '08'}`, border: `1px solid ${color}22` }}>
                <button onClick={handleCta}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
                  {L(cta)} <ArrowRight size={16} />
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
