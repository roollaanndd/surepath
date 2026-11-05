// Antrean approval kredit manual komisi & koin — MASTER_ADMIN only (v2.7.58).
//
// Pasangan dari ManualCommissionRequest.tsx. Menampilkan permintaan PENDING
// yang menunggu keputusan, plus riwayat semua keputusan terbaru (audit trail).
//
// Aturan four-eyes dienforced di gateway: `requested_by = decided_by` ditolak
// baik oleh CHECK di DB maupun gate di handler. Di UI, baris yang requester-
// nya adalah MASTER_ADMIN yang sedang membuka view ini ditampilkan dengan
// badge "Permintaan Anda sendiri" dan tombol Approve/Reject dimatikan.
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, DollarSign, Coins, FileText } from 'lucide-react';
import {
  type SpManualCommissionRequest,
  listManualCommissionRequests, decideManualCommissionRequest,
} from '../../services/supabaseService';
import { AdminPageHeader, AdminErrorBanner, AdminEmptyState } from './adminUI';
import { AdminModal } from './shared/AdminModal';
import { useToast } from '../ui';

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const ManualCommissionApprovalView: React.FC = () => {
  const toast = useToast();
  const [requests, setRequests] = useState<SpManualCommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [decisionTarget, setDecisionTarget] = useState<{ req: SpManualCommissionRequest; approve: boolean } | null>(null);

  const myUserId: string = useMemo(() => {
    try {
      const raw = localStorage.getItem('SUREPATH_SESSION') ?? sessionStorage.getItem('SUREPATH_SESSION');
      return JSON.parse(raw ?? '{}')?.supabaseId ?? JSON.parse(raw ?? '{}')?.id ?? '';
    } catch { return ''; }
  }, []);

  const load = async () => {
    setLoadError(null);
    try {
      const data = await listManualCommissionRequests({ scope: 'all', limit: 200 });
      setRequests(data);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Gagal memuat antrean.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const pending = requests.filter(r => r.status === 'PENDING');
  const decided = requests.filter(r => r.status !== 'PENDING');
  const list = tab === 'pending' ? pending : decided;
  const totalPendingAmount = pending.reduce((s, r) => s + Number(r.commission_amount), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Approval Kredit Manual"
        subtitle="Tinjau & putuskan permintaan Finance — four-eyes rule"
      />

      {loadError && <AdminErrorBanner message={loadError} onRetry={load} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-ds-card border border-slate-200 dark:border-ds-border p-4">
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pending.length}</div>
          <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3 mt-1">Menunggu</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-ds-card border border-slate-200 dark:border-ds-border p-4 col-span-1 sm:col-span-2">
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{fmtIDR(totalPendingAmount)}</div>
          <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3 mt-1">Total Nilai Menunggu</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-ds-card border border-slate-200 dark:border-ds-border p-4">
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{requests.filter(r => r.status === 'APPLIED').length}</div>
          <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3 mt-1">Sudah Terkredit</div>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-slate-100 dark:bg-ds-card2 p-1 rounded-xl w-fit">
        {(['pending', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t ? 'bg-white dark:bg-ds-card text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-ds-ink3 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t === 'pending' ? `Menunggu (${pending.length})` : `Riwayat (${decided.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 dark:text-ds-ink3">Memuat...</div>
      ) : list.length === 0 ? (
        <AdminEmptyState
          icon={tab === 'pending' ? CheckCircle2 : Clock}
          title={tab === 'pending' ? 'Antrean bersih' : 'Belum ada riwayat'}
          hint={tab === 'pending' ? 'Tidak ada permintaan kredit manual yang menunggu keputusan.' : 'Keputusan yang Anda ambil akan muncul di sini.'}
        />
      ) : (
        <div className="space-y-3">
          {list.map(r => {
            const isMine = r.requested_by === myUserId;
            return (
              <div
                key={r.id}
                className={`rounded-2xl border p-5 ${
                  r.status === 'PENDING'
                    ? 'bg-amber-50/40 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/30'
                    : 'bg-white dark:bg-ds-card border-slate-200 dark:border-ds-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{r.agent?.name ?? '—'}</span>
                      {r.agent?.agent_code && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-ds-ink3">· {r.agent.agent_code}</span>
                      )}
                      <StatusPill status={r.status} />
                      {isMine && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-ds-ink2 font-semibold">Permintaan Anda sendiri</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-800 dark:text-ds-ink2">
                        <DollarSign size={14} className="text-emerald-600" /> {fmtIDR(r.commission_amount)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-800 dark:text-ds-ink2">
                        <Coins size={14} className="text-amber-600" /> {r.coin_amount} koin
                      </span>
                      {r.policy_ref && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-ds-ink3">
                          <FileText size={13} /> {r.policy_ref}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-700 dark:text-ds-ink2 leading-relaxed">{r.reason}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500 dark:text-ds-ink3 flex-wrap">
                      <span>Diajukan {fmtDate(r.created_at)}</span>
                      <span>oleh {r.requester?.name ?? r.requester?.email ?? '—'}</span>
                      {r.decided_by && r.decider && (
                        <span className="text-slate-600 dark:text-ds-ink2">
                          · Diputus {r.decided_at ? fmtDate(r.decided_at) : '—'} oleh {r.decider.name ?? r.decider.email}
                        </span>
                      )}
                    </div>
                    {r.decision_note && (
                      <p className={`mt-2 text-[12px] italic ${r.status === 'REJECTED' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-ds-ink3'}`}>
                        "{r.decision_note}"
                      </p>
                    )}
                  </div>

                  {r.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={isMine}
                        title={isMine ? 'Four-eyes: tidak boleh menyetujui permintaan sendiri' : undefined}
                        onClick={() => setDecisionTarget({ req: r, approve: false })}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-ds-card border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Tolak
                      </button>
                      <button
                        disabled={isMine}
                        title={isMine ? 'Four-eyes: tidak boleh menyetujui permintaan sendiri' : undefined}
                        onClick={() => setDecisionTarget({ req: r, approve: true })}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Setujui
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {decisionTarget && (
        <DecisionDialog
          req={decisionTarget.req}
          approve={decisionTarget.approve}
          onClose={() => setDecisionTarget(null)}
          onDecided={() => {
            setDecisionTarget(null);
            toast.success(decisionTarget.approve ? 'Kredit disetujui & telah diterapkan ke wallet mitra.' : 'Permintaan ditolak.');
            load();
          }}
        />
      )}
    </div>
  );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const meta: Record<string, { label: string; cls: string }> = {
    PENDING:  { label: 'Menunggu',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    APPROVED: { label: 'Approved',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
    APPLIED:  { label: 'Terkredit', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    REJECTED: { label: 'Ditolak',   cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  };
  const m = meta[status] ?? meta.PENDING;
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
};

// Dialog konfirmasi — reject wajib alasan, approve menampilkan ringkasan apa
// yang akan terjadi.
const DecisionDialog: React.FC<{
  req: SpManualCommissionRequest;
  approve: boolean;
  onClose: () => void;
  onDecided: () => void;
}> = ({ req, approve, onClose, onDecided }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!approve && note.trim().length < 5) {
      setError('Alasan penolakan minimal 5 karakter.');
      return;
    }
    setBusy(true);
    try {
      const res = await decideManualCommissionRequest(req.id, approve, note.trim() || undefined);
      if (res.error) {
        setError(res.error);
        if (res.code === 'APPROVED_WALLET_FAILED') {
          // Partial state — tetap panggil onDecided supaya UI ter-refresh;
          // user akan melihat status APPROVED (bukan APPLIED).
          setTimeout(onDecided, 2500);
        }
        return;
      }
      onDecided();
    } catch (e: any) {
      setError(e?.message ?? 'Gagal mengirim keputusan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      onClose={busy ? () => {} : onClose}
      dismissible={!busy}
      size="md"
      icon={approve ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-rose-600" />}
      title={approve ? 'Setujui Kredit?' : 'Tolak Permintaan?'}
      subtitle={approve ? 'Ini akan langsung memanggil credit_agent_wallet dan menambah koin mitra.' : 'Mitra & requester akan diberi tahu alasan penolakan.'}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 border border-slate-200 dark:border-ds-border text-slate-700 dark:text-ds-ink3 rounded-xl font-semibold text-sm transition-all hover:bg-slate-50 dark:hover:bg-ds-card2 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className={`flex-1 py-2.5 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 ${
              approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {busy ? 'Memproses...' : approve ? 'Ya, Setujui' : 'Ya, Tolak'}
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 dark:bg-ds-card2 border border-slate-200 dark:border-ds-border p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-ds-ink3">Mitra</span>
            <span className="font-semibold text-slate-900 dark:text-white">{req.agent?.name ?? '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-ds-ink3">Komisi</span>
            <span className="font-mono text-slate-900 dark:text-white">{fmtIDR(req.commission_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-ds-ink3">Koin</span>
            <span className="font-mono text-slate-900 dark:text-white">{req.coin_amount}</span>
          </div>
          {req.policy_ref && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-ds-ink3">Referensi</span>
              <span className="font-mono text-slate-900 dark:text-white">{req.policy_ref}</span>
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-slate-200 dark:border-ds-border">
            <p className="text-xs text-slate-600 dark:text-ds-ink3 mb-1">Alasan dari requester:</p>
            <p className="text-sm text-slate-800 dark:text-ds-ink2 italic">"{req.reason}"</p>
          </div>
        </div>
        <div>
          <label className="block text-2xs font-bold text-slate-600 dark:text-ds-ink3 uppercase tracking-wider mb-1.5">
            {approve ? 'Catatan (opsional)' : 'Alasan Penolakan *'}
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={approve ? 'Contoh: diverifikasi dengan bukti CRM #1234' : 'Contoh: nominal tidak sesuai bukti polis'}
            rows={3}
            maxLength={1000}
            className="w-full bg-white dark:bg-ds-card2 border border-slate-200 dark:border-ds-border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none transition-all"
          />
        </div>
      </div>
    </AdminModal>
  );
};

export default ManualCommissionApprovalView;
