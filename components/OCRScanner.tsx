import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, ScanLine, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface Props {
  docType: 'KTP' | 'STNK';
  onResult: (fields: Record<string, string>) => void;
  onClose: () => void;
}

interface OcrResponse {
  status: 'OK' | 'MOCK' | 'ERROR';
  doc_type: string;
  fields: Record<string, string>;
  message?: string;
}

const FIELD_LABELS: Record<string, Record<string, string>> = {
  KTP: {
    nik:     'NIK',
    name:    'Nama',
    dob:     'Tanggal Lahir',
    address: 'Alamat',
  },
  STNK: {
    plate_number: 'Plat Nomor',
    make:         'Merk',
    model:        'Model',
    chassis_no:   'No. Rangka',
    engine_no:    'No. Mesin',
  },
};

const OCRScanner: React.FC<Props> = ({ docType, onResult, onClose }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64]   = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult]   = useState<OcrResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const docLabel = docType === 'KTP' ? 'KTP' : 'STNK';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      // Strip the data URL prefix to get pure base64
      const b64 = dataUrl.split(',')[1] ?? '';
      setBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!base64) return;
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ocr-scan', {
        body: { image_base64: base64, doc_type: docType },
      });

      if (fnError) throw new Error(fnError.message);

      const resp = data as OcrResponse;
      if (resp.status === 'ERROR') {
        setError(resp.message ?? 'Scan gagal. Coba foto ulang.');
      } else {
        setResult(resp);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Terjadi kesalahan saat scan.');
    } finally {
      setScanning(false);
    }
  };

  const handleUseData = () => {
    if (result?.fields) {
      onResult(result.fields);
      onClose();
    }
  };

  const fieldLabels = FIELD_LABELS[docType] ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-[#111] rounded-[2rem] border border-white/10 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ScanLine size={16} className="text-primary-500" />
            <span className="font-black text-sm tracking-tight">Scan {docLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Image preview area */}
          <div
            className={`relative rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${
              preview ? 'border-white/10' : 'border-white/10 hover:border-primary-500/40'
            }`}
            style={{ minHeight: '160px' }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full object-contain max-h-48 rounded-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <Camera size={32} className="mb-2 opacity-40" />
                <p className="text-xs font-bold text-center">Foto atau unggah gambar {docLabel}</p>
              </div>
            )}
          </div>

          {/* Camera / upload buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.removeAttribute('capture');
                  fileRef.current.setAttribute('capture', 'environment');
                  fileRef.current.click();
                }
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <Camera size={14} />
              Kamera
            </button>
            <button
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.removeAttribute('capture');
                  fileRef.current.click();
                }
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <Upload size={14} />
              Unggah
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Scan button */}
          {preview && !result && (
            <button
              disabled={scanning || !base64}
              onClick={handleScan}
              className="w-full py-3.5 rounded-2xl bg-primary-500 text-white text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Memindai…
                </>
              ) : (
                <>
                  <ScanLine size={14} />
                  Scan Dokumen
                </>
              )}
            </button>
          )}

          {/* Error state */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs font-bold text-rose-400">{error}</p>
            </div>
          )}

          {/* Result display */}
          {result && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                result.status === 'MOCK'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                <CheckCircle2 size={12} />
                {result.status === 'MOCK' ? 'Data contoh (API key belum dikonfigurasi)' : 'Scan berhasil'}
              </div>

              <div className="space-y-2">
                {Object.entries(result.fields).map(([key, val]) => (
                  val ? (
                    <div key={key} className="bg-white/5 rounded-xl px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {fieldLabels[key] ?? key}
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5 break-all">{val}</p>
                    </div>
                  ) : null
                ))}
              </div>

              <button
                onClick={handleUseData}
                className="w-full py-3.5 rounded-2xl bg-primary-500 text-white text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-colors"
              >
                Gunakan Data Ini
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRScanner;
