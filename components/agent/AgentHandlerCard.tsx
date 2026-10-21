// AgentHandlerCard.tsx — "Marketing pendamping Anda" di profil agen.
//
// Read-only dengan sengaja: agen tidak boleh memilih atau mengganti
// pendampingnya sendiri. Kepemilikan agen menentukan komisi override, jadi
// kalau agen bisa memindahkannya sendiri, ia bisa mengalihkan komisi orang
// lain. Penugasan hanya dari CMS oleh admin.
//
// Tidak merender apa pun kalau belum ada pendamping — kartu kosong berisi
// "belum ada" hanya menambah kebisingan di layar profil.
import React, { useEffect, useState } from 'react';
import { Headset, MessageCircle } from 'lucide-react';
import { fetchMyHandler, type AgentHandler } from '../../services/supabaseService';

const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
};

const AgentHandlerCard: React.FC = () => {
  const [h, setH] = useState<AgentHandler | null>(null);

  useEffect(() => {
    let alive = true;
    // Gagal diam-diam dengan sengaja: ini kartu pelengkap, dan tidak boleh
    // memunculkan error di halaman profil kalau gateway sedang bermasalah.
    fetchMyHandler().then(d => { if (alive) setH(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!h) return null;

  return (
    <div className="mx-5 mt-4 rounded-2xl border border-ds-line bg-ds-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Headset size={14} className="text-ds-green" />
        <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">
          Marketing pendamping Anda
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-black"
             style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}>
          {h.profile_photo_url
            ? <img loading="lazy" src={h.profile_photo_url} alt="" className="w-full h-full object-cover" />
            : <span>{(h.name ?? '?').trim().charAt(0).toUpperCase()}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-ds-ink1 truncate">{h.name ?? '—'}</div>
          <div className="text-[11px] text-ds-ink3 truncate">{h.phone ?? 'Nomor belum diisi'}</div>
        </div>
        {h.phone && (
          <a href={waLink(h.phone)} target="_blank" rel="noopener noreferrer"
             aria-label={`Hubungi ${h.name ?? 'pendamping'} via WhatsApp`}
             className="shrink-0 p-2.5 rounded-xl bg-ds-green-tint text-ds-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green">
            <MessageCircle size={16} />
          </a>
        )}
      </div>
    </div>
  );
};

export default AgentHandlerCard;
