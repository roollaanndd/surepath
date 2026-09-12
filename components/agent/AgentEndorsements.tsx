import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Language } from '../../types';
import {
  createEndorsement,
  getAgentEndorsements,
  getAgentOrders,
  type SpEndorsement,
  type SpPolicyOrder,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { AgentArtKeyframes, AgentHero, SpotEndorse, AgentEmpty } from './AgentArt';

interface Props {
  agentId: string;
  lang: Language;
}

const ENDORSEMENT_TYPES: SpEndorsement['type'][] = [
  'ADDRESS', 'PLATE', 'SUM_INSURED', 'ADDON', 'DRIVER', 'OTHER',
];

const TYPE_LABELS: Record<SpEndorsement['type'], string> = {
  ADDRESS:     'Perubahan Alamat',
  PLATE:       'Perubahan Plat Nomor',
  SUM_INSURED: 'Perubahan Harga Pertanggungan',
  ADDON:       'Tambah / Hapus Perluasan',
  DRIVER:      'Perubahan Pengemudi',
  OTHER:       'Lainnya',
};

const STATUS_STYLE: Record<SpEndorsement['status'], string> = {
  PENDING:  'bg-amber-500/10 text-amber-600 border-amber-500/30',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

const ENDORSEMENT_FEE = 50_000;

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AgentEndorsements: React.FC<Props> = ({ agentId, lang }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);

  const [endorsements, setEndorsements] = useState<SpEndorsement[]>([]);
  const [issuedOrders, setIssuedOrders] = useState<SpPolicyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [formOrderId, setFormOrderId] = useState('');
  const [formType, setFormType] = useState<SpEndorsement['type']>('ADDRESS');
  const [formOldValue, setFormOldValue] = useState('');
  const [formNewValue, setFormNewValue] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    Promise.all([
      getAgentEndorsements(agentId),
      getAgentOrders(agentId),
    ]).then(([endsm, orders]) => {
      setEndorsements(endsm);
      setIssuedOrders(orders.filter((o) => o.status === 'ISSUED'));
    }).finally(() => setLoading(false));
  }, [agentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOrderId || !formDescription.trim()) return;
    setSubmitting(true);
    const result = await createEndorsement({
      order_id:    formOrderId,
      agent_id:    agentId,
      type:        formType,
      description: formDescription.trim(),
      old_value:   formOldValue.trim() || undefined,
      new_value:   formNewValue.trim() || undefined,
      fee:         ENDORSEMENT_FEE,
    });
    setSubmitting(false);
    if (result) {
      setEndorsements((prev) => [result, ...prev]);
      setShowModal(false);
      resetForm();
      setSuccessMsg(t('Endorsement request submitted!', 'Permintaan endors berhasil dikirim!'));
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  }

  function resetForm() {
    setFormOrderId('');
    setFormType('ADDRESS');
    setFormOldValue('');
    setFormNewValue('');
    setFormDescription('');
  }

  function openModal() {
    resetForm();
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 rounded-full border-4 border-ds-green/20 border-t-ds-green animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto font-sora">

      {/* Header + CTA — hero banner */}
      <AgentArtKeyframes />
      <AgentHero
        title={t('Endorsements', 'Endorsemen')}
        subtitle={t('Policy amendment requests', 'Permintaan perubahan polis')}
        art={<SpotEndorse size={76} />}
      >
        <button
          onClick={openModal}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-sp-emerald rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:brightness-95 transition-all"
        >
          <Plus size={14} /> {t('Request', 'Ajukan')}
        </button>
      </AgentHero>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* List */}
      {endorsements.length === 0 ? (
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem]">
          <AgentEmpty
            title={t('No endorsement requests yet', 'Belum ada permintaan endorsemen')}
            desc={t('Submit a request to amend an issued policy.', 'Ajukan permintaan untuk mengubah polis yang sudah diterbitkan.')}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {endorsements.map((e) => (
            <div
              key={e.id}
              className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.5rem] p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border mr-2 ${STATUS_STYLE[e.status]}`}>
                    {e.status}
                  </span>
                  <span className="text-[10px] font-black text-ds-green uppercase tracking-widest">
                    {TYPE_LABELS[e.type]}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 flex-shrink-0">{fmtDate(e.created_at)}</span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-200">{e.description}</p>

              {(e.old_value || e.new_value) && (
                <div className="flex gap-2 text-[10px]">
                  {e.old_value && (
                    <span className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                      {t('Old:', 'Lama:')} {e.old_value}
                    </span>
                  )}
                  {e.new_value && (
                    <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      {t('New:', 'Baru:')} {e.new_value}
                    </span>
                  )}
                </div>
              )}

              {e.reviewer_notes && (
                <div className={`text-[10px] px-3 py-2 rounded-xl ${e.status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                  <span className="font-black">{t('Notes: ', 'Catatan: ')}</span>{e.reviewer_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-ds-card2 rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t('Request Endorsement', 'Ajukan Endorsemen')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center"
              >
                <X size={14} className="text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order select */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('Select Policy', 'Pilih Polis')}
                </label>
                {issuedOrders.length === 0 ? (
                  <p className="text-xs text-rose-500">{t('No issued policies found.', 'Tidak ada polis yang diterbitkan.')}</p>
                ) : (
                  <select
                    required
                    value={formOrderId}
                    onChange={(e) => setFormOrderId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-ds-green"
                  >
                    <option value="">{t('— Select —', '— Pilih —')}</option>
                    {issuedOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number ?? o.id.slice(0, 8)} — {o.client_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('Type of Change', 'Jenis Perubahan')}
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as SpEndorsement['type'])}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-ds-green"
                >
                  {ENDORSEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              {/* Old / New value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                    {t('Current Value', 'Nilai Sekarang')}
                  </label>
                  <input
                    type="text"
                    value={formOldValue}
                    onChange={(e) => setFormOldValue(e.target.value)}
                    placeholder={t('e.g. B 1234 ABC', 'mis. B 1234 ABC')}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-ds-green"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                    {t('New Value', 'Nilai Baru')}
                  </label>
                  <input
                    type="text"
                    value={formNewValue}
                    onChange={(e) => setFormNewValue(e.target.value)}
                    placeholder={t('e.g. B 5678 XYZ', 'mis. B 5678 XYZ')}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-ds-green"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('Description', 'Keterangan')} *
                </label>
                <textarea
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder={t('Describe the requested change…', 'Jelaskan perubahan yang diminta…')}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-ds-green resize-none"
                />
              </div>

              {/* Fee notice */}
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3">
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                  {t('Endorsement Fee', 'Biaya Endorsemen')}
                </span>
                <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                  {formatIDR(ENDORSEMENT_FEE)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || !formOrderId}
                className="w-full py-3 bg-gradient-to-br from-ds-green to-ds-green-dk hover:brightness-105 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {submitting ? t('Submitting…', 'Mengirim…') : t('Submit Request', 'Kirim Permintaan')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentEndorsements;
