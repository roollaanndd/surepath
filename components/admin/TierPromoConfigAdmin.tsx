import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Tag, Check } from 'lucide-react';
import { TIER_CONFIG } from '../../types';
import {
  getTierConfig, updateTierConfig,
  getPromoCodes, createPromoCode, updatePromoCode,
  type SpTierConfig, type SpPromoCode,
} from '../../services/supabaseService';

const SESSION_KEY = 'SUREPATH_SESSION';
const getAdminId = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')?.supabaseId ?? ''; }
  catch { return ''; }
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

// ─── Tier Config Tab ──────────────────────────────────────────────────────────

const TIER_ORDER: SpTierConfig['tier'][] = ['STANDARD', 'STAR', 'ELITE'];
const TIER_META: Record<string, { emoji: string | null; color: string; label: string }> = {
  STANDARD: { emoji: null, color: '#6b7280', label: 'Standard' },
  STAR:     { emoji: '⭐', color: TIER_CONFIG.STAR.color,  label: TIER_CONFIG.STAR.label },
  ELITE:    { emoji: '💎', color: TIER_CONFIG.ELITE.color, label: TIER_CONFIG.ELITE.label },
};

const TierConfigTab: React.FC = () => {
  const [rows, setRows]   = useState<SpTierConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SpTierConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTierConfig().then(data => {
      setRows(data);
      const d: Record<string, SpTierConfig> = {};
      data.forEach(r => { d[r.tier] = { ...r }; });
      setDrafts(d);
      setLoading(false);
    });
  }, []);

  const setField = (tier: string, field: keyof SpTierConfig, raw: string) => {
    const val = parseFloat(raw) / 100;
    if (isNaN(val)) return;
    setDrafts(prev => ({ ...prev, [tier]: { ...prev[tier], [field]: val } }));
  };

  const handleSave = async (tier: SpTierConfig['tier']) => {
    const d = drafts[tier];
    if (!d) return;
    setSaving(tier);
    const ok = await updateTierConfig(tier, {
      coin_bonus_rate:  d.coin_bonus_rate,
      l1_override_rate: d.l1_override_rate,
      l2_override_rate: d.l2_override_rate,
    }, getAdminId());
    setSaving(null);
    if (ok) { setSaved(tier); setTimeout(() => setSaved(null), 2000); }
  };

  const isDirty = (tier: string) => {
    const orig = rows.find(r => r.tier === tier);
    const d = drafts[tier];
    if (!orig || !d) return false;
    return orig.coin_bonus_rate !== d.coin_bonus_rate ||
           orig.l1_override_rate !== d.l1_override_rate ||
           orig.l2_override_rate !== d.l2_override_rate;
  };

  // Total max overhead across all tiers for a given product:
  // If selling agent is STANDARD (no coin bonus), upline is ELITE → 4% L1 + 2% L2
  // This is the max the company pays out in overrides on top of base commission
  const maxOverrideRate = (drafts['ELITE']?.l1_override_rate ?? 0.04) + (drafts['ELITE']?.l2_override_rate ?? 0.02);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-[11px] text-slate-400 space-y-1">
        <p className="text-white font-bold text-xs mb-2">Cara Kerja Override &amp; Koin</p>
        <p>• <b>Override</b> = % dari <b>komisi</b> downline (bukan dari premi). Aman untuk margin perusahaan.</p>
        <p>• <b>Bonus Koin</b> = koin tambahan di atas reward dasar per penjualan agen bertier.</p>
        <p>• Maks overhead override (tier Elite + 2 lapisan): <b>{pct(maxOverrideRate)} × komisi agen</b>.</p>
        <p>• Lapisan downline maks: 2. L3 ke bawah tidak mendapat override.</p>
      </div>

      {TIER_ORDER.map(tier => {
        const d = drafts[tier];
        if (!d) return null;
        const meta = TIER_META[tier];
        const dirty = isDirty(tier);
        return (
          <div
            key={tier}
            className="rounded-[1.5rem] p-5 space-y-4 border"
            style={{ borderColor: meta.color + '33', background: meta.color + '08' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {meta.emoji && <span className="text-xl">{meta.emoji}</span>}
                <div>
                  <p className="font-black text-sm text-white">{meta.label}</p>
                  {tier === 'STANDARD' && (
                    <p className="text-[10px] text-slate-500">Semua agen tanpa tier khusus</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleSave(tier)}
                disabled={!dirty || saving === tier}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all"
                style={{
                  background: saved === tier ? '#10b981' : dirty ? meta.color : 'rgba(255,255,255,0.05)',
                  color: dirty ? '#000' : 'rgba(255,255,255,0.2)',
                  cursor: dirty ? 'pointer' : 'not-allowed',
                }}
              >
                {saved === tier ? <Check size={11} /> : <Save size={11} />}
                {saving === tier ? '…' : saved === tier ? 'Tersimpan' : 'Simpan'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Bonus Koin', field: 'coin_bonus_rate' as const, max: 50, disabled: tier === 'STANDARD' },
                { label: 'Override L1', field: 'l1_override_rate' as const, max: 10, disabled: false },
                { label: 'Override L2', field: 'l2_override_rate' as const, max: 5, disabled: tier === 'STANDARD' },
              ].map(({ label, field, max, disabled }) => (
                <div key={field}>
                  <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: meta.color + 'aa' }}>
                    {label}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step={0.5}
                      disabled={disabled}
                      value={((d[field] as number) * 100).toFixed(1)}
                      onChange={e => setField(tier, field, e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-white font-mono focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ borderColor: disabled ? 'rgba(255,255,255,0.05)' : meta.color + '33' }}
                    />
                    <span className="text-[10px] text-slate-500 flex-shrink-0">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
          <p className="text-[10px] text-slate-500">{active.length} aktif · {expired.length} nonaktif/kadaluarsa</p>
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
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-black text-white">Kode Promo Baru</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Kode</label>
              <input
                type="text" placeholder="PROMO10"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Jenis Diskon</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as 'PERCENT' | 'FLAT' }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              >
                <option value="PERCENT">Persen (%)</option>
                <option value="FLAT">Nominal (IDR)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Nilai {form.discount_type === 'PERCENT' ? '(%)' : '(IDR)'}
              </label>
              <input
                type="number" min={0}
                value={form.discount_value}
                onChange={e => setForm(p => ({ ...p, discount_value: parseFloat(e.target.value) }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Kuota</label>
              <input
                type="number" min={1}
                value={form.usage_limit}
                onChange={e => setForm(p => ({ ...p, usage_limit: parseInt(e.target.value) }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Mulai</label>
              <input
                type="date" value={form.valid_from}
                onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Akhir</label>
              <input
                type="date" value={form.valid_to}
                onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Berlaku untuk Produk</label>
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
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Deskripsi (opsional)</label>
            <input
              type="text" placeholder="Promo Lebaran 2026"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
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
        <div className="text-center py-12 text-slate-500 text-sm">
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
                  <p className="text-[10px] text-slate-400">
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

type Tab = 'tier' | 'promo';

const TierPromoConfigAdmin: React.FC = () => {
  const [tab, setTab] = useState<Tab>('tier');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-black text-white text-lg">Konfigurasi Tier &amp; Promo</h2>
        <p className="text-slate-400 text-xs mt-0.5">Atur bonus tier agen dan kode promo nasabah</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/[0.03] border border-white/5 rounded-2xl p-1">
        {([
          { id: 'tier' as const, label: 'Bonus Tier Agen' },
          { id: 'promo' as const, label: 'Kode Promo Nasabah' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tier'  && <TierConfigTab />}
      {tab === 'promo' && <PromoCodesTab />}
    </div>
  );
};

export default TierPromoConfigAdmin;
