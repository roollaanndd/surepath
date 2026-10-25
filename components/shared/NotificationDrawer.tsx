import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Wallet, AlertTriangle, FileText, CheckCircle, Info, ChevronRight, BellOff,
  ShieldCheck, ClipboardList, XCircle, BadgeCheck, UserX,
} from 'lucide-react';
import { Language } from '../../types';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  type SpNotification,
} from '../../services/supabaseService';

/* ─── NotificationDrawer — one notification surface for every portal ─────────
   Was `agent/AgentNotifications`; generalised so the Customer portal gets the
   same top-drawer instead of a cramped 288px dropdown. Colors run on DS tokens
   so it survives dark mode. */

export interface NotificationDrawerProps {
  /** sp_users.id of the signed-in user (agent or customer) */
  userId: string;
  lang: Language;
  onClose: () => void;
  /** Follows `metadata.link` when a notification is tapped */
  onNavigate?: (page: string) => void;
  /** Portal-specific empty-state illustration; falls back to a plain one */
  emptyArt?: React.ComponentType<{ title: string; desc: string }>;
}

const TYPE_META: Record<SpNotification['type'], { Icon: any; color: string }> = {
  COMMISSION_EARNED: { Icon: Wallet,        color: 'text-ds-green' },
  CLAIM_UPDATE:      { Icon: FileText,      color: 'text-ds-blue' },
  NEW_CLAIM:         { Icon: ClipboardList, color: 'text-ds-blue' },
  ORDER_UPDATE:      { Icon: ClipboardList, color: 'text-ds-blue' },
  POLICY_ISSUED:     { Icon: ShieldCheck,   color: 'text-ds-green' },
  POLICY_REJECTED:   { Icon: XCircle,       color: 'text-rose-500' },
  AGENT_VERIFIED:    { Icon: BadgeCheck,    color: 'text-ds-green' },
  AGENT_REJECTED:    { Icon: UserX,         color: 'text-rose-500' },
  RENEWAL_ALERT:     { Icon: AlertTriangle, color: 'text-ds-amber' },
  QUOTE_ACCEPTED:    { Icon: CheckCircle,   color: 'text-ds-green' },
  SYSTEM:            { Icon: Info,          color: 'text-ds-ink3' },
};

function timeAgo(iso: string | undefined, lang: Language): string {
  if (!iso) return '';
  const id = lang !== Language.EN;
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return id ? 'Baru saja' : 'Just now';
  if (m < 60) return id ? `${m} mnt lalu` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return id ? `${h} jam lalu` : `${h}h ago`;
  return id ? `${Math.floor(h / 24)} hr lalu` : `${Math.floor(h / 24)}d ago`;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  userId, lang, onClose, onNavigate, emptyArt: EmptyArt,
}) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [notifications, setNotifications] = useState<SpNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getNotifications(userId);
    setNotifications(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleRead = async (n: SpNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.metadata?.link && onNavigate) {
      onNavigate(n.metadata.link);
      onClose();
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div
        className="bg-ds-card rounded-b-[2.5rem] shadow-2xl max-h-[80dvh] flex flex-col font-sora"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — the portal's dark hero gradient */}
        <div
          className="relative overflow-hidden px-5 pt-12 pb-4 flex items-center justify-between text-white"
          style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 60%, #0B5E3B 100%)' }}
        >
          <div aria-hidden className="absolute -top-10 -right-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.25), transparent 70%)' }} />
          <div className="relative z-10">
            <p className="text-xl font-black">{t('Notifications', 'Notifikasi')}</p>
            {unread > 0 && (
              <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-0.5">
                {unread} {t('unread', 'belum dibaca')}
              </p>
            )}
          </div>
          <div className="relative z-10 flex items-center gap-3">
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs font-bold text-emerald-300">
                {t('Mark all read', 'Tandai semua')}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label={t('Close', 'Tutup')}
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
              <div className="w-8 h-8 rounded-full border-4 border-ds-green/20 border-t-ds-green animate-spin motion-reduce:animate-none" />
            </div>
          ) : notifications.length === 0 ? (
            EmptyArt ? (
              <EmptyArt
                title={t('No notifications', 'Tidak ada notifikasi')}
                desc={t('You\'re all caught up', 'Semua sudah terbaca')}
              />
            ) : (
              <div className="flex flex-col items-center text-center gap-2 py-14 px-8">
                <div className="w-12 h-12 rounded-2xl bg-ds-green-tint flex items-center justify-center">
                  <BellOff size={20} className="text-ds-green" />
                </div>
                <p className="text-sm font-bold text-ds-ink">{t('No notifications', 'Tidak ada notifikasi')}</p>
                <p className="text-xs text-ds-ink3">{t('You\'re all caught up', 'Semua sudah terbaca')}</p>
              </div>
            )
          ) : (
            notifications.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
              return (
                <button
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className="flex items-start gap-3 px-5 py-4 bg-ds-card border-b border-ds-border active:bg-ds-card2 transition-colors w-full text-left"
                >
                  {!n.read && <div className="w-2 h-2 rounded-full bg-ds-green flex-shrink-0 mt-1.5" />}
                  <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                    <meta.Icon size={15} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ds-ink leading-tight">{n.title}</p>
                    <p className="text-xs text-ds-ink2 mt-0.5 leading-relaxed">{n.body}</p>
                    <span className="text-[10px] text-ds-ink3 mt-1 block">{timeAgo(n.created_at, lang)}</span>
                  </div>
                  {n.metadata?.link && onNavigate && (
                    <ChevronRight size={14} className="text-ds-ink3 flex-shrink-0 mt-0.5" />
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

export default NotificationDrawer;
