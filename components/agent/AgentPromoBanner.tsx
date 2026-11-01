// AgentPromoBanner.tsx — illustrated promo card for the agent Beranda.
//
// Replaces the text-only strip <PromoBanner /> on the agent home with a rich
// card that pairs a Pathy / growth illustration with the CMS promo headline,
// subtitle and optional CTA. Agents open Beranda more than any other screen,
// so the banner needs to carry a visual, not just a line of text.
//
// Data path: reads sp_website_config for the `promo_banner_agent` section_key
// (admin-editable). If that key is missing or `is_visible = false`, falls back
// to a built-in "Pathy tips" rotator so the slot is never visually empty.
// Dismissal is remembered per section_id in localStorage. CMS image_url (if
// provided via extra_json) is rendered as the background; otherwise the
// built-in illustration is used.

import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { fetchWebsiteSection, SpWebsiteConfig } from '../../services/supabaseService';
import { Language } from '../../types';
import { ObQuote, ObWallet, ObGrowth, AgentArtKeyframes } from './AgentArt';

const STORAGE_KEY = (id: number | string) => `sp_banner_agent_dismissed_${id}`;

interface Props {
  lang: Language;
  onCta?: () => void;
}

const BUILTIN_SLIDES = [
  {
    id: 'quote-fast',
    Art: ObQuote,
    bg: 'linear-gradient(135deg, #065f46 0%, #047857 55%, #0d9488 100%)',
    id_: ['Buat penawaran dalam hitungan detik', 'Tarif resmi OJK, PDF profesional, langsung ke WhatsApp klien.'] as const,
    en: ['Quotes in seconds', 'Official OJK rates, pro PDF, straight to your client on WhatsApp.'] as const,
  },
  {
    id: 'wallet-fast',
    Art: ObWallet,
    bg: 'linear-gradient(135deg, #0f766e 0%, #0b5739 55%, #166534 100%)',
    id_: ['Komisi transparan, cair cepat', 'Pantau komisi per polis real-time dan tarik ke rekening bank Anda.'] as const,
    en: ['Transparent commission', 'Track per-policy commission in real time and withdraw to your bank.'] as const,
  },
  {
    id: 'tier-grow',
    Art: ObGrowth,
    bg: 'linear-gradient(135deg, #047857 0%, #065f46 55%, #064e3b 100%)',
    id_: ['Naik level ke tier Elite', 'Tutup lebih banyak polis bulan ini, buka benefit tier eksklusif.'] as const,
    en: ['Climb to Elite tier', 'Close more policies this month to unlock exclusive partner benefits.'] as const,
  },
];

const AgentPromoBanner: React.FC<Props> = ({ lang, onCta }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [cmsConfig, setCmsConfig] = useState<SpWebsiteConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [entered, setEntered] = useState(false);

  // Try the dedicated agent-promo section first; silently ignore errors so a
  // network blip never breaks Beranda.
  useEffect(() => {
    let cancelled = false;
    fetchWebsiteSection('promo_banner_agent')
      .then((data) => {
        if (cancelled) return;
        if (data && data.is_visible && data.headline) {
          const key = STORAGE_KEY(data.id ?? data.section_key);
          if (typeof window !== 'undefined' && localStorage.getItem(key) === 'true') {
            setDismissed(true);
          }
          setCmsConfig(data);
        }
      })
      .catch(() => {});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!cancelled) setEntered(true);
    }));
    return () => { cancelled = true; };
  }, []);

  // Rotate the built-in slides every 7s when CMS copy is not configured.
  useEffect(() => {
    if (cmsConfig) return;
    const id = setInterval(() => setSlideIdx((n) => (n + 1) % BUILTIN_SLIDES.length), 7000);
    return () => clearInterval(id);
  }, [cmsConfig]);

  const slide = useMemo(() => BUILTIN_SLIDES[slideIdx], [slideIdx]);

  const handleDismiss = () => {
    setDismissed(true);
    if (cmsConfig) {
      try {
        localStorage.setItem(STORAGE_KEY(cmsConfig.id ?? cmsConfig.section_key), 'true');
      } catch {
        /* storage disabled — in-session dismiss is enough */
      }
    }
  };

  if (dismissed) return null;

  // ─── CMS variant: honor the admin's headline / subtitle / CTA / image ────
  if (cmsConfig) {
    const imgUrl = cmsConfig.extra_json?.image_url as string | undefined;
    const ctaLabel = cmsConfig.cta_text ?? '';
    const ctaUrl = cmsConfig.extra_json?.cta_url as string | undefined;
    return (
      <article
        className="sp-agent-promo relative overflow-hidden rounded-[1.75rem] shadow-[0_14px_32px_-20px_rgba(5,46,22,0.45)] ring-1 ring-emerald-900/10"
        style={{
          background: cmsConfig.bg_value || 'linear-gradient(135deg, #065f46 0%, #047857 55%, #0d9488 100%)',
          transform: entered ? 'translateY(0)' : 'translateY(10px)',
          opacity: entered ? 1 : 0,
          transition: 'transform .4s cubic-bezier(.16,1,.3,1), opacity .4s ease',
        }}
      >
        {imgUrl && (
          <img
            src={imgUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-60 motion-safe:transition-transform motion-safe:duration-[12000ms] motion-safe:hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-transparent" aria-hidden />
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('Dismiss banner', 'Tutup banner')}
          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-all"
        >
          <X size={13} />
        </button>
        <div className="relative z-[1] p-5 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-2.5">
            <Sparkles size={11} /> {t('Promo', 'Promo')}
          </div>
          <h3 className="text-base sm:text-lg font-black leading-snug tracking-tight max-w-[26ch]">
            {cmsConfig.headline}
          </h3>
          {cmsConfig.subtitle && (
            <p className="mt-1.5 text-xs sm:text-sm font-medium opacity-90 leading-relaxed max-w-[36ch]">
              {cmsConfig.subtitle}
            </p>
          )}
          {ctaLabel && (
            <a
              href={ctaUrl || '#'}
              target={ctaUrl ? '_blank' : undefined}
              rel={ctaUrl ? 'noreferrer' : undefined}
              onClick={(e) => {
                if (!ctaUrl && onCta) { e.preventDefault(); onCta(); }
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-black text-emerald-900 shadow hover:brightness-105 active:scale-95 transition-all"
            >
              {ctaLabel} <ArrowRight size={13} />
            </a>
          )}
        </div>
      </article>
    );
  }

  // ─── Built-in rotator: no CMS copy configured ────────────────────────────
  const copy = lang === Language.EN ? slide.en : slide.id_;
  return (
    <article
      className="sp-agent-promo relative overflow-hidden rounded-[1.75rem] shadow-[0_14px_32px_-20px_rgba(5,46,22,0.45)] ring-1 ring-emerald-900/10"
      style={{
        background: slide.bg,
        transform: entered ? 'translateY(0)' : 'translateY(10px)',
        opacity: entered ? 1 : 0,
        transition: 'transform .4s cubic-bezier(.16,1,.3,1), opacity .4s ease, background .6s ease',
      }}
      aria-label={copy[0]}
    >
      <AgentArtKeyframes />
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-200/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,rgba(255,255,255,.14),transparent_55%)]" aria-hidden />

      <div className="relative z-[1] flex items-center gap-3 p-5 text-white">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-2.5">
            <Sparkles size={11} /> {t('Partner tip', 'Tips Mitra')}
          </div>
          <h3 className="text-base sm:text-lg font-black leading-snug tracking-tight">
            {copy[0]}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm font-medium opacity-90 leading-relaxed">
            {copy[1]}
          </p>
          {/* Dots */}
          <div className="mt-3 flex items-center gap-1.5" aria-hidden>
            {BUILTIN_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlideIdx(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === slideIdx ? 20 : 6,
                  background: i === slideIdx ? '#ffffff' : 'rgba(255,255,255,0.35)',
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
        {/* Illustration */}
        <div className="flex-shrink-0 w-[96px] h-[96px] sm:w-[108px] sm:h-[108px] -my-2 flex items-center justify-center pointer-events-none">
          <slide.Art />
        </div>
      </div>
    </article>
  );
};

export default AgentPromoBanner;
