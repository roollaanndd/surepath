import React from 'react';
import {
  TrendingUp, Users, Shield, Wallet, ChevronRight,
  UserPlus, FileText, ShoppingCart, Lightbulb, Star
} from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalAlerts from './RenewalAlerts';

interface Props {
  agent: any;
  agentId: string;
  stats: any;
  recentCommissions: any[];
  onNavigate: (tab: string) => void;
  lang: Language;
}

const AgentHome: React.FC<Props> = ({ agent, agentId, stats, recentCommissions, onNavigate, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

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
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">

      {/* Greeting + Trust Score */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
              {greeting()}
            </p>
            <h1 className="font-black tracking-tighter text-2xl mt-0.5 leading-tight">
              {agent?.name ?? 'Agent'} 👋
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-500 text-[10px] font-black uppercase tracking-widest">
                {agent?.agent_code ?? 'SP-AGT-001'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center bg-slate-50 dark:bg-white/5 rounded-2xl px-3 py-2">
            <Star size={16} className="text-amber-400 mb-0.5" fill="currentColor" />
            <span className="font-black text-lg leading-none">{agent?.trust_score ?? 85}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Trust</span>
          </div>
        </div>
      </div>

      {/* Stat Cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* GWP This Month */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={14} className="text-primary-500" />
            </div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('GWP / Month', 'GWP Bulan Ini')}
            </span>
          </div>
          <div className="font-black text-base tracking-tight leading-tight">
            {formatIDR(stats.totalCommissionMonth * 8)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('estimated', 'estimasi')}</div>
        </div>

        {/* Total Clients */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Users size={14} className="text-blue-500" />
            </div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('Clients', 'Klien')}
            </span>
          </div>
          <div className="font-black text-2xl tracking-tighter leading-tight">
            {stats.clientsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('total', 'total')}</div>
        </div>

        {/* Active Policies */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Shield size={14} className="text-emerald-500" />
            </div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('Policies', 'Polis')}
            </span>
          </div>
          <div className="font-black text-2xl tracking-tighter leading-tight">
            {stats.policiesCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('active', 'aktif')}</div>
        </div>

        {/* Earned This Month */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-violet-500/10 rounded-xl flex items-center justify-center">
              <Wallet size={14} className="text-violet-500" />
            </div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('Earned', 'Komisi')}
            </span>
          </div>
          <div className="font-black text-sm tracking-tight leading-tight">
            {formatIDR(stats.totalCommissionMonth)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('this month', 'bulan ini')}</div>
        </div>
      </div>

      {/* Monthly Target Progress */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl p-5">
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
          <span className={`text-lg font-black ${progress >= 100 ? 'text-emerald-500' : 'text-primary-500'}`}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #f97316, #fb923c)',
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

      {/* Renewal Alerts */}
      <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('clients')}
          className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 hover:border-primary-500/30 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 bg-primary-500/10 rounded-2xl flex items-center justify-center">
            <UserPlus size={18} className="text-primary-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
            {t('Add Client', 'Tambah Klien')}
          </span>
        </button>

        <button
          onClick={() => onNavigate('quotes')}
          className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 hover:border-blue-500/30 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center">
            <FileText size={18} className="text-blue-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
            {t('New Quote', 'Buat Kuotasi')}
          </span>
        </button>

        <button
          onClick={() => onNavigate('quotes')}
          className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 hover:border-emerald-500/30 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <ShoppingCart size={18} className="text-emerald-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
            {t('Buy for Client', 'Beli untuk Klien')}
          </span>
        </button>
      </div>

      {/* Recent Commissions */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
            {t('Recent Commissions', 'Komisi Terbaru')}
          </p>
          <button
            onClick={() => onNavigate('commission')}
            className="flex items-center gap-1 text-primary-500 text-xs font-black uppercase tracking-widest"
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
                <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
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

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  );
};

export default AgentHome;
