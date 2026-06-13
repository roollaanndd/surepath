import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import {
  getAdminEndorsements,
  reviewEndorsement,
  type SpEndorsement,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

const TYPE_LABELS: Record<string, string> = {
  ADDRESS:     'Perubahan Alamat',
  PLATE:       'Perubahan Plat',
  SUM_INSURED: 'Harga Pertanggungan',
  ADDON:       'Perluasan',
  DRIVER:      'Pengemudi',
  OTHER:       'Lainnya',
};

const TYPE_COLOR: Record<string, string> = {
  ADDRESS:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PLATE:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SUM_INSURED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ADDON:       'bg-teal-500/10 text-teal-400 border-teal-500/20',
  DRIVER:      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  OTHER:       'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Tab = 'PENDING' | 'HISTORY';

const EndorsementsAdminView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [notesFor, setNotesFor] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);

  async function load() {
    setLoading(true);
    const data = await getAdminEndorsements();
    setEndorsements(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const pending = endorsements.filter((e) => e.status === 'PENDING');
  const history = endorsements.filter((e) => e.status !== 'PENDING');
  const visible = tab === 'PENDING' ? pending : history;

  async function doReview(id: string, status: 'APPROVED' | 'REJECTED', notes?: string) {
    setActionId(id);
    await reviewEndorsement(id, status, notes);
    setEndorsements((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status, reviewer_notes: notes ?? null, reviewed_at: new Date().toISOString() }
          : e,
      ),
    );
    setActionId(null);
    setNotesFor(null);
    setNotesInput('');
  }

  function promptAction(id: string, action: 'APPROVED' | 'REJECTED') {
    setNotesFor({ id, action });
    setNotesInput('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Endorsemen <span className="text-emerald-500">Polis</span>
          </h2>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">
            Persetujuan perubahan polis dari agen
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['PENDING', 'HISTORY'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            {t === 'PENDING' ? `Menunggu (${pending.length})` : `Riwayat (${history.length})`}
          </button>
        ))}
      </div>

      {/* Notes modal */}
      {notesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-white">
              {notesFor.action === 'APPROVED' ? 'Setujui Endorsemen' : 'Tolak Endorsemen'}
            </h3>
            <textarea
              rows={3}
              placeholder={notesFor.action === 'APPROVED' ? 'Catatan persetujuan (opsional)' : 'Alasan penolakan…'}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => doReview(notesFor.id, notesFor.action, notesInput || undefined)}
                disabled={notesFor.action === 'REJECTED' && !notesInput.trim()}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
                  notesFor.action === 'APPROVED'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {notesFor.action === 'APPROVED' ? 'Setujui' : 'Tolak'}
              </button>
              <button
                onClick={() => setNotesFor(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-10 text-center">
          <p className="text-gray-500 text-sm">
            {tab === 'PENDING' ? 'Tidak ada endorsemen yang menunggu persetujuan.' : 'Belum ada riwayat endorsemen.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((e) => {
            const agentName = e.sp_users?.name ?? '—';
            const agentCode = e.sp_users?.agent_code ?? '';
            const orderNum  = e.sp_policy_orders?.order_number ?? e.order_id?.slice(0, 8);
            const clientName = e.sp_policy_orders?.client_name ?? '—';

            return (
              <div
                key={e.id}
                className="bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-5 space-y-3"
              >
                {/* Top row */}
                <div className="flex items-start gap-3 justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${TYPE_COLOR[e.type] ?? TYPE_COLOR.OTHER}`}>
                        {TYPE_LABELS[e.type] ?? e.type}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_STYLE[e.status]}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-xs font-black text-white">
                      Agen: {agentName} <span className="text-emerald-500">{agentCode}</span>
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Order: <span className="text-gray-300">{orderNum}</span> — {clientName}
                    </p>
                  </div>
                  <span className="text-[9px] text-gray-600 flex-shrink-0">{fmtDate(e.created_at)}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-300">{e.description}</p>

                {/* Old / New */}
                {(e.old_value || e.new_value) && (
                  <div className="flex gap-2 flex-wrap text-[10px]">
                    {e.old_value && (
                      <span className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                        Lama: {e.old_value}
                      </span>
                    )}
                    {e.new_value && (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                        Baru: {e.new_value}
                      </span>
                    )}
                  </div>
                )}

                {/* Fee */}
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>Biaya endorsemen</span>
                  <span className="font-black text-amber-400">{formatIDR(e.fee ?? 50000)}</span>
                </div>

                {/* Reviewer notes */}
                {e.reviewer_notes && (
                  <div className={`text-[10px] px-3 py-2 rounded-xl border ${e.status === 'REJECTED' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                    <span className="font-black">Catatan reviewer: </span>{e.reviewer_notes}
                  </div>
                )}

                {/* Actions — only for PENDING */}
                {e.status === 'PENDING' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => promptAction(e.id, 'APPROVED')}
                      disabled={actionId === e.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                    >
                      <Check size={12} /> Setujui
                    </button>
                    <button
                      onClick={() => promptAction(e.id, 'REJECTED')}
                      disabled={actionId === e.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                    >
                      <X size={12} /> Tolak
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EndorsementsAdminView;
