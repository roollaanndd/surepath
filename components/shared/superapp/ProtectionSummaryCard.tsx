import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CircularActionGrid, type CircularAction } from '../../ui';

/**
 * Kartu ringkasan proteksi — slot yang di acuan ditempati kartu "Balance".
 *
 * Nasabah SurePath **tidak punya dompet**. Dompet dan saldo di produk ini
 * milik Mitra, untuk komisi, dan saldonya hanya boleh berubah lewat fungsi
 * SQL SECURITY DEFINER di sisi server. Menaruh angka "saldo" di layar Nasabah
 * berarti memasang fitur yang tidak ada di belakangnya, jadi slot ini
 * mempertahankan posisi, bentuk, dan kedalaman kartu acuan tetapi mengangkat
 * angka yang memang dimiliki nasabah: total premi yang sudah dibayarkan dan
 * jumlah polis aktif.
 *
 * Empat aksi cepat di bawah garis memakai `CircularActionGrid` yang sudah ada
 * (primitif Livin'-style di components/ui) — bukan markup baru.
 */
export interface ProtectionSummaryCardProps {
  /** Label baris nilai, mis. "Total Premi". */
  label: string;
  /** Nilai utama, sudah diformat (mis. "Rp 2,4 jt"). */
  value: string;
  /** Satuan kecil di kiri angka, mis. "IDR". */
  unit?: string;
  /** Keterangan di bawah nilai, mis. "3 polis aktif". */
  caption: string;
  /** Nama aksesibilitas untuk seluruh baris nilai yang bisa ditekan. */
  openLabel: string;
  onOpen: () => void;
  actions: CircularAction[];
}

export const ProtectionSummaryCard: React.FC<ProtectionSummaryCardProps> = ({
  label,
  value,
  unit,
  caption,
  openLabel,
  onOpen,
  actions,
}) => (
  // -mt-14 membuat kartu menindih tepi bawah pita sapaan, persis seperti di
  // acuan. Angkanya sepasang dengan pb-20 pita itu.
  <section className="relative z-10 -mt-14 mx-5 rounded-[1.75rem] bg-ds-card p-5 shadow-ds-lg ring-1 ring-ds-border">
    <button
      type="button"
      onClick={onOpen}
      aria-label={openLabel}
      className="flex w-full items-center justify-between gap-3 rounded-2xl text-left transition-transform active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-4 focus-visible:ring-offset-ds-card"
    >
      <div className="min-w-0">
        <p className="text-base font-black tracking-tight text-ds-ink">{label}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-ds-ink3">{caption}</p>
      </div>
      <div className="flex shrink-0 items-baseline gap-1.5">
        {unit && <span className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">{unit}</span>}
        <span className="text-xl font-black tracking-tight text-ds-ink">{value}</span>
        <ChevronRight size={18} className="translate-y-0.5 text-ds-ink3" aria-hidden="true" />
      </div>
    </button>

    <div className="my-4 h-px bg-ds-border" aria-hidden="true" />

    <CircularActionGrid actions={actions} />
  </section>
);

export default ProtectionSummaryCard;
