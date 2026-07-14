import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, FileCheck, FileText } from 'lucide-react';
import { adminListTncRecords, type TncRecordRow } from '../../services/supabaseService';

// Admin/Operator audit view of every recorded Terms & Conditions acceptance
// (sp_tnc_records) — previously only glance-able in the Users table, now a
// searchable ledger with reference numbers for dispute resolution.
const TncRecordsAdmin: React.FC = () => {
  const [rows, setRows] = useState<TncRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    setRows(await adminListTncRecords(search));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => load(q.trim() || undefined), 350);
    return () => clearTimeout(timer);
  }, [q, load]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <FileCheck size={22} className="text-emerald-400" /> Riwayat Syarat & Ketentuan
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
            {rows.length} persetujuan tercatat · audit legal
          </p>
        </div>
        <button onClick={() => load(q.trim() || undefined)}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cari nama, email, atau nomor referensi…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Belum ada rekaman persetujuan.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left">
            <thead className="bg-white/[0.03] text-[9px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">No. Referensi</th>
                <th className="px-4 py-3">Nama & Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Disetujui</th>
                <th className="px-4 py-3">Versi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {rows.map(r => (
                <tr key={r.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-[0.7rem]">{r.reference_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-white">{r.user?.name ?? '—'}</p>
                    <p className="text-slate-500 text-[0.65rem]">{r.user?.email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[0.6rem] font-black uppercase">{r.user?.role ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-[0.68rem]">
                    {new Date(r.accepted_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[0.6rem] font-black uppercase">{r.tnc_version}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TncRecordsAdmin;
