import React, { useMemo, useState } from 'react';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight,
  ExternalLink, FileSpreadsheet, FileDown, X,
} from 'lucide-react';
import { Language } from '../../types';
import {
  parseBulkFile, autoMapColumns, buildRawRows, FIELD_LABELS, REQUIRED_FIELDS,
  missingRequiredFields, mappingNotices,
  type ColumnMapping, type ParsedSheet,
} from '../../services/b2bBulkParser';
import {
  buildLineItem, calcBulkTotals, type RawBulkRow, type BuiltLineItem,
  type VehicleClass, type Zone,
} from '../../services/b2bFleetRating';
import { downloadBulkQuoteExcel, quoteRowFromLineItem } from '../../services/b2bBulkQuoteExcel';
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
      if (parsed.headers.filter(h => h.trim() !== '').length === 0) {
        setError(t(
          'This file has no readable table. Make sure the sheet has a header row (e.g. Nama, Nilai Pembiayaan, Tenor) followed by one row per vehicle.',
          'File ini tidak memuat tabel yang bisa dibaca. Pastikan ada satu baris judul kolom (mis. Nama, Nilai Pembiayaan, Tenor) diikuti satu baris per kendaraan.',
        ));
        setParsing(false);
        return;
      }
      const map = autoMapColumns(parsed.headers);
      const rows = buildRawRows(parsed, map);
      const missing = missingRequiredFields(map);
      setSheet(parsed);
      setMapping(map);
      setRawRows(rows);
      setStep('mapping');
      if (missing.length > 0) {
        setError(t(
          `Could not auto-detect: ${missing.map(m => FIELD_LABELS[m]).join(', ')}. Pick the matching column below.`,
          `Kolom berikut belum terdeteksi otomatis: ${missing.map(m => FIELD_LABELS[m]).join(', ')}. Pilih kolom yang sesuai di bawah.`,
        ));
      } else if (rows.length === 0) {
        setError(t(
          'The columns were recognised but no data rows were found under the header.',
          'Kolom dikenali, tetapi tidak ada baris data di bawah judul kolom.',
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
    const rows = buildRawRows(sheet, next);
    setMapping(next);
    setRawRows(rows);
    const stillMissing = missingRequiredFields(next);
    setError(stillMissing.length > 0
      ? t(
          `Still not mapped: ${stillMissing.map(m => FIELD_LABELS[m]).join(', ')}.`,
          `Belum dipetakan: ${stillMissing.map(m => FIELD_LABELS[m]).join(', ')}.`,
        )
      : rows.length === 0
        ? t('No data rows were found under the header.', 'Tidak ada baris data di bawah judul kolom.')
        : '');
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

  // v2.8.18 — quotation Excel dari angka engine di layar review ini. Sama
  // dengan recompute otoritatif server saat submit: satu engine (diuji paritas),
  // jadi file ini yang dikirim ke klien sudah berisi premi/disc/total final.
  const handleDownloadQuote = () => {
    downloadBulkQuoteExcel(
      items.map((it, i) => quoteRowFromLineItem(it, rawRows[i])),
      { sourceFileName: fileName || undefined },
    );
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
      <div className="max-w-5xl mx-auto space-y-4">
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
    const missing = missingRequiredFields(mapping);
    const notices = mappingNotices(mapping);
    const previewFields = (Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>)
      .filter(f => mapping[f] != null && ['nasabahName', 'jenisBrg', 'make', 'typeName', 'financingValue', 'otr', 'tenorMonths', 'plateNo'].includes(f));
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-ds-green" />
          <h2 className="font-black text-lg">{t('Column Mapping', 'Pemetaan Kolom')}</h2>
        </div>
        <p className="text-xs text-ds-ink3">
          {fileName} · {rawRows.length} {t('rows detected', 'baris terdeteksi')}
          {sheet.sheetName ? ` · ${t('sheet', 'sheet')} "${sheet.sheetName}"` : ''}
          {sheet.headerRowIndex != null ? ` · ${t('header on row', 'judul kolom di baris')} ${sheet.headerRowIndex + 1}` : ''}
        </p>

        {notices.length > 0 && (
          <ul className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 p-3 space-y-1 text-xs text-sky-900 dark:text-sky-100">
            {notices.map(n => <li key={n} className="flex items-start gap-2"><AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> {n}</li>)}
          </ul>
        )}

        {/* Pratinjau: tiga baris pertama sebagaimana TERBACA, supaya salah petakan
            kolom terlihat sebelum dihitung. */}
        {rawRows.length > 0 && previewFields.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="text-left px-4 pt-3 pb-1 text-2xs font-black uppercase tracking-widest text-ds-ink3">
                {t('Preview — first rows as read', 'Pratinjau — baris pertama sebagaimana terbaca')}
              </caption>
              <thead>
                <tr className="text-left text-ds-ink3">
                  {previewFields.map(f => <th key={f} className="px-4 py-2 font-bold whitespace-nowrap">{FIELD_LABELS[f]}</th>)}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 3).map(r => (
                  <tr key={r.rowNo} className="border-t border-slate-100 dark:border-white/5">
                    {previewFields.map(f => {
                      const v = (r as unknown as Record<string, unknown>)[f];
                      const money = f === 'financingValue' || f === 'otr';
                      return (
                        <td key={f} className="px-4 py-2 whitespace-nowrap text-ds-ink2">
                          {v == null || v === '' ? '—' : money ? fmtIDR(Number(v)) : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
            disabled={missing.length > 0 || rawRows.length === 0}
            onClick={() => { setError(''); setStep('review'); }}
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

        <button
          onClick={handleDownloadQuote}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
        >
          <FileDown size={16} /> {t('Download Quotation (Excel)', 'Unduh Quotation (Excel)')}
        </button>

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
      <div className="max-w-xl mx-auto py-8 text-center space-y-4">
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
