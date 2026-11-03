// Brightness guard for the SurePath empty-state illustration set.
//
// `SpEmptyState` artwork shipped large near-black/teal bodies
// (#06231D / #0C342C / #076653) — the wrong-brightness family that sits beside
// the bright illustration set. Owner directive (v2.7.46 follow-up of the icon
// brightness fix): empty-state artwork must read bright too.
//
// Rules locked here:
//  1. No solid dark fill (#06231D / #0C342C / #076653) may remain as a body —
//     the ONLY allowed `fill="#06231D"` is the low-opacity ground shadow
//     (fillOpacity="0.08").
//  2. Ink outlines (`stroke="#06231D"`) and decorative accents stay legal —
//     they are the illustration language, not dark bodies.
//  3. Every illustration keeps at least one bright illustration-palette fill.
//  4. The variant map stays the single routing source (12 keys) and the
//     wrapper component chrome (CTA color, ink text, dark-mode card) is
//     intentionally NOT part of this guard — UI colors are not artwork.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SpEmptyPoliciesIllustration,
  SpEmptyClaimsIllustration,
  SpEmptyQuotationsIllustration,
  SpEmptyWalletIllustration,
  SpEmptyClientsIllustration,
  SpEmptyOperatorQueueIllustration,
  SpEmptyNotificationsIllustration,
  SpEmptySearchIllustration,
  SpEmptyDocumentsIllustration,
  SpEmptyRewardsIllustration,
  SpSuccessVerifiedIllustration,
  SpOfflineConnectionIllustration,
  ILLUSTRATION_MAP,
} from '../../components/shared/SpEmptyState';

const ROOT = join(__dirname, '..', '..');
const FILE = 'components/shared/SpEmptyState.tsx';

/** Near-black body fills that must not survive in bright empty-state art. */
const BANNED_SOLIDS = [/fill="#0C342C"/, /fill="#076653"/];

const ARTWORKS: Record<string, React.FC<{ size?: number }>> = {
  policies: SpEmptyPoliciesIllustration,
  claims: SpEmptyClaimsIllustration,
  quotations: SpEmptyQuotationsIllustration,
  wallet: SpEmptyWalletIllustration,
  clients: SpEmptyClientsIllustration,
  operator_queue: SpEmptyOperatorQueueIllustration,
  notifications: SpEmptyNotificationsIllustration,
  search: SpEmptySearchIllustration,
  documents: SpEmptyDocumentsIllustration,
  rewards: SpEmptyRewardsIllustration,
  success: SpSuccessVerifiedIllustration,
  offline: SpOfflineConnectionIllustration,
};

describe('empty-state artwork brightness', () => {
  const src = readFileSync(join(ROOT, FILE), 'utf8');
  const sourceLines = src.split('\n');

  it('the source has no solid dark fills at all (shadow ink excepted)', () => {
    for (const banned of BANNED_SOLIDS) {
      expect(banned.test(src), `banned dark fill found in ${FILE}`).toBe(false);
    }
    const badShadowLines = sourceLines.filter(
      (line) => line.includes('fill="#06231D"') && !line.includes('fillOpacity="0.08"')
    );
    expect(
      badShadowLines,
      `only ground shadows (fillOpacity 0.08) may keep #06231D\n${badShadowLines.join('\n')}`
    ).toEqual([]);
  });

  for (const [name, Art] of Object.entries(ARTWORKS)) {
    it(`${name} renders without solid near-black/teal bodies`, () => {
      const markup = renderToStaticMarkup(React.createElement(Art, { size: 160 }));
      expect(markup).not.toContain('fill="#0C342C"');
      expect(markup).not.toContain('fill="#076653"');
      const darkBodies = markup
        .split('<')
        .filter((el) => el.includes('fill="#06231D"') && !el.includes('fill-opacity="0.08"'));
      expect(darkBodies, `${name} still has a dark body fill`).toEqual([]);
    });

    it(`${name} keeps a bright body from the illustration palette`, () => {
      const markup = renderToStaticMarkup(React.createElement(Art, { size: 160 }));

      const bright = ['#BDEFD7', '#F0FBF4', '#C7EE57', '#28A96B', '#0B8F78', '#075E55', '#E2FBCE', '#FFFDEE', '#E3EF26'];
      const hasBright = bright.some((hex) => markup.includes(hex));
      expect(hasBright, `${name} lost every bright fill`).toBe(true);
    });
  }
});

describe('empty-state routing stays a single map', () => {
  it('ILLUSTRATION_MAP holds all 12 variants', () => {
    for (const key of [
      'policies', 'claims', 'quotations', 'wallet', 'clients', 'operator-queue',
      'notifications', 'search', 'documents', 'rewards', 'success', 'offline',
    ]) {
      expect(ILLUSTRATION_MAP[key as keyof typeof ILLUSTRATION_MAP]).toBeDefined();
    }
  });

  it('the wrapper still renders through the map (chrome untouched)', () => {
    const src = readFileSync(join(ROOT, FILE), 'utf8');
    expect(src).toContain('ILLUSTRATION_MAP[variant]');
    // UI chrome is intentionally out of scope for the brightness guard.
    expect(src).toContain('text-[#06231D]');
    expect(src).toContain('bg-[#076653]');
  });

  it('dashboards route empty states through one door: adminUI imports SpEmptyState', () => {
    const adminUI = readFileSync(join(ROOT, 'components/admin/adminUI.tsx'), 'utf8');
    expect(adminUI).toContain('SpEmptyState');
  });
});
