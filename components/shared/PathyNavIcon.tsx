import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons } from '../../services/portalIcons';

/**
 * Pathy navigation illustrations — custom mascot-led UI icons for SurePath.
 * Each menu keeps the same recognizable robot face and emerald/lime palette,
 * while a small contextual prop distinguishes the destination.
 */
type Props = { id: string; size?: number; active?: boolean; className?: string };

const propFor = (id: string) => {
  if (/dashboard|ops_console|analytics|reports/.test(id)) return 'chart';
  if (/policy|approvals|claims|endorse|inventory/.test(id)) return 'shield';
  if (/user|agent|insurer|b2b|biz|agreement/.test(id)) return 'people';
  if (/wallet|transaction|payment|withdraw|ledger|commission|financial/.test(id)) return 'wallet';
  if (/product|vehicle|rate|pricelist/.test(id)) return 'box';
  if (/document|website|upload/.test(id)) return 'document';
  if (/security|role|permission/.test(id)) return 'shield';
  if (/notification|activity|transcript|ai/.test(id)) return 'spark';
  if (/setting|config|promo/.test(id)) return 'gear';
  return 'spark';
};

export const PathyNavIcon: React.FC<Props> = ({ id, size = 30, active = false, className = '' }) => {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const unsubscribe = subscribePortalIcons(setImageMap);
    getPortalIconMap().catch(() => {});
    return unsubscribe;
  }, []);
  const imageUrl = imageMap[id];
  if (imageUrl) return <img src={imageUrl} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={className} style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }} />;
  const prop = propFor(id);
  const accent = active ? '#B7F34A' : '#00C16A';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pathy-nav-shell" x1="8" y1="3" x2="30" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E9FFF4" />
          <stop offset="1" stopColor="#7DE3B2" />
        </linearGradient>
        <linearGradient id="pathy-nav-screen" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#075D48" />
          <stop offset="1" stopColor="#002C24" />
        </linearGradient>
      </defs>
      {/* contextual prop sits behind Pathy, making each destination recognizable */}
      {prop === 'chart' && <g stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 28V18h5v10M12 28V11h5v17M20 28V5h5v23" /><path d="m5 12 7-5 5 2 8-5" /></g>}
      {prop === 'shield' && <path d="M20 3 33 8v10c0 8-5.7 13.2-13 17-7.3-3.8-13-9-13-17V8L20 3Z" fill="#D7FBE8" stroke={accent} strokeWidth="2" strokeLinejoin="round" />}
      {prop === 'people' && <g><circle cx="7" cy="12" r="4" fill="#F4C7A1" stroke="#087A55" strokeWidth="1.2"/><circle cx="33" cy="12" r="4" fill="#D99A70" stroke="#087A55" strokeWidth="1.2"/><path d="M1.5 25c.3-5 2.2-7 5.5-7s5.2 2 5.5 7" fill="#00A86B"/><path d="M27.5 25c.3-5 2.2-7 5.5-7s5.2 2 5.5 7" fill="#86D94A"/></g>}
      {prop === 'wallet' && <g><rect x="3" y="13" width="15" height="13" rx="3" fill="#0B7656" stroke={accent} strokeWidth="1.5"/><path d="M5 13V9c0-1.2 1-2 2.2-2H15" stroke="#0B7656" strokeWidth="2" strokeLinecap="round"/><circle cx="13.5" cy="19.5" r="1.4" fill="#D6FF79"/><circle cx="31" cy="8" r="5" fill="#FFD05B" stroke="#DDA62B" strokeWidth="1.2"/><path d="M31 5.5v5M29.5 7h2.2c1.5 0 1.5 2 0 2h-1.5" stroke="#8C5A0B" strokeWidth="1" strokeLinecap="round"/></g>}
      {prop === 'box' && <g stroke={accent} strokeWidth="1.6" strokeLinejoin="round"><path d="m4 17 8-5 8 5-8 5-8-5Z" fill="#B9F2D1"/><path d="M4 17v9l8 5v-9l-8-5Z" fill="#40C88B"/><path d="M20 17v9l-8 5v-9l8-5Z" fill="#087A55"/></g>}
      {prop === 'document' && <g><path d="M4 5h12l6 6v12H4V5Z" fill="#F4FFF8" stroke={accent} strokeWidth="1.6" strokeLinejoin="round"/><path d="M16 5v6h6M8 15h9M8 19h7" stroke="#087A55" strokeWidth="1.4" strokeLinecap="round"/></g>}
      {prop === 'spark' && <g fill="#B7F34A"><path d="m5 5 1.5 4.5L11 11l-4.5 1.5L5 17l-1.5-4.5L-1 11l4.5-1.5L5 5Z" transform="translate(3 0) scale(.9)"/><path d="m33 2 1.2 3.4L38 7l-3.8 1.2L33 12l-1.2-3.8L28 7l3.8-1.6L33 2Z"/></g>}
      {prop === 'gear' && <g stroke={accent} strokeWidth="2" strokeLinejoin="round"><path d="m6 12 3-3 3 1 2-3h5l2 3 3-1 3 3-1 3 2 2v5l-3 2 1 3-3 3-3-1-2 2h-5l-2-3-3 1-3-3 1-3-2-2v-5l3-2-1-2Z" fill="#C8F6DC"/><circle cx="17" cy="19" r="4" fill="#087A55"/></g>}
      {/* Pathy — consistent friendly robot face */}
      <g>
        <path d="M13 29c-2 1-3 3-3 5h7l2-4M27 29c2 1 3 3 3 5h-7l-2-4" fill="#0B7656"/>
        <path d="M20 3v4" stroke={accent} strokeWidth="2.2" strokeLinecap="round"/>
        <circle cx="20" cy="3" r="2.4" fill={accent}/>
        <rect x="7" y="7" width="26" height="25" rx="9" fill="url(#pathy-nav-shell)" stroke="#0B9A68" strokeWidth="1.5"/>
        <rect x="10.5" y="11" width="19" height="16" rx="6" fill="url(#pathy-nav-screen)"/>
        <path d="M15 17.5v2M25 17.5v2" stroke="#B7F34A" strokeWidth="3" strokeLinecap="round"/>
        <path d="M15.5 22q4.5 4 9 0" stroke="#B7F34A" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M7 17h-2v6h2M33 17h2v6h-2" fill="#36C98B" stroke="#0B9A68" strokeWidth="1"/>
        <path d="M17 32h6" stroke="#087A55" strokeWidth="2" strokeLinecap="round"/>
      </g>
      {/* small lime spark is the signature accent, not a generic glyph */}
      {active && <circle cx="33" cy="32" r="4" fill="#B7F34A" stroke="#087A55" strokeWidth="1.2"/>}
    </svg>
  );
};

export default PathyNavIcon;
