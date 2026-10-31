import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PathyNavIcon } from '../PathyNavIcon';

/**
 * Baris konten yang digulung mendatar — padanan bagian "Best Restaurants
 * Nearby" di acuan super app.
 *
 * Di SurePath baris ini membawa produk yang bisa dijual mitra, bukan daftar
 * tempat. Tiap kartu menampilkan ikon ilustratif produk, judul, satu baris
 * keterangan, dan ajakan. Kartunya memakai scroll-snap supaya berhenti rapi
 * di tepi kiri, dan seluruh baris adalah daftar agar pembaca layar
 * menghitungnya.
 */
export interface RailItem {
  /** Id ikon — dibaca sistem ikon aplikasi dan Icon Manager. */
  id: string;
  title: string;
  subtitle: string;
  /** Pita kecil di atas judul, mis. "Komisi 20%". */
  eyebrow?: string;
  onClick: () => void;
}

export interface ContentRailProps {
  title: string;
  /** Tautan "Semua" di kanan judul. */
  action?: { label: string; onClick: () => void };
  items: RailItem[];
}

export const ContentRail: React.FC<ContentRailProps> = ({ title, action, items }) => {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between px-5">
        <h3 className="text-sm font-black tracking-tight text-ds-ink">{title}</h3>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded text-xs font-bold text-ds-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green"
          >
            {action.label}
          </button>
        )}
      </div>

      <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
        {items.map(item => (
          <li key={item.id} className="snap-start">
            <button
              type="button"
              onClick={item.onClick}
              className="flex h-full w-[13.5rem] flex-col items-start gap-2 rounded-[1.4rem] bg-ds-card p-4 text-left ring-1 ring-ds-border transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ds-green-tint"
              >
                <PathyNavIcon id={item.id} size={32} />
              </span>
              {item.eyebrow && (
                <span className="rounded-full bg-ds-green-tint px-2 py-0.5 text-2xs font-black uppercase tracking-wider text-ds-green">
                  {item.eyebrow}
                </span>
              )}
              <span className="text-sm font-black leading-tight tracking-tight text-ds-ink">{item.title}</span>
              <span className="line-clamp-2 text-xs leading-relaxed text-ds-ink2">{item.subtitle}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-bold text-ds-green">
                {/* Teks ajakan sengaja tidak ada: judul kartu sudah menamai
                    tujuannya, dan panah ini hanya penegas arah. */}
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ContentRail;
