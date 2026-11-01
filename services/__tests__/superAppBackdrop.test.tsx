// Regression cover for the illustrated greeting band on Beranda Mitra
// (v2.7.40).
//
// The band it replaced was coloured by the partner's tier, and the default
// STANDARD tier was charcoal #46505F→#23272E — the "black, far too plain"
// block the owner asked to be taken out. Its replacement carries a drawn
// scene, and these tests keep three properties from quietly coming back:
// the artwork stays inside the bundle, the four times of day really do look
// different, and the tier palette no longer hands STANDARD a grey.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import SuperAppBackdrop, { dayPartOf, type DayPart } from '../../components/shared/superapp/SuperAppBackdrop';
import { resolveTierPalette } from '../../components/agent/AgentPartnerCard';

const ROOT = join(__dirname, '..', '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');
/** Komentar dibuang dulu: catatan sejarahnya memang menyebut warna lama. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PARTS: DayPart[] = ['pagi', 'siang', 'sore', 'malam'];

describe('SuperAppBackdrop', () => {
  it('keeps the greeting-band artwork inside the bundle', () => {
    // Same rule the onboarding tour got in v2.7.38: a partner's first screen
    // must not fetch an image from someone else's host, because that fails
    // inside the Android APK and behind the production CSP.
    const code = stripComments(read('components', 'shared', 'superapp', 'SuperAppBackdrop.tsx'));
    expect(code).not.toMatch(/https?:\/\//);
    expect(code).not.toMatch(/<img\b/);
    // `url(#…)` points at a gradient defined a few lines up, which is fine;
    // anything else inside url() would be fetched.
    expect(code).not.toMatch(/url\((?!#)/);
  });

  it('maps the hours of the day onto the four scenes', () => {
    expect(dayPartOf(6)).toBe('pagi');
    expect(dayPartOf(10)).toBe('pagi');
    expect(dayPartOf(11)).toBe('siang');
    expect(dayPartOf(14)).toBe('siang');
    expect(dayPartOf(15)).toBe('sore');
    expect(dayPartOf(18)).toBe('sore');
    expect(dayPartOf(19)).toBe('malam');
    expect(dayPartOf(23)).toBe('malam');
    expect(dayPartOf(0)).toBe('pagi');
  });

  it('draws a visibly different scene for each part of the day', () => {
    // Four variants that render identical markup would be a variation only
    // on paper, so compare the rendered SVG rather than the config object.
    const drawn = PARTS.map(part => {
      const { container, unmount } = render(<SuperAppBackdrop part={part} />);
      const html = container.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(drawn).size).toBe(PARTS.length);
  });

  it('shows stars only at night', () => {
    const starCount = (part: DayPart) => {
      const { container, unmount } = render(<SuperAppBackdrop part={part} />);
      const n = container.querySelectorAll('circle[opacity="0.45"]').length;
      unmount();
      return n;
    };
    expect(starCount('malam')).toBeGreaterThan(0);
    for (const part of ['pagi', 'siang', 'sore'] as DayPart[]) {
      expect(starCount(part)).toBe(0);
    }
  });

  it('hides the decoration from assistive technology', () => {
    const { container } = render(<SuperAppBackdrop part="pagi" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('tier palette', () => {
  it('gives the default tier the corporate green, not charcoal', () => {
    const standard = resolveTierPalette(null);
    expect(standard.key).toBe('STANDARD');
    // The exact charcoal stops that produced the complaint.
    expect(standard.card).not.toContain('#10131A');
    expect(standard.card).not.toContain('#3A4150');
    expect(standard.card).toContain('#076653');
  });

  it('leaves the metal tiers their metal', () => {
    // Grey here is the tier, not a styling accident, so the corporate-green
    // change must not have leaked across the palettes.
    const silver = resolveTierPalette({ code: 'SILVER', name: 'Silver' } as never);
    expect(silver.key).toBe('SILVER');
    expect(silver.card).toContain('#566475');
  });

  it('no longer carries the dead hero-band gradient', () => {
    // `band` coloured the Beranda hero that v2.7.39 removed; nothing reads it.
    const code = stripComments(read('components', 'agent', 'AgentPartnerCard.tsx'));
    expect(code).not.toMatch(/\bband:/);
  });
});
