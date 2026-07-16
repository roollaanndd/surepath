import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Users, ChevronDown, ChevronUp, ChevronRight, Coins } from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentDownlineTree,
  getOverrideTransactions,
  getAgentOrders,
  type WalletTransaction,
  type SpPolicyOrder,
  type DownlineNode,
  type SpAgentTier,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { AgentArtKeyframes, AgentHero, SpotNetwork } from './AgentArt';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';

interface Props {
  agentId: string;
  lang: Language;
  agent: any;
}

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TierBadge({ tier, tiers }: { tier?: string | null; tiers: SpAgentTier[] }) {
  const cfg = getTierByCode(tiers, tier);
  if (!cfg || cfg.is_default) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.5rem] font-black uppercase tracking-widest"
      style={{ background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}
    >
      {cfg.emoji} {cfg.name}
    </span>
  );
}

const AgentNetwork: React.FC<Props> = ({ agentId, lang, agent }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);

  const { tiers } = useTierDefinitions();
  const agentTierCode = agent?.tier as string | undefined;
  const tierCfg = getTierByCode(tiers, agentTierCode) ?? tiers.find(x => x.is_default) ?? null;
  const isDefaultTier = !tierCfg || tierCfg.is_default;

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [downlines, setDownlines] = useState<DownlineNode[]>([]);
  const [overrideTxns, setOverrideTxns] = useState<WalletTransaction[]>([]);
  const [allOrders, setAllOrders] = useState<SpPolicyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    Promise.all([
      // Fetch referral code directly from agent prop or supabase
      (async () => agent?.agent_code ?? null)(),
      getAgentDownlineTree(agentId),
      getOverrideTransactions(agentId),
    ]).then(([code, dl, txns]) => {
      setReferralCode(code);
      setDownlines(dl);
      setOverrideTxns(txns);
    }).finally(() => setLoading(false));
  }, [agentId]);

  // Fetch issued orders (gateway scopes to the caller's own orders — downline
  // order details are private; downline stats come from override transactions)
  useEffect(() => {
    if (downlines.length === 0) return;
    getAgentOrders(agentId).then(setAllOrders);
  }, [downlines, agentId]);

  const referralLink = `https://myinsurepath.com?ref=${referralCode ?? ''}`;
  const totalOverride = overrideTxns.reduce((s, tx) => s + tx.amount, 0);
  const l1Count = downlines.length;
  const l2Count = downlines.reduce((s, d) => s + d.l2.length, 0);

  function agentOrders(id: string) {
    return allOrders.filter(o => o.agent_id === id && o.status === 'ISSUED');
  }
  function agentGWPMonth(id: string) {
    return allOrders
      .filter(o => o.agent_id === id && o.status === 'ISSUED' && (o.created_at ?? '') >= startOfMonth)
      .reduce((s, o) => s + (o.total_premium ?? 0), 0);
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin motion-reduce:animate-none"
          style={{ borderColor: 'rgba(0,200,150,0.2)', borderTopColor: '#00C896' }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto font-sora">

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <AgentArtKeyframes />
      <AgentHero
        title={t('Partner Network', 'Jaringan Mitra')}
        subtitle={t('Grow your team and earn override commission.', 'Kembangkan tim Anda dan dapatkan komisi override.')}
        art={<SpotNetwork size={80} />}
      />

      {/* ── My Tier Card ─────────────────────────────────────────────────── */}
      {tierCfg && !isDefaultTier ? (
        <div
          className="rounded-[2rem] p-5 border"
          style={{
            background: `linear-gradient(135deg, ${tierCfg.color}14, ${tierCfg.color}08)`,
            borderColor: tierCfg.color + '33',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            {tierCfg.emoji && <span className="text-3xl">{tierCfg.emoji}</span>}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">
                {t('Your Tier', 'Tier Anda')}
              </p>
              <p className="font-black text-lg" style={{ color: tierCfg.color }}>{tierCfg.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('Coin Bonus', 'Bonus Koin'), value: `+${(tierCfg.coin_bonus_rate * 100).toFixed(0)}%` },
              { label: t('L1 Override', 'Override L1'), value: `${(tierCfg.l1_override_rate * 100).toFixed(0)}%` },
              { label: t('L2 Override', 'Override L2'), value: tierCfg.l2_override_rate > 0 ? `${(tierCfg.l2_override_rate * 100).toFixed(0)}%` : '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-2.5 text-center"
                style={{ background: tierCfg.color + '14', border: `1px solid ${tierCfg.color}22` }}
              >
                <p className="font-black text-sm" style={{ color: tierCfg.color }}>{value}</p>
                <p className="text-[0.55rem] font-bold opacity-50 mt-0.5 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[0.6rem] mt-3 opacity-40 text-center">
            {t(
              'Override is % of downline\'s commission. Coin bonus applied per sale.',
              'Override adalah % dari komisi downline. Bonus koin dihitung per penjualan.',
            )}
          </p>
        </div>
      ) : (
        <div className="sp-glass rounded-[2rem] p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ds-card2 flex items-center justify-center text-ds-ink3 flex-shrink-0">
            <Users size={16} />
          </div>
          <div>
            <p className="text-xs font-black text-ds-ink">{tierCfg?.name ?? 'Standard'}</p>
            <p className="text-[0.6rem] text-ds-ink3">
              {t(
                `${((tierCfg?.l1_override_rate ?? 0.02) * 100).toFixed(0)}% override on L1 downline commission.`,
                `${((tierCfg?.l1_override_rate ?? 0.02) * 100).toFixed(0)}% override dari komisi downline L1.`,
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Referral Code Card ──────────────────────────────────────────── */}
      <div className="bg-ds-navy rounded-[2rem] p-6 text-white shadow-ds-navy">
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
            <p className="text-2xl font-black">{l1Count}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-70">{t('L1 Downlines', 'Downline L1')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{l2Count}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-70">{t('L2 Downlines', 'Downline L2')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black">{formatIDR(totalOverride)}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-70">{t('Override Earned', 'Override Diperoleh')}</p>
          </div>
        </div>
      </div>

      {/* ── Downline Tree (2 levels) ────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-ds-ink3 mb-3 px-1">
          {t('My Network', 'Jaringan Saya')} ({l1Count + l2Count} {t('agents', 'agen')})
        </h3>

        {downlines.length === 0 ? (
          <div className="bg-ds-card2 border border-ds-border rounded-[2rem] p-8 text-center">
            <Users size={32} className="mx-auto text-ds-ink3 mb-3" />
            <p className="text-sm font-bold text-ds-ink2">
              {t('No downlines yet', 'Belum ada downline')}
            </p>
            <p className="text-[11px] text-ds-ink3 mt-1">
              {t(
                'Share your referral code to recruit agents and earn override commissions.',
                'Bagikan kode referral Anda untuk merekrut agen dan dapatkan komisi override.',
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {downlines.map(dl => {
              const l1Orders  = agentOrders(dl.id);
              const l1GWP     = agentGWPMonth(dl.id);
              const isOpen    = expanded[dl.id] ?? false;
              const dl2Count  = dl.l2.length;

              return (
                <div key={dl.id}>
                  {/* L1 row */}
                  <div className="sp-glass rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-ds-green-tint flex items-center justify-center font-black text-ds-green text-sm flex-shrink-0">
                        {getInitials(dl.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-black text-sm text-ds-ink truncate">{dl.name}</p>
                          <TierBadge tier={dl.tier} tiers={tiers} />
                        </div>
                        <p className="text-[10px] font-bold text-ds-green">{dl.agent_code ?? '—'}</p>
                        <p className="text-[9px] text-ds-ink3">
                          {t('Joined', 'Bergabung')} {fmtDate(dl.created_at)}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-ds-ink">{l1Orders.length} {t('policies', 'polis')}</p>
                        <p className="text-[9px] text-ds-green font-bold">{formatIDR(l1GWP)}</p>
                        <p className="text-[8px] text-ds-ink3">{t('GWP this month', 'GWP bulan ini')}</p>
                      </div>

                      {/* Expand toggle (only if has L2) */}
                      {dl2Count > 0 && (
                        <button
                          onClick={() => setExpanded(prev => ({ ...prev, [dl.id]: !isOpen }))}
                          className="w-7 h-7 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center flex-shrink-0"
                        >
                          {isOpen
                            ? <ChevronUp size={12} className="text-ds-ink3" />
                            : <ChevronDown size={12} className="text-ds-ink3" />
                          }
                        </button>
                      )}
                    </div>

                    {/* L2 sub-list */}
                    {isOpen && dl.l2.length > 0 && (
                      <div className="mt-3 ml-8 space-y-2 border-l-2 border-dashed border-ds-border pl-3">
                        {dl.l2.map(l2 => {
                          const l2Orders = agentOrders(l2.id);
                          const l2GWP    = agentGWPMonth(l2.id);
                          return (
                            <div key={l2.id} className="flex items-center gap-2">
                              <ChevronRight size={10} className="text-ds-ink3 flex-shrink-0" />
                              <div className="flex-1 flex items-center gap-2.5 bg-ds-card2 rounded-xl p-2.5">
                                <div className="w-7 h-7 rounded-full bg-ds-purple-lt flex items-center justify-center font-black text-ds-purple text-[0.6rem] flex-shrink-0">
                                  {getInitials(l2.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <p className="font-black text-[0.7rem] text-ds-ink truncate">{l2.name}</p>
                                    <TierBadge tier={l2.tier} tiers={tiers} />
                                  </div>
                                  <p className="text-[0.55rem] text-ds-ink3">{l2.agent_code ?? '—'} · {t('Joined', 'Bergabung')} {fmtDate(l2.created_at)}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-[0.65rem] font-black text-ds-ink">{l2Orders.length} {t('polis', 'polis')}</p>
                                  <p className="text-[0.55rem] text-ds-green font-bold">{formatIDR(l2GWP)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* L2 count hint */}
                    {dl2Count > 0 && !isOpen && (
                      <p className="mt-2 ml-13 text-[0.58rem] text-ds-ink3 pl-1">
                        +{dl2Count} {t('indirect downline', 'downline tidak langsung')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Override Commission History ─────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-ds-ink3 mb-3 px-1">
          {t('Override Commission History', 'Riwayat Komisi Override')}
        </h3>

        {overrideTxns.length === 0 ? (
          <div className="bg-ds-card2 border border-ds-border rounded-[2rem] p-6 text-center">
            <Coins size={28} className="mx-auto text-ds-ink3 mb-2" />
            <p className="text-xs text-ds-ink3">{t('No override commissions yet', 'Belum ada komisi override')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overrideTxns.slice(0, 15).map(tx => (
              <div
                key={tx.id}
                className="sp-glass rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-ds-ink">
                    {tx.description ?? t('Override commission', 'Komisi override')}
                  </p>
                  <p className="text-[9px] text-ds-ink3">{fmtDate(tx.created_at)}</p>
                </div>
                <span className="text-sm font-black text-ds-green">+{formatIDR(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <div className="sp-glass rounded-[2rem] overflow-hidden">
        <button
          onClick={() => setHowOpen(!howOpen)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <span className="text-xs font-black uppercase tracking-widest text-ds-ink">
            {t('How It Works', 'Cara Kerja')}
          </span>
          {howOpen ? <ChevronUp size={16} className="text-ds-ink3" /> : <ChevronDown size={16} className="text-ds-ink3" />}
        </button>

        {howOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-ds-border pt-4">
            {/* Tier comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[0.65rem]">
                <thead>
                  <tr>
                    <th className="text-left text-ds-ink3 font-bold pb-2 pr-3">{t('Tier', 'Tier')}</th>
                    <th className="text-center text-ds-ink3 font-bold pb-2 px-2">{t('Coin Bonus', 'Bonus Koin')}</th>
                    <th className="text-center text-ds-ink3 font-bold pb-2 px-2">{t('L1 Override', 'Override L1')}</th>
                    <th className="text-center text-ds-ink3 font-bold pb-2 px-2">{t('L2 Override', 'Override L2')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ds-border">
                  {tiers.map(row => (
                    <tr key={row.code}>
                      <td className="py-2 pr-3 font-black" style={{ color: row.color }}>
                        {row.emoji} {row.name}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-ds-ink2">{row.coin_bonus_rate > 0 ? `+${(row.coin_bonus_rate * 100).toFixed(0)}%` : '—'}</td>
                      <td className="py-2 px-2 text-center font-bold text-ds-ink2">{row.l1_override_rate > 0 ? `${(row.l1_override_rate * 100).toFixed(0)}%` : '—'}</td>
                      <td className="py-2 px-2 text-center font-bold text-ds-ink2">{row.l2_override_rate > 0 ? `${(row.l2_override_rate * 100).toFixed(0)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[0.65rem] text-ds-ink3 space-y-1.5 pt-1">
              <p>• {t('Override is calculated from downline\'s commission amount (not from premium).', 'Override dihitung dari jumlah komisi downline (bukan dari premi).')}</p>
              <p>• {t('Max 2 downline layers. L3 and beyond receive no override.', 'Maksimal 2 lapisan downline. L3 ke bawah tidak mendapat override.')}</p>
              <p>• {t('Coin bonus is extra coins on top of the base reward per sale.', 'Bonus koin adalah koin tambahan di atas reward dasar per penjualan.')}</p>
              <p>• {t('Tiers are assigned by SurePath business managers.', 'Tier ditetapkan oleh manajer bisnis SurePath.')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentNetwork;
