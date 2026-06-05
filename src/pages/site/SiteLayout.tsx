import React, { useState, useEffect } from 'react';
import { ChevronRight, Menu, X, Globe, Lock } from 'lucide-react';
import { Language } from '../../../types';
import { SurePathLogo } from '../../../components/Navbar';
import {
  SitePageProps, useT, useSiteTheme,
  SectionBackground, PWAPopup, InstallModal, SiteChromeContext, ACCENT,
} from './siteKit';

// ─── PWA install state hook ───────────────────────────────────────────────────
const usePwa = () => {
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [pwaVisible, setPwaVisible] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPwaPrompt(e); setTimeout(() => setPwaVisible(true), 4000); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setPwaInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPwa = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    await pwaPrompt.userChoice;
    setPwaVisible(false); setPwaPrompt(null);
  };

  const handleInstallClick = () => {
    if (pwaPrompt) { installPwa(); return; }
    setInstallModalOpen(true);
  };

  return { pwaPrompt, pwaVisible, pwaInstalled, installModalOpen, setPwaVisible, setInstallModalOpen, installPwa, handleInstallClick };
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { path: '/',             id: 'home',         label: ['Home', 'Home'] as const },
  { path: '/products',     id: 'products',     label: ['Produk', 'Products'] as const },
  { path: '/how-it-works', id: 'how-it-works', label: ['Cara Kerja', 'How It Works'] as const },
  { path: '/about',        id: 'about',        label: ['Tentang', 'About'] as const },
  { path: '/blog',         id: 'blog',         label: ['Blog', 'Blog'] as const },
];

const SiteNav: React.FC<SitePageProps & { active?: string }> = ({ onSignIn, navigate, lang, setLang, darkMode, active }) => {
  const t = useT(lang);
  const th = useSiteTheme(darkMode);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const go = (path: string) => { setMenuOpen(false); navigate(path); };
  const isActive = (id: string) => active === id;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-14 py-4 transition-all duration-300 ${scrolled ? 'backdrop-blur-md' : ''}`}
      style={{ background: scrolled ? th.navBg : 'transparent', borderBottom: scrolled ? `1px solid ${th.navBorder}` : 'none' }}>

      {/* Logo */}
      <a href="/" onClick={e => { e.preventDefault(); go('/'); }} className="flex items-center gap-2.5 group flex-shrink-0">
        <img src="/surepath-logo.png" alt="SurePath" className="h-7 w-auto object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="text-xl font-semibold tracking-tight" style={{ color: th.textMain }}>
          Sure<span style={{ color: ACCENT }}>Path</span>
        </span>
      </a>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-7">
        {NAV_LINKS.map(l => (
          <a key={l.id} href={l.path} onClick={e => { e.preventDefault(); go(l.path); }}
            className="text-[0.8rem] font-medium transition-colors"
            style={{ color: isActive(l.id) ? th.accent : th.textMuted }}>
            {t(l.label[0], l.label[1])}
          </a>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)} aria-label="Switch language"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: th.navBtnBg, color: th.navBtnColor }}>
          <Globe size={12} /> {lang}
        </button>
        <button onClick={() => go('/admin')}
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: th.navBtnBg, color: th.navBtnColor }}>
          <Lock size={12} /> Admin
        </button>
        <button onClick={onSignIn}
          className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] hover:opacity-90"
          style={{ background: th.textMain, color: darkMode ? '#0f172a' : '#ffffff' }}>
          {t('Masuk', 'Get Started')}
        </button>
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
          className="md:hidden p-2.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ background: th.navBtnBg, color: th.navBtnColor }}>
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-2 rounded-2xl border p-4 shadow-lg"
          style={{ background: th.mobilMenuBg, borderColor: th.mobileMenuBorder, backdropFilter: 'blur(24px)' }}>
          {NAV_LINKS.map(l => (
            <button key={l.id} onClick={() => go(l.path)}
              className="flex items-center justify-between w-full py-3 border-b text-sm font-medium"
              style={{ borderColor: th.mobileMenuBorder, color: isActive(l.id) ? th.accent : th.textMuted }}>
              <span>{t(l.label[0], l.label[1])}</span><ChevronRight size={14} />
            </button>
          ))}
          <div className="flex gap-2 mt-4">
            <button onClick={() => go('/admin')} className="flex-1 py-2.5 rounded-xl text-xs font-black border"
              style={{ borderColor: th.cardBorder, color: th.textMuted }}>Admin</button>
            <button onClick={onSignIn} className="flex-1 py-2.5 rounded-xl text-xs font-black text-white"
              style={{ background: th.textMain }}>{t('Masuk', 'Get Started')}</button>
          </div>
          <button onClick={() => { setLang(lang === Language.EN ? Language.ID : Language.EN); localStorage.setItem('SUREPATH_LANG', lang === Language.EN ? 'ID' : 'EN'); }}
            className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 rounded-xl text-xs font-bold border transition-all"
            style={{ borderColor: th.cardBorder, color: th.textMuted }}>
            <Globe size={12} /> {lang === Language.EN ? 'Switch to Bahasa' : 'Switch to English'}
          </button>
        </div>
      )}
    </nav>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const SiteFooter: React.FC<SitePageProps> = ({ navigate, lang }) => {
  const t = useT(lang);
  const columns = [
    { title: t('Produk', 'Products'), links: [
      { label: t('Asuransi Kendaraan', 'Car Insurance'),    path: '/product/car' },
      { label: t('Asuransi Perjalanan', 'Travel Insurance'), path: '/product/travel' },
      { label: t('Kecelakaan Diri', 'Personal Accident'),    path: '/product/pa' },
      { label: t('Proteksi Barang', 'Property Protection'),  path: '/product/property' },
      { label: t('Kesehatan', 'Health'),                     path: '/product/health' },
    ]},
    { title: t('Perusahaan', 'Company'), links: [
      { label: t('Tentang Kami', 'About Us'),      path: '/about' },
      { label: t('Cara Kerja', 'How It Works'),    path: '/how-it-works' },
      { label: t('Karir', 'Careers'),              path: '/careers' },
      { label: t('Blog', 'Blog'),                  path: '/blog' },
      { label: t('Program Agen', 'Agent Program'), path: '/agents' },
    ]},
    { title: t('Legal', 'Legal'), links: [
      { label: t('Kebijakan Privasi', 'Privacy Policy'),       path: '/privacy' },
      { label: t('Syarat & Ketentuan', 'Terms & Conditions'),  path: '/terms' },
      { label: t('Keamanan Data', 'Data Security'),            path: '/security' },
    ]},
  ];

  return (
    <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <img src="/surepath-logo.png" alt="SurePath" className="h-8 w-auto object-contain"
                onError={(e) => {
                  const tg = e.target as HTMLImageElement; tg.style.display = 'none';
                  const n = tg.nextElementSibling as HTMLElement | null; if (n) n.style.display = 'flex';
                }} />
              <div className="hidden w-8 h-8 rounded-xl items-center justify-center" style={{ background: 'rgba(22,163,74,0.1)' }}>
                <SurePathLogo className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                Sure<span style={{ color: ACCENT }}>Path</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {t('Platform asuransi digital yang transparan, manusiawi, dan beneran berpihak ke kamu.', 'A transparent, human-centered digital insurance platform built around your real needs.')}
            </p>
            <p className="text-xs font-light italic" style={{ color: 'rgba(255,255,255,0.2)' }}>"Your Path to Protection."</p>
            <div className="flex gap-3 mt-1">
              {[
                { key: 'ig', label: 'Instagram',  href: 'https://instagram.com/surepath.id' },
                { key: 'in', label: 'LinkedIn',    href: 'https://linkedin.com/company/surepath-id' },
                { key: 'tw', label: 'Twitter / X', href: 'https://x.com/surepath_id' },
              ].map(s => (
                <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-[0.55rem] font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.key}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.25em] mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(l => (
                  <li key={l.path}>
                    <button onClick={() => navigate(l.path)} className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }}>{l.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[0.65rem]" style={{ color: 'rgba(255,255,255,0.18)' }}>© 2025 SurePath. {t('Seluruh hak dilindungi.', 'All rights reserved.')}</p>
          <div className="flex items-center gap-6">
            {[
              { label: t('Privasi', 'Privacy'), path: '/privacy' },
              { label: t('Ketentuan', 'Terms'), path: '/terms' },
              { label: t('Cookie', 'Cookie'),   path: '/cookie' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} className="text-[0.65rem] transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.18)' }}>{l.label}</button>
            ))}
            <button onClick={() => navigate('/admin')} aria-label="Admin"
              className="flex items-center gap-1 text-[0.65rem] transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.18)' }}>
              <Lock size={9} /> Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ─── Layout shell ─────────────────────────────────────────────────────────────
interface LayoutProps extends SitePageProps {
  children: React.ReactNode;
  active?: string;
  bgVideo?: string;
}

const SiteLayout: React.FC<LayoutProps> = (props) => {
  const { children, active, bgVideo, ...page } = props;
  const th = useSiteTheme(page.darkMode);
  const pwa = usePwa();

  return (
    <SiteChromeContext.Provider value={{ onInstall: pwa.handleInstallClick }}>
      <div className="min-h-screen font-sora"
        style={{ background: bgVideo ? 'transparent' : th.sectionBg1, color: th.textMain }}>

        {/* Fixed looping video background — sits behind all page content */}
        {bgVideo && (
          <video autoPlay muted loop playsInline preload="auto"
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', zIndex: -1 }}>
            <source src={bgVideo} type="video/mp4" />
          </video>
        )}

        {/* SurePath badge — covers the Gemini watermark in the bottom-right corner */}
        {bgVideo && (
          <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 49, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 10, background: 'rgba(5,8,13,0.82)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', pointerEvents: 'none', userSelect: 'none' }}>
            <img src="/surepath-logo.png" alt="SurePath" style={{ height: 13, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>
              Sure<span style={{ color: 'hsl(119 99% 46%)' }}>Path</span>
            </span>
          </div>
        )}

        <SectionBackground darkMode={page.darkMode} />
        <SiteNav {...page} active={active} />
        {children}
        <SiteFooter {...page} />

        {/* WhatsApp floating CTA */}
        <a
          href="https://wa.me/6281234567890?text=Halo%20SurePath%2C%20saya%20ingin%20bertanya%20tentang%20asuransi"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat via WhatsApp"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            borderRadius: 100,
            background: '#25d366',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.75rem',
            letterSpacing: '-0.01em',
            boxShadow: '0 4px 24px rgba(37,211,102,0.45)',
            textDecoration: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.117 1.524 5.845L0 24l6.338-1.507A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-4.988-1.365l-.358-.213-3.758.894.944-3.658-.233-.375A9.78 9.78 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z" />
          </svg>
          <span className="hidden sm:inline">Tanya via WhatsApp</span>
        </a>

        {pwa.pwaVisible && !pwa.pwaInstalled && (
          <PWAPopup onDismiss={() => pwa.setPwaVisible(false)} onInstall={pwa.installPwa} />
        )}
        {pwa.installModalOpen && (
          <InstallModal
            onClose={() => pwa.setInstallModalOpen(false)}
            onPwa={() => { pwa.installPwa(); pwa.setInstallModalOpen(false); }}
            hasPwaPrompt={!!pwa.pwaPrompt}
          />
        )}
      </div>
    </SiteChromeContext.Provider>
  );
};

export default SiteLayout;
