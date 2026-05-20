import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Eye, CheckCircle, XCircle, Download, ChevronRight, Car, Bike, RefreshCw
} from 'lucide-react';
import { Language } from '../../types';
import { getAgentOrders, type SpPolicyOrder } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agentId: string;
  lang: Language;
}

const STATUS_META: Record<SpPolicyOrder['status'], { en: string; id: string; color: string; Icon: any }> = {
  SUBMITTED:    { en: 'Submitted',    id: 'Diajukan',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',     Icon: Clock },
  UNDER_REVIEW: { en: 'In Review',    id: 'Ditinjau',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',          Icon: Eye },
  APPROVED:     { en: 'Approved',     id: 'Disetujui',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', Icon: CheckCircle },
  ISSUED:       { en: 'Policy Issued',id: 'Polis Terbit',color:'bg-primary-500/10 text-primary-500',                                         Icon: FileText },
  REJECTED:     { en: 'Rejected',     id: 'Ditolak',    color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',           Icon: XCircle },
};

// ── Detail Sheet ─────────────────────────────────────────────────────────────

const OrderSheet: React.FC<{ order: SpPolicyOrder; lang: Language; onClose: () => void }> = ({ order, lang, onClose }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const meta = STATUS_META[order.status];
  const v    = order.vehicle_details ?? {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        className="bg-white dark:bg-[#111] rounded-t-[2.5rem] p-6 pb-10 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-black text-base">{order.order_number ?? '—'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.product_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">✕</button>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-5 ${meta.color}`}>
          <meta.Icon size={10} />
          {lang === Language.EN ? meta.en : meta.id}
        </span>

        <div className="space-y-2.5 mb-5">
          {[
            [t('Client', 'Klien'), order.client_name],
            [t('Vehicle', 'Kendaraan'), `${v.make ?? ''} ${v.model ?? ''} ${v.year ?? ''}`],
            [t('Plate', 'Plat'), v.plate ?? '-'],
            [t('Coverage', 'Pertanggungan'), order.coverage_type],
            [t('Sum Insured', 'Harga Pertanggungan'), formatIDR(order.sum_insured)],
            [t('Zone', 'Zona'), `Zona ${order.zone}`],
            [t('OJK Rate', 'Tarif OJK'), order.ojk_rate ? `${(order.ojk_rate * 100).toFixed(2)}%` : '-'],
            [t('Total Premium', 'Total Premi'), formatIDR(order.total_premium)],
          ].map(([k, val]) => (
            <div key={k} className="flex justify-between py-2.5 border-b border-slate-50 dark:border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</span>
              <span className="text-sm font-bold">{val}</span>
            </div>
          ))}
        </div>

        {order.vehicle_image_url && (
          <img
            src={order.vehicle_image_url}
            alt="Vehicle"
            className="rounded-2xl w-full object-cover max-h-40 border border-slate-100 dark:border-white/10 mb-4"
          />
        )}

        {order.ai_score !== undefined && (
          <div className={`p-4 rounded-2xl mb-4 text-center ${
            order.ai_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
          }`}>
            <p className={`text-3xl font-black ${order.ai_score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {order.ai_score}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">AI Survey Score</p>
          </div>
        )}

        {order.reviewer_notes && (
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">{t('Admin Notes', 'Catatan Admin')}</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">{order.reviewer_notes}</p>
          </div>
        )}

        {order.policy_document_url && (
          <a
            href={order.policy_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
          >
            <Download size={15} />
            {t('Download Policy', 'Unduh Polis')} — {order.policy_number}
          </a>
        )}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

const AgentOrderStatus: React.FC<Props> = ({ agentId, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [orders, setOrders] = useState<SpPolicyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [selected, setSelected] = useState<SpPolicyOrder | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getAgentOrders(agentId);
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agentId]);

  const FILTERS = [
    { id: 'ALL',          en: 'All',      id_: 'Semua' },
    { id: 'SUBMITTED',    en: 'Pending',  id_: 'Menunggu' },
    { id: 'UNDER_REVIEW', en: 'Review',   id_: 'Review' },
    { id: 'ISSUED',       en: 'Issued',   id_: 'Terbit' },
    { id: 'REJECTED',     en: 'Rejected', id_: 'Ditolak' },
  ];

  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      {/* Filter row */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f.id
                ? 'bg-primary-500 text-white shadow-md shadow-orange-500/25'
                : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/10'
            }`}
          >
            {lang === Language.EN ? f.en : f.id_}
            {` (${f.id === 'ALL' ? orders.length : orders.filter(o => o.status === f.id).length})`}
          </button>
        ))}
        <button onClick={load} className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400">
          <RefreshCw size={12} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-9 h-9 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <FileText size={20} className="text-slate-400" />
          </div>
          <p className="font-black text-sm text-slate-400 uppercase tracking-widest">
            {t('No orders yet', 'Belum ada order')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(order => {
            const meta = STATUS_META[order.status];
            const VIcon = order.vehicle_type === 'MOTORCYCLE' ? Bike : Car;
            return (
              <button
                key={order.id}
                onClick={() => setSelected(order)}
                className="w-full text-left bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.75rem] p-4 flex items-start gap-3 active:scale-[0.98] transition-transform shadow-sm"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                  <VIcon size={18} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-black text-sm truncate">{order.client_name}</p>
                    <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {order.order_number} · {order.vehicle_details?.make} {order.vehicle_details?.model}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${meta.color}`}>
                      <meta.Icon size={9} />
                      {lang === Language.EN ? meta.en : meta.id}
                    </span>
                    <span className="text-[9px] font-bold text-primary-500">{formatIDR(order.total_premium)}</span>
                    {order.policy_document_url && (
                      <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5">
                        <Download size={9} /> {t('Download', 'Unduh')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <OrderSheet order={selected} lang={lang} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default AgentOrderStatus;
