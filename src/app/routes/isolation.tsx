import React, { Suspense, useEffect } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import { ADMIN_ROLES, hasAppAccess, isPublicStandalonePath } from '../routeHelpers';
import type { AppRouteProps } from '../routeHelpers';
import { UserRole } from '../../../types';

// ─── App isolation guard (v2.7.57) ───────────────────────────────────────────
//
// SATU tempat di dispatcher yang menegakkan: pengguna yang sudah masuk hanya
// berada di portal miliknya. Sebelumnya guard hanya hidup per-modul (AgentRoutes
// menuntut hasAppAccess('AGENT'), dst.), sehingga URL milik app lain tetap
// BISA dikunjungi dan jatuh ke catch-all penutup:
//   • AGENT mengetik /custapp → CustomerPortal tampil di URL /agapps-milik-orang-lain;
//   • OPERATOR di /agapps → sama;
//   • B2B_CLIENT / CUSTOMER di /admin → portal mereka tampil di URL /admin,
//     seolah mereka "masuk admin dashboard".
// Tidak ada yang bocor secara data (setiap gateway action tetap dijaga server),
// tapi pengalihannya membingungkan dan terlihat seperti user bisa pindah app.
// Guard ini memantulkan pengguna ke portal utamanya (resolvePortalPath milik
// App.tsx — satu-satunya pemetaan yang diuji) SEBELUM modul portal mana pun
// mengklaim pathname.
//
// Pengecualian yang disengaja (perilaku lama yang dipertahankan):
//   • ADMIN_ROLES: CMS admin memang catch-all untuk admin di SEMUA pathname
//     (App.tsx 636) — admin dikecualikan dari guard ini sepenuhnya.
//   • Halaman publik (/products, /blog, /q/{code}, /payment/…) bukan wilayah
//     app — semua role tetap boleh membukanya.
//   • /insurerapp berbasis token bearer, bukan peran — di luar guard ini.
//
// Union role-app: allowed_apps yang basi (riwayat bug 2026-07-07) tidak boleh
// mengunci pengguna keluar dari app perannya sendiri — semantik yang sama
// dengan effectiveApps di App.tsx.

const APP_FOR_ROLE: Record<string, 'OPERATOR' | 'MARKETING' | 'AGENT' | 'CUSTOMER'> = {
  OPERATOR: 'OPERATOR',
  MARKETING: 'MARKETING',
  AGENT: 'AGENT',
  B2B_CLIENT: 'CUSTOMER',
};

const roleToAppId = (role: any): string =>
  ADMIN_ROLES.includes(role) ? 'ADMIN' : APP_FOR_ROLE[role] ?? 'CUSTOMER';

// Wilayah app: prefix path → id app. Pencocokan persis: `path === prefix`
// atau `path.startsWith(prefix + '/')` — '/admin' tidak menelan '/adminabc'.
interface Territory { prefix: string; app: 'ADMIN' | 'OPERATOR' | 'MARKETING' | 'AGENT' | 'CUSTOMER' | 'B2B'; }
const APP_TERRITORIES: Territory[] = [
  { prefix: '/admin', app: 'ADMIN' },
  { prefix: '/operatorapp', app: 'OPERATOR' },
  { prefix: '/marketingapp', app: 'MARKETING' },
  { prefix: '/agentapp', app: 'AGENT' },
  { prefix: '/agapps', app: 'AGENT' },
  { prefix: '/custapp', app: 'CUSTOMER' },
  { prefix: '/b2bapps', app: 'B2B' },
];

export const territoryAppForPath = (path: string): Territory['app'] | null => {
  for (const t of APP_TERRITORIES) {
    if (path === t.prefix || path.startsWith(t.prefix + '/')) return t.app;
  }
  return null;
};

// Apakah pengguna boleh berada di app tsb. Dua pengecualian eksplisit:
//   • B2B_CLIENT — satu-satunya app-nya adalah portal B2B (dicek lebih dulu,
//     sebelum union sempat memperlakukan role-nya sebagai 'CUSTOMER').
//   • CUSTOMER — hasAppAccess legacy memperlakukan CUSTOMER sebagai fallback
//     universal (baris `if (app === 'CUSTOMER') return true`), yang justru
//     membuat agen/operator jatuh ke app pelanggan. Wilayah /custapp hanya
//     untuk role yang app utamanya CUSTOMER atau yang diberi akses eksplisit.
export const userAllowedInApp = (user: any, app: Territory['app']): boolean => {
  if (user?.role === UserRole.B2B_CLIENT) return app === 'B2B';
  if (app === 'CUSTOMER') {
    return roleToAppId(user?.role) === 'CUSTOMER'
      || (Array.isArray(user?.allowed_apps) && user.allowed_apps.includes('CUSTOMER'));
  }
  if (hasAppAccess(user, app as any)) return true;
  return roleToAppId(user?.role) === app;
};

const RedirectHome: React.FC<{ to: string; navigate: (path: string) => void }> = ({ to, navigate }) => {
  useEffect(() => { navigate(to); }, [to, navigate]);
  return (
    <Suspense fallback={null}>
      <PortalLoader />
    </Suspense>
  );
};

export const AppIsolationGuard: React.FC<AppRouteProps> = ({ pathname, currentUser, navigate, resolvePortalPath }) => {
  if (!currentUser) return null;
  // Admin: catch-all CMS-nya memang disengaja di semua pathname.
  if (ADMIN_ROLES.includes(currentUser.role)) return null;
  // Alur QR/payment/review tidak pernah dialihkan (invarian isPublicStandalonePath).
  if (isPublicStandalonePath(pathname)) return null;

  const app = territoryAppForPath(pathname);
  if (!app) return null;
  if (userAllowedInApp(currentUser, app)) return null;

  return <RedirectHome to={resolvePortalPath(currentUser)} navigate={navigate} />;
};
