import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Shield, User, Briefcase, Headphones, Building2, Megaphone, X } from 'lucide-react';
import { Language } from '../../types';

interface Props {
  pathname: string;
  navigate: (path: string) => void;
  lang: Language;
}

/**
 * v2.8.0 — App switcher untuk MASTER_ADMIN.
 *
 * Master admin sekarang punya akses ke semua platform (hasAppAccess superuser
 * + gate per-app). Komponen ini adalah cara berpindahnya: tombol mengapung
 * kiri-bawah (sengaja bukan kanan —Pathy launcher menempati kanan-bawah),
 * panel daftar app, app aktif ditandai.
 *
 * Hanya dirender untuk MASTER_ADMIN — pemanggilannya di src/app/routes/index.tsx
 * sudah men-gate peran, jadi komponen ini tidak perlu tahu soal peran.
 */
const APPS: { id: string; path: string; en: string; id_: string; Icon: typeof Shield }[] = [
  { id: 'ADMIN',     path: '/admin',       en: 'Admin CMS',      id_: 'CMS Admin',    Icon: Shield },
  { id: 'CUSTOMER',  path: '/custapp',     en: 'Customer App',   id_: 'App Nasabah',  Icon: User },
  { id: 'AGENT',     path: '/agapps',      en: 'Agent App',      id_: 'App Agen',     Icon: Briefcase },
  { id: 'OPERATOR',  path: '/operatorapp', en: 'Operator App',   id_: 'App Operator', Icon: Headphones },
  { id: 'B2B',       path: '/b2bapps',     en: 'B2B Portal',     id_: 'Portal B2B',   Icon: Building2 },
  { id: 'MARKETING', path: '/marketingapp', en: 'Marketing CRM', id_: 'CRM Marketing', Icon: Megaphone },
];

export const AppSwitcher: React.FC<Props> = ({ pathname, navigate, lang }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const activeApp = APPS.find(a =>
    pathname === a.path || pathname.startsWith(a.path + '/'),
  );

  return (
    <div ref={rootRef} className="fixed bottom-4 left-4 z-[70] print:hidden">
      {open && (
        <div
          role="menu"
          aria-label={t('Pindah aplikasi', 'Switch app')}
          className="absolute bottom-14 left-0 w-60 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t('Master Admin · Semua App', 'Master Admin · All apps')}
            </span>
            <button onClick={() => setOpen(false)} aria-label="Tutup" className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          {APPS.map(({ id, path, en, id_, Icon }) => {
            const active = activeApp?.id === id;
            return (
              <button
                key={id}
                role="menuitem"
                onClick={() => { setOpen(false); if (!active) navigate(path); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} className={active ? 'text-emerald-600' : 'text-slate-400'} />
                {t(en, id_)}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t('Pindah aplikasi', 'Switch app')}
        aria-expanded={open}
        className="w-11 h-11 rounded-full bg-slate-900/85 dark:bg-slate-800/90 text-white shadow-lg ring-1 ring-white/20 flex items-center justify-center active:scale-90 transition-transform duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50"
      >
        {open ? <X size={18} /> : <LayoutGrid size={18} />}
      </button>
    </div>
  );
};

export default AppSwitcher;
