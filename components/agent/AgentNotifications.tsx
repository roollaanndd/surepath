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
        className="bg-white rounded-b-[2.5rem] shadow-2xl max-h-[80dvh] flex flex-col font-sora"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xl font-bold text-gray-900">{t('Notifications', 'Notifikasi')}</p>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-medium text-emerald-600"
              >
                {t('Mark all read', 'Tandai semua')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin motion-reduce:animate-none" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 mx-auto text-gray-400">
                <Bell size={22} />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {t('No notifications', 'Tidak ada notifikasi')}
              </p>
              <p className="text-xs text-gray-400">{t('You\'re all caught up', 'Semua sudah terbaca')}</p>
            </div>
          ) : (
            notifications.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
              return (
                <button
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className="flex items-start gap-3 px-5 py-4 bg-white border-b border-gray-50 active:bg-gray-50 transition-colors w-full text-left"
                >
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                  )}
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <meta.Icon size={15} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {n.body}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.metadata?.link && (
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
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
