// B2BUnitOrder — order asuransi TLO SATUAN (mobil / motor / alat berat) langsung
// dari portal B2B, memakai rate & skema fleet yang sedang aktif
// (sp_b2b_fleet_rate_sets — dikelola admin di CMS: Katalog & Harga → Rate Fleet
// B2B). Satu order = satu batch dengan 1 item, sehingga seluruh pipeline yang
// sudah teruji terpakai tanpa jalur baru: recompute otoritatif server
// (actions/b2bBulk.ts → b2b_bulk_create_batch), invoice Xendit per batch
// (create-b2b-bulk-invoice), sampai penerbitan polis induk (admin_b2b_bulk_issue).
//
// Angka di layar hanya PREVIEW — matematika premi tidak pernah dipercaya dari
// klien; server menghitung ulang dari kelas/zona/TSI yang disubmit. Mesin rating
// dan kebijakan flag identik dengan impor massal (buildLineItem), jadi hasil
// order satuan dan baris spreadsheet untuk unit yang sama pasti identik.
//
// v2.8.23 — tiga hal yang hanya ada di order unit:
//   • Tanggal efektif pertanggungan (hari ini s/d 60 hari ke depan).
//   • Multi-tahun sampai 6 tahun: begitu jangka waktu lewat 12 bulan, nilai
//     pertanggungan menyusut 10% per tahun dan jadwal per tahunnya tampil.
//   • Diskon bisa diturunkan dari plafon rate set, dan klien memilih apakah
//     diskon itu tertera di polis.
// Ketiganya tetap dihitung/divalidasi ulang oleh server.
//
// v2.8.24 — dua hal yang dilaporkan owner hilang dibanding apps mitra:
//   • Pilihan pertanggungan Comprehensive (mobil & motor) di samping TLO.
//     Alat berat tetap TLO — tidak ada tarif comprehensive OJK untuknya.
//   • Merk dan tipe dipilih dari database kendaraan yang sama dengan apps
//     mitra (services/vehicleDatabase.ts + harga kelolaan admin). Memilih
//     merk, tipe, dan tahun mengisi harga pasar referensi ke OTR dan nilai
//     pertanggungan; keduanya tetap bisa disunting, dan kendaraan yang tidak
//     ada di daftar bisa diketik manual.

import React, { useMemo, useState } from 'react';
import {
  Car, Bike, Construction, Loader2, CheckCircle2, AlertTriangle, ExternalLink,
  Info, ClipboardList, CalendarDays, TrendingDown, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { Language } from '../../types';
import {
  buildLineItem, getActiveBulkRateConfig, addMonthsToIsoDate, isValidIsoDate, isLikelyCommercialBody,
  MULTI_YEAR_DEPRECIATION_RATE,
  type VehicleClass, type Zone, type BuiltLineItem, type FleetCoverage,
} from '../../services/b2bFleetRating';
import {
  VEHICLE_BRANDS, MOTO_BRANDS, getModelsForBrand, getModelsForMotoBrand,
  getMarketValueForYear, getMarketValueForMotoYear,
} from '../../services/vehicleDatabase';
import { createB2BBulkBatch, createB2BBulkInvoice } from '../../services/supabaseService';

interface Props {
  clientId: string;
  client: any;
  onDone: () => void;
  lang: Language;
}

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtPct = (n: number) => `${(n * 100).toFixed(3).replace(/\.?0+$/, '')}%`;

// Jangka waktu: tenor pendek multifinance (6/18 bulan) tetap ada, lalu tahun
// penuh sampai 6 tahun.
const DURATION_OPTIONS: Array<{ months: number; en: string; id: string }> = [
  { months: 6,  en: '6 mo',  id: '6 bln' },
  { months: 12, en: '1 yr',  id: '1 thn' },
  { months: 18, en: '18 mo', id: '18 bln' },
  { months: 24, en: '2 yr',  id: '2 thn' },
  { months: 36, en: '3 yr',  id: '3 thn' },
  { months: 48, en: '4 yr',  id: '4 thn' },
  { months: 60, en: '5 yr',  id: '5 thn' },
  { months: 72, en: '6 yr',  id: '6 thn' },
];
const START_DATE_MAX_DAYS_AHEAD = 60;
// Nilai <option> untuk "tidak ada di daftar" — tidak mungkin bentrok dengan nama merk/tipe.
const OTHER = '__lainnya__';
const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 22 }, (_, i) => THIS_YEAR + 1 - i);

const pad2 = (n: number) => String(n).padStart(2, '0');
const localIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDaysIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
};
const fmtDate = (iso: string, lang: Language) =>
  isValidIsoDate(iso)
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const fmtMonthYear = (iso: string, lang: Language) =>
  isValidIsoDate(iso)
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', { month: 'short', year: 'numeric' })
    : '—';

const CLASS_OPTIONS: Array<{ id: VehicleClass; label: string; icon: React.FC<{ size?: number; className?: string }> }> = [
  { id: 'CAR', label: 'Mobil', icon: Car },
  { id: 'MOTORCYCLE', label: 'Motor', icon: Bike },
  { id: 'HEAVY_EQUIPMENT', label: 'Alat Berat', icon: Construction },
];

const inputCls =
  'bg-white dark:bg-ds-card2 border border-ds-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-ds-ink dark:text-white placeholder:text-ds-ink3 placeholder:font-normal';

const labelCls = 'text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block';

const B2BUnitOrder: React.FC<Props> = ({ clientId, client, onDone, lang }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  void clientId; // dipakai bila file pendukung per-unit ditambahkan nanti

  // Snapshot skema rate aktif — dibaca sekali saat form dibuka. Kalau admin
  // mengubah rate di CMS, portal berikutnya memuat versi baru (App memasang
  // config aktif saat startup, getActiveBulkRateConfig di bawah membacanya).
  const [rateConfig] = useState(() => getActiveBulkRateConfig());

  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('CAR');
  const [coverage, setCoverage] = useState<FleetCoverage>('COMPREHENSIVE');
  // true = merk/tipe diketik manual (kendaraan tidak ada di database).
  const [manualBrand, setManualBrand] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [nasabahName, setNasabahName] = useState('');
  const [nasabahPhone, setNasabahPhone] = useState('');
  const [nasabahAddress, setNasabahAddress] = useState('');
  const [contractNo, setContractNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState(String(THIS_YEAR));
  const [plateNo, setPlateNo] = useState('');
  const [regionText, setRegionText] = useState('');
  const [zoneOverride, setZoneOverride] = useState<Zone | ''>('');
  const [financingValue, setFinancingValue] = useState('');
  const [otr, setOtr] = useState('');
  const [commercialBody, setCommercialBody] = useState(false);
  const [tenorMonths, setTenorMonths] = useState(12);
  const [today] = useState(() => localIsoDate(new Date()));
  const maxStartDate = addDaysIso(today, START_DATE_MAX_DAYS_AHEAD);
  const [startDate, setStartDate] = useState(today);
  // '' = pakai plafon diskon rate set untuk kelas unit ini.
  const [discountPct, setDiscountPct] = useState('');
  const [discountShown, setDiscountShown] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{ batchId: string; batchNumber: string; total: number; period: string } | null>(null);

  const isCar = vehicleClass === 'CAR';
  const isHeavy = vehicleClass === 'HEAVY_EQUIPMENT';
  const isMoto = vehicleClass === 'MOTORCYCLE';
  // Alat berat hanya TLO; pilihan pengguna untuk kelas lain diingat.
  const effectiveCoverage: FleetCoverage = isHeavy ? 'TLO' : coverage;

  // ── Database kendaraan (sama dengan apps mitra) ───────────────────────────
  const brandList = isHeavy ? [] : isMoto ? MOTO_BRANDS : VEHICLE_BRANDS;
  const brandInList = brandList.includes(make);
  const modelList = useMemo(
    () => (!brandInList ? [] : isMoto ? getModelsForMotoBrand(make) : getModelsForBrand(make)),
    [brandInList, isMoto, make],
  );
  const modelInList = modelList.includes(model);
  const yearNum = Number(modelYear) || 0;
  const marketValue = useMemo(() => {
    if (isHeavy || !brandInList || !modelInList || !yearNum) return null;
    return isMoto ? getMarketValueForMotoYear(make, model, yearNum) : getMarketValueForYear(make, model, yearNum);
  }, [isHeavy, isMoto, brandInList, modelInList, make, model, yearNum]);

  // Harga pasar referensi mengisi OTR dan nilai pertanggungan. Angka yang
  // sudah diketik sendiri oleh pengguna tidak ditimpa: hanya diisi bila masih
  // kosong atau masih sama dengan isian otomatis sebelumnya. Dilakukan di
  // handler (bukan effect) supaya urutannya pasti.
  const [autoPrice, setAutoPrice] = useState('');
  const lookupPrice = (cls: VehicleClass, brand: string, mdl: string, year: number): number | null => {
    if (cls === 'HEAVY_EQUIPMENT' || !brand || !mdl || !year) return null;
    return cls === 'MOTORCYCLE' ? getMarketValueForMotoYear(brand, mdl, year) : getMarketValueForYear(brand, mdl, year);
  };
  const applyPrice = (price: number | null) => {
    const untouched = (current: string) => current === '' || current === autoPrice;
    if (price == null || price <= 0) {
      // Tidak ada harga referensi: buang isian otomatis lama, biarkan ketikan pengguna.
      if (autoPrice !== '') {
        if (otr === autoPrice) setOtr('');
        if (financingValue === autoPrice) setFinancingValue('');
        setAutoPrice('');
      }
      return;
    }
    const next = String(Math.round(price));
    if (untouched(otr)) setOtr(next);
    if (untouched(financingValue)) setFinancingValue(next);
    setAutoPrice(next);
  };

  const changeClass = (next: VehicleClass) => {
    if (next === vehicleClass) return;
    setVehicleClass(next);
    setMake(''); setModel(''); setManualBrand(false); setManualModel(false);
    setCommercialBody(false);
    applyPrice(null); // angka dari kendaraan sebelumnya tidak berlaku untuk kelas lain
  };
  const changeBrand = (value: string) => {
    if (value === OTHER) { setManualBrand(true); setManualModel(true); setMake(''); setModel(''); applyPrice(null); return; }
    setManualBrand(false); setManualModel(false); setMake(value); setModel('');
    applyPrice(null);
  };
  const changeModel = (value: string) => {
    if (value === OTHER) { setManualModel(true); setModel(''); applyPrice(null); return; }
    setManualModel(false); setModel(value);
    // Pickup/truk/van punya tarif sendiri — tebak dari nama tipe, tetap bisa diubah.
    if (isCar && value) setCommercialBody(isLikelyCommercialBody(`${make} ${value}`));
    applyPrice(lookupPrice(vehicleClass, make, value, yearNum));
  };
  const changeYear = (value: string) => {
    setModelYear(value);
    if (brandInList && modelInList) applyPrice(lookupPrice(vehicleClass, make, model, Number(value) || 0));
  };
  const isMultiYear = tenorMonths > 12;
  const discountCap = isHeavy ? rateConfig.discountRateHeavy : rateConfig.discountRateStandard;
  const discountCapPct = Math.round(discountCap * 10000) / 100;
  // Diskon yang diminta: kosong → plafon; selain itu dijepit 0..plafon (server
  // menjepit ulang dengan aturan yang sama).
  const requestedDiscount = discountPct.trim() === ''
    ? discountCap
    : Math.min(Math.max((Number(discountPct.replace(',', '.')) || 0) / 100, 0), discountCap);
  const endDate = addMonthsToIsoDate(startDate, tenorMonths);

  // Preview live — mesin rating yang sama persis dengan impor massal.
  const built: BuiltLineItem = useMemo(() => buildLineItem({
    rowNo: 1,
    nasabahName,
    nasabahPhone: nasabahPhone || undefined,
    nasabahAddress: nasabahAddress || undefined,
    contractNo: contractNo || undefined,
    tenorMonths,
    financingValue: Number(financingValue) || 0,
    jenisBrg: vehicleClass === 'HEAVY_EQUIPMENT' ? 'ALAT BERAT' : vehicleClass === 'MOTORCYCLE' ? 'MOTOR' : 'MOBIL',
    make: make || undefined,
    typeName: model || undefined,
    modelYear: Number(modelYear) || undefined,
    otr: Number(otr) || 0,
    plateNo: plateNo || undefined,
    regionText: regionText || undefined,
    vehicleClassOverride: vehicleClass,
    commercialBodyOverride: isCar ? commercialBody : undefined,
    zoneOverride: zoneOverride === '' ? undefined : zoneOverride,
    depreciationRate: isMultiYear ? MULTI_YEAR_DEPRECIATION_RATE : 0,
    discountRateOverride: requestedDiscount,
    coverage: effectiveCoverage,
  }), [vehicleClass, nasabahName, nasabahPhone, nasabahAddress, contractNo, make, model, modelYear, otr, plateNo, regionText, zoneOverride, financingValue, commercialBody, tenorMonths, isCar, isMultiYear, requestedDiscount, effectiveCoverage]);

  const adminFeeForClass = vehicleClass === 'MOTORCYCLE' ? rateConfig.adminFeeMotorcycle : isHeavy ? rateConfig.adminFeeHeavy : rateConfig.adminFeeCar;
  const zoneLabel = built.zoneSource === 'override'
    ? t(`Zone ${built.zone} (manual)`, `Zona ${built.zone} (manual)`)
    : built.zoneSource === 'plate'
      ? t(`Zone ${built.zone} (from plate)`, `Zona ${built.zone} (dari plat)`)
      : built.zoneSource === 'region'
        ? t(`Zone ${built.zone} (from region)`, `Zona ${built.zone} (dari wilayah)`)
        : t('Zone 3 (default — verify)', 'Zona 3 (default — perlu verifikasi)');

  const validate = (): string | null => {
    if (!nasabahName.trim()) return t('Customer name is required.', 'Nama nasabah wajib diisi.');
    if (!isHeavy && !make.trim()) return t('Choose the vehicle brand.', 'Pilih merk kendaraan.');
    if (!isHeavy && !model.trim()) return t('Choose the vehicle type.', 'Pilih tipe kendaraan.');
    if (!financingValue || Number(financingValue) <= 0) return t('Sum insured must be greater than zero.', 'Nilai pertanggungan (TSI) harus lebih dari nol.');
    if (isCar && !commercialBody && (!otr || Number(otr) <= 0)) return t('Passenger car needs OTR price for rate banding.', 'Mobil penumpang perlu harga OTR untuk penentuan kategori tarif.');
    if (modelYear && (Number(modelYear) < 1950 || Number(modelYear) > 2100)) return t('Year looks wrong.', 'Tahun kendaraan tidak masuk akal.');
    if (!isValidIsoDate(startDate) || startDate < today || startDate > maxStartDate) {
      return t(
        `Effective date must be between today and ${START_DATE_MAX_DAYS_AHEAD} days ahead.`,
        `Tanggal efektif harus antara hari ini dan ${START_DATE_MAX_DAYS_AHEAD} hari ke depan.`,
      );
    }
    if (discountPct.trim() !== '') {
      const d = Number(discountPct.replace(',', '.'));
      if (!Number.isFinite(d) || d < 0 || d > discountCapPct) {
        return t(`Discount must be between 0 and ${discountCapPct}%.`, `Diskon harus antara 0 dan ${discountCapPct}%.`);
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError('');
    setSubmitting(true);
    const result = await createB2BBulkBatch({
      companyName: client?.company_name ?? '',
      sourceFileName: t('unit-order', 'order-satuan'),
      items: [{
        rowNo: 1,
        nasabahName: nasabahName.trim(),
        nasabahPhone: nasabahPhone.trim() || undefined,
        nasabahAddress: nasabahAddress.trim() || undefined,
        contractNo: contractNo.trim() || undefined,
        tenorMonths,
        financingValue: Number(financingValue),
        vehicleClass,
        commercialBody: isCar ? commercialBody : undefined,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        modelYear: Number(modelYear) || undefined,
        otr: isCar ? (Number(otr) || undefined) : undefined,
        plateNo: plateNo.trim() || undefined,
        regionText: regionText.trim() || undefined,
        zone: built.zone,
        flags: built.flags,
        coverageStartDate: startDate,
        multiYearDepreciation: isMultiYear,
        discountRate: requestedDiscount,
        discountShownOnPolicy: discountShown,
        coverage: effectiveCoverage,
      }],
    });
    setSubmitting(false);
    if ('error' in result) { setError(result.error); return; }
    setBatchResult({
      batchId: result.batch.id,
      batchNumber: result.batch.batch_number,
      total: result.totals?.totalAmount ?? built.totalPremium,
      period: `${fmtDate(startDate, lang)} – ${fmtDate(endDate, lang)}`,
    });
  };

  const handleCreateInvoice = async () => {
    if (!batchResult) return;
    setInvoiceLoading(true);
    const res = await createB2BBulkInvoice(batchResult.batchId);
    setInvoiceLoading(false);
    if (res?.invoice_url) setInvoiceUrl(res.invoice_url);
    else setError(t('Failed to create invoice. Try again.', 'Gagal membuat invoice. Coba lagi.'));
  };

  // ── Panel sukses ────────────────────────────────────────────────────────────
  if (batchResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30 p-6 text-center space-y-3">
          <CheckCircle2 size={36} className="mx-auto text-emerald-600 dark:text-emerald-400" />
          <p className="text-base font-black text-ds-ink dark:text-white">{t('Unit order submitted', 'Order unit terkirim')}</p>
          <p className="text-sm text-ds-ink2">
            {t('Batch', 'Batch')} <span className="font-mono font-bold">{batchResult.batchNumber}</span>
            {' · '}{fmtIDR(batchResult.total)}
          </p>
          <p className="text-xs font-bold text-ds-ink2">
            {t('Coverage period', 'Periode pertanggungan')}: {batchResult.period}
          </p>
          <p className="text-2xs text-ds-ink3 leading-relaxed">
            {t(
              'The server has re-priced this order against the active fleet rate set. Next: pay the invoice — the policy is issued after payment is confirmed.',
              'Server sudah menghitung ulang order ini terhadap rate set yang aktif. Selanjutnya: bayar invoice — polis terbit setelah pembayaran dikonfirmasi.',
            )}
          </p>
          {invoiceUrl ? (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-colors"
            >
              <ExternalLink size={13} /> {t('Open payment invoice', 'Buka invoice pembayaran')}
            </a>
          ) : (
            <button
              onClick={handleCreateInvoice}
              disabled={invoiceLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {invoiceLoading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
              {t('Create payment invoice', 'Buat invoice pembayaran')}
            </button>
          )}
          <div>
            <button onClick={onDone} className="text-xs font-bold text-ds-ink3 hover:text-ds-ink2 underline underline-offset-2">
              {t('View in Batch Fleet list', 'Lihat di daftar Armada Massal')} →
            </button>
          </div>
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-600 text-center">{error}</p>}
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="font-black text-lg text-ds-ink dark:text-white">{t('Unit Order', 'Order Unit')}</h2>
        <p className="text-sm text-ds-ink3 mt-0.5">{t(
          'Insure one vehicle (car, motorcycle, or heavy equipment) — Comprehensive or TLO — at the fleet scheme your admin maintains. No spreadsheet needed.',
          'Asuransikan satu unit (mobil, motor, atau alat berat) — Comprehensive atau TLO — dengan skema fleet yang dikelola admin. Tanpa spreadsheet.',
        )}</p>
      </div>

      {/* Skema rate aktif — transparan untuk klien, sumbernya dikelola admin */}
      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Info size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-xs leading-relaxed text-ds-ink2">
          <p className="font-black text-ds-ink dark:text-white mb-1">{t('Active scheme (managed by SurePath admin)', 'Skema aktif (dikelola admin SurePath)')}</p>
          <p>
            {isHeavy
              ? <>Rate alat berat (TLO) <b>{fmtPct(rateConfig.heavyEquipmentRate)}</b> · </>
              : <>{t('This unit', 'Unit ini')}: {effectiveCoverage === 'COMPREHENSIVE' ? 'Comprehensive' : 'TLO'}, rate <b>{fmtPct(built.rate)}</b> ({t('OJK floor rate, zone', 'tarif batas bawah OJK, zona')} {built.zone}) · </>}
            {t('discount', 'diskon')} <b>{t('up to', 's/d')} {fmtPct(discountCap)}</b> · {t('admin fee', 'biaya admin')} <b>{fmtIDR(adminFeeForClass)}</b> · {t('minimum', 'minimum')} <b>{fmtIDR(rateConfig.minPremiumGross)}</b>
          </p>
        </div>
      </div>

      {/* Kelas kendaraan */}
      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-5 space-y-4">
        <p className={labelCls}>{t('Vehicle class', 'Kelas kendaraan')}</p>
        <div className="grid grid-cols-3 gap-2">
          {CLASS_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => changeClass(opt.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all ${
                vehicleClass === opt.id
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10'
                  : 'border-ds-border bg-white dark:bg-ds-card2 hover:border-emerald-400'
              }`}
            >
              <opt.icon size={18} className={vehicleClass === opt.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-ds-ink3'} />
              <span className={`text-xs font-black ${vehicleClass === opt.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-ds-ink2'}`}>{opt.label}</span>
            </button>
          ))}
        </div>

        {isCar && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={commercialBody}
              onChange={e => setCommercialBody(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-xs font-bold text-ds-ink2">
              {t('Commercial body (pickup / truck / van)', 'Bodi komersial (pickup / truk / van)')}
            </span>
          </label>
        )}

        {/* Pertanggungan */}
        <div>
          <span className={labelCls}>{t('Coverage', 'Jenis pertanggungan')}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label={t('Coverage', 'Jenis pertanggungan')}>
            {([
              { id: 'COMPREHENSIVE' as const, icon: ShieldCheck, title: 'Comprehensive', note: t('Partial damage, total loss and theft.', 'Kerusakan sebagian, kerugian total, dan kehilangan.') },
              { id: 'TLO' as const, icon: ShieldAlert, title: 'TLO (Total Loss Only)', note: t('Theft and damage of 75% or more only.', 'Hanya kehilangan dan kerusakan 75% ke atas.') },
            ]).map(opt => {
              const disabled = isHeavy && opt.id === 'COMPREHENSIVE';
              const active = effectiveCoverage === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => setCoverage(opt.id)}
                  className={`flex items-start gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10'
                      : 'border-ds-border bg-white dark:bg-ds-card2 hover:border-emerald-400'
                  }`}
                >
                  <opt.icon size={18} className={`mt-0.5 flex-shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-ds-ink3'}`} />
                  <span>
                    <span className={`block text-sm font-black ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-ds-ink dark:text-white'}`}>{opt.title}</span>
                    <span className="block text-2xs text-ds-ink3 leading-relaxed mt-0.5">{opt.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {isHeavy && (
            <p className="text-2xs text-ds-ink3 mt-1.5">{t('Heavy equipment is available with TLO cover only.', 'Alat berat hanya tersedia dengan pertanggungan TLO.')}</p>
          )}
        </div>

        {/* Merk · tipe · tahun — dari database kendaraan (sama dengan apps mitra) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls} htmlFor="unit-brand">{t('Brand', 'Merk')}{!isHeavy && ' *'}</label>
            {isHeavy ? (
              <input id="unit-brand" className={inputCls} value={make} onChange={e => setMake(e.target.value)} placeholder="Komatsu" />
            ) : (
              <>
                <select
                  id="unit-brand"
                  className={inputCls}
                  value={manualBrand ? OTHER : (brandInList ? make : '')}
                  onChange={e => changeBrand(e.target.value)}
                >
                  <option value="">{t('Choose a brand', 'Pilih merk')}</option>
                  {brandList.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value={OTHER}>{t('Other — type it in', 'Lainnya — ketik manual')}</option>
                </select>
                {manualBrand && (
                  <input
                    className={`${inputCls} mt-2`}
                    value={make}
                    onChange={e => setMake(e.target.value)}
                    placeholder={t('Type the brand', 'Ketik merk')}
                    aria-label={t('Brand (manual)', 'Merk (manual)')}
                  />
                )}
              </>
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="unit-model">{t('Type / model', 'Tipe / model')}{!isHeavy && ' *'}</label>
            {isHeavy ? (
              <input id="unit-model" className={inputCls} value={model} onChange={e => setModel(e.target.value)} placeholder="PC200-8" />
            ) : (
              <>
                {!manualBrand && (
                  <select
                    id="unit-model"
                    className={inputCls}
                    value={manualModel ? OTHER : (modelInList ? model : '')}
                    onChange={e => changeModel(e.target.value)}
                    disabled={!brandInList}
                  >
                    <option value="">{brandInList ? t('Choose a type', 'Pilih tipe') : t('Choose the brand first', 'Pilih merk dulu')}</option>
                    {modelList.map(m => <option key={m} value={m}>{m}</option>)}
                    {brandInList && <option value={OTHER}>{t('Other — type it in', 'Lainnya — ketik manual')}</option>}
                  </select>
                )}
                {manualModel && (
                  <input
                    id={manualBrand ? 'unit-model' : undefined}
                    className={`${inputCls} ${manualBrand ? '' : 'mt-2'}`}
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder={t('Type the model', 'Ketik tipe')}
                    aria-label={t('Type / model (manual)', 'Tipe / model (manual)')}
                  />
                )}
              </>
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="unit-year">{t('Year', 'Tahun')}</label>
            <select id="unit-year" className={inputCls} value={modelYear} onChange={e => changeYear(e.target.value)}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {!isHeavy && marketValue != null && marketValue > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">
            <span className="font-black">{t('Reference market price', 'Harga pasar referensi')}: {fmtIDR(marketValue)}</span>
            {' · '}{t('recommended range', 'rentang rekomendasi')} {fmtIDR(marketValue * 0.95)} – {fmtIDR(marketValue * 1.05)}.
            {' '}{t('Filled into OTR and sum insured below; you can still adjust both.', 'Sudah diisikan ke OTR dan nilai pertanggungan di bawah; keduanya tetap bisa disesuaikan.')}
          </div>
        )}
        {!isHeavy && (manualBrand || manualModel) && (
          <p className="text-2xs text-ds-ink3">{t(
            'This vehicle is not in the price list, so enter the OTR price and sum insured yourself.',
            'Kendaraan ini tidak ada di daftar harga, jadi isi harga OTR dan nilai pertanggungan sendiri.',
          )}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('Plate number (for zone detection)', 'No. plat (untuk deteksi zona)')}</label>
            <input className={inputCls} value={plateNo} onChange={e => setPlateNo(e.target.value.toUpperCase())} placeholder="B 1234 XYZ" />
          </div>
          <div>
            <label className={labelCls}>{t('Region / city', 'Wilayah / kota')}</label>
            <input className={inputCls} value={regionText} onChange={e => setRegionText(e.target.value)} placeholder={t('e.g. Jakarta', 'mis. Jakarta')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{t('Zone', 'Zona')}</label>
            <select className={inputCls} value={zoneOverride} onChange={e => setZoneOverride(e.target.value === '' ? '' : (Number(e.target.value) as Zone))}>
              <option value="">{zoneLabel}</option>
              <option value={1}>{t('Zone 1 — Sumatera', 'Zona 1 — Sumatera')}</option>
              <option value={2}>{t('Zone 2 — Jabodetabek & Banten', 'Zona 2 — Jabodetabek & Banten')}</option>
              <option value={3}>{t('Zone 3 — other regions', 'Zona 3 — wilayah lain')}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('Sum insured (TSI)', 'Nilai pertanggungan (TSI)')} *</label>
            <input className={inputCls} inputMode="numeric" value={financingValue} onChange={e => setFinancingValue(e.target.value.replace(/\D/g, ''))} placeholder="250000000" />
          </div>
          {isCar && !commercialBody && (
            <div>
              <label className={labelCls}>{t('OTR price', 'Harga OTR')} *</label>
              <input className={inputCls} inputMode="numeric" value={otr} onChange={e => setOtr(e.target.value.replace(/\D/g, ''))} placeholder="280000000" />
            </div>
          )}
        </div>
      </div>

      {/* Periode pertanggungan */}
      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-5 space-y-4">
        <p className={labelCls}>{t('Coverage period', 'Periode pertanggungan')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="unit-start-date">{t('Effective date', 'Tanggal efektif')} *</label>
            <input
              id="unit-start-date"
              type="date"
              className={inputCls}
              value={startDate}
              min={today}
              max={maxStartDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <p className="text-2xs text-ds-ink3 mt-1">
              {t(`Today up to ${START_DATE_MAX_DAYS_AHEAD} days ahead.`, `Hari ini sampai ${START_DATE_MAX_DAYS_AHEAD} hari ke depan.`)}
            </p>
          </div>
          <div>
            <span className={labelCls}>{t('Ends', 'Berakhir')}</span>
            <div className="rounded-xl border border-dashed border-ds-border px-3 py-2.5 text-sm font-bold text-ds-ink dark:text-white flex items-center gap-2">
              <CalendarDays size={14} className="text-ds-ink3" /> {fmtDate(endDate, lang)}
            </div>
          </div>
        </div>

        <div>
          <span className={labelCls}>{t('Duration', 'Jangka waktu')}</span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2" role="radiogroup" aria-label={t('Duration', 'Jangka waktu')}>
            {DURATION_OPTIONS.map(opt => {
              const active = tenorMonths === opt.months;
              return (
                <button
                  key={opt.months}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTenorMonths(opt.months)}
                  className={`rounded-xl border-2 px-1 py-2 text-xs font-black transition-all active:scale-95 ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-ds-border bg-white text-ds-ink2 hover:border-emerald-400 dark:bg-ds-card2'
                  }`}
                >
                  {lang === Language.EN ? opt.en : opt.id}
                </button>
              );
            })}
          </div>
        </div>

        {isMultiYear && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <TrendingDown size={15} className="mt-0.5 flex-shrink-0 text-sky-700 dark:text-sky-300" />
              <div className="text-xs leading-relaxed text-sky-900 dark:text-sky-100">
                <p className="font-black mb-0.5">{t('Multi-year policy', 'Polis multi-tahun')}</p>
                <p>{t(
                  `The sum insured decreases ${MULTI_YEAR_DEPRECIATION_RATE * 100}% each policy year from the previous year's value, following the vehicle's depreciation. A claim is paid against the value of the year it happens in. The rate is locked from year one, the admin fee is charged once, and the whole premium is paid upfront.`,
                  `Nilai pertanggungan turun ${MULTI_YEAR_DEPRECIATION_RATE * 100}% setiap tahun polis dari nilai tahun sebelumnya, mengikuti penyusutan kendaraan. Klaim dibayar berdasarkan nilai pada tahun kejadian. Rate dikunci dari tahun pertama, biaya admin dikenakan sekali, dan seluruh premi dibayar di muka.`,
                )}</p>
              </div>
            </div>
            {built.schedule.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-2xs font-black uppercase tracking-widest text-sky-800/70 dark:text-sky-200/70">
                      <th className="py-1.5 pr-3">{t('Year', 'Tahun')}</th>
                      <th className="py-1.5 pr-3 hidden sm:table-cell">{t('Period', 'Periode')}</th>
                      <th className="py-1.5 pr-3 text-right">{t('Sum insured', 'Nilai pertanggungan')}</th>
                      <th className="py-1.5 text-right">{t('Gross premium', 'Premi gross')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {built.schedule.map(row => {
                      const from = addMonthsToIsoDate(startDate, 12 * (row.year - 1));
                      const to = addMonthsToIsoDate(startDate, 12 * (row.year - 1) + row.months);
                      return (
                        <tr key={row.year} className="border-t border-sky-200/70 dark:border-sky-900 text-sky-950 dark:text-sky-50">
                          <td className="py-1.5 pr-3 font-black whitespace-nowrap">
                            {row.year}
                            {row.months < 12 && <span className="font-bold text-sky-800/70 dark:text-sky-200/70"> ({row.months} {t('mo', 'bln')})</span>}
                            {/* Di layar sempit kolom Periode disembunyikan — tahun mulainya cukup. */}
                            <span className="sm:hidden block text-2xs font-bold text-sky-800/70 dark:text-sky-200/70">{fmtMonthYear(from, lang)}</span>
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap hidden sm:table-cell">
                            {fmtDate(from, lang)} – {fmtDate(to, lang)}
                          </td>
                          <td className="py-1.5 pr-3 text-right font-bold tabular-nums whitespace-nowrap">{fmtIDR(row.sumInsured)}</td>
                          <td className="py-1.5 text-right font-bold tabular-nums whitespace-nowrap">{fmtIDR(row.premiumGross)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diskon */}
      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-5 space-y-3">
        <p className={labelCls}>{t('Discount', 'Diskon')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div>
            <label className={labelCls} htmlFor="unit-discount">{t(`Discount % (max ${discountCapPct}%)`, `Diskon % (maks. ${discountCapPct}%)`)}</label>
            <input
              id="unit-discount"
              className={inputCls}
              inputMode="decimal"
              value={discountPct}
              onChange={e => setDiscountPct(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
              placeholder={String(discountCapPct)}
            />
            <p className="text-2xs text-ds-ink3 mt-1">
              {t('Leave empty to use the maximum.', 'Kosongkan untuk memakai diskon maksimum.')}
            </p>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer sm:pt-6">
            <input
              type="checkbox"
              checked={discountShown}
              onChange={e => setDiscountShown(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-emerald-600"
            />
            <span className="text-xs leading-relaxed text-ds-ink2">
              <span className="font-black text-ds-ink dark:text-white block">{t('Show the discount on the policy', 'Diskon tertera di polis')}</span>
              {discountShown
                ? t('The policy prints the gross premium, the discount, and the net premium.', 'Polis mencetak premi gross, diskon, dan premi setelah diskon.')
                : t('The policy prints the gross premium only. Your invoice is still reduced by the discount.', 'Polis hanya mencetak premi gross. Tagihan Anda tetap dipotong diskon.')}
            </span>
          </label>
        </div>
      </div>

      {/* Nasabah / kontrak */}
      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-5 space-y-4">
        <p className={labelCls}>{t('Customer & contract', 'Nasabah & kontrak')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('Customer name', 'Nama nasabah')} *</label>
            <input className={inputCls} value={nasabahName} onChange={e => setNasabahName(e.target.value)} placeholder={t('Debtor name', 'Nama debitur')} />
          </div>
          <div>
            <label className={labelCls}>{t('Phone', 'No. HP')}</label>
            <input className={inputCls} value={nasabahPhone} onChange={e => setNasabahPhone(e.target.value)} placeholder="0812…" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('Address', 'Alamat')}</label>
            <input className={inputCls} value={nasabahAddress} onChange={e => setNasabahAddress(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('Financing contract no.', 'No. kontrak pembiayaan')}</label>
            <input className={inputCls} value={contractNo} onChange={e => setContractNo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Preview premi */}
      <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-500/5 p-5 space-y-2">
        <p className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Info size={11} className="inline" /> {t('Premium preview (server re-computes on submit)', 'Preview premi (server hitung ulang saat submit)')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
          <PreviewRow label={t('Zone', 'Zona')} value={String(built.zone)} />
          <PreviewRow label={t('Coverage', 'Pertanggungan')} value={built.coverage === 'COMPREHENSIVE' ? 'Comprehensive' : 'TLO'} />
          <PreviewRow label="Rate" value={fmtPct(built.rate)} />
          <PreviewRow label={t('Period', 'Periode')} value={`${fmtDate(startDate, lang)} – ${fmtDate(endDate, lang)}`} />
          <PreviewRow label={t('Gross premium', 'Premi gross')} value={fmtIDR(built.premiumGross)} />
          <PreviewRow
            label={`${t('Discount', 'Diskon')} (${fmtPct(built.discountRate)}${discountShown ? '' : t(', not on policy', ', tidak tertera')})`}
            value={`−${fmtIDR(built.discountAmount)}`}
          />
          <PreviewRow label={t('Admin fee', 'Biaya admin')} value={fmtIDR(built.adminFee)} />
        </div>
        <div className="pt-2 border-t border-emerald-400/30 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-ds-ink3">{t('Total premium', 'Total premi')}</span>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{fmtIDR(built.totalPremium)}</span>
        </div>
        {built.flags.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-1">
            {built.flags.map((f, i) => (
              <p key={i} className="text-2xs font-bold text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> {f}
              </p>
            ))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}

      <div className="flex items-center justify-end gap-3 pb-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
          {t('Submit unit order', 'Kirim order unit')}
        </button>
      </div>
    </div>
  );
};

const PreviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-2xs text-ds-ink3">{label}</span>
    <span className="font-bold text-ds-ink dark:text-white">{value}</span>
  </div>
);

export default B2BUnitOrder;
