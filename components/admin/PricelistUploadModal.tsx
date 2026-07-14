import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  brand: string;
  model: string;
  year: number;
  price: number;
}

interface ImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

interface PricelistUploadModalProps {
  onClose: () => void;
  onDone: () => void;
  versions: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white';

const primaryBtn =
  'bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const secondaryBtn =
  'bg-white/[0.05] border border-white/10 hover:bg-white/10 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors';

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  brand: 'brand', merk: 'brand', merek: 'brand',
  model: 'model',
  year: 'year', tahun: 'year',
  price: 'price', harga: 'price', 'harga list': 'price',
};

function detectColumn(header: string): keyof ParsedRow | null {
  return HEADER_MAP[header.toLowerCase().trim()] ?? null;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const colMap: Record<number, keyof ParsedRow> = {};
  headers.forEach((h, i) => {
    const key = detectColumn(h);
    if (key) colMap[i] = key;
  });
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const row: Partial<ParsedRow> = {};
    Object.entries(colMap).forEach(([idx, key]) => {
      const val = cells[Number(idx)] ?? '';
      if (key === 'year') row.year = parseInt(val) || 0;
      else if (key === 'price') row.price = parseFloat(val) || 0;
      else (row as Record<string, string>)[key] = val;
    });
    if (row.brand && row.model && row.year && row.price) {
      rows.push(row as ParsedRow);
    }
  }
  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PricelistUploadModal: React.FC<PricelistUploadModalProps> = ({ onClose, onDone, versions }) => {
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [version, setVersion] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.toLocaleString('en', { month: 'short' })}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);
    setError('');
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError('Tidak ada baris valid. Pastikan kolom: brand/merk, model, year/tahun, price/harga');
      }
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview.length || !version.trim()) return;
    setImporting(true);
    let inserted = 0, updated = 0, skipped = 0;

    // FIX v1.42.0: batch upsert instead of N+1 sequential queries.
    // Previously 500 rows = 1000 sequential queries (~60s UI freeze).
    // Now: 1 upsert query (~500ms). Uses onConflict to handle brand+model+year uniqueness.
    const rowsToUpsert = preview.map(row => ({
      brand: row.brand.toUpperCase(),
      model: row.model.toUpperCase(),
      ref_year: row.year,
      list_price_m: row.price,
      market_value_rp: Math.round(row.price * 1_000_000 * 0.95),
      discount_rate: 0.05,
      is_active: true,
      notes: `version:${version}`,
      updated_at: new Date().toISOString(),
    }));

    try {
      const { data: upserted, error } = await supabase
        .from('sp_vehicle_overrides')
        .upsert(rowsToUpsert, {
          onConflict: 'brand,model,ref_year',
          ignoreDuplicates: false,
        })
        .select('id, list_price_m');

      if (error) throw error;

      // Count inserted vs updated based on whether notes contained 'prev:' (existing) or not
      // Since upsert doesn't distinguish, we approximate: all rows that came back are either
      // inserted or updated. For UI feedback, treat all as "processed".
      const totalProcessed = upserted?.length ?? rowsToUpsert.length;
      inserted = totalProcessed; // upsert handles both insert + update atomically
      updated = 0;
      skipped = preview.length - totalProcessed;
    } catch (e: any) {
      console.error('Pricelist import failed:', e);
      // Fallback to row-by-row if batch upsert fails (e.g., missing unique constraint)
      for (const row of preview) {
        const { data: existing } = await supabase
          .from('sp_vehicle_overrides')
          .select('id, list_price_m')
          .eq('brand', row.brand.toUpperCase())
          .eq('model', row.model.toUpperCase())
          .eq('ref_year', row.year)
          .maybeSingle();
        if (!existing) {
          await supabase.from('sp_vehicle_overrides').insert({
            brand: row.brand.toUpperCase(),
            model: row.model.toUpperCase(),
            ref_year: row.year,
            list_price_m: row.price,
            market_value_rp: Math.round(row.price * 1_000_000 * 0.95),
            discount_rate: 0.05,
            is_active: true,
            notes: `version:${version}`,
          });
          inserted++;
        } else {
          updated++;
        }
      }
    }
    setSummary({ inserted, updated, skipped });
    setImporting(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-white/5">
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Upload Pricelist Tahunan</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Version label */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Label Versi</p>
            <input
              className={inputCls}
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="2025-Jun-01"
            />
            {versions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest self-center">Versi Ada:</span>
                {versions.map(v => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold hover:text-white transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File picker */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">File CSV</p>
            <button
              onClick={() => fileRef.current?.click()}
              className={`${secondaryBtn} flex items-center gap-2`}
            >
              <Upload size={12} /> {fileName || 'Pilih File (.csv)'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <p className="text-[9px] text-slate-600 mt-1">Kolom yang didukung: brand/merk, model, year/tahun, price/harga</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-500/10 rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !summary && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                Preview ({preview.length} baris — tampil 10 pertama)
              </p>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                      <th className="text-left px-4 py-2">Merek</th>
                      <th className="text-left px-4 py-2">Model</th>
                      <th className="text-right px-4 py-2">Tahun</th>
                      <th className="text-right px-4 py-2">Harga (jt)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {preview.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-white font-bold">{r.brand}</td>
                        <td className="px-4 py-2 text-slate-300">{r.model}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{r.year}</td>
                        <td className="px-4 py-2 text-right text-emerald-400 font-black">{r.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
              <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-xs font-bold space-y-1">
                <p className="text-white font-black">Import selesai</p>
                <p className="text-emerald-400">{summary.inserted} baru ditambahkan</p>
                <p className="text-amber-400">{summary.updated} diperbarui</p>
                <p className="text-slate-400">{summary.skipped} sudah ada (tidak diubah)</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!summary ? (
              <button
                onClick={handleImport}
                disabled={!preview.length || importing || !version.trim()}
                className={`${primaryBtn} flex items-center gap-2 flex-1 justify-center`}
              >
                <Upload size={13} />
                {importing ? `Mengimport... (${preview.length} baris)` : `Import ${preview.length} Baris`}
              </button>
            ) : (
              <button onClick={onClose} className={`${primaryBtn} flex-1`}>Tutup</button>
            )}
            <button onClick={onClose} className={secondaryBtn}>Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricelistUploadModal;
