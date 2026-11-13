// AgentPromoBanner.tsx — kartu promo bergambar untuk Beranda Mitra.
//
// Menggantikan strip teks `components/PromoBanner.tsx`, yang dirancang untuk
// pita atas situs publik dan tidak pernah menampilkan gambar.
//
// Jalur data: membaca `sp_website_config` pada section_key `promo_banner_agent`
// (bisa disunting admin), lalu `promo_banner` sebagai cadangan. Kartu CMS
// memakai `extra_json.image_url` sebagai latar bila diisi, `cta_text` dan
// `extra_json.cta_url` sebagai tombolnya, dan dapat ditutup (diingat per
// section id di localStorage). Tiga kartu bawaan selalu melengkapinya sehingga
// slot ini tidak pernah kosong dan selalu menautkan ke layar nyata.
//
// Versi 2026-11-01 menyatukan dua rancangan yang sempat berjalan paralel: rel
// geser carousel dengan adegan vektor 16:7 dari `AgentPromoArt` (sebelumnya
// `AgentPromoCarousel`) menggantikan adegan onboarding 300×300 yang terpotong
// di dalam kotak 96px.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { fetchWebsiteSection, type SpWebsiteConfig } from '../../services/supabaseService';
import { Language } from '../../types';
import { PROMO_ART, PromoArtKeyframes, type PromoArtKey } from './AgentPromoArt';

const STORAGE_KEY = (id: number | string) => `sp_banner_agent_dismissed_${id}`;
const AUTOPLAY_MS = 6500;

interface PromoSlide {
  id: string;
  art: PromoArtKey;
  /** Hanya untuk kartu CMS yang punya extra_json.image_url. */
  imageUrl?: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  /** Tab portal tujuan, atau null bila kartu memakai ctaUrl. */
  target: string | null;
  ctaUrl?: string;
}

const builtIn = (en: boolean): PromoSlide[] => [
  {
    id: 'builtin-car',
    art: 'car',
    eyebrow: en ? 'Featured product' : 'Produk unggulan',
    headline: en ? 'Sell car insurance faster' : 'Jual asuransi mobil lebih cepat',
    body: en
      ? 'Official OJK rates, pick the insurer, submit from your phone.'
      : 'Tarif resmi OJK, pilih mitra asuransi, ajukan dari HP.',
    cta: en ? 'Start selling' : 'Mulai jual',
    target: 'quotes',
  },
  {
    id: 'builtin-commission',
    art: 'commission',
    eyebrow: en ? 'Partner commission' : 'Komisi mitra',
    headline: en ? 'Commission lands in your wallet' : 'Komisi masuk dompet Anda',
    body: en
      ? 'Track per-policy commission in real time, then withdraw to your bank.'
      : 'Pantau komisi per polis secara real-time, lalu cairkan ke rekening Anda.',
    cta: en ? 'Open wallet' : 'Buka dompet',
    target: 'wallet',
  },
  {
    id: 'builtin-ai',
    art: 'ai',
    eyebrow: en ? 'AI survey' : 'Survei AI',
    headline: en ? 'Photograph the car, score is automatic' : 'Foto kendaraan, skor otomatis',
    body: en
      ? 'Five photos are enough — AI rates the vehicle before the order goes in.'
      : 'Lima foto cukup — AI menilai kelayakan kendaraan sebelum order diajukan.',
    cta: en ? 'Try it now' : 'Coba sekarang',
    target: 'quotes',
  },
];

interface Props {
  lang: Language;
  onCta?: () => void;
  /** Dipakai Beranda untuk membuka tab portal yang ditunjuk kartu. */
  onNavigate?: (tab: string) => void;
  className?: string;
}

const AgentPromoBanner: React.FC<Props> = ({ lang, onCta, onNavigate, className = '' }) => {
  const en = lang === Language.EN;
  const t = (eng: string, id: string) => (en ? eng : id);

  const [cmsSlide, setCmsSlide] = useState<PromoSlide | null>(null);
  const [cmsKey, setCmsKey] = useState<string | number | null>(null);
  const [cmsDismissed, setCmsDismissed] = useState(false);
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
    const adopt = (data: SpWebsiteConfig | null): boolean => {
      if (cancelled || !data || !data.is_visible || !data.headline) return false;
      const key = data.id ?? data.section_key;
      let alreadyDismissed = false;
      try {
        alreadyDismissed = localStorage.getItem(STORAGE_KEY(key)) === 'true';
      } catch { /* penyimpanan dimatikan — anggap belum ditutup */ }
      setCmsKey(key);
      setCmsDismissed(alreadyDismissed);
      setCmsSlide({
        id: `cms-${key}`,
        art: 'car',
        imageUrl: (data.extra_json?.image_url as string | undefined) || undefined,
        eyebrow: t('Promo', 'Promo'),
        headline: data.headline,
        body: data.subtitle || t('Running for all SurePath partners.', 'Berlaku untuk seluruh mitra SurePath.'),
        cta: data.cta_text || t('See products', 'Lihat produk'),
        target: 'quotes',
        ctaUrl: (data.extra_json?.cta_url as string | undefined) || undefined,
      });
      return true;
    };

    fetchWebsiteSection('promo_banner_agent')
      .then(data => (adopt(data) ? null : fetchWebsiteSection('promo_banner')))
      .then(fallback => { if (fallback) adopt(fallback); })
      .catch(() => { /* promo bersifat opsional — diam saja bila gagal */ });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const slides = useMemo(() => {
    const base = builtIn(en);
    return cmsSlide && !cmsDismissed ? [cmsSlide, ...base] : base;
  }, [cmsSlide, cmsDismissed, en]);

  // Kartu CMS menyisip di depan; jaga indeks tetap berada dalam rentang.
  useEffect(() => { setIndex(i => (i < slides.length ? i : 0)); }, [slides.length]);

  const go = useCallback((next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  const dismissCms = () => {
    setCmsDismissed(true);
    setIndex(0);
    if (cmsKey != null) {
      try { localStorage.setItem(STORAGE_KEY(cmsKey), 'true'); } catch { /* abaikan */ }
    }
  };

  const activate = (slide: PromoSlide) => {
    if (slide.ctaUrl) {
      window.open(slide.ctaUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (slide.target && onNavigate) { onNavigate(slide.target); return; }
    onCta?.();
  };

  return (
    <section
      className={`sp-agent-promo relative ${className}`}
      aria-label={t('Partner promos & tips', 'Promo & info mitra')}
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

      {/* v2.9.0 "Kaca Pagi": kartu promo berbentuk tiket terang — teks di badan
          tiket, gambar di potongan kanan, garis sobek di antaranya. Jalur data,
          autoplay, geser, dan tutup tidak berubah. */}
      <div className="ag-promo">
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
                onClick={() => activate(slide)}
                tabIndex={i === index ? 0 : -1}
                aria-hidden={i === index ? undefined : true}
                aria-label={`${slide.headline}. ${slide.cta}`}
                className="relative w-full shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-inset"
              >
                <div className="relative grid h-[188px] w-full grid-cols-[minmax(0,1fr)_38%]">
                  <div className="relative z-10 flex min-w-0 flex-col justify-center gap-1.5 py-4 pl-5 pr-4">
                    <span className="ag-chip ag-chip--spark w-fit max-w-full truncate">{slide.eyebrow}</span>
                    <p className="text-[1.0625rem] font-bold leading-[1.2] tracking-[-0.025em] line-clamp-2" style={{ color: 'var(--ag-ink)' }}>
                      {slide.headline}
                    </p>
                    <p className="ag-caption line-clamp-2 leading-snug">{slide.body}</p>
                    <span
                      className="ag-btn ag-btn--spark mt-1 w-fit"
                      style={{ minHeight: 32, padding: '0 12px', borderRadius: 11, fontSize: '0.75rem', ['--ag-icon-accent' as string]: '#fff' }}
                    >
                      {slide.cta}
                      <ChevronRight size={13} strokeWidth={2.6} />
                    </span>
                  </div>
                  {/* Potongan tiket: adegan vektor (atau gambar CMS) dalam bingkai
                      membulat, dipisah garis sobek dari badan tiket. */}
                  <div className="relative py-3 pr-3">
                    <span aria-hidden="true" className="absolute -left-px bottom-3 top-3 border-l-[1.5px] border-dashed" style={{ borderColor: 'rgba(234, 88, 12, 0.32)' }} />
                    <div className="relative ml-2.5 h-full overflow-hidden rounded-[18px] bg-[#063A2B]" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 14px 24px -18px rgba(0,56,44,0.8)' }}>
                      {slide.imageUrl ? (
                        <img
                          src={slide.imageUrl}
                          alt=""
                          aria-hidden="true"
                          loading={i === 0 ? 'eager' : 'lazy'}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <Art />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tutup hanya ditawarkan untuk kartu CMS — kartu bawaan adalah navigasi,
            bukan iklan, jadi menutupnya akan mengosongkan slot selamanya. */}
        {cmsSlide && !cmsDismissed && index === 0 && (
          <button
            type="button"
            onClick={dismissCms}
            aria-label={t('Dismiss promo', 'Tutup promo')}
            className="absolute right-5 top-5 z-20 flex h-7 min-h-0 w-7 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/50 active:scale-90 motion-reduce:transition-none"
          >
            <X size={13} />
          </button>
        )}

        {slides.length > 1 && (
          <div className="absolute bottom-[18px] z-20 flex items-center gap-1.5" style={{ right: 'calc(38% + 14px)' }}>
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`${t('Promo', 'Promo')} ${i + 1} ${t('of', 'dari')} ${slides.length}`}
                aria-current={i === index ? 'true' : undefined}
                /* h-6 + min-h-0: portal-modernization.css memberi setiap
                   <button> tinggi minimum 44px lewat :where(), yang akan
                   membengkakkan dot 6px menjadi batang tinggi. */
                className="flex h-6 min-h-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green"
              >
                <span
                  className="block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none"
                  style={{
                    width: i === index ? 20 : 7,
                    background: i === index ? 'var(--ag-orange)' : 'rgba(100,116,139,0.32)',
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AgentPromoBanner;
