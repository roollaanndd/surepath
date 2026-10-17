import React, { useMemo, useState } from 'react';
import { Car, Shield, ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useT, useSiteTheme } from './siteKit';

// ─── OJK rates SEOJK No.06/SEOJK.05/2017 — [allRisk%, tlo%] per kategori harga ─
// Kategori: 0=≤125M, 1=≤200M, 2=≤400M, 3=≤800M, 4=>800M
const OJK_MIN: Record<WilayahKey, [number, number][]> = {
  wilayah1: [[3.82, 0.47], [2.67, 0.63], [2.18, 0.41], [1.20, 0.25], [1.05, 0.20]],
  wilayah2: [[3.26, 0.65], [2.47, 0.44], [2.08, 0.38], [1.20, 0.25], [1.05, 0.20]],
  wilayah3: [[2.53, 0.51], [2.69, 0.44], [1.79, 0.29], [1.14, 0.23], [1.05, 0.20]],
};
const OJK_MID: Record<WilayahKey, [number, number][]> = {
  wilayah1: [[4.01, 0.52], [2.81, 0.66], [2.29, 0.44], [1.26, 0.28], [1.11, 0.22]],
  wilayah2: [[3.43, 0.72], [2.60, 0.49], [2.19, 0.40], [1.26, 0.28], [1.11, 0.22]],
  wilayah3: [[2.66, 0.54], [2.83, 0.46], [1.88, 0.32], [1.20, 0.25], [1.11, 0.22]],
};
const OJK_MAX: Record<WilayahKey, [number, number][]> = {
  wilayah1: [[4.20, 0.56], [2.94, 0.69], [2.40, 0.46], [1.32, 0.30], [1.16, 0.24]],
  wilayah2: [[3.59, 0.78], [2.72, 0.53], [2.29, 0.42], [1.32, 0.30], [1.16, 0.24]],
  wilayah3: [[2.78, 0.56], [2.96, 0.48], [1.97, 0.35], [1.25, 0.27], [1.16, 0.24]],
};

type WilayahKey = 'wilayah1' | 'wilayah2' | 'wilayah3';
type Coverage = 'allRisk' | 'tlo';

const categoryFor = (juta: number): number =>
  juta <= 125 ? 0 : juta <= 200 ? 1 : juta <= 400 ? 2 : juta <= 800 ? 3 : 4;

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface Props {
  lang: Language;
  darkMode: boolean;
  onSignIn: () => void;
  onDetail: () => void;
}

const PremiumCalcWidget: React.FC<Props> = ({ lang, darkMode, onSignIn, onDetail }) => {
  const t = useT(lang);
  const th = useSiteTheme(darkMode);
  const isEN = lang === Language.EN;

  const [hargaJuta, setHargaJuta] = useState(250);
  const [wilayah, setWilayah]     = useState<WilayahKey>('wilayah2');
  const [coverage, setCoverage]   = useState<Coverage>('allRisk');

  // All three bands computed simultaneously.
  const bands = useMemo(() => {
    const cat = categoryFor(hargaJuta);
    const idx = coverage === 'allRisk' ? 0 : 1;
    const calc = (tbl: Record<WilayahKey, [number, number][]>) => {
      const r = tbl[wilayah][cat][idx];
      const a = Math.round((r / 100) * hargaJuta * 1_000_000);
      return { rate: r, annual: a, monthly: Math.round(a / 12) };
    };
    return { min: calc(OJK_MIN), mid: calc(OJK_MID), max: calc(OJK_MAX) };
  }, [hargaJuta, wilayah, coverage]);

  const regions: { key: WilayahKey; label: string }[] = [
    { key: 'wilayah1', label: isEN ? 'Region 1' : 'Wilayah 1' },
    { key: 'wilayah2', label: isEN ? 'Region 2' : 'Wilayah 2' },
    { key: 'wilayah3', label: isEN ? 'Region 3' : 'Wilayah 3' },
  ];
  const regionDesc: Record<WilayahKey, string> = {
    wilayah1: isEN ? 'Sumatra, Papua, Maluku, NTT' : 'Sumatera, Papua, Maluku, NTT',
    wilayah2: isEN ? 'Jakarta, Banten, West Java' : 'Jakarta, Banten, Jawa Barat',
    wilayah3: isEN ? 'C. Java, E. Java, Bali, Kalimantan' : 'Jateng, Jatim, Bali, Kalimantan',
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: th.textMuted, marginBottom: 12, display: 'block',
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '11px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
    border: `1.5px solid ${active ? th.accent : th.cardBorder}`,
    background: active ? `${th.accent}14` : th.cardBg,
    transition: 'all 0.18s', fontWeight: 700,
  });

  return (
    <div className="rounded-3xl overflow-hidden grid lg:grid-cols-2"
      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow }}>

      {/* ── Left: inputs ── */}
      <div className="p-7 md:p-9">
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full"
          style={{ background: `${th.accent}14`, border: `1px solid ${th.accent}33` }}>
          <Sparkles size={12} style={{ color: th.accent }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: th.accent }}>
            {t('Tarif Resmi OJK', 'Official OJK Rates')}
          </span>
        </div>
        <h3 className="font-bold leading-tight mb-1.5" style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: th.textMain }}>
          {t('Hitung premi mobilmu', 'Estimate your car premium')}
        </h3>
        <p className="text-sm mb-7" style={{ color: th.textMuted }}>
          {t('Geser & pilih — hasilnya langsung muncul. Gratis, tanpa daftar.', 'Slide & pick — results update live. Free, no sign-up.')}
        </p>

        {/* Vehicle value */}
        <div className="mb-6">
          <label htmlFor="vehicle-value-slider" style={fieldLabel}>{t('Harga Kendaraan', 'Vehicle Value')}</label>
          <div className="flex items-baseline justify-between mb-3">
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: th.textMain, letterSpacing: '-0.02em' }}>
              Rp {hargaJuta} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: th.textMuted }}>{t('juta', 'mn')}</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: th.textMuted }}>{rupiah(hargaJuta * 1_000_000)}</span>
          </div>
          <input id="vehicle-value-slider" aria-label={t('Vehicle value in millions of rupiah', 'Harga kendaraan dalam juta rupiah')} type="range" min={50} max={2000} step={5} value={hargaJuta}
            onChange={e => setHargaJuta(Number(e.target.value))}
            style={{ width: '100%', accentColor: th.accent, cursor: 'pointer', height: 6 }} />
          <div className="flex justify-between mt-1.5" style={{ fontSize: '0.65rem', color: th.textSubtle }}>
            <span>Rp 50jt</span><span>Rp 2 M</span>
          </div>
        </div>

        {/* Region */}
        <div className="mb-6">
          <label style={fieldLabel}>{t('Wilayah', 'Region')}</label>
          <div className="grid grid-cols-3 gap-2">
            {regions.map(r => (
              <button key={r.key} onClick={() => setWilayah(r.key)} style={chip(wilayah === r.key)}>
                <span style={{ fontSize: '0.8rem', color: wilayah === r.key ? th.accent : th.textMain }}>{r.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2" style={{ fontSize: '0.68rem', color: th.textSubtle }}>{regionDesc[wilayah]}</p>
        </div>

        {/* Coverage */}
        <div>
          <label style={fieldLabel}>{t('Jenis Perlindungan', 'Coverage Type')}</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCoverage('allRisk')} style={chip(coverage === 'allRisk')}>
              <div className="flex items-center justify-center gap-1.5">
                <Shield size={15} style={{ color: coverage === 'allRisk' ? th.accent : th.textMuted }} />
                <span style={{ fontSize: '0.82rem', color: coverage === 'allRisk' ? th.accent : th.textMain }}>All Risk</span>
              </div>
            </button>
            <button onClick={() => setCoverage('tlo')} style={chip(coverage === 'tlo')}>
              <div className="flex items-center justify-center gap-1.5">
                <Car size={15} style={{ color: coverage === 'tlo' ? th.accent : th.textMuted }} />
                <span style={{ fontSize: '0.82rem', color: coverage === 'tlo' ? th.accent : th.textMain }}>TLO</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: live result ── */}
      <div className="p-7 md:p-9 flex flex-col justify-center relative overflow-hidden"
        style={{ background: darkMode
          ? `linear-gradient(155deg, ${th.accent}1f, ${th.accent}08)`
          : `linear-gradient(155deg, ${th.accent}14, ${th.accent}05)` }}>
        {/* soft glow */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${th.accent}33, transparent 70%)`, pointerEvents: 'none' }} />

        <div className="relative">
          <p style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: th.textMuted }}>
            {t('Estimasi Premi Tahunan (Tarif OJK)', 'Estimated Annual Premium (OJK Rates)')}
          </p>

          {/* Three-band comparison */}
          <div className="mt-3 space-y-2">
            {([
              { key: 'min', label: t('Batas Bawah', 'Lower Limit'), data: bands.min, muted: true },
              { key: 'mid', label: t('Tarif Tengah', 'Mid Rate'),   data: bands.mid, muted: false },
              { key: 'max', label: t('Batas Atas',   'Upper Limit'), data: bands.max, muted: true },
            ] as const).map(({ key, label, data, muted }) => (
              <div key={key} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: muted ? `${th.accent}08` : `${th.accent}18`, border: `1px solid ${muted ? th.cardBorder : th.accent + '44'}` }}>
                <div>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted ? th.textSubtle : th.accent }}>{label}</div>
                  <div style={{ fontSize: '0.72rem', color: th.textMuted }}>{data.rate.toFixed(2)}%</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: muted ? '1rem' : '1.25rem', fontWeight: 900, lineHeight: 1.1, color: muted ? th.textMain : th.accent, letterSpacing: '-0.02em' }}>
                    {rupiah(data.annual)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: th.textMuted }}>≈ {rupiah(data.monthly)}/{t('bln', 'mo')}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${th.cardBorder}` }}>
            <div style={{ fontSize: '0.6rem', color: th.textSubtle, marginBottom: 8 }}>
              {t('Perlindungan', 'Coverage')}: <strong style={{ color: th.textMain }}>{coverage === 'allRisk' ? 'All Risk (Komprehensif)' : 'TLO'}</strong>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-3">
            <button onClick={onSignIn}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: th.accent, boxShadow: `0 10px 26px -10px ${th.accent}` }}>
              <MessageCircle size={15} /> {t('Konsultasi Gratis', 'Free Consultation')}
            </button>
            <button onClick={onDetail}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
              style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, color: th.textMain }}>
              {t('Hitung lengkap & kirim ke agen', 'Full calc & send to agent')} <ArrowRight size={14} />
            </button>
          </div>

          <p className="mt-4" style={{ fontSize: '0.6rem', lineHeight: 1.6, color: th.textSubtle }}>
            {t('Tarif resmi OJK SEOJK No.06/SEOJK.05/2017. Premi final ditentukan perusahaan asuransi.',
               'Official OJK rates per SEOJK No.06/SEOJK.05/2017. Final premium set by the insurer.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumCalcWidget;
