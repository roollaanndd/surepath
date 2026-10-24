import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons, subscribePortalIconStyles, type PortalIconStyleMap } from '../../services/portalIcons';
import SurePathIcon from './SurePathIcon';
import SurePathIllustrationIcon from './SurePathIllustrationIcon';

/** Canonical artwork keys understood by the SurePath SVG icon library. */
export type SurePathGlyph =
  | 'pathy' | 'bank' | 'library' | 'trophy' | 'network' | 'renewal' | 'withdraw'
  | 'payment' | 'home' | 'car' | 'travel' | 'health' | 'shield' | 'wallet'
  | 'quote' | 'document' | 'people' | 'gear' | 'bell' | 'analytics' | 'box';

/**
 * Explicit ID -> artwork mapping. Upload keys remain the original IDs, while
 * fallback art is selected by meaning instead of substring guessing. This
 * avoids unrelated portal tabs silently sharing the wrong icon.
 */
const GLYPH_BY_ID: Record<string, SurePathGlyph> = {
  home: 'home', dashboard: 'home', policy: 'document', quotes: 'quote',
  profile: 'people', notifications: 'bell', clients: 'people', users: 'people',
  agents: 'network', insurers: 'bank', b2b: 'network', user_mgmt: 'people',
  claims: 'shield', claims_admin: 'shield', approvals: 'shield', payments: 'payment',
  withdraw: 'withdraw', withdrawals: 'withdraw', transactions: 'payment',
  activity_log: 'analytics', commission: 'wallet', commission_ledger: 'wallet',
  financial: 'wallet', analytics: 'analytics', reports: 'document', inventory: 'library',
  documents: 'document', product_config: 'box', policy_orders: 'document',
  endorsements: 'document', vehicle_pricelist: 'car', ojk_rates: 'analytics',
  website_editor: 'library', tier_promo: 'trophy', pathy: 'pathy', ai_admin: 'pathy',
  ai_finance: 'pathy', pathy_logs: 'document', ops_console: 'analytics',
  security: 'shield', settings: 'gear', system: 'gear', product: 'box',
  car_protection: 'car', travel_safe: 'travel', personal_safety: 'shield',
  item_shield: 'shield', family_health: 'health',
};

type Props = {
  id: string;
  /** Optional per-screen override when the same upload key has different meaning. */
  glyph?: SurePathGlyph;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
  imageClassName?: string;
};

export default function ManagedPortalIcon({ id, glyph, size = 24, fallback, className = '', imageClassName = '' }: Props) {
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<PortalIconStyleMap>({});
  const [failedSrc, setFailedSrc] = useState('');
  useEffect(() => {
    const unsubscribeIcons = subscribePortalIcons(setIcons);
    const unsubscribeStyles = subscribePortalIconStyles(setStyles);
    getPortalIconMap().catch(() => {});
    return () => { unsubscribeIcons(); unsubscribeStyles(); };
  }, []);
  const src = icons[id];
  useEffect(() => { setFailedSrc(''); }, [src]);
  // A stale/deleted storage URL must never leave a blank icon in navigation.
  if (src && failedSrc !== src) {
    return <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      onError={() => setFailedSrc(src)}
      className={imageClassName || className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />;
  }
  if (!id && fallback) return <>{fallback}</>;
  const artworkId = glyph ?? GLYPH_BY_ID[id] ?? id;
  return <span className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {styles[id] === 'illustrative'
      ? <SurePathIllustrationIcon id={artworkId} size={size} className={imageClassName} />
      : <SurePathIcon id={artworkId} size={size} style={styles[id] || 'studio'} className={imageClassName} />}
  </span>;
}
