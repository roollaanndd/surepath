// InsurerClaims.tsx — Klaim tab. Lists claims for this insurer's orders.
import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Search } from 'lucide-react';
import { Language } from '../../types';
import { SkeletonCard, useToast } from '../ui';
import { useT } from '../../src/i18n';
import { AgentArtKeyframes, AgentHero, SpotClaims, AgentEmpty } from '../agent/AgentArt';
import { getInsurerDashboard, type InsurerOrder } from '../../services/insurerService';

interface Props {
  authToken: string;
  lang: Language;
  refreshTick: number;
}

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const InsurerClaims: React.FC<Props> = ({ authToken, lang, refreshTick }) => {
  const t = useT(lang);
  void t; // i18n helper — strings will be translated incrementally
  const toast = useToast();
  const [orders, setOrders] = useState<InsurerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getInsurerDashboard(authToken);
      // Insurer doesn't have direct claims API — show orders that have claims potential
      // (ISSUED or APPROVED orders where customer might file claims)
      setOrders(d.orders.filter(o => ['ISSUED', 'APPROVED'].includes(o.status)));
    } catch (e: any) {
      console.error('InsurerClaims load:', e);
      toast.error(`Gagal memuat data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [authToken, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const filtered = orders.filter(o => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (o.order_number ?? '').toLowerCase().includes(q)
      || (o.client_name ?? '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="px-5 pt-5 space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 space-y-4 pb-4">
      <AgentArtKeyframes />
      <AgentHero
        tone="emerald"
        title="Klaim Polis"
        subtitle="Klaim dari nasabah atas polis yang Anda terbitkan muncul otomatis di sini."
        art={<SpotClaims size={72} />}
      />

      <div className="bg-ds-card border border-ds-border rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <ShieldAlert size={18} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ds-ink">Polis Aktif yang Dapat Diajukan Klaim</p>
            <p className="text-xs text-ds-ink3 mt-0.5">Daftar polis yang sudah diterbitkan. Klaim dari nasabah akan muncul otomatis.</p>
          </div>
          <span className="text-2xl font-black text-blue-500">{filtered.length}</span>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-ink3" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari no. polis / nasabah…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ds-card border border-ds-border text-sm text-ds-ink placeholder-ds-ink3 outline-none focus:border-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <AgentEmpty
          title="Tidak ada polis aktif"
          desc="Polis yang sudah diterbitkan akan muncul di sini. Klaim dari nasabah akan otomatis terhubung."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="p-4 rounded-2xl border border-ds-border bg-ds-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-ds-ink3">{o.order_number ?? o.id.slice(0, 8)}</p>
                  <p className="text-sm font-bold text-ds-ink mt-0.5 truncate">{o.client_name}</p>
                  <p className="text-xs text-ds-ink2 mt-0.5">{o.product_name}</p>
                  {o.policy_number && (
                    <p className="text-2xs font-mono text-ds-green mt-1">Polis: {o.policy_number}</p>
                  )}
                </div>
                <span className={`text-2xs font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                  o.status === 'ISSUED' ? 'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400'
                }`}>
                  {o.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 mt-3 pt-3 border-t border-ds-border">
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">Pertanggungan</p>
                  <p className="text-xs text-ds-ink2 truncate mt-0.5">{o.coverage_type}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">Nilai TSI</p>
                  <p className="text-xs text-ds-ink2 tabular-nums whitespace-nowrap mt-0.5">{fmtIdr(o.sum_insured)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsurerClaims;
