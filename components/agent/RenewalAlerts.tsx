import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, Phone } from 'lucide-react';
import { Language } from '../../types';
import { getExpiringPolicies, type SpPolicy } from '../../services/supabaseService';

interface Props {
  agentId: string;
  lang: Language;
  onNavigate: (tab: string) => void;
}

type ExpiringPolicy = SpPolicy & { client_name_resolved: string };

const productBadge: Record<string, string> = {
  CAR: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  TRAVEL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  PA: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  MPAR: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function daysPillClass(days: number): string {
  if (days <= 7) return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
  if (days <= 14) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
}

function buildWAMessage(policy: ExpiringPolicy, days: number): string {
  const clientName = policy.client_name_resolved || policy.policy_number;
  const text = [
    `Halo ${clientName},`,
    ``,
    `Polis asuransi ${policy.type} Anda (No. ${policy.policy_number ?? '-'}) akan berakhir dalam ${days} hari (${policy.end_date}).`,
    ``,
    `Segera hubungi kami untuk proses renewal agar perlindungan Anda tetap aktif.`,
    ``,
    `Terima kasih,`,
    `Agen SurePath`,
  ].join('\n');
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const RenewalAlerts: React.FC<Props> = ({ agentId, lang, onNavigate }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [policies, setPolicies] = useState<ExpiringPolicy[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExpiringPolicies(agentId, 30).then((result) => {
      if (!cancelled) {
        setPolicies(result);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [agentId]);

  if (!loaded || policies.length === 0) return null;

  const visible = policies.slice(0, 3);
  const extra = policies.length - 3;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-amber-200 dark:border-amber-500/20 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400/20 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight">
              {t('Renewal Alerts', 'Pengingat Renewal')}
            </p>
          </div>
          <span className="ml-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full">
            {policies.length}
          </span>
        </div>
        <button
          onClick={() => onNavigate('clients')}
          className="flex items-center gap-1 text-primary-500 text-xs font-black uppercase tracking-widest"
        >
          {t('View All', 'Lihat Semua')} <ChevronRight size={14} />
        </button>
      </div>

      {/* Policy list */}
      <div className="divide-y divide-slate-50 dark:divide-white/5 pb-3">
        {visible.map((policy) => {
          const days = daysUntil(policy.end_date);
          const clientLabel = policy.client_name_resolved || policy.policy_number || '-';

          return (
            <div key={policy.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm leading-tight truncate">{clientLabel}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${productBadge[policy.type] ?? 'bg-slate-100 text-slate-500'}`}>
                    {policy.type}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${daysPillClass(days)}`}>
                    {days <= 0
                      ? t('Expires today', 'Habis hari ini')
                      : t(`${days}d left`, `${days} hari lagi`)}
                  </span>
                </div>
              </div>
              <a
                href={buildWAMessage(policy, days)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex-shrink-0 active:scale-95 transition-transform shadow-md shadow-emerald-500/20"
              >
                <Phone size={11} />
                {t('Contact', 'Hubungi')}
              </a>
            </div>
          );
        })}
      </div>

      {/* Extra count */}
      {extra > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => onNavigate('clients')}
            className="text-xs font-black text-slate-400 hover:text-primary-500 transition-colors uppercase tracking-widest"
          >
            +{extra} {t('more', 'lainnya')}
          </button>
        </div>
      )}
    </div>
  );
};

export default RenewalAlerts;
