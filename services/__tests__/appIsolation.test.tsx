// App isolation guard — v2.7.57.
// Pins the invariant the owner asked for: a signed-in user must never be
// switched into another app, and a B2B client must never even appear to enter
// the admin dashboard. Every case here mirrors a real dispatch through
// src/app/routes/index.tsx.
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('../../routes/RevampedPortalLoader', () => ({
  RevampedPortalLoader: () => <div data-testid="loader" />,
}));

import { AppIsolationGuard, territoryAppForPath, userAllowedInApp } from '../../src/app/routes/isolation';
import type { AppRouteProps } from '../../src/app/routeHelpers';
import { Language } from '../../types';

const baseProps = (pathname: string, currentUser: any, overrides: Partial<AppRouteProps> = {}): AppRouteProps => ({
  pathname,
  lang: Language.ID,
  setLang: vi.fn(),
  darkMode: false,
  setDarkMode: vi.fn(),
  navigate: vi.fn(),
  currentUser,
  appMode: true,
  isPasswordRecovery: false,
  loginError: null,
  onDismissLoginError: vi.fn(),
  onNeedsRoleSelection: vi.fn(),
  onAuthSuccess: vi.fn(),
  onLogout: vi.fn(),
  resolvePortalPath: (user: any) =>
    user?.role === 'B2B_CLIENT' ? '/b2bapps'
      : user?.role === 'OPERATOR' ? '/operatorapp'
      : user?.role === 'MARKETING' ? '/marketingapp'
      : user?.role === 'AGENT' ? '/agapps'
      : user?.role === 'MASTER_ADMIN' ? '/admin'
      : '/custapp',
  products: [],
  setProducts: vi.fn(),
  ...overrides,
});

// Satu mount = satu set props, supaya navigate yang dites adalah navigate
// yang benar-benar diterima komponen.
const mount = (pathname: string, currentUser: any, overrides: Partial<AppRouteProps> = {}) => {
  const props = baseProps(pathname, currentUser, overrides);
  const utils = render(<AppIsolationGuard {...props} />);
  return { props, utils };
};

const redirectedTo = ({ props }: ReturnType<typeof mount>): string | null => {
  const nav = props.navigate as ReturnType<typeof vi.fn>;
  return nav.mock.calls[0]?.[0] ?? null;
};
const stayedPut = ({ props }: ReturnType<typeof mount>) =>
  expect(props.navigate).not.toHaveBeenCalled();

describe('territoryAppForPath', () => {
  it('maps app territories', () => {
    expect(territoryAppForPath('/admin')).toBe('ADMIN');
    expect(territoryAppForPath('/admin/users')).toBe('ADMIN');
    expect(territoryAppForPath('/operatorapp')).toBe('OPERATOR');
    expect(territoryAppForPath('/marketingapp')).toBe('MARKETING');
    expect(territoryAppForPath('/agapps')).toBe('AGENT');
    expect(territoryAppForPath('/agentapp')).toBe('AGENT');
    expect(territoryAppForPath('/custapp')).toBe('CUSTOMER');
    expect(territoryAppForPath('/b2bapps')).toBe('B2B');
  });

  it('does not swallow lookalike or public paths', () => {
    expect(territoryAppForPath('/adminabc')).toBeNull();
    expect(territoryAppForPath('/products')).toBeNull();
    expect(territoryAppForPath('/blog')).toBeNull();
    expect(territoryAppForPath('/q/ABC123')).toBeNull();
    expect(territoryAppForPath('/payment/INV-1')).toBeNull();
  });
});

describe('AppIsolationGuard — B2B_CLIENT never leaves its portal', () => {
  const b2b = { role: 'B2B_CLIENT', name: 'PT Contoh', email: 'pic@corp.id' };

  it('redirects /admin (dashboard) to /b2bapps', async () => {
    const { props, utils } = mount('/admin', b2b);
    await waitFor(() => expect(props.navigate).toHaveBeenCalledWith('/b2bapps'));
    expect(redirectedTo({ props, utils })).toBe('/b2bapps');
  });

  it('redirects every other app territory to /b2bapps', async () => {
    for (const p of ['/agapps', '/custapp', '/operatorapp', '/marketingapp', '/agentapp']) {
      const { props } = mount(p, b2b);
      await waitFor(() => expect(props.navigate).toHaveBeenCalledWith('/b2bapps'));
    }
  });

  it('stays put on /b2bapps and on public pages', () => {
    const stay = mount('/b2bapps', b2b);
    stayedPut(stay);
    const pub = mount('/products', b2b);
    stayedPut(pub);
  });
});

describe('AppIsolationGuard — other roles stay in their own app', () => {
  it('AGENT typing /custapp is bounced back to /agapps', async () => {
    const agent = { role: 'AGENT', name: 'Budi' };
    const { props } = mount('/custapp', agent);
    await waitFor(() => expect(props.navigate).toHaveBeenCalledWith('/agapps'));
  });

  it('CUSTOMER typing /admin never reaches the dashboard', async () => {
    const customer = { role: 'CUSTOMER', name: 'Citra' };
    const { props } = mount('/admin', customer);
    await waitFor(() => expect(props.navigate).toHaveBeenCalledWith('/custapp'));
  });

  it('OPERATOR typing /agapps is bounced back to /operatorapp', async () => {
    const op = { role: 'OPERATOR', name: 'Ops' };
    const { props } = mount('/agapps', op);
    await waitFor(() => expect(props.navigate).toHaveBeenCalledWith('/operatorapp'));
  });

  it('lets each role stay on their own portal path', () => {
    stayedPut(mount('/agapps', { role: 'AGENT', name: 'Budi' }));
    stayedPut(mount('/custapp', { role: 'CUSTOMER', name: 'Citra' }));
    stayedPut(mount('/operatorapp', { role: 'OPERATOR', name: 'Ops' }));
    stayedPut(mount('/marketingapp', { role: 'MARKETING', name: 'M' }));
  });
});

describe('AppIsolationGuard — deliberate exemptions preserved', () => {
  it('admin roles are exempt everywhere (CMS catch-all is intended)', () => {
    for (const role of ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN']) {
      stayedPut(mount('/admin', { role, name: 'A' }));
      stayedPut(mount('/custapp', { role, name: 'A' }));
    }
  });

  it('stale allowed_apps never lock a user out of their own role app', () => {
    // Bug history 2026-07-07: agent with stale ['CUSTOMER'] array.
    const agent = { role: 'AGENT', name: 'Budi', allowed_apps: ['CUSTOMER'] };
    stayedPut(mount('/agapps', agent));
  });

  it('multi-app users may visit every app in their allowed list', () => {
    const agent = { role: 'AGENT', name: 'Budi', allowed_apps: ['AGENT', 'CUSTOMER'] };
    stayedPut(mount('/agapps', agent));
    stayedPut(mount('/custapp', agent));
    expect(redirectedTo(mount('/admin', agent))).toBe('/agapps');
  });

  it('signed-out users are untouched (entry gates own those paths)', () => {
    stayedPut(mount('/admin', null));
    stayedPut(mount('/custapp', null));
  });

  it('QR / payment standalone paths are never hijacked', () => {
    const b2b = { role: 'B2B_CLIENT', name: 'PT' };
    stayedPut(mount('/q/SOME-CODE', b2b));
    stayedPut(mount('/payment/INV-1', b2b));
    stayedPut(mount('/review/TOKEN', b2b));
  });
});

describe('userAllowedInApp', () => {
  it('B2B_CLIENT only ever matches the B2B app', () => {
    const b2b = { role: 'B2B_CLIENT' };
    expect(userAllowedInApp(b2b, 'B2B')).toBe(true);
    expect(userAllowedInApp(b2b, 'CUSTOMER')).toBe(false);
    expect(userAllowedInApp(b2b, 'ADMIN')).toBe(false);
  });
});
