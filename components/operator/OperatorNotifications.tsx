// OperatorNotifications.tsx — slide-in drawer listing all admin notifications.
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCheck } from 'lucide-react';
import { Language } from '../../types';
import { SkeletonCard, useToast } from '../ui';
import { AgentEmpty } from '../agent/AgentArt';
import { listNotifications, markNotificationRead, markAllNotificationsRead, type OperatorNotification } from '../../services/operatorService';
import ModuleIcon from '../shared/ModuleIcon';

interface Props {
  lang: Language;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const ICON_MAP: Record<string, string> = {
  NEW_ORDER:        'policy_orders',
  NEW_CLAIM:        'claims_admin',
  NEW_WITHDRAWAL:   'withdrawals',
  NEW_AGENT:        'agents',
  NEW_CUSTOMER:     'clients',
  NEW_PAYMENT:      'payments',
};

const COLOR_MAP: Record<string, string> = {
  NEW_ORDER:        'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  NEW_CLAIM:        'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
  NEW_WITHDRAWAL:   'bg-amber-50 text-ds-amber dark:bg-amber-950/30 dark:text-amber-400',
  NEW_AGENT:        'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400',
  NEW_CUSTOMER:     'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400',
  NEW_PAYMENT:      'bg-ds-green-tint text-ds-green',
};

const OperatorNotifications: React.FC<Props> = ({ onClose, onNavigate }) => {
  const toast = useToast();
  const [items, setItems] = useState<OperatorNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications(false, 100);
      setItems(data);
    } catch (e: any) {
      console.error('OperatorNotifications load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('Semua notifikasi ditandai dibaca');
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
  };

  const handleClick = async (n: OperatorNotification) => {
    if (!n.read) {
      try { await markNotificationRead(n.id); } catch {}
    }
    const type = String(n.type ?? '');
    if (type === 'NEW_ORDER') onNavigate('orders');
    else if (type === 'NEW_CLAIM') onNavigate('claims');
    else if (type === 'NEW_WITHDRAWAL') onNavigate('withdrawals');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-ds-card rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="w-12 h-1 bg-ds-border rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ds-border shrink-0">
          <div className="flex items-center gap-2">
            <ModuleIcon id="notifications" size={30} />
            <h3 className="text-base font-black text-ds-ink">Notifikasi</h3>
            {items.filter(i => !i.read).length > 0 && (
              <span className="bg-ds-green text-ds-on-green text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {items.filter(i => !i.read).length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.some(i => !i.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-ds-green active:scale-95 transition-transform flex items-center gap-1"
              >
                <CheckCheck size={12} /> Tandai semua
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-ds-card2 text-ds-ink3 active:scale-95 transition-transform">✕</button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : items.length === 0 ? (
            <AgentEmpty
              title="Belum ada notifikasi"
              desc="Notifikasi pengajuan baru akan muncul di sini secara real-time."
            />
          ) : (
            <div className="space-y-2">
              {items.map(n => {
                const iconId = ICON_MAP[String(n.type)] ?? 'notifications';
                const color = COLOR_MAP[String(n.type)] ?? 'bg-ds-card2 text-ds-ink2';
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all active:scale-[0.99] ${
                      n.read
                        ? 'bg-ds-card2 border-ds-border opacity-60'
                        : 'bg-ds-card border-ds-green/30 hover:shadow-ds-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                        <ModuleIcon id={iconId} size={26} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ds-ink truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-ds-ink2 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-ds-ink3 mt-1">{new Date(n.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-ds-green shrink-0 mt-2" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperatorNotifications;
