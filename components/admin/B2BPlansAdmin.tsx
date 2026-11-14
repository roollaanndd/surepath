// B2BPlansAdmin — CMS paket asuransi B2B (v2.9.1).
//
// Setiap paket memegang loading_rate yang diterapkan di atas premi setelah
// diskon pada order unit B2B dan impor massal. Admin bisa menambah,
// mengaktifkan/menonaktifkan, dan menghapus (jika belum dipakai di order).
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  adminListB2BPlans, adminSaveB2BPlan, adminDeleteB2BPlan,
  type SpB2BPlan,
} from '../../services/supabaseService';

const fmtPct = (n: number) => `${(n * 100).toFixed(1).replace(/\.0$/, '')}%`;

interface EditState {
  id?: string;
  code: string;
  name: string;
  description: string;
  loading_rate: string;    // percent (string input)
  benefits: string;        // one per line
  pros: string;            // v2.9.2 — one per line
  cons: string;            // v2.9.2 — one per line
  is_active: boolean;
  sort_order: string;
}

const EMPTY: EditState = {
  code: '', name: '', description: '', loading_rate: '0',
  benefits: '', pros: '', cons: '',
  is_active: true, sort_order: '0',
};

function toEditState(p: SpB2BPlan): EditState {
  return {
    id: p.id, code: p.code, name: p.name, description: p.description ?? '',
    loading_rate: (p.loading_rate * 100).toFixed(2).replace(/\.00$/, ''),
    benefits: p.benefits.join('\n'),
    pros: (p.pros ?? []).join('\n'),
    cons: (p.cons ?? []).join('\n'),
    is_active: p.is_active,
    sort_order: String(p.sort_order ?? 0),
  };
}

const B2BPlansAdmin: React.FC = () => {
  const [plans, setPlans] = useState<SpB2BPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true);
    const data = await adminListB2BPlans();
    setPlans(data);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const activeCount = useMemo(() => plans.filter(p => p.is_active).length, [plans]);

  const save = async () => {
    if (!edit) return;
    setError(''); setNotice('');
    const code = edit.code.trim().toUpperCase();
    const name = edit.name.trim();
    if (!code || !name) { setError('Kode dan nama wajib diisi.'); return; }
    const pct = Number(edit.loading_rate.replace(',', '.'));
    if (!Number.isFinite(pct) || pct < -50 || pct > 100) {
      setError('Loading harus antara −50 dan 100%.'); return;
    }
    const benefits = edit.benefits.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 20);
    const pros = edit.pros.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
    const cons = edit.cons.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
    setSaving(true);
    const res = await adminSaveB2BPlan({
      id: edit.id,
      code,
      name,
      description: edit.description.trim() || null,
      loading_rate: pct / 100,
      benefits,
      pros,
      cons,
      is_active: edit.is_active,
      sort_order: Number(edit.sort_order) || 0,
    });
    setSaving(false);
    if (!res) { setError('Gagal menyimpan paket. Coba lagi.'); return; }
    setNotice(edit.id ? `Paket ${code} diperbarui.` : `Paket ${code} dibuat.`);
    setEdit(null);
    await refresh();
  };

  const del = async (p: SpB2BPlan) => {
    if (!confirm(`Hapus paket ${p.name}? Jika sudah dipakai, paket akan dinonaktifkan saja.`)) return;
    const res = await adminDeleteB2BPlan(p.id);
    if (!res.success) { setError('Gagal menghapus paket.'); return; }
    setNotice(res.deactivated ? `Paket ${p.name} dinonaktifkan (sudah digunakan).` : `Paket ${p.name} dihapus.`);
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-ds-ink dark:text-white flex items-center gap-2">
            <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
            Paket Asuransi B2B
          </h1>
          <p className="text-xs text-ds-ink3 mt-1">
            Paket yang bisa dipilih klien B2B saat memesan. Loading rate diterapkan di atas premi setelah diskon.
          </p>
        </div>
        <button
          onClick={() => { setEdit(EMPTY); setError(''); setNotice(''); }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 shadow"
        >
          <Plus size={14} /> Tambah paket
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={14} /> {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-4 text-xs text-ds-ink2 flex items-center gap-4 flex-wrap">
        <span><strong className="text-ds-ink dark:text-white">{plans.length}</strong> paket total</span>
        <span className="h-3 w-px bg-ds-border" aria-hidden />
        <span><strong className="text-emerald-600">{activeCount}</strong> aktif</span>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-ds-ink3" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className={`rounded-2xl border p-4 space-y-3 transition-colors ${p.is_active ? 'border-ds-border bg-white dark:bg-ds-card2' : 'border-dashed border-ds-border bg-slate-50/50 dark:bg-ds-card/50 opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono font-black text-ds-ink3">{p.code}</p>
                  <p className="text-base font-black text-ds-ink dark:text-white">{p.name}</p>
                </div>
                <span className={`text-2xs font-black px-2 py-0.5 rounded-full ${p.loading_rate > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' : p.loading_rate < 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {p.loading_rate > 0 ? '+' : ''}{fmtPct(p.loading_rate)}
                </span>
              </div>
              {p.description && <p className="text-2xs text-ds-ink2 line-clamp-3">{p.description}</p>}
              {p.benefits.length > 0 && (
                <ul className="space-y-1">
                  {p.benefits.slice(0, 4).map((b, i) => (
                    <li key={i} className="text-2xs font-bold text-ds-ink2 flex items-start gap-1.5">
                      <CheckCircle2 size={10} className="mt-0.5 flex-shrink-0 text-emerald-500" /> {b}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-ds-border">
                <span className={`text-2xs font-black uppercase tracking-widest ${p.is_active ? 'text-emerald-600' : 'text-ds-ink3'}`}>
                  {p.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEdit(toEditState(p)); setError(''); setNotice(''); }} className="p-1.5 rounded-lg hover:bg-ds-border/50 text-ds-ink2" title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => del(p)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600" title="Hapus"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-ds-ink3">
              Belum ada paket. Klik <strong>Tambah paket</strong> untuk membuat paket pertama.
            </div>
          )}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEdit(null)}>
          <div className="bg-white dark:bg-ds-card2 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-ds-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-ds-ink dark:text-white">{edit.id ? 'Edit paket' : 'Paket baru'}</h2>
                <p className="text-2xs text-ds-ink3 mt-0.5">Loading berlaku pada premi setelah diskon.</p>
              </div>
              <button onClick={() => setEdit(null)} className="p-1 rounded-lg hover:bg-ds-border/50"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block">Kode *</label>
                <input
                  className="w-full bg-white dark:bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-emerald-500/50 uppercase"
                  value={edit.code}
                  onChange={e => setEdit({ ...edit, code: e.target.value.toUpperCase().slice(0, 20) })}
                  placeholder="BASIC"
                />
              </div>
              <div>
                <label className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block">Urutan</label>
                <input
                  className="w-full bg-white dark:bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500/50"
                  value={edit.sort_order}
                  onChange={e => setEdit({ ...edit, sort_order: e.target.value })}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div>
              <label className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block">Nama paket *</label>
              <input
                className="w-full bg-white dark:bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500/50"
                value={edit.name}
                onChange={e => setEdit({ ...edit, name: e.target.value })}
                placeholder="Premium"
              />
            </div>
            <div>
              <label className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block">Deskripsi singkat</label>
              <textarea
                className="w-full bg-white dark:bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                value={edit.description}
                onChange={e => setEdit({ ...edit, description: e.target.value })}
                rows={2}
                placeholder="Paket lengkap dengan bengkel resmi dan layanan darurat 24/7"
              />
            </div>
            <div>
              <label className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block">Loading rate (%) *</label>
              <input
                className="w-full bg-white dark:bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500/50"
                value={edit.loading_rate}
                onChange={e => setEdit({ ...edit, loading_rate: e.target.value })}
                inputMode="decimal"
                placeholder="10"
              />
              <p className="text-2xs text-ds-ink3 mt-1">
                Nilai positif menambah premi (loading), negatif mengurangi (diskon paket). Contoh: 10 artinya +10%.
              </p>
            </div>
            <div>
              <label className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1 block">Manfaat (satu per baris)</label>
              <textarea
                className="w-full bg-white dark:bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50 font-mono"
                value={edit.benefits}
                onChange={e => setEdit({ ...edit, benefits: e.target.value })}
                rows={3}
                placeholder={'Bengkel resmi/ATPM\nKlaim prioritas\nMobil pengganti'}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1 block flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kelebihan (plus)
                </label>
                <textarea
                  className="w-full bg-white dark:bg-ds-card border border-emerald-200 dark:border-emerald-900/40 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/50 font-mono"
                  value={edit.pros}
                  onChange={e => setEdit({ ...edit, pros: e.target.value })}
                  rows={4}
                  placeholder={'Klaim prioritas\nMobil pengganti saat klaim\nBengkel resmi/ATPM'}
                />
                <p className="text-2xs text-ds-ink3 mt-1">Maks 12 baris. Ditampilkan di kartu paket klien.</p>
              </div>
              <div>
                <label className="text-2xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 mb-1 block flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" /> Kekurangan (minus)
                </label>
                <textarea
                  className="w-full bg-white dark:bg-ds-card border border-rose-200 dark:border-rose-900/40 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500/50 font-mono"
                  value={edit.cons}
                  onChange={e => setEdit({ ...edit, cons: e.target.value })}
                  rows={4}
                  placeholder={'Loading +10% di atas standar\nPremi lebih tinggi'}
                />
                <p className="text-2xs text-ds-ink3 mt-1">Jujur soal batasan — bantu klien memilih yang pas.</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-ds-ink2">
              <input type="checkbox" checked={edit.is_active} onChange={e => setEdit({ ...edit, is_active: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
              Aktif (bisa dipilih klien)
            </label>
            {error && <p className="text-xs font-bold text-rose-600" role="alert">{error}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-ds-ink2 hover:bg-ds-border/50">Batal</button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BPlansAdmin;
