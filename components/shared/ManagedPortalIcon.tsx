import React, { useEffect, useState } from 'react';
import { getPortalIconMap, getPortalIconStyles, subscribePortalIcons, subscribePortalIconStyles, type PortalIconStyleMap } from '../../services/portalIcons';
import SurePathIcon from './SurePathIcon';

type Props = {
  id: string;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
  imageClassName?: string;
};

export default function ManagedPortalIcon({ id, size = 24, fallback, className = '', imageClassName = '' }: Props) {
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
  return <span className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <SurePathIcon id={id} size={size} style={styles[id] || 'studio'} className={imageClassName} />
  </span>;
}
