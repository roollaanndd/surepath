// Jejak aktivitas pengguna — tampilan CMS.
//
// Dua pertanyaan yang berbeda, jadi dua mode:
//   • Ringkasan  — "siapa yang aktif, seberapa sering, dan berapa yang ditolak"
//   • Rinci      — "apa persisnya yang dilakukan pengguna ini, kapan"
//
// Mulai dari ringkasan karena itu yang dibuka admin duluan; klik satu baris
// untuk turun ke rinciannya. Membuka langsung ke daftar mentah ribuan baris
// hanya memindahkan pekerjaan menyaring ke mata admin.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { callGateway } from '../../services/db';

interface LogRow {
  id: number;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_id: string | null;
  status: 'OK' | 'DENIED' | 'ERROR';
  http_status: number | null;
  duration_ms: number | null;
  param_keys: string[] | null;
  ip: string | null;
  user_agent: string | null;
}

interface SummaryRow {
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  total: number;
  denied: number;
  last_seen: string;
  top_action: string;
}

const RANGES = [
  { id: '24h', label: '24 Jam', hours: 24 },
  { id: '7d', label: '7 Hari', hours: 24 * 7 },
  { id: '30d', label: '30 Hari', hours: 24 * 30 },
];

const STATUS_STYLE: Record<LogRow['status'], string> = {
  OK: 'bg-ds-green-tint text-ds-green',
  DENIED: 'bg-ds-amber-lt text-ds-amber',
  ERROR: 'bg-ds-red-lt text-ds-red',
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

/** Turns `admin_list_users` into `Admin List Users` — the action name is the
 *  vocabulary the code already uses, so it stays recognisable rather than
 *  being mapped through a second, drift-prone label table. */
const humanAction = (a: string) =>
  a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ActivityLogView: React.FC = () => {
  const [range, setRange] = useState('7d');
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [focus, setFocus] = useState<SummaryRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const since = useMemo(() => {
    const h = RANGES.find(r => r.id === range)?.hours ?? 168;
    return new Date(Date.now() - h * 3600_000).toISOString();
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (focus) {
        const { data, error: e } = await callGateway('admin_activity_log', {
          since,
          limit: 500,
          ...(focus.actor_id ? { actor_id: focus.actor_id } : { actor_email: focus.actor_email }),
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        if (e) throw new Error(String(e));
        setRows((data as LogRow[]) ?? []);
      } else {
        const { data, error: e } = await callGateway('admin_activity_summary', { since });
        if (e) throw new Error(String(e));
        setSummary((data as SummaryRow[]) ?? []);
      }
    } catch (err) {
      // Saying nothing here would repeat the exact failure mode this log
      // exists to expose.
      setError(err instanceof Error ? err.message : 'Gagal memuat jejak aktivitas.');
    } finally {
      setLoading(false);
    }
  }, [since, focus, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const visibleSummary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter(s =>
      (s.actor_email ?? '').toLowerCase().includes(q) ||
      (s.actor_role ?? '').toLowerCase().includes(q) ||
      s.top_action.toLowerCase().includes(q));
  }, [summary, query]);

  const totals = useMemo(() => ({
    aksi: summary.reduce((n, s) => n + s.total, 0),
    ditolak: summary.reduce((n, s) => n + s.denied, 0),
    pengguna: summary.length,
  }), [summary]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-ds-card2 rounded-2xl p-1 border border-ds-border">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => { setRange(r.id); }}
              className={`px-4 py-2 rounded-xl text-2xs font-black uppercase tracking-widest transition-all ${
                range === r.id ? 'bg-ds-card text-ds-green shadow-ds-sm' : 'text-ds-ink3'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {!focus && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ds-ink3" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari email, peran, atau aksi…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-ds-card2 border border-ds-border text-ds-ink text-xs outline-none focus:border-ds-green"
            />
          </div>
        )}

        {focus && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-ds-card2 border border-ds-border text-ds-ink text-xs outline-none"
          >
            <option value="">Semua status</option>
            <option value="OK">Berhasil</option>
            <option value="DENIED">Ditolak</option>
            <option value="ERROR">Error</option>
          </select>
        )}

        <button
          onClick={() => void load()}
          className="p-2.5 rounded-2xl bg-ds-card2 border border-ds-border text-ds-ink3 hover:text-ds-green transition-colors"
          title="Muat ulang"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-ds-red-lt border border-ds-red/30 flex items-start gap-3">
          <AlertTriangle size={16} className="text-ds-red shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-ds-red mb-1">Gagal memuat</p>
            <p className="text-[0.7rem] text-ds-red/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Summary mode */}
      {!focus && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pengguna Aktif', value: totals.pengguna, tone: 'text-ds-ink' },
              { label: 'Total Aksi', value: totals.aksi, tone: 'text-ds-green' },
              { label: 'Ditolak', value: totals.ditolak, tone: totals.ditolak > 0 ? 'text-ds-amber' : 'text-ds-ink3' },
            ].map(s => (
              <div key={s.label} className="p-5 rounded-[2rem] bg-ds-card border border-ds-border shadow-ds-sm">
                <p className="text-2xs font-black uppercase tracking-[0.25em] text-ds-ink3 mb-2">{s.label}</p>
                <p className={`text-2xl font-black ${s.tone}`}>{s.value.toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] bg-ds-card border border-ds-border shadow-ds-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ds-border">
                    {['Pengguna', 'Peran', 'Aksi', 'Ditolak', 'Paling Sering', 'Terakhir'].map(h => (
                      <th key={h} className="px-5 py-3 text-2xs font-black uppercase tracking-[0.2em] text-ds-ink3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSummary.map(s => (
                    <tr
                      key={s.actor_email ?? s.actor_id ?? Math.random()}
                      onClick={() => { setStatusFilter(''); setFocus(s); }}
                      className="border-b border-ds-border last:border-0 hover:bg-ds-card2 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs font-bold text-ds-ink whitespace-nowrap">{s.actor_email ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[0.7rem] text-ds-ink3 whitespace-nowrap">{s.actor_role ?? '—'}</td>
                      <td className="px-5 py-3.5 text-xs font-black text-ds-green">{s.total}</td>
                      <td className="px-5 py-3.5">
                        {s.denied > 0
                          ? <span className="px-2 py-1 rounded-lg bg-ds-amber-lt text-ds-amber text-2xs font-black">{s.denied}</span>
                          : <span className="text-[0.7rem] text-ds-ink3">0</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[0.7rem] text-ds-ink2 whitespace-nowrap">{humanAction(s.top_action)}</td>
                      <td className="px-5 py-3.5 text-2xs text-ds-ink3 whitespace-nowrap">{fmtTime(s.last_seen)}</td>
                    </tr>
                  ))}
                  {!loading && visibleSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Activity size={24} className="mx-auto text-ds-ink3 mb-3" />
                        <p className="text-xs font-bold text-ds-ink2 mb-1">Belum ada aktivitas tercatat</p>
                        <p className="text-2xs text-ds-ink3 max-w-sm mx-auto leading-relaxed">
                          Jejak ditulis oleh data-gateway. Kalau kosong padahal aplikasi dipakai,
                          kemungkinan besar gateway versi terbaru belum ter-deploy.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail mode */}
      {focus && (
        <>
          <div className="flex items-center justify-between p-5 rounded-[2rem] bg-ds-card border border-ds-border shadow-ds-sm">
            <div>
              <p className="text-2xs font-black uppercase tracking-[0.25em] text-ds-ink3 mb-1">Jejak Pengguna</p>
              <p className="text-sm font-black text-ds-ink">{focus.actor_email ?? focus.actor_id}</p>
              <p className="text-2xs text-ds-ink3 mt-0.5">{focus.actor_role ?? '—'} · {focus.total} aksi</p>
            </div>
            <button
              onClick={() => { setFocus(null); setRows([]); }}
              className="p-2.5 rounded-2xl bg-ds-card2 border border-ds-border text-ds-ink3 hover:text-ds-ink transition-colors"
              title="Kembali ke ringkasan"
            >
              <X size={16} />
            </button>
          </div>

          <div className="rounded-[2rem] bg-ds-card border border-ds-border shadow-ds-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ds-border">
                    {['Waktu', 'Aksi', 'Target', 'Status', 'Durasi', 'Parameter', 'IP'].map(h => (
                      <th key={h} className="px-5 py-3 text-2xs font-black uppercase tracking-[0.2em] text-ds-ink3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-ds-border last:border-0 hover:bg-ds-card2 transition-colors">
                      <td className="px-5 py-3 text-2xs text-ds-ink3 whitespace-nowrap">{fmtTime(r.created_at)}</td>
                      <td className="px-5 py-3 text-xs font-bold text-ds-ink whitespace-nowrap">{humanAction(r.action)}</td>
                      <td className="px-5 py-3 text-2xs font-mono text-ds-ink3 max-w-[160px] truncate">{r.target_id ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-lg text-2xs font-black uppercase tracking-widest ${STATUS_STYLE[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-2xs text-ds-ink3 whitespace-nowrap">{r.duration_ms ?? '—'} ms</td>
                      <td className="px-5 py-3 text-2xs text-ds-ink3 max-w-[200px] truncate" title={(r.param_keys ?? []).join(', ')}>
                        {(r.param_keys ?? []).join(', ') || '—'}
                      </td>
                      <td className="px-5 py-3 text-2xs font-mono text-ds-ink3 whitespace-nowrap">{r.ip ?? '—'}</td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-xs text-ds-ink3">
                        Tidak ada aktivitas pada rentang dan filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-2xs text-ds-ink3 leading-relaxed flex items-start gap-2">
            <ShieldAlert size={12} className="shrink-0 mt-0.5" />
            Kolom Parameter hanya menampilkan <em>nama</em> kunci permintaan, bukan isinya.
            Nilai seperti NIK, foto, dan kata sandi sengaja tidak pernah disimpan di tabel ini.
          </p>
        </>
      )}
    </div>
  );
};

export default ActivityLogView;
