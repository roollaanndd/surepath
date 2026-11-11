// Brightness guard for the SurePath brand artwork set.
//
// The app uses two artwork families for module icons: the premium fallback
// set (SurePathPremiumIcon, v2.8.11 — white/mint/gold glyphs on deep-emerald
// gradient plates) and the bespoke brand set (SurePathBrandIcon). The brand
// set once shipped near-black bodies (#06231D/#0C342C/#076653); on any
// dashboard that mixes the two families, some icons render dark and others
// bright — owner directive v2.7.44: dark module icon bodies must read bright,
// matching the fallback set's light glyphs.
//
// This guard:
//  1. renders every brand artwork and asserts no banned dark hex remains
//     (except SpShieldBrandIcon, the brand shield logo logotype, which is
//     intentionally dark and is not a module icon);
//  2. asserts every recolored artwork still carries at least one bright
//     palette fill so nothing went flat-blank;
//  3. asserts a single routing source-of-truth: ManagedPortalIcon,
//     PathyNavIcon and PortalIconManager all route brand ids through
//     SurePathBrandIcon, so one recolor loads syncs to every dashboard.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SpCarProtectionIcon,
  SpMotoProtectionIcon,
  SpTravelSafeIcon,
  SpPersonalSafetyIcon,
  SpItemShieldIcon,
  SpFamilyHealthIcon,
  SpStnkOcrIcon,
  SpAiVehicleAuditIcon,
  SpInstantQuoteIcon,
  SpFastClaimIcon,
  SpWalletCommissionIcon,
  SpVerifiedSecurityIcon,
  SpClimateShieldIcon,
  SpPortalAdminIcon,
  SpPortalAgentIcon,
  SpPortalCustomerIcon,
  SpPortalOperatorIcon,
  SpPortalInsurerIcon,
  SpPortalB2bIcon,
} from '../../components/shared/SurePathBrandIcon';

const ROOT = join(__dirname, '..', '..');

/** Near-black body fills that must not survive in bright artwork. */
const BANNED = ['#06231D', '#0C342C', '#076653'];
/** Illustration-set palette an artwork must contain to read as bright. */
const BRIGHT = ['#BDEFD7', '#F0FBF4', '#C7EE57', '#28A96B', '#E2FBCE', '#FFFDEE'];

const ARTWORKS: Record<string, React.FC<{ size?: number }>> = {
  car_protection: SpCarProtectionIcon,
  moto_protection: SpMotoProtectionIcon,
  travel_safe: SpTravelSafeIcon,
  personal_safety: SpPersonalSafetyIcon,
  item_shield: SpItemShieldIcon,
  family_health: SpFamilyHealthIcon,
  stnk_ocr: SpStnkOcrIcon,
  vehicle_audit: SpAiVehicleAuditIcon,
  instant_quote: SpInstantQuoteIcon,
  fast_claim: SpFastClaimIcon,
  wallet_commission: SpWalletCommissionIcon,
  verified_security: SpVerifiedSecurityIcon,
  climate_shield: SpClimateShieldIcon,
  portal_admin: SpPortalAdminIcon,
  portal_agent: SpPortalAgentIcon,
  portal_customer: SpPortalCustomerIcon,
  portal_operator: SpPortalOperatorIcon,
  portal_insurer: SpPortalInsurerIcon,
  portal_b2b: SpPortalB2bIcon,
};

describe('brand artwork brightness', () => {
  for (const [name, Icon] of Object.entries(ARTWORKS)) {
    it(`${name} renders without near-black bodies`, () => {
      const markup = renderToStaticMarkup(React.createElement(Icon, { size: 64 }));
      for (const hex of BANNED) {
        expect(markup.toLowerCase()).not.toContain(hex.toLowerCase());
      }
    });

    it(`${name} keeps a bright body from the illustration palette`, () => {
      const markup = renderToStaticMarkup(React.createElement(Icon, { size: 64 }));
      const lower = markup.toLowerCase();
      const hasBright = BRIGHT.some(hex => lower.includes(hex.toLowerCase()));
      expect(hasBright, `${name} lost every bright fill`).toBe(true);
    });
  }
});

describe('brand icon routing is a single source synced to every dashboard', () => {
  it('ManagedPortalIcon and the bottom nav route brand ids through SurePathBrandIcon', () => {
    for (const rel of [
      'components/shared/ManagedPortalIcon.tsx',
      'components/shared/PathyNavIcon.tsx',
      'components/admin/PortalIconManager.tsx',
    ]) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src, `${rel} must use SurePathBrandIcon`).toContain('SurePathBrandIcon');
      expect(src, `${rel} must gate brand art with hasBrandArt`).toContain('hasBrandArt');
    }
  });

  it('the brand artwork map names every id dashboards reference', () => {
    const src = readFileSync(join(ROOT, 'components/shared/SurePathBrandIcon.tsx'), 'utf8');
    for (const id of ['car_protection', 'travel_safe', 'personal_safety', 'item_shield',
      'family_health', 'quotes', 'claims', 'commission', 'withdraw', 'security',
      'documents', 'vehicle_pricelist']) {
      expect(src, `${id} must map to dedicated brand artwork`).toContain(id);
    }
  });
});
