// Regression cover for the illustrated onboarding tour (v2.7.38).
//
// Before this change the AGENT / OPERATOR / INSURER tours hotlinked Unsplash
// photographs that sat on top of the vector scenes, so SurePath's own artwork
// never rendered and the first screen of the app depended on a third-party
// host. These tests keep both properties from coming back.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../supabaseService', () => ({
  fetchWebsiteSection: vi.fn(async () => null),
}));

import OnboardingFlow, { onboardingKey } from '../../components/OnboardingFlow';

const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'components', 'OnboardingFlow.tsx'),
  'utf8',
);

type Role = 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'INSURER';
const ROLES: Role[] = ['CUSTOMER', 'AGENT', 'OPERATOR', 'INSURER'];

beforeEach(() => localStorage.clear());

describe('OnboardingFlow illustrations', () => {
  it('keeps every onboarding asset inside the bundle', () => {
    // No remote host of any kind: the tour has to render inside the Android
    // APK, offline, and behind the production CSP. Strip comments first — the
    // note explaining what was removed names the old host on purpose.
    const code = SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/https?:\/\//);
    expect(code.toLowerCase()).not.toContain('unsplash');
  });

  it.each(ROLES)('draws SurePath vector art for %s, never a remote photo', role => {
    const { container, unmount } = render(
      <OnboardingFlow role={role} lang="ID" onComplete={vi.fn()} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    // The wordmark is the only <img>, and it is served from our own origin.
    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src') ?? '');
    expect(srcs).toEqual(['/logo-full.png']);
    unmount();
  });

  it('gives each slide of a role its own backdrop tone', () => {
    // Four partner slides over one repeated backdrop read as a stuck screen.
    const { container } = render(<OnboardingFlow role="AGENT" lang="ID" onComplete={vi.fn()} />);
    const sceneBg = () =>
      (container.querySelector('section[aria-label]') as HTMLElement).style.background;

    const first = sceneBg();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    const second = sceneBg();
    expect(first).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('still advances, and records completion only at the end', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow role="CUSTOMER" lang="ID" onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }));
    expect(localStorage.getItem(onboardingKey('CUSTOMER'))).toBeNull();
    expect(screen.getByRole('button', { name: /Mulai Sekarang/i })).toBeTruthy();
  });

  it('turns every animation off when the viewer prefers reduced motion', () => {
    // The guard is a CSS media block; assert it covers the transition classes
    // rather than only the legacy .ob-anim name.
    const reduced = SOURCE.slice(SOURCE.indexOf('prefers-reduced-motion'));
    ['ob-anim-scene-fwd', 'ob-anim-scene-back', 'ob-anim-copy-fwd', 'ob-anim-copy-back', 'ob-glow']
      .forEach(cls => expect(reduced).toContain(cls));
  });
});
