// PolicyUploadReminder.tsx — popup pengingat SLA upload softcopy polis.
//
// Muncul saat insurer membuka app dan masih ada pengajuan yang sudah
// di-APPROVE tapi polisnya belum diupload. Deadline dibaca dari
// sp_policy_orders.policy_upload_deadline (diisi gateway saat decision
// APPROVED; fallback: insurer_decision_at + 72 jam untuk data lama).
//
// Perilaku snooze: "Nanti" menunda 4 jam (localStorage). Item yang sudah
// LEWAT deadline mengabaikan snooze — popup selalu muncul lagi saat app
// dibuka sampai polis diupload.

import React, { useEffect, useState } from 'react';
import { Upload, Clock, AlertTriangle, X } from 'lucide-react';
import { getInsurerDashboard, type InsurerOrder } from '../../services/insurerService';

const SNOOZE_KEY = 'sp_policy_upload_reminder_snooze';
const SNOOZE_MS = 4 * 60 * 60 * 1000; // 4 jam
const FALLBACK_SLA_MS = 72 * 60 * 60 * 1000; // 72 jam bila kolom deadline kosong

interface PendingUpload {
  order: InsurerOrder;
  deadline: Date;
  overdue: boolean;
  hoursLeft: number;
}

function computePending(orders: InsurerOrder[]): PendingUpload[] {
  const now = Date.now();
  return orders
    .filter(o =>
      o.insurer_decision === 'APPROVED'
      && !o.policy_document_url
      && o.status !== 'ISSUED'
      && o.status !== 'CANCELLED')
    .map(o => {
      const deadline = o.policy_upload_deadline
        ? new Date(o.policy_upload_deadline)
        : new Date(new Date(o.insurer_decision_at ?? o.created_at).getTime() + FALLBACK_SLA_MS);
      const hoursLeft = (deadline.getTime() - now) / 3600000;
      return { order: o, deadline, overdue: hoursLeft <= 0, hoursLeft };
    })
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}

function isSnoozed(): boolean {
  try {
    const ts = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    return Date.now() - ts < SNOOZE_MS;
  } catch { return false; }
}

const fmtDeadline = (d: Date) =>
  d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const PolicyUploadReminder: React.FC<{ authToken: string; onGoToOrders: () => void }> = ({ authToken, onGoToOrders }) => {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    getInsurerDashboard(authToken)
      .then(d => {
        if (cancelled) return;
        const p = computePending(d.orders);
        if (p.length === 0) return;
        const hasOverdue = p.some(x => x.overdue);
        // Overdue selalu tampil; sisanya hormati snooze
        if (hasOverdue || !isSnoozed()) {
          setPending(p);
          setShow(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authToken]);

  if (!show || pending.length === 0) return null;

  const overdueCount = pending.filter(p => p.overdue).length;
  const urgent = overdueCount > 0;

  const dismiss = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* noop */ }
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[8000] flex items-end justify-center p-4 sm:items-center" style={{ background: 'rgba(6,15,25,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0F1829] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${urgent ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${urgent ? 'bg-rose-500/15' : 'bg-amber-500/15'}`}>
              {urgent
                ? <AlertTriangle size={22} className="text-rose-500" />
                : <Clock size={22} className="text-amber-500" />}
            </div>
            <button onClick={dismiss} aria-label="Tutup" className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <X size={15} />
            </button>
          </div>
          <h3 className="mt-3 text-lg font-black text-gray-900 dark:text-white leading-tight">
            {urgent
              ? `${overdueCount} polis LEWAT batas waktu upload`
              : `${pending.length} polis menunggu diupload`}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pengajuan yang sudah Anda setujui wajib dilengkapi softcopy polis (PDF) dalam 72 jam.
          </p>
        </div>

        {/* List */}
        <div className="px-6 py-4 space-y-2 max-h-[40vh] overflow-y-auto">
          {pending.slice(0, 5).map(({ order, deadline, overdue, hoursLeft }) => (
            <div key={order.id} className={`p-3 rounded-xl border ${overdue ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/20' : 'border-gray-200 dark:border-[#1E2D3D] bg-gray-50 dark:bg-[#162035]'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">{order.order_number ?? order.id.slice(0, 8)}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{order.client_name} · {order.product_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${overdue ? 'text-rose-500' : hoursLeft < 24 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {overdue ? 'TERLAMBAT' : hoursLeft < 24 ? `${Math.max(1, Math.round(hoursLeft))} jam lagi` : `${Math.round(hoursLeft / 24)} hari lagi`}
                  </p>
                  <p className="text-[10px] text-gray-400">{fmtDeadline(deadline)}</p>
                </div>
              </div>
            </div>
          ))}
          {pending.length > 5 && (
            <p className="text-center text-[11px] text-gray-400">+{pending.length - 5} lainnya</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={() => { setShow(false); onGoToOrders(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-white uppercase tracking-wider bg-emerald-500 active:scale-[0.98] transition-transform"
          >
            <Upload size={15} /> Upload Sekarang
          </button>
          <button
            onClick={dismiss}
            className="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-gray-500 bg-black/5 dark:bg-white/5 active:scale-[0.98] transition-transform"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyUploadReminder;
