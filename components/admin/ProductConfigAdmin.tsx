import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, Save, Car, Bike, ShieldCheck, ShieldHalf, Coins, Percent, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpProductConfig {
  id: string;
  product_code: string;
  product_name: string;
  vehicle_type: 'CAR' | 'MOTORCYCLE' | 'ALL';
  coverage_type: 'COMPREHENSIVE' | 'TLO' | 'ALL';
  base_commission_rate: number;
  max_discount_rate: number;
  coin_rate: number;
  rate_band: 'MIN' | 'MID' | 'MAX';
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

type NewProductConfig = Omit<SpProductConfig, 'id' | 'created_at' | 'updated_at'>;

// ─── Inline Supabase helpers ──────────────────────────────────────────────────

async function getProductConfigs(): Promise<SpProductConfig[]> {
  const { data, error } = await supabase
    .from('sp_product_configs')
    .select('*')
    .order('product_code', { ascending: true });
  if (error) {
    console.error('getProductConfigs error:', error);
    return [];
  }
  return (data ?? []) as SpProductConfig[];
}

async function updateProductConfig(id: string, updates: Partial<SpProductConfig>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_product_configs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('updateProductConfig error:', error);
    return false;
  }
  return true;
}

async function createProductConfig(data: NewProductConfig): Promise<SpProductConfig | null> {
  const { data: result, error } = await supabase
    .from('sp_product_configs')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('createProductConfig error:', error);
    return null;
  }
  return result as SpProductConfig;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const PREVIEW_PREMIUM = 5_000_000;

function calcPreview(cfg: Pick<SpProductConfig, 'base_commission_rate' | 'coin_rate'>) {
  const commission = Math.round(PREVIEW_PREMIUM * cfg.base_commission_rate);
  const coins = Math.floor((PREVIEW_PREMIUM * cfg.coin_rate) / 1000);
  const coinValue = coins * 1000;
  return { commission, coins, coinValue };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{children}</p>
);

interface RateSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accent?: string;
}

const RateSlider: React.FC<RateSliderProps> = ({ label, value, min, max, onChange, accent = 'accent-emerald-500' }) => {
  const pctDisplay = pct(value);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) return;
    const clamped = Math.min(max, Math.max(min, raw / 100));
    onChange(parseFloat(clamped.toFixed(4)));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min * 100}
            max={max * 100}
            step={0.1}
            value={(value * 100).toFixed(1)}
            onChange={handleInput}
            className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs font-black text-white text-right focus:outline-none focus:border-emerald-500/50"
          />
          <span className="text-[10px] font-black text-slate-400">%</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.001}
        value={value}
        onChange={handleSlider}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 ${accent}`}
      />
      <div className="flex justify-between text-[9px] text-slate-600 font-bold">
        <span>{pct(min)}</span>
        <span className="text-emerald-400 font-black">{pctDisplay}</span>
        <span>{pct(max)}</span>
      </div>
    </div>
  );
};

// ─── Product Card (inline edit) ───────────────────────────────────────────────

interface ProductCardProps {
  config: SpProductConfig;
  onSaved: (updated: SpProductConfig) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ config, onSaved }) => {
  const [draft, setDraft] = useState<SpProductConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep draft in sync when parent refreshes
  useEffect(() => { setDraft(config); }, [config]);

  const isDirty =
    draft.base_commission_rate !== config.base_commission_rate ||
    draft.max_discount_rate !== config.max_discount_rate ||
    draft.coin_rate !== config.coin_rate ||
    draft.rate_band !== config.rate_band ||
    draft.notes !== config.notes ||
    draft.is_active !== config.is_active;

  const setRate = (key: keyof SpProductConfig) => (v: number) => {
    setDraft(prev => {
      const next = { ...prev, [key]: v };
      // max_discount_rate must not exceed base_commission_rate
      if (key === 'base_commission_rate' && next.max_discount_rate > v) {
        next.max_discount_rate = v;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (companyMargin < 0.05) return; // enforce profit floor
    setSaving(true);
    const ok = await updateProductConfig(draft.id, {
      base_commission_rate: draft.base_commission_rate,
      max_discount_rate: draft.max_discount_rate,
      coin_rate: draft.coin_rate,
      rate_band: draft.rate_band,
      is_active: draft.is_active,
      notes: draft.notes,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSaved(draft);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const { commission, coins, coinValue } = calcPreview(draft);
  // Company margin: must stay ≥ 5% of premium after commission + coin cost
  const companyMargin = 1 - draft.base_commission_rate - draft.coin_rate;
  const marginOk = companyMargin >= 0.05;

  const vehicleBadge =
    draft.vehicle_type === 'CAR'
      ? { label: 'Mobil', Icon: Car, cls: 'bg-blue-500/10 text-blue-400' }
      : draft.vehicle_type === 'MOTORCYCLE'
      ? { label: 'Motor', Icon: Bike, cls: 'bg-purple-500/10 text-purple-400' }
      : { label: 'Semua', Icon: Car, cls: 'bg-slate-500/10 text-slate-400' };

  const coverageBadge =
    draft.coverage_type === 'COMPREHENSIVE'
      ? { label: 'Komprehensif', Icon: ShieldCheck, cls: 'bg-emerald-500/10 text-emerald-400' }
      : draft.coverage_type === 'TLO'
      ? { label: 'TLO', Icon: ShieldHalf, cls: 'bg-amber-500/10 text-amber-400' }
      : { label: 'Semua', Icon: ShieldCheck, cls: 'bg-slate-500/10 text-slate-400' };

  return (
    <div
      className={`bg-white/[0.02] border rounded-[2rem] p-6 space-y-5 transition-all duration-300 ${
        draft.is_active ? 'border-white/5' : 'border-white/[0.02] opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm leading-tight">{draft.product_name}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
            {draft.product_code}
          </p>
        </div>
        <button
          onClick={() => setDraft(prev => ({ ...prev, is_active: !prev.is_active }))}
          className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
          title={draft.is_active ? 'Nonaktifkan produk' : 'Aktifkan produk'}
        >
          {draft.is_active ? (
            <ToggleRight size={20} className="text-emerald-400" />
          ) : (
            <ToggleLeft size={20} className="text-slate-500" />
          )}
          <span className={draft.is_active ? 'text-emerald-400' : 'text-slate-500'}>
            {draft.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${vehicleBadge.cls}`}>
          <vehicleBadge.Icon size={10} />
          {vehicleBadge.label}
        </span>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${coverageBadge.cls}`}>
          <coverageBadge.Icon size={10} />
          {coverageBadge.label}
        </span>
      </div>

      {/* OJK Rate Band */}
      <div>
        <SectionLabel>Tarif OJK (Batas)</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {(['MIN', 'MID', 'MAX'] as const).map(b => {
            const labels = { MIN: 'Bawah', MID: 'Tengah', MAX: 'Atas' };
            const active = draft.rate_band === b;
            return (
              <button
                key={b}
                onClick={() => setDraft(prev => ({ ...prev, rate_band: b }))}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  active ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {labels[b]}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-slate-600 font-bold mt-1">
          {draft.rate_band === 'MIN' ? 'Tarif batas bawah OJK — estimasi premi paling rendah'
           : draft.rate_band === 'MAX' ? 'Tarif batas atas OJK — estimasi premi paling tinggi'
           : 'Tarif tengah OJK — estimasi premi standar'}
        </p>
      </div>

      {/* Rate sliders */}
      <div className="space-y-5 pt-1">
        <RateSlider
          label="Komisi Dasar"
          value={draft.base_commission_rate}
          min={0}
          max={0.25}
          onChange={setRate('base_commission_rate')}
        />
        <RateSlider
          label="Max Diskon (≤ Komisi)"
          value={draft.max_discount_rate}
          min={0}
          max={draft.base_commission_rate}
          onChange={setRate('max_discount_rate')}
          accent="accent-blue-500"
        />
        <RateSlider
          label="Reward Koin"
          value={draft.coin_rate}
          min={0.05}
          max={0.25}
          onChange={setRate('coin_rate')}
          accent="accent-amber-500"
        />
      </div>

      {/* Business rule summary */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 space-y-1.5 text-[10px] font-bold">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Aturan Bisnis</p>
        <div className="flex justify-between">
          <span className="text-slate-400">Mitra mendapat komisi</span>
          <span className="text-white font-black">{pct(draft.base_commission_rate)} dari premi</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Max diskon ke klien</span>
          <span className="text-blue-400 font-black">{pct(draft.max_discount_rate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Jika diskon maks</span>
          <span className="text-white font-black">
            Mitra tetap dapat {pct(draft.base_commission_rate - draft.max_discount_rate)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
          <span className="flex items-center gap-1 text-slate-400">
            <Coins size={10} className="text-amber-400" /> Rumus koin
          </span>
          <span className="text-amber-400 font-black font-mono text-[9px]">
            floor(premi × {pct(draft.coin_rate)} / 1000)
          </span>
        </div>
        <div className={`flex items-center justify-between pt-1 border-t mt-1 ${marginOk ? 'border-emerald-500/20' : 'border-rose-500/30'}`}>
          <span className={`font-black text-[9px] ${marginOk ? 'text-emerald-400' : 'text-rose-400'}`}>
            {marginOk ? '✓' : '⚠'} Margin perusahaan
          </span>
          <span className={`font-black font-mono text-[10px] ${marginOk ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pct(companyMargin)} {!marginOk && '— min 5% GWP!'}
          </span>
        </div>
      </div>

      {/* Preview calculation */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70 mb-1.5">
          Preview — Premi {formatIDR(PREVIEW_PREMIUM)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-[10px] font-black">
            <Percent size={9} className="inline text-emerald-400 mr-0.5" />
            Komisi <span className="text-emerald-400">{formatIDR(commission)}</span>
          </span>
          <span className="text-[10px] font-black">
            <Coins size={9} className="inline text-amber-400 mr-0.5" />
            Koin <span className="text-amber-400">{coins.toLocaleString('id-ID')} koin</span>
            <span className="text-slate-500"> ({formatIDR(coinValue)})</span>
          </span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <SectionLabel>Catatan Internal</SectionLabel>
        <textarea
          value={draft.notes ?? ''}
          onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="Catatan untuk konfigurasi ini…"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/40 resize-none"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
          saved
            ? 'bg-emerald-500 text-white'
            : isDirty
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-white/5 text-slate-600 cursor-not-allowed'
        }`}
      >
        <Save size={12} />
        {saving ? 'Menyimpan…' : saved ? 'Tersimpan ✓' : 'Simpan Perubahan'}
      </button>
    </div>
  );
};

// ─── Add Product Modal ────────────────────────────────────────────────────────

const EMPTY_NEW: NewProductConfig = {
  product_code: '',
  product_name: '',
  vehicle_type: 'CAR',
  coverage_type: 'COMPREHENSIVE',
  base_commission_rate: 0.10,
  max_discount_rate: 0.05,
  coin_rate: 0.10,
  rate_band: 'MID',
  is_active: true,
  notes: '',
};

interface AddProductModalProps {
  onClose: () => void;
  onCreated: (cfg: SpProductConfig) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<NewProductConfig>(EMPTY_NEW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof NewProductConfig>(key: K, value: NewProductConfig[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'base_commission_rate' && (next.max_discount_rate as number) > (value as number)) {
        next.max_discount_rate = value as number;
      }
      return next;
    });
  };

  const setRate = (key: 'base_commission_rate' | 'max_discount_rate' | 'coin_rate') => (v: number) => {
    set(key, v);
  };

  const handleSubmit = async () => {
    if (!form.product_code.trim()) { setError('Kode produk wajib diisi.'); return; }
    if (!form.product_name.trim()) { setError('Nama produk wajib diisi.'); return; }
    setSaving(true);
    setError('');
    const result = await createProductConfig(form);
    setSaving(false);
    if (!result) {
      setError('Gagal membuat produk. Kode mungkin sudah digunakan.');
      return;
    }
    onCreated(result);
  };

  const { commission, coins, coinValue } = calcPreview(form);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/5">
          <div>
            <h3 className="font-black text-white tracking-tight">Tambah Produk Baru</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
              Konfigurasi produk & komisi
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Product code & name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>Kode Produk</SectionLabel>
              <input
                type="text"
                value={form.product_code}
                onChange={e => set('product_code', e.target.value.toUpperCase())}
                placeholder="MRKB4-COMP"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-black text-white focus:outline-none focus:border-emerald-500/40 font-mono"
              />
            </div>
            <div>
              <SectionLabel>Jenis Kendaraan</SectionLabel>
              <select
                value={form.vehicle_type}
                onChange={e => set('vehicle_type', e.target.value as SpProductConfig['vehicle_type'])}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/40 appearance-none"
              >
                <option value="CAR">Mobil (CAR)</option>
                <option value="MOTORCYCLE">Motor (MOTORCYCLE)</option>
                <option value="ALL">Semua (ALL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>Nama Produk</SectionLabel>
              <input
                type="text"
                value={form.product_name}
                onChange={e => set('product_name', e.target.value)}
                placeholder="Asuransi Mobil Komprehensif"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div>
              <SectionLabel>Jenis Pertanggungan</SectionLabel>
              <select
                value={form.coverage_type}
                onChange={e => set('coverage_type', e.target.value as SpProductConfig['coverage_type'])}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/40 appearance-none"
              >
                <option value="COMPREHENSIVE">Komprehensif</option>
                <option value="TLO">TLO</option>
                <option value="ALL">Semua</option>
              </select>
            </div>
          </div>

          {/* Rate band */}
          <div>
            <SectionLabel>Tarif OJK (Batas)</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(['MIN', 'MID', 'MAX'] as const).map(b => {
                const labels = { MIN: 'Bawah', MID: 'Tengah', MAX: 'Atas' };
                const active = form.rate_band === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set('rate_band', b)}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      active ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {labels[b]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rate sliders */}
          <div className="space-y-5 pt-1">
            <RateSlider label="Komisi Dasar" value={form.base_commission_rate} min={0} max={0.25} onChange={setRate('base_commission_rate')} />
            <RateSlider label="Max Diskon (≤ Komisi)" value={form.max_discount_rate} min={0} max={form.base_commission_rate} onChange={setRate('max_discount_rate')} accent="accent-blue-500" />
            <RateSlider label="Reward Koin" value={form.coin_rate} min={0.05} max={0.25} onChange={setRate('coin_rate')} accent="accent-amber-500" />
          </div>

          {/* Preview */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70 mb-1.5">
              Preview — Premi {formatIDR(PREVIEW_PREMIUM)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-[10px] font-black">
                Komisi <span className="text-emerald-400">{formatIDR(commission)}</span>
              </span>
              <span className="text-[10px] font-black">
                <span className="text-amber-400">{coins.toLocaleString('id-ID')} koin</span>
                <span className="text-slate-500"> ({formatIDR(coinValue)})</span>
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <SectionLabel>Catatan (Opsional)</SectionLabel>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Catatan untuk produk ini…"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/40 resize-none"
            />
          </div>

          {/* is_active toggle */}
          <div className="flex items-center justify-between px-1">
            <SectionLabel>Status Produk</SectionLabel>
            <button
              onClick={() => set('is_active', !form.is_active)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              {form.is_active ? (
                <><ToggleRight size={22} className="text-emerald-400" /><span className="text-emerald-400">Aktif</span></>
              ) : (
                <><ToggleLeft size={22} className="text-slate-500" /><span className="text-slate-500">Nonaktif</span></>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 rounded-xl px-4 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              <Plus size={12} />
              {saving ? 'Menyimpan…' : 'Buat Produk'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProductConfigAdmin: React.FC = () => {
  const [configs, setConfigs] = useState<SpProductConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getProductConfigs();
    setConfigs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated: SpProductConfig) => {
    setConfigs(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const handleCreated = (cfg: SpProductConfig) => {
    setConfigs(prev => [...prev, cfg]);
    setShowAdd(false);
  };

  const visible = configs.filter(c => {
    if (filterActive === 'ACTIVE') return c.is_active;
    if (filterActive === 'INACTIVE') return !c.is_active;
    return true;
  });

  const activeCount = configs.filter(c => c.is_active).length;
  const inactiveCount = configs.filter(c => !c.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">Konfigurasi Produk &amp; Komisi</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
            {configs.length} produk · {activeCount} aktif · {inactiveCount} nonaktif
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/10 transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors"
          >
            <Plus size={12} />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterActive(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filterActive === f
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f === 'ALL' ? `Semua (${configs.length})` : f === 'ACTIVE' ? `Aktif (${activeCount})` : `Nonaktif (${inactiveCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-slate-500 text-sm font-bold">Tidak ada produk ditemukan.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 flex items-center gap-2 mx-auto bg-white/5 text-slate-300 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            <Plus size={12} /> Tambah Produk Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(cfg => (
            <ProductCard key={cfg.id} config={cfg} onSaved={handleSaved} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default ProductConfigAdmin;
