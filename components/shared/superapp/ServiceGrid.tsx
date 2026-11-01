import React from 'react';
import { PathyNavIcon } from '../../shared/PathyNavIcon';
import { useHaptic } from '../../ui';

/**
 * Grid layanan 2×4 — jantung layar super app.
 *
 * Tiap petak: lingkaran berlatar hijau muda, ikon ilustratif di dalamnya,
 * label di bawah. Ikonnya diambil dari satu sistem ikon aplikasi
 * (`PathyNavIcon`): artwork Brand bila ada untuk id itu, selainnya set
 * ilustratif, dan gambar unggahan Icon Manager selalu menang di atas
 * keduanya. Jadi mengganti ikon layanan tetap cukup lewat Icon Manager —
 * tidak ada aset baru yang dipasang mati di berkas ini.
 */
export interface ServiceTile {
  /** Id ikon — dibaca sistem ikon aplikasi dan Icon Manager. */
  id: string;
  label: string;
  onClick: () => void;
  /** Petak yang produknya belum dibuka; tetap terlihat tapi tidak bisa ditekan. */
  disabled?: boolean;
  /** Pita kecil di pojok petak, mis. "Baru". */
  badge?: string;
}

export interface ServiceGridProps {
  tiles: ServiceTile[];
  className?: string;
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({ tiles, className = '' }) => {
  const haptic = useHaptic();

  return (
    <div className={`grid grid-cols-4 gap-x-2 gap-y-5 ${className}`}>
      {tiles.map(tile => (
        <button
          key={tile.id}
          type="button"
          disabled={tile.disabled}
          onClick={() => {
            haptic.tap();
            tile.onClick();
          }}
          className="group flex flex-col items-center gap-2 rounded-2xl py-1 transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
        >
          <span
            aria-hidden="true"
            className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-ds-green-tint transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          >
            <PathyNavIcon id={tile.id} size={38} />
            {tile.badge && (
              <span className="absolute -right-1 -top-0.5 rounded-full bg-ds-green px-1.5 py-px text-2xs font-black leading-tight text-ds-on-green shadow-ds-sm">
                {tile.badge}
              </span>
            )}
          </span>
          <span className="w-full text-center text-2xs font-bold leading-tight text-ds-ink2">
            {tile.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ServiceGrid;
