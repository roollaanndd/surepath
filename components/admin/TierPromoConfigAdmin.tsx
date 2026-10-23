import React, { useState, useEffect } from 'react';
import { Plus, X, Tag, Trash2, ChevronUp, ChevronDown, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { UserRole } from '../../types';
import { useToast, useConfirmDialog, usePromptDialog } from '../ui';
import {
  getAdminTiers, createTier, updateTier, deleteTier, reorderTiers,
  getTierChangeRequests, approveTierRequest, rejectTierRequest,
  evaluateAllAgentTiers,
  getPromoCodes, createPromoCode, updatePromoCode,
  type SpAgentTier, type SpTierChangeRequest, type SpPromoCode,
} from '../../services/supabaseService';

const SESSION_KEY = 'SUREPATH_SESSION';
const getAdminId = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')?.supabaseId ?? ''; }
  catch { return ''; }
};
const getAdminRole = (): string => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')?.role ?? ''; }
  catch { return ''; }
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const APPROVAL_ROLE_OPTIONS = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR];
const canManageStructure = (role: string) => [UserRole.MASTER_ADMIN, UserRole.ADMIN].includes(role as UserRole);

// ─── Tier Config Tab (full CRUD, thresholds, benefits, approval gating) ───────

type TierDraft = Partial<SpAgentTier> & { benefitsList: Array<{ key: string; value: string }> };

const toDraft = (t: SpAgentTier): TierDraft => ({
  ...t,
  benefitsList: Object.entries(t.benefits ?? {}).map(([key, value]) => ({ key, value: String(value) })),
});

const emptyDraft = (): TierDraft => ({
  code: '', name: '', rank: 0, color: '#6b7280', emoji: '',
  min_policies_count: null, min_premium_amount: null,
  coin_bonus_rate: 0, l1_override_rate: 0.02, l2_override_rate: 0,
  requires_approval: false, approval_roles: ['MASTER_ADMIN'],
  is_active: true, benefitsList: [],
});

const TierConfigTab: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [tiers, setTiers] = useState<SpAgentTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<TierDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalSummary, setEvalSummary] = useState<string | null>(null);
  const role = getAdminRole();
  const canManage = canManageStructure(role);

  const load = () => {
    setLoading(true);
    getAdminTiers().then(data => { setTiers(data); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const startEdit = (tier: SpAgentTier) => { setEditingCode(tier.code); setDraft(toDraft(tier)); setCreating(false); setError(''); };
  const startCreate = () => { setEditingCode(null); setDraft(emptyDraft()); setCreating(true); setError(''); };
  const cancelEdit = () => { setEditingCode(null); setDraft(null); setCreating(false); setError(''); };

  const setDraftField = (field: keyof TierDraft, value: unknown) => {
    setDraft(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const setRateField = (field: 'coin_bonus_rate' | 'l1_override_rate' | 'l2_override_rate', raw: string) => {
    const val = parseFloat(raw) / 100;
    if (isNaN(val)) return;
    setDraftField(field, val);
  };

  const toggleApprovalRole = (r: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const cur = prev.approval_roles ?? [];
      const next = cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r];
      return { ...prev, approval_roles: next.length > 0 ? next : cur };
    });
  };

  const addBenefitRow = () => setDraft(prev => prev ? { ...prev, benefitsList: [...prev.benefitsList, { key: '', value: '' }] } : prev);
  const removeBenefitRow = (idx: number) => setDraft(prev => prev ? { ...prev, benefitsList: prev.benefitsList.filter((_, i) => i !== idx) } : prev);
  const setBenefitRow = (idx: number, field: 'key' | 'value', value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const list = [...prev.benefitsList];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, benefitsList: list };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.code?.trim() || !draft.name?.trim()) { setError('Kode dan nama wajib diisi.'); return; }
    setSaving(true);
    setError('');
    const benefits = Object.fromEntries(draft.benefitsList.filter(b => b.key.trim()).map(b => [b.key.trim(), b.value]));
    const payload = {
      code: draft.code.toUpperCase().trim(),
      name: draft.name,
      color: draft.color,
      emoji: draft.emoji || null,
      min_policies_count: draft.min_policies_count,
      min_premium_amount: draft.min_premium_amount,
      coin_bonus_rate: draft.coin_bonus_rate,
      l1_override_rate: draft.l1_override_rate,
      l2_override_rate: draft.l2_override_rate,
      requires_approval: draft.requires_approval,
      approval_roles: draft.approval_roles,
      benefits,
    };
    if (creating) {
      const result = await createTier({ ...payload, rank: tiers.length });
      setSaving(false);
      if (result) { cancelEdit(); load(); } else { setError('Gagal membuat tier. Kode mungkin sudah dipakai.'); }
    } else {
      const ok = await updateTier(payload.code, payload);
      setSaving(false);
      if (ok) { cancelEdit(); load(); } else { setError('Gagal menyimpan perubahan.'); }
    }
  };

  const handleDelete = async (code: string) => {
    const ok = await confirm({
      title: `Nonaktifkan tier ${code}?`,
      description: 'Tier ini tidak bisa dihapus jika masih ada agen yang memakainya.',
      confirmLabel: 'Nonaktifkan',
      variant: 'danger',
    });
    if (!ok) return;
    const result = await deleteTier(code);
    if (result.success) load(); else toast.error(result.error ?? 'Gagal menghapus tier.');
  };

  const handleReorder = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    [next[idx], next[target]] = [next[target], next[idx]];
    const order = next.map((t, i) => ({ code: t.code, rank: i }));
    setTiers(next);
    await reorderTiers(order);
    load();
  };

  const setDefaultTier = async (code: string) => {
    await updateTier(code, { is_default: true });
    load();
  };

  const handleEvaluateAll = async () => {
    setEvaluating(true);
    setEvalSummary(null);
    const res = await evaluateAllAgentTiers();
    setEvaluating(false);
    if (res.error) { setEvalSummary(`Gagal: ${res.error}`); return; }
    const d = res.data ?? {};
    setEvalSummary(`${d.total ?? 0} agen dicek · ${d.applied ?? 0} tier diterapkan otomatis · ${d.queued ?? 0} masuk antrean persetujuan · ${d.unchanged ?? 0} tidak berubah`);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-ds-card2 border border-ds-border rounded-2xl p-4 text-[11px] text-ds-ink3 space-y-1">
        <p className="text-white font-bold text-xs mb-2">Cara Kerja Tier</p>
        <p>• <b>Override</b> = % dari <b>komisi</b> downline (bukan dari premi). <b>Bonus Koin</b> = koin tambahan per penjualan.</p>
        <p>• Threshold (jumlah polis / total premi) dipakai untuk evaluasi otomatis tier agen.</p>
        <p>• Tier dengan "Butuh Persetujuan" tidak langsung aktif — masuk antrean di tab Persetujuan Tier.</p>
      </div>

      {canManage && (
        <div className="flex items-center gap-2">
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.65rem] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
          >
            <Plus size={12} /> Tier Baru
          </button>
          <button
            onClick={handleEvaluateAll}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.65rem] font-black uppercase tracking-widest bg-ds-card2 text-ds-ink2 hover:bg-ds-card2 transition-all disabled:opacity-50"
          >
            <Sparkles size={12} /> {evaluating ? 'Mengevaluasi…' : 'Evaluasi Semua Agen'}
          </button>
        </div>
      )}
      {evalSummary && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-[11px] text-emerald-300">{evalSummary}</div>
      )}

      {tiers.map((tier, idx) => {
        const isEditing = editingCode === tier.code;
        return (
          <div
            key={tier.code}
            className="rounded-[1.5rem] p-5 space-y-4 border"
            style={{ borderColor: tier.color + '33', background: tier.color + '08' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {tier.emoji && <span className="text-xl flex-shrink-0">{tier.emoji}</span>}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-black text-sm text-white truncate">{tier.name}</p>
                    {tier.is_default && <span className="text-[8px] font-black uppercase tracking-widest text-ds-ink3 bg-ds-card2 px-1.5 py-0.5 rounded">Default</span>}
                    {tier.requires_approval && <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Butuh Persetujuan</span>}
                    {!tier.is_active && <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Nonaktif</span>}
                  </div>
                  <p className="text-[10px] text-ds-ink3 font-mono">{tier.code} · {tier.min_policies_count ? `≥${tier.min_policies_count} polis` : ''} {tier.min_premium_amount ? `· ≥Rp${(tier.min_premium_amount / 1_000_000).toFixed(0)}jt` : ''}</p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleReorder(idx, -1)} disabled={idx === 0} className="w-6 h-6 rounded-lg bg-ds-card2 text-ds-ink3 disabled:opacity-20 flex items-center justify-center"><ChevronUp size={12} /></button>
                  <button onClick={() => handleReorder(idx, 1)} disabled={idx === tiers.length - 1} className="w-6 h-6 rounded-lg bg-ds-card2 text-ds-ink3 disabled:opacity-20 flex items-center justify-center"><ChevronDown size={12} /></button>
                  <button
                    onClick={() => isEditing ? cancelEdit() : startEdit(tier)}
                    className="px-2.5 py-1.5 rounded-xl text-[0.58rem] font-black uppercase tracking-widest bg-ds-card2 text-ds-ink2 hover:bg-ds-card2 transition-all"
                  >
                    {isEditing ? 'Tutup' : 'Edit'}
                  </button>
                  {!tier.is_default && (
                    <button onClick={() => handleDelete(tier.code)} className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Bonus Koin', value: tier.coin_bonus_rate },
                { label: 'Override L1', value: tier.l1_override_rate },
                { label: 'Override L2', value: tier.l2_override_rate },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: tier.color + '14', border: `1px solid ${tier.color}22` }}>
                  <p className="font-black text-sm" style={{ color: tier.color }}>{pct(value)}</p>
                  <p className="text-[0.55rem] font-bold opacity-50 mt-0.5 uppercase tracking-widest text-ds-ink2">{label}</p>
                </div>
              ))}
            </div>

            {isEditing && draft && (
              <TierEditForm
                draft={draft}
                locked={!creating}
                onField={setDraftField}
                onRate={setRateField}
                onToggleApprovalRole={toggleApprovalRole}
                onAddBenefit={addBenefitRow}
                onRemoveBenefit={removeBenefitRow}
                onSetBenefit={setBenefitRow}
                onSave={handleSave}
                onCancel={cancelEdit}
                onMakeDefault={() => setDefaultTier(tier.code)}
                saving={saving}
                error={error}
              />
            )}
          </div>
        );
      })}

      {creating && draft && (
        <div className="rounded-[1.5rem] p-5 space-y-4 border border-ds-border bg-ds-card2">
          <p className="font-black text-sm text-white">Tier Baru</p>
          <TierEditForm
            draft={draft}
            locked={false}
            onField={setDraftField}
            onRate={setRateField}
            onToggleApprovalRole={toggleApprovalRole}
            onAddBenefit={addBenefitRow}
            onRemoveBenefit={removeBenefitRow}
            onSetBenefit={setBenefitRow}
            onSave={handleSave}
            onCancel={cancelEdit}
            saving={saving}
            error={error}
          />
        </div>
      )}
    </div>
  );
};

const TierEditForm: React.FC<{
  draft: TierDraft;
  locked: boolean;
  onField: (field: keyof TierDraft, value: unknown) => void;
  onRate: (field: 'coin_bonus_rate' | 'l1_override_rate' | 'l2_override_rate', raw: string) => void;
  onToggleApprovalRole: (role: string) => void;
  onAddBenefit: () => void;
  onRemoveBenefit: (idx: number) => void;
  onSetBenefit: (idx: number, field: 'key' | 'value', value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onMakeDefault?: () => void;
  saving: boolean;
  error: string;
}> = ({ draft, locked, onField, onRate, onToggleApprovalRole, onAddBenefit, onRemoveBenefit, onSetBenefit, onSave, onCancel, onMakeDefault, saving, error }) => (
  <div className="space-y-4 pt-2 border-t border-ds-border">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Kode</label>
        <input
          type="text" placeholder="GOLD" disabled={locked}
          value={draft.code ?? ''}
          onChange={e => onField('code', e.target.value.toUpperCase())}
          className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40 disabled:opacity-40"
        />
      </div>
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Nama Tampilan</label>
        <input
          type="text" placeholder="Mitra Gold"
          value={draft.name ?? ''}
          onChange={e => onField('name', e.target.value)}
          className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Warna</label>
        <input
          type="color"
          value={draft.color ?? '#6b7280'}
          onChange={e => onField('color', e.target.value)}
          className="w-full h-9 bg-black/30 border border-ds-border rounded-xl px-1 py-1"
        />
      </div>
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Emoji</label>
        <input
          type="text" placeholder="🏆" maxLength={4}
          value={draft.emoji ?? ''}
          onChange={e => onField('emoji', e.target.value)}
          className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Min. Jumlah Polis</label>
        <input
          type="number" min={0} placeholder="Tanpa syarat"
          value={draft.min_policies_count ?? ''}
          onChange={e => onField('min_policies_count', e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
        />
      </div>
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Min. Total Premi (IDR)</label>
        <input
          type="number" min={0} step={1000000} placeholder="Tanpa syarat"
          value={draft.min_premium_amount ?? ''}
          onChange={e => onField('min_premium_amount', e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
        />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Bonus Koin', field: 'coin_bonus_rate' as const, max: 50 },
        { label: 'Override L1', field: 'l1_override_rate' as const, max: 10 },
        { label: 'Override L2', field: 'l2_override_rate' as const, max: 5 },
      ].map(({ label, field, max }) => (
        <div key={field}>
          <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1.5">{label}</label>
          <div className="flex items-center gap-1">
            <input
              type="number" min={0} max={max} step={0.5}
              value={(((draft[field] as number) ?? 0) * 100).toFixed(1)}
              onChange={e => onRate(field, e.target.value)}
              className="w-full bg-black/30 border border-ds-border rounded-xl px-2 py-2 text-xs text-white font-mono focus:outline-none"
            />
            <span className="text-[10px] text-ds-ink3 flex-shrink-0">%</span>
          </div>
        </div>
      ))}
    </div>

    {/* Benefits — generic key/value bag for future perks */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3">Benefit Tambahan</label>
        <button onClick={onAddBenefit} className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1"><Plus size={10} /> Tambah</button>
      </div>
      <div className="space-y-1.5">
        {draft.benefitsList.length === 0 && <p className="text-[10px] text-ds-ink3">Belum ada benefit tambahan (mis. kuota lead, prioritas cair dana).</p>}
        {draft.benefitsList.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text" placeholder="nama_benefit"
              value={b.key}
              onChange={e => onSetBenefit(i, 'key', e.target.value)}
              className="flex-1 bg-black/30 border border-ds-border rounded-lg px-2 py-1.5 text-[11px] text-white font-mono focus:outline-none"
            />
            <input
              type="text" placeholder="nilai"
              value={b.value}
              onChange={e => onSetBenefit(i, 'value', e.target.value)}
              className="flex-1 bg-black/30 border border-ds-border rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
            />
            <button onClick={() => onRemoveBenefit(i)} className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0"><X size={11} /></button>
          </div>
        ))}
      </div>
    </div>

    {/* Approval gating */}
    <div>
      <label className="flex items-center gap-2 mb-2 cursor-pointer">
        <input type="checkbox" checked={!!draft.requires_approval} onChange={e => onField('requires_approval', e.target.checked)} className="accent-emerald-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink2">Butuh Persetujuan Level Atas</span>
      </label>
      {draft.requires_approval && (
        <div className="flex flex-wrap gap-1.5">
          {APPROVAL_ROLE_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => onToggleApprovalRole(r)}
              className="px-2.5 py-1 rounded-lg text-[0.58rem] font-black uppercase tracking-widest transition-all"
              style={{
                background: (draft.approval_roles ?? []).includes(r) ? '#00C16A' : 'rgba(255,255,255,0.05)',
                color: (draft.approval_roles ?? []).includes(r) ? '#000' : 'rgba(255,255,255,0.4)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>

    {onMakeDefault && !draft.is_default && (
      <button onClick={onMakeDefault} className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 hover:text-white transition-all">
        Jadikan Tier Default (agen baru)
      </button>
    )}

    {error && <p className="text-[10px] text-rose-400">{error}</p>}

    <div className="flex gap-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50"
      >
        {saving ? 'Menyimpan…' : 'Simpan Tier'}
      </button>
      <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-ds-card2 text-ds-ink3 hover:bg-ds-card2 transition-all">
        Batal
      </button>
    </div>
  </div>
);

// ─── Tier Approval Requests Tab ────────────────────────────────────────────────

const TierRequestsTab: React.FC = () => {
  const toast = useToast();
  const promptDialog = usePromptDialog();
  const [requests, setRequests] = useState<SpTierChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const load = () => {
    setLoading(true);
    getTierChangeRequests(filter).then(data => { setRequests(data); setLoading(false); });
  };
  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id: string) => {
    setActing(id);
    const result = await approveTierRequest(id);
    setActing(null);
    if (result.success) load(); else toast.error(result.error ?? 'Gagal menyetujui — mungkin role Anda tidak berwenang untuk tier ini.');
  };

  const handleReject = async (id: string) => {
    // The reason is audit context on a tier decision, so it is collected in a
    // real dialog rather than window.prompt(), which browsers may suppress.
    // Still optional, exactly as before — an empty reason is accepted.
    const reason = await promptDialog({
      title: 'Tolak permintaan tier?',
      description: 'Alasan ini tersimpan pada permintaan dan terlihat oleh pemohon.',
      input: { label: 'Alasan penolakan', placeholder: 'Opsional', multiline: true },
      confirmLabel: 'Tolak',
      variant: 'danger',
    });
    if (reason == null) return;
    setActing(id);
    const result = await rejectTierRequest(id, reason);
    setActing(null);
    if (result.success) load(); else toast.error(result.error ?? 'Gagal menolak.');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-emerald-500 text-white' : 'bg-ds-card2 text-ds-ink3'
            }`}
          >
            {f === 'PENDING' ? 'Menunggu' : f === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-ds-ink3 text-sm">Tidak ada permintaan.</div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="border border-ds-border rounded-2xl px-4 py-3 bg-ds-card2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{r.sp_users?.name ?? r.agent_id}</p>
                  <p className="text-[10px] text-ds-ink3">
                    {r.current_tier_code ?? '—'} → <span className="text-emerald-400 font-bold">{r.requested_tier_code}</span>
                    {' · '}{r.source === 'AUTO_ELIGIBLE' ? 'Evaluasi otomatis' : 'Diajukan manual'}
                  </p>
                  {r.reason && <p className="text-[10px] text-ds-ink3 mt-0.5">"{r.reason}"</p>}
                  <p className="text-[9px] text-ds-ink2 mt-0.5">{new Date(r.requested_at).toLocaleString('id-ID')}</p>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(r.id)}
                      disabled={acting === r.id}
                      className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                      title="Setujui"
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      onClick={() => handleReject(r.id)}
                      disabled={acting === r.id}
                      className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                      title="Tolak"
                    >
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Promo Codes Tab ──────────────────────────────────────────────────────────

const PRODUCT_OPTIONS = ['ALL', 'CAR', 'TRAVEL', 'PA', 'MPAR', 'HEALTH'];

const PromoCodesTab: React.FC = () => {
  const [codes, setCodes] = useState<SpPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const emptyForm = {
    code: '', description: '', discount_type: 'PERCENT' as 'PERCENT' | 'FLAT',
    discount_value: 10, applicable_products: ['ALL'],
    valid_from: new Date().toISOString().slice(0, 10),
    valid_to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    usage_limit: 100, is_active: true,
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getPromoCodes().then(data => { setCodes(data); setLoading(false); });
  }, []);

  const toggleProduct = (p: string) => {
    setForm(prev => {
      if (p === 'ALL') return { ...prev, applicable_products: ['ALL'] };
      const current = prev.applicable_products.filter(x => x !== 'ALL');
      return {
        ...prev,
        applicable_products: current.includes(p)
          ? current.filter(x => x !== p) || ['ALL']
          : [...current, p],
      };
    });
  };

  const handleCreate = async () => {
    if (!form.code.trim()) { setFormError('Kode promo wajib diisi.'); return; }
    if (form.discount_value <= 0) { setFormError('Nilai diskon harus > 0.'); return; }
    if (form.valid_to <= form.valid_from) { setFormError('Tanggal akhir harus setelah tanggal mulai.'); return; }
    setSaving(true);
    const result = await createPromoCode({
      ...form,
      code: form.code.toUpperCase().trim(),
      valid_from: new Date(form.valid_from).toISOString(),
      valid_to: new Date(form.valid_to + 'T23:59:59').toISOString(),
      created_by: getAdminId(),
    });
    setSaving(false);
    if (result) {
      setCodes(prev => [result, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      setFormError('');
    } else {
      setFormError('Gagal membuat kode. Mungkin sudah ada.');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    setToggling(id);
    await updatePromoCode(id, { is_active: !isActive });
    setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
    setToggling(null);
  };

  const active  = codes.filter(c => c.is_active);
  const expired = codes.filter(c => !c.is_active || new Date(c.valid_to) < new Date());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-white">Kode Promo Nasabah</p>
          <p className="text-[10px] text-ds-ink3">{active.length} aktif · {expired.length} nonaktif/kadaluarsa</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.65rem] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Batal' : 'Buat Kode'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-ds-card2 border border-ds-border rounded-2xl p-5 space-y-4">
          <p className="text-xs font-black text-white">Kode Promo Baru</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Kode</label>
              <input
                type="text" placeholder="PROMO10"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Jenis Diskon</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as 'PERCENT' | 'FLAT' }))}
                className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              >
                <option value="PERCENT">Persen (%)</option>
                <option value="FLAT">Nominal (IDR)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">
                Nilai {form.discount_type === 'PERCENT' ? '(%)' : '(IDR)'}
              </label>
              <input
                type="number" min={0}
                value={form.discount_value}
                onChange={e => setForm(p => ({ ...p, discount_value: parseFloat(e.target.value) }))}
                className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Kuota</label>
              <input
                type="number" min={1}
                value={form.usage_limit}
                onChange={e => setForm(p => ({ ...p, usage_limit: parseInt(e.target.value) }))}
                className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Mulai</label>
              <input
                type="date" value={form.valid_from}
                onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))}
                className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Akhir</label>
              <input
                type="date" value={form.valid_to}
                onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))}
                className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-2">Berlaku untuk Produk</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleProduct(p)}
                  className="px-2.5 py-1 rounded-lg text-[0.6rem] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: form.applicable_products.includes(p) ? '#00C16A' : 'rgba(255,255,255,0.05)',
                    color: form.applicable_products.includes(p) ? '#000' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-ds-ink3 mb-1">Deskripsi (opsional)</label>
            <input
              type="text" placeholder="Promo Lebaran 2026"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-black/30 border border-ds-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
            />
          </div>

          {formError && <p className="text-[10px] text-rose-400">{formError}</p>}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : 'Buat Kode Promo'}
          </button>
        </div>
      )}

      {/* Code list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-ds-ink3 text-sm">
          <Tag size={28} className="mx-auto mb-2 opacity-30" />
          Belum ada kode promo
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(c => {
            const isExpired = new Date(c.valid_to) < new Date();
            return (
              <div
                key={c.id}
                className={`border rounded-2xl px-4 py-3 flex items-center gap-3 transition-opacity ${
                  !c.is_active || isExpired ? 'opacity-50' : ''
                }`}
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
              >
                <Tag size={14} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-sm text-white font-mono">{c.code}</p>
                    {isExpired && <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Kadaluarsa</span>}
                    {!isExpired && c.is_active && <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Aktif</span>}
                  </div>
                  <p className="text-[10px] text-ds-ink3">
                    {c.discount_type === 'PERCENT' ? `${c.discount_value}% diskon` : `IDR ${c.discount_value.toLocaleString('id-ID')} diskon`}
                    {' · '}{c.applicable_products.join(', ')}
                    {' · '}{c.used_count}/{c.usage_limit} digunakan
                    {' · '}{new Date(c.valid_from).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(c.valid_to).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(c.id, c.is_active)}
                  disabled={toggling === c.id}
                  className={`px-3 py-1.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
                    c.is_active
                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                  }`}
                >
                  {toggling === c.id ? '…' : c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'tier' | 'requests' | 'promo';

const TierPromoConfigAdmin: React.FC = () => {
  const [tab, setTab] = useState<Tab>('tier');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-black text-white text-lg">Konfigurasi Tier &amp; Promo</h2>
        <p className="text-ds-ink3 text-xs mt-0.5">Atur tier mitra, persetujuan tier, dan kode promo nasabah</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-ds-card2 border border-ds-border rounded-2xl p-1">
        {([
          { id: 'tier' as const, label: 'Tier Mitra' },
          { id: 'requests' as const, label: 'Persetujuan Tier' },
          { id: 'promo' as const, label: 'Kode Promo' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-emerald-500 text-white' : 'text-ds-ink3 hover:text-ds-ink2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tier'     && <TierConfigTab />}
      {tab === 'requests' && <TierRequestsTab />}
      {tab === 'promo'    && <PromoCodesTab />}
    </div>
  );
};

export default TierPromoConfigAdmin;
