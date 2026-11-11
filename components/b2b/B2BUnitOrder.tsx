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

import React, { useMemo, useState } from 'react';
import {
  Car, Bike, Construction, Loader2, CheckCircle2, AlertTriangle, ExternalLink,
  Info, ClipboardList,
} from 'lucide-react';
import { Language } from '../../types';
import {
  buildLineItem, getActiveBulkRateConfig,
  type VehicleClass, type Zone, type BuiltLineItem,
} from '../../services/b2bFleetRating';
import { createB2BBulkBatch, createB2BBulkInvoice } from '../../services/supabaseService';

interface Props {
  clientId: string;
  client: any;
  onDone: () => void;
  lang: Language;
}

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtPct = (n: number) => `${(n * 100).toFixed(3).replace(/\.?0+$/, '')}%`;

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
  const [nasabahName, setNasabahName] = useState('');
  const [nasabahPhone, setNasabahPhone] = useState('');
  const [nasabahAddress, setNasabahAddress] = useState('');
  const [contractNo, setContractNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [regionText, setRegionText] = useState('');
  const [zoneOverride, setZoneOverride] = useState<Zone | ''>('');
  const [financingValue, setFinancingValue] = useState('');
  const [otr, setOtr] = useState('');
  const [commercialBody, setCommercialBody] = useState(false);
  const [tenorMonths, setTenorMonths] = useState('12');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{ batchId: string; batchNumber: string; total: number } | null>(null);

  const isCar = vehicleClass === 'CAR';
  const isHeavy = vehicleClass === 'HEAVY_EQUIPMENT';

  // Preview live — mesin rating yang sama persis dengan impor massal.
  const built: BuiltLineItem = useMemo(() => buildLineItem({
    rowNo: 1,
    nasabahName,
    nasabahPhone: nasabahPhone || undefined,
    nasabahAddress: nasabahAddress || undefined,
    contractNo: contractNo || undefined,
    tenorMonths: Number(tenorMonths) || 12,
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
  }), [vehicleClass, nasabahName, nasabahPhone, nasabahAddress, contractNo, make, model, modelYear, otr, plateNo, regionText, zoneOverride, financingValue, commercialBody, tenorMonths, isCar]);

  const adminFeeForClass = vehicleClass === 'MOTORCYCLE' ? rateConfig.adminFeeMotorcycle : isHeavy ? rateConfig.adminFeeHeavy : rateConfig.adminFeeCar;
  const discountForClass = isHeavy ? rateConfig.discountRateHeavy : rateConfig.discountRateStandard;
  const zoneLabel = built.zoneSource === 'override'
    ? t(`Zone ${built.zone} (manual)`, `Zona ${built.zone} (manual)`)
    : built.zoneSource === 'plate'
      ? t(`Zone ${built.zone} (from plate)`, `Zona ${built.zone} (dari plat)`)
      : built.zoneSource === 'region'
        ? t(`Zone ${built.zone} (from region)`, `Zona ${built.zone} (dari wilayah)`)
        : t('Zone 3 (default — verify)', 'Zona 3 (default — perlu verifikasi)');

  const validate = (): string | null => {
    if (!nasabahName.trim()) return t('Customer name is required.', 'Nama nasabah wajib diisi.');
    if (!financingValue || Number(financingValue) <= 0) return t('Sum insured must be greater than zero.', 'Nilai pertanggungan (TSI) harus lebih dari nol.');
    if (isCar && !commercialBody && (!otr || Number(otr) <= 0)) return t('Passenger car needs OTR price for rate banding.', 'Mobil penumpang perlu harga OTR untuk penentuan kategori tarif.');
    if (modelYear && (Number(modelYear) < 1950 || Number(modelYear) > 2100)) return t('Year looks wrong.', 'Tahun kendaraan tidak masuk akal.');
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
        tenorMonths: Number(tenorMonths) || 12,
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
      }],
    });
    setSubmitting(false);
    if ('error' in result) { setError(result.error); return; }
    setBatchResult({
      batchId: result.batch.id,
      batchNumber: result.batch.batch_number,
      total: result.totals?.totalAmount ?? built.totalPremium,
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
        <h2 className="font-black text-lg text-ds-ink dark:text-white">{t('Unit Order — TLO', 'Order Unit — TLO')}</h2>
        <p className="text-sm text-ds-ink3 mt-0.5">{t(
          'Insure one vehicle (car, motorcycle, or heavy equipment) at the fleet rates your admin maintains — same scheme as the bulk import, no spreadsheet needed.',
          'Asuransikan satu unit (mobil, motor, atau alat berat) dengan rate fleet yang dikelola admin — skema sama dengan impor massal, tanpa spreadsheet.',
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
              ? <>Rate alat berat <b>{fmtPct(rateConfig.heavyEquipmentRate)}</b> · </>
              : isCar
                ? <>Rate mobil mengikuti tabel TLO OJK (penumpang) / {fmtPct(rateConfig.pickupTruckTloMin[built.zone as 1 | 2 | 3])} (pickup/truk) · </>
                : <>Rate motor mengikuti tabel TLO OJK · </>}
            {t('discount', 'diskon')} <b>{fmtPct(discountForClass)}</b> · {t('admin fee', 'biaya admin')} <b>{fmtIDR(adminFeeForClass)}</b> · {t('minimum', 'minimum')} <b>{fmtIDR(rateConfig.minPremiumGross)}</b>
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
              onClick={() => setVehicleClass(opt.id)}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{t('Brand', 'Merk')}</label>
            <input className={inputCls} value={make} onChange={e => setMake(e.target.value)} placeholder={isHeavy ? 'Komatsu' : 'Toyota'} />
          </div>
          <div>
            <label className={labelCls}>{t('Type / model', 'Tipe / model')}</label>
            <input className={inputCls} value={model} onChange={e => setModel(e.target.value)} placeholder={isHeavy ? 'PC200-8' : 'Avanza 1.5 G'} />
          </div>
          <div>
            <label className={labelCls}>{t('Year', 'Tahun')}</label>
            <input className={inputCls} inputMode="numeric" value={modelYear} onChange={e => setModelYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2023" />
          </div>
        </div>

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
          {isCar && !commercialBody ? (
            <div>
              <label className={labelCls}>{t('OTR price', 'Harga OTR')} *</label>
              <input className={inputCls} inputMode="numeric" value={otr} onChange={e => setOtr(e.target.value.replace(/\D/g, ''))} placeholder="280000000" />
            </div>
          ) : (
            <div>
              <label className={labelCls}>{t('Tenor', 'Tenor')}</label>
              <select className={inputCls} value={tenorMonths} onChange={e => setTenorMonths(e.target.value)}>
                {[6, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} {t('months', 'bulan')}</option>)}
              </select>
            </div>
          )}
        </div>
        {isCar && !commercialBody && (
          <div className="sm:hidden">
            <label className={labelCls}>{t('Tenor', 'Tenor')}</label>
            <select className={inputCls} value={tenorMonths} onChange={e => setTenorMonths(e.target.value)}>
              {[6, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} {t('months', 'bulan')}</option>)}
            </select>
          </div>
        )}
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
          <PreviewRow label={t('Rate (TLO)', 'Rate (TLO)')} value={fmtPct(built.rate)} />
          <PreviewRow label={t('Tenor', 'Tenor')} value={`${Number(tenorMonths) || 12} ${t('mo', 'bln')}`} />
          <PreviewRow label={t('Gross premium', 'Premi gross')} value={fmtIDR(built.premiumGross)} />
          <PreviewRow label={`${t('Discount', 'Diskon')} (${fmtPct(built.discountRate)})`} value={`−${fmtIDR(built.discountAmount)}`} />
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
