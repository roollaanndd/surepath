// B2BFleetCalendar — roadmap #12: the fleet's renewal calendar.
//
// Every ISSUED policy order owned by the B2B client (gateway scopes to the
// caller) feeds the retention engine's queue, so the finance PIC sees WHICH
// units expire WHEN — grouped by month, triaged by urgency tier, exportable
// as CSV for the finance calendar. Honest scope note: units inside bulk
// batches only appear once they exist as policy orders (single unit orders
// and issued coverage); a batch_item→policy_order linkage is a planned
// migration, and this screen says so instead of pretending coverage.

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { getCustomerOrders } from '../../services/supabaseService';
import {
  buildRenewalQueue, TIER_LABEL_ID, TIER_LABEL_EN, TIER_COLOR,
  formatEndDate, type RenewalCandidate,
} from '../../services/renewalEngine';

/** Deterministic CSV (finance-calendar paste). Bom-free: rows only. */
export function fleetCsv(queue: RenewalCandidate[]): string {
  const head = 'policy_number,product,end_date,tier,days_left';
  const rows = queue.map(q =>
    [q.policyNumber, `"${q.productName.replace(/"/g, '""')}"`, q.endDate.slice(0, 10), q.tier, String(q.daysLeft)].join(','),
  );
  return [head, ...rows].join('\n');
}

interface Props { lang: Language }

const B2BFleetCalendar: React.FC<Props> = ({ lang }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getCustomerOrders>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getCustomerOrders('').then(o => { if (alive) setOrders(o); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const queue = useMemo(() => buildRenewalQueue(orders), [orders]);
  const dueSoon = queue.filter(q => q.tier === 'CRITICAL' || q.tier === 'SOON').length;
  const expired = queue.filter(q => q.tier === 'EXPIRED').length;

  // Group by calendar month of end_date, chronologically.
  const months = useMemo(() => {
    const map = new Map<string, RenewalCandidate[]>();
    for (const q of queue) {
      const key = (q.endDate ?? '').slice(0, 7);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [queue]);

  const monthLabel = (key: string) => {
    const d = new Date(`${key}-01T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', { month: 'long', year: 'numeric' });
  };

  const downloadCsv = () => {
    const blob = new Blob([fleetCsv(queue)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SurePath-Fleet-Renewal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sp-modern-app space-y-5 pb-24">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-ds-border bg-ds-card p-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">{t('Covered units', 'Unit terlindungi')}</p>
          </div>
          <p className="text-xl font-black text-ds-ink mt-1 tabular-nums">{queue.length}</p>
        </div>
        <div className="rounded-2xl border border-ds-border bg-ds-card p-4">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-sky-500" />
            <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">{t('Due ≤30 days', 'Tempo ≤30 hari')}</p>
          </div>
          <p className="text-xl font-black text-ds-ink mt-1 tabular-nums">{dueSoon}</p>
        </div>
        <div className="rounded-2xl border border-ds-border bg-ds-card p-4">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-rose-500" />
            <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">{t('Expired', 'Kedaluwarsa')}</p>
          </div>
          <p className={`text-xl font-black mt-1 tabular-nums ${expired > 0 ? 'text-rose-500' : 'text-ds-ink'}`}>{expired}</p>
        </div>
      </div>

      {/* CSV export */}
      <div className="flex items-center justify-between rounded-2xl border border-ds-border bg-ds-card p-4">
        <p className="text-xs text-ds-ink2 m-0 pr-3">
          {t('Renewal schedule for the finance calendar.', 'Jadwal perpanjangan untuk kalender keuangan.')}
        </p>
        <button
          onClick={downloadCsv}
          disabled={queue.length === 0}
          className="flex items-center gap-2 rounded-xl bg-ds-green px-4 py-2.5 text-xs font-black text-ds-on-green active:scale-95 transition-transform cursor-pointer disabled:opacity-40"
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Month sections */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-ds-border p-10 text-center text-sm text-ds-ink3">
          {t('Loading fleet…', 'Memuat armada…')}
        </div>
      ) : months.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ds-border p-10 text-center text-sm text-ds-ink3">
          {t('No issued unit policies yet.', 'Belum ada polis unit yang diterbitkan.')}
        </div>
      ) : months.map(([key, units]) => (
        <div key={key}>
          <p className="text-xs font-black uppercase tracking-widest text-ds-ink3 mb-2">{monthLabel(key)}</p>
          <div className="space-y-2">
            {units.map(u => {
              const label = lang === Language.EN ? TIER_LABEL_EN[u.tier] : TIER_LABEL_ID[u.tier];
              return (
                <div key={u.orderId} className="flex items-center justify-between gap-3 rounded-2xl border border-ds-border bg-ds-card p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-ds-ink truncate">{u.policyNumber}</p>
                    <p className="text-xs text-ds-ink3 truncate">{u.productName} · {formatEndDate(u.endDate, lang === Language.EN ? 'EN' : 'ID')}</p>
                  </div>
                  <span className="flex-shrink-0 text-2xs font-black uppercase tracking-widest px-2 py-1 rounded-full"
                    style={{ background: `${TIER_COLOR[u.tier]}18`, color: TIER_COLOR[u.tier] }}>
                    {label}{u.tier !== 'HEALTHY' ? ` · ${u.daysLeft < 0 ? Math.abs(u.daysLeft) : u.daysLeft}h` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-2xs text-ds-ink3 leading-relaxed">
        {t('Units inside bulk batches appear here once issued as individual policies.',
           'Unit dalam batch massal muncul di sini setelah diterbitkan sebagai polis individual.')}
      </p>
    </div>
  );
};

export default B2BFleetCalendar;
