// Light-only theme guard for the Admin CMS (design.md §4, approved 2026-10).
//
// The admin theme used to be auto|light|dark with an 18:00–06:00 auto-dark
// schedule (`components/admin/themeMode.ts`, #326). The owner-approved
// direction is light-only: no dark theme, no auto-hours, and no writes to the
// shared `sp_dark_mode` key (which belongs to the customer/agent portals and
// used to be overwritten by the admin auto-dark tick every 5 minutes).
//
// This predecessor suite (`resolveAdminDark`/`nextThemeMode`/schedules) tested
// the now-removed capability, so it is superseded by these guards. They assert
// the SOURCE, like adminDesignFloor.test.ts: any re-introduction of dark admin
// plumbing fails here at unit-test time instead of failing a user at 19:00.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const ADMIN_DIR = join(__dirname, '../../components/admin');

function adminFiles(dir: string = ADMIN_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return adminFiles(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

const FILES = adminFiles();

/**
 * Comments regularly mention the symbols they removed; only real code must
 * trip the guard.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

describe('admin theme is light-only (design.md §4)', () => {
  it('removed the auto|dark theme module entirely', () => {
    expect(existsSync(join(ADMIN_DIR, 'themeMode.ts'))).toBe(false);
  });

  it('no admin component references the retired theme plumbing', () => {
    const banned = [
      'resolveAdminDark',
      'nextThemeMode',
      'ADMIN_THEME_SCHEDULE',
      "ADMIN_THEME_KEY'",
      "from './themeMode'",
      'sp-admin-theme-changed',
      'cycleTheme',
    ];
    const offenders: string[] = [];
    for (const f of FILES) {
      const src = stripComments(readFileSync(f, 'utf8'));
      for (const token of banned) {
        if (src.includes(token)) offenders.push(`${f.replace(ADMIN_DIR, 'components/admin')}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the admin portal never writes the shared sp_dark_mode key', () => {
    const portal = stripComments(readFileSync(join(ADMIN_DIR, 'AdminPortal.tsx'), 'utf8'));
    expect(portal).not.toContain('storeDarkMode');
    // It must keep forcing light while the CMS is mounted, and restore on
    // unmount (customer/agent keep their manual dark mode).
    expect(portal).toMatch(/applyDarkMode\(false\)/);
    expect(portal).toMatch(/applyDarkMode\(\s*readDarkMode\(\)\s*\)/);
  });

  it('admin workspace dashboards no longer accept a dark toggle', () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      const src = stripComments(readFileSync(f, 'utf8'));
      if (/darkMode|onToggleDark/.test(src)) offenders.push(f.replace(ADMIN_DIR, 'components/admin'));
    }
    expect(offenders).toEqual([]);
  });
});
