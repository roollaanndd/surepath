// ─── FloatingWhatsApp ────────────────────────────────────────────────────────
//
// Floating WhatsApp button shown on all marketing pages (SiteLayout).
// Indonesian users expect to ask pre-purchase questions via WhatsApp — its
// absence is the #1 friction point for Indonesian fintech conversion.
//
// Click-to-chat to the SurePath business number with a pre-filled message.
// Hidden inside app portals (customer/agent/admin) — only shown on the
// public marketing site.

import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useHaptic } from './useHaptic';
import { trackEvent } from '../../src/analytics';
import { SUREPATH_WHATSAPP } from '../../constants';

export interface FloatingWhatsAppProps {
  /** Phone number in international format, no + (e.g. "6281234567890") */
  phoneNumber?: string;
  /** Pre-filled message text */
  defaultMessage?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = SUREPATH_WHATSAPP,
  defaultMessage = 'Halo SurePath, saya mau tanya tentang asuransi mobil.',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const haptic = useHaptic();

  // Show the tooltip after 5 seconds (one-time, dismissible)
  useEffect(() => {
    if (dismissed) return;
    if (localStorage.getItem('sp_wa_tooltip_dismissed') === '1') return;
    const t = setTimeout(() => setShowTooltip(true), 5000);
    return () => clearTimeout(t);
  }, [dismissed]);

  const handleClick = () => {
    haptic.tap();
    trackEvent('whatsapp_click', { source_path: typeof window !== 'undefined' ? window.location.pathname : null });
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.tap();
    setDismissed(true);
    setShowTooltip(false);
    localStorage.setItem('sp_wa_tooltip_dismissed', '1');
  };

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 flex flex-col items-end gap-2">
      {/* Tooltip — shown once after 5s */}
      {showTooltip && (
        <div className="relative bg-ds-card border border-ds-border rounded-2xl shadow-ds-md p-3 max-w-[220px] animate-pop-in">
          <button
            onClick={dismiss}
            aria-label="Tutup"
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink2"
          >
            <X size={10} />
          </button>
          <p className="text-xs font-bold text-ds-ink">Punya pertanyaan?</p>
          <p className="text-2xs text-ds-ink2 mt-0.5 leading-snug">
            Chat tim SurePath di WhatsApp — respons cepat.
          </p>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleClick}
        aria-label="Chat WhatsApp"
        className="w-14 h-14 rounded-full bg-ds-whatsapp text-white shadow-ds-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ boxShadow: '0 8px 32px rgba(37, 211, 102, 0.4)' }}
      >
        <MessageCircle size={26} fill="white" />
      </button>
    </div>
  );
};

export default FloatingWhatsApp;
