import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Bell, Wallet, AlertTriangle, FileText, CheckCircle, Info, ChevronRight
} from 'lucide-react';
import { Language } from '../../types';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  type SpNotification,
} from '../../services/supabaseService';

interface Props {
  agentId: string;
  lang: Language;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const TYPE_META: Record<SpNotification['type'], { Icon: any; color: string; bg: string }> = {
  COMMISSION_EARNED: { Icon: Wallet,       color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CLAIM_UPDATE:      { Icon: FileText,     color: 'text-blue-500',    bg: 'bg-blue-500/10' },
  RENEWAL_ALERT:     { Icon: AlertTriangle,color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  QUOTE_ACCEPTED:    { Icon: CheckCircle,  color: 'text-[#16a34a]', bg: 'bg-[#16a34a]/10' },
  SYSTEM:            { Icon: Info,         color: 'text-slate-400',   bg: 'bg-slate-500/10' },
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AgentNotifications: React.FC<Props> = ({ agentId, lang, onClose, onNavigate }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [notifications, setNotifications] = useState<SpNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getNotifications(agentId);
    setNotifications(data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  const handleRead = async (n: SpNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.metadata?.link) {
      onNavigate(n.metadata.link);
      onClose();
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(agentId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111] rounded-b-[2.5rem] shadow-2xl max-h-[80dvh] flex flex-col font-sora"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#16a34a]/10 rounded-2xl flex items-center justify-center">
              <Bell size={16} className="text-[#16a34a]" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{t('Notifications', 'Notifikasi')}</p>
              {unread > 0 && (
                <p className="text-[10px] font-bold text-[#16a34a] uppercase tracking-widest leading-none mt-0.5">
                  {unread} {t('unread', 'belum dibaca')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[10px] font-black uppercase tracking-widest text-[#16a34a] px-3 py-1.5 rounded-full bg-[#16a34a]/10"
              >
                {t('Mark all read', 'Tandai semua')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-white/5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-[#16a34a]/20 border-t-[#16a34a] animate-spin motion-reduce:animate-none" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center px-6">
              <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-4">
                <Bell size={24} className="text-slate-300" />
              </div>
              <p className="font-black text-sm text-slate-400 uppercase tracking-widest">
                {t('No notifications', 'Tidak ada notifikasi')}
              </p>
            </div>
          ) : (
            notifications.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
              return (
                <button
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors ${
                    n.read ? 'opacity-60' : 'bg-[#16a34a]/[0.03]'
                  } hover:bg-slate-50 dark:hover:bg-white/5`}
                >
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <meta.Icon size={15} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-black leading-tight ${n.read ? '' : 'text-slate-900 dark:text-white'}`}>
                        {n.title}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 flex-shrink-0 mt-0.5">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[#16a34a] flex-shrink-0 mt-1.5" />
                  )}
                  {n.metadata?.link && (
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
      {/* Dimmed backdrop below the drawer */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
    </div>
  );
};

export { AgentNotifications };
export type { SpNotification };
export { getNotifications };
