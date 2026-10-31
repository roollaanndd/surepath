import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Menu, X, Globe, Lock, Mail, Download } from 'lucide-react';
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
            <a key={l.id} href={l.path} onClick={e => { e.preventDefault(); go(l.path); }}
              className="flex items-center justify-between w-full py-3 border-b text-sm font-medium"
              style={{ borderColor: th.mobileMenuBorder, color: isActive(l.id) ? th.accent : th.textMuted, textDecoration: 'none' }}>
              <span>{t(l.label[0], l.label[1])}</span><ChevronRight size={14} />
            </a>
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
type GooglePreferredSourceApi = {
  init: (options: { theme: 'dark' | 'light'; lang: string }) => void;
  addPreferredSource: () => void;
};
type PreferredSourceWindow = Window & {
  __spPreferredSource?: GooglePreferredSourceApi;
  PREFERRED_SOURCE?: Array<(api: GooglePreferredSourceApi) => void>;
};

const SiteFooter: React.FC<SitePageProps> = ({ navigate, lang }) => {
  const t = useT(lang);

  // The public site is an SPA: the footer mounts after the head script may have
  // already loaded. Initialize the Google SDK explicitly instead of relying on
  // its one-time scan for static HTML placeholders.
  useEffect(() => {
    let active = true;
    const host = window as PreferredSourceWindow;
    const initialize = (api: GooglePreferredSourceApi) => {
      if (!active) return;
      host.__spPreferredSource = api;
      api.init({ theme: 'dark', lang: lang === Language.EN ? 'en' : 'id' });
      const button = document.getElementById('sp-preferred-source-btn');
      if (button) button.onclick = () => api.addPreferredSource();
    };

    if (host.__spPreferredSource) {
      initialize(host.__spPreferredSource);
    } else {
      host.PREFERRED_SOURCE = host.PREFERRED_SOURCE || [];
      host.PREFERRED_SOURCE.push(initialize);
    }

    return () => {
      active = false;
      const button = document.getElementById('sp-preferred-source-btn');
      if (button) button.onclick = null;
    };
  }, [lang]);
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
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {t('Platform asuransi digital yang transparan, manusiawi, dan beneran berpihak ke kamu.', 'A transparent, human-centered digital insurance platform built around your real needs.')}
            </p>
            <p className="text-xs font-light italic" style={{ color: 'rgba(255,255,255,0.75)' }}>"Your Path to Protection."</p>

            {/* Contact details */}
            <div className="flex flex-col gap-2.5 mt-1">
              {contacts.map((c, i) => {
                const inner = (
                  <span className="flex items-center gap-2.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    <c.Icon size={14} style={{ color: ACCENT, flexShrink: 0 }} />
                    {c.label}
                  </span>
                );
                return c.href
                  ? <a key={i} href={c.href} className="hover:opacity-80 transition-opacity w-fit">{inner}</a>
                  : <div key={i} className="w-fit">{inner}</div>;
              })}
            </div>

            <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold text-white mb-1">{t('Ikuti SurePath di Google', 'Follow SurePath on Google')}</p>
              <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{t('Pilih SurePath sebagai sumber pilihan agar artikel kami lebih mudah ditemukan di Google.', 'Choose SurePath as a preferred source to find our articles more easily on Google.')}</p>
              <button
                id="sp-preferred-source-btn"
                type="button"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-opacity hover:opacity-90"
                aria-label={t('Tambahkan SurePath ke sumber pilihan Google', 'Add SurePath as a Google preferred source')}
                onClick={() => {
                  const api = (window as PreferredSourceWindow).__spPreferredSource;
                  if (api) api.addPreferredSource();
                  else window.open('https://www.google.com/preferences/source?q=myinsurepath.com', '_blank', 'noopener,noreferrer');
                }}
              >
                {t('☆ Tambahkan SurePath di Google', '☆ Add SurePath on Google')}
              </button>
              <a href="https://www.google.com/preferences/source?q=myinsurepath.com" target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: ACCENT }}>
                {t('Tambahkan sebagai sumber pilihan', 'Add as preferred source')} →
              </a>
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
                  <span className="text-2xs font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.75)' }}>{s.key}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <p className="text-2xs font-black uppercase tracking-[0.25em] mb-5" style={{ color: 'rgba(255,255,255,0.75)' }}>{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(l => (
                  <li key={l.path}>
                    <a href={l.path} onClick={e => { e.preventDefault(); navigate(l.path); }} className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none' }}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Regulatory disclosure */}
        <div className="mt-12 rounded-2xl px-5 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-2xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>
            {t(
              'SurePath adalah platform teknologi yang memasarkan produk asuransi dari perusahaan asuransi berizin dan diawasi oleh Otoritas Jasa Keuangan (OJK). Seluruh produk asuransi diterbitkan oleh perusahaan asuransi mitra sesuai ketentuan yang berlaku. SurePath bukan perusahaan asuransi.',
              'SurePath is a technology platform marketing insurance products from licensed insurers supervised by the Indonesian Financial Services Authority (OJK). All insurance products are issued by partner insurers under applicable regulations. SurePath is not an insurance company.'
            )}
          </p>
        </div>

        <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-2xs" style={{ color: 'rgba(255,255,255,0.65)' }}>© {new Date().getFullYear()} PT Ruang Proteksi Indonesia. {t('Seluruh hak dilindungi.', 'All rights reserved.')}</p>
          <div className="flex items-center gap-6">
            {[
              { label: t('Privasi', 'Privacy'), path: '/privacy' },
              { label: t('Ketentuan', 'Terms'), path: '/terms' },
              { label: t('Cookie', 'Cookie'),   path: '/cookie' },
            ].map(l => (
              <a key={l.path} href={l.path} onClick={e => { e.preventDefault(); navigate(l.path); }} className="text-2xs transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{l.label}</a>
            ))}
            <button onClick={() => navigate('/admin')} aria-label="Admin"
              className="flex items-center gap-1 text-2xs transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
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

  // Keep the shared background video mounted as soon as a page requests it.
  // Delaying attachment until browser idle made autoplay unreliable on mobile
  // and left some screens showing only a static/empty background.
  const [bgReady, setBgReady] = useState(Boolean(bgVideo));
  useEffect(() => {
    setBgReady(Boolean(bgVideo));
  }, [bgVideo]);

  const bgVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!bgVideo || !bgReady) return;
    const video = bgVideoRef.current;
    if (!video) return;
    const attemptPlay = () => {
      if (video.paused) video.play().catch(() => {});
    };
    attemptPlay();
    document.addEventListener('visibilitychange', attemptPlay);
    return () => document.removeEventListener('visibilitychange', attemptPlay);
  }, [bgVideo, bgReady]);

  return (
    <SiteChromeContext.Provider value={{ onInstall: pwa.handleInstallClick, installed: pwa.pwaInstalled }}>
      <div className="min-h-screen font-sora"
        style={{ background: bgVideo ? 'transparent' : th.sectionBg1, color: th.textMain }}>

        {/* Fixed looping video background — sits behind all page content */}
        {bgVideo && bgReady && (
          <video ref={bgVideoRef} autoPlay muted loop playsInline preload="auto"
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', zIndex: -1 }}>
            <source src={bgVideo} type="video/mp4" />
          </video>
        )}

        {/* SurePath badge — covers the Gemini watermark in the bottom-right corner */}
        {bgVideo && (
          <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 49, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 10, background: 'rgba(5,8,13,0.82)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', pointerEvents: 'none', userSelect: 'none' }}>
            <img loading="lazy" src="/surepath-logo-sm.png" alt="SurePath" style={{ height: 13, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>
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
