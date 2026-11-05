// Permintaan kredit komisi & koin manual (v2.7.58).
//
// Dipakai Finance/Admin saat mitra menutup polis di luar aplikasi (telepon,
// kunjungan langsung, mitra institusi). Setiap permintaan WAJIB disetujui
// MASTER_ADMIN sebelum benar-benar menyentuh wallet — pencegahan two-person
// rule yang dienforced di gateway (lihat sp_manual_commission_requests dan
// handleManualCommissionAction).
//
// UI:
//  - Form pengajuan: pilih mitra (search + drop-down), isi nominal IDR + koin,
//    nomor polis referensi (bebas, biasanya nomor polis offline), alasan
//    wajib (min 10 karakter).
//  - Panel bawah: daftar permintaan yang diajukan user ini, dengan statusnya.
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Clock, CheckCircle2, XCircle, AlertCircle, DollarSign, Coins } from 'lucide-react';
import {
  type SpUser, type SpManualCommissionRequest,
  getAllAgents,
  requestManualCommission, listManualCommissionRequests,
} from '../../services/supabaseService';
import { AdminPageHeader, AdminErrorBanner, AdminEmptyState } from './adminUI';
import { AdminModal } from './shared/AdminModal';
import { useToast } from '../ui';

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_META: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  PENDING:  { label: 'Menunggu Approval', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',   Icon: Clock },
  APPROVED: { label: 'Disetujui (proses)', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',       Icon: CheckCircle2 },
  APPLIED:  { label: 'Terkredit',          cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', Icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak',            cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',       Icon: XCircle },
};

export const ManualCommissionRequestView: React.FC = () => {
  const toast = useToast();
  const [agents, setAgents] = useState<SpUser[]>([]);
  const [requests, setRequests] = useState<SpManualCommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      const [ag, reqs] = await Promise.all([
        getAllAgents(),
        listManualCommissionRequests({ scope: 'mine', limit: 100 }),
      ]);
      setAgents(ag.filter(a => a.role === 'AGENT'));
      setRequests(reqs);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Kredit Manual Komisi & Koin"
        subtitle="Polis ditutup di luar aplikasi — butuh approval MASTER_ADMIN"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus size={16} /> Ajukan Kredit Manual
          </button>
        }
      />

      {loadError && <AdminErrorBanner message={loadError} onRetry={load} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ['PENDING', 'Menunggu', 'text-amber-600 dark:text-amber-400'],
          ['APPROVED', 'Dipotong', 'text-blue-600 dark:text-blue-400'],
          ['APPLIED', 'Terkredit', 'text-emerald-600 dark:text-emerald-400'],
          ['REJECTED', 'Ditolak', 'text-rose-600 dark:text-rose-400'],
        ] as const).map(([status, label, color]) => (
          <div key={status} className="rounded-2xl bg-white dark:bg-ds-card border border-slate-200 dark:border-ds-border p-4">
            <div className={`text-2xl font-black ${color}`}>{requests.filter(r => r.status === status).length}</div>
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* My requests */}
      {loading ? (
        <div className="text-center py-10 text-slate-500 dark:text-ds-ink3">Memuat permintaan...</div>
      ) : requests.length === 0 ? (
        <AdminEmptyState
          icon={Clock}
          title="Belum ada permintaan"
          hint="Ajuan kredit manual yang Anda buat akan muncul di sini beserta statusnya."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-ds-border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-ds-card2 text-left">
              <tr>
                <th className="px-4 py-3 text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3">Tanggal</th>
                <th className="px-4 py-3 text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3">Mitra</th>
                <th className="px-4 py-3 text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3">Ref</th>
                <th className="px-4 py-3 text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3 text-right">Komisi</th>
                <th className="px-4 py-3 text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3 text-right">Koin</th>
                <th className="px-4 py-3 text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-ds-ink3">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-ds-card divide-y divide-slate-100 dark:divide-ds-border">
              {requests.map(r => {
                const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-ds-ink3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.agent?.name ?? '-'}</div>
                      <div className="text-xs text-slate-500 dark:text-ds-ink3">{r.agent?.agent_code ?? r.agent?.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-ds-ink2">{r.policy_ref ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-slate-900 dark:text-white">{fmtIDR(r.commission_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-slate-900 dark:text-white">{r.coin_amount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.cls}`}>
                        <meta.Icon size={11} /> {meta.label}
                      </span>
                      {r.status === 'REJECTED' && r.decision_note && (
                        <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 italic max-w-xs">"{r.decision_note}"</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <RequestForm
          agents={agents}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            toast.success('Permintaan dikirim. Menunggu persetujuan MASTER_ADMIN.');
            load();
          }}
        />
      )}
    </div>
  );
};

// ── Form pengajuan ───────────────────────────────────────────────────────────
const RequestForm: React.FC<{
  agents: SpUser[];
  onClose: () => void;
  onSubmitted: () => void;
}> = ({ agents, onClose, onSubmitted }) => {
  const [agentId, setAgentId] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [policyRef, setPolicyRef] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = agents.find(a => a.id === agentId);

  const filtered = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return agents.slice(0, 50);
    return agents.filter(a =>
      (a.name ?? '').toLowerCase().includes(q) ||
      (a.email ?? '').toLowerCase().includes(q) ||
      (a.agent_code ?? '').toLowerCase().includes(q),
    ).slice(0, 50);
  }, [agents, agentQuery]);

  const commissionN = Number(commissionAmount) || 0;
  const coinN = Number(coinAmount) || 0;
  const canSubmit = !!selected && reason.trim().length >= 10 && (commissionN > 0 || coinN > 0);

  const submit = async () => {
    setError(null);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await requestManualCommission({
        agent_id: agentId,
        commission_amount: commissionN,
        coin_amount: Math.floor(coinN),
        reason: reason.trim(),
        policy_ref: policyRef.trim() || null,
      });
      if (res.error) { setError(res.error); return; }
      onSubmitted();
    } catch (e: any) {
      setError(e?.message ?? 'Gagal mengirim permintaan.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full min-w-0 bg-white dark:bg-ds-card2 border border-slate-200 dark:border-ds-border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all';
  const labelCls = 'block text-2xs font-bold text-slate-600 dark:text-ds-ink3 uppercase tracking-wider mb-1.5';

  return (
    <AdminModal
      onClose={busy ? () => {} : onClose}
      dismissible={!busy}
      size="2xl"
      icon={<DollarSign size={18} className="text-emerald-600" />}
      title="Ajukan Kredit Manual"
      subtitle="Butuh persetujuan MASTER_ADMIN sebelum dana menyentuh wallet mitra. Simpan alasan yang jelas untuk audit."
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
            disabled={busy || !canSubmit}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Mengirim...' : 'Kirim ke MASTER_ADMIN'}
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

      <div className="space-y-5">
        <section className="space-y-2">
          <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-ds-ink3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/70" />Pilih Mitra
          </p>
          {selected ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5">
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{selected.name}</p>
                <p className="text-xs text-slate-500 dark:text-ds-ink3">{selected.email} · {selected.agent_code ?? '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setAgentId(''); setAgentQuery(''); }}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Ganti
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={agentQuery}
                  onChange={e => setAgentQuery(e.target.value)}
                  placeholder="Cari nama, email, atau kode agen (SP-AGT-XXXX)"
                  className={`${inputCls} pl-9`}
                />
              </div>
              {filtered.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card">
                  {filtered.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAgentId(a.id)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-ds-border last:border-0"
                    >
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{a.name}</p>
                      <p className="text-xs text-slate-500 dark:text-ds-ink3">{a.email} · {a.agent_code ?? '-'}</p>
                    </button>
                  ))}
                </div>
              )}
              {agentQuery && filtered.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-ds-ink3 px-1">Tidak ada mitra cocok.</p>
              )}
            </>
          )}
        </section>

        <section className="space-y-3">
          <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-ds-ink3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/70" />Nominal Kredit
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Komisi (IDR)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={commissionAmount}
                  onChange={e => setCommissionAmount(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} pl-9 font-mono`}
                />
              </div>
              {commissionN > 0 && <p className="text-[11px] text-slate-500 dark:text-ds-ink3 mt-1">= {fmtIDR(commissionN)}</p>}
            </div>
            <div>
              <label className={labelCls}>Koin</label>
              <div className="relative">
                <Coins size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={coinAmount}
                  onChange={e => setCoinAmount(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} pl-9 font-mono`}
                />
              </div>
              {coinN > 0 && <p className="text-[11px] text-slate-500 dark:text-ds-ink3 mt-1">≈ {fmtIDR(coinN * 1000)}</p>}
            </div>
          </div>
          {!(commissionN > 0 || coinN > 0) && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">Minimal salah satu dari komisi atau koin harus diisi.</p>
          )}
        </section>

        <section className="space-y-3">
          <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-ds-ink3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/70" />Konteks & Alasan
          </p>
          <div>
            <label className={labelCls}>Nomor Polis / Referensi (opsional)</label>
            <input
              type="text"
              value={policyRef}
              onChange={e => setPolicyRef(e.target.value)}
              placeholder="Mis. POL-OFFLINE-2026-001"
              className={inputCls}
              maxLength={100}
            />
          </div>
          <div>
            <label className={labelCls}>Alasan <span className="text-rose-600">*</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Jelaskan kenapa kredit ini dicatat manual — contoh: polis ditutup lewat kunjungan langsung, bukti terlampir di CRM #1234."
              rows={4}
              maxLength={1000}
              className={`${inputCls} resize-none`}
            />
            <div className="flex justify-between mt-1 text-[11px] text-slate-500 dark:text-ds-ink3">
              <span>Min 10, maks 1000 karakter.</span>
              <span>{reason.length}/1000</span>
            </div>
          </div>
        </section>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3.5 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Permintaan Anda akan masuk antrean <span className="font-bold">approval MASTER_ADMIN</span>. Komisi + koin baru masuk dompet mitra setelah disetujui. Anda tidak bisa menyetujui permintaan Anda sendiri (four-eyes).</span>
        </div>
      </div>
    </AdminModal>
  );
};

export default ManualCommissionRequestView;
