import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Trash2, Loader2, CheckCircle2, Search, Sparkles, Palette, RotateCcw } from 'lucide-react';
import { getPortalIconMap, getPortalIconStyles, removePortalIcon, savePortalIcon, setPortalIconStyle, subscribePortalIconStyles, type PortalIconMap, type PortalIconStyleMap } from '../../services/portalIcons';
import SurePathIcon, { type SurePathIconStyle } from '../shared/SurePathIcon';

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
      <header className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 text-white" style={{ background: 'radial-gradient(circle at 86% 12%, rgba(103,232,249,.32), transparent 25%), radial-gradient(circle at 68% 100%, rgba(192,132,252,.3), transparent 28%), linear-gradient(125deg,#10172C 0%,#173A56 52%,#086B61 100%)' }}>
        <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border border-white/15" /><div className="absolute right-14 -bottom-20 h-48 w-48 rounded-full border border-white/15" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><Sparkles size={28} /></div>
            <div><p className="text-[11px] font-black uppercase tracking-[.24em] text-cyan-200">SurePath visual lab</p><h2 className="text-3xl font-black tracking-tight">Icon Manager</h2><p className="text-sm text-white/70 mt-1">Ikon orisinal. Karakter konsisten. Pilihan visual yang bisa dikurasi.</p></div>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3"><p className="text-xs text-white/70">Koleksi ikon</p><p className="text-2xl font-black">{ICONS.length}<span className="text-sm font-semibold text-cyan-200"> × 3 gaya</span></p></div>
        </div>
        <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STYLES.map(s => <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 p-3"><SurePathIcon id="pathy" size={43} style={s.id}/><div><p className="font-bold text-sm">{s.title}</p><p className="text-xs text-white/65">{s.desc}</p></div></div>)}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-ink3"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari ikon, mis. klaim, kendaraan, Pathy..." className="w-full rounded-2xl border border-ds-border bg-ds-card py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ds-green/40"/></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{groups.map(g => <button type="button" key={g} onClick={() => setGroup(g)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${group === g ? 'bg-ds-ink text-white border-ds-ink' : 'bg-ds-card border-ds-border text-ds-ink2 hover:border-ds-green'}`}>{g}</button>)}</div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={17}/>{notice}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map(item => {
          const selected = styles[item.id] || 'studio';
          return <article key={item.id} className="rounded-[24px] border border-ds-border bg-ds-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0"><div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{background: 'linear-gradient(135deg,#EEF8FF,#F8F2FF)'}}>{icons[item.id] ? <img src={icons[item.id]} alt="" className="w-9 h-9 object-contain"/> : <SurePathIcon id={item.id} size={38} style={selected}/>}</div><div className="min-w-0"><h3 className="font-black text-sm text-ds-ink truncate">{item.label}</h3><p className="text-[11px] text-ds-ink3">{item.group} · {icons[item.id] ? 'Gambar kustom aktif' : `Gaya ${selected}`}</p></div></div>
              <label className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 bg-ds-ink text-white text-xs font-bold cursor-pointer hover:opacity-90 shrink-0">{busyKey === item.id ? <Loader2 size={14} className="animate-spin"/> : <ImagePlus size={14}/>} Upload<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busyKey !== null} onChange={e => {const file=e.currentTarget.files?.[0]; void handleUpload(item.id,file); e.currentTarget.value='';}}/></label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(s => <button key={s.id} type="button" disabled={busyKey !== null || !!icons[item.id]} onClick={() => void handleStyle(item.id,s.id)} className={`relative rounded-2xl border p-3 flex flex-col items-center gap-2 min-w-0 transition-all ${selected === s.id && !icons[item.id] ? 'border-ds-green bg-ds-green-tint/40 ring-1 ring-ds-green/30' : 'border-ds-border bg-ds-card2 hover:border-ds-ink3'} disabled:opacity-50`}>
                {selected === s.id && !icons[item.id] && <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-ds-green"/>}
                <SurePathIcon id={item.id} size={48} style={s.id}/>
                <span className="text-xs font-black text-ds-ink">{s.title}</span><span className="text-[10px] text-ds-ink3 text-center leading-tight">{s.desc}</span>
              </button>)}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3"><p className="text-[11px] text-ds-ink3">Pilihan tersimpan dan dipakai di portal.</p>{icons[item.id] && <button type="button" disabled={busyKey !== null} onClick={() => void handleRemove(item.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"><RotateCcw size={13}/>Kembali ke ikon ilustrasi</button>}</div>
          </article>;
        })}
      </div>
      {filtered.length === 0 && <div className="rounded-3xl border border-dashed border-ds-border p-12 text-center"><Palette size={28} className="mx-auto text-ds-ink3 mb-3"/><p className="font-bold text-ds-ink">Ikon tidak ditemukan</p><p className="text-sm text-ds-ink3 mt-1">Coba kata kunci atau kategori lain.</p></div>}
      <p className="text-xs text-ds-ink3 flex items-center gap-2"><CheckCircle2 size={14}/>Gaya ilustrasi bisa dipilih per ikon. Upload gambar kustom akan menjadi prioritas sampai dikembalikan ke ilustrasi SurePath.</p>
    </section>
  );
}
