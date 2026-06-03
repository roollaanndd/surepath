import React, { useState, useEffect } from 'react';
import { ChevronRight, Menu, X, Globe } from 'lucide-react';
import { Language } from '../../../types';
import { SurePathLogo } from '../../../components/Navbar';
import {
  SitePageProps, useT, useSiteTheme,
  SectionBackground, PWAPopup, InstallModal, SiteChromeContext,
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
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5 transition-all duration-300 ${scrolled ? 'backdrop-blur-md' : ''}`}
      style={{ background: scrolled ? th.navBg : 'transparent', borderBottom: scrolled ? `1px solid ${th.navBorder}` : 'none' }}>
      <a href="/" onClick={e => { e.preventDefault(); go('/'); }} className="flex items-center gap-2.5 group">
        <img src="/surepath-logo.png" alt="SurePath" className="h-7 w-auto object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="text-xl font-semibold tracking-tight" style={{ color: th.textMain }}>
          Sure<span style={{ color: th.lpGreen }}>Path</span>
        </span>
      </a>

      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map(l => (
          <a key={l.id} href={l.path} onClick={e => { e.preventDefault(); go(l.path); }}
            className="text-sm uppercase tracking-widest transition-colors"
            style={{ color: isActive(l.id) ? th.lpGreen : th.textMuted }}>
            {t(l.label[0], l.label[1])}
          </a>
        ))}
        <button onClick={() => go('/admin')} className="text-sm uppercase tracking-widest transition-colors" style={{ color: th.textMuted }}>
          Admin
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)} aria-label="Switch language"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:opacity-80"
          style={{ background: th.navBtnBg, color: th.navBtnColor }}>
          <Globe size={12} /> {lang}
        </button>
        <button onClick={onSignIn}
          className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.97] hover:opacity-80"
          style={{ background: th.navBtnBg, color: th.navBtnColor }}>
          {t('Masuk', 'Get Started')}
        </button>
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
          className="md:hidden p-2.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ background: th.navBtnBg, color: th.navBtnColor }}>
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mx-4 mt-2 rounded-2xl border p-4"
          style={{ background: th.mobilMenuBg, borderColor: th.mobileMenuBorder, backdropFilter: 'blur(24px)' }}>
          {NAV_LINKS.map(l => (
            <button key={l.id} onClick={() => go(l.path)}
              className="flex items-center justify-between w-full py-3 border-b text-sm font-medium uppercase tracking-widest"
              style={{ borderColor: th.mobileMenuBorder, color: isActive(l.id) ? th.lpGreen : th.textMuted }}>
              <span>{t(l.label[0], l.label[1])}</span><ChevronRight size={14} />
            </button>
          ))}
          <div className="flex gap-2 mt-4">
            <button onClick={() => go('/admin')} className="flex-1 py-2.5 rounded-xl text-xs font-black"
              style={{ background: 'rgba(6,224,0,0.08)', border: `1px solid rgba(6,224,0,0.2)`, color: th.lpGreen }}>Admin</button>
            <button onClick={onSignIn} className="flex-1 py-2.5 rounded-xl text-xs font-black"
              style={{ background: th.lpGreen, color: 'hsl(0 0% 4%)' }}>{t('Masuk', 'Get Started')}</button>
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
const SiteFooter: React.FC<SitePageProps> = ({ navigate, lang, darkMode }) => {
  const t = useT(lang);
  const th = useSiteTheme(darkMode);
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
    <footer style={{ borderTop: '1px solid rgba(34,197,94,0.07)', background: th.footerBg }}>
      <div className="max-w-7xl mx-auto px-5 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <img src="/surepath-logo.png" alt="SurePath" className="h-9 w-auto object-contain"
                onError={(e) => {
                  const tg = e.target as HTMLImageElement; tg.style.display = 'none';
                  const n = tg.nextElementSibling as HTMLElement | null; if (n) n.style.display = 'flex';
                }} />
              <div className="hidden w-9 h-9 rounded-xl items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <SurePathLogo className="w-5 h-5" />
              </div>
              <span className="font-black text-xl tracking-tight" style={{ color: '#ffffff' }}>
                Sure<span style={{ color: '#22c55e' }}>Path</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: th.textMuted }}>
              {t('Asuransi yang transparan, manusiawi, dan beneran berpihak ke kamu — bukan ke komisi.', 'A transparent, human-centered digital insurance platform built around your real needs.')}
            </p>
            <p className="text-xs font-bold italic" style={{ color: 'rgba(134,239,172,0.5)' }}>"Your Path to Protection."</p>
            <div className="flex gap-3 mt-1">
              {[
                { key: 'ig', label: 'Instagram',  href: 'https://instagram.com/surepath.id' },
                { key: 'in', label: 'LinkedIn',    href: 'https://linkedin.com/company/surepath-id' },
                { key: 'tw', label: 'Twitter / X', href: 'https://x.com/surepath_id' },
              ].map(s => (
                <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:border-emerald-500/30"
                  style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow }}>
                  <span className="text-[0.55rem] font-black uppercase tracking-wide" style={{ color: th.textMuted }}>{s.key}</span>
                </a>
              ))}
            </div>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.25em] mb-5" style={{ color: '#22c55e' }}>{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(l => (
                  <li key={l.path}>
                    <button onClick={() => navigate(l.path)} className="text-sm transition-colors hover:text-white" style={{ color: th.textMuted }}>{l.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[0.65rem]" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2025 SurePath. {t('Seluruh hak dilindungi.', 'All rights reserved.')}</p>
          <div className="flex items-center gap-6">
            {[
              { label: t('Privasi', 'Privacy'), path: '/privacy' },
              { label: t('Ketentuan', 'Terms'), path: '/terms' },
              { label: t('Cookie', 'Cookie'),   path: '/cookie' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} className="text-[0.65rem] transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.2)' }}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

// ─── Layout shell — wraps every marketing page ────────────────────────────────
interface LayoutProps extends SitePageProps {
  children: React.ReactNode;
  active?: string;
}

const SiteLayout: React.FC<LayoutProps> = (props) => {
  const { children, active, ...page } = props;
  const th = useSiteTheme(page.darkMode);
  const pwa = usePwa();

  return (
    <SiteChromeContext.Provider value={{ onInstall: pwa.handleInstallClick }}>
      <div className="min-h-screen font-sora" style={{ background: th.sectionBg1, color: th.textMain }}>
        <SectionBackground darkMode={page.darkMode} />
        <SiteNav {...page} active={active} />
        {children}
        <SiteFooter {...page} />

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
