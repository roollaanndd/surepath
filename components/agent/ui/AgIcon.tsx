// AgIcon — keluarga ikon "Jalur" untuk apps mitra (v2.9.0).
//
// Digambar sendiri di grid 24, garis 1.75 dengan ujung membulat. Tiap ikon
// punya SATU penanda oranye — titik atau goresan pendek — yang menandai
// "tujuan" pada gambarnya (kunci dompet, centang perisai, simpul jaringan).
// Itu yang membuat tiga puluhan ikon ini terbaca sebagai satu keluarga dan
// bukan kumpulan ikon garis generik: SurePath = jalur yang pasti, selalu ada
// titik tujuannya.
//
// Garis utama memakai `currentColor`; penanda memakai `--ag-icon-accent`
// (oranye secara bawaan, bisa ditimpa pembungkusnya — mis. putih di atas
// tombol hijau). Murni presentasional.
//
// `managedId` menjaga Icon Manager admin tetap berlaku: bila admin mengunggah
// gambar untuk id itu, gambar admin yang tampil; kalau tidak, ikon Jalur.

import React, { useEffect, useState } from 'react';
import { getPortalIconMap, subscribePortalIcons } from '../../../services/portalIcons';

const A = 'var(--ag-icon-accent, #f97316)';

/** Titik tujuan. */
const Dot: React.FC<{ cx: number; cy: number; r?: number }> = ({ cx, cy, r = 1.5 }) => (
  <circle cx={cx} cy={cy} r={r} fill={A} stroke="none" />
);
/** Goresan penanda. */
const Mark: React.FC<{ d: string }> = ({ d }) => <path d={d} stroke={A} />;

const SHIELD = 'M12 3.5 19 6v5.4c0 4.4-2.9 7.6-7 9.1-4.1-1.5-7-4.7-7-9.1V6l7-2.5Z';
const DOC = 'M8 3.5h6l4.5 4.5v10A2.5 2.5 0 0 1 16 20.5H8A2.5 2.5 0 0 1 5.5 18V6A2.5 2.5 0 0 1 8 3.5Z';
const TRAY = 'M4.5 14.5v3A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-3';

const GLYPHS = {
  home: <><path d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-7.8Z" /><Dot cx={12} cy={14.6} r={1.7} /></>,
  policy: <><path d={SHIELD} /><Mark d="m9 11.8 2.1 2.1 4.1-4.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  wallet: <><path d="M4 8a2.5 2.5 0 0 1 2.5-2.5h9.8A1.7 1.7 0 0 1 18 7.2V8" /><path d="M4 8v9a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 17v-6.5A2.5 2.5 0 0 0 17.5 8H4Z" /><Dot cx={16} cy={13.8} /></>,
  profile: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.6-3.6 3.4-5.7 7-5.7s6.4 2.1 7 5.7" /><Dot cx={18} cy={5.8} r={1.4} /></>,
  quote: <><path d={DOC} /><path d="M14 3.5V8h4.5" /><path d="M9 12.5h6M9 16h3" /><Dot cx={15.6} cy={16.2} r={1.4} /></>,
  document: <><path d={DOC} /><path d="M14 3.5V8h4.5" /><path d="M9 12.5h6M9 16h6" /></>,
  clients: <><circle cx="9.5" cy="8.5" r="3" /><path d="M3.5 19.5c.5-3.2 2.9-5 6-5s5.5 1.8 6 5" /><Mark d="M15.5 5.6a3 3 0 0 1 0 5.8" /><path d="M17.5 14.9c1.7.6 2.7 2.2 3 4.6" /></>,
  claims: <><rect x="5" y="5" width="14" height="15.5" rx="2.5" /><path d="M9 5v-.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.500V5" /><Mark d="M8 13.2h2l1.2-2.6 1.8 5 1.2-2.4H16" /></>,
  renewals: <><path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9" /><path d="M4.5 12a7.5 7.5 0 0 1 13.2-4.9" /><path d="M17.9 3.8v3.5h-3.500M6.100 20.2v-3.5h3.5" /><Dot cx={12} cy={12} r={1.6} /></>,
  network: <><circle cx="12" cy="5.800" r="2.3" /><circle cx="5.500" cy="17.5" r="2.3" /><circle cx="18.5" cy="17.5" r="2.3" fill={A} stroke={A} /><path d="M10.900 7.800 6.600 15.500M13.100 7.800l4.300 7.700M7.800 17.500h8.400" /></>,
  rank: <><path d="M9 20.5V9.500h6v11" /><path d="M3.500 20.500V14H9M15 13h5.500v7.500" /><path d="M2.500 20.500h19" /><Dot cx={12} cy={5.2} r={1.7} /></>,
  endorsements: <><path d={DOC} /><path d="M14 3.500V8h4.500" /><Mark d="m10.500 17.200.4-2.200 4.900-4.900 1.800 1.800-4.900 4.900-2.200.4Z" /></>,
  commission: <><circle cx="12" cy="12" r="8" /><Mark d="M9.700 15.800v-7.600h2.500a2.200 2.200 0 0 1 0 4.400H9.700m2.300 0 2.500 3.200" /></>,
  pathy: <><rect x="5" y="7.500" width="14" height="11.500" rx="4" /><path d="M12 7.500V5.400" /><Dot cx={12} cy={4} r={1.4} /><circle cx="9.500" cy="12.600" r="1" fill="currentColor" stroke="none" /><circle cx="14.500" cy="12.600" r="1" fill="currentColor" stroke="none" /><path d="M10 15.700c1.200.8 2.800.8 4 0" /></>,
  bell: <><path d="M6.500 16.500V11a5.500 5.500 0 0 1 11 0v5.500l1.500 2H5l1.500-2Z" /><path d="M10.200 20.800a2 2 0 0 0 3.600 0" /></>,
  moon: <path d="M19.500 14.200A8 8 0 1 1 9.800 4.500a6.500 6.500 0 0 0 9.700 9.700Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600 7 7M17 17l1.400 1.400M5.600 18.400 7 17M17 7l1.400-1.400" /></>,
  car: <><path d="M4.500 16.500v-3.200a2 2 0 0 1 .5-1.300L6.500 10l1.300-3.200a2 2 0 0 1 1.900-1.300h4.600a2 2 0 0 1 1.900 1.300L17.500 10l1.500 2a2 2 0 0 1 .5 1.300v3.200a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" /><path d="M6.500 10h11M7 17.500V19M17 17.500V19" /><Dot cx={8} cy={13.800} r={1.200} /><Dot cx={16} cy={13.800} r={1.200} /></>,
  motor: <><circle cx="6.500" cy="16.500" r="2.800" /><circle cx="17.500" cy="16.500" r="2.800" /><path d="M9.300 16.500h5.400l-2.200-7H10M12.500 9.500 15 6.500h2.500M14.700 16.500l2-5.200" /><Dot cx={17.500} cy={16.500} r={1.100} /></>,
  travel: <><path d="M20.500 3.500 3.500 10.600l6.300 2.600 2.600 6.300 8.100-16Z" /><path d="M9.800 13.200 20.500 3.500" /><Dot cx={5.800} cy={18.800} r={1.400} /></>,
  health: <><path d="M12 20s-7.500-4.400-7.500-10A4.300 4.300 0 0 1 12 7.300 4.300 4.300 0 0 1 19.500 10c0 5.600-7.500 10-7.500 10Z" /><Mark d="M12 10.300v4.200M9.900 12.400h4.200" /></>,
  gadget: <><rect x="7" y="3" width="10" height="18" rx="2.500" /><path d="M10.500 6h3" /><Dot cx={12} cy={17.500} r={1.200} /></>,
  box: <><path d="M12 3.500 20 8v8l-8 4.500L4 16V8l8-4.500Z" /><path d="M4 8l8 4.500L20 8M12 12.500v8" /><Mark d="m8 5.800 8 4.500" /></>,
  withdraw: <><path d={TRAY} /><Mark d="M12 15V4.500M8 8.200l4-3.700 4 3.700" /></>,
  download: <><path d={TRAY} /><Mark d="M12 4v10.500M8 11l4 3.700 4-3.700" /></>,
  history: <><circle cx="12" cy="12" r="8" /><Mark d="M12 7.500V12l3 2" /></>,
  chevron: <path d="m9 5.500 6.500 6.500L9 18.500" />,
  back: <path d="M15 5.500 8.500 12l6.500 6.500" />,
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
  search: <><circle cx="11" cy="11" r="6.500" /><path d="m16 16 4 4" /></>,
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="5.500" y="10.500" width="13" height="9.500" rx="2.500" /><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" /><Dot cx={12} cy={15.200} r={1.300} /></>,
  gift: <><rect x="4.500" y="10.500" width="15" height="9.500" rx="2" /><rect x="3.500" y="7" width="17" height="3.500" rx="1.200" /><Mark d="M12 7v13" /><path d="M12 7c-1.500-3-5-3-5-1s3 1 5 1Zm0 0c1.500-3 5-3 5-1s-3 1-5 1Z" /></>,
  spark: <><path d="M11 3.500c.6 4.200 2.300 5.900 6.500 6.500-4.200.6-5.900 2.300-6.500 6.500-.6-4.200-2.300-5.900-6.500-6.500 4.200-.6 5.900-2.300 6.500-6.500Z" /><Dot cx={18} cy={18} r={1.700} /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.200" /><Dot cx={12} cy={12} r={1.500} /></>,
  trend: <><path d="M3.500 17 9 11.500l3.500 3.500 7-7.500" /><path d="M15 7.500h4.500V12" /><Dot cx={9} cy={11.500} r={1.400} /></>,
  calendar: <><rect x="4" y="5.500" width="16" height="15" rx="3" /><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4" /><Dot cx={15.500} cy={15} r={1.400} /></>,
  copy: <><rect x="8.500" y="8.500" width="11" height="11" rx="2.500" /><path d="M5.500 15.500H5A1.500 1.500 0 0 1 3.500 14V6A2.500 2.500 0 0 1 6 3.500h8A1.500 1.500 0 0 1 15.500 5v.5" /></>,
  logout: <><path d="M10 4.500H7A2.500 2.500 0 0 0 4.500 7v10A2.500 2.500 0 0 0 7 19.500h3" /><Mark d="M10 12h10M16.500 8.500 20 12l-3.500 3.500" /></>,
  settings: <><path d="M4 8h8M18 8h2M4 16h2M12 16h8" /><circle cx="15" cy="8" r="2.300" /><circle cx="9" cy="16" r="2.300" stroke={A} /></>,
  help: <><circle cx="12" cy="12" r="8" /><path d="M9.800 9.700a2.300 2.300 0 1 1 3.400 2c-.8.5-1.200 1-1.200 1.900" /><Dot cx={12} cy={16.600} r={1} /></>,
  info: <><circle cx="12" cy="12" r="8" /><path d="M12 11v5" /><Dot cx={12} cy={8} r={1} /></>,
  warning: <><path d="M12 4 21 19.500H3L12 4Z" /><path d="M12 10v4.500" /><Dot cx={12} cy={17} r={1} /></>,
  chat: <><path d="M20 11.500a7.500 7.500 0 0 1-11.200 6.500L4.500 19l1-4A7.500 7.500 0 1 1 20 11.500Z" /><Dot cx={9} cy={11.500} r={0.900} /><Dot cx={12} cy={11.500} r={0.900} /><Dot cx={15} cy={11.500} r={0.900} /></>,
  star: <path d="m12 4 2.400 5 5.400.7-4 3.800 1 5.400L12 16.300 7.200 18.900l1-5.400-4-3.800 5.400-.7L12 4Z" />,
  eye: <><path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z" /><circle cx="12" cy="12" r="2.800" stroke={A} /></>,
  edit: <><path d="m4.500 19.500.7-3.600L15.800 5.300a1.800 1.800 0 0 1 2.500 0l.4.4a1.800 1.800 0 0 1 0 2.500L8.100 18.800l-3.600.7Z" /><Mark d="m14 7 3 3" /></>,
  bank: <><path d="M4 9.500 12 4l8 5.500M5.500 9.500h13M4 20h16" /><path d="M7 9.500v8M17 9.500v8" /><Mark d="M12 9.500v8" /></>,
  headset: <><path d="M5 13v-1.500a7 7 0 0 1 14 0V13" /><rect x="3.500" y="12.500" width="3.500" height="5.500" rx="1.500" /><rect x="17" y="12.500" width="3.500" height="5.500" rx="1.500" /><path d="M19 18v.5a2.500 2.500 0 0 1-2.500 2.500H13.500" /><Dot cx={12} cy={21} r={1.200} /></>,
  share: <><circle cx="6.500" cy="12" r="2.300" /><circle cx="17" cy="6" r="2.300" /><circle cx="17" cy="18" r="2.300" fill={A} stroke={A} /><path d="m8.600 10.900 6.300-3.700M8.600 13.100l6.300 3.700" /></>,
  camera: <><path d="M4 9a2.500 2.500 0 0 1 2.500-2.500H8l1.300-2h5.400l1.300 2h1.500A2.500 2.500 0 0 1 20 9v8a2.500 2.500 0 0 1-2.500 2.500h-11A2.500 2.500 0 0 1 4 17V9Z" /><circle cx="12" cy="13" r="3.200" stroke={A} /></>,
  filter: <><path d="M4 6.500h16M7 12h10M10 17.500h4" /></>,
  phone: <><path d="M6.500 4h2.600l1.400 3.600-1.800 1.300a11 11 0 0 0 6.400 6.400l1.300-1.800 3.600 1.400v2.600a2 2 0 0 1-2.200 2A15.500 15.500 0 0 1 4.500 6.200 2 2 0 0 1 6.500 4Z" /></>,
} as const;

export type AgIconName = keyof typeof GLYPHS;

export interface AgIconProps {
  name: AgIconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  /** Id Icon Manager; bila admin mengunggah gambar untuk id ini, gambar itu yang dipakai. */
  managedId?: string;
}

function useAdminIcon(id: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!id) return undefined;
    const unsubscribe = subscribePortalIcons(map => setSrc(map[id]));
    getPortalIconMap().catch(() => {});
    return () => { unsubscribe(); };
  }, [id]);
  return id ? src : undefined;
}

export const AgIcon: React.FC<AgIconProps> = ({ name, size = 22, className = '', style, strokeWidth = 1.75, managedId }) => {
  const adminSrc = useAdminIcon(managedId);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [adminSrc]);
  if (adminSrc && !failed) {
    return (
      <img
        src={adminSrc} alt="" aria-hidden="true" draggable={false} width={size} height={size}
        onError={() => setFailed(true)} className={className}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0, ...style }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" focusable="false"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }}
    >
      {GLYPHS[name]}
    </svg>
  );
};

export const AG_ICON_NAMES = Object.keys(GLYPHS) as AgIconName[];

export default AgIcon;
