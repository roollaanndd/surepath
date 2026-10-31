import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { fetchWebsiteSection, type SpWebsiteConfig } from '../../services/supabaseService';
import { PROMO_ART, PromoArtKeyframes, type PromoArtKey } from './AgentPromoArt';

/* ─── Beranda Mitra — banner promo bergambar ─────────────────────────────────
 * Menggantikan strip teks `PromoBanner` (CMS) yang sebelumnya dipasang di
 * beranda Mitra: strip itu dirancang untuk pita atas situs publik, bukan untuk
 * kartu di dalam aplikasi, dan tidak pernah menampilkan gambar.
 *
 * Isi carousel:
 *   1. Promo dari CMS (`sp_website_config.promo_banner`) — hanya bila
 *      `is_visible` dan ada `headline`. Memakai `image_url` bila diisi admin,
 *      kalau tidak memakai ilustrasi bawaan.
 *   2. Tiga kartu bawaan khusus Mitra yang menautkan ke layar nyata.
 *
 * Tiap kartu dapat diklik (menavigasi ke tab portal), berputar otomatis,
 * bisa digeser, dan berhenti berputar saat disentuh/di-hover atau ketika
 * pengguna meminta `prefers-reduced-motion`. */

interface PromoSlide {
  id: string;
  art: PromoArtKey;
  /** Hanya untuk slide CMS yang punya image_url. */
  imageUrl?: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  target: string | null;
}

const BUILT_IN: PromoSlide[] = [
  {
    id: 'builtin-car',
    art: 'car',
    eyebrow: 'Produk unggulan',
    headline: 'Jual asuransi mobil lebih cepat',
    body: 'Tarif resmi OJK, pilih mitra asuransi, ajukan dari HP.',
    cta: 'Mulai jual',
    target: 'quotes',
  },
  {
    id: 'builtin-commission',
    art: 'commission',
    eyebrow: 'Komisi mitra',
    headline: 'Komisi masuk dompet Anda',
    body: 'Pantau komisi per polis secara real-time, lalu cairkan ke rekening Anda.',
    cta: 'Buka dompet',
    target: 'wallet',
  },
  {
    id: 'builtin-ai',
    art: 'ai',
    eyebrow: 'Survei AI',
    headline: 'Foto kendaraan, skor otomatis',
    body: 'Lima foto cukup — AI menilai kelayakan kendaraan sebelum order diajukan.',
    cta: 'Coba sekarang',
    target: 'quotes',
  },
];

const AUTOPLAY_MS = 6500;

interface Props {
  onNavigate?: (tab: string) => void;
  className?: string;
}

const AgentPromoCarousel: React.FC<Props> = ({ onNavigate, className = '' }) => {
  const [cmsSlide, setCmsSlide] = useState<PromoSlide | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchWebsiteSection('promo_banner')
      .then((data: SpWebsiteConfig | null) => {
        if (cancelled || !data || !data.is_visible || !data.headline) return;
        setCmsSlide({
          id: `cms-${data.id ?? data.section_key}`,
          art: 'car',
          imageUrl: (data.extra_json?.image_url as string | undefined) || undefined,
          eyebrow: 'Promo SurePath',
          headline: data.headline,
          body: data.subtitle || 'Promo berjalan untuk seluruh mitra SurePath.',
          cta: 'Lihat produk',
          target: 'quotes',
        });
      })
      .catch(() => { /* promo bersifat opsional — diam saja bila gagal */ });
    return () => { cancelled = true; };
  }, []);

  const slides = useMemo(() => (cmsSlide ? [cmsSlide, ...BUILT_IN] : BUILT_IN), [cmsSlide]);

  // Slide CMS menyisip di depan; jaga indeks tetap berada dalam rentang.
  useEffect(() => { setIndex(i => (i < slides.length ? i : 0)); }, [slides.length]);

  const go = useCallback((next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  const handleActivate = (slide: PromoSlide) => {
    if (slide.target && onNavigate) onNavigate(slide.target);
  };

  return (
    <section
      className={`relative ${className}`}
      aria-label="Promo & info mitra"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => { setPaused(true); touchStartX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        setPaused(false);
        if (start == null) return;
        const delta = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
      }}
    >
      <PromoArtKeyframes />

      <div className="relative overflow-hidden rounded-[1.75rem] shadow-[0_18px_40px_-26px_rgba(4,53,36,0.55)]">
        {/* Rel geser: satu transform, transisi halus, diam saat reduced-motion. */}
        <div
          className="flex motion-reduce:transition-none"
          style={{
            transform: `translate3d(-${index * 100}%, 0, 0)`,
            transition: reduceMotion ? 'none' : 'transform .55s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {slides.map((slide, i) => {
            const Art = PROMO_ART[slide.art];
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleActivate(slide)}
                tabIndex={i === index ? 0 : -1}
                aria-hidden={i === index ? undefined : true}
                aria-label={`${slide.headline}. ${slide.cta}`}
                className="relative w-full shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-inset"
              >
                <div className="relative h-[150px] w-full overflow-hidden bg-[#063A2B]">
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt=""
                      aria-hidden="true"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Art />
                  )}
                  {/* Lapis gelap agar teks tetap terbaca di atas gambar apa pun. */}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(100deg, rgba(4,32,24,.92) 0%, rgba(4,32,24,.72) 42%, rgba(4,32,24,.05) 78%)' }}
                    aria-hidden="true"
                  />
                  <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-center gap-1.5 px-5">
                    <span className="text-2xs font-black uppercase tracking-[.16em] text-white/70">
                      {slide.eyebrow}
                    </span>
                    <p className="text-[15px] font-black leading-tight text-white">{slide.headline}</p>
                    <p className="text-2xs font-medium leading-snug text-white/75 line-clamp-2">{slide.body}</p>
                    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1.5 text-2xs font-black text-[#0B4935]">
                      {slide.cta}
                      <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Promo ${i + 1} dari ${slides.length}`}
                aria-current={i === index ? 'true' : undefined}
                className="h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  width: i === index ? 20 : 7,
                  background: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AgentPromoCarousel;
