import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons, subscribePortalIconStyles, type PortalIconStyleMap } from '../../services/portalIcons';
import SurePathIcon from './SurePathIcon';
import SurePathIllustrationIcon from './SurePathIllustrationIcon';

/** Strings that match a SurePathIcon artwork branch. Keep in sync with the
 *  regex chain in SurePathIcon.tsx. */
export type SurePathGlyph =
  | 'pathy' | 'bank' | 'library' | 'trophy' | 'network' | 'renewal' | 'withdraw'
  | 'payment' | 'home' | 'car' | 'travel' | 'health' | 'shield' | 'wallet'
  | 'quote' | 'document' | 'people' | 'gear' | 'bell' | 'analytics' | 'box';

type Props = {
  id: string;
  /** Glyph to draw when no admin-uploaded icon exists. The regex in
   *  SurePathIcon maps by substring, so the same id means different things in
   *  different portals: `quotes` is "create" in the Agent nav but "offers
   *  received" in B2B, and `new`/`submissions`/`quotes` all matched one glyph,
   *  leaving three B2B tabs identical. The portal knows what it means; the id
   *  cannot, and it has to stay as it is because uploads key off it.
   *
   *  These are matched against that regex, not looked up as keys — passing an
   *  internal key name such as 'money' silently falls through to the default
   *  sparkle, so the union below lists only strings that actually hit the
   *  branch they name. */
  glyph?: SurePathGlyph;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
  imageClassName?: string;
};

export default function ManagedPortalIcon({ id, glyph, size = 24, fallback, className = '', imageClassName = '' }: Props) {
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<PortalIconStyleMap>({});
  useEffect(() => {
    const unsubscribeIcons = subscribePortalIcons(setIcons);
    const unsubscribeStyles = subscribePortalIconStyles(setStyles);
    getPortalIconMap().catch(() => {});
    return () => { unsubscribeIcons(); unsubscribeStyles(); };
  }, []);
  const src = icons[id];
  if (src) return <img src={src} alt="" aria-hidden="true" draggable={false} width={size} height={size} className={imageClassName || className} style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }} />;
  if (!id && fallback) return <>{fallback}</>;
  return <span className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {styles[id] === 'illustrative' ? <SurePathIllustrationIcon id={glyph ?? id} size={size} className={imageClassName} /> : <SurePathIcon id={glyph ?? id} size={size} style={styles[id] || 'studio'} className={imageClassName} />}
  </span>;
}
