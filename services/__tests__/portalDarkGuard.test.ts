// Regression guard for the shared portal CSS surface in
// `src/styles/portal-modernization.css`.
//
// The v2.7.47 admin-a CSS surgery accidentally deleted whole rule families
// that live outside the admin scope: the shared dark-mode correction block
// (`.dark .sp-modern-app …`), the agent dark twins (`.dark .sp-agent-premium
// …`), the operator premium skin, and the shared ambient canvas. Class-level
// audits missed them because the losses were rule-level (combined selectors,
// dark variants). This guard locks the families back in at the source level so
// the next surgery cannot drop them silently.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src/styles/portal-modernization.css'), 'utf8');

describe('portal-modernization.css keeps its cross-portal rule families', () => {
  it('keeps the shared dark-mode correction block (all sp-modern-app portals)', () => {
    // The block corrects over-white surfaces in dark mode for every portal
    // sharing the shell class — customer, agent, operator, insurer, B2B.
    expect(css).toContain('.dark .sp-modern-app {');
    expect(css).toContain('.dark .sp-modern-app :where(.bg-ds-bg)');
    expect(css).toContain('.dark .sp-modern-app :where(.bg-ds-card)');
    expect(css).toContain('.dark .sp-modern-app :where(.bg-ds-card2)');
    expect(css).toContain('.dark .sp-modern-app :where(input:not([type="checkbox"])');
    expect(css).toContain('.dark .sp-modern-app :where(table thead)');
  });

  it('keeps the agent dark twins (dark canvas + glass + quick actions)', () => {
    expect(css).toContain('.dark .sp-agent-premium {');
    expect(css).toContain('.dark .sp-agent-premium .sp-glass-strong');
    expect(css).toContain('.dark .sp-agent-premium .sp-agent-home__quick-actions');
  });

  it('keeps the operator premium skin (light + dark twins + mobile media)', () => {
    const count = (css.match(/\.sp-operator-premium/g) || []).length;
    expect(count, 'operator skin rules were dropped again').toBeGreaterThanOrEqual(30);
    expect(css).toContain('.sp-operator-premium .sp-operator-hero');
    expect(css).toContain('.sp-operator-premium .sp-operator-queue-card');
    expect(css).toContain('.dark .sp-operator-premium .sp-operator-hero');
    expect(css).toContain('@media (max-width: 420px)');
  });

  it('keeps the shared ambient canvas for agent + operator roots', () => {
    expect(css).toContain('.sp-modern-app.sp-agent-premium,');
    expect(css).toContain('.sp-modern-app.sp-operator-premium');
    expect(css).toContain('background-attachment: fixed');
  });
});
