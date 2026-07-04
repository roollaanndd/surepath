import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Language } from '../../types';
import {
  getExpiringOrders,
  upsertRenewal,
  markRenewalReminderSent,
  getRenewalsByAgent,
  type SpPolicyOrder,
  type SpRenewal,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalModal from './RenewalModal';

interface Props {
  agentId: string;
  lang: Language;
  agent: any;
}

type FilterBand = 'ALL' | '7' | '14' | '30';

const BANDS: Array<{ id: FilterBand; labelEn: string; labelId: string }> = [
  { id: 'ALL', labelEn: 'All',       labelId: 'Semua' },
  { id: '7',   labelEn: '≤7 days',   labelId: '≤7 hari' },
  { id: '14',  labelEn: '8–14 days', labelId: '8–14 hari' },
  { id: '30',  labelEn: '15–30 days',labelId: '15–30 hari' },
];

const PRODUCT_BADGE: Record<string, string> = {
  CAR:    'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  TRAVEL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  PA:     'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  MPAR:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end   = new Date(dateStr); end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function daysPillClass(days: number): string {
  if (days <= 7)  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
  if (days <= 14) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
}

function buildWALink(phone: string, order: SpPolicyOrder, days: number): string {
  const text = [
    `Halo ${order.client_name},`,
    ``,
    `Polis asuransi ${order.product_name} Anda (No. ${order.policy_number ?? '-'}) akan berakhir dalam ${days} hari (${order.end_date ?? '-'}).`,
    ``,
    `Segera hubungi kami untuk proses renewal agar perlindungan Anda tetap aktif.`,
    ``,
    `Terima kasih,`,
    `Mitra SurePath`,
  ].join('\n');
  const normalized = phone.replace(/\D/g, '').replace(/^0/, '62');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

function fmt(d?: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl ${color}`}>
      <span className="text-base font-black leading-none">{count}</span>
      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const RenewalManager: React.FC<Props> = ({ agentId, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [orders,   setOrders]   = useState<SpPolicyOrder[]>([]);
  const [renewals, setRenewals] = useState<SpRenewal[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterBand>('ALL');
  const [modal,    setModal]    = useState<SpPolicyOrder | null>(null);
  const [sentIds,  setSentIds]  = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersData, renewalsData] = await Promise.all([
      getExpiringOrders(agentId, 30),
      getRenewalsByAgent(agentId),
    ]);
    setOrders(ordersData);
    setRenewals(renewalsData);

    // Seed any orders not yet tracked in sp_renewals
    const existing = new Set(renewalsData.map((r) => r.original_order_id));
    for (const o of ordersData) {
      if (!existing.has(o.id)) {
        upsertRenewal({
          original_order_id: o.id,
          agent_id:          agentId,
          client_name:       o.client_name,
          client_phone:      o.client_phone,
          product_name:      o.product_name,
          expiry_date:       o.end_date ?? '',
        }).catch(() => {});
      }
    }

    setLoading(false);
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  const count7  = orders.filter((o) => daysUntil(o.end_date ?? '') <= 7).length;
  const count14 = orders.filter((o) => { const d = daysUntil(o.end_date ?? ''); return d >= 8 && d <= 14; }).length;
  const count30 = orders.filter((o) => { const d = daysUntil(o.end_date ?? ''); return d >= 15 && d <= 30; }).length;

  const filtered = orders.filter((o) => {
    const days = daysUntil(o.end_date ?? '');
    if (filter === '7')  return days <= 7;
    if (filter === '14') return days >= 8 && days <= 14;
    if (filter === '30') return days >= 15 && days <= 30;
    return true;
  });

  const renewalMap = new Map(renewals.map((r) => [r.original_order_id, r]));

  const handleWAClick = async (order: SpPolicyOrder) => {
    await markRenewalReminderSent(order.id);
    setSentIds((prev) => new Set(prev).add(order.id));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#16a34a]/20 border-t-[#16a34a] animate-spin motion-reduce:animate-none" />
        <p className="text-sm text-slate-400 font-bold">{t('Loading renewals…', 'Memuat renewal…')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 max-w-2xl mx-auto font-sora">
      {/* Stats header */}
      <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          {t('Expiring Policies', 'Polis Akan Berakhir')}
        </p>
        <div className="flex gap-3 flex-wrap">
          <StatPill label={t('≤7 days','≤7 hari')}   count={count7}         color="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" />
          <StatPill label={t('≤14 days','≤14 hari')} count={count14}        color="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" />
          <StatPill label={t('≤30 days','≤30 hari')} count={count30}        color="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" />
          <StatPill label={t('Total','Total')}        count={orders.length}  color="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BANDS.map((b) => (
          <button
            key={b.id}
            onClick={() => setFilter(b.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === b.id
                ? 'bg-[#16a34a] text-white shadow-md shadow-[#16a34a]/25'
                : 'bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            {lang === Language.EN ? b.labelEn : b.labelId}
          </button>
        ))}
      </div>

      {/* Policy list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-[2rem] bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle size={24} className="text-emerald-500" />
          </div>
          <p className="font-black text-sm">{t('No expiring policies', 'Tidak ada polis yang akan berakhir')}</p>
          <p className="text-xs text-slate-400">{t('in this range', 'dalam rentang ini')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const days        = daysUntil(order.end_date ?? '');
            const renewal     = renewalMap.get(order.id);
            const alreadySent = sentIds.has(order.id) || !!renewal?.reminder_sent_at;
            const hasRenewal  = !!renewal?.renewal_order_id;
            const productKey  = order.product_code?.split('-')[0] ?? '';

            return (
              <div key={order.id} className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4">
                  {/* Client + badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-black text-sm tracking-tight truncate">{order.client_name}</p>
                      {order.policy_number && (
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{order.policy_number}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${PRODUCT_BADGE[productKey] ?? 'bg-slate-100 text-slate-500'}`}>
                      {productKey || order.product_name}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${daysPillClass(days)}`}>
                      <AlertTriangle size={9} />
                      {days <= 0 ? t('Expires today','Habis hari ini') : t(`${days}d left`,`${days} hari lagi`)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{t('Exp:','Berakhir:')} {fmt(order.end_date)}</span>
                    {order.sum_insured > 0 && (
                      <span className="text-[9px] text-slate-400 font-bold">{formatIDR(order.sum_insured)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {order.client_phone ? (
                      <a
                        href={buildWALink(order.client_phone, order, days)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleWAClick(order)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex-shrink-0 active:scale-95 transition-transform shadow-sm ${
                          alreadySent
                            ? 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                            : 'bg-emerald-500 text-white shadow-emerald-500/20'
                        }`}
                      >
                        <MessageCircle size={11} />
                        {alreadySent ? t('Sent','Terkirim') : t('Kirim Reminder WA','Kirim Reminder WA')}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-400">
                        <MessageCircle size={11} />
                        {t('No Phone','Tanpa Telepon')}
                      </span>
                    )}

                    {hasRenewal ? (
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle size={11} />
                        {t('Renewed','Sudah Diperbarui')}
                      </span>
                    ) : (
                      <button
                        onClick={() => setModal(order)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 motion-reduce:active:scale-100 hover:brightness-105 transition-all shadow-md shadow-[#16a34a]/25"
                      >
                        <RefreshCw size={11} />
                        {t('Proses Renewal','Proses Renewal')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <RenewalModal
          order={modal}
          agentId={agentId}
          lang={lang}
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
};

export default RenewalManager;
