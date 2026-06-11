import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { callGateway, supabase } from '../../services/supabaseService';
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
  PENDING:   'bg-amber-50 text-amber-700',
  PAID:      'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING:   'Pending',
  PAID:      'Dibayar',
  CANCELLED: 'Batal',
};

// ── Main Component ────────────────────────────────────────────────────────────

const CommissionLedger: React.FC = () => {
  const [rows, setRows]         = useState<CommissionRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterTab>('ALL');
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await callGateway('admin_list_commissions', { limit: 1000 });

    if (error) {
      console.error('CommissionLedger load:', error);
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

  const payCommission = async (id: string) => {
    setSaving(prev => new Set(prev).add(id));
    const { error } = await callGateway('admin_update_commission', { commission_id: id, status: 'PAID' });
    if (!error) {
      setRows(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: 'PAID', paid_at: new Date().toISOString() } : r
        )
      );
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
    if (!error) {
      setRows(prev =>
        prev.map(r => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
      );
    }
    setSaving(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const payAllPending = async () => {
    const pendingIds = rows
      .filter(r => r.status === 'PENDING')
      .map(r => r.id);
    if (pendingIds.length === 0) return;
    setBulkSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('sp_commissions')
      .update({ status: 'PAID', paid_at: now })
      .in('id', pendingIds);
    if (!error) {
      setRows(prev =>
        prev.map(r =>
          r.status === 'PENDING' ? { ...r, status: 'PAID', paid_at: now } : r
        )
      );
    }
    setBulkSaving(false);
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
    <div className="space-y-6 animate-fade-in bg-gray-50 text-gray-900">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Komisi <span className="text-emerald-600">Ledger</span>
          </h2>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mt-1">
            Manajemen komisi agen
          </p>
        </div>
        <button
          onClick={payAllPending}
          disabled={bulkSaving || pendingCount === 0}
          className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            pendingCount === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {bulkSaving ? 'Memproses…' : `Bayar Semua PENDING (${pendingCount})`}
        </button>
      </div>

      {/* ── Filter tabs + search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex-wrap">
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
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab === 'ALL' ? 'Semua' : STATUS_LABEL[tab as CommissionStatus]}{' '}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari agen / klien…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
          Menampilkan{' '}
          <span className="text-gray-900 font-bold">{filtered.length}</span>{' '}
          dari {rows.length} komisi
        </p>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
          Total:{' '}
          <span className="text-emerald-600 font-bold font-mono">{formatIDR(totalAmount)}</span>
        </p>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl text-center py-16 text-gray-400 font-medium text-sm">
          Tidak ada data komisi.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const isBusy = saving.has(row.id);
            return (
              <div
                key={row.id}
                className="bg-white border border-gray-100 shadow-sm rounded-2xl px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* ── Left: identity ── */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{row.agentName}</p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[row.status]}`}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {row.client_name}
                      {row.order_number && (
                        <span className="ml-2 text-slate-600 font-mono">{row.order_number}</span>
                      )}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      {row.product_type}
                      {row.discount_rate !== undefined && row.discount_rate !== null && (
                        <span className="ml-2 text-rose-500/60">Diskon {(row.discount_rate * 100).toFixed(0)}%</span>
                      )}
                      {row.paid_at && (
                        <span className="ml-2 text-emerald-500/60">Dibayar {fmtDate(row.paid_at)}</span>
                      )}
                      {!row.paid_at && row.created_at && (
                        <span className="ml-2 text-slate-700">{fmtDate(row.created_at)}</span>
                      )}
                    </p>
                  </div>

                  {/* ── Middle: amounts ── */}
                  <div className="flex items-center gap-6 text-right flex-shrink-0">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Premi</p>
                      <p className="text-xs font-mono text-gray-900">{formatIDR(row.premium_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Komisi</p>
                      <p className="text-sm font-black text-amber-400">{formatIDR(row.commission_amount)}</p>
                    </div>
                    {row.coin_reward !== undefined && row.coin_reward !== null && row.coin_reward > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Koin</p>
                        <p className="text-xs font-mono text-primary-400">
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
                        className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40"
                      >
                        {isBusy ? '…' : 'Bayar'}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => cancelCommission(row.id)}
                        className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white active:scale-95 transition-all disabled:opacity-40"
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
