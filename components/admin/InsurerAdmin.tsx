import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, X, Save, Package, RefreshCw, Upload, Loader2, Copy, Check, Ban } from 'lucide-react';
import { supabase, uploadInsurerLogo, callGateway } from '../../services/supabaseService';
import { useConfirmDialog, useToast } from '../ui';
import {
  CAR_COMP_MIN, CAR_COMP_MAX, CAR_TLO_MIN, CAR_TLO_MAX,
  NON_VEHICLE_RATES,
} from '../../services/ojkRates';
import ModuleIcon from '../shared/ModuleIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpInsurer {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  admin_name?: string;
  admin_email?: string;
  pic_name?: string;
  pic_email?: string;
  pic_phone?: string;
  logo_url?: string;
  created_at?: string;
}

interface SpInsurerProduct {
  id: string;
  insurer_id: string;
  product_type: string;
  vehicle_coverage: string;
  max_vehicle_age_years?: number;
  base_commission_rate: number;
  max_discount_rate: number;
  coin_rate: number;
  stamp_duty: number;
  policy_cost: number;
  authorized_garage_rate: number;
  authorized_garage_max_age_years: number;
  is_active: boolean;
  notes?: string;
  ojk_rate_band?: 'MIN' | 'MID' | 'MAX';
  created_at?: string;
  updated_at?: string;
}

type ProductWithInsurer = SpInsurerProduct & {
  sp_insurers?: { name: string; code: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (v: number, decimals = 1) => `${(v * 100).toFixed(decimals)}%`;

const fmtIDR = (v: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(v);

const PRODUCT_TYPES = ['CAR', 'TRAVEL', 'PA', 'MPAR'] as const;
const COVERAGE_TYPES = ['COMPREHENSIVE', 'TLO', 'ALL'] as const;

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1">{children}</p>
);

const inputCls =
  'bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-ds-ink';

const primaryBtn =
  'bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors';

const secondaryBtn =
  'bg-ds-card2 border border-ds-border hover:bg-ds-card2 text-ds-ink rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors';

const dangerBtn =
  'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-xl px-3 py-2 font-black text-xs transition-colors';

const editBtn =
  'bg-ds-card2 border border-ds-border hover:bg-ds-card2 text-ds-ink2 rounded-xl px-3 py-2 font-black text-xs transition-colors';

// ─── Rate Slider ──────────────────────────────────────────────────────────────

interface RateSliderProps {
  label: string;
  value: number;
  minPct: number;
  maxPct: number;
  onChange: (v: number) => void;
  accentClass?: string;
}

const RateSlider: React.FC<RateSliderProps> = ({
  label,
  value,
  minPct,
  maxPct,
  onChange,
  accentClass = 'accent-emerald-500',
}) => {
  const displayPct = (value * 100).toFixed(1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={minPct}
            max={maxPct}
            step={0.1}
            value={displayPct}
            onChange={e => {
              const raw = parseFloat(e.target.value);
              if (isNaN(raw)) return;
              onChange(Math.min(maxPct, Math.max(minPct, raw)) / 100);
            }}
            className="w-16 bg-ds-card2 border border-ds-border rounded-lg px-2 py-0.5 text-xs font-black text-ds-ink text-right focus:outline-none focus:border-emerald-500/50"
          />
          <span className="text-2xs font-black text-ds-ink3">%</span>
        </div>
      </div>
      <input
        type="range"
        min={minPct}
        max={maxPct}
        step={0.1}
        value={value * 100}
        onChange={e => onChange(parseFloat(e.target.value) / 100)}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer bg-ds-card2 ${accentClass}`}
      />
      <div className="flex justify-between text-2xs text-ds-ink2 font-bold">
        <span>{minPct}%</span>
        <span className="text-emerald-700 dark:text-emerald-400 font-black">{displayPct}%</span>
        <span>{maxPct}%</span>
      </div>
    </div>
  );
};

// ─── Modal Overlay ────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <div className="bg-ds-card border border-ds-border rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-ds-border">
        <h2 className="text-ds-ink font-black text-sm uppercase tracking-widest">{title}</h2>
        <button onClick={onClose} className="text-ds-ink3 hover:text-ds-ink transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="px-7 py-6">{children}</div>
    </div>
  </div>
);

// ─── Add/Edit Insurer Modal ───────────────────────────────────────────────────

interface InsurerFormData {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  admin_name: string;
  admin_email: string;
  pic_name: string;
  pic_email: string;
  pic_phone: string;
}

interface InsurerModalProps {
  initial?: SpInsurer;
  onSave: (data: InsurerFormData) => Promise<void>;
  onClose: () => void;
}

const InsurerModal: React.FC<InsurerModalProps> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<InsurerFormData>({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    description: initial?.description ?? '',
    is_active: initial?.is_active ?? true,
    admin_name: initial?.admin_name ?? '',
    admin_email: initial?.admin_email ?? '',
    pic_name: initial?.pic_name ?? '',
    pic_email: initial?.pic_email ?? '',
    pic_phone: initial?.pic_phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initial) return;
    setLogoUploading(true);
    const url = await uploadInsurerLogo(initial.id, file);
    if (url) {
      await supabase.from('sp_insurers').update({ logo_url: url }).eq('id', initial.id);
      setLogoUrl(url);
    }
    setLogoUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Modal title={initial ? 'Edit Perusahaan Asuransi' : 'Tambah Perusahaan Asuransi'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {initial && (
          <div>
            <SectionLabel>Logo</SectionLabel>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-ds-card2 border border-ds-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img loading="lazy" src={logoUrl} alt={form.name} className="w-full h-full object-contain p-1.5" />
                ) : (
                  <ModuleIcon id="insurers" size={30} />
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden" onChange={handleLogoUpload} />
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                className={`${secondaryBtn} flex items-center gap-1.5`}>
                {logoUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {logoUploading ? 'Mengupload...' : logoUrl ? 'Ganti Logo' : 'Upload Logo'}
              </button>
            </div>
          </div>
        )}
        <div>
          <SectionLabel>Nama Perusahaan</SectionLabel>
          <input
            className={inputCls}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Contoh: Asuransi Wahana Tata"
            required
          />
        </div>
        <div>
          <SectionLabel>Kode Perusahaan</SectionLabel>
          <input
            className={inputCls}
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="Contoh: AWT"
            required
          />
        </div>
        <div>
          <SectionLabel>Deskripsi</SectionLabel>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Deskripsi singkat perusahaan..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Nama Admin</SectionLabel>
            <input className={inputCls} value={form.admin_name}
              onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))}
              placeholder="Nama PIC admin" />
          </div>
          <div>
            <SectionLabel>Email Admin</SectionLabel>
            <input className={inputCls} type="email" value={form.admin_email}
              onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
              placeholder="admin@insurerco.com" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Nama PIC</SectionLabel>
            <input className={inputCls} value={form.pic_name}
              onChange={e => setForm(f => ({ ...f, pic_name: e.target.value }))}
              placeholder="PIC operasional" />
          </div>
          <div>
            <SectionLabel>Email PIC</SectionLabel>
            <input className={inputCls} type="email" value={form.pic_email}
              onChange={e => setForm(f => ({ ...f, pic_email: e.target.value }))}
              placeholder="pic@insurerco.com" />
          </div>
          <div>
            <SectionLabel>No. Telepon PIC</SectionLabel>
            <input className={inputCls} value={form.pic_phone}
              onChange={e => setForm(f => ({ ...f, pic_phone: e.target.value }))}
              placeholder="+628..." />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <SectionLabel>Status Aktif</SectionLabel>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
            {form.is_active ? (
              <ToggleRight size={22} className="text-emerald-700 dark:text-emerald-400" />
            ) : (
              <ToggleLeft size={22} className="text-ds-ink3" />
            )}
            <span className={form.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-ds-ink3'}>
              {form.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={`${primaryBtn} flex items-center gap-2 flex-1 justify-center`}>
            <Save size={13} />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Add/Edit Product Modal ───────────────────────────────────────────────────

type ProductFormData = Omit<SpInsurerProduct, 'id' | 'insurer_id' | 'created_at' | 'updated_at'> & {
  ojk_rate_band: 'MIN' | 'MID' | 'MAX';
};

const defaultProductForm = (): ProductFormData => ({
  product_type: 'CAR',
  vehicle_coverage: 'COMPREHENSIVE',
  max_vehicle_age_years: 0,
  base_commission_rate: 0.15,
  max_discount_rate: 0.05,
  coin_rate: 0.10,
  stamp_duty: 10000,
  policy_cost: 50000,
  authorized_garage_rate: 0.002,
  authorized_garage_max_age_years: 5,
  is_active: true,
  notes: '',
  ojk_rate_band: 'MID' as 'MIN' | 'MID' | 'MAX',
});

interface ProductModalProps {
  insurerName: string;
  initial?: SpInsurerProduct;
  onSave: (data: ProductFormData) => Promise<void>;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ insurerName, initial, onSave, onClose }) => {
  const [form, setForm] = useState<ProductFormData>(
    initial
      ? {
          product_type: initial.product_type,
          vehicle_coverage: initial.vehicle_coverage,
          max_vehicle_age_years: initial.max_vehicle_age_years ?? 0,
          base_commission_rate: initial.base_commission_rate,
          max_discount_rate: initial.max_discount_rate,
          coin_rate: initial.coin_rate,
          stamp_duty: initial.stamp_duty,
          policy_cost: initial.policy_cost,
          authorized_garage_rate: initial.authorized_garage_rate,
          authorized_garage_max_age_years: initial.authorized_garage_max_age_years,
          is_active: initial.is_active,
          notes: initial.notes ?? '',
          ojk_rate_band: (initial.ojk_rate_band ?? 'MID') as 'MIN' | 'MID' | 'MAX',
        }
      : defaultProductForm()
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductFormData>(key: K, val: ProductFormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Modal title={`${initial ? 'Edit' : 'Tambah'} Produk — ${insurerName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type & Coverage */}
        {form.product_type === 'CAR' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel>Tipe Produk</SectionLabel>
              <select
                className={inputCls}
                value={form.product_type}
                onChange={e => set('product_type', e.target.value)}
              >
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <SectionLabel>Tipe Coverage</SectionLabel>
              <select
                className={inputCls}
                value={form.vehicle_coverage}
                onChange={e => set('vehicle_coverage', e.target.value)}
              >
                {COVERAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <SectionLabel>Tipe Produk</SectionLabel>
            <select
              className={inputCls}
              value={form.product_type}
              onChange={e => set('product_type', e.target.value)}
            >
              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* OJK Rate Band */}
        <div>
          <SectionLabel>Band Tarif OJK (SEOJK 6/2017)</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {(['MIN', 'MID', 'MAX'] as const).map(band => (
              <button
                key={band}
                type="button"
                onClick={() => set('ojk_rate_band', band)}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                  form.ojk_rate_band === band
                    ? band === 'MIN' ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      : band === 'MID' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-400'
                    : 'border-ds-border text-ds-ink3'
                }`}
              >
                {band === 'MIN' ? '↓ Tarif Bawah' : band === 'MID' ? '— Tarif Tengah' : '↑ Tarif Atas'}
              </button>
            ))}
          </div>
          <p className="text-2xs text-ds-ink3 mt-1.5">
            {form.product_type === 'CAR'
              ? `Harga kendaraan menentukan kategori OJK. Band ini menentukan posisi tarif dalam rentang yang diizinkan.`
              : `Band menentukan tarif dasar produk non-kendaraan sesuai rentang OJK.`}
          </p>
        </div>

        {/* CAR rate band reference table */}
        {form.product_type === 'CAR' && form.ojk_rate_band && (
          <div className="p-4 bg-ds-card2 border border-ds-border rounded-xl text-2xs text-ds-ink3 space-y-1">
            <p className="font-black text-ds-ink2 text-xs mb-2">
              Referensi Tarif OJK — Komprehensif ({form.ojk_rate_band})
            </p>
            <div className="grid grid-cols-4 gap-x-3 text-2xs font-bold text-ds-ink3 mb-1">
              <span>Kategori</span><span>Zona 1</span><span>Zona 2</span><span>Zona 3</span>
            </div>
            {([1, 2, 3, 4, 5] as const).map(cat => {
              const tbl = form.vehicle_coverage === 'TLO'
                ? (form.ojk_rate_band === 'MIN' ? CAR_TLO_MIN : CAR_TLO_MAX)
                : (form.ojk_rate_band === 'MIN' ? CAR_COMP_MIN : CAR_COMP_MAX);
              const r = tbl[cat];
              return (
                <div key={cat} className="grid grid-cols-4 gap-x-3">
                  <span className="text-ds-ink2 font-black">Kat {cat}</span>
                  <span>{(r[1] * 100).toFixed(2)}%</span>
                  <span>{(r[2] * 100).toFixed(2)}%</span>
                  <span>{(r[3] * 100).toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Non-CAR rate reference */}
        {form.product_type !== 'CAR' && (
          <div className="p-4 bg-ds-card2 border border-ds-border rounded-xl text-2xs text-ds-ink3 space-y-1">
            <p className="font-black text-ds-ink2 text-xs mb-2">Referensi Tarif OJK — {form.product_type}</p>
            {form.product_type === 'TRAVEL' && (
              <>
                <p>Domestik: {(NON_VEHICLE_RATES.TRAVEL.domestic.min * 100).toFixed(2)}% – {(NON_VEHICLE_RATES.TRAVEL.domestic.max * 100).toFixed(2)}% dari nilai perjalanan</p>
                <p>Internasional: {(NON_VEHICLE_RATES.TRAVEL.international.min * 100).toFixed(2)}% – {(NON_VEHICLE_RATES.TRAVEL.international.max * 100).toFixed(2)}% dari nilai perjalanan</p>
              </>
            )}
            {form.product_type === 'PA' && (
              <>
                <p>Premi: Rp {NON_VEHICLE_RATES.PA.bands.min.toLocaleString('id-ID')} – Rp {NON_VEHICLE_RATES.PA.bands.max.toLocaleString('id-ID')} / orang / tahun</p>
                <p>(tergantung uang pertanggungan &amp; profil risiko)</p>
              </>
            )}
            {form.product_type === 'MPAR' && (
              <>
                <p>Premi: {(NON_VEHICLE_RATES.MPAR.bands.min * 100).toFixed(1)}% – {(NON_VEHICLE_RATES.MPAR.bands.max * 100).toFixed(1)}% dari nilai perangkat / tahun</p>
                <p>(handphone, laptop, gadget)</p>
              </>
            )}
          </div>
        )}

        {/* Max Vehicle Age — CAR only */}
        {form.product_type === 'CAR' && (
          <div>
            <SectionLabel>Maks. Usia Kendaraan (tahun, 0 = tidak terbatas)</SectionLabel>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.max_vehicle_age_years ?? 0}
              onChange={e => set('max_vehicle_age_years', parseInt(e.target.value) || 0)}
            />
            {(form.max_vehicle_age_years ?? 0) === 0 && (
              <p className="text-2xs text-ds-ink3 mt-1">Tidak terbatas</p>
            )}
          </div>
        )}

        {/* Tarif & Komisi header */}
        <div className="pt-2 border-t border-ds-border">
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-4">Tarif & Komisi</p>
        </div>

        {/* Commission Rate */}
        <RateSlider
          label="Komisi Dasar"
          value={form.base_commission_rate}
          minPct={0}
          maxPct={25}
          onChange={v => set('base_commission_rate', v)}
          accentClass="accent-emerald-500"
        />

        {/* Max Discount */}
        <RateSlider
          label="Maks. Diskon"
          value={form.max_discount_rate}
          minPct={0}
          maxPct={15}
          onChange={v => set('max_discount_rate', v)}
          accentClass="accent-amber-500"
        />

        {/* Coin Rate */}
        <RateSlider
          label="Rate Koin"
          value={form.coin_rate}
          minPct={0}
          maxPct={25}
          onChange={v => set('coin_rate', v)}
          accentClass="accent-yellow-500"
        />

        {/* Authorized Garage Rate — CAR only */}
        {form.product_type === 'CAR' && (
          <RateSlider
            label="Tarif Bengkel Resmi"
            value={form.authorized_garage_rate}
            minPct={0}
            maxPct={1}
            onChange={v => set('authorized_garage_rate', v)}
            accentClass="accent-blue-500"
          />
        )}

        {/* IDR Costs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Bea Materai (IDR)</SectionLabel>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.stamp_duty}
              onChange={e => set('stamp_duty', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <SectionLabel>Biaya Admin Polis (IDR)</SectionLabel>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.policy_cost}
              onChange={e => set('policy_cost', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Garage max age — CAR only */}
        {form.product_type === 'CAR' && (
          <div>
            <SectionLabel>Maks. Usia Kendaraan untuk Bengkel Resmi (tahun)</SectionLabel>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.authorized_garage_max_age_years}
              onChange={e => set('authorized_garage_max_age_years', parseInt(e.target.value) || 0)}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <SectionLabel>Catatan</SectionLabel>
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Catatan tambahan..."
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <SectionLabel>Status Aktif</SectionLabel>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
            {form.is_active ? (
              <ToggleRight size={22} className="text-emerald-700 dark:text-emerald-400" />
            ) : (
              <ToggleLeft size={22} className="text-ds-ink3" />
            )}
            <span className={form.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-ds-ink3'}>
              {form.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={`${primaryBtn} flex items-center gap-2 flex-1 justify-center`}>
            <Save size={13} />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Product Table ────────────────────────────────────────────────────────────

interface ProductTableProps {
  insurerId: string;
  insurerName: string;
  onRequestAdd: () => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ insurerId, insurerName, onRequestAdd }) => {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const [products, setProducts] = useState<ProductWithInsurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<SpInsurerProduct | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sp_insurer_products')
      .select('*, sp_insurers(name, code)')
      .eq('insurer_id', insurerId);
    setProducts((data ?? []) as ProductWithInsurer[]);
    setLoading(false);
  }, [insurerId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Produk?',
      description: 'Produk asuransi ini akan dihapus permanen.',
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
    });
    if (!ok) return;
    await callGateway('admin_delete_insurer_product', { product_id: id });
    toast.success('Produk dihapus');
    fetchProducts();
  };

  const handleEditSave = async (data: ProductFormData) => {
    if (!editTarget) return;
    await callGateway('admin_save_insurer_product', { id: editTarget.id, ...data });
    setEditTarget(null);
    fetchProducts();
  };

  if (loading) {
    return <p className="text-xs text-ds-ink3 py-4 text-center">Memuat produk...</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {editTarget && (
        <ProductModal
          insurerName={insurerName}
          initial={editTarget}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {products.length === 0 ? (
        <p className="text-xs text-ds-ink3 text-center py-3">Belum ada produk.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-2xs font-black uppercase tracking-widest text-ds-ink3 border-b border-ds-border">
                <th className="text-left py-2 pr-4">Produk</th>
                <th className="text-left py-2 pr-4">Coverage</th>
                <th className="text-left py-2 pr-4">Maks. Usia</th>
                <th className="text-right py-2 pr-4">Komisi</th>
                <th className="text-right py-2 pr-4">Diskon Maks</th>
                <th className="text-right py-2 pr-4">Koin</th>
                <th className="text-right py-2 pr-4">Biaya Admin</th>
                <th className="text-center py-2 pr-4">Status</th>
                <th className="text-right py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-ds-card2 transition-colors">
                  <td className="py-2.5 pr-4">
                    <span className="font-black text-ds-ink">{p.product_type}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-ds-ink3">{p.vehicle_coverage}</td>
                  <td className="py-2.5 pr-4 text-ds-ink3">
                    {(p.max_vehicle_age_years ?? 0) === 0 ? 'Tidak terbatas' : `${p.max_vehicle_age_years} thn`}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-emerald-700 dark:text-emerald-400 font-black">
                    {pct(p.base_commission_rate)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-amber-800 dark:text-amber-400 font-black">
                    {pct(p.max_discount_rate)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-yellow-800 dark:text-yellow-400 font-black">
                    {pct(p.coin_rate)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-ds-ink3">
                    {fmtIDR(p.policy_cost)}
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest ${
                      p.is_active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    }`}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditTarget(p)} className={editBtn}>
                        <Pencil size={10} className="inline mr-1" />Edit
                      </button>
                      <button onClick={() => handleDelete(p.id)} className={dangerBtn}>
                        <Trash2 size={10} className="inline mr-1" />Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pt-1">
        <button onClick={onRequestAdd} className={`${primaryBtn} flex items-center gap-2`}>
          <Plus size={12} />
          Tambah Produk
        </button>
      </div>
    </div>
  );
};

// ─── Insurer Card ─────────────────────────────────────────────────────────────

interface InsurerCardProps {
  insurer: SpInsurer;
  onEdit: (ins: SpInsurer) => void;
  onDelete: (id: string) => void;
  onToggleActive: (ins: SpInsurer) => void;
}

const InsurerCard: React.FC<InsurerCardProps> = ({ insurer, onEdit, onDelete, onToggleActive }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddProduct = async (data: ProductFormData) => {
    await callGateway('admin_save_insurer_product', { ...data, insurer_id: insurer.id });
    setShowAddProduct(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className={`bg-ds-card2 border border-ds-border rounded-[2rem] p-6 space-y-4 transition-all duration-300 ${
      !insurer.is_active ? 'opacity-60' : ''
    }`}>
      {showAddProduct && (
        <ProductModal
          insurerName={insurer.name}
          onSave={handleAddProduct}
          onClose={() => setShowAddProduct(false)}
        />
      )}

      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {insurer.logo_url ? (
            <img loading="lazy" src={insurer.logo_url} alt={insurer.name} className="w-full h-full object-contain p-1" />
          ) : (
            <ModuleIcon id="insurers" size={28} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-ds-ink text-sm leading-tight">{insurer.name}</h3>
            <span className="text-2xs font-black uppercase tracking-widest bg-ds-card2 border border-ds-border text-ds-ink3 rounded-full px-2 py-0.5">
              {insurer.code}
            </span>
          </div>
          {insurer.description && (
            <p className="text-[11px] text-ds-ink3 mt-1 leading-snug">{insurer.description}</p>
          )}
        </div>
        <button
          onClick={() => onToggleActive(insurer)}
          className="flex-shrink-0 flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest"
        >
          {insurer.is_active ? (
            <ToggleRight size={20} className="text-emerald-700 dark:text-emerald-400" />
          ) : (
            <ToggleLeft size={20} className="text-ds-ink3" />
          )}
          <span className={insurer.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-ds-ink3'}>
            {insurer.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => onEdit(insurer)} className={editBtn}>
          <Pencil size={10} className="inline mr-1" />Edit
        </button>
        <button onClick={() => onDelete(insurer.id)} className={dangerBtn}>
          <Trash2 size={10} className="inline mr-1" />Hapus
        </button>
        <button
          onClick={() => setExpanded(v => !v)}
          className={`${secondaryBtn} flex items-center gap-1.5`}
        >
          <Package size={11} />
          Lihat Produk
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Product accordion */}
      {expanded && (
        <div className="pt-2 border-t border-ds-border">
          <ProductTable
            key={refreshKey}
            insurerId={insurer.id}
            insurerName={insurer.name}
            onRequestAdd={() => setShowAddProduct(true)}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const InsurerAdmin: React.FC = () => {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const [insurers, setInsurers] = useState<SpInsurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<SpInsurer | null>(null);
  const [activeTab, setActiveTab] = useState<'insurers' | 'tokens' | 'review-links'>('insurers');

  const fetchInsurers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('sp_insurers').select('*').order('name');
    setInsurers((data ?? []) as SpInsurer[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInsurers(); }, [fetchInsurers]);

  const handleAdd = async (data: InsurerFormData) => {
    await callGateway('admin_create_insurer', data as any);
    setShowAdd(false);
    fetchInsurers();
  };

  const handleEdit = async (data: InsurerFormData) => {
    if (!editTarget) return;
    await callGateway('admin_update_insurer', { insurer_id: editTarget.id, ...data });
    setEditTarget(null);
    fetchInsurers();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Perusahaan Asuransi?',
      description: 'Perusahaan asuransi ini akan dihapus. Semua produk terkait juga akan terhapus.',
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
    });
    if (!ok) return;
    await callGateway('admin_delete_insurer', { insurer_id: id });
    toast.success('Perusahaan asuransi dihapus');
    fetchInsurers();
  };

  const handleToggleActive = async (ins: SpInsurer) => {
    await callGateway('admin_update_insurer', { insurer_id: ins.id, is_active: !ins.is_active });
    fetchInsurers();
  };

  return (
    <div className="space-y-8">
      {showAdd && (
        <InsurerModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editTarget && (
        <InsurerModal
          initial={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">
            Manajemen
          </p>
          <h1 className="text-2xl font-black text-ds-ink">Mitra Asuransi</h1>
        </div>
        {activeTab === 'insurers' && (
          <div className="flex items-center gap-3">
            <button
              onClick={fetchInsurers}
              className={`${secondaryBtn} flex items-center gap-2`}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className={`${primaryBtn} flex items-center gap-2`}
            >
              <Plus size={13} />
              Tambah Perusahaan
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-ds-border">
        {([
          { id: 'insurers',      label: 'Perusahaan',    iconId: 'insurers' },
          { id: 'tokens',        label: 'Token Akses',   iconId: 'security' },
          { id: 'review-links',  label: 'Link Review',   iconId: 'documents' },
        ] as const).map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                active
                  ? 'border-emerald-400 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-ds-ink3 hover:text-ds-ink2'
              }`}
            >
              <ModuleIcon id={tab.iconId} size={22} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'insurers' && (
        <>
          {/* Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="bg-ds-card2 border border-ds-border rounded-2xl px-5 py-3">
              <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Total</p>
              <p className="text-xl font-black text-ds-ink">{insurers.length}</p>
            </div>
            <div className="bg-ds-card2 border border-ds-border rounded-2xl px-5 py-3">
              <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Aktif</p>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{insurers.filter(i => i.is_active).length}</p>
            </div>
            <div className="bg-ds-card2 border border-ds-border rounded-2xl px-5 py-3">
              <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Nonaktif</p>
              <p className="text-xl font-black text-rose-700 dark:text-rose-300">{insurers.filter(i => !i.is_active).length}</p>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-16 text-ds-ink3 text-sm font-bold">Memuat data...</div>
          ) : insurers.length === 0 ? (
            <div className="text-center py-16 text-ds-ink3 text-sm font-bold">
              Belum ada perusahaan asuransi. Klik "Tambah Perusahaan" untuk memulai.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {insurers.map(ins => (
                <InsurerCard
                  key={ins.id}
                  insurer={ins}
                  onEdit={setEditTarget}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'tokens' && <InsurerTokenManagement insurers={insurers} />}
      {activeTab === 'review-links' && <ReviewLinkManagement />}
    </div>
  );
};

// ─── Insurer Token Management Sub-Component ──────────────────────────────────

interface InsurerToken {
  id: string;
  insurer_id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  insurer_name?: string;
}

const InsurerTokenManagement: React.FC<{ insurers: SpInsurer[] }> = ({ insurers }) => {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const [tokens, setTokens] = useState<InsurerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ insurerName: string; link: string; email: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await callGateway('admin_list_insurer_tokens', { limit: 200 });
      if (error) throw new Error(error);
      setTokens(data ?? []);
    } catch (e: any) {
      console.error('Token load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (tokenId: string, insurerName: string) => {
    const ok = await confirm({
      title: 'Hapus Token Akses?',
      description: `Token akses untuk ${insurerName} akan dihapus. Insurer akan langsung logout dari dashboard.`,
      confirmLabel: 'Hapus Token',
      cancelLabel: 'Batal',
    });
    if (!ok) return;
    try {
      const { error } = await callGateway('admin_revoke_insurer_token', { token_id: tokenId });
      if (error) throw new Error(error);
      toast.success('Token dihapus');
      load();
    } catch (e: any) {
      console.warn(`Gagal hapus token: ${e.message}`);
    }
  };

  const handleGenerate = async (insurerId: string) => {
    setGeneratingFor(insurerId);
    try {
      const { data, error } = await callGateway('admin_generate_insurer_token', { insurer_id: insurerId });
      if (error) throw new Error(error);
      setGeneratedLink({
        insurerName: data.insurer_name,
        link: data.magic_link,
        email: data.email,
      });
      load();
    } catch (e: any) {
      console.warn(`Gagal generate token: ${e.message}`);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Generate token for insurer */}
      <div className="bg-ds-card2 border border-ds-border rounded-2xl p-5">
        <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-3">Generate Token Baru</p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-xs text-ds-ink focus:outline-none focus:border-emerald-500 [&>option]:bg-ds-card"
            defaultValue=""
            onChange={e => { if (e.target.value) handleGenerate(e.target.value); }}
          >
            <option value="">Pilih perusahaan asuransi…</option>
            {insurers.filter(i => i.is_active).map(ins => (
              <option key={ins.id} value={ins.id}>{ins.name}</option>
            ))}
          </select>
          {generatingFor && <Loader2 size={14} className="animate-spin text-emerald-700 dark:text-emerald-400" />}
        </div>
        {insurers.filter(i => i.is_active).length === 0 && (
          <p className="text-2xs text-amber-800 dark:text-amber-400 mt-2">⚠ Tidak ada insurer aktif. Tambahkan insurer dulu di tab Perusahaan.</p>
        )}
      </div>

      {/* Generated link modal */}
      {generatedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setGeneratedLink(null)}>
          <div className="bg-ds-card border border-ds-border rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-ds-ink">Token Berhasil Dibuat</h3>
              <button onClick={() => setGeneratedLink(null)} className="text-ds-ink3 hover:text-ds-ink"><X size={16} /></button>
            </div>
            <p className="text-xs text-ds-ink3">Untuk: <span className="text-ds-ink font-bold">{generatedLink.insurerName}</span> ({generatedLink.email})</p>
            <div className="bg-black/30 border border-ds-border rounded-xl p-3">
              <p className="text-2xs font-bold uppercase tracking-widest text-ds-ink3 mb-1">Magic Link (kirim ke PIC insurer):</p>
              <p className="text-xs text-emerald-400 font-mono break-all">{generatedLink.link}</p>
            </div>
            <button
              onClick={() => handleCopy(generatedLink.link, 'generated')}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400"
            >
              {copiedId === 'generated' ? <><Check size={13} /> Tersalin!</> : <><Copy size={13} /> Copy Link</>}
            </button>
            <p className="text-2xs text-ds-ink3 text-center">Token berlaku 7 hari, auto-renew setiap insurer buka dashboard.</p>
          </div>
        </div>
      )}

      {/* Active tokens list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Token Aktif ({tokens.filter(t => !isExpired(t.expires_at)).length})</p>
          <button onClick={load} className="text-2xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-ds-ink3 text-xs">Memuat token…</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-ds-ink3 text-xs">
            Belum ada token akses. Generate token baru di atas untuk memberikan akses dashboard ke insurer.
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => {
              const expired = isExpired(t.expires_at);
              return (
                <div key={t.id} className={`bg-ds-card2 border ${expired ? 'border-rose-500/20' : 'border-ds-border'} rounded-2xl p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-ds-ink">{t.insurer_name ?? 'Unknown'}</p>
                        {expired ? (
                          <span className="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300">Expired</span>
                        ) : (
                          <span className="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active</span>
                        )}
                      </div>
                      <p className="text-2xs text-ds-ink3 font-mono mt-0.5">{t.email}</p>
                      <div className="flex items-center gap-3 mt-2 text-2xs text-ds-ink3">
                        <span>Dibuat: {new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                        <span>Expire: {new Date(t.expires_at).toLocaleDateString('id-ID')}</span>
                        {t.used_at && <span>Last used: {new Date(t.used_at).toLocaleDateString('id-ID')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(`https://myinsurepath.com/insurerapp?token=${t.token}`, t.id)}
                        className="p-2 rounded-lg bg-ds-card2 text-ds-ink3 hover:text-emerald-400 hover:bg-ds-card2 transition-colors"
                        title="Copy magic link"
                      >
                        {copiedId === t.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => handleRevoke(t.id, t.insurer_name ?? 'insurer')}
                        className="p-2 rounded-lg bg-ds-card2 text-ds-ink3 hover:text-rose-400 hover:bg-ds-card2 transition-colors"
                        title="Revoke token"
                      >
                        <Ban size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Review Link Management Sub-Component ────────────────────────────────────

interface ReviewToken {
  id: string;
  token: string;
  order_id: string;
  expires_at: string;
  insurer_action: string | null;
  insurer_notes: string | null;
  actioned_at: string | null;
  accessed_count: number;
  last_accessed_at: string | null;
  created_at: string;
  review_url: string | null;
  order_number: string | null;
  client_name: string | null;
  product_name: string | null;
  insurer_name: string | null;
  order_status: string | null;
}

const ReviewLinkManagement: React.FC = () => {
  const [tokens, setTokens] = useState<ReviewToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'actioned' | 'expired'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await callGateway('admin_list_review_tokens', { limit: 200 });
      if (error) throw new Error(error);
      setTokens(data ?? []);
    } catch (e: any) {
      console.error('Review tokens load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const filtered = tokens.filter(t => {
    if (filter === 'pending') return !t.insurer_action && !isExpired(t.expires_at);
    if (filter === 'actioned') return !!t.insurer_action;
    if (filter === 'expired') return isExpired(t.expires_at) && !t.insurer_action;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {([
          { id: 'all',      label: 'Semua' },
          { id: 'pending',  label: 'Menunggu' },
          { id: 'actioned', label: 'Sudah Diproses' },
          { id: 'expired',  label: 'Kedaluwarsa' },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-2xs font-black uppercase tracking-widest transition-colors ${
              filter === f.id ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-ds-card2 text-ds-ink3 border border-ds-border'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-2xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ds-card2 border border-ds-border rounded-2xl px-4 py-3">
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Total</p>
          <p className="text-lg font-black text-ds-ink">{tokens.length}</p>
        </div>
        <div className="bg-ds-card2 border border-ds-border rounded-2xl px-4 py-3">
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Menunggu</p>
          <p className="text-lg font-black text-amber-800 dark:text-amber-400">{tokens.filter(t => !t.insurer_action && !isExpired(t.expires_at)).length}</p>
        </div>
        <div className="bg-ds-card2 border border-ds-border rounded-2xl px-4 py-3">
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Diproses</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{tokens.filter(t => t.insurer_action).length}</p>
        </div>
        <div className="bg-ds-card2 border border-ds-border rounded-2xl px-4 py-3">
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Expired</p>
          <p className="text-lg font-black text-rose-700 dark:text-rose-300">{tokens.filter(t => isExpired(t.expires_at) && !t.insurer_action).length}</p>
        </div>
      </div>

      {/* Token list */}
      {loading ? (
        <div className="text-center py-8 text-ds-ink3 text-xs">Memuat review links…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-ds-ink3 text-xs">
          Tidak ada review link untuk filter ini. Link otomatis dibuat saat operator menyetujui pengajuan polis.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const expired = isExpired(t.expires_at);
            return (
              <div key={t.id} className={`bg-ds-card2 border ${expired ? 'border-rose-500/20' : 'border-ds-border'} rounded-2xl p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ds-ink">{t.order_number ?? t.order_id.slice(0, 8)}</p>
                      <span className="text-2xs text-ds-ink3">{t.insurer_name ?? '-'}</span>
                      {t.insurer_action ? (
                        <span className={`text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                          t.insurer_action === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : t.insurer_action === 'REQUEST_INFO' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        }`}>
                          {t.insurer_action}
                        </span>
                      ) : expired ? (
                        <span className="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300">Expired</span>
                      ) : (
                        <span className="text-2xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">Pending</span>
                      )}
                    </div>
                    <p className="text-xs text-ds-ink3 mt-0.5">{t.client_name ?? '-'} · {t.product_name ?? '-'}</p>
                    {t.insurer_notes && (
                      <p className="text-2xs text-ds-ink3 mt-1 italic">"{t.insurer_notes}"</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-2xs text-ds-ink3">
                      <span>Dibuat: {new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                      <span>Akses: {t.accessed_count}x</span>
                      {t.last_accessed_at && <span>Last: {new Date(t.last_accessed_at).toLocaleDateString('id-ID')}</span>}
                    </div>
                  </div>
                  {t.review_url && !t.insurer_action && (
                    <button
                      onClick={() => handleCopy(t.review_url!, t.id)}
                      className="p-2 rounded-lg bg-ds-card2 text-ds-ink3 hover:text-emerald-400 hover:bg-ds-card2 transition-colors shrink-0"
                      title="Copy review link"
                    >
                      {copiedId === t.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InsurerAdmin;
