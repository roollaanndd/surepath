import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import PromoBanner from './components/PromoBanner';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentProfile, getAgentByEmail, getUserByEmail, getUserTcStatus, recordTcAcceptance, recordUserHeartbeat, recordPageView, getActiveOjkRateSet } from './services/supabaseService';
import { applyOjkRateSet } from './services/ojkRates';
import TermsModal from './components/TermsModal';
import { InstallPrompt } from './components/InstallPrompt';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import RoleSelectionScreen from './components/RoleSelectionScreen';
import PortalErrorBoundary from './src/routes/PortalErrorBoundary';
import { SplashScreen, AppEntryScreen, PortalLoader } from './src/routes/splash';
import AppUpdateNotification from './components/AppUpdateNotification';
import { APP_VERSION } from './src/version';

const ADMIN_ROLES = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.INSURANCE_ADMIN];

// Decide where to route a signed-in user.
// 1. If allowed_apps has 2+ entries → '/select-app' (multi-app selector screen)
// 2. Else if allowed_apps has 1 entry → that app
// 3. Else fall back to legacy role-based routing (single-app users)
const rolePath = (user: any) => {
  const allowed: string[] | null | undefined = user?.allowed_apps;
  if (Array.isArray(allowed) && allowed.length > 1) return '/select-app';
  if (Array.isArray(allowed) && allowed.length === 1) {
    const app = allowed[0];
    if (app === 'ADMIN' || ADMIN_ROLES.includes(user.role)) return '/admin';
    if (app === 'OPERATOR') return '/operatorapp';
    if (app === 'AGENT') return '/agapps';
    return '/custapp';
  }
  // Legacy single-role routing
  const role = user?.role;
  return ADMIN_ROLES.includes(role) ? '/admin'
    : role === UserRole.OPERATOR ? '/operatorapp'
    : role === UserRole.AGENT ? '/agapps' : '/custapp';
};

// Public standalone pages that must NEVER be hijacked by the post-login
// portal redirect. A logged-in agent scanning the QR on their own quotation
// PDF lands on /q/{code} — redirecting them to their portal breaks the QR
// flow entirely (the reported "QR goes to the app" bug).
const isPublicStandalonePath = (path: string) =>
  /^\/(q|review)\//.test(path) || path.startsWith('/payment/');

const AuthGate          = lazy(() => import('./components/AuthGate'));
const AdminPortal       = lazy(() => import('./components/admin/AdminPortal'));
const AdminLogin        = lazy(() => import('./components/admin/AdminLogin'));
const OperatorPortal    = lazy(() => import('./components/operator/OperatorPortal'));
const OperatorLogin     = lazy(() => import('./components/operator/OperatorLogin'));
const AppSelector       = lazy(() => import('./components/AppSelector'));
const AgentPortal       = lazy(() => import('./components/agent/AgentPortal'));
const CustomerPortal    = lazy(() => import('./components/customer/CustomerPortal'));
const HomePage          = lazy(() => import('./src/pages/HomePage'));
const ProductsPage      = lazy(() => import('./src/pages/ProductsPage'));
const HowItWorksPage    = lazy(() => import('./src/pages/HowItWorksPage'));
const AboutPage         = lazy(() => import('./src/pages/AboutPage'));
const ContactPage       = lazy(() => import('./src/pages/ContactPage'));
const PaymentRedirect   = lazy(() => import('./components/PaymentRedirect'));
const InsuranceReviewPage = lazy(() => import('./components/InsuranceReviewPage'));
const EQuotationPage    = lazy(() => import('./components/public/EQuotationPage'));
// Old InsurerPortal (legacy) — kept for reference but not routed anymore
// const OldInsurerPortal     = lazy(() => import('./components/InsurerPortal'));
const InsurerPortal        = lazy(() => import('./components/insurer/InsurerPortal'));
const InsurerLogin         = lazy(() => import('./components/insurer/InsurerLogin'));
const ProductInfoPage   = lazy(() => import('./src/pages/ProductInfoPage'));
const AsuransiMobilPage = lazy(() => import('./src/pages/silo/AsuransiMobilPage'));
const OtherVerticalsPage = lazy(() => import('./src/pages/silo/OtherVerticalsPage'));
const ComparisonPage    = lazy(() => import('./src/pages/comparison/ComparisonPage'));
const GlossaryPage      = lazy(() => import('./src/pages/glossary/GlossaryPage'));
const FaqPage           = lazy(() => import('./src/pages/faq/FaqPage'));
const GuidesPage        = lazy(() => import('./src/pages/guides/GuidesPage'));
const CarBrandPage      = lazy(() => import('./src/pages/programmatic/CarBrandPage').then(m => ({ default: m.CarBrandPage })));
const CarBrandIndex     = lazy(() => import('./src/pages/programmatic/CarBrandPage').then(m => ({ default: m.CarBrandIndex })));
const CarModelPage      = lazy(() => import('./src/pages/programmatic/CarModelPage').then(m => ({ default: m.CarModelPage })));
const CarModelIndex     = lazy(() => import('./src/pages/programmatic/CarModelPage').then(m => ({ default: m.CarModelIndex })));
const PanduanKlaimIndex = lazy(() => import('./src/pages/guides/GuidesPage').then(m => ({ default: m.PanduanKlaimIndex })));
const RegulasiIndex     = lazy(() => import('./src/pages/guides/GuidesPage').then(m => ({ default: m.RegulasiIndex })));
const StaticInfoPage    = lazy(() => import('./src/pages/StaticInfoPage'));
const BlogPage          = lazy(() => import('./src/pages/BlogPage'));
const PremiumCalculatorPage = lazy(() => import('./src/pages/PremiumCalculatorPage'));
const B2BPortal         = lazy(() => import('./components/b2b/B2BPortal'));

const detectLang = (): Language => {
  const s = localStorage.getItem('SUREPATH_LANG');
  if (s === 'EN' || s === 'ID') return s as Language;
  return Language.ID;
};

const INITIAL_PRODUCTS = [
  { id: 'car', title: 'Car Protection', label: 'Asuransi Mobil', icon: Car, color: 'text-blue-500', bg: 'bg-blue-50', active: true, cat: 'Retail', tech: 'Smart Scan AI', desc: 'Proteksi lengkap kendaraan dengan pengecekan kerusakan instan lewat foto HP.' },
  { id: 'travel', title: 'Travel Safe', label: 'Asuransi Perjalanan', icon: Plane, color: 'text-emerald-500', bg: 'bg-emerald-50', active: true, cat: 'Retail', tech: 'Direct Payout', desc: 'Pembayaran otomatis untuk pesawat terlambat dan perlindungan medis dunia.' },
  { id: 'pa', title: 'Personal Safety', label: 'Kecelakaan Diri', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50', active: true, cat: 'Retail', tech: 'Instant Approval', desc: 'Santunan cepat kecelakaan diri dengan pendaftaran mudah cuma 60 detik.' },
  { id: 'mpar', title: 'Item Shield', label: 'Proteksi Barang', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50', active: true, cat: 'Retail', tech: 'Device Guard', desc: 'Lindungi gadget, elektronik, dan barang berharga dari kerusakan tak terduga.' },
  { id: 'health-ind', title: 'Family Health', label: 'Kesehatan Keluarga', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50', active: true, cat: 'Retail', tech: 'AI Chat', desc: 'Konsultasi gratis dengan asisten medis AI SurePath — pembelian polis kesehatan segera hadir.' },
];

const SESSION_KEY = 'SUREPATH_SESSION';
const TC_ACCEPTED_KEY = 'sp_tc_accepted_ids';

function isTcCachedLocally(userId: string): boolean {
  try {
    const raw = localStorage.getItem(TC_ACCEPTED_KEY);
    if (!raw) return false;
    const ids: string[] = JSON.parse(raw);
    return ids.includes(userId);
  } catch { return false; }
}

function cacheTcLocally(userId: string): void {
  try {
    const raw = localStorage.getItem(TC_ACCEPTED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(userId)) {
      ids.push(userId);
      localStorage.setItem(TC_ACCEPTED_KEY, JSON.stringify(ids));
    }
  } catch {}
}

const App = () => {
  const [isLoaded, setIsLoaded]       = useState(() => sessionStorage.getItem('sp_splash_done') === '1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode]       = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sp_dark_mode') === 'true';
  });
  const [appMode, setAppMode]         = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false
      : false
  );
  const [oauthLoading, setOauthLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Exact param match — a naive substring check on the raw query string
    // (previously `.includes('code=')`) false-positives on any unrelated
    // param ending in "code" (promo_code, referral_code, agent_code, all
    // used elsewhere in this app), leaving oauthLoading stuck true for
    // users who never went through an OAuth redirect at all.
    return new URLSearchParams(window.location.search).has('code') || window.location.hash.includes('access_token=');
  });
  const [products, setProducts]   = useState<any[]>(INITIAL_PRODUCTS);
  const [lang, setLang]           = useState<Language>(detectLang);
  const [entryUser, setEntryUser] = useState<{ name: string } | null>(null);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [pendingOAuthUser, setPendingOAuthUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showTc, setShowTc] = useState(false);

  useEffect(() => {
    localStorage.setItem('sp_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Prefer the CMS-managed OJK rate set over the compiled-in defaults, if one
  // is active — falls back silently to services/ojkRates.ts's built-in values.
  useEffect(() => {
    getActiveOjkRateSet().then(row => { if (row) applyOjkRateSet(row as any); }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadCustomProducts = async () => {
      try {
        const activeCustom = await db.customProducts.filter(p => p.isActive).toArray();
        if (activeCustom.length > 0) {
          const formatted = activeCustom.map(cp => ({
            id: `custom_${cp.id}`, title: cp.name, label: cp.name, icon: Package,
            color: 'text-emerald-500', bg: 'bg-emerald-50', active: true,
            cat: cp.type === 'SERVICES' ? 'Services' : 'Retail',
            desc: cp.description || 'Produk asuransi komprehensif.'
          }));
          setProducts(prev => {
            const coreIds = INITIAL_PRODUCTS.map(ip => ip.id);
            return [...prev.filter(p => coreIds.includes(p.id)), ...formatted];
          });
        }
      } catch (err) {
        console.warn('Failed to load custom products:', err);
      }
    };
    loadCustomProducts();
  }, []);

  // Apply saved UI scale on mount
  useEffect(() => {
    const scale = parseFloat(localStorage.getItem('sp_ui_scale') ?? '1');
    if (!isNaN(scale) && scale !== 1) {
      document.documentElement.style.fontSize = `${scale * 16}px`;
    }
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    // Scroll to top on route change — without this, footer links appear
    // broken because the viewport stays pinned at the bottom of the page.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleAuthSuccess = useCallback(async (user: any) => {
    let enrichedUser = user;
    if (user.role === UserRole.AGENT && !user.supabaseId) {
      const spUser = await getAgentByEmail(user.email).catch(() => null);
      if (spUser) enrichedUser = { ...user, supabaseId: spUser.id, agent_code: spUser.agent_code };
    }
    setEntryUser({ name: enrichedUser.name?.split(' ')[0] || 'Pengguna' });

    // ── Analytics: identify the user + fire login event ────────────────────
    try {
      const { setUserId, track } = await import('./services/analytics');
      setUserId(enrichedUser.id ?? enrichedUser.supabaseId ?? '', {
        role: enrichedUser.role,
        email: enrichedUser.email,
      });
      track('login', { role: enrichedUser.role, method: enrichedUser.method ?? 'email' });
    } catch { /* analytics is non-blocking */ }

    // Note: Lock-screen push notifications (FCM) are deferred to a future
    // sprint. In-app notifications (bell icon) work without Firebase.

    setTimeout(() => {
      // Tag the session with the current app version so we can detect
      // stale sessions on next load and force a refresh (see useEffect below).
      const userWithVersion = { ...enrichedUser, __appVersion: APP_VERSION };
      setCurrentUser(userWithVersion);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userWithVersion));
      setAppMode(true);
      // Keep the visitor on public standalone pages (/q/, /review/, /payment/)
      // — only route to the portal from regular entry points.
      if (!isPublicStandalonePath(window.location.pathname)) {
        navigate(rolePath(userWithVersion));
      }
    }, 1400);
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('SUREPATH_REF', ref);
  }, []);

  useEffect(() => {
    injectVercelAnalytics({ mode: 'auto' });
    seedDatabase().catch(console.error);
    const saved = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    // Tracks whether a cached session was restored successfully, so we know
    // below whether to fall through to the fresh Supabase Auth listener
    // (which is also what resolves oauthLoading — including its 10s safety
    // timeout — for anyone who doesn't end up with a restored session).
    let sessionRestored = false;
    if (saved) {
      try {
        const user = JSON.parse(saved);
        // ── Version-gated session refresh ──────────────────────────────────
        // If the saved session's app version doesn't match the current
        // APP_VERSION, the session shape may be stale (e.g., missing
        // allowed_apps in v1.19.0). Clear it and let the Supabase Auth
        // listener rebuild the session from the gateway profile.
        const savedVersion = (user as any)?.__appVersion;
        if (savedVersion && savedVersion !== APP_VERSION) {
          console.info(`[SurePath] Session version mismatch (${savedVersion} → ${APP_VERSION}), clearing session for refresh.`);
          localStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_KEY);
          // Don't set currentUser — fall through to the Supabase Auth
          // listener below (sessionRestored stays false).
        } else {
          sessionRestored = true;
          setCurrentUser(user);
          setAppMode(true);
          setOauthLoading(false);
          const restoredId = user?.supabaseId ?? user?.id;
          if (restoredId && !isTcCachedLocally(restoredId)) {
            getUserTcStatus(restoredId)
              .then((tcAccepted) => { if (tcAccepted) { cacheTcLocally(restoredId); } else { setShowTc(true); } })
              .catch(() => {});
          }
          // ── Background profile refresh ──────────────────────────────────
          // Fetch the latest profile from the gateway (in case allowed_apps
          // or other fields changed server-side since the session was saved).
          // Non-blocking — the UI renders immediately with the cached session.
          import('./services/supabaseService').then(({ callGateway }) => {
            callGateway('get_my_profile')
              .then(({ data, error }: any) => {
                if (!error && data) {
                  const refreshedUser = { ...user, allowed_apps: (data as any).allowed_apps ?? null, role: (data as any).role ?? user.role, verified: (data as any).verified ?? user.verified };
                  setCurrentUser(refreshedUser);
                  localStorage.setItem(SESSION_KEY, JSON.stringify(refreshedUser));
                }
              })
              .catch(() => {});
          }).catch(() => {});
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    if (!sessionRestored) {
      let resolved = false;
      const buildAndLogin = async (u: any) => {
        if (resolved) return;
        resolved = true;
        if (new URLSearchParams(window.location.search).has('code') || window.location.hash.includes('access_token=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        const [byId, byEmail] = await Promise.allSettled([
          getAgentProfile(u.id),
          getUserByEmail(u.email!),
        ]);
        const profile =
          (byId.status === 'fulfilled' ? byId.value : null) ??
          (byEmail.status === 'fulfilled' ? byEmail.value : null);
        setOauthLoading(false);
        if (profile) {
          // FIX v1.42.0: fail-closed — if T&C status fetch errors, show the T&C modal.
          // Previously this was fail-open (`.catch(() => true)`) which let users bypass
          // legal consent on any network blip.
          const tcAccepted = isTcCachedLocally(profile.id)
            || await getUserTcStatus(profile.id).catch(() => false);
          if (tcAccepted) { cacheTcLocally(profile.id); }
          else { setShowTc(true); }
          handleAuthSuccess({
            id: profile.id, name: profile.name, email: profile.email,
            role: profile.role as UserRole, supabaseId: profile.id,
            nodeId: profile.agent_code ?? `SP-${u.id.slice(0, 8).toUpperCase()}`,
            trustScore: profile.trust_score ?? 85,
            allowed_apps: (profile as any).allowed_apps ?? null,
          });
        } else {
          setPendingOAuthUser({
            id: u.id,
            name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email!.split('@')[0],
            email: u.email!,
          });
        }
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) buildAndLogin(session.user);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          buildAndLogin(session.user);
        }
        if (event === 'INITIAL_SESSION' && !session) {
          setOauthLoading(false);
        }
      });

      const oauthTimeout = setTimeout(() => setOauthLoading(false), 10000);
      return () => { subscription.unsubscribe(); clearTimeout(oauthTimeout); };
    }
  }, [handleAuthSuccess]);

  const handleSetLang = useCallback((l: Language) => {
    setLang(l);
    localStorage.setItem('SUREPATH_LANG', l);
  }, []);

  useEffect(() => {
    const fn = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (currentUser?.id && currentUser?.role) {
      recordUserHeartbeat(currentUser.id, currentUser.role).catch(() => {});
      heartbeatRef.current = setInterval(() => {
        recordUserHeartbeat(currentUser.id, currentUser.role).catch(() => {});
      }, 2 * 60 * 1000);
    }
    return () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentPath) { recordPageView(currentPath).catch(() => {}); }
  }, [currentPath]);

  const handleLogout = useCallback(async () => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setAppMode(false);
    navigate('/');
  }, [navigate]);

  if (!isLoaded) return <SplashScreen onFinish={() => { sessionStorage.setItem('sp_splash_done', '1'); setIsLoaded(true); }} lang={lang} setLang={handleSetLang} darkMode={darkMode} />;
  if (oauthLoading && !currentUser) return <PortalLoader />;
  if (pendingOAuthUser) return (
    <RoleSelectionScreen
      oauthUser={pendingOAuthUser}
      onComplete={user => { setPendingOAuthUser(null); handleAuthSuccess(user); }}
      onCancel={() => { setPendingOAuthUser(null); handleLogout(); }}
    />
  );
  if (entryUser) return <AppEntryScreen name={entryUser.name} onDone={() => setEntryUser(null)} lang={lang} darkMode={darkMode} />;

  if (showTc && currentUser) {
    return (
      <TermsModal
        onAccept={async () => {
          const userId = currentUser.id ?? currentUser.supabaseId;
          const ref = await recordTcAcceptance(userId);
          cacheTcLocally(userId);
          return ref;
        }}
        onDone={() => setShowTc(false)}
      />
    );
  }

  const pathname = currentPath;

  if (pathname === '/payment/success' || pathname === '/payment/failed') {
    return <Suspense fallback={<PortalLoader />}><PaymentRedirect status={pathname === '/payment/success' ? 'success' : 'failed'} /></Suspense>;
  }

  if (pathname === '/insurer-portal') {
    // Legacy route — redirect to new /insurerapp (preserve token if present)
    const t = new URLSearchParams(window.location.search).get('token');
    window.location.href = t ? `/insurerapp?token=${encodeURIComponent(t)}` : '/insurerapp';
    return null;
  }

  // ── New Insurer App — /insurerapp?token=xxx ──────────────────────────────
  // Insurers authenticate via a rolling 7-day token (not Supabase Auth).
  // Token comes from URL param or localStorage (saved from previous login).
  if (pathname === '/insurerapp') {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    const savedToken = sessionStorage.getItem('SUREPATH_INSURER_TOKEN');
    const token = urlToken ?? savedToken;
    if (!token) {
      return (
        <Suspense fallback={<PortalLoader lang={lang} />}>
          <InsurerLogin onLoginSuccess={() => window.location.reload()} onBack={() => navigate('/')} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PortalLoader />}>
        <InsurerPortal
          authToken={token}
          onLogout={() => { window.location.href = '/'; }}
          lang={lang}
        />
      </Suspense>
    );
  }

  const reviewMatch = pathname.match(/^\/review\/([0-9a-f-]{36})$/i);
  if (reviewMatch) {
    return <Suspense fallback={<PortalLoader />}><InsuranceReviewPage token={reviewMatch[1]} /></Suspense>;
  }

  // ── Public e-quotation page (QR target on quotation slip PDFs) ────────────
  const eQuoteMatch = pathname.match(/^\/q\/([A-Za-z0-9_-]{8,40})$/);
  if (eQuoteMatch) {
    return <Suspense fallback={<PortalLoader />}><EQuotationPage code={eQuoteMatch[1]} /></Suspense>;
  }

  const productMatch = pathname.match(/^\/product\/(car|travel|pa|property|health)$/);
  if (productMatch) {
    return <Suspense fallback={<PortalLoader />}><ProductInfoPage productId={productMatch[1]} lang={lang} onBack={() => navigate('/')} onSignIn={() => navigate('/login')} /></Suspense>;
  }

  // ── SEO silo — Asuransi Mobil (docs/SEO_ARCHITECTURE.md Phase 3) ──────────
  const MOBIL_SILO_ROUTES: Record<string, 'hub' | 'all-risk' | 'tlo' | 'klaim' | 'premi' | 'premi-zona-1' | 'premi-zona-2' | 'premi-zona-3'> = {
    '/asuransi-mobil': 'hub',
    '/asuransi-mobil/all-risk': 'all-risk',
    '/asuransi-mobil/tlo': 'tlo',
    '/asuransi-mobil/klaim': 'klaim',
    '/asuransi-mobil/premi': 'premi',
    '/asuransi-mobil/premi/zona-1': 'premi-zona-1',
    '/asuransi-mobil/premi/zona-2': 'premi-zona-2',
    '/asuransi-mobil/premi/zona-3': 'premi-zona-3',
  };
  const mobilSiloPage = MOBIL_SILO_ROUTES[pathname];
  if (mobilSiloPage) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <AsuransiMobilPage page={mobilSiloPage} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  // ── SEO silo — other verticals (docs/SEO_ARCHITECTURE.md Phase 3, P1) ─────
  const OTHER_VERTICAL_ROUTES: Record<string, import('./src/pages/silo/OtherVerticalsPage').OtherVerticalPage> = {
    '/asuransi-kesehatan': 'kesehatan-hub',
    '/asuransi-kesehatan/klaim': 'kesehatan-klaim',
    '/asuransi-kesehatan/premi': 'kesehatan-premi',
    '/asuransi-kecelakaan-diri': 'kecelakaan-diri-hub',
    '/asuransi-kecelakaan-diri/klaim': 'kecelakaan-diri-klaim',
    '/asuransi-kecelakaan-diri/premi': 'kecelakaan-diri-premi',
    '/asuransi-perjalanan': 'perjalanan-hub',
    '/asuransi-perjalanan/internasional': 'perjalanan-internasional',
    '/asuransi-perjalanan/klaim': 'perjalanan-klaim',
    '/asuransi-perjalanan/premi': 'perjalanan-premi',
    '/proteksi-barang': 'proteksi-barang-hub',
    '/proteksi-barang/klaim': 'proteksi-barang-klaim',
    '/proteksi-barang/premi': 'proteksi-barang-premi',
  };
  const otherVerticalPage = OTHER_VERTICAL_ROUTES[pathname];
  if (otherVerticalPage) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <OtherVerticalsPage page={otherVerticalPage} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  // ── SEO silo — comparison pages ────────────────────────────────────────────
  const comparisonMatch = pathname.match(/^\/perbandingan\/(asuransi-all-risk-vs-tlo|asuransi-kesehatan-vs-bpjs|personal-accident-vs-asuransi-jiwa|surepath-vs-beli-langsung)$/);
  if (comparisonMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <ComparisonPage slug={comparisonMatch[1] as import('./src/pages/comparison/ComparisonPage').ComparisonSlug} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  // ── SEO silo — glossary ─────────────────────────────────────────────────────
  const glossaryMatch = pathname.match(/^\/glosarium(?:\/([a-z0-9-]+))?$/);
  if (glossaryMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <GlossaryPage slug={glossaryMatch[1]} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  // ── SEO silo — FAQ index ────────────────────────────────────────────────────
  if (pathname === '/faq') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <FaqPage onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  // ── SEO silo — Panduan Klaim & Regulasi guides ─────────────────────────────
  if (pathname === '/panduan-klaim') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <PanduanKlaimIndex onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }
  if (pathname === '/regulasi') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <RegulasiIndex onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }
  const GUIDE_ROUTES: Record<string, import('./src/pages/guides/GuidesPage').GuidePage> = {
    '/panduan-klaim/kecelakaan-mobil': 'panduan-kecelakaan-mobil',
    '/panduan-klaim/klaim-ditolak': 'panduan-klaim-ditolak',
    '/panduan-klaim/hp-hilang-dicuri': 'panduan-hp-hilang',
    '/panduan-klaim/rawat-inap-mendadak': 'panduan-rawat-inap-mendadak',
    '/panduan-klaim/delay-pesawat': 'panduan-delay-pesawat',
    '/regulasi/seojk-6-2017-tarif-premi': 'regulasi-seojk-6-2017',
  };
  const guidePage = GUIDE_ROUTES[pathname];
  if (guidePage) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <GuidesPage page={guidePage} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  // ── SEO programmatic — car brands (docs/SEO_ARCHITECTURE.md Phase 4) ──────
  if (pathname === '/asuransi-mobil/merek') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <CarBrandIndex onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }
  const carBrandMatch = pathname.match(/^\/asuransi-mobil\/merek\/([a-z0-9-]+)$/);
  if (carBrandMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <CarBrandPage brand={carBrandMatch[1]} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }
  if (pathname === '/asuransi-mobil/model') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <CarModelIndex onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }
  const carModelMatch = pathname.match(/^\/asuransi-mobil\/model\/([a-z0-9-]+)$/);
  if (carModelMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <CarModelPage model={carModelMatch[1]} onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  if (pathname === '/kalkulator') {
    return <Suspense fallback={<PortalLoader />}><PremiumCalculatorPage lang={lang} onBack={() => navigate('/')} onSignIn={() => navigate('/login')} /></Suspense>;
  }

  const MARKETING_PAGES: Record<string, React.FC<any>> = {
    '/products': ProductsPage,
    '/how-it-works': HowItWorksPage,
    '/about': AboutPage,
    '/contact': ContactPage,
  };
  const MarketingPage = MARKETING_PAGES[pathname];
  if (MarketingPage) {
    return <Suspense fallback={<PortalLoader />}><MarketingPage onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} /></Suspense>;
  }

  const blogSlugMatch = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (pathname === '/blog' || blogSlugMatch) {
    return <Suspense fallback={<PortalLoader />}><BlogPage slug={blogSlugMatch ? blogSlugMatch[1] : undefined} onBack={() => navigate('/')} onSignIn={() => navigate('/login')} navigate={navigate} /></Suspense>;
  }

  const STATIC_PAGES = ['careers', 'agents', 'partnership', 'privacy', 'terms', 'security', 'cookie'];
  const staticPageId = STATIC_PAGES.find(p => pathname === `/${p}`);
  if (staticPageId) {
    return <Suspense fallback={<PortalLoader />}><StaticInfoPage pageId={staticPageId} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} onSignIn={() => navigate('/login')} /></Suspense>;
  }

  if (['/login', '/custapp', '/agapps'].includes(pathname) && !currentUser) {
    return <Suspense fallback={<PortalLoader />}><AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} /></Suspense>;
  }

  // Allow direct navigation to /operatorapp when not signed in (will hit OperatorLogin below).
  if (pathname === '/operatorapp' && !currentUser) {
    return (
      <Suspense fallback={<PortalLoader lang={lang} />}>
        <OperatorLogin onLoginSuccess={user => { handleAuthSuccess(user); navigate('/operatorapp'); }} onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && (!currentUser || !ADMIN_ROLES.includes(currentUser.role))) {
    return (
      <Suspense fallback={<PortalLoader lang={lang} />}>
        <AdminLogin onLoginSuccess={user => { handleAuthSuccess(user); navigate('/admin'); }} onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (currentUser && ADMIN_ROLES.includes(currentUser.role)) {
    return (
      <PortalErrorBoundary onReset={handleLogout}>
        <Suspense fallback={<PortalLoader />}>
          <AdminPortal onLogout={handleLogout} products={products} setProducts={setProducts} userRole={currentUser.role} currentUser={currentUser} />
        </Suspense>
      </PortalErrorBoundary>
    );
  }

  // ── Multi-app selector — shown when user has >1 entry in allowed_apps ─────
  if (pathname === '/select-app' && currentUser) {
    const allowed: string[] = Array.isArray(currentUser.allowed_apps) ? currentUser.allowed_apps : [];
    if (allowed.length <= 1) {
      // Single app or no allowed_apps — redirect to the right place
      navigate(rolePath(currentUser));
      return null;
    }
    const handleAppSelect = (app: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN') => {
      const target = app === 'ADMIN' ? '/admin'
        : app === 'OPERATOR' ? '/operatorapp'
        : app === 'AGENT' ? '/agapps' : '/custapp';
      navigate(target);
    };
    return (
      <Suspense fallback={<PortalLoader />}>
        <AppSelector user={currentUser} onSelect={handleAppSelect} onLogout={handleLogout} />
      </Suspense>
    );
  }

  // ── Helper: does this user have access to a specific app? ─────────────────
  // Multi-app users (allowed_apps has the app listed) OR legacy single-role users
  // whose role matches the app's role.
  const hasAppAccess = (app: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN'): boolean => {
    if (!currentUser) return false;
    const allowed: string[] | null | undefined = currentUser.allowed_apps;
    if (Array.isArray(allowed) && allowed.length > 0) {
      return allowed.includes(app);
    }
    // Legacy: use role
    if (app === 'ADMIN') return ADMIN_ROLES.includes(currentUser.role);
    if (app === 'OPERATOR') return currentUser.role === UserRole.OPERATOR;
    if (app === 'AGENT') return currentUser.role === UserRole.AGENT;
    if (app === 'CUSTOMER') return true; // everyone can be a customer
    return false;
  };

  // ── Operator app — newly built internal staff portal (parallel to /admin) ──
  // OPERATOR role is NOT in ADMIN_ROLES above, so they don't get the CMS.
  // They get their own /operatorapp with bottom-nav UX (matching agent app).
  if (pathname === '/operatorapp' && (!currentUser || !hasAppAccess('OPERATOR'))) {
    return (
      <Suspense fallback={<PortalLoader lang={lang} />}>
        <OperatorLogin onLoginSuccess={user => { handleAuthSuccess(user); navigate('/operatorapp'); }} onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (currentUser && hasAppAccess('OPERATOR') && pathname === '/operatorapp') {
    return (
      <PortalErrorBoundary onReset={handleLogout}>
        <Suspense fallback={<PortalLoader />}>
          <OperatorPortal operator={currentUser} onLogout={handleLogout} lang={lang} />
        </Suspense>
      </PortalErrorBoundary>
    );
  }

  if (currentUser && hasAppAccess('AGENT') && (pathname === '/agapps' || pathname === '/agentapp')) {
    const agentWithSupabaseId = currentUser.supabaseId
      ? { ...currentUser, id: currentUser.supabaseId, agent_code: currentUser.nodeId }
      : { ...currentUser, agent_code: currentUser.nodeId };
    return (
      <>
        <InstallPrompt lang={lang} />
        <PortalErrorBoundary onReset={handleLogout}>
          <Suspense fallback={<PortalLoader />}>
            <AgentPortal agent={agentWithSupabaseId} onLogout={handleLogout} lang={lang} />
          </Suspense>
        </PortalErrorBoundary>
        <AppUpdateNotification />
      </>
    );
  }

  if (currentUser && currentUser.role === UserRole.B2B_CLIENT) {
    return (
      <PortalErrorBoundary onReset={handleLogout}>
        <Suspense fallback={<PortalLoader />}>
          <B2BPortal client={currentUser} onLogout={handleLogout} lang={lang} />
        </Suspense>
      </PortalErrorBoundary>
    );
  }

  if (currentUser) {
    return (
      <>
        <InstallPrompt lang={lang} />
        <PromoBanner />
        <PortalErrorBoundary onReset={handleLogout}>
          <Suspense fallback={<PortalLoader />}>
            <CustomerPortal currentUser={currentUser} onLogout={handleLogout} lang={lang} products={products} />
          </Suspense>
        </PortalErrorBoundary>
        <AppUpdateNotification />
      </>
    );
  }

  if (!appMode) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Suspense fallback={<PortalLoader />}>
          <HomePage onSignIn={() => navigate('/login')} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
        </Suspense>
        <InstallPrompt lang={lang} />
        <AppUpdateNotification />
      </div>
    );
  }

  // Default: render AuthGate (login screen)
  return (
    <Suspense fallback={<PortalLoader />}><AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} /></Suspense>
  );
};

// ─── Wrap the entire App in the ToastProvider + ConfirmDialogProvider ────────
// These two context providers power the new useToast() and useConfirmDialog()
// hooks (components/ui/Toast.tsx, components/ui/ConfirmDialog.tsx). They must
// wrap the entire app so any component can show a toast or confirm dialog.

import { ToastProvider, ConfirmDialogProvider } from './components/ui';

const AppWithProviders: React.FC = () => (
  <ToastProvider>
    <ConfirmDialogProvider>
      <App />
    </ConfirmDialogProvider>
  </ToastProvider>
);

export default AppWithProviders;
