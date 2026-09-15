// Rekaman Pathy — tampilan CMS.
//
// Dua pertanyaan berbeda, jadi dua mode, sama seperti Jejak Aktivitas:
//   • Ringkasan — "siapa yang memakai Pathy, seberapa sering"
//   • Transkrip — "apa persisnya yang ditanyakan orang ini, dan dijawab apa"
//
// Mulai dari ringkasan karena itu yang dibuka admin duluan. Membuka langsung ke
// ribuan baris pesan mentah hanya memindahkan pekerjaan menyaring ke mata admin.
//
// Layar ini membaca tabel LANGSUNG, bukan lewat data-gateway. Yang menjaganya
// kebijakan RLS `pathy select admin`; admin melihat semua, pengguna biasa hanya
// miliknya sendiri dari kueri yang sama persis.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Bot, Loader2, MessageSquare, RefreshCw, Search, User } from 'lucide-react';
import {
  fetchPathyMessages,
  summarisePathyUsers,
  type PathyMessageRow,
  type PathyUserSummary,
} from '../../services/pathyLog';

const RANGES = [
  { id: '24h', label: '24 Jam', hours: 24 },
  { id: '7d', label: '7 Hari', hours: 24 * 7 },
  { id: '30d', label: '30 Hari', hours: 24 * 30 },
];

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

const PathyTranscriptsView: React.FC = () => {
  const [rows, setRows] = useState<PathyMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hours, setHours] = useState(RANGES[1].hours);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await fetchPathyMessages(hours));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal memuat rekaman.');
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => { void load(); }, [load]);

  const users = useMemo(() => summarisePathyUsers(rows), [rows]);

  const filteredUsers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(u => (u.user_email ?? u.user_id).toLowerCase().includes(needle));
  }, [users, q]);

  // Transkrip satu pengguna: dikelompokkan per percakapan, dan di dalamnya urut
  // maju. Baris datang terbaru-dulu, jadi dibalik di sini.
  const transcript = useMemo(() => {
    if (!selected) return [];
    const mine = rows.filter(r => r.user_id === selected);
    const byConv = new Map<string, PathyMessageRow[]>();
    for (const r of mine) {
      const list = byConv.get(r.conversation_id) ?? [];
      list.push(r);
      byConv.set(r.conversation_id, list);
    }
    return [...byConv.entries()]
      .map(([id, list]) => ({
        id,
        messages: [...list].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
      }))
      .sort((a, b) =>
        a.messages[0].created_at < b.messages[0].created_at ? 1 : -1,
      );
  }, [rows, selected]);

  const selectedUser: PathyUserSummary | undefined = useMemo(
    () => users.find(u => u.user_id === selected),
    [users, selected],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-ds-ink">Rekaman Pathy</h2>
          <p className="text-ds-sm text-ds-ink3 mt-1">
            Percakapan tiap pengguna dengan asisten — apa yang ditanyakan, dan dijawab apa.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-ds-border overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => { setHours(r.hours); setSelected(null); }}
                className={`px-3 py-1.5 text-ds-sm transition-colors ${
                  hours === r.hours
                    ? 'bg-ds-green text-white'
                    : 'bg-ds-card2 text-ds-ink3 hover:text-ds-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ds-card2 border border-ds-border text-ds-sm text-ds-ink2 hover:text-ds-ink transition-colors"
          >
            <RefreshCw size={14} /> Muat ulang
          </button>
        </div>
      </div>

      {err && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-ds-red-lt border border-ds-red/30">
          <AlertTriangle size={18} className="text-ds-red shrink-0 mt-0.5" />
          <div className="text-ds-sm text-ds-red">{err}</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-ds-ink3">
          <Loader2 className="animate-spin mr-2" size={18} /> Memuat rekaman…
        </div>
      ) : selected ? (
        <section className="bg-ds-card border border-ds-border rounded-2xl p-5">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-ds-sm text-ds-ink3 hover:text-ds-ink mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Kembali ke daftar
          </button>

          <h3 className="font-semibold text-ds-ink break-all">
            {selectedUser?.user_email ?? selected}
          </h3>
          <p className="text-ds-sm text-ds-ink3 mt-0.5 mb-5">
            {transcript.length} percakapan · {selectedUser?.messages ?? 0} pesan
          </p>

          <div className="space-y-6">
            {transcript.map((conv, i) => (
              <div key={conv.id}>
                <div className="text-[11px] uppercase tracking-wide text-ds-ink3 mb-2">
                  Percakapan {transcript.length - i} · {fmtTime(conv.messages[0].created_at)}
                </div>
                <div className="space-y-2">
                  {conv.messages.map(m => (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${m.role === 'user' ? '' : 'flex-row-reverse'}`}
                    >
                      <div className="shrink-0 mt-1 text-ds-ink3">
                        {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-ds-sm whitespace-pre-wrap break-words ${
                          m.role === 'user'
                            ? 'bg-ds-card2 text-ds-ink2'
                            : 'bg-ds-green-tint text-ds-ink'
                        }`}
                      >
                        {m.content}
                        <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-ds-ink3">
                          <span>{fmtTime(m.created_at)}</span>
                          {m.degraded && (
                            <span className="px-1.5 py-0.5 rounded bg-ds-amber-lt text-ds-amber">
                              tanpa data pribadi
                            </span>
                          )}
                          {m.tools_used?.map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-ds-blue-lt text-ds-blue">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-ds-card border border-ds-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search size={14} className="text-ds-ink3" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Cari email pengguna…"
              className="flex-1 bg-transparent text-ds-sm text-ds-ink placeholder:text-ds-ink3 outline-none"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare size={28} className="text-ds-ink3 mb-3" />
              <p className="text-ds-ink2 font-medium">Belum ada percakapan</p>
              <p className="text-ds-sm text-ds-ink3 mt-1 max-w-md">
                Rekaman mulai terkumpul sejak rilis ini — percakapan sebelumnya tidak
                pernah disimpan, jadi tidak bisa ditampilkan surut. Coba rentang waktu
                yang lebih lebar kalau Anda menduga ada yang terlewat.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-ds-sm border-collapse">
                <thead>
                  <tr className="text-left text-ds-ink3 border-b border-ds-border">
                    <th className="py-2 pr-4 font-medium">Pengguna</th>
                    <th className="py-2 pr-4 font-medium whitespace-nowrap">Percakapan</th>
                    <th className="py-2 pr-4 font-medium whitespace-nowrap">Pesan</th>
                    <th className="py-2 pr-4 font-medium whitespace-nowrap">Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr
                      key={u.user_id}
                      onClick={() => setSelected(u.user_id)}
                      className="border-b border-ds-border/60 last:border-0 cursor-pointer hover:bg-ds-card2 transition-colors"
                    >
                      <td className="py-2.5 pr-4 text-ds-ink2 break-all">
                        {u.user_email ?? <span className="text-ds-ink3">{u.user_id}</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-ds-ink2 tabular-nums">{u.conversations}</td>
                      <td className="py-2.5 pr-4 text-ds-ink2 tabular-nums">{u.messages}</td>
                      <td className="py-2.5 pr-4 text-ds-ink3 whitespace-nowrap">{fmtTime(u.last_seen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PathyTranscriptsView;
