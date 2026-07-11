import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Wallet, AlertTriangle, FileText, CheckCircle, Info, ChevronRight
} from 'lucide-react';
import { Language } from '../../types';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  type SpNotification,
} from '../../services/supabaseService';
import { AgentEmpty } from './AgentArt';

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
        {/* Header — gradient banner */}
        <div className="relative overflow-hidden px-5 pt-12 pb-4 flex items-center justify-between text-white"
          style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 60%, #0B5E3B 100%)' }}>
          <div aria-hidden className="absolute -top-10 -right-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.25), transparent 70%)' }} />
          <div className="relative z-10">
            <p className="text-xl font-black">{t('Notifications', 'Notifikasi')}</p>
            {unread > 0 && <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-0.5">{unread} {t('unread', 'belum dibaca')}</p>}
          </div>
          <div className="relative z-10 flex items-center gap-3">
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-bold text-emerald-300"
              >
                {t('Mark all read', 'Tandai semua')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
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
            <AgentEmpty
              title={t('No notifications', 'Tidak ada notifikasi')}
              desc={t('You\'re all caught up', 'Semua sudah terbaca')}
            />
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
