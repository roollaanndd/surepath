import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Monitor, Layout, Type, Image, Eye, EyeOff, Save,
  RotateCcw, CheckCircle, ChevronRight, Layers, Palette, Upload, Loader2, Sparkles,
} from 'lucide-react';
import {
  SpWebsiteConfig, fetchWebsiteSection, upsertWebsiteSection,
  resetWebsiteSection, uploadSectionImage,
} from '../../services/supabaseService';
import PromoBannerAdmin from './PromoBannerAdmin';

type SectionKey = 'hero' | 'marquee' | 'products' | 'how_it_works' | 'about' | 'stats' | 'testimonials' | 'footer' | 'splash' | 'promo_banner' | 'onboarding';

const SECTIONS: { key: SectionKey; label: string; desc: string }[] = [
  { key: 'promo_banner', label: 'Promo Banner', desc: 'Banner pengumuman di atas halaman' },
  { key: 'splash',       label: 'Splash Screen', desc: 'Loading / welcome screen awal' },
  { key: 'onboarding',   label: 'Onboarding Apps', desc: 'Tur perkenalan aplikasi nasabah & agen' },
  { key: 'hero',         label: 'Hero',          desc: 'Headline utama & CTA pertama' },
  { key: 'marquee',      label: 'Ticker',        desc: 'Strip teks berjalan' },
  { key: 'products',     label: 'Produk',        desc: 'Grid kartu produk asuransi' },
  { key: 'how_it_works', label: 'Cara Kerja',    desc: 'Langkah-langkah penggunaan' },
  { key: 'stats',        label: 'Statistik',     desc: 'Bar angka kepercayaan' },
  { key: 'testimonials', label: 'Testimoni',     desc: 'Ulasan dari pelanggan' },
  { key: 'about',        label: 'Tentang',       desc: 'Seksi cerita perusahaan' },
  { key: 'footer',       label: 'Footer',        desc: 'Bagian bawah halaman' },
];

const BG_TYPES: { value: SpWebsiteConfig['bg_type']; label: string; desc: string }[] = [
  { value: 'animated-mesh', label: 'Animated Mesh', desc: 'Canvas blob animation (default)' },
  { value: 'gradient',      label: 'Gradient CSS',  desc: 'Custom gradient string' },
  { value: 'solid',         label: 'Solid Color',   desc: 'Warna latar polos' },
  { value: 'image',         label: 'Image',         desc: 'Upload file atau masukkan URL gambar' },
  { value: 'none',          label: 'None',          desc: 'Transparan / tanpa bg' },
];

const inputCls = 'bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-ds-ink placeholder-gray-600 transition-colors';
const labelCls = 'text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-1.5 block';

const defaultSection = (key: SectionKey): SpWebsiteConfig => ({
  section_key: key,
  bg_type: 'none',
  is_visible: true,
});

const WebsiteEditorAdmin: React.FC = () => {
  const [activeKey, setActiveKey] = useState<SectionKey>('hero');
  const [form, setForm] = useState<SpWebsiteConfig>(defaultSection('hero'));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'background'>('content');
  const [uploading, setUploading]       = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const logoInputRef    = useRef<HTMLInputElement>(null);

  const loadSection = useCallback(async (key: SectionKey) => {
    setLoading(true);
    const existing = await fetchWebsiteSection(key);
    setForm(existing ?? defaultSection(key));
    setLoading(false);
    setSaved(false);
  }, []);

  useEffect(() => {
    loadSection(activeKey);
    setActiveTab('content');
  }, [activeKey, loadSection]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const result = await upsertWebsiteSection({
        section_key:        form.section_key,
        headline:           form.headline,
        subtitle:           form.subtitle,
        cta_text:           form.cta_text,
        cta_secondary_text: form.cta_secondary_text,
        bg_type:            form.bg_type,
        bg_value:           form.bg_value,
        is_visible:         form.is_visible,
      });
      if (!result) {
        setSaveError('Gagal menyimpan perubahan. Periksa koneksi dan hak akses CMS, lalu coba lagi.');
        return;
      }
      setForm(result);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Terjadi kesalahan saat menyimpan. Perubahan belum dipastikan tersimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      const reset = await resetWebsiteSection(activeKey);
      if (!reset) {
        setSaveError('Gagal mereset bagian website. Perubahan yang tersimpan belum diubah.');
        return;
      }
      setForm(defaultSection(activeKey));
    } catch {
      setSaveError('Reset gagal. Periksa koneksi dan hak akses CMS, lalu coba lagi.');
    }
  };

  const set = (field: Partial<SpWebsiteConfig>) => {
    setSaved(false);
    setSaveError(null);
    setForm(prev => ({ ...prev, ...field }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSaveError(null);
    try {
      const url = await uploadSectionImage(file, activeKey);
      if (url) set({ bg_value: url });
      else setSaveError('Gagal mengunggah gambar. Periksa format dan ukuran file, lalu coba lagi.');
    } catch {
      setSaveError('Unggahan gambar gagal. Periksa koneksi dan izin penyimpanan.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setSaveError(null);
    try {
      const url = await uploadSectionImage(file, 'splash-logo');
      if (url) set({ cta_text: url });
      else setSaveError('Gagal mengunggah logo splash. Periksa format dan ukuran file, lalu coba lagi.');
    } catch {
      setSaveError('Unggahan logo splash gagal. Periksa koneksi dan izin penyimpanan.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const savedAt = form.updated_at ? new Date(form.updated_at).toLocaleString('id-ID') : null;

  return (
    <div className="flex gap-6 h-full min-h-[70vh]">
      {/* ── Left: section list ─────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 space-y-1.5">
        <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-4 flex items-center gap-2">
          <Layers size={12} /> Sections
        </p>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveKey(s.key)}
            className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
              activeKey === s.key
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-ds-card2 border border-ds-border text-ds-ink3 hover:text-ds-ink hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide">{s.label}</span>
              <ChevronRight size={12} className={activeKey === s.key ? 'text-emerald-700 dark:text-emerald-400' : 'text-ds-ink2 group-hover:text-ds-ink3'} />
            </div>
            <p className="text-2xs text-ds-ink2 mt-0.5 leading-tight">{s.desc}</p>
          </button>
        ))}
      </aside>

      {/* ── Right: editor ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {activeKey === 'promo_banner' && <PromoBannerAdmin />}
        {activeKey !== 'promo_banner' && (
        <>
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Monitor size={18} className="text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-ds-ink">
                {SECTIONS.find(s => s.key === activeKey)?.label}
              </h3>
              {savedAt && (
                <p className="text-2xs text-ds-ink2">Terakhir disimpan: {savedAt}</p>
              )}
              {loading && (
                <p className="text-2xs text-ds-green flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Memuat...</p>
              )}
            </div>
          </div>

          {/* Visibility toggle */}
          <button
            onClick={() => set({ is_visible: !form.is_visible })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
              form.is_visible
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {form.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
            {form.is_visible ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['content', 'background'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                activeTab === tab
                  ? 'bg-white/[0.08] border-white/15 text-ds-ink'
                  : 'bg-transparent border-ds-border text-ds-ink3 hover:text-ds-ink2'
              }`}
            >
              {tab === 'content' ? <Type size={12} /> : <Palette size={12} />}
              {tab === 'content' ? 'Konten' : 'Background'}
            </button>
          ))}
        </div>

        <div className="bg-ds-card2 border border-ds-border rounded-3xl p-7 space-y-6">
          {activeTab === 'content' && activeKey === 'splash' && (
            <>
              <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <Sparkles size={14} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-2xs text-emerald-300/80 leading-relaxed">
                  Layar loading pertama saat app dibuka. Perubahan berlaku setelah halaman di-refresh.
                </p>
              </div>

              {/* Logo upload */}
              <div>
                <label className={labelCls}>Logo Splash Screen</label>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-2 w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 mb-3"
                >
                  {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {logoUploading ? 'Mengupload...' : 'Upload Logo dari Perangkat'}
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-ds-card2" />
                  <span className="text-2xs text-ds-ink2 font-bold uppercase tracking-widest">atau URL</span>
                  <div className="flex-1 h-px bg-ds-card2" />
                </div>
                <input
                  className={inputCls}
                  placeholder="/logo.png"
                  value={form.cta_text ?? ''}
                  onChange={e => set({ cta_text: e.target.value })}
                />
                <div className="mt-3 h-24 rounded-2xl border border-ds-border bg-black/30 flex items-center justify-center overflow-hidden">
                  <img
                    src={form.cta_text || '/logo.png'}
                    alt="preview"
                    className="h-16 w-auto object-contain"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.4))' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className={labelCls}>Tagline</label>
                <input
                  className={inputCls}
                  placeholder="Your Path to Protection."
                  value={form.headline ?? ''}
                  onChange={e => set({ headline: e.target.value })}
                />
              </div>

              {/* Accent color + swatches */}
              <div>
                <label className={labelCls}>Warna Aksen</label>
                <div className="flex gap-3 items-center mb-3">
                  <input
                    className={inputCls}
                    placeholder="#22c55e"
                    value={form.bg_value ?? ''}
                    onChange={e => set({ bg_value: e.target.value })}
                  />
                  <div className="w-10 h-10 flex-shrink-0 rounded-xl border border-ds-border transition-all"
                    style={{ background: form.bg_value || '#22c55e' }} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { hex: '#22c55e', name: 'Hijau' },
                    { hex: '#10b981', name: 'Emerald' },
                    { hex: '#3b82f6', name: 'Biru' },
                    { hex: '#f97316', name: 'Orange' },
                    { hex: '#a855f7', name: 'Ungu' },
                    { hex: '#ef4444', name: 'Merah' },
                  ].map(c => (
                    <button key={c.hex} onClick={() => set({ bg_value: c.hex })} title={c.name}
                      className="w-8 h-8 rounded-xl border-2 transition-all hover:scale-110"
                      style={{
                        background: c.hex,
                        borderColor: form.bg_value === c.hex ? 'white' : 'transparent',
                        boxShadow: form.bg_value === c.hex ? `0 0 12px ${c.hex}80` : 'none',
                      }} />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'content' && activeKey !== 'splash' && (
            <>
              <div>
                <label className={labelCls}>Headline</label>
                <input
                  className={inputCls}
                  placeholder="Judul section (kosongkan = default)"
                  value={form.headline ?? ''}
                  onChange={e => set({ headline: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Subtitle / Deskripsi</label>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={3}
                  placeholder="Teks pendukung di bawah headline"
                  value={form.subtitle ?? ''}
                  onChange={e => set({ subtitle: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Teks CTA Utama</label>
                  <input
                    className={inputCls}
                    placeholder="mis: Mulai Gratis →"
                    value={form.cta_text ?? ''}
                    onChange={e => set({ cta_text: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teks CTA Sekunder</label>
                  <input
                    className={inputCls}
                    placeholder="mis: Lihat Demo"
                    value={form.cta_secondary_text ?? ''}
                    onChange={e => set({ cta_secondary_text: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'background' && activeKey === 'splash' && (
            <div className="flex items-start gap-3 p-4 bg-ds-card2 border border-ds-border rounded-2xl">
              <Palette size={14} className="text-ds-ink3 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-ds-ink3 leading-relaxed">
                Background splash screen menggunakan animated canvas. Gunakan tab <strong className="text-ds-ink2">Konten</strong> untuk mengubah warna aksen.
              </p>
            </div>
          )}

          {activeTab === 'background' && activeKey !== 'splash' && (
            <>
              <div>
                <label className={labelCls}>Tipe Background</label>
                <div className="grid grid-cols-1 gap-2">
                  {BG_TYPES.map(bt => (
                    <label
                      key={bt.value}
                      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                        form.bg_type === bt.value
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-ds-card2 border-ds-border text-ds-ink3 hover:border-white/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bgType"
                        value={bt.value}
                        checked={form.bg_type === bt.value}
                        onChange={() => set({ bg_type: bt.value })}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">{bt.label}</p>
                        <p className="text-2xs text-ds-ink2 mt-0.5">{bt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(form.bg_type === 'gradient' || form.bg_type === 'solid' || form.bg_type === 'image') && (
                <div>
                  <label className={labelCls}>
                    {form.bg_type === 'gradient' && 'CSS Gradient (e.g. linear-gradient(135deg, #667eea 0%, #764ba2 100%))'}
                    {form.bg_type === 'solid'    && 'Hex Color (e.g. #0f0f1a)'}
                    {form.bg_type === 'image'    && 'Gambar Background'}
                  </label>

                  {form.bg_type === 'image' ? (
                    <div className="space-y-3">
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploading ? 'Mengupload...' : 'Upload Gambar dari Perangkat'}
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-ds-card2" />
                        <span className="text-2xs text-ds-ink2 font-bold uppercase tracking-widest">atau URL</span>
                        <div className="flex-1 h-px bg-ds-card2" />
                      </div>
                      <input
                        className={inputCls}
                        placeholder="https://..."
                        value={form.bg_value ?? ''}
                        onChange={e => set({ bg_value: e.target.value })}
                      />
                      {form.bg_value && (
                        <div
                          className="mt-1 h-32 rounded-2xl border border-ds-border bg-center bg-cover relative overflow-hidden"
                          style={{ backgroundImage: `url(${form.bg_value})` }}
                        >
                          <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                            <span className="text-2xs text-ds-ink3 font-bold uppercase tracking-widest">Preview</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        className={inputCls}
                        placeholder={form.bg_type === 'gradient' ? 'linear-gradient(...)' : '#0f0f1a'}
                        value={form.bg_value ?? ''}
                        onChange={e => set({ bg_value: e.target.value })}
                      />
                      {form.bg_value && (
                        <div className="mt-3 h-12 rounded-2xl border border-ds-border" style={{ background: form.bg_value }} />
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {saveError && <p role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-200">{saveError}</p>}
        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-3 bg-white/[0.04] border border-ds-border hover:bg-ds-card2 text-ds-ink3 hover:text-ds-ink rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            <RotateCcw size={14} /> Reset ke Default
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-4 py-2 bg-ds-card2 border border-ds-border rounded-xl">
            <Layout size={12} className="text-ds-green" />
            <span className="text-2xs text-ds-green font-bold uppercase tracking-widest">Live · Tersimpan di Supabase</span>
            <Image size={12} className="text-ds-green" />
          </div>
        </div>

        <p className="text-2xs text-ds-ink2 mt-3 leading-relaxed">
          Perubahan disimpan ke Supabase dan langsung aktif di website setelah pengunjung refresh. Kosongkan field untuk kembali ke konten default.
        </p>
        </>
        )}
      </div>
    </div>
  );
};

export default WebsiteEditorAdmin;
