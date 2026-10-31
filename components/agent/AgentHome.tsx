import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Coins, FilePlus2 } from 'lucide-react';
import PromoBanner from '../PromoBanner';
import { motion, useReducedMotion } from 'motion/react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import { formatIDRCompact } from '../../src/i18n';
import RenewalAlerts from './RenewalAlerts';
import { PathyMascot } from '../shared/cards';
import { ClayCard } from '../ui';
import { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import SuperAppHeader from '../shared/superapp/SuperAppHeader';
import ProtectionSummaryCard from '../shared/superapp/ProtectionSummaryCard';
import ServiceGrid, { type ServiceTile } from '../shared/superapp/ServiceGrid';
import ContentRail, { type RailItem } from '../shared/superapp/ContentRail';
import { IcQuote, IcWallet, IcRank } from './AgentIcons';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';
import '../../src/styles/portal-modernization.css';

interface Props {
  agent: any;
  agentId: string;
  stats: any;
  recentCommissions: any[];
  onNavigate: (tab: string) => void;
  lang: Language;
  agentTier?: string | null;
  /** Saldo dompet komisi; null selama dimuat atau bila gagal dibaca. */
  walletBalance: number | null;
  unreadCount: number;
  darkMode: boolean;
  onToggleDark: () => void;
  onBellClick: () => void;
}

/* ─── Beranda Mitra dalam bahasa super app (v2.7.35) ────────────────────────
 *
 * Acuan: tangkapan layar super app yang diberikan roland, 31 Okt 2026. Lima
 * bagiannya dipetakan ke produk ini, bukan disalin:
 *
 *   pita sapaan bergradasi   → SuperAppHeader (sapaan, kode mitra, tier)
 *   kartu "Balance"          → ProtectionSummaryCard: saldo dompet komisi
 *                              yang MEMANG ada di sp_agent_wallets, plus
 *                              empat aksi cepat
 *   grid layanan 2×4         → ServiceGrid "Fitur Mitra" — delapan tujuan
 *                              portal yang sama persis seperti sebelumnya
 *   rail konten mendatar     → ContentRail "Produk untuk dijual"
 *   nav 5 tab                → PortalTabBar variant="flat" (di AgentPortal)
 *
 * Tidak ada aset, warna, atau merek dari gambar acuan yang ikut: seluruh
 * nilai berasal dari token --ds-*, dan ikonnya dari sistem ikon ilustratif
 * SurePath sendiri (Icon Manager tetap bisa menimpanya).
 *
 * Yang dipertahankan utuh dari beranda sebelumnya — tidak satu pun tujuan,
 * alat, atau angka dihapus: banner draf penawaran, PromoBanner, kedelapan
 * tujuan "Fitur Mitra", keempat "Lainnya", GWP & konversi, pelatih Pathy,
 * RenewalAlerts, dan daftar komisi terbaru.
 */

const AgentHome: React.FC<Props> = ({
  agent, agentId, stats, recentCommissions, onNavigate, lang, agentTier,
  walletBalance, unreadCount, darkMode, onToggleDark, onBellClick,
}) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [savedDraftProduct, setSavedDraftProduct] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const { tiers } = useTierDefinitions();
  const myTierDef = getTierByCode(tiers, agentTier);

  useEffect(() => {
    if (!agentId) return;
    try {
      const raw = window.sessionStorage.getItem('surepath:agent-quote-draft:' + agentId);
      const draft = raw ? JSON.parse(raw) : null;
      setSavedDraftProduct(draft?.product ?? null);
    } catch {
      setSavedDraftProduct(null);
    }
  }, [agentId]);

  const conversion = stats.clientsCount ? Math.round((stats.policiesCount / stats.clientsCount) * 100) : 0;

  const reveal = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
        };

  const statusColor: Record<string, string> = {
    PAID: 'bg-ds-green-tint text-ds-green',
    PENDING: 'bg-ds-amber-lt text-ds-amber',
    CANCELLED: 'bg-ds-red-lt text-ds-red',
  };

  const productLabel: Record<string, string> = {
    CAR: t('Auto', 'Mobil'),
    TRAVEL: t('Travel', 'Perjalanan'),
    PA: t('Personal Acc.', 'Kecelakaan Diri'),
    MPAR: t('Gadget', 'Gadget'),
  };

  const salesTips = [
    t('Clients who buy Travel insurance are 3A- more likely to add a PA policy within 6 months.', 'Klien Travel 3A- lebih mungkin tambah polis PA dalam 6 bulan. Follow up sekarang!'),
    t('Follow up with a prospect within 24 hours to increase conversion by 60%.', 'Follow-up dalam 24 jam tingkatkan konversi 60%. Hubungi 3 prospek hari ini.'),
    t('Referrals close 4A- faster than cold leads. Ask every happy client for one.', 'Referral 4A- lebih cepat closing. Minta referensi dari setiap klien puas hari ini.'),
    t('Cross-selling MPAR to car insurance clients adds avg Rp 90k commission per deal.', 'Cross-sell MPAR ke klien asuransi mobil = tambahan komisi Rp 90rb per deal!'),
  ];
  const dailyTip = salesTips[new Date().getDate() % salesTips.length];
  const dailyContactGoal = 3;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return t('Good Morning', 'Selamat Pagi');
    if (h < 15) return t('Good Afternoon', 'Selamat Siang');
    if (h < 18) return t('Good Evening', 'Selamat Sore');
    return t('Good Night', 'Selamat Malam');
  };

  const openPathy = () => window.dispatchEvent(new Event(PATHY_OPEN_EVENT));

  // Delapan tujuan "Fitur Mitra" — sama persis dengan beranda sebelumnya,
  // kini dalam grid 2×4 bergaya acuan.
  const featureTiles: ServiceTile[] = [
    { id: 'quotes',       label: t('New quote', 'Quotation'),    onClick: () => onNavigate('quotes') },
    { id: 'policy',       label: t('Policies', 'Polis'),         onClick: () => onNavigate('policy') },
    { id: 'clients',      label: t('Clients', 'Klien'),          onClick: () => onNavigate('clients') },
    { id: 'claims',       label: t('Claims', 'Klaim'),           onClick: () => onNavigate('claims') },
    { id: 'renewals',     label: t('Renewals', 'Perpanjangan'),  onClick: () => onNavigate('renewals') },
    { id: 'network',      label: t('Network', 'Jaringan'),       onClick: () => onNavigate('network') },
    { id: 'leaderboard',  label: t('Ranking', 'Peringkat'),      onClick: () => onNavigate('leaderboard') },
    { id: 'endorsements', label: t('Endorsements', 'Endorsemen'), onClick: () => onNavigate('endorsements') },
  ];

  const otherTiles: ServiceTile[] = [
    { id: 'wallet',     label: t('Wallet', 'Dompet'),     onClick: () => onNavigate('wallet') },
    { id: 'commission', label: t('Commission', 'Komisi'), onClick: () => onNavigate('commission') },
    { id: 'pathy',      label: 'Pathy',                   onClick: openPathy },
    { id: 'profile',    label: t('Profile', 'Profil'),    onClick: () => onNavigate('profile') },
  ];

  // Rail produk — tiap kartu membuka pembuat penawaran, tujuan yang sudah ada.
  const railItems: RailItem[] = [
    { id: 'car',    title: t('Motor & car', 'Mobil & Motor'),     subtitle: t('Comprehensive and TLO, priced off the active OJK rate set.', 'Comprehensive dan TLO, memakai tarif OJK yang berlaku.'), onClick: () => onNavigate('quotes') },
    { id: 'travel', title: t('Travel', 'Perjalanan'),             subtitle: t('Global medical cover and delay payouts for your clients.', 'Proteksi medis global dan santunan keterlambatan untuk klienmu.'), onClick: () => onNavigate('quotes') },
    { id: 'health', title: t('Personal accident', 'Kecelakaan Diri'), subtitle: t('Sixty-second signup, fast approval — an easy first policy.', 'Pendaftaran 60 detik, persetujuan cepat — polis pertama yang mudah.'), onClick: () => onNavigate('quotes') },
    { id: 'box',    title: t('Items & gadgets', 'Barang & Gadget'),   subtitle: t('Cover for devices, electronics and valuables.', 'Proteksi gadget, elektronik, dan barang berharga.'), onClick: () => onNavigate('quotes') },
  ];

  return (
    <div className="sp-agent-home pb-28">
      <SuperAppHeader
        greeting={greeting()}
        name={agent?.name?.split(' ')[0] ?? 'Mitra'}
        subtitle={agent?.agent_code ?? 'SP-AGT'}
        badge={myTierDef && !myTierDef.is_default ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ds-card px-2 py-0.5 text-2xs font-black uppercase tracking-wider text-ds-ink2 ring-1 ring-ds-border">
            <span aria-hidden="true">{myTierDef.emoji}</span> {myTierDef.name}
          </span>
        ) : undefined}
        unreadCount={unreadCount}
        darkMode={darkMode}
        onBellClick={onBellClick}
        onToggleDark={onToggleDark}
        onAvatarClick={() => onNavigate('profile')}
        labels={{
          notifications: t('Notifications', 'Notifikasi'),
          theme: t('Toggle theme', 'Ganti tema'),
          profile: t('Profile', 'Profil'),
        }}
      />

      <ProtectionSummaryCard
        label={t('Wallet balance', 'Saldo Dompet')}
        unit="IDR"
        value={walletBalance === null ? '—' : formatIDRCompact(walletBalance, lang)}
        caption={walletBalance === null
          ? t('Balance not available right now', 'Saldo belum bisa dibaca saat ini')
          : t('Commission ready to withdraw', 'Komisi siap ditarik')}
        openLabel={t('Open wallet', 'Buka dompet')}
        onOpen={() => onNavigate('wallet')}
        actions={[
          { id: 'withdraw', label: t('Withdraw', 'Tarik Dana'), icon: IcWallet, color: 'var(--ds-primary)', onClick: () => onNavigate('wallet') },
          { id: 'commission', label: t('Commission', 'Komisi'), icon: Coins,   color: 'var(--ds-info)',    onClick: () => onNavigate('commission') },
          { id: 'quote', label: t('New quote', 'Quotation'),    icon: IcQuote,  color: 'var(--ds-accent)',  onClick: () => onNavigate('quotes') },
          { id: 'rank', label: t('Ranking', 'Peringkat'),       icon: IcRank,   color: 'var(--ds-warning)', onClick: () => onNavigate('leaderboard') },
        ]}
      />

      <div className="space-y-6 pt-6">
        {savedDraftProduct && (
          <div className="sp-agent-home__draft mx-5 flex items-center gap-3 rounded-2xl border border-ds-green/25 bg-ds-green-tint p-4" role="status">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-card text-ds-green"><FilePlus2 size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ds-ink">{t('Continue your saved quote', 'Lanjutkan draf penawaran')}</p>
              <p className="mt-0.5 text-xs text-ds-ink2">{t('Your progress is saved for this session.', 'Progres tersimpan untuk sesi ini.')}</p>
            </div>
            <button type="button" onClick={() => onNavigate('quotes')} className="min-h-10 rounded-xl bg-ds-green px-3 text-xs font-black text-ds-on-green">{t('Resume', 'Lanjutkan')}</button>
          </div>
        )}

        {/* Fitur Mitra — grid layanan 2×4, jantung layar acuan */}
        <motion.section className="sp-agent-home__fitur px-5" aria-label={t('Partner features', 'Fitur Mitra')} {...reveal(1)}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black tracking-tight text-ds-ink">{t('Partner Features', 'Fitur Mitra')}</h3>
            <button onClick={() => onNavigate('policy')} className="rounded text-xs font-bold text-ds-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green">
              {t('View More', 'Selengkapnya')}
            </button>
          </div>
          <ServiceGrid tiles={featureTiles} />
        </motion.section>

        {/* Lainnya — baris kedua, alat yang bukan alur penjualan */}
        <motion.section className="sp-agent-home__lainnya px-5" aria-label={t('Other tools', 'Lainnya')} {...reveal(2)}>
          <h3 className="mb-3 text-sm font-black tracking-tight text-ds-ink">{t('Other Tools', 'Lainnya')}</h3>
          <ServiceGrid tiles={otherTiles} />
        </motion.section>

        <div className="px-5">
          <PromoBanner />
        </div>

        {/* Rail produk — padanan bagian konten mendatar di acuan */}
        <motion.div {...reveal(3)}>
          <ContentRail
            title={t('Products to sell', 'Produk untuk Dijual')}
            action={{ label: t('All', 'Semua'), onClick: () => onNavigate('quotes') }}
            items={railItems}
          />
        </motion.div>

        {/* GWP & konversi — dipertahankan dari beranda sebelumnya */}
        <motion.div className="sp-agent-home__gwp px-5" {...reveal(4)}>
          <div className="sp-glass flex items-center rounded-[1.5rem] p-5">
            <div className="flex-1 pr-5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-ds-green" />
                <p className="text-2xs font-medium uppercase tracking-wider text-ds-ink3">{t('GWP / Month', 'GWP Bulan Ini')}</p>
              </div>
              <p className="whitespace-nowrap font-mono text-xl font-black leading-none tabular-nums text-ds-ink"
                title={formatIDR(stats.totalCommissionMonth * 8)}>
                {formatIDRCompact(stats.totalCommissionMonth * 8, lang)}
              </p>
              <p className="mt-1 text-2xs text-ds-ink3">{t('estimated', 'estimasi')}</p>
            </div>
            <div className="flex-1 border-l border-ds-border pl-5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Target size={13} className="text-ds-amber" />
                <p className="text-2xs font-medium uppercase tracking-wider text-ds-ink3">{t('Conversion', 'Konversi')}</p>
              </div>
              <p className="font-mono text-xl font-black leading-none text-ds-ink">{conversion}%</p>
              <p className="mt-1 text-2xs text-ds-ink3">{t('clients to policies', 'klien → polis')}</p>
            </div>
          </div>
        </motion.div>

        {/* Pelatih penjualan Pathy — dipertahankan */}
        <motion.div className="sp-agent-home__coach px-5" {...reveal(5)}>
          <div className="sp-glass rounded-[1.5rem] p-5">
            <div className="flex items-start gap-3">
              <div className="animate-float flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-1"
                style={{ background: 'linear-gradient(135deg, rgba(0,193,106,0.16), rgba(253,224,71,0.20))', boxShadow: 'inset 0 0 0 1.5px rgba(0,193,106,0.25)' }}>
                <PathyMascot size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-2xs font-black uppercase tracking-wider text-ds-green">{t('AI Sales Coach — Pathy', 'Pelatih AI — Pathy')}</p>
                <p className="text-sm font-bold leading-snug text-ds-ink">{dailyTip}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2.5 border-t border-ds-border pt-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ds-green-tint text-ds-green">
                <Target size={20} />
              </div>
              <div>
                <p className="text-2xs font-medium text-ds-ink3">{t('Daily Goal', 'Target Harian')}</p>
                <p className="text-xs font-black text-ds-ink">{t(`Contact ${dailyContactGoal} clients`, `Hubungi ${dailyContactGoal} klien`)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pengingat perpanjangan — dipertahankan */}
        <motion.div {...reveal(6)}>
          <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />
        </motion.div>

        {/* Komisi terbaru — dipertahankan */}
        <motion.div className="sp-agent-home__commissions px-5" {...reveal(7)}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black tracking-tight text-ds-ink">{t('Recent Commissions', 'Komisi Terbaru')}</h3>
            <button onClick={() => onNavigate('commission')} className="rounded text-xs font-bold text-ds-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green">
              {t('View All', 'Semua')}
            </button>
          </div>
          <ClayCard padding="none" className="overflow-hidden">
            {recentCommissions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ds-green-tint">
                  <Coins size={20} className="text-ds-green" />
                </div>
                <p className="text-sm font-bold text-ds-ink">{t('No commissions yet', 'Belum ada komisi')}</p>
                <p className="max-w-[14rem] text-xs text-ds-ink3">{t('Close your first policy to start earning.', 'Tutup polis pertamamu untuk mulai dapat komisi.')}</p>
              </div>
            ) : (
              recentCommissions.slice(0, 3).map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < Math.min(recentCommissions.length, 3) - 1 ? 'border-b border-ds-border' : ''}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ds-green-tint">
                    <TrendingUp size={16} className="text-ds-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ds-ink">{productLabel[c.product_type] ?? c.product_type}</p>
                    <p className="text-2xs text-ds-ink3">{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-ds-green">+{formatIDR(c.amount)}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-2xs font-bold ${statusColor[c.status] ?? 'bg-ds-card2 text-ds-ink2'}`}>{c.status}</span>
                  </div>
                </div>
              ))
            )}
          </ClayCard>
        </motion.div>
      </div>
    </div>
  );
};

export default AgentHome;
