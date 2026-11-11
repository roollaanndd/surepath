// v2.8.21 — laporan owner: agen yang memaksa-tutup lalu membuka ulang app
// Android mendarat di app nasabah. Cold start Capacitor memboot di '/', yang
// bukan territory isolation guard mana pun — catch-all penutup (CustomerRoutes,
// tanpa role guard) lalu merender UI nasabah. Guard kini memantulkan '/'
// (dan '/index.html') ke portal milik user yang sudah masuk; admin dikecualikan
// (CMS-nya memang catch-all), halaman publik dan marketing tetap bebas.
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AppIsolationGuard } from '../../src/app/routes/isolation';
import { UserRole } from '../../types';
import type { AppRouteProps } from '../../src/app/routeHelpers';

vi.mock('../../src/routes/RevampedPortalLoader', () => ({
  RevampedPortalLoader: () => <div data-testid="portal-loader" />,
}));

// Cermin App.tsx rolePath yang diuji (satu-satunya otoritas routing di produksi).
const resolvePortalPath = (user: any): string =>
  user?.role === UserRole.B2B_CLIENT
    ? '/b2bapps'
    : user?.role === UserRole.AGENT
      ? '/agapps'
      : user?.role === UserRole.OPERATOR
        ? '/operatorapp'
        : '/custapp';

const guard = (pathname: string, user: any, navigate: (p: string) => void) =>
  render(
    <AppIsolationGuard
      { ...( { pathname, currentUser: user, navigate, resolvePortalPath } as unknown as AppRouteProps ) }
    />
  );

describe('AppIsolationGuard — cold start di root', () => {
  it('agen yang membuka ulang app di "/" dipantulkan ke /agapps', async () => {
    const navigate = vi.fn();
    guard('/', { role: UserRole.AGENT }, navigate);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/agapps'));
  });

  it('"/index.html" (varian boot webview) juga dipantulkan', async () => {
    const navigate = vi.fn();
    guard('/index.html', { role: UserRole.AGENT }, navigate);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/agapps'));
  });

  it('customer di "/" diarahkan ke /custapp (URL portalnya sendiri)', async () => {
    const navigate = vi.fn();
    guard('/', { role: UserRole.CUSTOMER }, navigate);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/custapp'));
  });

  it('admin TIDAK dialihkan dari "/" — CMS admin memang catch-all', () => {
    const navigate = vi.fn();
    guard('/', { role: UserRole.MASTER_ADMIN }, navigate);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signed-out tetap null (halaman marketing untuk pengunjung)', () => {
    const navigate = vi.fn();
    guard('/', null, navigate);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('halaman marketing tetap bebas untuk agen (tidak dialihkan)', () => {
    const navigate = vi.fn();
    guard('/products', { role: UserRole.AGENT }, navigate);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('alur QR publik tidak pernah dialihkan (invarian isPublicStandalonePath)', () => {
    const navigate = vi.fn();
    guard('/q/ABC123', { role: UserRole.AGENT }, navigate);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('territory salah tetap ditolak: agen di /custapp dipantulkan (regresi v2.8.9)', async () => {
    const navigate = vi.fn();
    guard('/custapp', { role: UserRole.AGENT }, navigate);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/agapps'));
  });
});
