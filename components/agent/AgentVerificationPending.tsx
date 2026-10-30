// ─────────────────────────────────────────────────────────────────────────────
// Keadaan "menunggu verifikasi" untuk portal Mitra.
//
// MASALAH YANG DIPECAHKAN (dilaporkan 30 Okt 2026)
//
// Mitra baru mendaftar, membaca perjanjian keagenan, menekan setuju — lalu
// ditolak dengan "Akun agen Anda belum diverifikasi". Gerbang perjanjian itu
// layar penuh, jadi tidak ada jalan ke mana pun: pendaftaran berhenti total.
//
// Akarnya di `_shared/trust.ts` (sudah diperbaiki): tanda tangan perjanjian
// menuntut tier terverifikasi, padahal tanda tangan itulah prasyarat
// verifikasinya. Setelah itu dibuka, mitra baru masuk aplikasi dengan
// `verified = false` — dan di situlah dua komponen di bawah bekerja.
//
// Keputusan pemilik (docs/REGISTRATION_VERIFICATION_PLAN.md §8 nomor 4):
// "dashboard terbatas (profil/materi), transaksi terkunci" — bukan terkunci
// penuh. Yang dikunci hanya dua permukaan yang aksi intinya memang DITOLAK
// server pada tier ini, supaya UI tidak pernah menjanjikan yang server tolak:
//
//   Buat   → create_policy_order (menerbitkan polis sungguhan)
//   Dompet → agent_request_withdrawal (uang keluar)
//
// Beranda, Polis, Profil, notifikasi dan Pathy tetap terbuka: mitra bisa
// mengenal produk dan melengkapi profilnya selagi operator meninjau.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Clock, Lock, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';

const tx = (lang: Language, en: string, id: string) => (lang === Language.EN ? en : id);

/**
 * Pita status di atas isi tab. Memakai pola notis portal Mitra yang sudah ada
 * (lihat blok `dataLoadError` di AgentPortal): kartu amber dengan token `ds-*`
 * sehingga ia ikut berganti tema tanpa varian `dark:` sendiri.
 */
export const AgentVerificationBanner: React.FC<{ lang: Language; onOpenProfile?: () => void }> = ({
  lang, onOpenProfile,
}) => (
  <div role="status" aria-live="polite"
    className="mx-5 mb-4 rounded-2xl border border-ds-amber/30 bg-ds-amber/10 p-4">
    <div className="flex items-start gap-3">
      <span aria-hidden="true"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ds-amber/15 text-ds-amber">
        <Clock size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ds-ink">
          {tx(lang, 'Your partner account is awaiting verification.', 'Akun mitra kamu sedang menunggu verifikasi.')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ds-ink2">
          {tx(lang,
            'You can already explore the app, complete your profile and track policies. Issuing orders and withdrawing funds open once an operator approves your account.',
            'Kamu sudah bisa menjelajahi aplikasi, melengkapi profil, dan memantau polis. Penerbitan order dan penarikan dana terbuka setelah operator menyetujui akun kamu.')}
        </p>
        {onOpenProfile && (
          <button type="button" onClick={onOpenProfile}
            className="mt-3 min-h-10 rounded-xl bg-ds-green px-4 py-2 text-xs font-black text-ds-on-green">
            {tx(lang, 'Complete my profile', 'Lengkapi profil saya')}
          </button>
        )}
      </div>
    </div>
  </div>
);

/**
 * Pengganti isi tab yang dikunci. Menjelaskan sebabnya, apa yang terbuka, dan
 * memberi satu langkah berikutnya — bukan layar kosong atau galat.
 */
export const AgentLockedFeature: React.FC<{
  lang: Language;
  /** Nama fitur seperti yang tertulis di bar navigasi, mis. "Dompet". */
  feature: string;
  onOpenProfile?: () => void;
}> = ({ lang, feature, onOpenProfile }) => (
  <div className="px-5 pt-6 pb-10">
    <div className="mx-auto max-w-md rounded-2xl border border-ds-border bg-ds-card p-6 text-center">
      <span aria-hidden="true"
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ds-amber/15 text-ds-amber">
        <Lock size={26} />
      </span>
      <h2 className="text-base font-black text-ds-ink">
        {tx(lang, `${feature} opens after verification`, `${feature} terbuka setelah verifikasi`)}
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-ds-ink2">
        {tx(lang,
          'An operator still has to approve your partner account. Until then, issuing orders and moving money stay closed — for your protection as much as ours.',
          'Operator masih perlu menyetujui akun mitra kamu. Sampai itu selesai, penerbitan order dan perpindahan dana tetap tertutup — demi keamanan kamu sekaligus kami.')}
      </p>

      <div className="mt-5 rounded-xl bg-ds-green-tint p-4 text-left">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-ds-green">
          <ShieldCheck size={13} aria-hidden="true" />
          {tx(lang, 'Already available to you', 'Sudah bisa kamu pakai')}
        </p>
        <ul className="mt-2 space-y-1 text-xs font-bold text-ds-ink2">
          <li>{tx(lang, 'Dashboard and policy tracking', 'Beranda dan pemantauan polis')}</li>
          <li>{tx(lang, 'Premium simulation and draft quotes', 'Simulasi premi dan penawaran draf')}</li>
          <li>{tx(lang, 'Your profile, training material and Pathy', 'Profil, materi, dan Pathy')}</li>
        </ul>
      </div>

      {onOpenProfile && (
        <button type="button" onClick={onOpenProfile}
          className="mt-5 min-h-11 w-full rounded-xl bg-ds-green px-4 py-2.5 text-xs font-black text-ds-on-green">
          {tx(lang, 'Check verification status', 'Cek status verifikasi')}
        </button>
      )}
    </div>
  </div>
);
