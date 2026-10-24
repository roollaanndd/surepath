// MarketingAgents.tsx — daftar "Agen Saya" + catat follow-up.
//
// Kolom yang dipilih di sini bukan hiasan. "Belum pernah produksi" dan "hari
// sejak order terakhir" adalah dua angka yang paling menentukan kerja seorang
// marketing, dan paling sering disembunyikan dashboard di balik "total agen".
import React, { useEffect, useMemo, useState } from 'react';
import { Search, PhoneCall, MessageCircle, MapPin, GraduationCap, MoreHorizontal, X } from 'lucide-react';
import {
  fetchMarketingAgents, logMarketingActivity,
  type MarketingAgentRow, type ActivityKind,
} from '../../services/supabaseService';

const STAGE_STYLE: Record<string, string> = {
  DAFTAR: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  DOKUMEN: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  TERVERIFIKASI: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  PRODUKTIF: 'bg-ds-green-tint text-ds-green',
};

const KIND_OPTS: { id: ActivityKind; label: string; Icon: React.ElementType }[] = [
  { id: 'CALL', label: 'Telepon', Icon: PhoneCall },
  { id: 'WA', label: 'WhatsApp', Icon: MessageCircle },
  { id: 'VISIT', label: 'Kunjungan', Icon: MapPin },
  { id: 'TRAINING', label: 'Training', Icon: GraduationCap },
  { id: 'OTHER', label: 'Lainnya', Icon: MoreHorizontal },
];

const MarketingAgents: React.FC = () => {
  const [rows, setRows] = useState<MarketingAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState('');
  const [target, setTarget] = useState<MarketingAgentRow | null>(null);

  const muat = () => {
    setLoading(true);
    fetchMarketingAgents().then(setRows).finally(() => setLoading(false));
  };
  useEffect(muat, []);

  const terfilter = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.email, r.agent_code].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, cari]);

  return (
    <div className="p-4 space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-ink3" />
        <input
          value={cari} onChange={e => setCari(e.target.value)}
          placeholder="Cari nama, email, atau kode agen"
          aria-label="Cari agen"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-ds-line bg-ds-card text-sm text-ds-ink1 placeholder:text-ds-ink3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green"
        />
      </div>

      {loading && <div className="text-sm text-ds-ink3">Memuat agen…</div>}
      {!loading && terfilter.length === 0 && (
        <div className="text-sm text-ds-ink3 py-6 text-center">Belum ada agen yang ditugaskan ke Anda.</div>
      )}

      <ul className="space-y-2">
        {terfilter.map(a => (
          <li key={a.id} className="rounded-2xl border border-ds-line bg-ds-card p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm text-ds-ink1 truncate">{a.name ?? a.email ?? '—'}</div>
                <div className="text-[11px] text-ds-ink3 truncate">{a.agent_code ?? '—'} · {a.email ?? '—'}</div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STAGE_STYLE[a.stage] ?? ''}`}>
                {a.stage}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {!a.pernah_produksi
                ? <span className="font-bold text-amber-600">Belum pernah produksi</span>
                : <span className="text-ds-ink3">Order terakhir: {a.hari_sejak_order_terakhir ?? '—'} hari lalu</span>}
              <span className="text-ds-ink3">
                Kontak terakhir: {a.hari_sejak_aktivitas === null ? 'belum pernah' : `${a.hari_sejak_aktivitas} hari lalu`}
              </span>
              <span className="text-ds-ink3">Umur akun: {a.umur_hari ?? '—'} hari</span>
            </div>

            <button
              type="button" onClick={() => setTarget(a)}
              className="mt-3 text-[11px] font-black uppercase tracking-widest text-ds-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green rounded"
            >
              Catat follow-up
            </button>
          </li>
        ))}
      </ul>

      {target && <FormAktivitas agen={target} onClose={() => setTarget(null)} onSaved={() => { setTarget(null); muat(); }} />}
    </div>
  );
};

const FormAktivitas: React.FC<{ agen: MarketingAgentRow; onClose: () => void; onSaved: () => void }> = ({ agen, onClose, onSaved }) => {
  const [kind, setKind] = useState<ActivityKind>('WA');
  const [outcome, setOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [simpan, setSimpan] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const kirim = async () => {
    setSimpan(true); setErr(null);
    try {
      await logMarketingActivity({
        kind, agentId: agen.id,
        outcome: outcome.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        // datetime-local tidak membawa zona; dijadikan ISO oleh Date agar
        // konsisten dengan kolom timestamptz di server.
        nextActionAt: nextAt ? new Date(nextAt).toISOString() : undefined,
      });
      onSaved();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSimpan(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Catat follow-up"
         className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-ds-card rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-ds-ink1">{agen.name ?? agen.email}</h3>
          <button type="button" onClick={onClose} aria-label="Tutup" className="p-1 text-ds-ink3"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap gap-2">
          {KIND_OPTS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setKind(id)}
              aria-pressed={kind === id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${kind === id ? 'border-ds-green bg-ds-green-tint text-ds-green' : 'border-ds-line text-ds-ink3'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">Hasil</span>
          <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={2}
            className="mt-1 w-full rounded-xl border border-ds-line bg-ds-bg p-2.5 text-sm text-ds-ink1" />
        </label>

        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">Janji berikutnya</span>
          <input value={nextAction} onChange={e => setNextAction(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ds-line bg-ds-bg p-2.5 text-sm text-ds-ink1" />
        </label>

        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3">Kapan</span>
          <input type="datetime-local" value={nextAt} onChange={e => setNextAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ds-line bg-ds-bg p-2.5 text-sm text-ds-ink1" />
        </label>

        {err && <p className="text-[11px] font-bold text-red-600">{err}</p>}

        <button type="button" onClick={kirim} disabled={simpan}
          className="w-full py-3 rounded-xl bg-ds-green text-ds-on-green font-black text-sm disabled:opacity-60">
          {simpan ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </div>
  );
};

export default MarketingAgents;
