import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons, subscribePortalIconStyles, type PortalIconStyleMap } from '../../services/portalIcons';
import SurePathIcon from './SurePathIcon';
import SurePathIllustrationIcon from './SurePathIllustrationIcon';

type Props = { id: string; size?: number; active?: boolean; className?: string };

/** SurePath's bespoke illustrated icon language. Uploaded art overrides the built-in illustration. */
export const PathyNavIcon: React.FC<Props> = ({ id, size = 30, active = false, className = '' }) => {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<PortalIconStyleMap>({});
  useEffect(() => {
    const unsubscribeIcons = subscribePortalIcons(setImageMap);
    const unsubscribeStyles = subscribePortalIconStyles(setStyles);
    getPortalIconMap().catch(() => {});
    return () => { unsubscribeIcons(); unsubscribeStyles(); };
  }, []);
  const imageUrl = imageMap[id];
  if (imageUrl) return <img src={imageUrl} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={className} style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }} />;
  // v2.7.22: the illustrative set is now the app-wide default (roland asked
  // for "lebih bagus dan illustrative" nav icons across all portals). An
  // admin can still pin a specific id to 'studio'/'orbit'/'bold' via the
  // Icon Manager — only an explicit non-illustrative override opts out.
  const resolvedStyle = styles[id] || 'illustrative';
  return resolvedStyle === 'illustrative'
    ? <SurePathIllustrationIcon id={id} size={size} active={active} className={className} />
    : <SurePathIcon id={id} size={size} style={resolvedStyle} active={active} className={className} />;
};

export default PathyNavIcon;
