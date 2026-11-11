// Design-system guard for the "Aureate Emerald" premium icon set (v2.8.11).
//
// Owner brief: global icons must be premium illustrative SVG, custom — no AI
// slop. This test pins what that means in practice, so a future edit cannot
// quietly regress the system:
//  1. every art key renders a real SVG (no blank fallback for the 22 keys);
//  2. SVG gradient ids are unique per instance — the same icon renders
//     dozens of times per screen and duplicated ids are invalid HTML that
//     makes browsers resolve url() against the wrong def;
//  3. palette discipline: the set's only accent colors are the system tokens
//     (glyph near-white, mint, champagne gold) — the retired playful set's
//     colors (and any cartoon-face leftovers) must never reappear;
//  4. all three consumers (PathyNavIcon, ManagedPortalIcon, PortalIconManager)
//     route their fallback through the premium set, so one art direction
//     covers the whole app;
//  5. RoleScene renders one scene per role on the same gradient language.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SurePathPremiumIcon, { RoleScene, resolveArtKey } from '../../components/shared/SurePathPremiumIcon';

const ART_KEYS = [
  'protection', 'home', 'wallet', 'car', 'document', 'payment', 'bell', 'people',
  'travel', 'health', 'settings', 'help', 'bank', 'library', 'review', 'tier',
  'palette', 'network', 'renewal', 'chart', 'box', 'spark',
];

/** ids whose nav/upload names must resolve to each art key (spot checks per
 *  family, including the ManagedPortalIcon glyph keys). */
const ROUTING: Array<[string, string]> = [
  ['claims', 'protection'], ['shield', 'protection'], ['item_shield', 'protection'],
  ['dashboard', 'home'], ['commission_ledger', 'wallet'], ['withdraw', 'wallet'],
  ['vehicle_pricelist', 'car'], ['quotes', 'document'], ['pathy_logs', 'document'],
  ['payments', 'payment'], ['notifications', 'bell'], ['profile', 'people'],
  ['travel_safe', 'travel'], ['family_health', 'health'], ['settings', 'settings'],
  ['insurers', 'bank'], ['inventory', 'document'], ['approvals', 'review'],
  ['tier_promo', 'tier'], ['portal_icons', 'palette'], ['agents', 'network'],
  ['renewal', 'renewal'], ['analytics', 'chart'], ['ops_console', 'chart'],
  // 'product_config' contains 'config' → settings on the raw-id chain (legacy
  // behaviour, identical to the retired set); ManagedPortalIcon overrides it
  // with the explicit glyph 'box', which self-resolves below.
  ['product_config', 'settings'], ['b2b', 'bank'], ['pathy', 'help'],
];

/** The ONLY fills/strokes the premium set may use (plus the two gradient
 *  stops and the fixed rgba overlays — asserted separately). */
const ALLOWED_HEX = ['#11604D', '#07362C', '#F2FBF5', '#A9EBD1', '#EFC978'];
const BANNED_HEX = [
  '#BDEFD7', '#F0FBF4', '#C7EE57', '#28A96B', // retired playful-set palette
  '#FFD1DC', '#FFB6C1', '#87CEEB',            // cartoon-slop pastels
];

const hexes = (markup: string) => markup.toLowerCase().match(/#[0-9a-f]{6}/g) ?? [];

describe('premium icon set — Aureate Emerald system', () => {
  for (const key of ART_KEYS) {
    it(`${key} renders a real SVG with the plate`, () => {
      const markup = renderToStaticMarkup(React.createElement(SurePathPremiumIcon, { id: key, size: 48 }));
      expect(markup).toContain('<svg');
      expect(markup).toContain('viewBox="0 0 48 48"');
      expect(markup).toContain('rx="13"');           // shared plate geometry
      expect(markup.length).toBeGreaterThan(600);    // not a blank shell
    });
  }

  it('every art key stays inside the system palette', () => {
    const allowed = ALLOWED_HEX.map(h => h.toLowerCase());
    for (const key of ART_KEYS) {
      const used = hexes(renderToStaticMarkup(React.createElement(SurePathPremiumIcon, { id: key })));
      for (const hex of used) {
        expect(allowed, `${key} uses off-system hex ${hex}`).toContain(hex);
      }
      for (const hex of BANNED_HEX) {
        expect(used, `${key} regressed to slop hex ${hex}`).not.toContain(hex);
      }
    }
  });

  it('renders duplicates of one icon without colliding gradient ids', () => {
    const markup = renderToStaticMarkup(
      React.createElement(React.Fragment, null,
        React.createElement(SurePathPremiumIcon, { id: 'wallet' }),
        React.createElement(SurePathPremiumIcon, { id: 'wallet' }),
        React.createElement(SurePathPremiumIcon, { id: 'wallet' }),
      ),
    );
    const ids = markup.match(/id="[^"]+"/g) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id → art routing still matches every documented meaning', () => {
    for (const [id, key] of ROUTING) {
      expect(resolveArtKey(id), `${id} should resolve to ${key}`).toBe(key);
    }
    // Every art key must resolve to itself (callers may pass keys directly —
    // ManagedPortalIcon's glyph values are keys, not upload ids).
    for (const key of ART_KEYS) {
      expect(resolveArtKey(key), `art key ${key} must self-resolve`).toBe(key);
    }
  });

  it('active state renders the gold indicator dot', () => {
    const off = renderToStaticMarkup(React.createElement(SurePathPremiumIcon, { id: 'home' }));
    const on = renderToStaticMarkup(React.createElement(SurePathPremiumIcon, { id: 'home', active: true }));
    expect(on).toContain('#EFC978');
    expect(on.length).toBeGreaterThan(off.length);
  });

  it('all three consumers route fallbacks through the premium set', () => {
    for (const rel of [
      'components/shared/PathyNavIcon.tsx',
      'components/shared/ManagedPortalIcon.tsx',
      'components/admin/PortalIconManager.tsx',
    ]) {
      const src = readFileSync(join(__dirname, '..', '..', rel), 'utf8');
      expect(src, `${rel} must import SurePathPremiumIcon`).toContain('SurePathPremiumIcon');
      expect(src, `${rel} must not resurrect the retired playful set`).not.toContain('SurePathIllustrationIcon');
    }
  });
});

describe('RoleScene — role selection artwork', () => {
  for (const role of ['CUSTOMER', 'AGENT', 'B2B_CLIENT'] as const) {
    it(`${role} renders a 64-canvas scene on the brand gradient`, () => {
      const markup = renderToStaticMarkup(React.createElement(RoleScene, { role, size: 56 }));
      expect(markup).toContain('viewBox="0 0 64 64"');
      expect(markup).toContain('rx="18"');
      const allowed = ALLOWED_HEX.map(h => h.toLowerCase());
      for (const hex of hexes(markup)) {
        expect(allowed, `${role} scene uses off-system hex ${hex}`).toContain(hex);
      }
    });
  }

  it('role scenes are visually distinct from each other', () => {
    const strip = (s: string) => s.replace(/id="[^"]+"/g, '').replace(/url\(#[^)]+\)/g, '');
    const a = strip(renderToStaticMarkup(React.createElement(RoleScene, { role: 'CUSTOMER' })));
    const b = strip(renderToStaticMarkup(React.createElement(RoleScene, { role: 'AGENT' })));
    const c = strip(renderToStaticMarkup(React.createElement(RoleScene, { role: 'B2B_CLIENT' })));
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});
