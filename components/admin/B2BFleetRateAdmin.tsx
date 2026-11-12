// B2BFleetRateAdmin.tsx — admin editor for the B2B bulk fleet TLO rates that
// aren't already covered by OjkRateAdmin.tsx: pickup/truck rate, heavy
// equipment rate, the two discount rates, the three admin fees, and the
// minimum premium floor (services/b2bFleetRating.ts's calcBulkPremium()).
// Same versioned "one active at a time" pattern as OjkRateAdmin.
import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Save, CheckCircle2, Trash2, Copy } from 'lucide-react';
import {
  adminListB2BFleetRateSets, adminSaveB2BFleetRateSet, adminActivateB2BFleetRateSet, adminDeleteB2BFleetRateSet,
  type SpB2BFleetRateSet,
} from '../../services/supabaseService';
import { useConfirmDialog, useToast } from '../ui';
import ModuleIcon from '../shared/ModuleIcon';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1">{children}</p>
);

const inputCls =
  'bg-ds-card2 border border-ds-border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-ds-ink';

const primaryBtn =
  'bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-40';

const secondaryBtn =
  'bg-ds-card2 hover:bg-ds-card2 text-ds-ink2 border border-ds-border rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-40';

const Card: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="bg-ds-card2 border border-ds-border rounded-2xl p-5 space-y-3">
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{title}</p>
      {sub && <p className="text-2xs text-ds-ink3 mt-0.5">{sub}</p>}
    </div>
    {children}
  </div>
);

const ZONES = ['1', '2', '3'] as const;

const emptyDraft = (): Omit<SpB2BFleetRateSet, 'id' | 'created_at' | 'updated_at'> => ({
  version: '',
  source_reference: 'SEOJK No. 6/SEOJK.05/2017 (batas bawah) + kebijakan internal',
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: false,
  rates: {
    pickupTruckTloMin: { '1': 0.0088, '2': 0.0168, '3': 0.0081 },
    heavyEquipmentRate: 0.0085,
    discountRateStandard: 0.25,
    discountRateHeavy: 0.15,
    // Araahan owner (2026-11-11): admin fee flat 25rb motor & mobil, premi
    // formula penuh tanpa lantai (minPremiumGross 0).
    adminFeeMotorcycle: 25_000,
    adminFeeCar: 25_000,
    adminFeeHeavy: 65_000,
    minPremiumGross: 0,
  },
  notes: '',
});

const B2BFleetRateAdmin: React.FC = () => {
  const confirm = useConfirmDialog();
  const toastUi = useToast();
  const [sets, setSets] = useState<SpB2BFleetRateSet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SpB2BFleetRateSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminListB2BFleetRateSets();
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

  const setRates = (patch: Partial<SpB2BFleetRateSet['rates']>) =>
    setForm(f => (f ? { ...f, rates: { ...f.rates, ...patch } } : f));

  const setPickup = (zone: '1' | '2' | '3', pct: string) => {
    if (!form) return;
    const v = parseFloat(pct);
    setRates({ pickupTruckTloMin: { ...form.rates.pickupTruckTloMin, [zone]: isNaN(v) ? 0 : v / 100 } });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const result = await adminSaveB2BFleetRateSet({ id: form.id, version: form.version, source_reference: form.source_reference, effective_date: form.effective_date, rates: form.rates, notes: form.notes });
    setSaving(false);
    if (result) { flash('Tersimpan.'); load(); } else { toastUi.error('Gagal menyimpan.'); }
  };

  const handleDuplicate = async () => {
    if (!form) return;
    const result = await adminSaveB2BFleetRateSet({ version: `${form.version}-draft`, source_reference: form.source_reference, rates: form.rates, notes: form.notes });
    if (result) { flash('Draft baru dibuat.'); load(); } else { toastUi.error('Gagal membuat draft.'); }
  };

  const handleActivate = async () => {
    if (!form || form.is_active) return;
    const ok = await adminActivateB2BFleetRateSet(form.id);
    if (ok) { flash('Versi ini sekarang aktif.'); load(); } else { toastUi.error('Gagal mengaktifkan.'); }
  };

  const handleDelete = async () => {
    if (!form || form.is_active) return;
    const ok = await confirm({ title: 'Hapus Versi Rate?', description: `Versi "${form.version}" akan dihapus permanen.`, confirmLabel: 'Hapus', cancelLabel: 'Batal' });
    if (!ok) return;
    const deleted = await adminDeleteB2BFleetRateSet(form.id);
    if (deleted) { toastUi.success('Dihapus.'); setSelectedId(null); load(); } else { toastUi.error('Gagal menghapus.'); }
  };

  const handleNewBlank = async () => {
    const draft = emptyDraft();
    draft.version = `fleet-draft-${new Date().toISOString().slice(0, 10)}`;
    const result = await adminSaveB2BFleetRateSet(draft as any);
    if (result) { flash('Draft kosong dibuat.'); load(); } else { toastUi.error('Gagal membuat draft.'); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-ds-ink flex items-center gap-2">
            <ModuleIcon id="ojk_rates" size={32} /> Rate Fleet B2B — Impor Massal
          </h2>
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mt-1">
            Pickup/truk, alat berat, diskon &amp; biaya admin · {sets.length} versi tersimpan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 hover:text-ds-ink transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleNewBlank} className={secondaryBtn}>+ Versi Baru</button>
        </div>
      </div>

      <p className="text-xs text-ds-ink3 bg-ds-card2 border border-ds-border rounded-xl px-4 py-3">
        Tarif TLO mobil penumpang &amp; motor TIDAK di sini — keduanya ikut versi aktif di <strong>Rate OJK</strong> (menu sebelah).
        Halaman ini hanya untuk nilai yang khusus dipakai impor massal B2B: pickup/truk, alat berat, diskon, dan biaya admin.
      </p>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg">
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {sets.map(s => (
          <button
            key={s.id}
            onClick={() => selectSet(s.id)}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
              s.id === selectedId ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-ds-card2 text-ds-ink3 border-ds-border hover:bg-ds-card2'
            }`}
          >
            {s.version} {s.is_active && '· AKTIF'}
          </button>
        ))}
      </div>

      {!form ? (
        <div className="text-center py-20 text-ds-ink3 text-sm font-bold">Belum ada rate set. Klik "+ Versi Baru".</div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleSave} disabled={saving} className={primaryBtn}>
              <span className="flex items-center gap-1.5"><Save size={13} /> Simpan Perubahan</span>
            </button>
            {!form.is_active && <button onClick={handleActivate} className={secondaryBtn}>Jadikan Aktif</button>}
            <button onClick={handleDuplicate} className={secondaryBtn}>
              <span className="flex items-center gap-1.5"><Copy size={13} /> Duplikat sebagai Draft</span>
            </button>
            {!form.is_active && (
              <button onClick={handleDelete} className="text-rose-700 dark:text-rose-300 hover:text-rose-300 text-xs font-black uppercase tracking-widest px-4 py-2.5 flex items-center gap-1.5">
                <Trash2 size={13} /> Hapus
              </button>
            )}
          </div>

          <Card title="Info Versi">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <SectionLabel>Versi</SectionLabel>
                <input className={inputCls} value={form.version} onChange={e => setForm(f => f && { ...f, version: e.target.value })} />
              </div>
              <div>
                <SectionLabel>Referensi</SectionLabel>
                <input className={inputCls} value={form.source_reference} onChange={e => setForm(f => f && { ...f, source_reference: e.target.value })} />
              </div>
              <div>
                <SectionLabel>Berlaku Efektif</SectionLabel>
                <input type="date" className={inputCls} value={form.effective_date?.slice(0, 10)} onChange={e => setForm(f => f && { ...f, effective_date: e.target.value })} />
              </div>
            </div>
            <div>
              <SectionLabel>Catatan</SectionLabel>
              <textarea className={`${inputCls} min-h-[70px]`} value={form.notes ?? ''} onChange={e => setForm(f => f && { ...f, notes: e.target.value })} />
            </div>
          </Card>

          <Card title="Pickup/Truk — TLO Batas Bawah per Zona" sub="Mobil barang/komersial (pickup, truk, van) — bukan tabel kategori mobil penumpang">
            <div className="grid grid-cols-3 gap-3">
              {ZONES.map(z => (
                <div key={z}>
                  <SectionLabel>Zona {z}</SectionLabel>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.01" className={`${inputCls} text-right`}
                      value={(form.rates.pickupTruckTloMin[z] * 100).toFixed(2)}
                      onChange={e => setPickup(z, e.target.value)} />
                    <span className="text-ds-ink3">%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Alat Berat" sub="Tarif flat — bukan tarif OJK kendaraan bermotor, hasil negosiasi block business">
            <div className="flex items-center gap-1 max-w-xs">
              <input type="number" step="0.01" className={`${inputCls} text-right`}
                value={(form.rates.heavyEquipmentRate * 100).toFixed(2)}
                onChange={e => setRates({ heavyEquipmentRate: (parseFloat(e.target.value) || 0) / 100 })} />
              <span className="text-ds-ink3">%</span>
            </div>
          </Card>

          <Card title="Diskon" sub="Motor &amp; mobil maks. 25%, alat berat 15% (kebijakan pemilik)">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>Motor &amp; Mobil</SectionLabel>
                <div className="flex items-center gap-1">
                  <input type="number" step="1" className={`${inputCls} text-right`}
                    value={(form.rates.discountRateStandard * 100).toFixed(0)}
                    onChange={e => setRates({ discountRateStandard: (parseFloat(e.target.value) || 0) / 100 })} />
                  <span className="text-ds-ink3">%</span>
                </div>
              </div>
              <div>
                <SectionLabel>Alat Berat</SectionLabel>
                <div className="flex items-center gap-1">
                  <input type="number" step="1" className={`${inputCls} text-right`}
                    value={(form.rates.discountRateHeavy * 100).toFixed(0)}
                    onChange={e => setRates({ discountRateHeavy: (parseFloat(e.target.value) || 0) / 100 })} />
                  <span className="text-ds-ink3">%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Biaya Admin Polis (IDR)" sub="Flat per unit — ditambahkan setelah diskon">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <SectionLabel>Motor</SectionLabel>
                <input type="number" className={`${inputCls} text-right`}
                  value={form.rates.adminFeeMotorcycle}
                  onChange={e => setRates({ adminFeeMotorcycle: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <SectionLabel>Mobil / Pickup / Truk</SectionLabel>
                <input type="number" className={`${inputCls} text-right`}
                  value={form.rates.adminFeeCar}
                  onChange={e => setRates({ adminFeeCar: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <SectionLabel>Alat Berat</SectionLabel>
                <input type="number" className={`${inputCls} text-right`}
                  value={form.rates.adminFeeHeavy}
                  onChange={e => setRates({ adminFeeHeavy: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </Card>

          <Card title="Premi Minimum (IDR)" sub="Lantai premi bruto sebelum diskon — mencegah unit bernilai pembiayaan sangat kecil dikenai premi di bawah batas wajar">
            <div className="max-w-xs">
              <input type="number" className={`${inputCls} text-right`}
                value={form.rates.minPremiumGross}
                onChange={e => setRates({ minPremiumGross: parseInt(e.target.value) || 0 })} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default B2BFleetRateAdmin;
