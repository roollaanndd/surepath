import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, ShieldCheck, ShieldAlert, Clock, X, Check, FileText } from 'lucide-react';
import {
  adminListIdentityVerifications, adminReviewIdentityVerification,
  type IdentityVerificationRow, type IdentityStatus,
} from '../../services/supabaseService';
import { SecureDocLink } from '../shared/SecureDoc';

const TABS: Array<{ id: IdentityStatus | 'ALL'; label: string }> = [
  { id: 'PENDING', label: 'Menunggu' },
  { id: 'APPROVED', label: 'Disetujui' },
  { id: 'REJECTED', label: 'Ditolak' },
  { id: 'ALL', label: 'Semua' },
];

const STATUS_STYLE: Record<string, string> = {
  UNSUBMITTED: 'bg-slate-500/10 text-slate-400',
  PENDING: 'bg-amber-500/10 text-amber-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-400',
  REJECTED: 'bg-rose-500/10 text-rose-400',
};

const RejectModal: React.FC<{ row: IdentityVerificationRow; onClose: () => void; onDone: () => void }> = ({ row, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    await adminReviewIdentityVerification(row.id, 'REJECT', reason.trim());
    setBusy(false);
    onDone();
  };
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white">Tolak Verifikasi — {row.name}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Alasan penolakan (wajib, akan dikirim ke pengguna)"
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500/50"
        />
        <button
          onClick={submit}
          disabled={busy || !reason.trim()}
          className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
        >
          {busy ? 'Memproses...' : 'Tolak Verifikasi'}
        </button>
      </div>
    </div>
  );
};

// Admin/Operator review queue for customer + agent KTP identity verification.
const IdentityVerificationAdmin: React.FC = () => {
  const [tab, setTab] = useState<IdentityStatus | 'ALL'>('PENDING');
  const [rows, setRows] = useState<IdentityVerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [rejectTarget, setRejectTarget] = useState<IdentityVerificationRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await adminListIdentityVerifications(tab));
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const approve = async (row: IdentityVerificationRow) => {
    setBusyId(row.id);
    await adminReviewIdentityVerification(row.id, 'APPROVE');
    setBusyId(null);
    load();
  };

  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.name?.toLowerCase().includes(s) || r.email?.toLowerCase().includes(s) || (r.phone ?? '').includes(q.trim());
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {rejectTarget && (
        <RejectModal
          row={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => { setRejectTarget(null); load(); }}
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-400" /> Verifikasi Identitas
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
            {rows.length} data · KTP customer & mitra
          </p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === tb.id ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cari nama, email, atau HP…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Tidak ada data.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left">
            <thead className="bg-white/[0.03] text-[9px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama & Kontak</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Diajukan</th>
                <th className="px-4 py-3">KTP</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-black text-white">{r.name}</p>
                    <p className="text-slate-500 text-[0.65rem]">{r.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[0.6rem] font-black uppercase">{r.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-[0.68rem]">
                    {r.identity_submitted_at ? new Date(r.identity_submitted_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.ktp_document_url ? (
                      <SecureDocLink url={r.ktp_document_url} className="text-emerald-400 underline text-[0.65rem] font-bold">Lihat</SecureDocLink>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-black uppercase flex items-center gap-1 w-fit ${STATUS_STYLE[r.identity_status]}`}>
                      {r.identity_status === 'PENDING' && <Clock size={10} />}
                      {r.identity_status === 'APPROVED' && <ShieldCheck size={10} />}
                      {r.identity_status === 'REJECTED' && <ShieldAlert size={10} />}
                      {r.identity_status}
                    </span>
                    {r.identity_status === 'REJECTED' && r.identity_reject_reason && (
                      <p className="text-[0.6rem] text-rose-400/70 mt-1 max-w-[180px] truncate" title={r.identity_reject_reason}>{r.identity_reject_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.identity_status === 'PENDING' ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => approve(r)}
                          disabled={busyId === r.id}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                          title="Setujui"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setRejectTarget(r)}
                          disabled={busyId === r.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                          title="Tolak"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : <span className="text-slate-600 text-[0.65rem]">—</span>}
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

export default IdentityVerificationAdmin;
