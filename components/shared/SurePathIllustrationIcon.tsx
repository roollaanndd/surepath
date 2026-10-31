// TypeScript JSX runtime is automatic; keep this file free of an unused React import.

type Props = { id: string; size?: number; className?: string; active?: boolean };

/** Flat, playful SurePath illustration set. Pure SVG; no raster assets, 3D or glossy effects. */
const C = { deep: '#075E55', teal: '#0B8F78', green: '#28A96B', mint: '#BDEFD7', pale: '#F0FBF4', lime: '#C7EE57', white: '#FFFFFF', ink: '#16483D' };

function Art({ id }: { id: string }) {
  // v2.7.22: specific keys added so admin-exclusive nav ids (tier, icon
  // manager, insurer/b2b directories, catalogs, analytics, product
  // catalog) get their own illustration instead of falling through to the
  // generic 'spark', once this illustrative set became the app-wide
  // default (PathyNavIcon.tsx). Checked before the broader categories they'd
  // otherwise collide with — "ojk_rates" before 'car' (which matches
  // "rate"), "approvals" before 'protection' (which matches "approval").
  const key = /ojk_rates/i.test(id) ? 'protection'
    : /approvals/i.test(id) ? 'review'
    : /tier/i.test(id) ? 'tier'
    : /portal_icons/i.test(id) ? 'palette'
    : /insurers|b2b|corporate|bank|branch|banking|institution/i.test(id) ? 'bank'
    : /library|catalog|resource_center|knowledge/i.test(id) ? 'library'
    : /network|referral/i.test(id) ? 'network'
    : /renewal|refresh/i.test(id) ? 'renewal'
    : /analytics|ops_console|ranking|leaderboard|trophy/i.test(id) ? 'chart'
    : /product|website|upload/i.test(id) ? 'box'
    : /home|dashboard/i.test(id) ? 'home'
    : /wallet|commission|ledger|financial|money|withdraw/i.test(id) ? 'wallet'
    : /car|vehicle|motor|pricelist|rate/i.test(id) ? 'car'
    : /claim|shield|security|approval|endorsement|protection|insurance/i.test(id) ? 'protection'
    : /policy|document|inventory|report|history|activity|log|quote/i.test(id) ? 'document'
    : /payment|transaction/i.test(id) ? 'payment'
    : /notification|bell/i.test(id) ? 'bell'
    : /user|client|agent|insurer|b2b|people|profile|partner/i.test(id) ? 'people'
    : /travel|journey|flight|plane/i.test(id) ? 'travel'
    : /health|safety|accident|family/i.test(id) ? 'health'
    : /setting|config|system|gear/i.test(id) ? 'settings'
    : /help|support|pathy|ai/i.test(id) ? 'help' : 'spark';
  return <g stroke={C.ink} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="24" cy="43" rx="17" ry="2.5" fill={C.mint} stroke="none" />
    {key === 'protection' && <>
      <path d="M8 15Q24 1 40 15L37 29Q33 39 24 43Q15 39 11 29Z" fill={C.mint} stroke="none"/>
      <path d="M24 13Q36 13 37 23L34 31Q30 37 24 40Q18 37 14 31L11 23Q12 13 24 13Z" fill={C.white} stroke={C.green} strokeWidth="1.8"/>
      <path d="M24 14V39Q32 35 35 28L37 20Q33 14 24 14Z" fill={C.pale} stroke="none"/>
      <path d="M18 25L22 29L31 20" fill="none" stroke={C.teal} strokeWidth="3.2"/>
      <path d="M5 17Q24 -1 43 17Q37 13 32 16Q24 12 16 16Q10 13 5 17Z" fill={C.lime} stroke={C.teal} strokeWidth="1.5"/>
      <path d="M24 8Q24 4 28 4" fill="none" stroke={C.teal} strokeWidth="2"/>
      <path d="M24 15L22 23" fill="none" stroke={C.teal} strokeWidth="1.5"/>
      <path d="M6 26l2 2M42 27l-2 2M7 34l3-1M41 35l-3-1" stroke={C.green} strokeWidth="2"/>
    </>}
    {key === 'home' && <>
      <path d="M7 23L24 8L41 23" fill="none" stroke={C.teal} strokeWidth="5"/>
      <path d="M12 21V38H36V21L24 11Z" fill={C.mint} stroke="none"/>
      <path d="M12 21L24 11L24 38H12Z" fill={C.pale} stroke="none"/>
      <path d="M21 38V27Q24 23 27 27V38" fill={C.teal}/>
      <rect x="16" y="23" width="4" height="4" rx="1" fill={C.lime} stroke="none"/>
      <rect x="28" y="23" width="4" height="4" rx="1" fill={C.lime} stroke="none"/>
      <path d="M8 40Q24 35 40 40" fill="none" stroke={C.green} strokeWidth="3"/>
      <path d="M7 36q-5-6 0-9q6 3 2 9M39 36q5-6 0-9q-6 3-2 9" fill={C.green} stroke="none"/>
    </>}
    {key === 'wallet' && <>
      <path d="M9 15Q9 12 13 12H34Q38 12 38 16V36Q38 39 34 39H12Q8 39 8 35Z" fill={C.green}/>
      <path d="M11 15L30 8Q34 7 36 11L37 15Z" fill={C.lime}/>
      <path d="M27 22H39Q42 22 42 25V31Q42 34 39 34H27Q23 34 23 30V26Q23 22 27 22Z" fill={C.mint}/>
      <circle cx="31" cy="28" r="2" fill={C.teal} stroke="none"/>
      <path d="M14 18H31" stroke={C.pale} strokeWidth="1.5"/>
      <circle cx="18" cy="27" r="5" fill={C.lime}/>
      <path d="M17 25h2q2 1 0 2h-2q-2 1 0 2h3" fill="none" stroke={C.ink} strokeWidth="1"/>
    </>}
    {key === 'car' && <>
      <path d="M8 27L12 18Q13 15 17 15H30Q34 15 36 20L40 27V35H8Z" fill={C.green}/>
      <path d="M15 18H29Q32 18 34 25H12Z" fill={C.mint}/>
      <path d="M24 18V25" stroke={C.teal} strokeWidth="1.5"/>
      <path d="M8 28H40V33H8Z" fill={C.lime} stroke="none"/>
      <circle cx="15" cy="35" r="4" fill={C.deep}/><circle cx="34" cy="35" r="4" fill={C.deep}/>
      <circle cx="15" cy="35" r="1.6" fill={C.white} stroke="none"/><circle cx="34" cy="35" r="1.6" fill={C.white} stroke="none"/>
      <path d="M8 29h4M36 29h4" stroke={C.white} strokeWidth="2"/>
      <path d="M32 8l2 3 4 .5-3 2.5.5 4-3.5-2-3.5 2 .5-4-3-2.5 4-.5Z" fill={C.lime} stroke="none"/>
    </>}
    {key === 'document' && <>
      <path d="M13 7H29L36 14V39H13Z" fill={C.pale} stroke={C.teal} strokeWidth="1.7"/>
      <path d="M29 7V15H36" fill={C.mint} stroke={C.teal} strokeWidth="1.4"/>
      <path d="M18 21H30M18 26H30M18 31H26" stroke={C.green} strokeWidth="2.3"/>
      <circle cx="34" cy="35" r="7" fill={C.lime}/>
      <path d="M31 35l2 2 4-5" fill="none" stroke={C.deep} strokeWidth="1.8"/>
    </>}
    {key === 'payment' && <>
      <rect x="7" y="12" width="34" height="25" rx="5" fill={C.mint}/>
      <path d="M7 19H41" stroke={C.teal} strokeWidth="4"/>
      <path d="M13 28H22" stroke={C.white} strokeWidth="3"/>
      <circle cx="33" cy="29" r="4" fill={C.lime}/>
      <path d="M31 29l1.5 1.5 3-3" fill="none" stroke={C.deep} strokeWidth="1.5"/>
    </>}
    {key === 'bell' && <>
      <path d="M12 32Q16 28 16 21Q16 12 24 12Q32 12 32 21Q32 28 36 32Z" fill={C.lime}/>
      <path d="M10 32H38Q36 37 24 37Q12 37 10 32Z" fill={C.green}/>
      <path d="M21 40Q24 43 27 40" fill="none" stroke={C.teal} strokeWidth="2"/>
      <circle cx="36" cy="11" r="5" fill={C.teal} stroke="none"/><circle cx="36" cy="11" r="1.3" fill={C.white} stroke="none"/>
    </>}
    {key === 'people' && <>
      <circle cx="20" cy="17" r="7" fill={C.lime}/>
      <circle cx="33" cy="20" r="5" fill={C.mint}/>
      <path d="M7 38Q8 25 20 25Q32 25 33 38Z" fill={C.green}/>
      <path d="M29 30Q39 27 42 38H31" fill={C.teal} stroke="none"/>
      <circle cx="18" cy="17" r="1" fill={C.ink} stroke="none"/><circle cx="22" cy="17" r="1" fill={C.ink} stroke="none"/>
      <path d="M17 20Q20 23 23 20" fill="none" stroke={C.ink} strokeWidth="1.3"/>
    </>}
    {key === 'travel' && <>
      <circle cx="32" cy="14" r="7" fill={C.lime} stroke="none"/>
      <path d="M7 27L21 22L26 9Q27 7 29 9L31 11L29 24L39 28Q42 30 39 32L36 33L25 29L17 39L14 38L17 28L8 30Z" fill={C.mint} stroke={C.teal} strokeWidth="1.5"/>
      <path d="M14 38L17 28" stroke={C.green} strokeWidth="2"/>
    </>}
    {key === 'health' && <>
      <path d="M24 39S8 29 8 18Q8 8 18 11L24 17L30 11Q40 8 40 18Q40 29 24 39Z" fill={C.mint} stroke={C.teal} strokeWidth="1.5"/>
      <path d="M24 17V31M17 24H31" stroke={C.green} strokeWidth="4"/>
      <path d="M6 15l2 2 3-4M39 34l2 2 3-4" fill="none" stroke={C.lime} strokeWidth="2.5"/>
    </>}
    {key === 'settings' && <>
      <path d="M21 7H27L29 12L33 14L38 12L41 18L37 22V27L41 31L38 37L32 35L28 38L27 43H21L19 38L15 36L10 38L7 32L11 28V23L7 19L10 13L16 15L19 12Z" fill={C.mint} stroke={C.teal} strokeWidth="1.5"/>
      <circle cx="24" cy="25" r="7" fill={C.pale} stroke={C.green} strokeWidth="2"/>
      <circle cx="24" cy="25" r="3" fill={C.lime} stroke="none"/>
    </>}
    {key === 'help' && <>
      <path d="M8 12Q8 8 13 8H35Q40 8 40 13V28Q40 33 35 33H23L15 40V33H13Q8 33 8 28Z" fill={C.mint} stroke={C.teal} strokeWidth="1.5"/>
      <path d="M20 18Q20 13 25 13Q30 13 30 18Q30 21 25 23V26" fill="none" stroke={C.green} strokeWidth="2.8"/>
      <circle cx="25" cy="29.5" r="1.5" fill={C.lime} stroke="none"/>
    </>}
    {key === 'bank' && <>
      <path d="M6 20L24 8L42 20Z" fill={C.teal} stroke="none"/>
      <rect x="9" y="22" width="30" height="3" fill={C.green} stroke="none"/>
      <path d="M12 25v12M19 25v12M29 25v12M36 25v12" stroke={C.teal} strokeWidth="2.6"/>
      <path d="M7 39h34" stroke={C.deep} strokeWidth="3"/>
      <circle cx="24" cy="15" r="2.2" fill={C.lime} stroke="none"/>
    </>}
    {key === 'library' && <>
      <path d="M9 36V13Q9 10 13 10H18V36Z" fill={C.mint} stroke={C.teal} strokeWidth="1.4"/>
      <path d="M19 36V11Q19 9 23 9H28V36Z" fill={C.lime} stroke={C.teal} strokeWidth="1.4"/>
      <path d="M29 36V14Q29 11 33 12L38 13V36Z" fill={C.pale} stroke={C.teal} strokeWidth="1.4"/>
      <path d="M8 36H39" stroke={C.deep} strokeWidth="2.5"/>
    </>}
    {key === 'review' && <>
      <path d="M13 11Q13 8 16 8H32Q35 8 35 11V37Q35 40 32 40H16Q13 40 13 37Z" fill={C.pale} stroke={C.teal} strokeWidth="1.6"/>
      <rect x="18" y="6" width="12" height="6" rx="2" fill={C.green} stroke="none"/>
      <path d="M17 24l4 4 9-10" fill="none" stroke={C.teal} strokeWidth="3"/>
      <circle cx="34" cy="34" r="6" fill={C.lime} stroke="none"/>
      <path d="M31.5 34l2 2 3.5-4" fill="none" stroke={C.deep} strokeWidth="1.6"/>
    </>}
    {key === 'tier' && <>
      <rect x="7" y="29" width="9" height="11" rx="2" fill={C.mint} stroke="none"/>
      <rect x="19" y="22" width="9" height="18" rx="2" fill={C.teal} stroke="none"/>
      <rect x="31" y="14" width="9" height="26" rx="2" fill={C.green} stroke="none"/>
      <circle cx="35" cy="8" r="5" fill={C.lime} stroke="none"/>
      <path d="m35 5 1 2 2 .3-1.5 1.3.4 2-1.9-1.1-1.9 1.1.4-2L31 7.3l2-.3Z" fill={C.deep} stroke="none"/>
    </>}
    {key === 'palette' && <>
      <path d="M8 24Q8 9 24 9Q40 9 40 23Q40 32 31 32H27Q24 32 24 35Q24 40 19 40Q8 40 8 24Z" fill={C.mint} stroke={C.teal} strokeWidth="1.4"/>
      <circle cx="16" cy="19" r="3" fill={C.teal} stroke="none"/>
      <circle cx="24" cy="15" r="3" fill={C.lime} stroke="none"/>
      <circle cx="32" cy="19" r="3" fill={C.green} stroke="none"/>
      <circle cx="34" cy="27" r="3" fill={C.deep} stroke="none"/>
    </>}
    {key === 'network' && <>
      <path d="M24 22L10 11M24 22L38 12M24 22L11 36M24 22L37 35" stroke={C.teal} strokeWidth="2"/>
      <circle cx="24" cy="22" r="7" fill={C.green} stroke="none"/>
      <circle cx="10" cy="11" r="5" fill={C.lime} stroke="none"/>
      <circle cx="38" cy="12" r="5" fill={C.mint} stroke="none"/>
      <circle cx="11" cy="36" r="5" fill={C.mint} stroke="none"/>
      <circle cx="37" cy="35" r="5" fill={C.lime} stroke="none"/>
    </>}
    {key === 'renewal' && <>
      <rect x="9" y="10" width="30" height="27" rx="6" fill={C.pale} stroke={C.teal} strokeWidth="1.5"/>
      <path d="M16 23a8 8 0 0 1 13-5l2 2" fill="none" stroke={C.green} strokeWidth="3"/>
      <path d="M31 17v5h-5" fill="none" stroke={C.green} strokeWidth="3"/>
      <path d="M32 25a8 8 0 0 1-13 5l-2-2" fill="none" stroke={C.lime} strokeWidth="3"/>
      <path d="M17 31v-5h5" fill="none" stroke={C.lime} strokeWidth="3"/>
    </>}
    {key === 'chart' && <>
      <path d="M8 38V12Q8 9 11 9H37Q40 9 40 12V38Z" fill={C.pale} stroke={C.teal} strokeWidth="1.5"/>
      <path d="M14 33V25M22 33V18M30 33V22" stroke={C.green} strokeWidth="4"/>
      <path d="M13 20l7-5 6 2 8-7" fill="none" stroke={C.lime} strokeWidth="2.6"/>
      <circle cx="34" cy="10" r="3" fill={C.lime} stroke="none"/>
    </>}
    {key === 'box' && <>
      <path d="M8 16L24 8L40 16L24 24Z" fill={C.teal} stroke="none"/>
      <path d="M8 16V33L24 41V24Z" fill={C.green} stroke="none"/>
      <path d="M40 16V33L24 41V24Z" fill={C.mint} stroke="none"/>
      <path d="M24 24V41" stroke={C.white} strokeOpacity=".6"/>
      <path d="M16 12L32 20" stroke={C.white} strokeOpacity=".6"/>
    </>}
    {key === 'spark' && <>
      <path d="M24 5L29 18L42 24L29 29L24 42L19 29L6 24L19 18Z" fill={C.mint} stroke={C.teal} strokeWidth="1.5"/>
      <circle cx="37" cy="10" r="4" fill={C.lime} stroke="none"/><circle cx="10" cy="36" r="3" fill={C.green} stroke="none"/>
    </>}
  </g>;
}

export default function SurePathIllustrationIcon({ id, size = 48, className = '', active = false }: Props) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true" focusable="false" role="img">
    <Art id={id}/>
    {active && <circle cx="40" cy="39" r="4" fill={C.lime} stroke={C.white} strokeWidth="1.5"/>}
  </svg>;
}
