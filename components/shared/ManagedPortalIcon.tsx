import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons } from '../../services/portalIcons';

type Props = {
  id: string;
  size?: number;
  fallback: React.ReactNode;
  className?: string;
  imageClassName?: string;
};

export default function ManagedPortalIcon({ id, size = 24, fallback, className = '', imageClassName = '' }: Props) {
  const [icons, setIcons] = useState<Record<string, string>>({});
  useEffect(() => {
    const unsubscribe = subscribePortalIcons(setIcons);
    getPortalIconMap().catch(() => {});
    return unsubscribe;
  }, []);
  const src = icons[id];
  if (!src) return <span className={className}>{fallback}</span>;
  return <img src={src} alt="" aria-hidden="true" draggable={false} width={size} height={size} className={imageClassName || className} style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }} />;
}
