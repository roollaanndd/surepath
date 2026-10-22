import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, CheckCircle2, Search, Sparkles, Palette, RotateCcw } from 'lucide-react';
import { getPortalIconMap, getPortalIconStyles, removePortalIcon, savePortalIcon, setPortalIconStyle, subscribePortalIconStyles, type PortalIconMap, type PortalIconStyleMap } from '../../services/portalIcons';
import SurePathIcon, { type SurePathIconStyle } from '../shared/SurePathIcon';
import SurePathIllustrationIcon from '../shared/SurePathIllustrationIcon';
import SketchPngLibrary from './SketchPngLibrary';

const ICONS = [
  { id: 'home', label: 'Beranda', group: 'Navigasi' }, { id: 'dashboard', label: 'Dashboard', group: 'Navigasi' },
  { id: 'policy', label: 'Polis', group: 'Navigasi' }, { id: 'quotes', label: 'Buat penawaran', group: 'Navigasi' },
  { id: 'profile', label: 'Profil', group: 'Navigasi' }, { id: 'notifications', label: 'Notifikasi', group: 'Navigasi' },
  { id: 'clients', label: 'Klien', group: 'Relasi' }, { id: 'users', label: 'Pengguna', group: 'Relasi' },
  { id: 'agents', label: 'Mitra / Agen', group: 'Relasi' }, { id: 'insurers', label: 'Perusahaan asuransi', group: 'Relasi' },
  { id: 'b2b', label: 'B2B / Corporate', group: 'Relasi' }, { id: 'user_mgmt', label: 'Kelola akun', group: 'Relasi' },
  { id: 'claims', label: 'Klaim', group: 'Operasional' }, { id: 'claims_admin', label: 'Antrean klaim', group: 'Operasional' },
  { id: 'approvals', label: 'Persetujuan', group: 'Operasional' }, { id: 'payments', label: 'Pembayaran', group: 'Operasional' },
  { id: 'withdraw', label: 'Tarik dana', group: 'Operasional' }, { id: 'withdrawals', label: 'Penarikan admin', group: 'Operasional' },
  { id: 'transactions', label: 'Transaksi', group: 'Operasional' }, { id: 'activity_log', label: 'Jejak aktivitas', group: 'Operasional' },
  { id: 'commission', label: 'Komisi', group: 'Keuangan' }, { id: 'commission_ledger', label: 'Buku besar komisi', group: 'Keuangan' },
  { id: 'financial', label: 'Keuangan', group: 'Keuangan' }, { id: 'analytics', label: 'Analitik', group: 'Keuangan' },
  { id: 'reports', label: 'Laporan', group: 'Keuangan' }, { id: 'inventory', label: 'Data polis', group: 'Keuangan' },
  { id: 'documents', label: 'Dokumen', group: 'Produk & Konten' }, { id: 'product_config', label: 'Produk', group: 'Produk & Konten' },
  { id: 'policy_orders', label: 'Pesanan polis', group: 'Produk & Konten' }, { id: 'endorsements', label: 'Endorsement', group: 'Produk & Konten' },
  { id: 'vehicle_pricelist', label: 'Database kendaraan', group: 'Produk & Konten' }, { id: 'ojk_rates', label: 'Rate OJK', group: 'Produk & Konten' },
  { id: 'website_editor', label: 'Editor website', group: 'Produk & Konten' }, { id: 'tier_promo', label: 'Tier dan promo', group: 'Produk & Konten' },
  { id: 'pathy', label: 'Pathy AI', group: 'AI & Sistem' }, { id: 'ai_admin', label: 'AI Admin', group: 'AI & Sistem' },
  { id: 'ai_finance', label: 'AI Finance', group: 'AI & Sistem' }, { id: 'pathy_logs', label: 'Percakapan Pathy', group: 'AI & Sistem' },
  { id: 'ops_console', label: 'Konsol operasi', group: 'AI & Sistem' }, { id: 'security', label: 'Keamanan', group: 'AI & Sistem' },
  { id: 'settings', label: 'Pengaturan', group: 'AI & Sistem' }, { id: 'system', label: 'Sistem', group: 'AI & Sistem' },
  { id: 'product', label: 'Katalog produk', group: 'Produk Asuransi' }, { id: 'car_protection', label: 'Perlindungan kendaraan', group: 'Produk Asuransi' },
  { id: 'travel_safe', label: 'Perlindungan perjalanan', group: 'Produk Asuransi' }, { id: 'personal_safety', label: 'Perlindungan diri', group: 'Produk Asuransi' },
  { id: 'item_shield', label: 'Perlindungan barang', group: 'Produk Asuransi' }, { id: 'family_health', label: 'Kesehatan keluarga', group: 'Produk Asuransi' },
] as const;
const STYLES: { id: SurePathIconStyle; title: string; desc: string }[] = [
  { id: 'studio', title: 'Studio', desc: 'Ilustrasi dimensional' },
  { id: 'orbit', title: 'Orbit', desc: 'Aksen orbit dinamis' },
  { id: 'bold', title: 'Bold', desc: 'Siluet tegas' },
  { id: 'illustrative', title: 'Illustrative', desc: 'Flat cartoon, tanpa glossy' },
];

export default function PortalIconManager() {
  const [icons, setIcons] = useState<PortalIconMap>({});
  const [styles, setStyles] = useState<PortalIconStyleMap>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Semua');

  useEffect(() => {
    const unsubscribe = subscribePortalIconStyles(setStyles);
    getPortalIconMap(true)
      .then(map => { setIcons(map); setStyles(getPortalIconStyles()); })
      .catch(() => setError('Gagal memuat konfigurasi ikon.'));
    return unsubscribe;
  }, []);

  const groups = useMemo(() => ['Semua', ...Array.from(new Set(ICONS.map(item => item.group)))], []);
  const filtered = useMemo(() => ICONS.filter(item =>
    (group === 'Semua' || item.group === group) &&
    (item.label.toLowerCase().includes(query.toLowerCase()) || item.id.includes(query.toLowerCase()))
  ), [group, query]);

  const handleUpload = async (id: string, file?: File) => {
    if (!file) return;
    setError(''); setNotice('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Gunakan gambar PNG, JPG, atau WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran gambar maksimal 5 MB.'); return; }
    setBusyKey(id);
    try {
      const next = await savePortalIcon(id, file);
      if (next) { setIcons(next); setNotice(`Ikon ${id} berhasil diperbarui.`); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan ikon.'); }
    finally { setBusyKey(null); }
  };
  const handleRemove = async (id: string) => {
    setBusyKey(id); setError(''); setNotice('');
    try { const next = await removePortalIcon(id); setIcons(next); setNotice(`Ikon ${id} kembali menggunakan ilustrasi SurePath.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal menghapus pengaturan ikon.'); }
    finally { setBusyKey(null); }
  };
  const handleStyle = async (id: string, style: SurePathIconStyle) => {
    setBusyKey(id); setError(''); setNotice('');
    try { const next = await setPortalIconStyle(id, style); setStyles(next); setNotice(`Gaya ${style} disimpan untuk ${id}.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan gaya ikon.'); }
    finally { setBusyKey(null); }
  };

  return (
    <section className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-ds-border bg-ds-card p-5 sm:p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl"/><div className="pointer-events-none absolute right-24 -bottom-24 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl"/>
        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div><div className="inline-flex items-center gap-2 rounded-full border border-ds-green/20 bg-ds-green-tint/50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.18em] text-ds-green"><Sparkles size={13}/> SurePath Visual Lab</div><h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-ds-ink">Icon Manager<span className="text-ds-green">.</span></h2><p className="mt-2 max-w-2xl text-sm sm:text-base text-ds-ink2">Satu bahasa visual untuk seluruh SurePath. Kurasi ilustrasi, atur gaya, dan kelola ikon kustom dari satu tempat.</p></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:min-w-[390px]">
            <div className="rounded-2xl border border-ds-border bg-ds-card2/70 p-3"><p className="text-[10px] sm:text-xs text-ds-ink3">Total ikon</p><p className="mt-1 text-2xl font-black text-ds-ink">{ICONS.length}</p></div>
            <div className="rounded-2xl border border-ds-border bg-ds-card2/70 p-3"><p className="text-[10px] sm:text-xs text-ds-ink3">Gaya visual</p><p className="mt-1 text-2xl font-black text-ds-ink">03</p></div>
            <div className="rounded-2xl border border-ds-border bg-ds-card2/70 p-3"><p className="text-[10px] sm:text-xs text-ds-ink3">Ikon kustom</p><p className="mt-1 text-2xl font-black text-ds-ink">{Object.keys(icons).length}</p></div>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">{STYLES.map((s,i)=><div key={s.id} className="group flex items-center gap-3 rounded-2xl border border-ds-border bg-ds-card/80 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${i===0?'bg-emerald-500/10':i===1?'bg-cyan-500/10':'bg-violet-500/10'}`}>{s.id === "illustrative" ? <SurePathIllustrationIcon id="pathy" size={43}/> : <SurePathIcon id="pathy" size={43} style={s.id}/>}</div><div><p className="font-extrabold text-sm text-ds-ink">{s.title}</p><p className="mt-0.5 text-xs text-ds-ink3">{s.desc}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ds-green">Style 0{i+1}</p></div></div>)}</div>
      </header>
      <div className="rounded-[24px] border border-ds-border bg-ds-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3"><div className="relative flex-1 min-w-0"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-ink3"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama ikon atau ID..." className="w-full rounded-2xl border border-ds-border bg-ds-card2 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-ds-green focus:ring-4 focus:ring-ds-green/10"/></div><div className="flex items-center gap-2 text-xs text-ds-ink3"><span className="inline-flex h-2 w-2 rounded-full bg-ds-green"/>{filtered.length} ikon ditampilkan</div></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{groups.map(g=><button type="button" key={g} onClick={()=>setGroup(g)} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${group===g?'border-ds-ink bg-ds-ink text-white shadow-sm':'border-ds-border bg-ds-card text-ds-ink2 hover:border-ds-green hover:text-ds-green'}`}>{g==='Semua'?'✦ Semua ikon':g}</button>)}</div>
      </div>
      {error&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}{notice&&<p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700"><CheckCircle2 size={17}/>{notice}</p>}
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-black text-ds-ink">Koleksi ikon</h3><p className="mt-0.5 text-xs text-ds-ink3">Pilih karakter visual atau unggah ilustrasi milikmu.</p></div><span className="rounded-xl bg-ds-green-tint px-3 py-2 text-xs font-extrabold text-ds-green">{group}</span></div>
      <SketchPngLibrary />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {filtered.map(item=>{const selected=styles[item.id]||'studio';const custom=!!icons[item.id];return <article key={item.id} className="group relative min-w-0 overflow-hidden rounded-[22px] border border-ds-border bg-ds-card p-3 sm:p-4 transition-all duration-200 hover:-translate-y-1 hover:border-ds-green/40 hover:shadow-lg hover:shadow-ds-green/5">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 opacity-0 transition-opacity group-hover:opacity-100"/><div className="flex items-start justify-between gap-2"><span className="rounded-full border border-ds-border bg-ds-card2 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ds-ink3">{item.group}</span>{custom&&<span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-violet-600">CUSTOM</span>}</div>
          <div className="mx-auto mt-3 flex aspect-square w-full max-w-[150px] items-center justify-center rounded-[26px] border border-white/70 bg-gradient-to-br from-emerald-500/[.09] via-cyan-500/[.07] to-violet-500/[.10] shadow-inner">{custom?<img src={icons[item.id]} alt={item.label} className="h-20 w-20 object-contain sm:h-24 sm:w-24"/>:<SurePathIcon id={item.id} size={82} style={selected}/>}</div>
          <div className="mt-3 text-center"><h4 className="truncate text-sm font-black text-ds-ink" title={item.label}>{item.label}</h4><p className="mt-1 font-mono text-[10px] text-ds-ink3">{item.id}</p></div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">{STYLES.map(s=><button key={s.id} type="button" title={s.desc} disabled={busyKey!==null||custom} onClick={()=>void handleStyle(item.id,s.id)} className={`flex min-w-0 items-center justify-center rounded-xl border px-1 py-2 text-[10px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${selected===s.id&&!custom?'border-ds-green bg-ds-green-tint text-ds-green ring-1 ring-ds-green/20':'border-ds-border bg-ds-card2 text-ds-ink2 hover:border-ds-green/60'}`}>{s.title}</button>)}</div>
          <div className="mt-3 flex gap-2"><label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-ds-ink px-2 py-2.5 text-xs font-bold text-white transition hover:bg-ds-green">{busyKey===item.id?<Loader2 size={14} className="animate-spin"/>:<ImagePlus size={14}/>}<span>{custom?'Ganti ikon':'Upload ikon'}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busyKey!==null} onChange={e=>{const file=e.currentTarget.files?.[0];void handleUpload(item.id,file);e.currentTarget.value='';}}/></label>{custom&&<button type="button" aria-label={`Kembalikan ikon ${item.label}`} title="Kembali ke ilustrasi SurePath" disabled={busyKey!==null} onClick={()=>void handleRemove(item.id)} className="inline-flex items-center justify-center rounded-xl border border-ds-border px-3 text-ds-ink2 transition hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"><RotateCcw size={15}/></button>}</div>
        </article>})}
      </div>
      {filtered.length===0&&<div className="rounded-3xl border border-dashed border-ds-border p-12 text-center"><Palette size={28} className="mx-auto mb-3 text-ds-ink3"/><p className="font-bold text-ds-ink">Ikon tidak ditemukan</p><p className="mt-1 text-sm text-ds-ink3">Coba kata kunci atau kategori lain.</p></div>}
      <p className="flex items-center gap-2 text-xs text-ds-ink3"><CheckCircle2 size={14}/>Perubahan tersimpan dan digunakan di portal. Ikon kustom menjadi prioritas sampai dikembalikan ke ilustrasi SurePath.</p>
    </section>
  );
}
