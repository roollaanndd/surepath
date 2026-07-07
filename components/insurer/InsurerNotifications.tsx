// InsurerNotifications.tsx — slide-in drawer showing recent orders + decisions.
// Simplified version: shows the insurer's recent orders as activity feed.

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, FileText, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { SkeletonCard, EmptyState } from '../ui';
import { getInsurerDashboard, type InsurerOrder } from '../../services/insurerService';

interface Props {
  authToken: string;
  lang: Language;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const ICON_MAP: Record<string, any> = {
  SUBMITTED:    Clock,
  UNDER_REVIEW: AlertTriangle,
  APPROVED:     CheckCircle2,
  ISSUED:       ShieldCheck,
  REJECTED:     XCircle,
};

const COLOR_MAP: Record<string, string> = {
  SUBMITTED:    'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  UNDER_REVIEW: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  APPROVED:     'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  ISSUED:       'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
  REJECTED:     'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
};

const InsurerNotifications: React.FC<Props> = ({ authToken, onClose, onNavigate }) => {
  const [orders, setOrders] = useState<InsurerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getInsurerDashboard(authToken);
      setOrders(d.orders.slice(0, 20));
    } catch (e) {
      console.error('InsurerNotifications load:', e);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { load(); }, [load]);

  const handleClick = () => {
    onNavigate('orders');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-ds-card rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="w-12 h-1 bg-ds-border rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between p-4 border-b border-ds-border shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-purple-500" />
            <h3 className="text-base font-black text-ds-ink">Aktivitas Terbaru</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-ds-card2 text-ds-ink3 active:scale-95 transition-transform">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Belum ada aktivitas"
              description="Pengajuan polis baru akan muncul di sini secara real-time."
            />
          ) : (
            <div className="space-y-2">
              {orders.map(o => {
                const Icon = ICON_MAP[o.status] ?? FileText;
                const color = COLOR_MAP[o.status] ?? 'bg-ds-card2 text-ds-ink2';
                return (
                  <button
                    key={o.id}
                    onClick={() => handleClick()}
                    className="w-full text-left p-3 rounded-2xl border border-ds-border bg-ds-card hover:shadow-ds-sm active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ds-ink truncate">{o.client_name}</p>
                        <p className="text-xs text-ds-ink2 mt-0.5 truncate">{o.order_number} · {o.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${color}`}>
                            {o.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-ds-ink3">{new Date(o.created_at).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
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

export default InsurerNotifications;
