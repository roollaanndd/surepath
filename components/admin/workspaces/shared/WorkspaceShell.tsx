import React from 'react';
import { LogOut } from 'lucide-react';
import { WORKSPACE_META, type AdminWorkspaceKey } from '../../../../src/admin/roleConfig';

interface WorkspaceShellProps {
  workspace: AdminWorkspaceKey;
  userRole: string;
  userName?: string;
  onLogout: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  workspace,
  userRole,
  userName,
  onLogout,
  children,
  actions,
}) => {
  const meta = WORKSPACE_META[workspace];

  return (
    <div className="min-h-screen bg-ds-bg text-ds-ink transition-colors">
      <header className="sticky top-0 z-40 border-b border-ds-border bg-ds-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* min-w-0 + truncate: at 390px the title used to break mid-word
              ("Comman / d Center") and the subtitle ran to three lines. */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${meta.accent}, var(--ds-admin-dark-forest))` }}>
              <span className="text-xs font-black text-white">SP</span>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate whitespace-nowrap text-sm font-black tracking-tight">{meta.title}</h1>
                <span className="hidden shrink-0 rounded-full border border-ds-border px-2 py-0.5 text-2xs font-black uppercase tracking-[0.18em] text-ds-ink3 sm:inline-block">
                  {userRole.replace('_', ' ')}
                </span>
              </div>
              <p className="truncate text-2xs font-bold uppercase tracking-[0.16em] text-ds-ink3">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <button
              onClick={onLogout}
              className="flex h-9 items-center gap-1.5 rounded-full border border-ds-border px-3 text-xs font-bold text-ds-ink3 transition-all hover:text-ds-ink"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            {userName && (
              <div className="hidden md:flex items-center gap-2 rounded-full border border-ds-border px-3 py-1">
                <div className="h-6 w-6 rounded-full bg-ds-green-tint text-center text-2xs font-black leading-6 text-ds-green">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-ds-ink">{userName}</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
};

export default WorkspaceShell;
