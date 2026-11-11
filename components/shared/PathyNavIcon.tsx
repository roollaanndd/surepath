import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons } from '../../services/portalIcons';
import SurePathPremiumIcon from './SurePathPremiumIcon';
import SurePathBrandIcon, { hasBrandArt } from './SurePathBrandIcon';

type Props = { id: string; size?: number; active?: boolean; className?: string };

/**
 * SurePath's bespoke illustrated icon language, rebuilt v2.7.28 as one
 * unified visual system app-wide, and re-art-directed v2.8.11 as the
 * "Aureate Emerald" premium set: roland's custom "Brand" artwork renders
 * wherever a bespoke illustration exists for the id, and every other id
 * falls back to SurePathPremiumIcon (deep-emerald plates, precision white
 * glyphs, champagne-gold accents — no cartoon faces) — never a per-icon
 * style picker, never a mismatched placeholder. Uploaded custom art (Icon
 * Manager) always overrides both.
 */
export const PathyNavIcon: React.FC<Props> = ({ id, size = 30, active = false, className = '' }) => {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const unsubscribeIcons = subscribePortalIcons(setImageMap);
    getPortalIconMap().catch(() => {});
    return () => { unsubscribeIcons(); };
  }, []);
  const imageUrl = imageMap[id];
  if (imageUrl) return <img src={imageUrl} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={className} style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }} />;
  if (hasBrandArt(id)) return <SurePathBrandIcon id={id} size={size} className={className} />;
  return <SurePathPremiumIcon id={id} size={size} active={active} className={className} />;
};

export default PathyNavIcon;
