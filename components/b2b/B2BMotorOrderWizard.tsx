// B2BMotorOrderWizard — ordering motor vehicle insurance from a B2B client
// account, with multi-year (up to 6 years) and depreciation support.
//
// Lean wizard (5 steps) instead of composing the agent/customer wizards
// which carry a lot of context that doesn't apply here (KTP scanning for
// retail nasabah, commission splits for agents, etc). The client is the
// signed-in B2B company itself — we pre-fill from session.
//
// Pricing uses services/ojkRates.calcMultiYearPremium which applies
// compound -10%/year depreciation on sum insured and sums premiums per
// year. Billing is upfront total via Xendit; the gateway creates one
// invoice for the whole duration.

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Car, ShieldCheck, Calendar, CheckCircle2,
  CreditCard, AlertTriangle, Loader2, Percent, Info, Eye, EyeOff, Sparkles,
} from 'lucide-react';
import { Language } from '../../types';
import { createPolicyOrder } from '../../services/orders';
import type { SpPolicyOrder } from '../../services/dbTypes';
import {
  VEHICLE_DATABASE, getModelsForBrand, getMarketValueForYear, VEHICLE_BRANDS,
} from '../../services/vehicleDatabase';
import {
  calcMultiYearPremium, type MultiYearBreakdown,
  type CoverageType, type Zone, type AddOns,
  B2B_DEPRECIATION_RATE, B2B_MAX_DURATION_YEARS, B2B_MAX_DISCOUNT_RATE,
  ZONE_LABELS,
} from '../../services/ojkRates';
import { createXenditInvoice } from '../../services/paymentService';
import { formatIDR } from '../car-wizard/WizardUI';
import {
  B2BGlass, B2BSectionHeader, B2BButton, useB2BToast,
} from './dashboard/ui';

interface Props {
  client: {
    id: string;
    name?: string;
    email?: string;
    company_name?: string;
    phone?: string;
  };
  onDone: () => void;
  lang: Language;
}

const STEPS = [
  { id: 'vehicle',   label: 'Kendaraan',   icon: Car },
  { id: 'coverage',  label: 'Pertanggungan', icon: ShieldCheck },
  { id: 'duration',  label: 'Durasi & Mulai', icon: Calendar },
  { id: 'review',    label: 'Review',      icon: CheckCircle2 },
  { id: 'payment',   label: 'Bayar',       icon: CreditCard },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

/** Default addons — all off. Caller can toggle in StepCoverage. */
const emptyAddons = (): AddOns => ({
  flood: false, earthquake: false, riot: false, terrorism: false,
  tplLimit: 0, paDriver: false, paPassengerSeats: 0,
});

/** Province → zone map (simple, matches the common breakdown in ojkRates). */
const PROVINCE_TO_ZONE: Record<string, Zone> = {
  'DKI Jakarta': 2, 'Banten': 2, 'Jawa Barat': 2,
  'Sumatera Utara': 1, 'Sumatera Selatan': 1, 'Sumatera Barat': 1, 'Aceh': 1, 'Riau': 1,
  'Jawa Tengah': 3, 'Jawa Timur': 3, 'DIY Yogyakarta': 3, 'Bali': 3,
  'Kalimantan Timur': 3, 'Kalimantan Selatan': 3, 'Kalimantan Barat': 3,
  'Sulawesi Selatan': 3, 'Sulawesi Utara': 3,
  'Lainnya': 3,
};

const B2BMotorOrderWizard: React.FC<Props> = ({ client, onDone, lang }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const toast = useB2BToast();

  /* ── Step state ───────────────────────────────────────────────────────── */
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [province, setProvince] = useState<keyof typeof PROVINCE_TO_ZONE>('DKI Jakarta');
  const [plateNo, setPlateNo] = useState('');
  const [manualPrice, setManualPrice] = useState<number | null>(null);

  const [coverage, setCoverage] = useState<CoverageType>('COMPREHENSIVE');
  const [addons, setAddons] = useState<AddOns>(emptyAddons());

  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [durationYears, setDurationYears] = useState<number>(1);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [showDiscountOnPolicy, setShowDiscountOnPolicy] = useState<boolean>(false);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const marketValue = useMemo(() => {
    if (!brand || !model) return 0;
    return getMarketValueForYear(brand, model, year) ?? 0;
  }, [brand, model, year]);

  const sumInsured = manualPrice ?? marketValue;
  const zone = PROVINCE_TO_ZONE[province] ?? 3;

  const breakdown: MultiYearBreakdown | null = useMemo(() => {
    if (!sumInsured || sumInsured < 10_000_000) return null;
    const bd = calcMultiYearPremium({
      vehicleType: 'CAR',
      coverage,
      originalSumInsured: sumInsured,
      durationYears,
      zone,
      addons,
      band: 'MID',
      discountRate,
    });
    // Override startDate/endDate dari input user (effective date)
    const endDate = new Date(
      new Date(effectiveDate).getTime() + durationYears * 365 * 86400_000,
    ).toISOString().slice(0, 10);
    return { ...bd, startDate: effectiveDate, endDate };
  }, [sumInsured, coverage, durationYears, zone, addons, discountRate, effectiveDate]);

  /* ── Navigation + validation ─────────────────────────────────────────── */
  const validate = (): string | null => {
    if (step === 0) {
      if (!brand || !model) return t('Please pick a vehicle brand and model.', 'Pilih merek dan model kendaraan.');
      if (sumInsured < 10_000_000) return t('Market value too low — manual price required.', 'Nilai pasar terlalu rendah — isi harga manual.');
      if (!province) return t('Please pick a region.', 'Pilih wilayah.');
    }
    if (step === 1) {
      if (!coverage) return 'Pilih jenis pertanggungan.';
    }
    if (step === 2) {
      if (!effectiveDate) return t('Pick an effective date.', 'Pilih tanggal efektif.');
      const diffDays = (new Date(effectiveDate).getTime() - Date.now()) / 86400_000;
      if (diffDays < -1) return t('Effective date cannot be in the past.', 'Tanggal efektif tidak boleh di masa lalu.');
      if (diffDays > 60) return t('Effective date cannot be more than 60 days away.', 'Tanggal efektif maksimum 60 hari ke depan.');
      if (durationYears < 1 || durationYears > B2B_MAX_DURATION_YEARS) return t('Duration must be 1-6 years.', 'Durasi harus 1-6 tahun.');
    }
    return null;
  };
  const goNext = () => { const e = validate(); if (e) { setError(e); return; } setError(null); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { setError(null); setStep(s => Math.max(s - 1, 0)); };

  /* ── Submit — create order + Xendit invoice ──────────────────────────── */
  const submit = async () => {
    if (!breakdown) return;
    setBusy(true); setError(null);
    try {
      const order = await createPolicyOrder({
        agent_id: null as any, // B2B order, no agent
        client_id: client.id,
        client_name: client.company_name ?? client.name ?? '',
        client_phone: client.phone ?? '',
        client_ktp: null as any,
        product_code: `B2B-MOTOR-${coverage}`,
        product_name: `${coverage === 'COMPREHENSIVE' ? 'Comprehensive' : 'TLO'} ${durationYears}Y`,
        vehicle_type: 'CAR',
        vehicle_details: {
          brand, model, year, plate_no: plateNo || null,
          province, zone,
          original_sum_insured: sumInsured,
        },
        coverage_type: coverage,
        sum_insured: sumInsured,
        zone,
        vehicle_category: null as any,
        addons,
        base_premium: breakdown.rows[0]?.basePremium ?? 0,
        addon_premium: breakdown.rows.reduce((s, r) => s + r.addonPremium, 0),
        admin_fee: breakdown.rows[0]?.adminFee ?? 0,
        stamp_duty: breakdown.rows[0]?.stampDuty ?? 0,
        total_premium: breakdown.netTotal,
        ojk_rate: null as any,
        discount_rate: breakdown.discountRate,
        discount_amount: breakdown.discountAmount,
        net_premium: breakdown.netTotal,
        commission_rate: 0,
        commission_amount: 0,
        coin_reward: 0,
        start_date: breakdown.startDate,
        end_date: breakdown.endDate,
        status: 'SUBMITTED',
        // v2.9.0 B2B multi-year fields
        duration_years: durationYears,
        premium_schedule: breakdown.rows,
        b2b_discount_rate: breakdown.discountRate,
        b2b_discount_shown_on_policy: showDiscountOnPolicy,
      } as unknown as Omit<SpPolicyOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>);

      if (!order) throw new Error('Gagal membuat order.');

      // Xendit invoice — total upfront
      const invoice = await createXenditInvoice({
        order_id: order.id,
        order_number: order.order_number ?? order.id,
        client_name: client.company_name ?? client.name ?? '',
        client_email: client.email ?? '',
        client_phone: client.phone ?? '',
        product_name: `B2B ${coverage} ${durationYears}Y — ${brand} ${model} ${year}`,
        total_premium: breakdown.netTotal,
      });

      if (invoice?.invoice_url) {
        // Open in new tab, user bisa bayar
        window.open(invoice.invoice_url, '_blank', 'noopener');
      }

      toast.success(t('Order created. Invoice opened in a new tab.', 'Order dibuat. Invoice dibuka di tab baru.'));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /* ── Step renderers ──────────────────────────────────────────────────── */
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all';
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-ds-ink2 mb-1.5';

  const renderVehicle = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('Brand', 'Merek')} <span className="text-rose-500">*</span></label>
          <select className={inputCls} value={brand} onChange={e => { setBrand(e.target.value); setModel(''); }}>
            <option value="">— {t('Pick', 'Pilih')} —</option>
            {VEHICLE_BRANDS.map(b => (
              <option key={b} value={b}>{VEHICLE_DATABASE[b]?.displayName ?? b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('Model', 'Model')} <span className="text-rose-500">*</span></label>
          <select className={inputCls} value={model} onChange={e => setModel(e.target.value)} disabled={!brand}>
            <option value="">— {t('Pick', 'Pilih')} —</option>
            {brand && getModelsForBrand(brand).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('Year', 'Tahun')} <span className="text-rose-500">*</span></label>
          <select className={inputCls} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('Province', 'Provinsi')} <span className="text-rose-500">*</span></label>
          <select className={inputCls} value={province} onChange={e => setProvince(e.target.value as any)}>
            {Object.keys(PROVINCE_TO_ZONE).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <p className="mt-1 text-2xs text-slate-500 dark:text-ds-ink3">{ZONE_LABELS[zone]}</p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{t('Plate (optional)', 'Plat Nomor (opsional)')}</label>
          <input className={inputCls} value={plateNo} onChange={e => setPlateNo(e.target.value.toUpperCase())} placeholder="B 1234 ABC" maxLength={12} />
        </div>
      </div>

      {brand && model && (
        <B2BGlass className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-2xs font-black uppercase tracking-widest text-slate-500 dark:text-ds-ink3">
                {t('Market value', 'Nilai pasar')} {year}
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {marketValue > 0 ? formatIDR(marketValue) : t('Not available', 'Belum tersedia')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const custom = prompt(t('Enter custom price in IDR', 'Isi harga manual (Rp)'), String(sumInsured));
                if (custom) {
                  const n = Number(custom.replace(/[^\d]/g, ''));
                  if (n > 0) setManualPrice(n);
                }
              }}
              className="text-2xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 hover:text-indigo-900"
            >
              {manualPrice ? t('Reset', 'Reset') : t('Set manual', 'Set manual')}
            </button>
          </div>
          {manualPrice && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} /> {t('Using manual price', 'Pakai harga manual')}: {formatIDR(manualPrice)}
            </p>
          )}
        </B2BGlass>
      )}
    </div>
  );

  const renderCoverage = () => {
    const addonRow = (key: keyof AddOns, label: string, desc: string) => (
      <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 hover:border-emerald-400 cursor-pointer transition-colors">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-emerald-600"
          checked={!!addons[key]}
          onChange={e => setAddons(a => ({ ...a, [key]: e.target.checked }))}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-900 dark:text-white">{label}</p>
          <p className="text-2xs text-slate-500 dark:text-ds-ink3 mt-0.5">{desc}</p>
        </div>
      </label>
    );
    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>{t('Coverage type', 'Jenis Pertanggungan')} <span className="text-rose-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['COMPREHENSIVE', 'TLO'] as CoverageType[]).map(c => {
              const active = coverage === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverage(c)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 hover:border-emerald-400 hover:-translate-y-0.5'
                  }`}
                >
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {c === 'COMPREHENSIVE' ? 'Komprehensif' : 'Total Loss Only (TLO)'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-ds-ink3 mt-1">
                    {c === 'COMPREHENSIVE'
                      ? t('All risks including partial damage.', 'Lengkap termasuk kerusakan sebagian.')
                      : t('Only total loss or theft >75%.', 'Hanya kerugian total atau pencurian >75%.')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('Add-ons (optional)', 'Perluasan (opsional)')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {addonRow('flood',      'Banjir',       t('Flood & inundation', 'Banjir & genangan'))}
            {addonRow('earthquake', 'Gempa Bumi',   t('Earthquake & volcanic', 'Gempa & erupsi'))}
            {addonRow('riot',       'Huru-hara',    t('Riot & civil unrest', 'Kerusuhan & huru-hara'))}
            {addonRow('terrorism',  'Terorisme',    t('Terrorism & sabotage', 'Terorisme & sabotase'))}
            {addonRow('paDriver',   'PA Pengemudi', t('Personal accident — driver', 'Kecelakaan diri pengemudi'))}
          </div>
        </div>
      </div>
    );
  };

  const renderDuration = () => (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>{t('Effective date (policy starts)', 'Tanggal efektif (mulai berlaku)')} <span className="text-rose-500">*</span></label>
        <input
          type="date"
          className={inputCls}
          value={effectiveDate}
          min={new Date().toISOString().slice(0, 10)}
          max={new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10)}
          onChange={e => setEffectiveDate(e.target.value)}
        />
        <p className="mt-1 text-2xs text-slate-500 dark:text-ds-ink3">
          {t('Must be today or within 60 days.', 'Hari ini atau maksimal 60 hari ke depan.')}
        </p>
      </div>

      <div>
        <label className={labelCls}>{t('Duration', 'Durasi Polis')} <span className="text-rose-500">*</span></label>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: B2B_MAX_DURATION_YEARS }, (_, i) => i + 1).map(y => {
            const active = durationYears === y;
            return (
              <button
                key={y}
                type="button"
                onClick={() => setDurationYears(y)}
                className={`py-3 rounded-xl text-sm font-black transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm scale-105'
                    : 'bg-white dark:bg-ds-card2 border border-slate-200 dark:border-ds-border text-slate-700 dark:text-ds-ink2 hover:border-emerald-400'
                }`}
              >
                {y} <span className="text-2xs font-bold opacity-80">th</span>
              </button>
            );
          })}
        </div>
        {durationYears > 1 && (
          <div className="mt-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 p-3 flex items-start gap-2">
            <Info size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <p className="font-bold">{t('Multi-year policy with depreciation', 'Polis Multi-Tahun dengan Depresiasi')}</p>
              <p className="mt-1">
                {t(
                  `Sum insured depreciates ${(B2B_DEPRECIATION_RATE * 100).toFixed(0)}% compounded per year — year ${durationYears} value will be ${((Math.pow(1 - B2B_DEPRECIATION_RATE, durationYears - 1)) * 100).toFixed(1)}% of original. Total premium is billed upfront in one Xendit invoice.`,
                  `Nilai pertanggungan menyusut ${(B2B_DEPRECIATION_RATE * 100).toFixed(0)}% compound per tahun — tahun ke-${durationYears} nilainya menjadi ${((Math.pow(1 - B2B_DEPRECIATION_RATE, durationYears - 1)) * 100).toFixed(1)}% dari harga awal. Total premi ditagih di muka melalui satu invoice Xendit.`,
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {breakdown && durationYears > 1 && (
        <div className="rounded-2xl border border-slate-200 dark:border-ds-border overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-ds-card2 border-b border-slate-200 dark:border-ds-border">
            <p className="text-2xs font-black uppercase tracking-widest text-slate-600 dark:text-ds-ink3">
              {t('Depreciation schedule preview', 'Pratinjau Jadwal Depresiasi')}
            </p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-white dark:bg-ds-card">
              <tr>
                <th className="py-2 px-3 text-left text-2xs font-bold uppercase tracking-widest text-slate-500 dark:text-ds-ink3">Tahun</th>
                <th className="py-2 px-3 text-right text-2xs font-bold uppercase tracking-widest text-slate-500 dark:text-ds-ink3">Nilai Pertanggungan</th>
                <th className="py-2 px-3 text-right text-2xs font-bold uppercase tracking-widest text-slate-500 dark:text-ds-ink3">Premi Tahun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-ds-border">
              {breakdown.rows.map(r => (
                <tr key={r.year} className="hover:bg-slate-50/50 dark:hover:bg-ds-card2/50">
                  <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">Y{r.year} · {(r.depreciationFactor * 100).toFixed(0)}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-ds-ink2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatIDR(r.depreciatedSumInsured)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-black text-slate-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatIDR(r.grossTotal)}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-50/60 dark:bg-emerald-500/5 border-t-2 border-emerald-200 dark:border-emerald-500/30">
                <td className="py-2.5 px-3 font-black text-emerald-900 dark:text-emerald-300" colSpan={2}>
                  {t('Grand total (before discount)', 'Total Kotor (sebelum diskon)')}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-black text-emerald-700 dark:text-emerald-300" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatIDR(breakdown.grossTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <B2BGlass className="p-5">
        <B2BSectionHeader title={t('Vehicle', 'Kendaraan')} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <span className="text-slate-500 dark:text-ds-ink3">{t('Brand & Model', 'Merek & Model')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{brand} {model}</span>
          <span className="text-slate-500 dark:text-ds-ink3">{t('Year', 'Tahun')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{year}</span>
          <span className="text-slate-500 dark:text-ds-ink3">{t('Region', 'Wilayah')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{province} · {ZONE_LABELS[zone]}</span>
          <span className="text-slate-500 dark:text-ds-ink3">{t('Market value', 'Nilai pasar')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{formatIDR(sumInsured)}</span>
        </div>
      </B2BGlass>

      <B2BGlass className="p-5">
        <B2BSectionHeader title={t('Coverage & Duration', 'Pertanggungan & Durasi')} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <span className="text-slate-500 dark:text-ds-ink3">{t('Coverage', 'Pertanggungan')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{coverage === 'COMPREHENSIVE' ? 'Komprehensif' : 'TLO'}</span>
          <span className="text-slate-500 dark:text-ds-ink3">{t('Duration', 'Durasi')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{durationYears} {t('year', 'tahun')}{durationYears > 1 ? 's' : ''}</span>
          <span className="text-slate-500 dark:text-ds-ink3">{t('Effective', 'Mulai')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{breakdown?.startDate}</span>
          <span className="text-slate-500 dark:text-ds-ink3">{t('End date', 'Berakhir')}</span>
          <span className="font-bold text-right text-slate-900 dark:text-white">{breakdown?.endDate}</span>
        </div>
      </B2BGlass>

      <B2BGlass className="p-5">
        <div className="flex items-center justify-between">
          <B2BSectionHeader title={t('Discount', 'Diskon')} subtitle={t('Optional 0-25%', 'Opsional 0-25%')} />
          <div className="flex items-center gap-2 text-xs">
            <Percent size={12} className="text-slate-400" />
            <input
              type="number"
              min={0}
              max={25}
              step={0.5}
              value={discountRate * 100}
              onChange={e => {
                const v = Math.max(0, Math.min(25, Number(e.target.value) || 0));
                setDiscountRate(v / 100);
              }}
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 text-right text-xs font-black"
            />
            <span className="text-slate-500 dark:text-ds-ink3 font-black">%</span>
          </div>
        </div>
        <label className="mt-3 flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 accent-emerald-600"
            checked={showDiscountOnPolicy}
            onChange={e => setShowDiscountOnPolicy(e.target.checked)}
          />
          <span className="text-xs text-slate-700 dark:text-ds-ink2 leading-relaxed">
            {showDiscountOnPolicy
              ? <><Eye size={11} className="inline mr-1 text-emerald-600" /> {t('Discount shown on policy document.', 'Diskon akan tertera di dokumen polis.')}</>
              : <><EyeOff size={11} className="inline mr-1 text-slate-400" /> {t('Discount hidden from policy document.', 'Diskon tidak tertera di polis.')}</>}
          </span>
        </label>
      </B2BGlass>

      {breakdown && (
        <B2BGlass strong className="p-5" style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(5,150,105,0.04))', borderColor: 'rgba(5,150,105,0.25)' }}>
          <p className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            {t('Grand Total', 'Total Tagihan')}
          </p>
          <div className="flex items-baseline justify-between gap-3 mt-1">
            <div>
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatIDR(breakdown.netTotal)}
              </p>
              {breakdown.discountAmount > 0 && (
                <p className="text-xs text-slate-600 dark:text-ds-ink3 mt-1">
                  {t('after discount', 'setelah diskon')} {(breakdown.discountRate * 100).toFixed(1)}% (−{formatIDR(breakdown.discountAmount)})
                </p>
              )}
              {durationYears > 1 && (
                <p className="text-xs text-slate-500 dark:text-ds-ink3 mt-0.5">
                  {t(`${durationYears}-year upfront`, `${durationYears} tahun lunas di muka`)}
                </p>
              )}
            </div>
            <Sparkles size={24} className="text-emerald-500 flex-shrink-0" />
          </div>
        </B2BGlass>
      )}
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-4">
      <B2BGlass className="p-8 text-center">
        <CreditCard size={32} className="mx-auto text-emerald-600 mb-3" />
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
          {t('Ready to create order', 'Siap Membuat Order')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-ds-ink3 max-w-md mx-auto leading-relaxed">
          {t(
            'Clicking below will create the order and open the Xendit invoice in a new tab. You can pay via bank transfer, virtual account, or e-wallet.',
            'Klik tombol di bawah untuk membuat order dan membuka invoice Xendit di tab baru. Pembayaran via transfer bank, virtual account, atau e-wallet.',
          )}
        </p>
        <div className="mt-6 inline-block rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-2">
          <p className="text-2xs text-slate-500 dark:text-ds-ink3 uppercase tracking-widest font-bold">
            {t('Total', 'Total')}
          </p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {breakdown ? formatIDR(breakdown.netTotal) : '—'}
          </p>
        </div>
      </B2BGlass>
    </div>
  );

  const content = [renderVehicle, renderCoverage, renderDuration, renderReview, renderPayment][step]();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header + step indicator */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('New Vehicle Insurance Order', 'Order Asuransi Kendaraan Baru')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-ds-ink3 mt-0.5">
          {t('Single vehicle policy — supports multi-year up to 6 years', 'Polis kendaraan tunggal — dukung multi-tahun hingga 6 tahun')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 transition-colors ${active ? 'text-emerald-700 dark:text-emerald-400' : done ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400 dark:text-ds-ink3'}`}>
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-2xs font-black ${
                  done ? 'bg-emerald-600 text-white' :
                  active ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/25' :
                  'bg-slate-100 dark:bg-ds-card2 text-slate-500 dark:text-ds-ink3'
                }`}>
                  {done ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                </span>
                <span className="hidden sm:inline text-xs font-bold">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={`flex-1 h-0.5 rounded-full transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-ds-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
          <AlertTriangle size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      <B2BGlass className="p-5 lg:p-6">
        {content}
      </B2BGlass>

      <div className="flex items-center justify-between gap-3">
        <B2BButton
          variant="ghost"
          icon={step === 0 ? undefined : ChevronLeft}
          onClick={step === 0 ? onDone : goBack}
          disabled={busy}
        >
          {step === 0 ? t('Cancel', 'Batal') : t('Back', 'Kembali')}
        </B2BButton>
        {step < STEPS.length - 1 ? (
          <B2BButton variant="primary" onClick={goNext} disabled={busy || !sumInsured}>
            {t('Next', 'Lanjut')} <ChevronRight size={13} />
          </B2BButton>
        ) : (
          <B2BButton variant="primary" onClick={submit} disabled={busy || !breakdown}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {t('Create Order & Pay', 'Buat Order & Bayar')}
          </B2BButton>
        )}
      </div>

      {/* Discount guardrail hint */}
      <p className="text-center text-2xs text-slate-400 dark:text-ds-ink3">
        {t(
          `Discount cap ${(B2B_MAX_DISCOUNT_RATE * 100).toFixed(0)}% · Depreciation ${(B2B_DEPRECIATION_RATE * 100).toFixed(0)}%/year compounded · All totals in IDR`,
          `Diskon maksimum ${(B2B_MAX_DISCOUNT_RATE * 100).toFixed(0)}% · Depresiasi ${(B2B_DEPRECIATION_RATE * 100).toFixed(0)}%/tahun compound · Semua total dalam Rupiah`,
        )}
      </p>
    </div>
  );
};

export default B2BMotorOrderWizard;
