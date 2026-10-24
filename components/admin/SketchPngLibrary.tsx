import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { savePortalIcon, type PortalIconMap } from '../../services/portalIcons';

const SPRITE = '/assets/sketch/surepath-sketch-icons.png';
const ITEMS = [
  { name: 'Dashboard', id: 'dashboard', target: 'dashboard', col: 0, row: 0 },
  { name: 'Pengguna', id: 'users', target: 'users', col: 1, row: 0 },
  { name: 'Agen', id: 'agent', target: 'agents', col: 2, row: 0 },
  { name: 'Polis', id: 'policy', target: 'policy', col: 3, row: 0 },
  { name: 'Klaim', id: 'claim', target: 'claims', col: 0, row: 1 },
  { name: 'Produk', id: 'product', target: 'product', col: 1, row: 1 },
  { name: 'Mitra', id: 'partner', target: 'b2b', col: 2, row: 1 },
  { name: 'Pengaturan', id: 'settings', target: 'settings', col: 3, row: 1 },
  { name: 'Pencarian', id: 'search', target: 'ops_console', col: 0, row: 2 },
  { name: 'Notifikasi', id: 'notification', target: 'notifications', col: 1, row: 2 },
  { name: 'Kendaraan', id: 'motor-vehicle', target: 'car_protection', col: 2, row: 2 },
  { name: 'Perjalanan', id: 'travel', target: 'travel_safe', col: 3, row: 2 },
];

export default function SketchPngLibrary() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const apply = async (item: typeof ITEMS[number]) => {
    setBusy(item.target); setMessage(''); setError('');
    try {
      const response = await fetch(SPRITE);
      if (!response.ok) throw new Error('PNG sketch library tidak ditemukan.');
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = 192; canvas.height = 192;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Browser tidak mendukung pemrosesan PNG.');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 192, 192);
      ctx.drawImage(bitmap, item.col * 48, item.row * 48, 48, 48, 0, 0, 192, 192);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Gagal menyiapkan PNG.')), 'image/png'));
      const file = new File([blob], `surepath-sketch-${item.id}.png`, { type: 'image/png' });
      const next = await savePortalIcon(item.target, file);
      if (!next) throw new Error('Ikon tidak berhasil disimpan.');
      setMessage(`PNG ${item.name} diterapkan ke ikon ${item.target}.`);
      window.dispatchEvent(new CustomEvent('surepath-sketch-icon-applied', { detail: { id: item.target, icons: next as PortalIconMap } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menerapkan PNG.');
    } finally { setBusy(null); }
  };

  return <section className="rounded-[24px] border border-ds-green/20 bg-gradient-to-br from-emerald-50/80 via-white to-cyan-50/60 p-4 sm:p-5 dark:from-emerald-950/20 dark:via-ds-card dark:to-cyan-950/10">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Sparkles size={17} className="text-ds-green"/><h3 className="text-base font-black text-ds-ink">PNG Sketch Library</h3></div><p className="mt-1 max-w-2xl text-xs leading-relaxed text-ds-ink3">Aset PNG bergaya hand-drawn SurePath. Pilih “Terapkan” untuk menyimpan ilustrasi ke ikon portal terkait.</p></div>
      <span className="rounded-full bg-ds-green-tint px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-ds-green">12 PNG assets</span>
    </div>
    {message && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14}/>{message}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-2.5 text-xs text-red-600">{error}</p>}
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {ITEMS.map(item => <article key={item.id} className="rounded-2xl border border-ds-border bg-white/90 p-3 text-center dark:bg-ds-card">
        <div className="mx-auto h-16 w-16 rounded-xl bg-white" style={{ backgroundImage: `url(${SPRITE})`, backgroundSize: '256px 192px', backgroundPosition: `-${item.col * 64}px -${item.row * 64}px`, backgroundRepeat: 'no-repeat' }} aria-hidden="true"/>
        <p className="mt-1 text-xs font-extrabold text-ds-ink">{item.name}</p><p className="mb-2 text-[9px] text-ds-ink3">{item.target}</p>
        <button type="button" disabled={busy!==null} onClick={() => void apply(item)} className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-ds-ink px-2 py-2 text-[10px] font-bold text-ds-on-green transition hover:bg-ds-green disabled:opacity-50">{busy===item.target?<Loader2 size={12} className="animate-spin"/>:'Terapkan PNG'}</button>
      </article>)}
    </div>
  </section>;
}
