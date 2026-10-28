import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { callGateway } from '../../services/supabaseService';
import { useToast, useConfirmDialog } from '../ui';
import { AdminErrorBanner } from './adminUI';
import { formatIDR } from '../car-wizard/WizardUI';

// ── Types ────────────────────────────────────────────────────────────────────

type CommissionStatus = 'PENDING' | 'PAID' | 'CANCELLED';
type FilterTab = 'ALL' | CommissionStatus;

interface CommissionRow {
  id: string;
  agent_id: string;
  client_name: string;
  product_type: string;
  premium_amount: number;
  commission_amount: number;
  discount_rate?: number;
  coin_reward?: number;
  order_number?: string;
  status: CommissionStatus;
  created_at?: string;
  paid_at?: string;
  // Joined
  agentName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

const STATUS_BADGE: Record<CommissionStatus, string> = {
  PENDING:   'bg-amber-500/10 text-amber-800 dark:text-amber-400',
  PAID:      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

const STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING:   'Pending',
  PAID:      'Dibayar',
  CANCELLED: 'Batal',
};

// ── Main Component ────────────────────────────────────────────────────────────

const CommissionLedger: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [rows, setRows]         = useState<CommissionRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter]     = useState<FilterTab>('ALL');
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await callGateway('admin_list_commissions', { limit: 1000 });

    if (error) {
      // FIX 2026-10-26: was console.error only — the admin saw an empty table
      // with no way to know the load failed or to retry it.
      setLoadError(String((error as any)?.message ?? error ?? 'Gagal memuat komisi.'));
      setLoading(false);
      return;
    }

    const mapped: CommissionRow[] = ((data ?? []) as any[]).map((row: any) => ({
      id:                row.id,
      agent_id:          row.agent_id,
      client_name:       row.client_name,
      product_type:      row.product_type,
      premium_amount:    row.premium_amount,
      commission_amount: row.commission_amount,
      discount_rate:     row.discount_rate,
      coin_reward:       row.coin_reward,
      order_number:      row.order_number,
      status:            row.status as CommissionStatus,
      created_at:        row.created_at,
      paid_at:           row.paid_at,
      agentName:         row.sp_users?.name ?? 'Agent',
    }));

    setRows(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Actions ────────────────────────────────────────────────────────────────
  //
  // FIX 2026-10-26 (financial integrity): mutations previously swallowed
  // errors (`if (!error)` with no else), and "Bayar Semua PENDING" wrote
  // sp_commissions DIRECTLY via the anon client — bypassing the data-gateway
  // and therefore the server-side credit_agent_wallet RPC, so agents' wallets
  // were never credited for bulk-paid commissions. Bulk pay now routes each
  // row through admin_update_commission (the same path as the single "Bayar"
  // button), with a confirmation dialog and a per-row result summary.

  const payCommission = async (id: string) => {
    setSaving(prev => new Set(prev).add(id));
    const { error } = await callGateway('admin_update_commission', { commission_id: id, status: 'PAID' });
    if (error) {
      toast.error(`Gagal membayar komisi: ${String((error as any)?.message ?? error)}`);
    } else {
      setRows(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: 'PAID', paid_at: new Date().toISOString() } : r
        )
      );
      toast.success('Komisi ditandai dibayar — saldo mitra dikreditkan.');
    }
    setSaving(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const cancelCommission = async (id: string) => {
    setSaving(prev => new Set(prev).add(id));
    const { error } = await callGateway('admin_update_commission', { commission_id: id, status: 'CANCELLED' });
    if (error) {
      toast.error(`Gagal membatalkan komisi: ${String((error as any)?.message ?? error)}`);
    } else {
      setRows(prev => prev.map(r => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
      toast.success('Komisi dibatalkan.');
    }
    setSaving(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const payAllPending = async () => {
    const pending = rows.filter(r => r.status === 'PENDING');
    if (pending.length === 0) return;
    const total = pending.reduce((s, r) => s + r.commission_amount, 0);
    const ok = await confirm({
      title: 'Bayar Semua Komisi Pending?',
      description: `${pending.length} komisi senilai ${formatIDR(total)} akan ditandai PAID dan saldo mitra dikreditkan oleh server per baris. Proses berjalan satu per satu melalui data-gateway.`,
      confirmLabel: 'Bayar Semua',
      variant: 'primary',
    });
    if (!ok) return;
    setBulkSaving(true);
    let okCount = 0;
    const failedRefs: string[] = [];
    for (const row of pending) {
      const { error } = await callGateway('admin_update_commission', { commission_id: row.id, status: 'PAID' });
      if (error) {
        failedRefs.push(row.order_number ?? row.id);
      } else {
        okCount += 1;
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, status: 'PAID', paid_at: new Date().toISOString() } : r
        ));
      }
    }
    setBulkSaving(false);
    if (failedRefs.length === 0) {
      toast.success(`${okCount} komisi berhasil dibayar.`);
    } else {
      toast.error(`${okCount} berhasil, ${failedRefs.length} gagal (${failedRefs.slice(0, 3).join(', ')}${failedRefs.length > 3 ? '…' : ''}). Ulangi baris yang gagal.`);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const filtered = rows.filter(r => {
    const matchStatus = filter === 'ALL' || r.status === filter;
    if (!matchStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.agentName.toLowerCase().includes(q) ||
      r.client_name.toLowerCase().includes(q) ||
      (r.order_number ?? '').toLowerCase().includes(q)
    );
  });

  const pendingCount  = rows.filter(r => r.status === 'PENDING').length;
  const totalAmount   = filtered.reduce((s, r) => s + r.commission_amount, 0);

  const TABS: FilterTab[] = ['ALL', 'PENDING', 'PAID', 'CANCELLED'];

  return (
    <div className="space-y-6 animate-fade-in bg-ds-card2 text-ds-ink">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ds-ink">
            Komisi <span className="text-ds-green">Ledger</span>
          </h2>
          <p className="text-xs uppercase tracking-wide text-ds-ink3 font-semibold mt-1">
            Manajemen komisi agen
          </p>
        </div>
        <button
          onClick={payAllPending}
          disabled={bulkSaving || pendingCount === 0}
          className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            pendingCount === 0
              ? 'bg-ds-card2 text-ds-ink3 border border-ds-border cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {bulkSaving ? 'Memproses…' : `Bayar Semua PENDING (${pendingCount})`}
        </button>
      </div>

      {loadError && (
        <AdminErrorBanner
          message={loadError}
          onRetry={loadData}
          retrying={loading}
        />
      )}

      {/* ── Filter tabs + search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-ds-card p-1 rounded-2xl border border-ds-border shadow-sm flex-wrap">
          {TABS.map(tab => {
            const count = tab === 'ALL'
              ? rows.length
              : rows.filter(r => r.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === tab
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-ds-ink3 hover:bg-ds-card2'
                }`}
              >
                {tab === 'ALL' ? 'Semua' : STATUS_LABEL[tab as CommissionStatus]}{' '}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-ink3" />
          <input
            type="text"
            placeholder="Cari agen / klien…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-ds-card border border-ds-border rounded-xl text-sm text-ds-ink outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors placeholder:text-ds-ink3"
          />
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div className="bg-ds-card border border-ds-border shadow-sm rounded-2xl px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-ds-ink3 font-semibold uppercase tracking-wide">
          Menampilkan{' '}
          <span className="text-ds-ink font-bold">{filtered.length}</span>{' '}
          dari {rows.length} komisi
        </p>
        <p className="text-xs text-ds-ink3 font-semibold uppercase tracking-wide">
          Total:{' '}
          <span className="text-ds-green font-bold font-mono">{formatIDR(totalAmount)}</span>
        </p>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-ds-card border border-ds-border shadow-sm rounded-2xl text-center py-16 text-ds-ink3 font-medium text-sm">
          Tidak ada data komisi.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const isBusy = saving.has(row.id);
            return (
              <div
                key={row.id}
                className="bg-ds-card border border-ds-border shadow-sm rounded-2xl px-6 py-4 hover:bg-ds-card2 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* ── Left: identity ── */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ds-ink">{row.agentName}</p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[row.status]}`}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <p className="text-2xs text-ds-ink3 font-semibold">
                      {row.client_name}
                      {row.order_number && (
                        <span className="ml-2 text-ds-ink2 font-mono">{row.order_number}</span>
                      )}
                    </p>
                    <p className="text-2xs font-black uppercase tracking-widest text-ds-ink2">
                      {row.product_type}
                      {row.discount_rate !== undefined && row.discount_rate !== null && (
                        <span className="ml-2 text-rose-500/60">Diskon {(row.discount_rate * 100).toFixed(0)}%</span>
                      )}
                      {row.paid_at && (
                        <span className="ml-2 text-ds-green/60">Dibayar {fmtDate(row.paid_at)}</span>
                      )}
                      {!row.paid_at && row.created_at && (
                        <span className="ml-2 text-ds-ink2">{fmtDate(row.created_at)}</span>
                      )}
                    </p>
                  </div>

                  {/* ── Middle: amounts ── */}
                  <div className="flex items-center gap-6 text-right flex-shrink-0">
                    <div>
                      <p className="text-2xs font-black uppercase tracking-widest text-ds-ink2">Premi</p>
                      <p className="text-xs font-mono text-ds-ink">{formatIDR(row.premium_amount)}</p>
                    </div>
                    <div>
                      <p className="text-2xs font-black uppercase tracking-widest text-ds-ink2">Komisi</p>
                      <p className="text-sm font-black text-amber-800 dark:text-amber-400">{formatIDR(row.commission_amount)}</p>
                    </div>
                    {row.coin_reward !== undefined && row.coin_reward !== null && row.coin_reward > 0 && (
                      <div>
                        <p className="text-2xs font-black uppercase tracking-widest text-ds-ink2">Koin</p>
                        <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                          {row.coin_reward.toLocaleString('id-ID')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Right: actions ── */}
                  {row.status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        disabled={isBusy}
                        onClick={() => payCommission(row.id)}
                        className="px-4 py-2 rounded-xl text-2xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40"
                      >
                        {isBusy ? '…' : 'Bayar'}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => cancelCommission(row.id)}
                        className="px-4 py-2 rounded-xl text-2xs font-black uppercase tracking-widest bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white active:scale-95 transition-all disabled:opacity-40"
                      >
                        {isBusy ? '…' : 'Batalkan'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommissionLedger;
