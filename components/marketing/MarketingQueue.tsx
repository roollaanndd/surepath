// MarketingQueue.tsx — antrean tindakan, diurutkan berdasarkan UMUR.
//
// Pola ini diambil dari OpsConsoleView di CMS: yang dipakai orang bukan daftar
// "terbaru di atas", tapi "paling lama terabaikan di atas". Daftar yang
// diurutkan tanggal buat membuat yang mandek tenggelam.
import React, { useEffect, useState } from 'react';
import { Clock, UserPlus } from 'lucide-react';
import {
  fetchMarketingActivities, fetchUnassignedAgents,
  type MarketingActivity, type MarketingAgentRow,
} from '../../services/supabaseService';

const umurHari = (iso: string | null) =>
  iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : null;

const MarketingQueue: React.FC = () => {
  const [telat, setTelat] = useState<MarketingActivity[]>([]);
  const [tanpaHandler, setTanpaHandler] = useState<MarketingAgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchMarketingActivities({ hanyaTelat: true }),
      fetchUnassignedAgents(),
    ])
      .then(([a, u]) => { if (alive) { setTelat(a); setTanpaHandler(u); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="p-4 text-sm text-ds-ink3">Memuat antrean…</div>;

  const telatUrut = [...telat].sort(
    (a, b) => Date.parse(a.next_action_at ?? '') - Date.parse(b.next_action_at ?? ''));
  const tanpaUrut = [...tanpaHandler].sort(
    (a, b) => (b.umur_hari ?? 0) - (a.umur_hari ?? 0));

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-ds-ink3 mb-2 flex items-center gap-2">
          <Clock size={14} /> Janji lewat tanggal ({telatUrut.length})
        </h2>
        {telatUrut.length === 0 ? (
          <p className="text-sm text-ds-ink3">Tidak ada janji yang terlewat. </p>
        ) : (
          <ul className="space-y-2">
            {telatUrut.map(a => {
              const lewat = umurHari(a.next_action_at);
              return (
                <li key={a.id} className="rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ds-ink1 truncate">
                        {a.next_action ?? '(tanpa catatan janji)'}
                      </div>
                      <div className="text-[11px] text-ds-ink3 mt-0.5">
                        {a.prospect_name ?? 'Agen terdaftar'} · {a.kind}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-black text-amber-700 dark:text-amber-400">
                      {lewat !== null && lewat > 0 ? `${lewat} hari lewat` : 'hari ini'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-ds-ink3 mb-2 flex items-center gap-2">
          <UserPlus size={14} /> Agen tanpa handler ({tanpaUrut.length})
        </h2>
        {tanpaUrut.length === 0 ? (
          <p className="text-sm text-ds-ink3">Semua agen sudah punya penanggung jawab.</p>
        ) : (
          <>
            <p className="text-[11px] text-ds-ink3 mb-2">
              Penugasan dilakukan dari CMS oleh admin — seorang marketing tidak bisa
              menugaskan agen ke dirinya sendiri.
            </p>
            <ul className="space-y-2">
              {tanpaUrut.map(a => (
                <li key={a.id} className="rounded-2xl border border-ds-line bg-ds-card p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ds-ink1 truncate">{a.name ?? a.email ?? '—'}</div>
                    <div className="text-[11px] text-ds-ink3 truncate">{a.email ?? '—'}</div>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-ds-ink3">{a.umur_hari ?? '—'} hari</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default MarketingQueue;
