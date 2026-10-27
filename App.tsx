import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentByEmail, getUserTcStatus, recordTcAcceptance, recordUserHeartbeat, recordPageView, getActiveOjkRateSet, fetchMyProfileForLogin, ensureProfile } from './services/supabaseService';
import { applyOjkRateSet } from './services/ojkRates';
import { trackPageView } from './services/analytics';
import TermsModal from './components/TermsModal';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import RoleSelectionScreen from './components/RoleSelectionScreen';
import { useDarkMode } from './components/shared/theme';
import { RevampedSplashScreen as SplashScreen, RevampedAppEntryScreen as AppEntryScreen } from './src/routes/RevampedSplashScreen';
import { RevampedPortalLoader as PortalLoader } from './src/routes/RevampedPortalLoader';
import AppUpdateNotification from './components/AppUpdateNotification';
import { APP_VERSION } from './src/version';
import { resolveSeo, applyDocumentHead } from './src/seo/seo';
import { AppRoutes } from './src/app/routes/index';

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
    if (app === 'MARKETING') return '/marketingapp';
    if (app === 'AGENT') return '/agapps';
    return '/custapp';
  }
  // Legacy single-role routing
  const role = user?.role;
  return ADMIN_ROLES.includes(role) ? '/admin'
    : role === UserRole.OPERATOR ? '/operatorapp'
    : role === UserRole.MARKETING ? '/marketingapp'
    : role === UserRole.AGENT ? '/agapps' : '/custapp';
};

// Public standalone pages that must NEVER be hijacked by the post-login
// portal redirect. A logged-in agent scanning the QR on their own quotation
// PDF lands on /q/{code} — redirecting them to their portal breaks the QR
// flow entirely (the reported "QR goes to the app" bug).
const isPublicStandalonePath = (path: string) =>
  /^\/(q|review)\//.test(path) || path.startsWith('/payment/');

// Every route-level lazy import moved to src/app/routes/* — App no longer
// renders a single portal, page or gate itself; the dispatcher there owns
// them (and each module keeps its own Suspense fallbacks).

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
  const [isLoaded, setIsLoaded]       = useState(() => sessionStorage.getItem('sp_splash_done_v2') === '1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode]       = useDarkMode();
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
    const recoveryHash = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    return new URLSearchParams(window.location.search).has('code')
      || (window.location.hash.includes('access_token=') && !recoveryHash);
  });
  const [products, setProducts]   = useState<any[]>(INITIAL_PRODUCTS);
  const [lang, setLang]           = useState<Language>(detectLang);
  const [entryUser, setEntryUser] = useState<{ name: string } | null>(null);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  // An authenticated user with no profile yet, waiting to pick an account
  // type. Reached from Google OAuth, email OTP, or any other sign-in that
  // carries no role — not OAuth-only, hence the name.
  const [pendingRoleUser, setPendingRoleUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showTc, setShowTc] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
                  // A cached session can leave a user on the wrong portal after
                  // their server-side role/app access changes. Reconcile portal
                  // routes with the freshly verified profile instead of rendering
                  // CustomerPortal as the catch-all for a stale /custapp path.
                  const activePath = window.location.pathname.replace(/\/+$/, '') || '/';
                  const desiredPath = rolePath(refreshedUser);
                  if (['/custapp', '/agapps', '/agentapp', '/select-app'].includes(activePath) && activePath !== desiredPath) {
                    window.history.replaceState({}, '', desiredPath);
                    setCurrentPath(desiredPath);
                  }
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
        // Single retrying fetch that distinguishes "no profile" (404) from
        // transient failures (5xx / network). This is the guard that prevents
        // the "loading → back to login" loop that could otherwise send an
        // existing partner through the role picker after a network hiccup.
        const result = await fetchMyProfileForLogin();
        setOauthLoading(false);
        if ('profile' in result && result.profile) {
          const profile = result.profile;
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
        } else if (result.noProfile) {
          // Server explicitly confirmed no sp_users row for this auth ID.
          //
          // Email/password signup already recorded the chosen account type in
          // the Supabase Auth metadata, and that metadata is what survives the
          // email-confirmation round trip (possibly on another device). Honor
          // it instead of asking again — re-asking here would let someone who
          // registered as Mitra land back on the picker and answer Nasabah.
          const metaRole = String(u.user_metadata?.role ?? '').toUpperCase();
          const intended = metaRole === 'AGENT' ? 'AGENT' : metaRole === 'CUSTOMER' ? 'CUSTOMER' : null;
          const displayName =
            u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email!.split('@')[0];

          if (intended) {
            const refCode = localStorage.getItem('SUREPATH_REF') || null;
            const created = await ensureProfile({
              name: displayName,
              role: intended,
              referral_code: refCode,
            }).catch(() => null);
            if (created) {
              if (refCode) localStorage.removeItem('SUREPATH_REF');
              if (!isTcCachedLocally(created.id)) setShowTc(true);
              handleAuthSuccess({
                id: created.id, name: created.name, email: created.email,
                role: created.role as UserRole, supabaseId: created.id,
                nodeId: created.agent_code ?? `SP-${u.id.slice(0, 8).toUpperCase()}`,
                trustScore: created.trust_score ?? 85,
                allowed_apps: (created as any).allowed_apps ?? null,
              });
              return;
            }
            // Creation failed — fall through to the picker rather than
            // stranding them; it calls ensure_profile again with a role.
          }

          // No account type on record: this sign-in carried none (Google
          // OAuth, and any other method without signup metadata). Ask.
          setPendingRoleUser({ id: u.id, name: displayName, email: u.email! });
        } else {
          // Transient error (5xx, network, timeout). Do NOT show the role
          // picker — that would risk creating a wrong-role profile for an
          // existing user. Sign them out of the failed session so they can
          // retry cleanly, and surface an error on the login screen.
          console.error('Profile lookup failed transiently:', (result as { lastError?: string }).lastError);
          setLoginError(
            'Tidak bisa memuat profil kamu. Cek koneksi lalu coba masuk lagi.'
          );
          await supabase.auth.signOut().catch(() => {});
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

      // Safety valve for a sign-in that never resolves. It must not fire while
      // a profile lookup is still running: dropping to AuthGate mid-flight is
      // how a brand-new OAuth user used to get a profile created underneath
      // the role picker. AuthGate no longer creates one blindly, but keeping
      // the guard honest also avoids a pointless flash of the login screen.
      const oauthTimeout = setTimeout(() => {
        if (!resolved) setOauthLoading(false);
      }, 10000);
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

  // Apply the shared motion primitive when switching between any SurePath route.
  // styles.css respects prefers-reduced-motion for this class.
  const previousPathRef = useRef(currentPath);
  useEffect(() => {
    if (previousPathRef.current === currentPath) return;
    previousPathRef.current = currentPath;
    const root = document.getElementById('root');
    if (!root) return;
    root.classList.remove('sp-page-enter');
    void root.offsetWidth;
    root.classList.add('sp-page-enter');
    const timeoutId = window.setTimeout(() => root.classList.remove('sp-page-enter'), 320);
    return () => window.clearTimeout(timeoutId);
  }, [currentPath]);

  // SEO: apply per-route <title>/description/canonical/OG/JSON-LD on every route
  // change. Without this every marketing/product/blog page inherited the
  // homepage metadata from index.html (duplicate-content signal). See src/seo/seo.ts.
  useEffect(() => {
    applyDocumentHead(resolveSeo(currentPath));
    // GA4's own page_view fires once per document load, so SPA navigations were
    // invisible to it — report them here, after the head (and so the title) is set.
    trackPageView(currentPath.replace(/\/+$/, '') || '/');
  }, [currentPath]);

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

  if (!isLoaded) return <SplashScreen onFinish={() => { sessionStorage.setItem('sp_splash_done_v2', '1'); setIsLoaded(true); }} lang={lang} setLang={handleSetLang} darkMode={darkMode} />;
  if (oauthLoading && !currentUser) return <PortalLoader />;
  if (pendingRoleUser) return (
    <RoleSelectionScreen
      authUser={pendingRoleUser}
      onComplete={user => { setPendingRoleUser(null); handleAuthSuccess(user); }}
      onCancel={() => { setPendingRoleUser(null); handleLogout(); }}
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

  const pathname = currentPath.replace(/\/+$/, '') || '/';
  const isPasswordRecovery =
    new URLSearchParams(window.location.search).get('reset') === '1' ||
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';

  // ── Route splitting ──────────────────────────────────────────────────────
  // Every branch that used to follow here — the recovery gate, the standalone
  // payment/review/e-quotation pages, the insurer token flow, the public
  // marketing pages, all three login gates and every portal catch-all — now
  // lives behind src/app/routes/index.tsx, which restores the original
  // if-chain order via one dispatcher component. Global pre-emptive states
  // (splash, oauth loading, pending role selection, entry screen, T&C above)
  // intentionally stayed in App.tsx: they depend on App state, not routes.
  //
  // rolePath is passed through as the ONLY routing authority. Do not swap in
  // routeHelpers.rolePath here — it carries unwired default_app/active_app
  // semantics, and switching to it silently would resurrect the "everyone
  // lands in the customer app" class of bug fixed in v1.57.0.
  return (
    <AppRoutes
      pathname={pathname}
      lang={lang}
      setLang={setLang}
      persistLang={handleSetLang}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      navigate={navigate}
      currentUser={currentUser}
      appMode={appMode}
      isPasswordRecovery={isPasswordRecovery}
      loginError={loginError}
      onDismissLoginError={() => setLoginError(null)}
      onNeedsRoleSelection={setPendingRoleUser}
      onAuthSuccess={handleAuthSuccess}
      onLogout={handleLogout}
      resolvePortalPath={rolePath}
      products={products}
      setProducts={setProducts}
    />
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
      <>
        <App />
        <AppUpdateNotification />
      </>
    </ConfirmDialogProvider>
  </ToastProvider>
);

export default AppWithProviders;
