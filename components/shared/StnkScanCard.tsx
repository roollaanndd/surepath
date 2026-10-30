// ─────────────────────────────────────────────────────────────────────────────
// Kartu pindai STNK — satu pemilik untuk portal Nasabah dan portal Mitra.
//
// KENAPA DIEKSTRAK (30 Okt 2026)
//
// Dua portal punya pintu masuk OCR STNK yang memanggil layanan yang sama
// (`services/stnkOcr.ts`), tapi tampilannya tidak ada hubungannya satu sama lain:
//
//   Nasabah (car-wizard/StepVehicle) : kartu besar bergradien, ikon unggah,
//                                      "Ambil Foto STNK · Proses Cepat dengan AI"
//   Mitra (agent/VehicleUnderwriting): tombol garis putus-putus setinggi satu baris,
//                                      "Pindai STNK dengan AI"
//
// Mitra yang mendampingi nasabah melihat dua aplikasi yang berbeda untuk satu
// pekerjaan yang sama, dan tiap perbaikan hanya mendarat di salah satunya —
// pola salinan-tangan yang sama seperti nav bawah B2B dulu (PR #272).
// Tampilan Nasabah-lah yang dipakai di kedua tempat, atas permintaan pemilik.
//
// Ukuran teks dinaikkan ke lantai 11px yang berlaku di seluruh portal sejak
// revamp (versi Nasabah sebelumnya memakai 0.65rem/0.55rem ≈ 10.4px/8.8px).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import type { StnkOcrResult } from '../../services/stnkOcr';

export interface StnkCaptureCardProps {
  /** Dipanggil dengan berkas yang dipilih pengguna. */
  onPick: (file: File) => void;
  /** OCR sedang berjalan — kartu menampilkan keadaan membaca dan tidak bisa ditekan. */
  scanning?: boolean;
  /** Tautan sekunder di bawah kartu, mis. "Atau Isi Data Secara Manual". */
  secondaryAction?: { label: string; onClick: () => void };
  /** Judul kecil di atas kartu; dihilangkan bila layar sudah punya judulnya sendiri. */
  heading?: { title: string; subtitle: string };
}

/** Kartu unggah/foto STNK. Satu-satunya tampilan pintu masuk OCR STNK di aplikasi. */
export const StnkCaptureCard: React.FC<StnkCaptureCardProps> = ({
  onPick, scanning = false, secondaryAction, heading,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {heading && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter">{heading.title}</h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest px-8">
            {heading.subtitle}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = ''; // berkas yang sama bisa diunggah ulang
        }}
      />

      <button
        type="button"
        disabled={scanning}
        onClick={() => inputRef.current?.click()}
        aria-busy={scanning || undefined}
        className="block w-full p-2 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 rounded-[3rem] cursor-pointer shadow-2xl hover:scale-[1.02] transition-all active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 group relative overflow-hidden disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-wait"
      >
        <span aria-hidden="true" className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity" />
        <span className="bg-white dark:bg-black/40 rounded-[2.8rem] py-16 flex flex-col items-center justify-center text-center gap-6 relative z-10 border border-white/20">
          <span className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-inner group-hover:scale-110 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            {scanning
              ? <Loader2 size={48} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : <UploadCloud size={48} className="animate-bounce motion-reduce:animate-none" aria-hidden="true" />}
          </span>
          <span className="block">
            <span className="block text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
              {scanning ? 'Membaca STNK…' : 'Ambil Foto STNK'}
            </span>
            <span className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              <Sparkles size={12} aria-hidden="true" /> Proses Cepat dengan AI
            </span>
          </span>
        </span>
      </button>

      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="w-full py-4 text-[11px] font-black uppercase text-gray-400 hover:text-emerald-500 transition-all tracking-[0.3em]"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
};

/**
 * Hasil OCR: berhasil penuh, terbaca sebagian (dengan daftar field yang perlu
 * diperiksa), atau sama sekali tidak terbaca. Satu susunan untuk kedua portal
 * supaya pesan yang dibaca nasabah dan mitra sama bunyinya.
 */
export const StnkOcrNotice: React.FC<{
  result: StnkOcrResult | null;
  /** Elemen tambahan di kanan baris berhasil, mis. tombol "Simpan PDF" di portal Nasabah. */
  trailing?: React.ReactNode;
}> = ({ result, trailing }) => {
  if (!result) return null;

  const unreadable = result.status === 'UNCLEAR' || result.status === 'ERROR';

  if (unreadable) {
    return (
      <div role="status" aria-live="polite"
        className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 space-y-1.5">
        <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <AlertCircle size={12} aria-hidden="true" /> STNK Tidak Terbaca
        </p>
        <p className="text-[11px] font-bold opacity-90 leading-relaxed">
          AI tidak dapat membaca dokumen ini — kemungkinan foto buram, terpotong, atau bukan STNK.
          Silakan isi data kendaraan secara manual, atau unggah ulang dengan foto yang lebih jelas.
          Pengajuan tetap bisa diproses.
        </p>
        {result.notes && <p className="text-[11px] italic opacity-70 pt-1">Catatan AI: {result.notes}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden="true" className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg">
            <CheckCircle2 size={16} />
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-widest">
              {result.ok ? 'STNK Berhasil Terverifikasi' : 'STNK Terbaca Sebagian'}
            </span>
            {result.confidence > 0 && (
              <span className="text-[11px] font-bold text-emerald-700/70 dark:text-emerald-300/70 uppercase tracking-wider mt-0.5">
                AI Confidence {(result.confidence * 100).toFixed(0)}% · via {result.source === 'stnk-ocr-edge' ? 'SurePath OCR' : 'fallback'}
              </span>
            )}
          </span>
        </div>
        {trailing}
      </div>

      {!result.ok && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <AlertCircle size={11} aria-hidden="true" /> Beberapa field perlu verifikasi
          </p>
          <ul className="text-[11px] font-bold space-y-0.5 list-disc list-inside opacity-90">
            {!result.validation.plate && <li>Format plat tidak standar</li>}
            {!result.validation.vin && <li>Nomor Rangka (VIN) tidak valid atau tidak terbaca — wajib diisi manual</li>}
            {!result.validation.year && <li>Tahun pembuatan tidak terdeteksi</li>}
            {!result.validation.brand && <li>Merk tidak cocok dengan database</li>}
            {!result.validation.model && <li>Model tidak cocok dengan database</li>}
          </ul>
          {result.notes && <p className="text-[11px] italic opacity-70 pt-1">Catatan AI: {result.notes}</p>}
        </div>
      )}
    </div>
  );
};

export default StnkCaptureCard;
