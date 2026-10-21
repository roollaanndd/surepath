// ─────────────────────────────────────────────────────────────────────────────
// MarketingPortal.tsx — shell untuk /marketingapp (karyawan marketing/sales).
//
// Layout mengikuti apps agen & operator: header glass + bottom-nav + area
// scroll. Isinya CRM, bukan laporan: yang dijawab bukan "berapa" tapi "siapa
// yang harus saya hubungi hari ini, dan apa yang saya janjikan terakhir kali".
//
// Kolom ANGKA produksi (premi, komisi, status bayar) belum ada di sini dengan
// sengaja — sumbernya belum sah sampai Fase 0 beres. Lihat
// docs/MARKETING_CRM_PLAN.md.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Home, Users, ListChecks, LogOut } from 'lucide-react';
import type { Language } from '../../types';
import { APP_VERSION } from '../../src/version';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import MarketingDashboard from './MarketingDashboard';
import MarketingAgents from './MarketingAgents';
import MarketingQueue from './MarketingQueue';

interface Props {
  marketing: any;
  onLogout: () => void;
  lang?: Language;
}

const TABS: PortalTab[] = [
  { id: 'home', label: 'Beranda', Icon: Home },
  { id: 'agents', label: 'Agen', Icon: Users },
  { id: 'queue', label: 'Antrean', Icon: ListChecks },
];

const MarketingPortal: React.FC<Props> = ({ marketing, onLogout }) => {
  const [tab, setTab] = useState('home');

  return (
    <div className="min-h-dvh bg-ds-bg flex flex-col">
      <header className="sticky top-0 z-40 sp-glass-strong px-4 py-3 flex items-center justify-between"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-ds-ink3">Marketing</div>
          <div className="font-black text-ds-ink1 truncate">{marketing?.name ?? marketing?.email ?? '—'}</div>
        </div>
        <button type="button" onClick={onLogout} aria-label="Keluar"
          className="p-2 rounded-xl text-ds-ink3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 pb-32">
        {tab === 'home' && <MarketingDashboard />}
        {tab === 'agents' && <MarketingAgents />}
        {tab === 'queue' && <MarketingQueue />}
        <p className="text-center text-[10px] text-ds-ink3 pt-6">v{APP_VERSION}</p>
      </main>

      <PortalTabBar tabs={TABS} activeId={tab} onSelect={setTab} modernIcons />
    </div>
  );
};

export default MarketingPortal;
