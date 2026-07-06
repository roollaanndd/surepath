// ─── ReferralCard — "Ajak Teman" customer referral card ────────────────────
//
// v1 of the customer referral program. Surfaces the customer's existing
// referral code (stored as agent_code in sp_users — generated at signup)
// with copy + WhatsApp-share + native share buttons.
//
// Attribution flow already works:
//   1. Customer shares their link: https://myinsurepath.com?ref=SP-12345
//   2. Friend signs up — App.tsx captures ?ref= → localStorage.SUREPATH_REF
//   3. ensureProfile() in data-gateway links friend's upline_id to customer
//   4. (Next sprint) xendit-webhook credits both sides on friend's first PAID
//
// Reward logic (Rp 25k/Rp 25k double-sided) ships in a follow-up — needs a
// sp_referral_rewards table + webhook changes. The share + attribution
// mechanism is the highest-value part for viral growth, so we ship that first.

import React, { useState } from 'react';
import { Users, Copy, Check, Share2, MessageCircle, Gift } from 'lucide-react';
import { useHaptic } from './useHaptic';

export interface ReferralCardProps {
  /** The customer's referral code (from sp_users.agent_code) */
  referralCode: string | null | undefined;
  /** Customer's first name for the share message */
  customerName?: string;
  /** Base URL for the referral link */
  baseUrl?: string;
  className?: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  referralCode,
  customerName,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://myinsurepath.com',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const haptic = useHaptic();

  if (!referralCode) return null;

  const referralLink = `${baseUrl}?ref=${referralCode}`;
  const shareMessage = customerName
    ? `Halo! ${customerName} mengajak kamu coba SurePath — beli asuransi mobil online, cepat & diawasi OJK.\n\nGunakan kode referral: *${referralCode}*\n\nDaftar di: ${referralLink}\n\nDapat bonus untuk kamu! 🎁`
    : `Halo! Saya mengajak kamu coba SurePath — beli asuransi mobil online, cepat & diawasi OJK.\n\nGunakan kode referral saya: *${referralCode}*\n\nDaftar di: ${referralLink}\n\nDapat bonus untuk kamu! 🎁`;

  const handleCopy = async () => {
    haptic.tap();
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — select-and-copy via a temp input
      const input = document.createElement('input');
      input.value = referralCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    haptic.tap();
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    haptic.tap();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SurePath — Asuransi Mobil Online',
          text: shareMessage,
          url: referralLink,
        });
      } catch {
        // User cancelled — no-op
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #003B2F 0%, #005240 60%, #003B2F 100%)',
        boxShadow: '0 8px 32px -8px rgba(0, 59, 47, 0.4)',
      }}
    >
      {/* Decorative gift icon watermark */}
      <div className="absolute -top-4 -right-4 opacity-[0.08]">
        <Gift size={120} className="text-white" strokeWidth={1} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">Ajak Teman</p>
            <p className="text-[0.55rem] font-medium text-white/60 uppercase tracking-wider">Dapat bonus untuk kamu & teman</p>
          </div>
        </div>

        {/* Referral code display */}
        <div className="bg-white/10 rounded-2xl p-3 mb-3 border border-white/10">
          <p className="text-[0.5rem] font-black text-white/50 uppercase tracking-widest mb-1">Kode Referral Kamu</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-white font-mono tracking-wider">{referralCode}</span>
            <button
              onClick={handleCopy}
              aria-label="Salin kode"
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] text-white font-bold text-xs active:scale-95 transition-transform"
          >
            <MessageCircle size={14} fill="white" />
            WhatsApp
          </button>
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs active:scale-95 transition-colors"
          >
            <Share2 size={14} />
            Bagikan
          </button>
        </div>

        {copied && (
          <p className="text-[0.55rem] font-bold text-emerald-300 text-center mt-2 animate-pop-in">
            Kode disalin! Bagikan ke teman 🎉
          </p>
        )}
      </div>
    </div>
  );
};

export default ReferralCard;
