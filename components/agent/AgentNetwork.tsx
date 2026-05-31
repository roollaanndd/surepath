import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Users, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentDownlines,
  getAgentReferralCode,
  getOverrideTransactions,
  getAgentOrders,
  type SpUser,
  type WalletTransaction,
  type SpPolicyOrder,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agentId: string;
  lang: Language;
  agent: any;
}

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AgentNetwork: React.FC<Props> = ({ agentId, lang, agent }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [downlines, setDownlines] = useState<SpUser[]>([]);
  const [overrideTxns, setOverrideTxns] = useState<WalletTransaction[]>([]);
  const [allOrders, setAllOrders] = useState<SpPolicyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    Promise.all([
      getAgentReferralCode(agentId),
      getAgentDownlines(agentId),
      getOverrideTransactions(agentId),
    ]).then(([code, dl, txns]) => {
      setReferralCode(code);
      setDownlines(dl);
      setOverrideTxns(txns);
    }).finally(() => setLoading(false));
  }, [agentId]);

  // Fetch issued orders for each downline to show GWP this month
  useEffect(() => {
    if (downlines.length === 0) return;
    Promise.all(downlines.map((d) => getAgentOrders(d.id))).then((results) => {
      setAllOrders(results.flat());
    });
  }, [downlines]);

  const referralLink = `https://myinsurepath.com?ref=${referralCode ?? ''}`;

  const totalOverride = overrideTxns.reduce((s, t) => s + t.amount, 0);

  function copyCode() {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Halo! Bergabunglah bersama saya di SurePath Insurance sebagai agen.\n\nGunakan kode referral saya: *${referralCode}*\n\nDaftar di: ${referralLink}\n\nBersama kita bisa menghasilkan lebih! 🚀`,
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  function downlineOrders(downlineId: string) {
    return allOrders.filter(
      (o) => o.agent_id === downlineId && o.status === 'ISSUED',
    );
  }

  function downlineGWPMonth(downlineId: string) {
    return allOrders
      .filter(
        (o) =>
          o.agent_id === downlineId &&
          o.status === 'ISSUED' &&
          (o.created_at ?? '') >= startOfMonth,
      )
      .reduce((s, o) => s + (o.total_premium ?? 0), 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">

      {/* ── Referral Code Card ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/30">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
          {t('Your Referral Code', 'Kode Referral Anda')}
        </p>
        <div className="text-4xl font-black tracking-widest my-3 bg-white/10 rounded-2xl py-3 px-4 text-center">
          {referralCode ?? '—'}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={copyCode}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t('Copied!', 'Tersalin!') : t('Copy Code', 'Salin Kode')}
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            <Share2 size={14} />
            {t('Share via WA', 'Bagikan WA')}
          </button>
        </div>

        <div className="flex justify-between mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl font-black">{downlines.length}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-70">{t('Downlines', 'Downline')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black">{formatIDR(totalOverride)}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-70">{t('Override Earned', 'Override Diperoleh')}</p>
          </div>
        </div>
      </div>

      {/* ── Downline Tree ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
          {t('My Downlines', 'Downline Saya')} ({downlines.length})
        </h3>

        {downlines.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] p-8 text-center">
            <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {t('No downlines yet', 'Belum ada downline')}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {t(
                'Share your referral code to recruit agents and earn override commissions.',
                'Bagikan kode referral Anda untuk merekrut agen dan dapatkan komisi override.',
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {downlines.map((dl) => {
              const orders = downlineOrders(dl.id);
              const gwpMonth = downlineGWPMonth(dl.id);
              return (
                <div
                  key={dl.id}
                  className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.5rem] p-4 flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-full bg-primary-500/10 flex items-center justify-center font-black text-primary-500 text-sm flex-shrink-0">
                    {getInitials(dl.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 dark:text-white truncate">{dl.name}</p>
                    <p className="text-[10px] font-bold text-primary-500">{dl.agent_code ?? '—'}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">
                      {t('Joined', 'Bergabung')} {fmtDate(dl.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white">{orders.length} {t('policies', 'polis')}</p>
                    <p className="text-[9px] text-emerald-500 font-bold">{formatIDR(gwpMonth)}</p>
                    <p className="text-[8px] text-slate-400">{t('GWP this month', 'GWP bulan ini')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Override Commission History ─────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
          {t('Override Commission History', 'Riwayat Komisi Override')}
        </h3>

        {overrideTxns.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] p-6 text-center">
            <Coins size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-400">{t('No override commissions yet', 'Belum ada komisi override')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overrideTxns.slice(0, 15).map((tx) => (
              <div
                key={tx.id}
                className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-white">
                    {tx.description ?? t('Override commission', 'Komisi override')}
                  </p>
                  <p className="text-[9px] text-slate-400">{fmtDate(tx.created_at)}</p>
                </div>
                <span className="text-sm font-black text-emerald-500">+{formatIDR(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] overflow-hidden">
        <button
          onClick={() => setHowOpen(!howOpen)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white">
            {t('How It Works', 'Cara Kerja')}
          </span>
          {howOpen ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>

        {howOpen && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-100 dark:border-white/10 pt-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-500 font-black text-xs">L1</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">
                  {t('Direct Downline Override', 'Override Downline Langsung')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t(
                    'You earn 3% override commission from your direct downline\'s commission whenever they close a policy.',
                    'Anda mendapat 3% override dari komisi downline langsung Anda setiap kali mereka menutup polis.',
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">
                  {t('Recruit More, Earn More', 'Rekrut Lebih Banyak, Dapat Lebih')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t(
                    'Recruit more agents to grow your passive income. The more active your network, the more you earn.',
                    'Rekrut lebih banyak agen untuk meningkatkan penghasilan pasif. Semakin aktif jaringan Anda, semakin besar penghasilan Anda.',
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentNetwork;
