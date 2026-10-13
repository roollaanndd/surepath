import React, { useEffect, useState } from 'react';
import { ImagePlus, Trash2, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { getPortalIconMap, removePortalIcon, savePortalIcon, type PortalIconMap } from '../../services/portalIcons';

const ICONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ops_console', label: 'Konsol Operasi' },
  { id: 'home', label: 'Beranda' },
  { id: 'policy', label: 'Polis' },
  { id: 'quotes', label: 'Buat penawaran' },
  { id: 'new', label: 'Pengajuan baru B2B' },
  { id: 'submissions', label: 'Pengajuan B2B' },
  { id: 'commission', label: 'Dompet / Komisi' },
  { id: 'commission_ledger', label: 'Buku besar komisi' },
  { id: 'profile', label: 'Profil' },
  { id: 'clients', label: 'Klien' },
  { id: 'claims', label: 'Klaim' },
  { id: 'claims_admin', label: 'Antrean klaim' },
  { id: 'agents', label: 'Manajemen Mitra' },
  { id: 'payments', label: 'Pembayaran' },
  { id: 'withdraw', label: 'Tarik dana' },
  { id: 'withdrawals', label: 'Penarikan admin' },
  { id: 'documents', label: 'Dokumen' },
  { id: 'b2b', label: 'B2B' },
  { id: 'settings', label: 'Pengaturan' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reports', label: 'Laporan' },
  { id: 'transactions', label: 'Transaksi' },
  { id: 'policy_orders', label: 'Pesanan polis' },
  { id: 'approvals', label: 'Antrean polis' },
  { id: 'inventory', label: 'Data polis' },
  { id: 'endorsements', label: 'Endorsement' },
  { id: 'user_mgmt', label: 'Kelola akun' },
  { id: 'users', label: 'Pengguna' },
  { id: 'insurers', label: 'Perusahaan asuransi' },
  { id: 'product_config', label: 'Produk' },
  { id: 'tier_promo', label: 'Tier dan promo' },
  { id: 'ojk_rates', label: 'Rate OJK' },
  { id: 'financial', label: 'Keuangan' },
  { id: 'vehicle_pricelist', label: 'Database kendaraan' },
  { id: 'website_editor', label: 'Editor website' },
  { id: 'ai_admin', label: 'AI Admin' },
  { id: 'ai_finance', label: 'AI Finance' },
  { id: 'pathy_logs', label: 'Rekaman Pathy' },
  { id: 'activity_log', label: 'Jejak aktivitas' },
  { id: 'security', label: 'Keamanan' },
  { id: 'notifications', label: 'Notifikasi' },
] as const;

export default function PortalIconManager() {
  const [icons, setIcons] = useState<PortalIconMap>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getPortalIconMap(true).then(setIcons).catch(() => setError('Gagal memuat konfigurasi ikon.'));
  }, []);

  const handleUpload = async (id: string, file?: File) => {
    if (!file) return;
    setError('');
    setNotice('');
    if (!file.type.startsWith('image/')) { setError('Pilih file gambar, seperti PNG, WebP, atau JPG.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran gambar maksimal 5 MB.'); return; }
    setBusyKey(id);
    try {
      const next = await savePortalIcon(id, file);
      if (next) { setIcons(next); setNotice(`Ikon ${id} berhasil diperbarui dan disimpan.`); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan ikon.');
    } finally { setBusyKey(null); }
  };

  const handleRemove = async (id: string) => {
    setBusyKey(id); setError(''); setNotice('');
    try {
      const next = await removePortalIcon(id);
      setIcons(next);
      setNotice(`Ikon ${id} dikembalikan ke ikon bawaan.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus pengaturan ikon.');
    } finally { setBusyKey(null); }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(120deg,#0B1120 0%,#0E3B2E 60%,#087A55 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center"><ImagePlus size={25} /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Visual assets</p>
            <h2 className="text-2xl font-black">Icon Manager</h2>
          </div>
        </div>
        <p className="text-sm text-white/75 mt-3 max-w-2xl">Ganti gambar ikon portal langsung dari dashboard. Perubahan tersimpan di konfigurasi CMS dan akan digunakan di navigasi tanpa perlu mengubah kode atau deploy ulang.</p>
      </div>

      <div className="rounded-2xl border border-ds-border bg-ds-card p-4 flex gap-3 items-start">
        <ImageIcon className="text-ds-green mt-0.5" size={20} />
        <div className="text-sm text-ds-ink2">
          <p className="font-bold text-ds-ink">Rekomendasi gambar</p>
          <p>PNG transparan atau WebP, bentuk persegi 1:1, minimal 256 × 256 px, maksimal 5 MB. Gambar akan ditampilkan dengan rasio terjaga dan tanpa dipotong.</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={17} />{notice}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ICONS.map(item => (
          <article key={item.id} className="rounded-2xl border border-ds-border bg-ds-card p-4 flex gap-3 min-w-0">
            <div className="w-16 h-16 rounded-2xl border border-ds-border bg-ds-card2 flex items-center justify-center overflow-hidden flex-shrink-0">
              {icons[item.id]
                ? <img src={icons[item.id]} alt={`Preview ikon ${item.label}`} className="w-full h-full object-contain p-2" />
                : <ImageIcon className="text-ds-ink3" size={27} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-ds-ink">{item.label}</p>
              <p className="text-[11px] text-ds-ink3 mb-3">{icons[item.id] ? 'Ikon kustom aktif' : 'Menggunakan ikon bawaan'}</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 bg-ds-green text-white text-xs font-bold cursor-pointer hover:opacity-90">
                  {busyKey === item.id ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  Ganti gambar
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busyKey !== null} onChange={e => { const file = e.currentTarget.files?.[0]; void handleUpload(item.id, file); e.currentTarget.value = ''; }} />
                </label>
                {icons[item.id] && <button type="button" disabled={busyKey !== null} onClick={() => void handleRemove(item.id)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 border border-ds-border text-ds-ink2 text-xs font-bold disabled:opacity-50"><Trash2 size={13} />Reset</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
