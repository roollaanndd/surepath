import React, { useState, useEffect } from 'react';
import AgentPromoBanner from './AgentPromoBanner';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import { formatIDRCompact } from '../../src/i18n';
import RenewalAlerts from './RenewalAlerts';
import { PathyMascot } from '../shared/cards';
import { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import {
  AgGlass, AgSection, AgButton, AgChip, AgTile, AgRow, AgEmpty, AgCountUp, AgIcon,
  type AgIconName, type AgChipTone,
} from './ui/kit';

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
}

/* ─── Beranda Mitra "Kaca Pagi" (v2.9.0) ────────────────────────────────────
 *
 * Dibangun ulang dari nol di atas primitive components/agent/ui. Sapaan, bel,
 * tema, dan avatar pindah ke bar kaca di AgentPortal (AgTopBar) sehingga
 * Beranda langsung dibuka oleh hal yang paling dicari mitra: uangnya.
 *
 *   kartu saldo      — hijau tua berkaca, garis "jalur" yang menggambar
 *                      dirinya menuju satu titik oranye; tiga aksi dompet
 *                      dan tiga angka bulan ini di dalam kartu yang sama
 *   jual sekarang    — rel produk; tiap kartu membuka pembuat penawaran
 *   promo            — AgentPromoBanner (CMS + kartu bawaan), tidak berubah
 *   fitur mitra      — delapan tujuan yang sama, ikon keluarga Jalur
 *   kinerja          — GWP estimasi + cincin konversi
 *   Pathy            — tip harian + satu tombol bertanya
 *   perpanjangan, komisi terbaru — dipertahankan
 *
 * Tidak ada tujuan atau angka yang hilang dari beranda sebelumnya. "Lainnya"
 * (Dompet, Komisi, Pathy, Profil) tidak lagi berupa grid kedua karena
 * keempatnya kini satu ketukan dari mana pun: dock, top menu, dan kartu saldo.
 */

const AgentHome: React.FC<Props> = ({
  agent, agentId, stats, recentCommissions, onNavigate, lang, walletBalance,
}) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [savedDraftProduct, setSavedDraftProduct] = useState<string | null>(null);

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

  const conversion = stats.clientsCount ? Math.min(100, Math.round((stats.policiesCount / stats.clientsCount) * 100)) : 0;

  const statusTone: Record<string, AgChipTone> = { PAID: 'green', PENDING: 'spark', CANCELLED: 'danger' };
  const statusLabel: Record<string, string> = {
    PAID: t('Paid', 'Dibayar'), PENDING: t('Pending', 'Menunggu'), CANCELLED: t('Cancelled', 'Batal'),
  };
  const productLabel: Record<string, string> = {
    CAR: t('Auto', 'Mobil'),
    TRAVEL: t('Travel', 'Perjalanan'),
    PA: t('Personal Acc.', 'Kecelakaan Diri'),
    MPAR: t('Gadget', 'Gadget'),
  };
  const productIcon: Record<string, AgIconName> = { CAR: 'car', TRAVEL: 'travel', PA: 'health', MPAR: 'gadget' };

  const salesTips = [
    t('Clients who buy Travel insurance are 3× more likely to add a PA policy within 6 months.', 'Klien Travel 3× lebih mungkin menambah polis PA dalam 6 bulan. Follow up sekarang.'),
    t('Follow up with a prospect within 24 hours to increase conversion by 60%.', 'Follow-up dalam 24 jam menaikkan konversi 60%. Hubungi 3 prospek hari ini.'),
    t('Referrals close 4× faster than cold leads. Ask every happy client for one.', 'Referral 4× lebih cepat closing. Minta referensi dari setiap klien yang puas.'),
    t('Cross-selling MPAR to car insurance clients adds avg Rp 90k commission per deal.', 'Cross-sell MPAR ke klien asuransi mobil menambah komisi rata-rata Rp 90rb per deal.'),
  ];
  const dailyTip = salesTips[new Date().getDate() % salesTips.length];
  const dailyContactGoal = 3;

  const openPathy = () => window.dispatchEvent(new Event(PATHY_OPEN_EVENT));

  const heroActions: Array<{ id: string; label: string; icon: AgIconName; target: string }> = [
    { id: 'withdraw',   label: t('Withdraw', 'Tarik dana'), icon: 'withdraw',   target: 'wallet' },
    { id: 'commission', label: t('Commission', 'Komisi'),   icon: 'commission', target: 'commission' },
    { id: 'rank',       label: t('Ranking', 'Peringkat'),   icon: 'rank',       target: 'leaderboard' },
  ];

  const products: Array<{ id: string; icon: AgIconName; title: string; note: string }> = [
    { id: 'car',    icon: 'car',    title: t('Car', 'Mobil'),               note: t('Comprehensive & TLO', 'Comprehensive & TLO') },
    { id: 'motor',  icon: 'motor',  title: t('Motorcycle', 'Motor'),        note: t('Official OJK rates', 'Tarif resmi OJK') },
    { id: 'travel', icon: 'travel', title: t('Travel', 'Perjalanan'),       note: t('Global medical cover', 'Proteksi medis global') },
    { id: 'pa',     icon: 'health', title: t('Accident', 'Kecelakaan Diri'), note: t('60-second signup', 'Daftar 60 detik') },
    { id: 'gadget', icon: 'gadget', title: t('Gadgets', 'Gadget'),          note: t('Devices & valuables', 'Gawai & barang berharga') },
  ];

  // Delapan tujuan "Fitur Mitra" — sama persis dengan beranda sebelumnya.
  const features: Array<{ id: string; label: string; icon: AgIconName }> = [
    { id: 'quotes',       label: t('Quote', 'Penawaran'),         icon: 'quote' },
    { id: 'policy',       label: t('Policies', 'Polis'),          icon: 'policy' },
    { id: 'clients',      label: t('Clients', 'Klien'),           icon: 'clients' },
    { id: 'claims',       label: t('Claims', 'Klaim'),            icon: 'claims' },
    { id: 'renewals',     label: t('Renewals', 'Perpanjangan'),   icon: 'renewals' },
    { id: 'network',      label: t('Network', 'Jaringan'),        icon: 'network' },
    { id: 'leaderboard',  label: t('Ranking', 'Peringkat'),       icon: 'rank' },
    { id: 'endorsements', label: t('Endorsements', 'Endorsemen'), icon: 'endorsements' },
  ];

  const RING = 2 * Math.PI * 26;

  return (
    <div className="space-y-7 pb-6 pt-3">
      {/* ── Kartu saldo ──────────────────────────────────────────────────── */}
      <div className="ag-rise px-5">
        <div className="ag-hero p-5">
          <span className="ag-hero__sheen" aria-hidden="true" />
          {/* Jalur menuju titik tujuan — ukuran tetap di pojok kanan atas, tidak
              ikut melar dengan tinggi kartu dan tidak melintasi tombol. */}
          <svg className="ag-hero__path" viewBox="0 0 190 96" fill="none" aria-hidden="true">
            <path d="M4 92 C 52 88, 70 58, 108 52 S 150 40, 170 20" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="170" cy="20" r="4.5" fill="#f97316" stroke="rgba(255,255,255,0.92)" strokeWidth="2" />
          </svg>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.8125rem] font-medium text-white/75">{t('Wallet balance', 'Saldo dompet')}</p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            aria-label={t('Open wallet', 'Buka dompet')}
            className="ag-press mt-2 flex items-end gap-2 text-left"
          >
            <span className="ag-display text-[clamp(1.75rem,8.6vw,2.375rem)] text-white">
              {walletBalance === null ? '—' : <AgCountUp value={walletBalance} format={formatIDR} />}
            </span>
            <AgIcon name="chevron" size={18} strokeWidth={2.2} className="mb-1.5 text-white/60" />
          </button>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/70">
            {walletBalance === null
              ? t('Balance not available right now', 'Saldo belum bisa dibaca saat ini')
              : t('Commission ready to withdraw', 'Komisi siap ditarik')}
            <span className="ag-hero__glass rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-white/90">
              {agent?.agent_code ?? 'SP-AGT'}
            </span>
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2" style={{ ['--ag-icon-accent' as string]: '#fdba74' }}>
            {heroActions.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => onNavigate(a.target)}
                className="ag-hero__glass ag-press flex flex-col items-center gap-1.5 rounded-[18px] px-2 py-3 text-xs font-semibold text-white"
              >
                <AgIcon name={a.icon} size={22} />
                {a.label}
              </button>
            ))}
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
            {[
              { k: t('This month', 'Bulan ini'), v: formatIDRCompact(stats.totalCommissionMonth ?? 0, lang) },
              { k: t('Policies', 'Polis'),       v: String(stats.policiesCount ?? 0) },
              { k: t('Clients', 'Klien'),        v: String(stats.clientsCount ?? 0) },
            ].map(s => (
              <div key={s.k} className="min-w-0">
                <dt className="truncate text-[0.6875rem] text-white/60">{s.k}</dt>
                <dd className="ag-num mt-0.5 truncate text-[0.9375rem] font-bold text-white">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {savedDraftProduct && (
        <div className="ag-rise px-5" style={{ ['--i' as string]: 1 }} role="status">
          <AgGlass strong className="flex items-center gap-3 p-3.5">
            <AgTile icon="quote" size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--ag-ink)' }}>{t('Continue your saved quote', 'Lanjutkan draf penawaran')}</p>
              <p className="ag-caption mt-0.5">{t('Your progress is saved for this session.', 'Progres tersimpan untuk sesi ini.')}</p>
            </div>
            <AgButton variant="spark" size="sm" onClick={() => onNavigate('quotes')}>{t('Resume', 'Lanjutkan')}</AgButton>
          </AgGlass>
        </div>
      )}

      {/* ── Jual sekarang ────────────────────────────────────────────────── */}
      <AgSection title={t('Sell now', 'Jual sekarang')} action={{ label: t('All products', 'Semua produk'), onClick: () => onNavigate('quotes') }} index={1}>
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: 'x proximity' }}>
          {products.map(p => (
            <AgGlass
              key={p.id}
              strong
              onClick={() => onNavigate('quotes')}
              ariaLabel={`${t('Create a quote for', 'Buat penawaran')} ${p.title}`}
              className="!w-[8.5rem] shrink-0 p-3.5"
              style={{ scrollSnapAlign: 'start' }}
            >
              <AgTile icon={p.icon} size={46} />
              <span className="mt-3 block text-sm font-semibold" style={{ color: 'var(--ag-ink)' }}>{p.title}</span>
              <span className="ag-caption mt-0.5 block leading-snug">{p.note}</span>
            </AgGlass>
          ))}
        </div>
      </AgSection>

      {/* ── Promo ────────────────────────────────────────────────────────── */}
      <div className="ag-rise px-5" style={{ ['--i' as string]: 2 }}>
        <AgentPromoBanner lang={lang} onCta={() => onNavigate('quotes')} />
      </div>

      {/* ── Fitur mitra ──────────────────────────────────────────────────── */}
      <AgSection title={t('Partner features', 'Fitur mitra')} index={3}>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-5">
          {features.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => onNavigate(f.id)}
              className="ag-press flex flex-col items-center gap-2 rounded-2xl py-1"
            >
              <AgTile icon={f.icon} size={56} iconSize={26} managedId={f.id} />
              <span className="w-full truncate text-center text-[0.6875rem] font-medium" style={{ color: 'var(--ag-ink2)' }}>{f.label}</span>
            </button>
          ))}
        </div>
      </AgSection>

      {/* ── Kinerja ──────────────────────────────────────────────────────── */}
      <AgSection title={t('This month', 'Kinerja bulan ini')} index={4}>
        <div className="px-5">
          <AgGlass className="flex items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="ag-caption flex items-center gap-1.5"><AgIcon name="trend" size={14} /> {t('Estimated GWP', 'Estimasi GWP')}</p>
              <p className="ag-display mt-1.5 truncate text-[1.625rem]" style={{ color: 'var(--ag-ink)' }} title={formatIDR(stats.totalCommissionMonth * 8)}>
                {formatIDRCompact(stats.totalCommissionMonth * 8, lang)}
              </p>
              <p className="ag-caption mt-1">{t('from commission earned this month', 'dari komisi bulan ini')}</p>
            </div>
            <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center" role="img" aria-label={`${t('Conversion', 'Konversi')} ${conversion}%`}>
              <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--ag-hairline)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke="var(--ag-green)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={RING} strokeDashoffset={RING * (1 - conversion / 100)}
                  style={{ transition: 'stroke-dashoffset 900ms var(--ag-ease)' }}
                />
              </svg>
              <span className="text-center leading-none">
                <span className="ag-num block text-base font-bold" style={{ color: 'var(--ag-ink)' }}>{conversion}%</span>
                <span className="ag-caption mt-0.5 block text-[0.625rem]">{t('conversion', 'konversi')}</span>
              </span>
            </div>
          </AgGlass>
        </div>
      </AgSection>

      {/* ── Pathy ────────────────────────────────────────────────────────── */}
      <div className="ag-rise px-5" style={{ ['--i' as string]: 5 }}>
        <AgGlass className="p-5">
          <div className="flex items-start gap-3.5">
            <span className="ag-tile h-12 w-12 shrink-0"><PathyMascot size={30} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--ag-green-ink)' }}>{t("Pathy's tip for today", 'Tip Pathy hari ini')}</p>
              <p className="mt-1 text-[0.9375rem] font-semibold leading-snug" style={{ color: 'var(--ag-ink)' }}>{dailyTip}</p>
            </div>
          </div>
          <div className="ag-divider my-4" />
          <div className="flex items-center justify-between gap-3">
            <p className="ag-caption flex min-w-0 items-center gap-2">
              <AgIcon name="target" size={18} className="shrink-0" style={{ color: 'var(--ag-green-ink)' }} />
              <span className="truncate">{t(`Today's goal: contact ${dailyContactGoal} clients`, `Target hari ini: hubungi ${dailyContactGoal} klien`)}</span>
            </p>
            <AgButton variant="glass" size="sm" icon="chat" onClick={openPathy} ariaLabel={t('Ask Pathy', 'Tanya Pathy')}>
              {t('Ask', 'Tanya')}
            </AgButton>
          </div>
        </AgGlass>
      </div>

      {/* ── Perpanjangan ─────────────────────────────────────────────────── */}
      <div className="ag-rise" style={{ ['--i' as string]: 6 }}>
        <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />
      </div>

      {/* ── Komisi terbaru ───────────────────────────────────────────────── */}
      <AgSection title={t('Recent commissions', 'Komisi terbaru')} action={{ label: t('All', 'Semua'), onClick: () => onNavigate('commission') }} index={7}>
        <div className="px-5">
          <AgGlass strong className="overflow-hidden">
            {recentCommissions.length === 0 ? (
              <AgEmpty
                icon="commission"
                title={t('No commissions yet', 'Belum ada komisi')}
                body={t('Close your first policy to start earning.', 'Tutup polis pertamamu untuk mulai dapat komisi.')}
                action={{ label: t('Create a quote', 'Buat penawaran'), onClick: () => onNavigate('quotes') }}
              />
            ) : (
              recentCommissions.slice(0, 3).map(c => (
                <AgRow
                  key={c.id}
                  icon={productIcon[c.product_type] ?? 'commission'}
                  title={productLabel[c.product_type] ?? c.product_type ?? t('Commission', 'Komisi')}
                  subtitle={new Date(c.created_at).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short' })}
                  trailing={(
                    <span className="shrink-0 text-right">
                      <span className="ag-num block text-sm font-bold" style={{ color: 'var(--ag-green-ink)' }}>+{formatIDR(c.amount ?? c.commission_amount ?? 0)}</span>
                      <AgChip tone={statusTone[c.status] ?? 'mute'} className="mt-1">{statusLabel[c.status] ?? c.status}</AgChip>
                    </span>
                  )}
                />
              ))
            )}
          </AgGlass>
        </div>
      </AgSection>
    </div>
  );
};

export default AgentHome;
