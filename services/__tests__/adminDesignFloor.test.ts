// Floor tests for the Admin CMS redesign (docs/UI_REDESIGN_2026-10.md, S1).
//
// Two defects dominated the admin portal before the S1 pass and both are the
// kind that creeps back in one copy-pasted line at a time:
//
//  1. Sub-11px type. 494 occurrences of text-[10px]/[9px]/[8px] and their rem
//     equivalents, against a documented 11px floor (`text-2xs`). The single
//     sanctioned exception is `text-badge` (8.8px), a glyph inside a
//     fixed-size count dot.
//  2. Dark-era colours on light surfaces. The admin CMS was built dark and
//     converted to light; `text-white` / `hover:text-white` left on a
//     `bg-ds-card`/`bg-ds-card2` surface (#FFFFFF / #F3FAF6) renders white on
//     white — invisible, not merely low contrast.
//
// These assert the source, not the rendered pixels: a lint-shaped guard that
// fails the moment either floor is breached again.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
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

/** Comments mention the classes they removed; only real code is scanned. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/**
 * Class strings as the compiler sees them: one quoted literal at a time, so the
 * two arms of `cond ? 'bg-emerald-500 text-white' : 'bg-ds-card2 …'` are never
 * mistaken for one element's classes.
 */
const classChunks = (line: string) => line.split(/['"`{}]/);

/** Arbitrary pixel/rem font sizes below the 11px floor. */
const SUB_FLOOR = /text-\[(?:([0-9.]+)px|([0-9.]+)rem)\]/g;

// A light ds surface and a white text colour, both unprefixed: `dark:` variants
// of either are the dark theme, where white on #242836 is correct.
const LIGHT_SURFACE = /(?<!dark:)\bbg-ds-card2?\b/;
const WHITE_TEXT = /(?<!dark:)(?:hover:)?text-white\b/;

describe('admin typography floor', () => {
  it('has no font size below 11px outside the text-badge exception', () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8');
      for (const m of stripComments(src).matchAll(SUB_FLOOR)) {
        const px = m[1] ? parseFloat(m[1]) : parseFloat(m[2]) * 16;
        if (px < 11) offenders.push(`${f.replace(ADMIN_DIR, 'components/admin')}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('admin light-surface legibility', () => {
  it('never puts white text on a light ds surface', () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8');
      stripComments(src).split('\n').forEach((line, i) => {
        for (const chunk of classChunks(line)) {
          if (!WHITE_TEXT.test(chunk) || !LIGHT_SURFACE.test(chunk)) continue;
          // A coloured fill on hover legitimately carries white text; only an
          // unchanged light surface is a defect.
          if (/hover:bg-(?:emerald|rose-5|ds-green|blue|amber|teal|indigo|violet|purple|lime)/.test(chunk)) continue;
          offenders.push(`${f.replace(ADMIN_DIR, 'components/admin')}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('admin shared primitives have consumers', () => {
  it('routes every workspace KPI card through adminUI.AdminKpiCard', () => {
    const wrapper = readFileSync(join(ADMIN_DIR, 'workspaces/shared/KpiCard.tsx'), 'utf8');
    expect(wrapper).toMatch(/AdminKpiCard/);
    // The wrapper adapts; it must not re-implement the card.
    expect(wrapper).not.toMatch(/rounded-3xl border border-ds-border bg-ds-card/);
  });
});
