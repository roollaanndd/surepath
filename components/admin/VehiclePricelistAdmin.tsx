import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Pencil, Trash2, RefreshCw, Save, X, Car,
  ToggleLeft, ToggleRight, Search, Database, Upload,
} from 'lucide-react';
import { supabase } from '../../services/supabaseService';
import { CAR_DATABASE } from '../../constants';
import PricelistUploadModal from './PricelistUploadModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpVehicleOverride {
  id: string;
  brand: string;
  model: string;
  ref_year: number;
  list_price_m: number;
  market_value_rp: number;
  discount_rate: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtIDR = (v: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(v);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function extractVersions(overrides: SpVehicleOverride[]): string[] {
  const set = new Set<string>();
  overrides.forEach(o => {
    const m = o.notes?.match(/version:([^\s]+)/);
    if (m) set.add(m[1]);
  });
  return Array.from(set).sort().reverse();
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{children}</p>
);

const inputCls =
  'bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white';

const primaryBtn =
  'bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors';

const secondaryBtn =
  'bg-white/[0.05] border border-white/10 hover:bg-white/10 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors';

const dangerBtn =
  'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-xl px-3 py-2 font-black text-xs transition-colors';

const editBtn =
  'bg-white/[0.05] border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl px-3 py-2 font-black text-xs transition-colors';

// ─── Modal ────────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-white/5">
        <h2 className="text-white font-black text-sm uppercase tracking-widest">{title}</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="px-7 py-6">{children}</div>
    </div>
  </div>
);

// ─── Form ─────────────────────────────────────────────────────────────────────

type FormData = Omit<SpVehicleOverride, 'id' | 'created_at' | 'updated_at'>;

const defaultForm = (): FormData => ({
  brand: '',
  model: '',
  ref_year: new Date().getFullYear(),
  list_price_m: 0,
  market_value_rp: 0,
  discount_rate: 0,
  is_active: true,
  notes: '',
});

interface OverrideModalProps {
  initial?: SpVehicleOverride;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}

const OverrideModal: React.FC<OverrideModalProps> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<FormData>(
    initial
      ? {
          brand: initial.brand,
          model: initial.model,
          ref_year: initial.ref_year,
          list_price_m: initial.list_price_m,
          market_value_rp: initial.market_value_rp,
          discount_rate: initial.discount_rate,
          is_active: initial.is_active,
          notes: initial.notes ?? '',
        }
      : defaultForm()
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Modal title={initial ? 'Edit Override Kendaraan' : 'Tambah Override Kendaraan'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Merek</SectionLabel>
            <input className={inputCls} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Toyota" required />
          </div>
          <div>
            <SectionLabel>Model</SectionLabel>
            <input className={inputCls} value={form.model} onChange={e => set('model', e.target.value)} placeholder="Avanza" required />
          </div>
        </div>
        <div>
          <SectionLabel>Tahun Referensi</SectionLabel>
          <input type="number" min={1990} max={new Date().getFullYear() + 1} className={inputCls} value={form.ref_year} onChange={e => set('ref_year', parseInt(e.target.value) || new Date().getFullYear())} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Harga List OTR (juta IDR)</SectionLabel>
            <input type="number" min={0} step={0.1} className={inputCls} value={form.list_price_m} onChange={e => set('list_price_m', parseFloat(e.target.value) || 0)} placeholder="250" />
          </div>
          <div>
            <SectionLabel>Nilai Pasar (IDR)</SectionLabel>
            <input type="number" min={0} className={inputCls} value={form.market_value_rp} onChange={e => set('market_value_rp', parseInt(e.target.value) || 0)} placeholder="240000000" />
          </div>
        </div>
        <div>
          <SectionLabel>Diskon Rate (%)</SectionLabel>
          <div className="flex items-center gap-3">
            <input type="number" min={0} max={50} step={0.1} className={inputCls} value={(form.discount_rate * 100).toFixed(1)} onChange={e => set('discount_rate', parseFloat(e.target.value) / 100 || 0)} />
            <span className="text-slate-400 font-black text-sm">%</span>
          </div>
          <input type="range" min={0} max={50} step={0.1} value={form.discount_rate * 100} onChange={e => set('discount_rate', parseFloat(e.target.value) / 100)} className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-emerald-500 mt-2" />
        </div>
        <div>
          <SectionLabel>Catatan</SectionLabel>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Catatan tambahan..." />
        </div>
        <div className="flex items-center justify-between">
          <SectionLabel>Status Aktif</SectionLabel>
          <button type="button" onClick={() => set('is_active', !form.is_active)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
            {form.is_active ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} className="text-slate-500" />}
            <span className={form.is_active ? 'text-emerald-400' : 'text-slate-500'}>{form.is_active ? 'Aktif' : 'Nonaktif'}</span>
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={`${primaryBtn} flex items-center gap-2 flex-1 justify-center`}>
            <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>Batal</button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const VehiclePricelistAdmin: React.FC = () => {
  const [overrides, setOverrides] = useState<SpVehicleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<SpVehicleOverride | null>(null);
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [activeVersion, setActiveVersion] = useState('');
  const hasSeededRef = useRef(false);

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sp_vehicle_overrides')
      .select('*')
      .order('brand')
      .order('model');
    const rows = (data ?? []) as SpVehicleOverride[];
    setOverrides(rows);
    setLoading(false);
    // Auto-seed if empty — only once per mount
    if (rows.length === 0 && !hasSeededRef.current) {
      hasSeededRef.current = true;
      await syncFromConstants(rows);
    }
  }, []);  

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const syncFromConstants = async (existing: SpVehicleOverride[]) => {
    setSyncing(true);
    setSyncMsg('Menyinkronkan...');
    const existingKeys = new Set(existing.map(o => `${o.brand}|${o.model}|${o.ref_year}`));
    const rows: Omit<SpVehicleOverride, 'id' | 'created_at' | 'updated_at'>[] = [];
    for (const car of CAR_DATABASE) {
      for (const [yearStr, price] of Object.entries(car.yearPrices)) {
        const year = Number(yearStr);
        const key = `${car.brand}|${car.modelName}|${year}`;
        if (!existingKeys.has(key)) {
          rows.push({
            brand: car.brand,
            model: car.modelName,
            ref_year: year,
            list_price_m: price,
            market_value_rp: Math.round(price * 1_000_000 * 0.95),
            discount_rate: 0.05,
            is_active: true,
            notes: 'version:constants-seed',
          });
        }
      }
    }
    let inserted = 0;
    const skipped = CAR_DATABASE.reduce((s, c) => s + Object.keys(c.yearPrices).length, 0) - rows.length;
    // Batch insert in chunks of 200
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from('sp_vehicle_overrides').insert(chunk);
      if (!error) inserted += chunk.length;
    }
    setSyncMsg(`Selesai: ${inserted} ditambahkan, ${skipped} sudah ada.`);
    // Directly refresh overrides without triggering another loading flash
    const { data: refreshed } = await supabase
      .from('sp_vehicle_overrides')
      .select('*')
      .order('brand')
      .order('model');
    setOverrides((refreshed ?? []) as SpVehicleOverride[]);
    setSyncing(false);
  };

  const handleSyncClick = async () => {
    const { data } = await supabase.from('sp_vehicle_overrides').select('brand,model,ref_year');
    await syncFromConstants((data ?? []) as SpVehicleOverride[]);
  };

  const handleAdd = async (form: FormData) => {
    await supabase.from('sp_vehicle_overrides').upsert({ ...form, updated_at: new Date().toISOString() }, { onConflict: 'brand,model,ref_year' });
    setShowAdd(false);
    fetchOverrides();
  };

  const handleEdit = async (form: FormData) => {
    if (!editTarget) return;
    await supabase.from('sp_vehicle_overrides').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editTarget.id);
    setEditTarget(null);
    fetchOverrides();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus override kendaraan ini?')) return;
    await supabase.from('sp_vehicle_overrides').delete().eq('id', id);
    fetchOverrides();
  };

  const handleToggle = async (ov: SpVehicleOverride) => {
    await supabase.from('sp_vehicle_overrides').update({ is_active: !ov.is_active, updated_at: new Date().toISOString() }).eq('id', ov.id);
    fetchOverrides();
  };

  const versions = extractVersions(overrides);
  const q = query.toLowerCase();
  const filtered = overrides.filter(ov => {
    if (activeVersion && !(ov.notes ?? '').includes(`version:${activeVersion}`)) return false;
    return !q || ov.brand.toLowerCase().includes(q) || ov.model.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {showAdd && <OverrideModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editTarget && <OverrideModal initial={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />}
      {showUpload && (
        <PricelistUploadModal
          versions={versions}
          onClose={() => setShowUpload(false)}
          onDone={() => { fetchOverrides(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Manajemen</p>
          <h1 className="text-2xl font-black text-white">Database Kendaraan</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={fetchOverrides} className={`${secondaryBtn} flex items-center gap-2`}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={handleSyncClick} disabled={syncing} className={`${secondaryBtn} flex items-center gap-2`}>
            <Database size={12} /> {syncing ? 'Sinkronisasi...' : 'Sinkronisasi dari Database Bawaan'}
          </button>
          <button onClick={() => setShowUpload(true)} className={`${secondaryBtn} flex items-center gap-2`}>
            <Upload size={12} /> Upload Pricelist
          </button>
          <button onClick={() => setShowAdd(true)} className={`${primaryBtn} flex items-center gap-2`}>
            <Plus size={13} /> Tambah Override
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          {syncMsg}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total</p>
          <p className="text-xl font-black text-white">{overrides.length}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Aktif</p>
          <p className="text-xl font-black text-emerald-400">{overrides.filter(o => o.is_active).length}</p>
        </div>
        {versions.length > 0 && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Versi</p>
            <p className="text-xl font-black text-white">{versions.length}</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="bg-white/[0.05] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white"
            placeholder="Cari merek / model..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {versions.length > 0 && (
          <select
            className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
            value={activeVersion}
            onChange={e => setActiveVersion(e.target.value)}
          >
            <option value="">Semua Versi</option>
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-bold">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-4">
          <Car size={40} className="text-slate-600" />
          {query || activeVersion ? 'Tidak ada hasil untuk filter ini.' : 'Belum ada data override. Klik "Tambah Override" atau "Sinkronisasi dari Database Bawaan".'}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                  <th className="text-left px-6 py-4">Merek / Model</th>
                  <th className="text-left px-4 py-4">Tahun</th>
                  <th className="text-right px-4 py-4">Harga List</th>
                  <th className="text-right px-4 py-4">Nilai Pasar</th>
                  <th className="text-right px-4 py-4">Diskon</th>
                  <th className="text-center px-4 py-4">Status</th>
                  <th className="text-right px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map(ov => (
                  <tr key={ov.id} className={`hover:bg-white/[0.02] transition-colors ${!ov.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-3">
                      <p className="font-black text-white">{ov.brand}</p>
                      <p className="text-[10px] text-slate-400">{ov.model}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-bold">{ov.ref_year}</td>
                    <td className="px-4 py-3 text-right text-slate-300 font-bold">{fmtIDR(ov.list_price_m * 1_000_000)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-black">{fmtIDR(ov.market_value_rp)}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-black">{pct(ov.discount_rate)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(ov)}>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${ov.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {ov.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditTarget(ov)} className={editBtn}><Pencil size={10} className="inline mr-1" />Edit</button>
                        <button onClick={() => handleDelete(ov.id)} className={dangerBtn}><Trash2 size={10} className="inline mr-1" />Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-600 font-bold">
        Override ini digunakan untuk menyesuaikan nilai pertanggungan kendaraan di luar database OJK standar.
        Data pasar aktif akan diprioritaskan saat agen memilih kendaraan dalam wizard.
      </p>
    </div>
  );
};

export default VehiclePricelistAdmin;
