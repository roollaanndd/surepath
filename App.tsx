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
const InsurerPortal       = lazy(() => import('./components/InsurerPortal'));
const ProductInfoPage   = lazy(() => import('./src/pages/ProductInfoPage'));
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
    return window.location.search.includes('code=') || window.location.hash.includes('access_token=');
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
      setCurrentUser(enrichedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(enrichedUser));
      setAppMode(true);
      navigate(rolePath(enrichedUser));
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
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        setAppMode(true);
        setOauthLoading(false);
        const restoredId = user?.supabaseId ?? user?.id;
        if (restoredId && !isTcCachedLocally(restoredId)) {
          getUserTcStatus(restoredId)
            .then((tcAccepted) => { if (tcAccepted) { cacheTcLocally(restoredId); } else { setShowTc(true); } })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } else {
      let resolved = false;
      const buildAndLogin = async (u: any) => {
        if (resolved) return;
        resolved = true;
        if (window.location.search.includes('code=') || window.location.hash.includes('access_token=')) {
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
          const tcAccepted = isTcCachedLocally(profile.id)
            || await getUserTcStatus(profile.id).catch(() => true);
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
    return <Suspense fallback={<PortalLoader />}><InsurerPortal /></Suspense>;
  }

  const reviewMatch = pathname.match(/^\/review\/([0-9a-f-]{36})$/i);
  if (reviewMatch) {
    return <Suspense fallback={<PortalLoader />}><InsuranceReviewPage token={reviewMatch[1]} /></Suspense>;
  }

  const productMatch = pathname.match(/^\/product\/(car|travel|pa|property|health)$/);
  if (productMatch) {
    return <Suspense fallback={<PortalLoader />}><ProductInfoPage productId={productMatch[1]} lang={lang} onBack={() => navigate('/')} onSignIn={() => navigate('/login')} /></Suspense>;
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
    return <Suspense fallback={<PortalLoader />}><BlogPage slug={blogSlugMatch ? blogSlugMatch[1] : undefined} onBack={() => navigate('/')} onSignIn={() => navigate('/login')} /></Suspense>;
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
