import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, RefreshCw, ArrowDownToLine, TrendingUp, Clock, Car, Plane, Shield, Smartphone, Coins } from 'lucide-react';
import { Language } from '../../types';
import { getAgentCommissions, getAgentCoinBalance, getAgentCoinLedger, getMyWithdrawals, type SpCommission, type SpCoinLedger } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { AgentArtKeyframes, SpotWallet, AgentEmpty } from './AgentArt';

interface Props {
  agentId: string;
  lang: Language;
  onNavigate?: (tab: string) => void;
}

type TabId = 'all' | 'pending' | 'paid' | 'byproduct' | 'coins';

const statusColors: Record<string, string> = {
  PAID: 'bg-ds-green-tint text-ds-green',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-rose-50 text-ds-red',
};

const productIcons: Record<string, React.ElementType> = {
  CAR: Car, TRAVEL: Plane, PA: Shield, MPAR: Smartphone,
};

const productColors: Record<string, string> = {
  CAR: 'bg-blue-50 text-ds-blue',
  TRAVEL: 'bg-ds-green-tint text-ds-green',
  PA: 'bg-ds-purple-lt text-ds-purple',
  MPAR: 'bg-amber-50 text-ds-amber',
};

const AgentCommission: React.FC<Props> = ({ agentId, lang, onNavigate }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [commissions, setCommissions] = useState<SpCommission[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinLedger, setCoinLedger] = useState<SpCoinLedger[]>([]);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const loadData = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const [data, balance, ledger, withdrawals] = await Promise.all([
        getAgentCommissions(agentId),
        getAgentCoinBalance(agentId),
        getAgentCoinLedger(agentId),
        getMyWithdrawals(100).catch(() => []),
      ]);
      setCommissions(data);
      setCoinBalance(balance);
      setCoinLedger(ledger);
      setTotalWithdrawn(withdrawals.filter(w => w.status === 'DISBURSED').reduce((a, w) => a + (w.amount ?? 0), 0));
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
    onNavigate?.('wallet');
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
    <div className="bg-ds-bg min-h-screen pb-28">

      {/* Balance Hero Card — bank-card look */}
      <AgentArtKeyframes />
      <div className="mx-4 mt-5 rounded-[1.75rem] p-5 text-white space-y-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 55%, #0B5E3B 100%)', boxShadow: '0 16px 40px -14px rgba(11,17,32,0.55)' }}>
        <div aria-hidden className="absolute -top-14 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.26), transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 top-0 h-full opacity-[0.12] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="175" cy="20" r="72" stroke="#fff" strokeWidth="1.2" />
          <circle cx="175" cy="20" r="48" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide">{t('Total Earned', 'Total Komisi')}</p>
          <Wallet size={18} className="text-white/40" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <p className="text-3xl font-bold font-mono text-white">{formatIDR(totalEarned)}</p>
          <div className="-my-3 flex-shrink-0"><SpotWallet size={72} /></div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-ds-amber" />
              <p className="text-ds-amber text-[10px] font-black uppercase tracking-widest">{t('Pending', 'Pending')}</p>
            </div>
            <p className="font-black text-sm text-white">{formatIDR(totalPending)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-3">
            <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">{t('Withdrawn', 'Dicairkan')}</p>
            <p className="font-black text-sm text-white">{formatIDR(totalWithdrawn)}</p>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={totalPending === 0}
          className="relative z-10 w-full py-3.5 bg-ds-green rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-ds-sm active:brightness-90 hover:brightness-105 transition-all motion-reduce:transition-none disabled:opacity-40"
        >
          <ArrowDownToLine size={14} />
          {t('Request Withdrawal', 'Minta Pencairan')}
        </button>
      </div>

      {/* Coins Balance Card */}
      <div className="mx-4 mt-3 sp-glass rounded-[1.5rem] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <Coins size={16} className="text-ds-amber" />
            </div>
            <p className="text-ds-ink2 text-xs font-black uppercase tracking-widest">{t('SurePath Coins', 'Koin SurePath')}</p>
          </div>
          <button onClick={() => setActiveTab('coins')} className="text-[10px] font-black text-ds-blue hover:text-ds-green uppercase tracking-widest transition-colors">
            {t('History', 'Riwayat')} →
          </button>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <p className="font-black text-4xl tracking-tighter text-ds-amber">{coinBalance.toLocaleString('id-ID')}</p>
            <p className="text-ds-ink3 text-[10px] font-bold mt-0.5">{t('coins', 'koin')} · {formatIDR(coinBalance * 1000)} {t('value', 'nilai')}</p>
          </div>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
        <div className="sp-glass rounded-[1.5rem] p-4">
          <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-1">{t('This Month', 'Bulan Ini')}</p>
          <p className="font-black text-lg tracking-tight text-ds-ink">{formatIDR(thisMonth)}</p>
          {monthGrowth !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-[10px] font-black ${monthGrowth > 0 ? 'text-ds-green' : 'text-ds-red'}`}>
              <TrendingUp size={10} />
              {monthGrowth > 0 ? '+' : ''}{monthGrowth}% {t('vs last month', 'vs bulan lalu')}
            </div>
          )}
        </div>
        <div className="sp-glass rounded-[1.5rem] p-4">
          <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-1">{t('Last Month', 'Bulan Lalu')}</p>
          <p className="font-black text-lg tracking-tight text-ds-ink">{formatIDR(lastMonth)}</p>
          <p className="text-[10px] text-ds-ink3 font-bold mt-1">{paid.filter(c => {
            const d = new Date(c.created_at ?? 0);
            return d >= startOfLastMonth && d <= endOfLastMonth;
          }).length} {t('transactions', 'transaksi')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-4 mt-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 motion-reduce:active:scale-100 ${
              activeTab === tab.id
                ? 'bg-ds-navy text-white shadow-ds-navy'
                : 'bg-ds-card border border-ds-border text-ds-ink3'
            }`}
          >
            {lang === Language.EN ? tab.enLabel : tab.idLabel}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end px-4 mt-2 mb-1">
        <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-bold text-ds-ink3 hover:text-ds-green transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
          {t('Refresh', 'Perbarui')}
        </button>
      </div>

      {/* By Product View */}
      {activeTab === 'byproduct' && (
        <div className="space-y-2 px-4 mt-2">
          {byProduct.map(({ type, count, total, pending: pend }) => {
            const Icon = productIcons[type] ?? Shield;
            const colorClass = productColors[type] ?? 'bg-ds-card2 text-ds-ink3';
            return (
              <div key={type} className="sp-glass rounded-2xl p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-ds-ink">{type}</p>
                  <p className="text-[10px] text-ds-ink3 font-bold">{count} {t('transactions', 'transaksi')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm text-ds-green">{formatIDR(total)}</p>
                  {pend > 0 && <p className="text-[10px] text-ds-amber font-bold">{formatIDR(pend)} {t('pending', 'pending')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Coin Ledger View */}
      {activeTab === 'coins' && (
        <div className="space-y-2 px-4 mt-2">
          {coinLedger.length === 0 ? (
            <div className="bg-ds-card2 rounded-2xl border border-ds-border">
              <AgentEmpty
                title={t('No coin history yet', 'Belum ada riwayat koin')}
                desc={t('Earn coins when policies are issued.', 'Dapatkan koin saat polis diterbitkan.')}
              />
            </div>
          ) : (
            coinLedger.map((entry, i) => {
              const isEarned = entry.type === 'EARNED';
              const isRedeemed = entry.type === 'REDEEMED';
              return (
                <div key={entry.id ?? i} className="sp-glass rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isEarned ? 'bg-amber-50 text-ds-amber' : isRedeemed ? 'bg-rose-50 text-ds-red' : 'bg-ds-card2 text-ds-ink3'}`}>
                    <Coins size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-ds-ink truncate">{entry.description ?? (isEarned ? t('Coins Earned', 'Koin Diperoleh') : t('Coins Redeemed', 'Koin Digunakan'))}</p>
                    <p className="text-[10px] text-ds-ink3 font-bold mt-0.5">{entry.created_at ? new Date(entry.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-black text-sm ${isEarned ? 'text-ds-amber' : 'text-ds-red'}`}>
                      {isEarned ? '+' : '-'}{entry.coins.toLocaleString('id-ID')} koin
                    </p>
                    <p className="text-[10px] text-ds-ink3 font-bold">{formatIDR(entry.rp_value)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* List View */}
      {activeTab !== 'byproduct' && activeTab !== 'coins' && (
        <div className="space-y-2 px-4 mt-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="sp-glass rounded-2xl p-4 animate-pulse h-16" />
            ))
          ) : getFilteredCommissions().length === 0 ? (
            <div className="bg-ds-card2 rounded-2xl border border-ds-border">
              <AgentEmpty
                title={t('No commissions found', 'Belum ada komisi')}
                desc={t('Create a quote and convert it to a policy to earn commissions.', 'Buat penawaran dan konversikan ke polis untuk mendapatkan komisi.')}
              />
            </div>
          ) : (
            getFilteredCommissions().map((c, i) => {
              const Icon = productIcons[c.product_type] ?? Shield;
              const colorClass = productColors[c.product_type] ?? 'bg-ds-card2 text-ds-ink3';
              return (
                <div key={c.id ?? i} className="sp-glass rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ds-ink truncate">{c.client_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-ds-ink3 font-bold uppercase">{c.product_type}</span>
                      <span className="text-[10px] text-ds-ink3">·</span>
                      <span className="text-xs text-ds-ink3">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-ds-ink3 font-medium mt-0.5">
                      {t('Premium:', 'Premi:')} {formatIDR(c.premium_amount)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-ds-green font-mono">+{formatIDR(c.commission_amount)}</p>
                    {c.status === 'PAID' ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-ds-green-tint text-ds-green mt-1 inline-block">
                        {c.status}
                      </span>
                    ) : c.status === 'PENDING' ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 mt-1 inline-block">
                        {c.status}
                      </span>
                    ) : (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block ${statusColors[c.status] ?? 'bg-ds-card2 text-ds-ink3'}`}>
                        {c.status}
                      </span>
                    )}
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
