import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, X, ChevronRight, AlertCircle,
  CheckCircle, Clock, XCircle, Search, Car, Plane, Shield, Package
} from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentClaims, submitClaim, getAgentPolicies,
  type SpClaim, type SpPolicy,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { AgentArtKeyframes, AgentHero, SpotClaims, AgentEmpty } from './AgentArt';

interface Props {
  agentId: string;
  lang: Language;
}

type ClaimStatus = SpClaim['status'] | 'ALL';

const STATUS_META: Record<SpClaim['status'], { label: string; labelId: string; color: string; Icon: any }> = {
  SUBMITTED:    { label: 'Submitted',    labelId: 'Diajukan',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',   Icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', labelId: 'Ditinjau',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',        Icon: AlertCircle },
  APPROVED:     { label: 'Approved',     labelId: 'Disetujui',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', Icon: CheckCircle },
  REJECTED:     { label: 'Rejected',     labelId: 'Ditolak',       color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',          Icon: XCircle },
  CLOSED:       { label: 'Closed',       labelId: 'Ditutup',       color: 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400',      Icon: FileText },
};

const PRODUCT_ICONS: Record<string, any> = { CAR: Car, TRAVEL: Plane, PA: Shield, MPAR: Package };

const FILTERS: Array<{ id: ClaimStatus; en: string; id_: string }> = [
  { id: 'ALL',          en: 'All',          id_: 'Semua' },
  { id: 'SUBMITTED',    en: 'Submitted',    id_: 'Diajukan' },
  { id: 'UNDER_REVIEW', en: 'In Review',    id_: 'Ditinjau' },
  { id: 'APPROVED',     en: 'Approved',     id_: 'Disetujui' },
  { id: 'REJECTED',     en: 'Rejected',     id_: 'Ditolak' },
];

function timeAgo(iso?: string): string {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

// ── Submit Claim Sheet ──────────────────────────────────────────────────────

interface SubmitSheetProps {
  agentId: string;
  policies: SpPolicy[];
  lang: Language;
  onClose: () => void;
  onSubmitted: () => void;
}

const SubmitClaimSheet: React.FC<SubmitSheetProps> = ({ agentId, policies, lang, onClose, onSubmitted }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [policyId, setPolicyId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [chronology, setChronology] = useState('');
  const [estimated, setEstimated] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPolicy = policies.find(p => p.id === policyId);

  const handleSubmit = async () => {
    if (!policyId || !date || !location || !chronology) {
      setError(t('Please fill all required fields.', 'Mohon lengkapi semua field wajib.'));
      return;
    }
    setSaving(true);
    const result = await submitClaim({
      agent_id: agentId,
      policy_id: policyId,
      client_name: selectedPolicy?.client_name ?? '',
      policy_number: selectedPolicy?.policy_number ?? '',
      product_type: selectedPolicy?.type ?? '',
      date,
      location,
      chronology,
      status: 'SUBMITTED',
      amount_estimated: estimated ? parseFloat(estimated) : undefined,
    });
    setSaving(false);
    if (!result) {
      setError(t('Failed to submit claim. Please try again.', 'Gagal mengajukan klaim. Silakan coba lagi.'));
      return;
    }
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        className="bg-white dark:bg-ds-card rounded-t-[2.5rem] p-6 pb-10 max-h-[90dvh] overflow-y-auto font-sora"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg tracking-tight">
            {t('File New Claim', 'Ajukan Klaim Baru')}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Policy select */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
              {t('Policy *', 'Polis *')}
            </label>
            <select
              value={policyId}
              onChange={e => setPolicyId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-sm font-medium border border-slate-100 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ds-green"
            >
              <option value="">{t('Select a policy…', 'Pilih polis…')}</option>
              {policies.filter(p => p.status === 'ACTIVE').map(p => (
                <option key={p.id} value={p.id}>
                  {p.policy_number ?? p.id.slice(0, 8)} — {p.client_name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          {/* Incident date */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
              {t('Incident Date *', 'Tanggal Kejadian *')}
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-sm font-medium border border-slate-100 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ds-green"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
              {t('Location *', 'Lokasi Kejadian *')}
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t('e.g. Jl. Sudirman, Jakarta', 'cth: Jl. Sudirman, Jakarta')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-sm font-medium border border-slate-100 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ds-green"
            />
          </div>

          {/* Chronology */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
              {t('Incident Description *', 'Kronologi Kejadian *')}
            </label>
            <textarea
              value={chronology}
              onChange={e => setChronology(e.target.value)}
              rows={4}
              placeholder={t('Describe what happened…', 'Jelaskan kronologi kejadian…')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-sm font-medium border border-slate-100 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ds-green resize-none"
            />
          </div>

          {/* Estimated amount */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
              {t('Estimated Loss (IDR)', 'Estimasi Kerugian (IDR)')}
            </label>
            <input
              type="number"
              value={estimated}
              onChange={e => setEstimated(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-sm font-medium border border-slate-100 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ds-green"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-between p-5 bg-gradient-to-br from-ds-green to-ds-green-dk hover:brightness-105 disabled:opacity-60 rounded-2xl text-white font-black uppercase tracking-widest transition-all active:scale-95 motion-reduce:active:scale-100 shadow-lg shadow-ds-green/25 group"
          >
            {saving ? t('Submitting…', 'Mengajukan…') : t('Submit Claim', 'Ajukan Klaim')}
            <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Claim Detail Sheet ──────────────────────────────────────────────────────

const ClaimDetail: React.FC<{ claim: SpClaim; lang: Language; onClose: () => void }> = ({ claim, lang, onClose }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const meta = STATUS_META[claim.status];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        className="bg-white dark:bg-ds-card rounded-t-[2.5rem] p-6 pb-10 max-h-[80dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg tracking-tight">{claim.claim_number ?? 'Claim'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 ${meta.color}`}>
          <meta.Icon size={11} />
          {lang === Language.EN ? meta.label : meta.labelId}
        </div>

        <div className="space-y-3">
          {[
            [t('Client', 'Klien'), claim.client_name],
            [t('Policy', 'Polis'), claim.policy_number ?? '-'],
            [t('Product', 'Produk'), claim.product_type ?? '-'],
            [t('Date', 'Tanggal'), claim.date ?? '-'],
            [t('Location', 'Lokasi'), claim.location ?? '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-start py-2.5 border-b border-slate-50 dark:border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
              <span className="text-sm font-bold text-right max-w-[60%]">{value}</span>
            </div>
          ))}
          {claim.amount_estimated && (
            <div className="flex justify-between items-start py-2.5 border-b border-slate-50 dark:border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('Est. Loss', 'Est. Kerugian')}</span>
              <span className="text-sm font-bold">{formatIDR(claim.amount_estimated)}</span>
            </div>
          )}
          {claim.amount_approved !== undefined && claim.amount_approved !== null && (
            <div className="flex justify-between items-start py-2.5 border-b border-slate-50 dark:border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('Approved', 'Disetujui')}</span>
              <span className="text-sm font-bold text-emerald-500">{formatIDR(claim.amount_approved)}</span>
            </div>
          )}
        </div>

        {claim.chronology && (
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('Description', 'Kronologi')}</p>
            <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{claim.chronology}</p>
          </div>
        )}

        {claim.admin_notes && (
          <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">{t('Admin Notes', 'Catatan Admin')}</p>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{claim.admin_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main ────────────────────────────────────────────────────────────────────

const AgentClaims: React.FC<Props> = ({ agentId, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [claims, setClaims] = useState<SpClaim[]>([]);
  const [policies, setPolicies] = useState<SpPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClaimStatus>('ALL');
  const [search, setSearch] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [selected, setSelected] = useState<SpClaim | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, p] = await Promise.all([getAgentClaims(agentId), getAgentPolicies(agentId)]);
    setClaims(c);
    setPolicies(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agentId]);

  const filtered = claims.filter(c => {
    if (filter !== 'ALL' && c.status !== filter) return false;
    const q = search.toLowerCase();
    if (q) {
      return (
        (c.client_name ?? '').toLowerCase().includes(q) ||
        (c.claim_number ?? '').toLowerCase().includes(q) ||
        (c.policy_number ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="px-4 pt-4 pb-6 font-sora">
      {/* Hero banner */}
      <AgentArtKeyframes />
      <AgentHero
        title={t('Claims', 'Klaim')}
        subtitle={`${claims.length} ${t('total claims — file and track on behalf of your clients.', 'klaim — ajukan dan pantau atas nama klien Anda.')}`}
        art={<SpotClaims size={76} />}
        className="mb-4"
      >
        <button
          onClick={() => setShowSubmit(true)}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-white text-sp-emerald rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 motion-reduce:active:scale-100 hover:brightness-95 transition-all"
        >
          <Plus size={14} />
          {t('File Claim', 'Ajukan Klaim')}
        </button>
      </AgentHero>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('Search claims…', 'Cari klaim…')}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ds-green"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f.id
                ? 'bg-ds-green text-white shadow-md shadow-ds-green/25'
                : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/10'
            }`}
          >
            {lang === Language.EN ? f.en : f.id_}
          </button>
        ))}
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-4 border-ds-green/20 border-t-ds-green animate-spin motion-reduce:animate-none" />
        </div>
      ) : filtered.length === 0 ? (
        <AgentEmpty
          title={t('No claims yet', 'Belum ada klaim')}
          desc={t('File a claim on behalf of your client', 'Ajukan klaim untuk klien Anda')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => {
            const meta = STATUS_META[claim.status];
            const Icon = PRODUCT_ICONS[claim.product_type ?? ''] ?? FileText;
            return (
              <button
                key={claim.id}
                onClick={() => setSelected(claim)}
                className="w-full text-left bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.75rem] p-5 flex items-start gap-4 active:scale-[0.98] transition-transform shadow-sm"
              >
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-black text-sm truncate">{claim.client_name ?? '-'}</p>
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0 ml-2" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {claim.claim_number ?? claim.id.slice(0, 8)} · {claim.product_type ?? '-'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${meta.color}`}>
                      <meta.Icon size={9} />
                      {lang === Language.EN ? meta.label : meta.labelId}
                    </span>
                    {claim.amount_estimated && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {formatIDR(claim.amount_estimated)}
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 ml-auto">
                      {timeAgo(claim.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showSubmit && (
        <SubmitClaimSheet
          agentId={agentId}
          policies={policies}
          lang={lang}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => { setShowSubmit(false); load(); }}
        />
      )}

      {selected && (
        <ClaimDetail
          claim={selected}
          lang={lang}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default AgentClaims;
