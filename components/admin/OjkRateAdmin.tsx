import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Save, Copy, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  getAllOjkRateSets, createOjkRateSet, updateOjkRateSet, activateOjkRateSet, deleteOjkRateSet,
  type SpOjkRateSet,
} from '../../services/supabaseService';
import { useConfirmDialog, useToast } from '../ui';

// ─── Shared UI primitives (mirrors InsurerAdmin.tsx conventions) ─────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-1">{children}</p>
);

const inputCls =
  'bg-ds-card2 border border-ds-border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white';

const primaryBtn =
  'bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-40';

const secondaryBtn =
  'bg-ds-card2 hover:bg-ds-card2 text-ds-ink2 border border-ds-border rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-40';

const Card: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="bg-ds-card2 border border-ds-border rounded-2xl p-5 space-y-3">
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-emerald-400">{title}</p>
      {sub && <p className="text-[10px] text-ds-ink3 mt-0.5">{sub}</p>}
    </div>
    {children}
  </div>
);

const ZONES = [1, 2, 3] as const;
const CATEGORIES = [1, 2, 3, 4, 5] as const;

type ZoneTable = Record<string, Record<string, number>>;

// 5 (category) × 3 (zone) percentage-rate matrix editor
const ZoneMatrix: React.FC<{
  label: string;
  table: ZoneTable;
  onChange: (t: ZoneTable) => void;
}> = ({ label, table, onChange }) => {
  const setCell = (cat: number, zone: number, pct: string) => {
    const v = parseFloat(pct);
    const next: ZoneTable = { ...table, [cat]: { ...table[cat], [zone]: isNaN(v) ? 0 : v / 100 } };
    onChange(next);
  };
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="overflow-x-auto rounded-xl border border-ds-border">
        <table className="w-full text-xs">
          <thead className="bg-white/[0.04] text-[9px] uppercase tracking-widest text-ds-ink3">
            <tr>
              <th className="px-3 py-2 text-left">Kategori</th>
              {ZONES.map(z => <th key={z} className="px-3 py-2 text-left">Zona {z}</th>)}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat} className="border-t border-ds-border">
                <td className="px-3 py-2 font-black text-ds-ink2">Kat {cat}</td>
                {ZONES.map(z => (
                  <td key={z} className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number" step="0.01"
                        className={`${inputCls} !py-1.5 !px-2 text-right`}
                        value={((table[cat]?.[z] ?? 0) * 100).toFixed(2)}
                        onChange={e => setCell(cat, z, e.target.value)}
                      />
                      <span className="text-ds-ink3">%</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const emptyDraft = (): Omit<SpOjkRateSet, 'id' | 'created_at' | 'updated_at'> => ({
  version: '',
  source_reference: 'SEOJK No. 6/SEOJK.05/2017',
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: false,
  province_zones: {},
  category_bands: { '1': 125_000_000, '2': 200_000_000, '3': 400_000_000, '4': 800_000_000 },
  car_comp_min: {}, car_comp_mid: {}, car_comp_max: {},
  car_tlo_min: {}, car_tlo_mid: {}, car_tlo_max: {},
  moto_comp_min: 0, moto_comp_mid: 0, moto_comp_max: 0,
  moto_tlo_min: {}, moto_tlo_mid: {}, moto_tlo_max: {},
  addon_rates: {
    flood: 0.0015, earthquake: 0.0012, srccComp: 0.0005, srccTlo: 0.00035,
    tplBand1Rate: 0.01, tplBand1Cap: 25_000_000, tplBand2Rate: 0.005, tplBand2Cap: 25_000_000,
    tplBand3Rate: 0.0025, tplBand3Cap: 50_000_000, paDriver: 50_000, paPassengerPerSeat: 25_000,
  },
  non_vehicle_rates: {
    TRAVEL: { domestic: { min: 0.0014, mid: 0.0017, max: 0.0020 }, international: { min: 0.0025, mid: 0.0035, max: 0.0045 }, label: '% dari nilai perjalanan' },
    PA: { label: 'Rp per orang per tahun', bands: { min: 30_000, mid: 75_000, max: 120_000 } },
    MPAR: { label: '% dari nilai perangkat per tahun', bands: { min: 0.025, mid: 0.035, max: 0.045 } },
  },
  notes: '',
});

const OjkRateAdmin: React.FC = () => {
  const confirm = useConfirmDialog();
  const toastUi = useToast();
  const [sets, setSets] = useState<SpOjkRateSet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SpOjkRateSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllOjkRateSets();
    setSets(data);
    const keep = data.find(s => s.id === selectedId) ?? data.find(s => s.is_active) ?? data[0] ?? null;
    setSelectedId(keep?.id ?? null);
    setForm(keep ? { ...keep } : null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const selectSet = (id: string) => {
    setSelectedId(id);
    const s = sets.find(x => x.id === id);
    setForm(s ? { ...s } : null);
  };

  const set = <K extends keyof SpOjkRateSet>(key: K, value: SpOjkRateSet[K]) =>
    setForm(f => (f ? { ...f, [key]: value } : f));

  const setAddon = (key: string, value: number) =>
    setForm(f => (f ? { ...f, addon_rates: { ...f.addon_rates, [key]: value } } : f));

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const ok = await updateOjkRateSet(form.id, form);
    setSaving(false);
    if (ok) { flash('Tersimpan.'); load(); } else { flash('Gagal menyimpan.'); }
  };

  const handleDuplicate = async () => {
    if (!form) return;
    const draft = { ...emptyDraft(), ...form, version: `${form.version}-draft`, is_active: false };
    delete (draft as any).id;
    const ok = await createOjkRateSet(draft as any);
    if (ok) { flash('Draft baru dibuat.'); load(); } else { flash('Gagal membuat draft.'); }
  };

  const handleActivate = async () => {
    if (!form || form.is_active) return;
    const ok = await activateOjkRateSet(form.id);
    if (ok) { flash('Versi ini sekarang aktif.'); load(); } else { flash('Gagal mengaktifkan.'); }
  };

  const handleDelete = async () => {
    if (!form || form.is_active) return;
    const ok = await confirm({
      title: 'Hapus Versi Rate?',
      description: `Versi "${form.version}" akan dihapus permanen.`,
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
    });
    if (!ok) return;
    const deleted = await deleteOjkRateSet(form.id);
    if (deleted) { toastUi.success('Dihapus.'); setSelectedId(null); load(); } else { toastUi.error('Gagal menghapus.'); }
  };

  const handleNewBlank = async () => {
    const draft = emptyDraft();
    draft.version = `SEOJK-draft-${new Date().toISOString().slice(0, 10)}`;
    const ok = await createOjkRateSet(draft);
    if (ok) { flash('Draft kosong dibuat.'); load(); } else { flash('Gagal membuat draft.'); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" /></div>;
  }

  const zonesByGroup: Record<1 | 2 | 3, string[]> = { 1: [], 2: [], 3: [] };
  Object.entries(form?.province_zones ?? {}).forEach(([prov, z]) => {
    const zone = Number(z) as 1 | 2 | 3;
    (zonesByGroup[zone] ?? zonesByGroup[3]).push(prov);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-400" /> Rate OJK — Asuransi Kendaraan Bermotor
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 mt-1">
            SEOJK No. 6/SEOJK.05/2017 · {sets.length} versi tersimpan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleNewBlank} className={secondaryBtn}>+ Versi Baru</button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg">
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      {/* Version switcher */}
      <div className="flex gap-2 flex-wrap">
        {sets.map(s => (
          <button
            key={s.id}
            onClick={() => selectSet(s.id)}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
              s.id === selectedId
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-ds-card2 text-ds-ink3 border-ds-border hover:bg-ds-card2'
            }`}
          >
            {s.version} {s.is_active && '· AKTIF'}
          </button>
        ))}
      </div>

      {!form ? (
        <div className="text-center py-20 text-ds-ink3 text-sm font-bold">
          Belum ada rate set. Klik "+ Versi Baru".
        </div>
      ) : (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleSave} disabled={saving} className={primaryBtn}>
              <span className="flex items-center gap-1.5"><Save size={13} /> Simpan Perubahan</span>
            </button>
            {!form.is_active && (
              <button onClick={handleActivate} className={secondaryBtn}>Jadikan Aktif</button>
            )}
            <button onClick={handleDuplicate} className={secondaryBtn}>
              <span className="flex items-center gap-1.5"><Copy size={13} /> Duplikat sebagai Draft</span>
            </button>
            {!form.is_active && (
              <button onClick={handleDelete} className="text-rose-400 hover:text-rose-300 text-xs font-black uppercase tracking-widest px-4 py-2.5 flex items-center gap-1.5">
                <Trash2 size={13} /> Hapus
              </button>
            )}
          </div>

          {/* Meta */}
          <Card title="Info Versi">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <SectionLabel>Versi</SectionLabel>
                <input className={inputCls} value={form.version} onChange={e => set('version', e.target.value)} />
              </div>
              <div>
                <SectionLabel>Referensi Regulasi</SectionLabel>
                <input className={inputCls} value={form.source_reference} onChange={e => set('source_reference', e.target.value)} />
              </div>
              <div>
                <SectionLabel>Berlaku Efektif</SectionLabel>
                <input type="date" className={inputCls} value={form.effective_date?.slice(0, 10)} onChange={e => set('effective_date', e.target.value)} />
              </div>
            </div>
            <div>
              <SectionLabel>Catatan</SectionLabel>
              <textarea className={`${inputCls} min-h-[70px]`} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </Card>

          {/* Category bands */}
          <Card title="Kategori Kendaraan (Roda 4)" sub="Berdasarkan Uang Pertanggungan (Harga Pertanggungan) — Kategori 5 = di atas batas Kategori 4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['1', '2', '3', '4'] as const).map(cat => (
                <div key={cat}>
                  <SectionLabel>Kat {cat} maks. (Rp)</SectionLabel>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.category_bands[cat] ?? 0}
                    onChange={e => set('category_bands', { ...form.category_bands, [cat]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Province zones */}
          <Card title="Zona Wilayah" sub="Daftar provinsi per zona, pisahkan dengan koma">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([1, 2, 3] as const).map(zone => (
                <div key={zone}>
                  <SectionLabel>Zona {zone}</SectionLabel>
                  <textarea
                    className={`${inputCls} min-h-[110px]`}
                    defaultValue={zonesByGroup[zone].join(', ')}
                    onBlur={e => {
                      const provinces = e.target.value.split(',').map(p => p.trim()).filter(Boolean);
                      const nextMap: Record<string, number> = { ...form.province_zones };
                      // Remove any province previously in this zone, then re-add the edited list.
                      Object.keys(nextMap).forEach(p => { if (nextMap[p] === zone) delete nextMap[p]; });
                      provinces.forEach(p => { nextMap[p] = zone; });
                      set('province_zones', nextMap);
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Comprehensive matrices */}
          <Card title="Comprehensive (All Risk) — Roda 4" sub="Tarif bawah / tengah / atas per kategori & zona">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ZoneMatrix label="Tarif Bawah (MIN)" table={form.car_comp_min} onChange={t => set('car_comp_min', t)} />
              <ZoneMatrix label="Tarif Tengah (MID)" table={form.car_comp_mid} onChange={t => set('car_comp_mid', t)} />
              <ZoneMatrix label="Tarif Atas (MAX)" table={form.car_comp_max} onChange={t => set('car_comp_max', t)} />
            </div>
          </Card>

          <Card title="TLO (Total Loss Only) — Roda 4" sub="Tarif bawah / tengah / atas per kategori & zona">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ZoneMatrix label="Tarif Bawah (MIN)" table={form.car_tlo_min} onChange={t => set('car_tlo_min', t)} />
              <ZoneMatrix label="Tarif Tengah (MID)" table={form.car_tlo_mid} onChange={t => set('car_tlo_mid', t)} />
              <ZoneMatrix label="Tarif Atas (MAX)" table={form.car_tlo_max} onChange={t => set('car_tlo_max', t)} />
            </div>
          </Card>

          {/* Motorcycle */}
          <Card title="Sepeda Motor (Roda 2)" sub="Comprehensive berlaku nasional; TLO berbeda per zona">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['moto_comp_min', 'moto_comp_mid', 'moto_comp_max'] as const).map(key => (
                <div key={key}>
                  <SectionLabel>Comp {key.split('_')[2].toUpperCase()}</SectionLabel>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.01" className={`${inputCls} text-right`}
                      value={(Number(form[key]) * 100).toFixed(2)}
                      onChange={e => set(key, (parseFloat(e.target.value) || 0) / 100)} />
                    <span className="text-ds-ink3">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {(['moto_tlo_min', 'moto_tlo_mid', 'moto_tlo_max'] as const).map(key => (
                <div key={key}>
                  <SectionLabel>TLO {key.split('_')[2].toUpperCase()} per zona</SectionLabel>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ZONES.map(z => (
                      <div key={z} className="flex items-center gap-0.5">
                        <input type="number" step="0.01" className={`${inputCls} !px-1.5 text-right`}
                          value={((form[key] as Record<string, number>)[z] * 100 || 0).toFixed(2)}
                          onChange={e => set(key, { ...(form[key] as any), [z]: (parseFloat(e.target.value) || 0) / 100 })} />
                        <span className="text-[9px] text-ds-ink3">%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Add-ons */}
          <Card title="Tarif Tambahan (Add-On)" sub="OJK Lampiran / IV.B — Banjir, Gempa, SRCC, Terorisme, TPL Progresif, PA">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['flood', 'Banjir (% SI)'], ['earthquake', 'Gempa Bumi (% SI)'],
                ['srccComp', 'SRCC — Comp (% SI)'], ['srccTlo', 'SRCC — TLO (% SI)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <SectionLabel>{label}</SectionLabel>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.0001" className={`${inputCls} text-right`}
                      value={(Number(form.addon_rates[key]) * 100).toFixed(4)}
                      onChange={e => setAddon(key, (parseFloat(e.target.value) || 0) / 100)} />
                    <span className="text-ds-ink3">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-ds-border">
              <SectionLabel>TPL Progresif (Tanggung Jawab Hukum Pihak Ketiga) — OJK IV.B No.5</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(band => (
                  <div key={band} className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-ds-ink3 mb-1">Band {band} tarif (%)</p>
                      <input type="number" step="0.01" className={`${inputCls} text-right`}
                        value={(Number(form.addon_rates[`tplBand${band}Rate`]) * 100).toFixed(2)}
                        onChange={e => setAddon(`tplBand${band}Rate`, (parseFloat(e.target.value) || 0) / 100)} />
                    </div>
                    <div>
                      <p className="text-[9px] text-ds-ink3 mb-1">Batas (Rp)</p>
                      <input type="number" className={`${inputCls} text-right`}
                        value={Number(form.addon_rates[`tplBand${band}Cap`])}
                        onChange={e => setAddon(`tplBand${band}Cap`, parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ds-border">
              <div>
                <SectionLabel>PA Pengemudi (Rp flat) — OJK IV.B No.6a</SectionLabel>
                <input type="number" className={`${inputCls} text-right`}
                  value={Number(form.addon_rates.paDriver)}
                  onChange={e => setAddon('paDriver', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <SectionLabel>PA Penumpang / kursi (Rp) — OJK IV.B No.6b</SectionLabel>
                <input type="number" className={`${inputCls} text-right`}
                  value={Number(form.addon_rates.paPassengerPerSeat)}
                  onChange={e => setAddon('paPassengerPerSeat', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </Card>

          {/* Non-vehicle */}
          <Card title="Produk Non-Kendaraan" sub="Travel, Personal Accident (PA), Mobile Phone & Gadget (MPAR)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <SectionLabel>Travel Domestik (% nilai perjalanan)</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['min', 'mid', 'max'] as const).map(b => (
                    <input key={b} type="number" step="0.01" className={`${inputCls} !px-1.5 text-right`}
                      value={(Number(form.non_vehicle_rates.TRAVEL.domestic[b]) * 100).toFixed(2)}
                      onChange={e => set('non_vehicle_rates', {
                        ...form.non_vehicle_rates,
                        TRAVEL: { ...form.non_vehicle_rates.TRAVEL, domestic: { ...form.non_vehicle_rates.TRAVEL.domestic, [b]: (parseFloat(e.target.value) || 0) / 100 } },
                      })} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Travel Internasional (% nilai perjalanan)</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['min', 'mid', 'max'] as const).map(b => (
                    <input key={b} type="number" step="0.01" className={`${inputCls} !px-1.5 text-right`}
                      value={(Number(form.non_vehicle_rates.TRAVEL.international[b]) * 100).toFixed(2)}
                      onChange={e => set('non_vehicle_rates', {
                        ...form.non_vehicle_rates,
                        TRAVEL: { ...form.non_vehicle_rates.TRAVEL, international: { ...form.non_vehicle_rates.TRAVEL.international, [b]: (parseFloat(e.target.value) || 0) / 100 } },
                      })} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>PA (Rp / orang / tahun)</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['min', 'mid', 'max'] as const).map(b => (
                    <input key={b} type="number" className={`${inputCls} !px-1.5 text-right`}
                      value={Number(form.non_vehicle_rates.PA.bands[b])}
                      onChange={e => set('non_vehicle_rates', {
                        ...form.non_vehicle_rates,
                        PA: { ...form.non_vehicle_rates.PA, bands: { ...form.non_vehicle_rates.PA.bands, [b]: parseInt(e.target.value) || 0 } },
                      })} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>MPAR — Gadget (% nilai perangkat / tahun)</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['min', 'mid', 'max'] as const).map(b => (
                    <input key={b} type="number" step="0.01" className={`${inputCls} !px-1.5 text-right`}
                      value={(Number(form.non_vehicle_rates.MPAR.bands[b]) * 100).toFixed(2)}
                      onChange={e => set('non_vehicle_rates', {
                        ...form.non_vehicle_rates,
                        MPAR: { ...form.non_vehicle_rates.MPAR, bands: { ...form.non_vehicle_rates.MPAR.bands, [b]: (parseFloat(e.target.value) || 0) / 100 } },
                      })} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default OjkRateAdmin;
