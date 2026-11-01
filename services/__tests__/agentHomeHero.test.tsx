// Regression cover for the Beranda Mitra hero band (v2.7.39).
//
// The band used to be a bare two-stop gradient, graphite on the default tier,
// so most partners opened the app on a flat black slab. It now carries the
// brand plus an illustrated backdrop. The trap found while building it: the
// first green chosen (#0E8F5B) looked right but put plain white small text at
// 4.1:1 — LESS readable than the graphite it replaced. These tests keep both
// the look and that arithmetic from regressing.
import { describe, it, expect } from 'vitest';
import { resolveTierPalette } from '../../components/agent/AgentPartnerCard';

/** WCAG relative luminance of an #rrggbb colour. */
const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  const ch = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = ch.map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

/** Contrast of opaque white against a background colour. */
const whiteOn = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

/** Contrast of white at `alpha` over `hex`, against that same background. */
const fadedWhiteOn = (hex: string, alpha: number): number => {
  const h = hex.replace('#', '');
  const mixed = [0, 2, 4]
    .map(i => Math.round(alpha * 255 + (1 - alpha) * parseInt(h.slice(i, i + 2), 16)))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
  const a = luminance(mixed) + 0.05;
  const b = luminance(hex) + 0.05;
  return a > b ? a / b : b / a;
};

const stopsOf = (gradient: string): string[] => gradient.match(/#[0-9a-fA-F]{6}/g) ?? [];

/** The lightest stop is the worst case for white text sitting on the band. */
const lightestStop = (gradient: string): string =>
  stopsOf(gradient).reduce((a, b) => (luminance(a) >= luminance(b) ? a : b));

describe('Beranda Mitra hero band', () => {
  const standard = resolveTierPalette(null);

  it('gives the default tier the brand band, not the old graphite slab', () => {
    expect(standard.key).toBe('STANDARD');
    // The graphite pair that prompted the complaint must not come back.
    expect(standard.band).not.toContain('#46505F');
    expect(standard.band).not.toContain('#23272E');
    // Green channel clearly dominant on every stop = brand, not neutral grey.
    stopsOf(standard.band).forEach(stop => {
      const h = stop.replace('#', '');
      const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
      expect(g).toBeGreaterThan(r + 20);
      expect(g).toBeGreaterThan(b + 10);
    });
  });

  it('keeps plain white small text on the band at AA', () => {
    expect(whiteOn(lightestStop(standard.band))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the reduced-opacity greeting and agent code at AA', () => {
    // AgentHome renders these two lines at opacity-90 on the lightest stop.
    // This is the assertion that would have caught the 4.1:1 near-miss.
    const worst = lightestStop(standard.band);
    expect(fadedWhiteOn(worst, 0.9)).toBeGreaterThanOrEqual(4.5);
  });

  it('holds every other tier band to the same readability bar', () => {
    // Gold, Silver, Platinum, Diamond and Bronze keep their own identity
    // colours, but a partner who earns a tier must not lose legibility for it.
    (['GOLD', 'SILVER', 'PLATINUM', 'DIAMOND', 'BRONZE'] as const).forEach(code => {
      const palette = resolveTierPalette({ code, name: code, is_default: false } as never);
      expect(whiteOn(lightestStop(palette.band))).toBeGreaterThanOrEqual(4.5);
    });
  });
});
