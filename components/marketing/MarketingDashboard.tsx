// MarketingDashboard.tsx — ringkasan pipeline + antrean untuk /marketingapp.
//
// Setiap kartu menampilkan PEMBILANG dan PENYEBUT, bukan hanya persen, supaya
// angkanya bisa diaudit sekilas. Tiap tahap juga menampilkan jumlah yang
// MANDEK >14 hari: "7 di tahap DOKUMEN" tidak bisa ditindaklanjuti,
// "3 dari 7 mandek" bisa.
import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { fetchMarketingSummary, type MarketingSummary, type PipelineStage } from '../../services/supabaseService';
import ModuleIcon from '../shared/ModuleIcon';

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'DAFTAR', label: 'Daftar' },
  { id: 'DOKUMEN', label: 'Dokumen' },
  { id: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { id: 'PRODUKTIF', label: 'Produktif' },
];

const Kartu: React.FC<{ label: string; nilai: React.ReactNode; sub?: string; iconId: string; nada?: 'netral' | 'waspada' }> =
({ label, nilai, sub, iconId, nada = 'netral' }) => (
  <div className={`rounded-2xl p-4 border ${nada === 'waspada' ? 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/20' : 'border-ds-line bg-ds-card'}`}>
    <div className="flex items-center gap-2 mb-2">
      <ModuleIcon id={iconId} size={28} />
      <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">{label}</span>
    </div>
    <div className="text-2xl font-black text-ds-ink1 leading-none">{nilai}</div>
    {sub && <div className="text-[11px] text-ds-ink3 mt-1.5">{sub}</div>}
  </div>
);

const MarketingDashboard: React.FC = () => {
  const [s, setS] = useState<MarketingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMarketingSummary()
      .then(d => { if (alive) { setS(d); setErr(d ? null : 'Ringkasan tidak tersedia.'); } })
      .catch(e => { if (alive) setErr(String(e?.message ?? e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="p-4 text-sm text-ds-ink3">Memuat ringkasan…</div>;
  if (err || !s) return <div className="p-4 text-sm text-ds-ink3">{err ?? 'Tidak ada data.'}</div>;

  const produktif = s.pipeline.PRODUKTIF?.jumlah ?? 0;

  return (
    <div className="p-4 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Kartu label="Agen saya" nilai={s.total_agen} iconId="agents"
               sub={`${produktif} dari ${s.total_agen} pernah berproduksi`} />
        <Kartu label="Belum produksi" nilai={s.belum_pernah_produksi} iconId="approvals"
               nada={s.belum_pernah_produksi > 0 ? 'waspada' : 'netral'}
               sub="direkrut, belum pernah menjual" />
        <Kartu label="Follow-up telat" nilai={s.follow_up_telat} iconId="notifications"
               nada={s.follow_up_telat > 0 ? 'waspada' : 'netral'}
               sub="janji yang sudah lewat tanggal" />
        <Kartu label="Tanpa handler" nilai={s.agen_tanpa_handler} iconId="security"
               nada={s.agen_tanpa_handler > 0 ? 'waspada' : 'netral'}
               sub="agen belum ditugaskan" />
      </div>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-ds-ink3 mb-2 flex items-center gap-2">
          <TrendingUp size={14} /> Pipeline rekrutmen
        </h2>
        <div className="rounded-2xl border border-ds-line bg-ds-card divide-y divide-ds-line">
          {STAGES.map(({ id, label }) => {
            const row = s.pipeline[id] ?? { jumlah: 0, mandek_14h: 0 };
            return (
              <div key={id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-ds-ink1">{label}</div>
                  {row.mandek_14h > 0 && (
                    <div className="text-[11px] font-bold text-amber-600 mt-0.5">
                      {row.mandek_14h} mandek &gt;14 hari
                    </div>
                  )}
                </div>
                <div className="text-xl font-black text-ds-ink1">{row.jumlah}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dinyatakan terbuka, bukan diisi angka palsu. */}
      <p className="text-[11px] leading-relaxed text-ds-ink3 border border-dashed border-ds-line rounded-xl p-3">
        {s.catatan_produksi}
      </p>
    </div>
  );
};

export default MarketingDashboard;
