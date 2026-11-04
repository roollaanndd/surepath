// Guard for the agent app premium-motion pass and the Profile screen theme
// alignment (v2.7.48 owner directive: premium click/motion feel, Profile Saya
// aligned with the corporate-green super-app language, illustrated canvas).
//
// Locked here:
//  1. Press feedback: every interactive element inside the agent shell gets a
//     consistent active scale with a spring-back transition, and the whole
//     thing collapses under prefers-reduced-motion.
//  2. Profile hero: the corporate green band + SuperAppBackdrop scene — the
//     navy `#0B1120` gradient (the "hitam dan terlalu polos" pattern) may not
//     come back, and raw Tailwind palette chips (bg-amber-50 / bg-rose-50)
//     are replaced by ds tokens.
//  3. Illustrated canvas: the agent root carries a self-drawn SVG pattern
//     layer (the "jalan yang pasti" motif) in both light and dark variants.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src/styles/portal-modernization.css'), 'utf8');
const profile = readFileSync(join(ROOT, 'components/agent/AgentProfile.tsx'), 'utf8');

describe('agent premium motion', () => {
  it('gives every interactive element a consistent press scale', () => {
    expect(css).toMatch(/\.sp-agent-premium :where\(button, a, \[role="button"\]\):not\(:disabled\):active/);
    expect(css).toMatch(/\.sp-agent-premium :where\(button, a, \[role="button"\]\) \{[^}]*transition-property: transform/);
  });

  it('collapses press motion under prefers-reduced-motion', () => {
    const block = css.slice(css.indexOf('agent press feedback'), css.indexOf('agent press feedback') + 1200);
    expect(block).toContain('@media (prefers-reduced-motion: reduce)');
    expect(block).toMatch(/transform: none/);
  });
});

describe('agent profile aligns with the corporate band language', () => {
  it('hero uses SuperAppBackdrop, not the navy gradient', () => {
    expect(profile).toContain('SuperAppBackdrop');
    expect(profile).not.toContain('#0B1120');
  });

  it('status chips use ds tokens, not raw Tailwind palette', () => {
    expect(profile).not.toMatch(/bg-amber-50/);
    expect(profile).not.toMatch(/bg-rose-50/);
    expect(profile).not.toMatch(/border-rose-200/);
    expect(profile).toContain('bg-ds-amber-lt');
    expect(profile).toContain('bg-ds-red-lt');
  });

  it('profile grids carry the shared entrance stagger', () => {
    expect(profile).toContain('sp-stagger-cards');
  });
});

describe('agent illustrated canvas', () => {
  it('roots carry a self-drawn SVG pattern layer in light and dark', () => {
    expect(css).toMatch(/\.sp-modern-app\.sp-agent-premium \{[^}]*background-image:[^}]*data:image\/svg\+xml/s);
    expect(css).toMatch(/\.dark \.sp-agent-premium \{[^}]*data:image\/svg\+xml/s);
  });
});
