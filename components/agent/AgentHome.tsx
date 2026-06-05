import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Shield, Wallet, ChevronRight,
  FileText, Lightbulb, Star, ClipboardList,
  Trophy, Network, RefreshCw, FileEdit
} from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalAlerts from './RenewalAlerts';
import { getAgentCoinBalance } from '../../services/supabaseService';

interface Props {
  agent: any;
  agentId: string;
  stats: any;
  recentCommissions: any[];
  onNavigate: (tab: string) => void;
  lang: Language;
  agentTier?: string | null;
}

const AgentHome: React.FC<Props> = ({ agent, agentId, stats, recentCommissions, onNavigate, lang, agentTier }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [coinBalance, setCoinBalance] = useState(0);
  const [forecastGwp, setForecastGwp] = useState(20_000_000);

  useEffect(() => {
    if (agentId) {
      getAgentCoinBalance(agentId).then(setCoinBalance);
    }
  }, [agentId]);

  const monthlyTarget = agent?.monthly_target ?? 10000000;
  const progress = Math.min((stats.totalCommissionMonth / monthlyTarget) * 100, 100);

  const statusColor: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  };

  const productLabel: Record<string, string> = {
    CAR: t('Auto', 'Mobil'),
    TRAVEL: t('Travel', 'Perjalanan'),
    PA: t('Personal Acc.', 'Kecelakaan Diri'),
    MPAR: t('Gadget', 'Gadget'),
  };

  const tips = [
    t('Clients who buy Travel insurance are 3× more likely to add a PA policy within 6 months.', 'Klien yang beli asuransi Travel 3× lebih mungkin menambah polis PA dalam 6 bulan.'),
    t('Following up with a prospect within 24 hours increases conversion by 60%.', 'Follow-up ke prospek dalam 24 jam meningkatkan konversi hingga 60%.'),
    t('Referrals close 4× faster than cold leads. Ask every happy client for one.', 'Referral menutup 4× lebih cepat dari prospek biasa. Minta setiap klien senang untuk merujuk.'),
    t('Cross-selling MPAR to car insurance clients adds an average Rp 90.000 commission per deal.', 'Cross-selling MPAR ke klien asuransi mobil menambah rata-rata komisi Rp 90.000 per deal.'),
  ];
  const tip = tips[new Date().getDate() % tips.length];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return t('Good Morning', 'Selamat Pagi');
    if (h < 15) return t('Good Afternoon', 'Selamat Siang');
    if (h < 18) return t('Good Evening', 'Selamat Sore');
    return t('Good Night', 'Selamat Malam');
  };

  return (
    <div className="px-5 py-6 space-y-7 max-w-lg mx-auto pb-32 font-sora">
      <style>{`
        @keyframes spRise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        @keyframes spShimmer { 0% { transform: translateX(-120%) skewX(-12deg); } 100% { transform: translateX(220%) skewX(-12deg); } }
        @media (prefers-reduced-motion: reduce){ [data-sp-shimmer]{ animation:none !important; } }
      `}</style>

      {/* Performance Card — gradient top + white bottom (split card, matches customer) */}
      <div
        className="rounded-[1.9rem] overflow-hidden shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/5 dark:ring-white/5"
        style={{ animation: 'spRise 0.5s cubic-bezier(.2,.7,.2,1) both' }}
      >
        {/* Top — SurePath green gradient */}
        <div
          className="relative px-5 pt-5 pb-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 58%, #16a34a 100%)' }}
        >
          <div
            data-sp-shimmer
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)', animation: 'spShimmer 4.5s ease-in-out 1s infinite' }}
          />
          <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #4ade80, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-white/55 text-[10px] font-bold uppercase tracking-[0.22em] mb-1">{t('Agent Portal', 'Portal Agen')}</p>
              <p className="text-white/70 text-sm font-bold">{greeting()},</p>
              <h1 className="text-white font-black tracking-tight text-2xl leading-tight">
                {(agent?.name ?? 'Agent').toUpperCase()}
              </h1>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-white/12 text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                  {agent?.agent_code ?? 'SP-AGT-001'}
                </span>
                {agentTier && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    agentTier === 'ELITE'
                      ? 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                      : 'bg-white/12 text-white border border-white/20'
                  }`}>
                    {agentTier === 'ELITE' ? '💎 Elite' : '⭐ Bintang'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center bg-white/12 border border-white/20 rounded-2xl px-3 py-2.5 min-w-[56px]">
              <Star size={16} className="text-amber-300 mb-0.5" fill="currentColor" />
              <span className="font-black text-lg text-white leading-none">{agent?.trust_score ?? 85}</span>
              <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Trust</span>
            </div>
          </div>

          <div className="relative z-10 mt-4">
            <p className="text-white/55 text-[10px] font-bold uppercase tracking-[0.22em]">{t('Commission This Month', 'Komisi Bulan Ini')}</p>
            <h2 className="text-white font-black text-2xl tracking-tight leading-none mt-1">{formatIDR(stats.totalCommissionMonth)}</h2>
          </div>
        </div>

        {/* Bottom — white quick-link tray */}
        <div className="bg-white dark:bg-[#0d2618] px-2 py-2 grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5">
          {[
            { tab: 'quotes',   icon: FileText, label: t('Quotes', 'Penawaran'), tint: '#2563eb' },
            { tab: 'clients',  icon: Users,    label: t('Clients', 'Klien'),    tint: '#16a34a' },
            { tab: 'commission', icon: Wallet, label: t('Earnings', 'Komisi'),  tint: '#d97706' },
          ].map(link => (
            <button
              key={link.tab}
              onClick={() => onNavigate(link.tab)}
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 active:scale-95 transition-transform duration-150 motion-reduce:transition-none group"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-90 motion-reduce:transition-none"
                style={{ background: `${link.tint}1a` }}
              >
                <link.icon size={17} strokeWidth={2.2} style={{ color: link.tint }} />
              </span>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 tracking-tight">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards — white cards with colored icon circles */}
      <div className="grid grid-cols-2 gap-3">
        {/* GWP This Month */}
        <div className="bg-white dark:bg-[#0d2618] dark:border dark:border-[#16a34a]/20 rounded-[1.5rem] shadow-sm p-4 transition-transform active:scale-[0.98] motion-reduce:active:scale-100">
          <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center mb-3">
            <TrendingUp size={18} style={{ color: '#047857' }} />
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {t('GWP / Month', 'GWP Bulan Ini')}
          </div>
          <div className="font-black text-base tracking-tight text-slate-900 dark:text-white">
            {formatIDR(stats.totalCommissionMonth * 8)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('estimated', 'estimasi')}</div>
        </div>

        {/* Total Clients */}
        <div className="bg-white dark:bg-[#0d2618] dark:border dark:border-[#16a34a]/20 rounded-[1.5rem] shadow-sm p-4 transition-transform active:scale-[0.98] motion-reduce:active:scale-100">
          <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center mb-3">
            <Users size={18} style={{ color: '#2563eb' }} />
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {t('Clients', 'Klien')}
          </div>
          <div className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white">
            {stats.clientsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('total', 'total')}</div>
        </div>

        {/* Active Policies */}
        <div className="bg-white dark:bg-[#0d2618] dark:border dark:border-[#16a34a]/20 rounded-[1.5rem] shadow-sm p-4 transition-transform active:scale-[0.98] motion-reduce:active:scale-100">
          <div className="w-10 h-10 rounded-full bg-[#CCFBF1] flex items-center justify-center mb-3">
            <Shield size={18} style={{ color: '#0f766e' }} />
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {t('Policies', 'Polis')}
          </div>
          <div className="font-black text-2xl tracking-tighter leading-tight text-slate-900 dark:text-white">
            {stats.policiesCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('active', 'aktif')}</div>
        </div>

        {/* Earned This Month */}
        <div className="bg-white dark:bg-[#0d2618] dark:border dark:border-[#16a34a]/20 rounded-[1.5rem] shadow-sm p-4 transition-transform active:scale-[0.98] motion-reduce:active:scale-100">
          <div className="w-10 h-10 rounded-full bg-[#FEF9C3] flex items-center justify-center mb-3">
            <Wallet size={18} style={{ color: '#a16207' }} />
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {t('Earned', 'Komisi')}
          </div>
          <div className="font-black text-base tracking-tight text-slate-900 dark:text-white">
            {formatIDR(stats.totalCommissionMonth)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('this month', 'bulan ini')}</div>
          {coinBalance > 0 && (
            <div className="text-[10px] text-amber-500 font-bold mt-1">
              🪙 {coinBalance.toLocaleString('id-ID')} poin
            </div>
          )}
        </div>
      </div>

      {/* Monthly Target Progress */}
      <div className="bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
              {t('Monthly Target', 'Target Bulan Ini')}
            </p>
            <p className="font-black text-lg tracking-tight">
              {formatIDR(stats.totalCommissionMonth)}
              <span className="text-slate-400 font-bold text-sm"> / {formatIDR(monthlyTarget)}</span>
            </p>
          </div>
          <span className={`text-lg font-black ${progress >= 100 ? 'text-emerald-500' : 'text-[#16a34a]'}`}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-[#16a34a]/15 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 motion-reduce:transition-none"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #16a34a, #4ade80)',
            }}
          />
        </div>
        {progress >= 100 && (
          <p className="text-emerald-500 text-xs font-black uppercase tracking-widest mt-2">
            {t('Target Achieved! Keep going!', 'Target Tercapai! Terus semangat!')}
          </p>
        )}
        {progress < 100 && (
          <p className="text-slate-400 text-xs font-bold mt-2">
            {formatIDR(monthlyTarget - stats.totalCommissionMonth)} {t('more to reach your target', 'lagi untuk capai target')}
          </p>
        )}
      </div>

      {/* Commission Forecast Slider */}
      <div className="bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 shadow-xl p-5">
        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold mb-3">
          {t('Commission Forecast', 'Proyeksi Komisi')}
        </p>
        <input
          type="range"
          min={0}
          max={100_000_000}
          step={1_000_000}
          value={forecastGwp}
          onChange={e => setForecastGwp(Number(e.target.value))}
          className="w-full accent-[#16a34a] mb-3"
        />
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-slate-400 font-bold">{t('Target GWP', 'Target GWP')}</p>
            <p className="font-black text-base tracking-tight">{formatIDR(forecastGwp)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold">{t('Est. Commission (25%)', 'Estimasi Komisi (25%)')}</p>
            <p className="font-black text-base tracking-tight text-[#16a34a]">{formatIDR(forecastGwp * 0.25)}</p>
          </div>
        </div>
      </div>

      {/* Renewal Alerts */}
      <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />

      {/* Menu Utama — circular icon grid (myBCA Main Menu style) */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
            {t('Main Menu', 'Menu Utama')}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { tab: 'quotes',       label: t('Penawaran', 'Penawaran'), icon: FileText,    circleBg: '#DBEAFE', iconColor: '#2563eb' },
            { tab: 'clients',      label: t('Klien', 'Klien'),         icon: Users,       circleBg: '#D1FAE5', iconColor: '#15803d' },
            { tab: 'claims',       label: t('Klaim', 'Klaim'),         icon: ClipboardList, circleBg: '#FFE4E6', iconColor: '#be123c' },
            { tab: 'policy',       label: t('Polis', 'Polis'),         icon: Shield,      circleBg: '#CCFBF1', iconColor: '#0f766e' },
            { tab: 'leaderboard',  label: t('Ranking', 'Ranking'),     icon: Trophy,      circleBg: '#FEF3C7', iconColor: '#d97706' },
            { tab: 'network',      label: t('Jaringan', 'Jaringan'),   icon: Network,     circleBg: '#EDE9FE', iconColor: '#7c3aed' },
            { tab: 'renewals',     label: t('Renewal', 'Renewal'),     icon: RefreshCw,   circleBg: '#CFFAFE', iconColor: '#0891b2' },
            { tab: 'endorsements', label: t('Endors', 'Endors'),       icon: FileEdit,    circleBg: '#FFEDD5', iconColor: '#ea580c' },
          ].map((action, i) => (
            <div
              key={`${action.tab}-${action.label}`}
              onClick={() => onNavigate(action.tab)}
              style={{ animation: `spRise 0.45s cubic-bezier(.2,.7,.2,1) both`, animationDelay: `${i * 55}ms` }}
              className="flex flex-col items-center gap-2 cursor-pointer group active:scale-90 transition-transform duration-150 motion-reduce:transition-none"
            >
              <div
                className="w-16 h-16 rounded-[1.4rem] flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/[0.03] group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-90 transition-all duration-200 motion-reduce:transition-none"
                style={{ background: action.circleBg }}
              >
                <action.icon size={22} strokeWidth={2.2} style={{ color: action.iconColor }} />
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 text-center leading-tight">
                {action.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Commissions */}
      <div className="bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
            {t('Recent Commissions', 'Komisi Terbaru')}
          </p>
          <button
            onClick={() => onNavigate('commission')}
            className="flex items-center gap-1 text-[#16a34a] text-xs font-black uppercase tracking-widest active:scale-95 transition-transform motion-reduce:active:scale-100"
          >
            {t('See all', 'Lihat semua')} <ChevronRight size={14} />
          </button>
        </div>

        {recentCommissions.length === 0 ? (
          <div className="px-5 pb-5 text-center">
            <p className="text-slate-400 text-sm font-bold py-4">
              {t('No commissions yet. Start selling!', 'Belum ada komisi. Yuk mulai jualan!')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {recentCommissions.map((c, i) => (
              <div key={c.id ?? i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-black text-xs text-slate-600 dark:text-slate-300">
                    {(c.client_name ?? 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm leading-tight truncate">{c.client_name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {productLabel[c.product_type] ?? c.product_type}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm text-emerald-500">+{formatIDR(c.commission_amount)}</p>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Did You Know Tip */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-[2rem] border border-amber-200/60 dark:border-amber-500/20 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-amber-400/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Lightbulb size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-widest mb-1">
              {t('Did You Know?', 'Tahukah Kamu?')}
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
              {tip}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AgentHome;
