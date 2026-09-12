import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Language } from '../../types';
import {
  createPolicyOrder,
  upsertRenewal,
  type SpPolicyOrder,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

export interface RenewalModalProps {
  order: SpPolicyOrder;
  agentId: string;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

function fmt(d?: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-slate-400 font-bold shrink-0">{label}</span>
      <span className="text-xs font-black text-right">{value}</span>
    </div>
  );
}

const RenewalModal: React.FC<RenewalModalProps> = ({ order, agentId, lang, onClose, onSuccess }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [err,    setErr]    = useState('');

  const currentEnd = order.end_date ? new Date(order.end_date) : new Date();
  const newStart   = new Date(currentEnd);
  newStart.setDate(newStart.getDate() + 1);
  const newEnd = new Date(newStart);
  newEnd.setFullYear(newEnd.getFullYear() + 1);
  const newStartStr = newStart.toISOString().split('T')[0];
  const newEndStr   = newEnd.toISOString().split('T')[0];

  const handleCreate = async () => {
    setSaving(true);
    setErr('');
    try {
      const newOrder = await createPolicyOrder({
        agent_id:          agentId,
        client_id:         order.client_id,
        client_name:       order.client_name,
        client_phone:      order.client_phone,
        client_ktp:        order.client_ktp,
        product_code:      order.product_code,
        product_name:      order.product_name,
        vehicle_type:      order.vehicle_type,
        vehicle_details:   order.vehicle_details ?? {},
        coverage_type:     order.coverage_type,
        sum_insured:       order.sum_insured,
        zone:              order.zone,
        vehicle_category:  order.vehicle_category,
        addons:            order.addons ?? {},
        base_premium:      order.base_premium,
        addon_premium:     order.addon_premium,
        admin_fee:         order.admin_fee,
        stamp_duty:        order.stamp_duty,
        total_premium:     order.total_premium,
        ojk_rate:          order.ojk_rate,
        discount_rate:     order.discount_rate,
        discount_amount:   order.discount_amount,
        net_premium:       order.net_premium,
        commission_rate:   order.commission_rate,
        commission_amount: order.commission_amount,
        coin_reward:       order.coin_reward,
        start_date:        newStartStr,
        end_date:          newEndStr,
        status:            'SUBMITTED',
        insurer_id:        order.insurer_id,
        insurer_name:      order.insurer_name,
      });

      if (!newOrder) {
        setErr(t('Failed to create renewal order.', 'Gagal membuat order renewal.'));
        setSaving(false);
        return;
      }

      await upsertRenewal({
        original_order_id: order.id,
        agent_id:          agentId,
        client_name:       order.client_name,
        client_phone:      order.client_phone,
        product_name:      order.product_name,
        expiry_date:       order.end_date ?? '',
      });

      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (e) {
      setErr(String(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-8 sm:pb-0">
      <div className="w-full max-w-md bg-white dark:bg-ds-card rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <p className="font-black text-base tracking-tight">{t('Process Renewal', 'Proses Renewal')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{order.client_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-2">
          <SummaryRow label={t('Product', 'Produk')}                  value={order.product_name} />
          <SummaryRow label={t('Coverage', 'Tipe Proteksi')}          value={order.coverage_type} />
          <SummaryRow label={t('Sum Insured', 'Uang Pertanggungan')}  value={formatIDR(order.sum_insured)} />
          <SummaryRow label={t('Premium', 'Premi')}                   value={formatIDR(order.total_premium)} />
          <SummaryRow label={t('New Period', 'Periode Baru')}         value={`${fmt(newStartStr)} – ${fmt(newEndStr)}`} />
          {order.insurer_name && (
            <SummaryRow label={t('Insurer', 'Penanggung')} value={order.insurer_name} />
          )}
        </div>

        {err && <p className="mx-6 text-xs text-rose-600 dark:text-rose-400 font-bold">{err}</p>}

        <div className="px-6 pb-6 pt-2">
          {done ? (
            <div className="flex items-center gap-2 justify-center py-3 text-emerald-600 font-black text-sm">
              <CheckCircle size={18} />
              {t('Renewal order created!', 'Order renewal berhasil dibuat!')}
            </div>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full py-3.5 bg-gradient-to-br from-ds-green to-ds-green-dk text-white rounded-2xl font-black text-sm tracking-tight disabled:opacity-60 active:scale-[0.98] motion-reduce:active:scale-100 hover:brightness-105 transition-all shadow-lg shadow-ds-green/25"
            >
              {saving ? t('Creating…', 'Membuat…') : t('Create Renewal Order', 'Buat Order Renewal')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenewalModal;
