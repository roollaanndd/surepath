import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Menu, X, Globe, Lock, Mail, Phone, MapPin, Download } from 'lucide-react';
import { Language } from '../../../types';
import { SurePathLogo } from '../../../components/Navbar';
import {
  SitePageProps, useT, useSiteTheme,
  SectionBackground, PWAPopup, SiteChromeContext, useSiteChrome, ACCENT,
} from './siteKit';
import { FloatingWhatsApp } from '../../../components/ui';
import { usePwaInstall, promptInstall, isMobileView, isInstallOfferSnoozed, snoozeInstallOffer } from '../../../services/pwaInstall';
import InstallAppSheet from '../../../components/shared/InstallAppSheet';

// ─── PWA install state hook ───────────────────────────────────────────────────
//
// This used to keep its own `beforeinstallprompt` listener. SiteLayout ships in
// a lazy chunk, so that listener attached seconds after the browser had already
// fired the event — the prompt was always missed here, and the Install button
// fell through to a how-to modal that only creates a browser shortcut. The
// prompt is now captured in index.html and read from services/pwaInstall.ts.
const usePwa = () => {
  const { installed, canPrompt, method } = usePwaInstall();
  const [pwaVisible, setPwaVisible] = useState(false);
  const [installSheet, setInstallSheet] = useState(false);
  const teasedRef = useRef(false);

  useEffect(() => {
    // Soft bottom banner on mobile once a real one-tap install is available.
    // The shared snooze: InstallPrompt's sheet renders on this same homepage,
    // so "later" there must silence this banner too.
    if (teasedRef.current || installed || !canPrompt || !isMobileView() || isInstallOfferSnoozed()) return;
    teasedRef.current = true;
    const id = setTimeout(() => setPwaVisible(true), 4000);
    return () => clearTimeout(id);
  }, [installed, canPrompt]);

  const installPwa = async () => {
    const outcome = await promptInstall();
    setPwaVisible(false);
    if (outcome === 'unavailable') setInstallSheet(true);
  };

  const dismissBanner = () => { snoozeInstallOffer(); setPwaVisible(false); };

  return {
    pwaVisible,
    // Hide the navbar Install button once it is installed — and on browsers
    // that cannot install at all, where the button could only ever apologise.
    pwaInstalled: installed || method === 'unsupported',
    installSheet, setInstallSheet, dismissBanner, installPwa,
    handleInstallClick: installPwa,
  };
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { path: '/',             id: 'home',         label: ['Home', 'Home'] as const },
  { path: '/products',     id: 'products',     label: ['Produk', 'Products'] as const },
  { path: '/ai',           id: 'ai',           label: ['Teknologi AI', 'AI Technology'] as const },
  { path: '/how-it-works', id: 'how-it-works', label: ['Cara Kerja', 'How It Works'] as const },
  { path: '/about',        id: 'about',        label: ['Tentang', 'About'] as const },
  { path: '/blog',         id: 'blog',         label: ['Blog', 'Blog'] as const },
];

const SiteNav: React.FC<SitePageProps & { active?: string }> = ({ onSignIn, navigate, lang, setLang, darkMode, active }) => {
  const t = useT(lang);
  const th = useSiteTheme(darkMode);
  const { onInstall, installed } = useSiteChrome();
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
        <img loading="lazy" src="/surepath-logo-sm.png" alt="SurePath" className="h-7 w-auto object-contain"
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
        {!installed && (
          <button onClick={onInstall} aria-label="Install app"
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
            style={{ background: 'rgba(22,163,74,0.12)', color: th.accent, border: `1px solid ${th.accent}30` }}>
            <Download size={12} /> {t('Install App', 'Install App')}
          </button>
        )}
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
          {!installed && (
            <button onClick={() => { setMenuOpen(false); onInstall(); }}
              className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-xl text-xs font-black"
              style={{ background: 'rgba(22,163,74,0.12)', color: th.accent, border: `1px solid ${th.accent}30` }}>
              <Download size={13} /> {t('Install App', 'Install App')}
            </button>
          )}
          <div className="flex gap-2 mt-2">
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
      { label: t('Proteksi Iklim', 'Climate Shield'),        path: '/product/climate' },
    ]},
    { title: t('Perusahaan', 'Company'), links: [
      { label: t('Tentang Kami', 'About Us'),      path: '/about' },
      { label: t('Cara Kerja', 'How It Works'),    path: '/how-it-works' },
      { label: t('Teknologi AI', 'AI Technology'), path: '/ai' },
      { label: t('Hubungi Kami', 'Contact Us'),    path: '/contact' },
      { label: t('Karir', 'Careers'),              path: '/careers' },
      { label: t('Blog', 'Blog'),                  path: '/blog' },
      { label: t('Program Mitra', 'Partner Program'), path: '/agents' },
    ]},
    { title: t('Legal', 'Legal'), links: [
      { label: t('Kebijakan Privasi', 'Privacy Policy'),       path: '/privacy' },
      { label: t('Syarat & Ketentuan', 'Terms & Conditions'),  path: '/terms' },
      { label: t('Keamanan Data', 'Data Security'),            path: '/security' },
      { label: t('Kebijakan Cookie', 'Cookie Policy'),         path: '/cookie' },
      { label: t('Kemitraan', 'Partnership'),                  path: '/partnership' },
    ]},
  ];

  const contacts = [
    { Icon: Mail,  label: 'halo@myinsurepath.com', href: 'mailto:halo@myinsurepath.com' },
    { Icon: Phone, label: '+62 21 5060 1234',      href: 'tel:+622150601234' },
    { Icon: MapPin, label: t('Jakarta Selatan, Indonesia', 'South Jakarta, Indonesia'), href: undefined },
  ];

  return (
    <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <img loading="lazy" src="/surepath-logo-sm.png" alt="SurePath" className="h-8 w-auto object-contain"
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

            {/* Contact details */}
            <div className="flex flex-col gap-2.5 mt-1">
              {contacts.map((c, i) => {
                const inner = (
                  <span className="flex items-center gap-2.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <c.Icon size={14} style={{ color: ACCENT, flexShrink: 0 }} />
                    {c.label}
                  </span>
                );
                return c.href
                  ? <a key={i} href={c.href} className="hover:opacity-80 transition-opacity w-fit">{inner}</a>
                  : <div key={i} className="w-fit">{inner}</div>;
              })}
            </div>

            <div className="flex gap-3 mt-1">
              {[
                { key: 'ig', label: 'Instagram',  href: 'https://instagram.com/myinsurepath' },
                { key: 'in', label: 'LinkedIn',    href: 'https://linkedin.com/company/myinsurepath' },
                { key: 'tw', label: 'Twitter / X', href: 'https://x.com/myinsurepath' },
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

        {/* Regulatory disclosure */}
        <div className="mt-12 rounded-2xl px-5 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[0.62rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
            {t(
              'SurePath adalah platform teknologi yang memasarkan produk asuransi dari perusahaan asuransi berizin dan diawasi oleh Otoritas Jasa Keuangan (OJK). Seluruh produk asuransi diterbitkan oleh perusahaan asuransi mitra sesuai ketentuan yang berlaku. SurePath bukan perusahaan asuransi.',
              'SurePath is a technology platform marketing insurance products from licensed insurers supervised by the Indonesian Financial Services Authority (OJK). All insurance products are issued by partner insurers under applicable regulations. SurePath is not an insurance company.'
            )}
          </p>
        </div>

        <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[0.65rem]" style={{ color: 'rgba(255,255,255,0.18)' }}>© {new Date().getFullYear()} PT Ruang Proteksi Indonesia. {t('Seluruh hak dilindungi.', 'All rights reserved.')}</p>
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

  // The background video sits at zIndex -1 behind the hero, so it is invisible
  // during first paint — defer its ~0.7-1 MB download until the page has loaded
  // and the browser is idle, instead of competing with critical resources.
  const [bgReady, setBgReady] = useState(false);
  useEffect(() => {
    if (!bgVideo) return;
    let idleId: number | undefined;
    const schedule = () => {
      const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout: number }) => number);
      idleId = ric ? ric(() => setBgReady(true), { timeout: 4000 }) : window.setTimeout(() => setBgReady(true), 1500) as unknown as number;
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      const cic = (window as any).cancelIdleCallback;
      if (idleId !== undefined) {
        if (cic) cic(idleId); else clearTimeout(idleId);
      }
    };
  }, [bgVideo]);

  return (
    <SiteChromeContext.Provider value={{ onInstall: pwa.handleInstallClick, installed: pwa.pwaInstalled }}>
      <div className="min-h-screen font-sora"
        style={{ background: bgVideo ? 'transparent' : th.sectionBg1, color: th.textMain }}>

        {/* Fixed looping video background — sits behind all page content */}
        {bgVideo && bgReady && (
          <video autoPlay muted loop playsInline preload="auto"
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', zIndex: -1 }}>
            <source src={bgVideo} type="video/mp4" />
          </video>
        )}

        {/* SurePath badge — covers the Gemini watermark in the bottom-right corner */}
        {bgVideo && (
          <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 49, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 10, background: 'rgba(5,8,13,0.82)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', pointerEvents: 'none', userSelect: 'none' }}>
            <img loading="lazy" src="/surepath-logo-sm.png" alt="SurePath" style={{ height: 13, width: 'auto', objectFit: 'contain' }}
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

        {pwa.pwaVisible && !pwa.pwaInstalled && (
          <PWAPopup onDismiss={pwa.dismissBanner} onInstall={pwa.installPwa} />
        )}
        {pwa.installSheet && (
          <InstallAppSheet lang={page.lang} onClose={() => pwa.setInstallSheet(false)} />
        )}

        {/* Floating WhatsApp — Indonesian users expect to ask pre-purchase
            questions via WhatsApp. Its absence is the #1 conversion friction. */}
        <FloatingWhatsApp />
      </div>
    </SiteChromeContext.Provider>
  );
};

export default SiteLayout;
