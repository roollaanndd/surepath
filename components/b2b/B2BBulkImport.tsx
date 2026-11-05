import React, { useMemo, useState } from 'react';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight,
  ExternalLink, FileSpreadsheet, X,
} from 'lucide-react';
import { Language } from '../../types';
import {
  parseBulkFile, autoMapColumns, buildRawRows, FIELD_LABELS, REQUIRED_FIELDS,
  type ColumnMapping, type ParsedSheet,
} from '../../services/b2bBulkParser';
import {
  buildLineItem, calcBulkTotals, type RawBulkRow, type BuiltLineItem,
  type VehicleClass, type Zone,
} from '../../services/b2bFleetRating';
import { createB2BBulkBatch, createB2BBulkInvoice, uploadB2BBulkSourceFile } from '../../services/supabaseService';

interface Props {
  clientId: string;
  client: any;
  onDone: () => void;
  lang: Language;
}

type Step = 'upload' | 'mapping' | 'review' | 'done';

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const VEHICLE_CLASS_LABEL: Record<VehicleClass, string> = {
  MOTORCYCLE: 'Motor', CAR: 'Mobil', HEAVY_EQUIPMENT: 'Alat Berat',
};

interface RowOverride {
  zone?: Zone;
  vehicleClass?: VehicleClass;
  commercialBody?: boolean;
}

const B2BBulkImport: React.FC<Props> = ({ clientId, client, onDone, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [rawRows, setRawRows] = useState<RawBulkRow[]>([]);
  const [overrides, setOverrides] = useState<Record<number, RowOverride>>({});
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<{ batchId: string; batchNumber: string } | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleFile = async (f: File) => {
    setError('');
    setParsing(true);
    setFileName(f.name);
    setFile(f);
    try {
      const parsed = await parseBulkFile(f);
      if (parsed.headers.length === 0) {
        setError(t('Could not read any columns from this file.', 'Tidak ada kolom yang terbaca dari file ini.'));
        setParsing(false);
        return;
      }
      const map = autoMapColumns(parsed.headers);
      const missing = REQUIRED_FIELDS.filter(f2 => map[f2] == null);
      setSheet(parsed);
      setMapping(map);
      setRawRows(buildRawRows(parsed, map));
      setStep('mapping');
      if (missing.length > 0) {
        setError(t(
          `Could not auto-detect: ${missing.map(m => FIELD_LABELS[m]).join(', ')}. Map them manually below.`,
          `Kolom berikut belum terdeteksi otomatis: ${missing.map(m => FIELD_LABELS[m]).join(', ')}. Petakan manual di bawah.`,
        ));
      }
    } catch (e) {
      console.error('parseBulkFile failed:', e);
      setError(t('Failed to read this file. Make sure it is a valid .xlsx/.xls/.csv export.', 'Gagal membaca file ini. Pastikan berupa ekspor .xlsx/.xls/.csv yang valid.'));
    } finally {
      setParsing(false);
    }
  };

  const remapColumn = (field: keyof ColumnMapping, colIndex: number | null) => {
    if (!mapping || !sheet) return;
    const next = { ...mapping, [field]: colIndex };
    setMapping(next);
    setRawRows(buildRawRows(sheet, next));
  };

  const items: BuiltLineItem[] = useMemo(() => rawRows.map(r => buildLineItem({
    ...r,
    zoneOverride: overrides[r.rowNo]?.zone,
    vehicleClassOverride: overrides[r.rowNo]?.vehicleClass,
    commercialBodyOverride: overrides[r.rowNo]?.commercialBody,
  })), [rawRows, overrides]);

  const totals = useMemo(() => calcBulkTotals(items), [items]);
  const flaggedCount = useMemo(() => items.filter(it => it.flags.length > 0).length, [items]);

  const setOverride = (rowNo: number, patch: Partial<RowOverride>) => {
    setOverrides(prev => ({ ...prev, [rowNo]: { ...prev[rowNo], ...patch } }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const payloadItems = rawRows.map((r, i) => {
      const built = items[i];
      return {
        rowNo: r.rowNo,
        nasabahName: r.nasabahName,
        nasabahKtp: r.nasabahKtp,
        nasabahPhone: r.nasabahPhone,
        nasabahAddress: r.nasabahAddress,
        contractNo: r.contractNo,
        contractDate: r.contractDate,
        tenorMonths: r.tenorMonths,
        financingValue: r.financingValue,
        vehicleClass: built.vehicleClass,
        commercialBody: overrides[r.rowNo]?.commercialBody,
        make: r.make,
        model: r.typeName,
        modelYear: r.modelYear,
        otr: r.otr,
        plateNo: r.plateNo,
        chassisNo: r.chassisNo,
        engineNo: r.engineNo,
        bpkbNo: r.bpkbNo,
        regionText: r.regionText,
        zone: built.zone,
        flags: built.flags,
      };
    });

    const result = await createB2BBulkBatch({
      companyName: client?.company_name ?? '',
      sourceFileName: fileName,
      items: payloadItems,
    });

    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (file) uploadB2BBulkSourceFile(clientId, result.batch.batch_number, file).catch(() => {});

    setBatchResult({ batchId: result.batch.id, batchNumber: result.batch.batch_number });
    setStep('done');
    setSubmitting(false);
  };

  const handleCreateInvoice = async () => {
    if (!batchResult) return;
    setInvoiceLoading(true);
    const res = await createB2BBulkInvoice(batchResult.batchId);
    setInvoiceLoading(false);
    if (res?.invoice_url) setInvoiceUrl(res.invoice_url);
    else setError(t('Failed to create invoice. Try again.', 'Gagal membuat invoice. Coba lagi.'));
  };

  // ─── Upload step ──────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <h2 className="font-black text-lg">{t('Bulk Import — Fleet TLO', 'Impor Massal — TLO Armada')}</h2>
        <p className="text-sm text-ds-ink3">{t(
          'Upload a spreadsheet of financed vehicles (one row per nasabah). Pathy reads it, computes the TLO premium per unit against the OJK rate table, and flags anything that needs a second look.',
          'Unggah spreadsheet kendaraan yang dibiayai (satu baris per nasabah). Pathy akan membaca file, menghitung premi TLO per unit sesuai tabel rate OJK, dan menandai baris yang perlu diperiksa ulang.',
        )}</p>

        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400/60 bg-emerald-500/5 py-12 cursor-pointer">
          {parsing ? <Loader2 size={28} className="animate-spin text-ds-green" /> : <Upload size={28} className="text-ds-green" />}
          <span className="text-sm font-bold text-ds-ink2">{parsing ? t('Reading file…', 'Membaca file…') : t('Click to choose a file', 'Klik untuk pilih file')}</span>
          <span className="text-2xs text-ds-ink3">.xlsx, .xls, .csv</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={parsing}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
      </div>
    );
  }

  // ─── Column mapping step ──────────────────────────────────────────────────
  if (step === 'mapping' && sheet && mapping) {
    const missing = REQUIRED_FIELDS.filter(f => mapping[f] == null);
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-ds-green" />
          <h2 className="font-black text-lg">{t('Column Mapping', 'Pemetaan Kolom')}</h2>
        </div>
        <p className="text-xs text-ds-ink3">
          {fileName} · {rawRows.length} {t('rows detected', 'baris terdeteksi')}
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
          {(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).map(field => (
            <div key={field} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs font-bold text-ds-ink2">
                {FIELD_LABELS[field]}
                {REQUIRED_FIELDS.includes(field) && <span className="text-rose-500">*</span>}
              </span>
              <select
                className="text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-1.5"
                value={mapping[field] ?? ''}
                onChange={e => remapColumn(field, e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">{t('— not mapped —', '— tidak dipetakan —')}</option>
                {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep('upload')} className="flex items-center gap-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-sm font-bold">
            <ChevronLeft size={16} /> {t('Back', 'Kembali')}
          </button>
          <button
            disabled={missing.length > 0}
            onClick={() => setStep('review')}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-black disabled:opacity-40"
          >
            {t('Review & Compute', 'Tinjau & Hitung')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Review grid ────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg">{t('Review Computed Premiums', 'Tinjau Premi Terhitung')}</h2>
          <button onClick={() => setStep('mapping')} className="text-xs font-bold text-ds-ink3 flex items-center gap-1">
            <ChevronLeft size={12} /> {t('Mapping', 'Pemetaan')}
          </button>
        </div>

        {flaggedCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            {t(
              `${flaggedCount} of ${items.length} rows need a quick look (zone/vehicle type/premium reference) — scroll right to see why, and override if needed.`,
              `${flaggedCount} dari ${items.length} baris perlu diperiksa sekilas (zona/jenis kendaraan/referensi premi) — gulir ke kanan untuk alasannya, dan ubah bila perlu.`,
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-white/5 text-ds-ink3 uppercase text-2xs">
              <tr>
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">{t('Name', 'Nama')}</th>
                <th className="px-2 py-2 text-left">{t('Vehicle', 'Kendaraan')}</th>
                <th className="px-2 py-2 text-left">{t('Zone', 'Zona')}</th>
                <th className="px-2 py-2 text-right">{t('Financing', 'Pembiayaan')}</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">{t('Gross', 'Gross')}</th>
                <th className="px-2 py-2 text-right">{t('Discount', 'Diskon')}</th>
                <th className="px-2 py-2 text-right">Admin</th>
                <th className="px-2 py-2 text-right">{t('Total', 'Total')}</th>
                <th className="px-2 py-2 text-left">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {items.map((it, i) => {
                const raw = rawRows[i];
                return (
                  <tr key={it.rowNo} className={it.flags.length > 0 ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''}>
                    <td className="px-2 py-1.5 text-ds-ink3">{it.rowNo}</td>
                    <td className="px-2 py-1.5 font-bold max-w-[160px] truncate">{raw.nasabahName}</td>
                    <td className="px-2 py-1.5">
                      <select
                        className="text-2xs rounded border border-slate-200 dark:border-white/10 bg-transparent px-1 py-0.5"
                        value={it.vehicleClass}
                        onChange={e => setOverride(it.rowNo, { vehicleClass: e.target.value as VehicleClass })}
                      >
                        {(['MOTORCYCLE', 'CAR', 'HEAVY_EQUIPMENT'] as VehicleClass[]).map(vc => (
                          <option key={vc} value={vc}>{VEHICLE_CLASS_LABEL[vc]}</option>
                        ))}
                      </select>
                      {it.vehicleClass === 'CAR' && (
                        <label className="flex items-center gap-1 mt-0.5 text-2xs text-ds-ink3">
                          <input
                            type="checkbox"
                            checked={it.commercialBody}
                            onChange={e => setOverride(it.rowNo, { commercialBody: e.target.checked })}
                          />
                          {t('pickup/truck', 'pickup/truk')}
                        </label>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="text-2xs rounded border border-slate-200 dark:border-white/10 bg-transparent px-1 py-0.5"
                        value={it.zone}
                        onChange={e => setOverride(it.rowNo, { zone: Number(e.target.value) as Zone })}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                      <div className="text-2xs text-ds-ink3">{it.zoneSource}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right">{fmtIDR(raw.financingValue)}</td>
                    <td className="px-2 py-1.5 text-right">{(it.rate * 100).toFixed(2)}%</td>
                    <td className="px-2 py-1.5 text-right">{fmtIDR(it.premiumGross)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtIDR(it.discountAmount)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtIDR(it.adminFee)}</td>
                    <td className="px-2 py-1.5 text-right font-black text-ds-green">{fmtIDR(it.totalPremium)}</td>
                    <td className="px-2 py-1.5 max-w-[220px]">
                      {it.flags.length > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 text-2xs" title={it.flags.join(' | ')}>
                          ⚠ {it.flags.length}
                        </span>
                      ) : <CheckCircle2 size={12} className="text-ds-green" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Units', 'Jumlah Unit')}</span><span className="font-bold">{totals.itemCount}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Gross Premium', 'Premi Gross')}</span><span className="font-bold">{fmtIDR(totals.totalPremiumGross)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Discount', 'Diskon')}</span><span className="font-bold">-{fmtIDR(totals.totalDiscount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Admin Fee', 'Biaya Admin')}</span><span className="font-bold">{fmtIDR(totals.totalAdminFee)}</span></div>
          <div className="flex justify-between text-base border-t border-slate-100 dark:border-white/10 pt-2 mt-1">
            <span className="font-black">{t('Total to Invoice', 'Total Ditagihkan')}</span>
            <span className="font-black text-ds-green">{fmtIDR(totals.totalAmount)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('mapping')} className="flex items-center gap-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-sm font-bold">
            <ChevronLeft size={16} /> {t('Back', 'Kembali')}
          </button>
          <button
            disabled={submitting || items.length === 0}
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-black disabled:opacity-40"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('Submit Batch', 'Ajukan Batch')}
          </button>
        </div>
      </div>
    );
  }

  // ─── Done ─────────────────────────────────────────────────────────────────
  if (step === 'done' && batchResult) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-center space-y-4">
        <CheckCircle2 size={48} className="text-ds-green mx-auto" />
        <h2 className="font-black text-lg">{t('Batch Submitted', 'Batch Terkirim')}</h2>
        <p className="text-sm text-ds-ink3">
          {t('Batch', 'Batch')} <span className="font-mono font-bold">{batchResult.batchNumber}</span> {t('has been created.', 'telah dibuat.')}
        </p>

        {!invoiceUrl ? (
          <button
            disabled={invoiceLoading}
            onClick={handleCreateInvoice}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-black disabled:opacity-60"
          >
            {invoiceLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('Create Invoice', 'Buat Invoice')}
          </button>
        ) : (
          <a
            href={invoiceUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-black"
          >
            {t('Pay Now', 'Bayar Sekarang')} <ExternalLink size={14} />
          </a>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300 text-left">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button onClick={onDone} className="w-full py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-sm font-bold flex items-center justify-center gap-1">
          <X size={14} /> {t('Done — view batches', 'Selesai — lihat daftar batch')}
        </button>
      </div>
    );
  }

  return null;
};

export default B2BBulkImport;
