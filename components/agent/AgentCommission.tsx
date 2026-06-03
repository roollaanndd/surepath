import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, RefreshCw, ArrowDownToLine, TrendingUp, Clock, CheckCircle2, Car, Plane, Shield, Smartphone, Coins } from 'lucide-react';
import { Language } from '../../types';
import { getAgentCommissions, getAgentCoinBalance, getAgentCoinLedger, type SpCommission, type SpCoinLedger } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agentId: string;
  lang: Language;
}

type TabId = 'all' | 'pending' | 'paid' | 'byproduct' | 'coins';

const statusColors: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

const productIcons: Record<string, React.ElementType> = {
  CAR: Car, TRAVEL: Plane, PA: Shield, MPAR: Smartphone,
};

const productColors: Record<string, string> = {
  CAR: 'bg-blue-500/10 text-blue-500',
  TRAVEL: 'bg-emerald-500/10 text-emerald-500',
  PA: 'bg-violet-500/10 text-violet-500',
  MPAR: 'bg-amber-500/10 text-amber-500',
};

const AgentCommission: React.FC<Props> = ({ agentId, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [commissions, setCommissions] = useState<SpCommission[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinLedger, setCoinLedger] = useState<SpCoinLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [toastVisible, setToastVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const [data, balance, ledger] = await Promise.all([
        getAgentCommissions(agentId),
        getAgentCoinBalance(agentId),
        getAgentCoinLedger(agentId),
      ]);
      setCommissions(data);
      setCoinBalance(balance);
      setCoinLedger(ledger);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const paid = commissions.filter(c => c.status === 'PAID');
  const pending = commissions.filter(c => c.status === 'PENDING');

  const totalEarned = paid.reduce((s, c) => s + c.commission_amount, 0);
  const totalPending = pending.reduce((s, c) => s + c.commission_amount, 0);

  const thisMonth = paid
    .filter(c => new Date(c.created_at ?? 0) >= startOfMonth)
    .reduce((s, c) => s + c.commission_amount, 0);

  const lastMonth = paid
    .filter(c => {
      const d = new Date(c.created_at ?? 0);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    })
    .reduce((s, c) => s + c.commission_amount, 0);

  const monthGrowth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  // By product aggregation
  const byProduct = ['CAR', 'TRAVEL', 'PA', 'MPAR'].map(type => ({
    type,
    count: commissions.filter(c => c.product_type === type).length,
    total: commissions.filter(c => c.product_type === type && c.status === 'PAID').reduce((s, c) => s + c.commission_amount, 0),
    pending: commissions.filter(c => c.product_type === type && c.status === 'PENDING').reduce((s, c) => s + c.commission_amount, 0),
  }));

  const getFilteredCommissions = (): SpCommission[] => {
    if (activeTab === 'paid') return paid;
    if (activeTab === 'pending') return pending;
    return commissions;
  };

  const handleWithdraw = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(lang === Language.EN ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const tabs: { id: TabId; enLabel: string; idLabel: string }[] = [
    { id: 'all', enLabel: 'All', idLabel: 'Semua' },
    { id: 'pending', enLabel: 'Pending', idLabel: 'Pending' },
    { id: 'paid', enLabel: 'Paid', idLabel: 'Dibayar' },
    { id: 'byproduct', enLabel: 'By Product', idLabel: 'Per Produk' },
    { id: 'coins', enLabel: 'Coins', idLabel: 'Koin' },
  ];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-32 font-sora">

      {/* Toast */}
      {toastVisible && (
        <div className="fixed top-20 inset-x-4 z-50 flex justify-center">
          <div className="bg-emerald-500 text-white rounded-2xl px-5 py-3 font-black text-sm shadow-2xl shadow-emerald-500/30 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {t('Withdrawal request submitted!', 'Permintaan penarikan dikirim!')}
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-5 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{t('Total Earned', 'Total Komisi')}</p>
          <Wallet size={18} className="text-slate-400" />
        </div>
        <p className="font-black text-3xl tracking-tighter">{formatIDR(totalEarned)}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-amber-400" />
              <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">{t('Pending', 'Pending')}</p>
            </div>
            <p className="font-black text-sm">{formatIDR(totalPending)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-3">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('Withdrawn', 'Dicairkan')}</p>
            <p className="font-black text-sm">Rp 0</p>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={totalPending === 0}
          className="w-full py-3.5 bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#16a34a]/30 active:scale-[0.97] hover:brightness-105 transition-all motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-40"
        >
          <ArrowDownToLine size={14} />
          {t('Request Withdrawal', 'Minta Pencairan')}
        </button>
      </div>

      {/* Coins Balance Card */}
      <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-[2rem] p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/40">
              <Coins size={16} className="text-white" />
            </div>
            <p className="text-amber-400 text-xs font-black uppercase tracking-widest">{t('SurePath Coins', 'Koin SurePath')}</p>
          </div>
          <button onClick={() => setActiveTab('coins')} className="text-[10px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest">
            {t('History', 'Riwayat')} →
          </button>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <p className="font-black text-4xl tracking-tighter text-amber-400">{coinBalance.toLocaleString('id-ID')}</p>
            <p className="text-amber-400/60 text-[10px] font-bold mt-0.5">{t('coins', 'koin')} · {formatIDR(coinBalance * 1000)} {t('value', 'nilai')}</p>
          </div>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('This Month', 'Bulan Ini')}</p>
          <p className="font-black text-lg tracking-tight">{formatIDR(thisMonth)}</p>
          {monthGrowth !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-[10px] font-black ${monthGrowth > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              <TrendingUp size={10} />
              {monthGrowth > 0 ? '+' : ''}{monthGrowth}% {t('vs last month', 'vs bulan lalu')}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('Last Month', 'Bulan Lalu')}</p>
          <p className="font-black text-lg tracking-tight">{formatIDR(lastMonth)}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{paid.filter(c => {
            const d = new Date(c.created_at ?? 0);
            return d >= startOfLastMonth && d <= endOfLastMonth;
          }).length} {t('transactions', 'transaksi')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 motion-reduce:active:scale-100 ${
              activeTab === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg'
                : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400'
            }`}
          >
            {lang === Language.EN ? tab.enLabel : tab.idLabel}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#16a34a] transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
          {t('Refresh', 'Perbarui')}
        </button>
      </div>

      {/* By Product View */}
      {activeTab === 'byproduct' && (
        <div className="space-y-3">
          {byProduct.map(({ type, count, total, pending: pend }) => {
            const Icon = productIcons[type] ?? Shield;
            const colorClass = productColors[type] ?? 'bg-slate-100 text-slate-500';
            return (
              <div key={type} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm">{type}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{count} {t('transactions', 'transaksi')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm text-emerald-500">{formatIDR(total)}</p>
                  {pend > 0 && <p className="text-[10px] text-amber-500 font-bold">{formatIDR(pend)} {t('pending', 'pending')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Coin Ledger View */}
      {activeTab === 'coins' && (
        <div className="space-y-3">
          {coinLedger.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 p-8 text-center shadow-lg">
              <Coins size={40} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t('No coin history yet', 'Belum ada riwayat koin')}</p>
              <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">
                {t('Earn coins when policies are issued.', 'Dapatkan koin saat polis diterbitkan.')}
              </p>
            </div>
          ) : (
            coinLedger.map((entry, i) => {
              const isEarned = entry.type === 'EARNED';
              const isRedeemed = entry.type === 'REDEEMED';
              return (
                <div key={entry.id ?? i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isEarned ? 'bg-amber-500/10 text-amber-500' : isRedeemed ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-400'}`}>
                    <Coins size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{entry.description ?? (isEarned ? t('Coins Earned', 'Koin Diperoleh') : t('Coins Redeemed', 'Koin Digunakan'))}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{entry.created_at ? new Date(entry.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-black text-sm ${isEarned ? 'text-amber-500' : 'text-rose-500'}`}>
                      {isEarned ? '+' : '-'}{entry.coins.toLocaleString('id-ID')} koin
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">{formatIDR(entry.rp_value)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* List View */}
      {activeTab !== 'byproduct' && activeTab !== 'coins' && (
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 p-4 animate-pulse h-16" />
            ))
          ) : getFilteredCommissions().length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 p-8 text-center shadow-lg">
              <Wallet size={40} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="font-black text-slate-400">{t('No commissions found', 'Belum ada komisi')}</p>
              <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">
                {t('Create a quote and convert it to a policy to earn commissions.', 'Buat penawaran dan konversikan ke polis untuk mendapatkan komisi.')}
              </p>
            </div>
          ) : (
            getFilteredCommissions().map((c, i) => {
              const Icon = productIcons[c.product_type] ?? Shield;
              const colorClass = productColors[c.product_type] ?? 'bg-slate-100 text-slate-500';
              return (
                <div key={c.id ?? i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{c.client_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{c.product_type}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[10px] text-slate-400 font-bold">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {t('Premium:', 'Premi:')} {formatIDR(c.premium_amount)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm text-emerald-500">+{formatIDR(c.commission_amount)}</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block ${statusColors[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AgentCommission;
