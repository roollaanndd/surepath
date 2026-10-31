import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons } from '../../services/portalIcons';
import SurePathIllustrationIcon from './SurePathIllustrationIcon';
import SurePathBrandIcon, { hasBrandArt } from './SurePathBrandIcon';

type Props = { id: string; size?: number; active?: boolean; className?: string };

/**
 * SurePath's bespoke illustrated icon language, rebuilt v2.7.28 as one
 * unified visual system app-wide: roland's custom "Brand" artwork renders
 * wherever a bespoke illustration exists for the id, and every other id
 * falls back to the illustrative cartoon set — never a per-icon style
 * picker, never a mismatched placeholder. Uploaded custom art (Icon
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
  return <SurePathIllustrationIcon id={id} size={size} active={active} className={className} />;
};

export default PathyNavIcon;
