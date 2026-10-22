export type SurePathIconStyle = 'studio' | 'orbit' | 'bold' | 'illustrative';
type Props = { id: string; size?: number; style?: SurePathIconStyle; className?: string; active?: boolean };

/**
 * SurePath visual language: one coherent emerald / mint / lime palette.
 * Keep icon geometry in code for crisp scaling; use real photography for
 * emotional storytelling and retain CMS image overrides where explicitly set.
 */
const PALETTES = [
  { a: '#08743B', b: '#37C982', c: '#C7F36B', bg: '#EAF7EF', ink: '#124A32' },
];
const paletteFor = (_id: string) => PALETTES[0];

function Artwork({ id, p, variant }: { id: string; p: typeof PALETTES[number]; variant: SurePathIconStyle }) {
  const common = { stroke: p.ink, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const key = /pathy|ai_admin|ai_finance|assistant/i.test(id) ? 'pathy'
    : /bank|branch|banking|institution|finance_center/i.test(id) ? 'bank'
    : /library|catalog|resource_center|knowledge/i.test(id) ? 'library'
    : /leaderboard|ranking|trophy|target/i.test(id) ? 'trophy'
    : /network|referral|team/i.test(id) ? 'network'
    : /renewal|refresh/i.test(id) ? 'renewal'
    : /withdraw/i.test(id) ? 'withdraw'
    : /payment/i.test(id) ? 'payment'
    : /home|dashboard/i.test(id) ? 'home'
    : /car|vehicle|motor|pricelist|rate/i.test(id) ? 'car'
    : /travel|journey|flight|plane/i.test(id) ? 'travel'
    : /health|safety|accident|family/i.test(id) ? 'health'
    : /claim|shield|security|approval|endorsement/i.test(id) ? 'shield'
    : /wallet|commission|ledger|financial|payment|withdraw/i.test(id) ? 'money'
    : /quote|submission|new|create|proposal/i.test(id) ? 'quote'
    : /policy|document|inventory|report|history|activity|log/i.test(id) ? 'document'
    : /user|client|agent|insurer|b2b|people|profile/i.test(id) ? 'people'
    : /setting|config|system|gear/i.test(id) ? 'gear'
    : /notification|bell/i.test(id) ? 'bell'
    : /analytics|ops_console|ranking/i.test(id) ? 'chart'
    : /product|box|website|upload/i.test(id) ? 'box'
    : 'spark';
  const line = variant === 'bold' ? 2.5 : 1.7;
  const stroke = { ...common, strokeWidth: line };
  return <g>
    {variant === 'orbit' && <g fill="none" stroke={p.b} strokeWidth="1.4"><ellipse cx="24" cy="23" rx="20" ry="9" transform="rotate(-32 24 23)"/><circle cx="39" cy="10" r="2.5" fill={p.c} stroke="none"/></g>}
    {variant === 'studio' && <rect x="4" y="4" width="40" height="40" rx="13" fill={p.bg}/>}
    {variant === 'bold' && <path d="M24 3 44 14v20L24 45 4 34V14Z" fill={p.bg} stroke={p.b} strokeWidth="1.2"/>}
    {key === 'bank' && <g {...stroke}><path d="M6 18 24 7l18 11Z" fill={p.b}/><path d="M9 20h30M7 39h34M10 22v14M18 22v14M30 22v14M38 22v14" stroke={p.ink} strokeWidth="2.2"/><path d="M6 39h36" stroke={p.a} strokeWidth="3"/><circle cx="24" cy="15" r="2" fill={p.c}/></g>}
    {key === 'library' && <g {...stroke}><path d="M8 12 17 8l7 4-7 4Z" fill={p.b}/><path d="M8 12v23l9 5V16Z" fill={p.a}/><path d="M24 12 33 8l7 4-7 4Z" fill={p.c}/><path d="M24 12v23l9 5V16Z" fill={p.b}/><path d="M17 16v22M33 16v22" stroke={p.ink} strokeOpacity=".5"/><path d="M7 39 17 44l7-4 9 4 9-5" fill="none" stroke={p.ink} strokeWidth="1.6"/></g>}
    {key === 'home' && <g {...stroke}><path d="m9 23 15-13 15 13" fill="none"/><path d="M13 21v17h22V21L24 12Z" fill={p.b}/><path d="M21 38V27h7v11" fill={p.bg}/><path d="M17 23h4M29 23h4" stroke={p.ink}/><circle cx="36" cy="12" r="4" fill={p.c}/></g>}
    {key === 'car' && <g {...stroke}><path d="m8 28 4-10q1-3 5-3h13q4 0 6 5l3 8v7H8Z" fill={p.b}/><path d="m15 18-3 8h23l-4-8Z" fill={p.bg}/><path d="M7 29h34v6H7Z" fill={p.a}/><circle cx="15" cy="36" r="4" fill={p.ink}/><circle cx="34" cy="36" r="4" fill={p.ink}/><circle cx="15" cy="36" r="1.5" fill="white"/><circle cx="34" cy="36" r="1.5" fill="white"/><path d="M9 29h4M35 29h4" stroke={p.c} strokeWidth="2.5"/></g>}
    {key === 'travel' && <g {...stroke}><path d="m7 26 13-4 5-15q1-3 4-1l2 2-2 14 9 4q3 2 1 4l-2 1-12-3-8 10-3-1 3-11-8 2Z" fill={p.b}/><path d="m10 38 9-3" stroke={p.a} strokeWidth="3"/><circle cx="37" cy="10" r="5" fill={p.c}/></g>}
    {key === 'health' && <g {...stroke}><path d="M24 39S7 29 7 17c0-9 12-12 17-3 5-9 17-6 17 3 0 12-17 22-17 22Z" fill={p.b}/><path d="M13 24h7l3-7 4 14 3-7h6" fill="none" stroke={p.ink} strokeWidth="2"/><circle cx="38" cy="11" r="5" fill={p.c}/></g>}
    {key === 'shield' && <g {...stroke}><path d="M24 7 39 13v11q-1 11-15 18Q10 35 9 24V13Z" fill={p.b}/><path d="m16 24 5 5 11-12" fill="none" stroke="white" strokeWidth="3.2"/><path d="M24 7v35" stroke={p.ink} strokeOpacity=".18"/></g>}
    {key === 'money' && <g {...stroke}><ellipse cx="18" cy="34" rx="10" ry="4" fill={p.b}/><path d="M8 26v8q10 8 20 0v-8" fill={p.a}/><ellipse cx="18" cy="26" rx="10" ry="4" fill={p.b}/><ellipse cx="32" cy="19" rx="8" ry="4" fill={p.c}/><path d="M24 19v11q8 7 16 0V19" fill={p.c}/><ellipse cx="32" cy="30" rx="8" ry="4" fill={p.b}/><path d="M32 15v18" stroke={p.ink} strokeOpacity=".3"/><path d="M29 23q3-3 6 0t-6 0" fill="none"/></g>}
    {key === 'quote' && <g {...stroke}><path d="M12 7h16l8 8v25H12Z" fill={p.bg}/><path d="M28 7v9h8" fill={p.b}/><path d="M18 23h12M18 28h10" stroke={p.a} strokeWidth="2"/><circle cx="34" cy="35" r="8" fill={p.c}/><path d="M34 30v10M31 33h4q3 2 0 4h-4" stroke={p.ink} strokeWidth="1.4"/></g>}
    {key === 'document' && <g {...stroke}><path d="M12 7h17l7 8v25H12Z" fill={p.bg}/><path d="M29 7v9h7" fill={p.b}/><path d="M18 23h12M18 28h12M18 33h8" stroke={p.a} strokeWidth="2"/><path d="m31 35 3 3 6-8" fill="none" stroke={p.c} strokeWidth="2.8"/></g>}
    {key === 'people' && <g {...stroke}><circle cx="18" cy="17" r="7" fill={p.b}/><circle cx="33" cy="19" r="5.5" fill={p.c}/><path d="M6 39q0-13 12-13t12 13Z" fill={p.a}/><path d="M27 29q10-4 14 8v2H28" fill={p.b}/><circle cx="16" cy="16" r="1" fill={p.ink}/><circle cx="20" cy="16" r="1" fill={p.ink}/><path d="M15 20q3 3 6 0" fill="none"/></g>}
    {key === 'pathy' && <g {...stroke}><path d="M24 6v5" stroke={p.a} strokeWidth="2.5"/><circle cx="24" cy="5" r="3" fill={p.c}/><rect x="8" y="11" width="32" height="28" rx="10" fill={p.b}/><rect x="13" y="16" width="22" height="17" rx="6" fill={p.ink}/><circle cx="19" cy="23" r="2" fill="#C7F36B"/><circle cx="29" cy="23" r="2" fill="#C7F36B"/><path d="M19 28q5 5 10 0" stroke="#C7F36B" strokeWidth="2" fill="none"/><path d="M8 21H5v8h3M40 21h3v8h-3" fill={p.a}/><path d="M18 39v3M30 39v3" stroke={p.ink} strokeWidth="2.5"/></g>}
    {key === 'trophy' && <g {...stroke}><path d="M15 8h18v9q0 11-9 13-9-2-9-13Z" fill={p.b}/><path d="M15 12H8v4q0 7 9 8M33 12h7v4q0 7-9 8" fill="none"/><path d="m24 15 2 4 4 .5-3 3 .8 4.5-3.8-2.2-3.8 2.2.8-4.5-3-3 4-.5Z" fill={p.c} stroke={p.ink} strokeWidth="1"/><path d="M18 38h12M21 30v8M27 30v8"/></g>}
    {key === 'network' && <g {...stroke}><path d="M24 20 11 11M24 20l14-8M24 20 12 36M24 20l14 16" stroke={p.a} strokeWidth="2.5"/><circle cx="24" cy="20" r="8" fill={p.b}/><circle cx="10" cy="10" r="6" fill={p.c}/><circle cx="38" cy="11" r="6" fill={p.a}/><circle cx="11" cy="37" r="6" fill={p.b}/><circle cx="38" cy="37" r="6" fill={p.c}/><circle cx="22" cy="19" r="1" fill={p.ink}/><circle cx="26" cy="19" r="1" fill={p.ink}/><path d="M21 23q3 2 6 0" fill="none"/></g>}
    {key === 'renewal' && <g {...stroke}><rect x="10" y="11" width="28" height="29" rx="5" fill={p.bg}/><path d="M10 19h28" stroke={p.a} strokeWidth="2.5"/><path d="M17 7v8M31 7v8" stroke={p.ink} strokeWidth="2.5"/><path d="M18 28a7 7 0 0 1 12-4l2 2M32 22v5h-5" fill="none" stroke={p.c} strokeWidth="2.5"/><path d="M30 32a7 7 0 0 1-12 3l-2-2M16 38v-5h5" fill="none" stroke={p.a} strokeWidth="2.5"/></g>}
    {key === 'payment' && <g {...stroke}><rect x="7" y="12" width="34" height="25" rx="5" fill={p.b}/><path d="M7 19h34" stroke={p.ink} strokeWidth="2.5"/><path d="M13 29h9" stroke={p.bg} strokeWidth="3"/><circle cx="33" cy="29" r="3" fill={p.c}/><path d="m28 7 4-3 4 3" fill="none" stroke={p.a} strokeWidth="2.5"/></g>}
    {key === 'withdraw' && <g {...stroke}><path d="M8 16h25l-5-5M33 16l-5 5" fill="none" stroke={p.a} strokeWidth="3"/><path d="M40 32H15l5 5M15 32l5-5" fill="none" stroke={p.c} strokeWidth="3"/><rect x="15" y="20" width="18" height="8" rx="3" fill={p.b}/></g>}
    {key === 'gear' && <g {...stroke}><path d="m21 7 6 0 2 5 4 1 4-2 4 5-3 4 1 4 3 3-3 6-5-1-3 3-1 5h-6l-2-5-4-1-4 2-4-5 3-4-1-4-3-3 3-6 5 1 3-3Z" fill={p.b} transform="translate(-2 -2) scale(1.05)"/><circle cx="24" cy="24" r="6" fill={p.bg}/></g>}
    {key === 'bell' && <g {...stroke}><path d="M12 33h24l-3-5V20q0-9-9-9t-9 9v8Z" fill={p.b}/><path d="M20 37q4 5 8 0" fill="none"/><circle cx="36" cy="12" r="6" fill={p.c}/><circle cx="36" cy="12" r="1.5" fill="white"/></g>}
    {key === 'chart' && <g {...stroke}><path d="M8 39V9h31v30Z" fill={p.bg}/><path d="M14 32V24h5v8M22 32V17h5v15M30 32V12h5v20" fill={p.b} stroke={p.a}/><path d="m13 19 8-5 6 2 8-8" fill="none" stroke={p.c} strokeWidth="2.5"/></g>}
    {key === 'box' && <g {...stroke}><path d="m8 16 16-9 16 9-16 9Z" fill={p.b}/><path d="M8 16v19l16 9V25Z" fill={p.a}/><path d="M40 16v19l-16 9V25Z" fill={p.c}/><path d="M24 25v19" stroke="white" strokeOpacity=".8"/><path d="m17 11 16 9" stroke="white" strokeOpacity=".8"/></g>}
    {key === 'spark' && <g {...stroke}><path d="m24 5 5 13 13 6-13 5-5 13-5-13-13-5 13-6Z" fill={p.b}/><circle cx="36" cy="10" r="4" fill={p.c}/><circle cx="10" cy="36" r="3" fill={p.a}/></g>}
    {variant === 'studio' && <path d="M9 42h30" stroke={p.b} strokeWidth="2" strokeLinecap="round" opacity=".7"/>}
    {variant === 'bold' && <circle cx="39" cy="9" r="3" fill={p.c}/>}
  </g>;
}

export default function SurePathIcon({ id, size = 28, style = 'studio', className = '', active = false }: Props) {
  const p = paletteFor(id);
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true" focusable="false">
    <defs><linearGradient id={`sp-icon-${id.replace(/[^a-z0-9]/gi, '')}-${style}`} x1="7" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor={p.b}/><stop offset="1" stopColor={p.a}/></linearGradient></defs>
    <Artwork id={id} p={p} variant={style}/>
    {active && <circle cx="40" cy="39" r="4" fill="#C7F36B" stroke="white" strokeWidth="1.5"/>}
  </svg>;
}
