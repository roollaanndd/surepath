// Guard for the SurePath illustrated icon language.
//
// Every module/entity icon in the apps and dashboards goes through
// `ModuleIcon` / `moduleIcon()` / an `iconId` field, keyed by an Icon Manager
// id. An id that is not on the Icon Manager list silently renders generic art
// and, worse, can never be replaced by an admin upload. This asserts the
// source: any literal id passed to the helpers must be a canonical Icon
// Manager id (or one of the few glyph-backed ids that always ship a glyph).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const managerSrc = readFileSync(join(ROOT, 'components/admin/PortalIconManager.tsx'), 'utf8');
const CANONICAL = new Set(
  [...managerSrc.slice(0, managerSrc.indexOf('] as const')).matchAll(/\{ id: '([a-z_0-9]+)'/g)].map(m => m[1]),
);
// Always rendered with an explicit `glyph`, so they are art-complete without a manager slot.
const GLYPH_BACKED = new Set(['bank', 'network', 'renewal']);

describe('illustrated module icons', () => {
  it('reads the Icon Manager list', () => {
    expect(CANONICAL.size).toBeGreaterThan(40);
    expect(CANONICAL.has('car_protection')).toBe(true);
  });

  it('only uses ids that exist on the Icon Manager list', () => {
    const files = walk(join(ROOT, 'components'));
    const patterns = [
      /<ModuleIcon[^>]*?\bid="([a-z_0-9]+)"/g,
      /\bmoduleIcon\('([a-z_0-9]+)'/g,
      /\biconId[:=]\s*['"]([a-z_0-9]+)['"]/g,
    ];
    const bad: string[] = [];
    let seen = 0;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const re of patterns) {
        for (const m of src.matchAll(re)) {
          seen++;
          const id = m[1];
          if (!CANONICAL.has(id) && !GLYPH_BACKED.has(id)) bad.push(`${f.replace(ROOT, '')}: ${id}`);
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });
});
