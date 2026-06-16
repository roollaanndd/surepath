import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Eye, CheckCircle, XCircle, Download, ChevronRight, Car, Bike, RefreshCw,
  CreditCard, Loader2, ExternalLink,
} from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentOrders, getPaymentsByOrderIds,
  type SpPolicyOrder, type SpPayment,
} from '../../services/supabaseService';
import { createXenditInvoice } from '../../services/paymentService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agentId: string;
  lang: Language;
}

const STATUS_META: Record<SpPolicyOrder['status'], { en: string; id: string; color: string; Icon: any }> = {
  SUBMITTED:    { en: 'Submitted',    id: 'Diajukan',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',       Icon: Clock },
  UNDER_REVIEW: { en: 'In Review',    id: 'Ditinjau',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',            Icon: Eye },
  APPROVED:     { en: 'Approved',     id: 'Disetujui',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', Icon: CheckCircle },
  ISSUED:       { en: 'Policy Issued',id: 'Polis Terbit', color: 'bg-[#16a34a]/10 text-[#16a34a]',                                            Icon: FileText },
  REJECTED:     { en: 'Rejected',     id: 'Ditolak',     color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',             Icon: XCircle },
  CANCELLED:    { en: 'Cancelled',    id: 'Dibatalkan',  color: 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400',         Icon: XCircle },
};

// ── Detail Sheet ─────────────────────────────────────────────────────────────

const OrderSheet: React.FC<{
  order: SpPolicyOrder;
  lang: Language;
  onClose: () => void;
  payment?: SpPayment | null;
  onPay?: () => void;
  paying?: boolean;
}> = ({ order, lang, onClose, payment, onPay, paying }) => {
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

        {/* Payment section */}
        {(order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW') && (
          <div className={`p-4 rounded-2xl mb-4 ${
            payment?.status === 'PAID'
              ? 'bg-emerald-50 dark:bg-emerald-500/10'
              : payment?.status === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-500/10'
              : 'bg-slate-50 dark:bg-white/5'
          }`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <CreditCard size={10} /> {t('Payment', 'Pembayaran')}
            </p>
            {payment?.status === 'PAID' ? (
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ✓ {t('Premium Paid', 'Premi Telah Dibayar')}
                {payment.paid_at && ` · ${new Date(payment.paid_at).toLocaleDateString('id-ID')}`}
              </p>
            ) : payment?.status === 'PENDING' && payment.invoice_url ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  {t('Awaiting payment', 'Menunggu pembayaran')}
                </p>
                <a
                  href={payment.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-black text-white bg-amber-500 rounded-xl px-4 py-2.5 justify-center active:scale-95 transition-transform"
                >
                  <ExternalLink size={12} />
                  {t('Continue Payment', 'Lanjutkan Pembayaran')}
                </a>
              </div>
            ) : (
              <button
                onClick={onPay}
                disabled={paying}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-[#16a34a] to-[#15803d] disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 motion-reduce:active:scale-100 hover:brightness-105 transition-all"
              >
                {paying ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                {paying ? t('Creating Invoice…', 'Membuat Invoice…') : t('Pay Premium', 'Bayar Premi')}
              </button>
            )}
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
  const [payments, setPayments] = useState<Record<string, SpPayment>>({});
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getAgentOrders(agentId);
    setOrders(data);
    if (data.length > 0) {
      const pmts = await getPaymentsByOrderIds(data.map(o => o.id));
      const map: Record<string, SpPayment> = {};
      pmts.forEach(p => { if (!map[p.order_id]) map[p.order_id] = p; });
      setPayments(map);
    }
    setLoading(false);
  };

  const handlePay = async (order: SpPolicyOrder) => {
    setPayingOrderId(order.id);
    const result = await createXenditInvoice({
      order_id: order.id,
      order_number: order.order_number ?? order.id,
      client_name: order.client_name,
      client_phone: order.client_phone ?? undefined,
      product_name: order.product_name,
      total_premium: order.total_premium,
    });
    if (result?.invoice_url) {
      setPayments(prev => ({
        ...prev,
        [order.id]: {
          id: result.xendit_invoice_id,
          order_id: order.id,
          external_id: result.external_id,
          xendit_invoice_id: result.xendit_invoice_id,
          invoice_url: result.invoice_url,
          amount: order.total_premium,
          currency: 'IDR',
          status: 'PENDING',
        } as SpPayment,
      }));
      window.open(result.invoice_url, '_blank', 'noopener,noreferrer');
    }
    setPayingOrderId(null);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, [agentId]);

  const FILTERS = [
    { id: 'ALL',          en: 'All',       id_: 'Semua' },
    { id: 'SUBMITTED',    en: 'Pending',   id_: 'Menunggu' },
    { id: 'UNDER_REVIEW', en: 'Review',    id_: 'Review' },
    { id: 'ISSUED',       en: 'Issued',    id_: 'Terbit' },
    { id: 'REJECTED',     en: 'Rejected',  id_: 'Ditolak' },
    { id: 'CANCELLED',    en: 'Cancelled', id_: 'Dibatalkan' },
  ];

  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="font-sora">
      {/* Filter row */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f.id
                ? 'bg-[#16a34a] text-white shadow-md shadow-[#16a34a]/25'
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
          <div className="w-9 h-9 rounded-full border-4 border-[#16a34a]/20 border-t-[#16a34a] animate-spin motion-reduce:animate-none" />
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
                    <span className="text-[9px] font-bold text-[#16a34a]">{formatIDR(order.total_premium)}</span>
                    {(order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW') && (() => {
                      const pmt = payments[order.id];
                      if (pmt?.status === 'PAID') return (
                        <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5">
                          <CheckCircle size={9} /> {t('Paid', 'Lunas')}
                        </span>
                      );
                      if (pmt?.status === 'PENDING') return (
                        <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5">
                          <CreditCard size={9} /> {t('Pending', 'Bayar')}
                        </span>
                      );
                      return (
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                          <CreditCard size={9} /> {t('Unpaid', 'Belum Bayar')}
                        </span>
                      );
                    })()}
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
        <OrderSheet
          order={selected}
          lang={lang}
          onClose={() => setSelected(null)}
          payment={payments[selected.id]}
          onPay={() => handlePay(selected)}
          paying={payingOrderId === selected.id}
        />
      )}
    </div>
  );
};

export default AgentOrderStatus;
