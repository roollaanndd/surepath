import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, ShieldCheck, Search, FileText } from 'lucide-react';
import { getAllAgreements, SpAgentAgreement } from '../../services/supabaseService';
import { generateAgreementPDF } from '../../services/agreementPdf';

type Row = SpAgentAgreement & { agent_email?: string; agent_phone?: string };

const maskKtp = (k: string) => (k.length === 16 ? `${k.slice(0, 6)}••••••${k.slice(12)}` : k);

// Admin audit view of every signed agent agreement — searchable, exportable.
const AgentAgreementsAdmin: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await getAllAgreements());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.full_name.toLowerCase().includes(s)
      || r.agreement_no.toLowerCase().includes(s)
      || (r.agent_email ?? '').toLowerCase().includes(s)
      || r.ktp_number.includes(q.trim());
  });

  const download = async (r: Row) => {
    await generateAgreementPDF({
      agreementNo: r.agreement_no,
      docVersion: r.doc_version,
      fullName: r.full_name,
      ktpNumber: r.ktp_number,
      acceptedAt: r.accepted_at,
      agentEmail: r.agent_email,
      agentPhone: r.agent_phone,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-400" /> Perjanjian Agen
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
            {rows.length} agen menyetujui · audit legal
          </p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cari nama, nomor perjanjian, email, atau KTP…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Belum ada perjanjian tercatat.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left">
            <thead className="bg-white/[0.03] text-[9px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">No. Perjanjian</th>
                <th className="px-4 py-3">Nama & KTP</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3">Disetujui</th>
                <th className="px-4 py-3">Versi</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-[0.7rem]">{r.agreement_no}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-white">{r.full_name}</p>
                    <p className="font-mono text-slate-500 text-[0.65rem]">{maskKtp(r.ktp_number)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <p>{r.agent_email ?? '—'}</p>
                    <p className="text-[0.65rem] text-slate-600">{r.agent_phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-[0.68rem]">
                    {new Date(r.accepted_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[0.6rem] font-black uppercase">{r.doc_version}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => download(r)}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-colors" title="Unduh PDF">
                      <Download size={14} />
                    </button>
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

export default AgentAgreementsAdmin;
