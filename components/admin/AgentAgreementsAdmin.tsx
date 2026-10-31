import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, Search, Archive, FileWarning } from 'lucide-react';
import { getAllAgreements, callGateway, SpAgentAgreement } from '../../services/supabaseService';
import { generateAgreementPDF } from '../../services/agreementPdf';
import ModuleIcon from '../shared/ModuleIcon';

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
    // Preferensi: salinan PDF yang diarsipkan saat persetujuan (audit 28 Okt
    // 2026). Signed URL diterbitkan gateway setelah validasi admin. Fallback:
    // bangun ulang dari data e-consent untuk arsip lama.
    if (r.pdf_path) {
      const { data, error } = await callGateway('documents_signed_url', {
        bucket: r.pdf_bucket ?? 'agent-docs',
        path: r.pdf_path,
        expires_in: 300,
      });
      const signedUrl = (data as any)?.signed_url as string | undefined;
      if (!error && signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      console.warn('documents_signed_url gagal, fallback regenerasi:', error);
    }
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
          <h2 className="text-2xl font-black tracking-tight text-ds-ink flex items-center gap-2">
            <ModuleIcon id="documents" size={32} /> Perjanjian Mitra
          </h2>
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mt-1">
            {rows.length} mitra menyetujui · {rows.filter(r => r.pdf_path).length} PDF terarsip · audit legal
          </p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 hover:text-ds-ink transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-ink3" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cari nama, nomor perjanjian, email, atau KTP…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-ds-card2 border border-ds-border text-sm text-ds-ink placeholder:text-ds-ink2 focus:outline-none focus:border-emerald-500/50" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-ds-ink3">
          <ModuleIcon id="documents" size={56} className="mx-auto mb-3 opacity-70" />
          <p className="text-sm font-bold">Belum ada perjanjian tercatat.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ds-border">
          <table className="w-full text-left">
            <thead className="bg-ds-card2 text-2xs font-black uppercase tracking-widest text-ds-ink3">
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
                <tr key={r.id} className="border-t border-ds-border hover:bg-ds-card2">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[0.7rem]">{r.agreement_no}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-ds-ink">{r.full_name}</p>
                    <p className="font-mono text-ds-ink3 text-2xs">{maskKtp(r.ktp_number)}</p>
                  </td>
                  <td className="px-4 py-3 text-ds-ink3">
                    <p>{r.agent_email ?? '—'}</p>
                    <p className="text-2xs text-ds-ink2">{r.agent_phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-ds-ink2 font-mono text-2xs">
                    {new Date(r.accepted_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-2xs font-black uppercase">{r.doc_version}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => download(r)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        r.pdf_path
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-ds-card2 text-ds-ink3 hover:text-amber-400 hover:bg-ds-card2'
                      }`}
                      title={r.pdf_path ? 'Unduh PDF terarsip' : 'Belum ada arsip — PDF akan dibuat ulang dari data e-consent'}>
                      {r.pdf_path ? <Download size={14} /> : <FileWarning size={14} />}
                    </button>
                    {r.pdf_path && (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        <Archive size={9} /> Arsip
                      </span>
                    )}
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
