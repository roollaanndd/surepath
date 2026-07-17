// AppSelector.tsx — Multi-app picker screen.
// Shown when a user has more than 1 entry in sp_users.allowed_apps.
// User picks which app to enter; we then navigate to that app's route.
//
// The selected app is remembered in localStorage so the next login auto-routes
// (until user explicitly logs out, which clears the choice).

import React, { useState } from 'react';
import { Home, Briefcase, ShieldCheck, Settings, ArrowRight, LogOut } from 'lucide-react';

interface AppSelectorProps {
  user: any;
  onSelect: (app: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN') => void;
  onLogout: () => void;
}

const APPS: Array<{
  id: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN';
  label: string;
  desc: string;
  Icon: React.FC<any>;
  color: string;
  bg: string;
}> = [
  {
    id: 'CUSTOMER',
    label: 'Customer App',
    desc: 'Beli polis, klaim, lacak proteksi Anda',
    Icon: Home,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    id: 'AGENT',
    label: 'Agent App',
    desc: 'Buat penawaran, kelola nasabah, komisi',
    Icon: Briefcase,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    id: 'OPERATOR',
    label: 'Operator App',
    desc: 'Approve polis, klaim, verifikasi agen',
    Icon: ShieldCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    id: 'ADMIN',
    label: 'Admin CMS',
    desc: 'Kelola produk, rates, users, laporan',
    Icon: Settings,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
];

const AppSelector: React.FC<AppSelectorProps> = ({ user, onSelect, onLogout }) => {
  const allowedApps: string[] = Array.isArray(user?.allowed_apps) ? user.allowed_apps : [];
  const visibleApps = APPS.filter(a => allowedApps.includes(a.id));
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-ds-bg dark:bg-[#080B12] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sora">
      <div aria-hidden className="sp-ambient" />

      {/* Header */}
      <div className="relative z-10 text-center mb-8">
        <div className="w-16 h-16 rounded-2xl sp-glass mx-auto mb-4 flex items-center justify-center">
          <img loading="lazy" src="/logo-sm.png" alt="SurePath" className="w-11 h-12 object-contain" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3">
          Selamat datang kembali
        </p>
        <h1 className="text-2xl font-black tracking-tight text-ds-ink mt-1">
          {user?.name?.split(' ')[0] ?? 'Pengguna'} 👋
        </h1>
        <p className="text-xs text-ds-ink3 mt-2 max-w-xs">
          Anda memiliki akses ke beberapa aplikasi. Pilih yang ingin Anda buka.
        </p>
      </div>

      {/* App cards */}
      <div className="relative z-10 w-full max-w-md space-y-3">
        {visibleApps.map(({ id, label, desc, Icon, color, bg }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${
              hovered === id
                ? 'border-emerald-400 dark:border-emerald-500 shadow-ds-md'
                : 'border-ds-border bg-ds-card'
            }`}
            style={{ background: hovered === id ? undefined : 'var(--ds-card)' }}
          >
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={22} className={color} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-black text-ds-ink">{label}</p>
              <p className="text-xs text-ds-ink3 mt-0.5 truncate">{desc}</p>
            </div>
            <ArrowRight size={18} className="text-ds-ink3 shrink-0" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="relative z-10 mt-8 flex items-center gap-2 text-xs font-bold text-ds-ink3 hover:text-rose-500 transition-colors"
      >
        <LogOut size={12} /> Keluar
      </button>

      <p className="relative z-10 mt-6 text-[10px] text-ds-ink3 font-bold uppercase tracking-widest">
        SurePath · PT Ruang Proteksi Indonesia
      </p>
    </div>
  );
};

export default AppSelector;
