import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Eye, EyeOff, CheckCircle, Loader2, Megaphone, X } from 'lucide-react';
import {
  SpWebsiteConfig, fetchWebsiteSection, upsertWebsiteSection, uploadSectionImage,
} from '../../services/supabaseService';

const inputCls = 'bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white placeholder-gray-600 transition-colors';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-ds-ink3 mb-1.5 block';

const PromoBannerAdmin: React.FC = () => {
  const [form, setForm] = useState<Partial<SpWebsiteConfig>>({
    section_key: 'promo_banner',
    headline: '',
    subtitle: '',
    is_visible: false,
    bg_type: 'none',
    extra_json: {},
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchWebsiteSection('promo_banner');
    if (data) {
      setForm({
        section_key: 'promo_banner',
        headline: data.headline ?? '',
        subtitle: data.subtitle ?? '',
        is_visible: data.is_visible,
        bg_type: 'none',
        extra_json: { image_url: data.extra_json?.image_url ?? null },
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: Partial<SpWebsiteConfig>) => {
    setSaved(false);
    setSaveError(null);
    setForm(prev => ({ ...prev, ...field }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSaveError(null);
    try {
      const url = await uploadSectionImage(file, 'promo_banner');
      if (url) {
        set({ extra_json: { ...form.extra_json, image_url: url } });
      } else {
        setSaveError('Gagal mengunggah gambar banner. Periksa format dan ukuran file, lalu coba lagi.');
      }
    } catch {
      setSaveError('Unggahan gambar banner gagal. Periksa koneksi dan izin penyimpanan.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    set({ extra_json: { ...form.extra_json, image_url: null } });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const result = await upsertWebsiteSection({
        section_key: 'promo_banner',
        headline: form.headline ?? '',
        subtitle: form.subtitle ?? '',
        is_visible: form.is_visible ?? false,
        bg_type: 'none',
        extra_json: { image_url: form.extra_json?.image_url ?? null },
      });
      if (!result) {
        setSaveError('Gagal menyimpan banner. Periksa koneksi dan hak akses CMS, lalu coba lagi.');
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Terjadi kesalahan saat menyimpan banner. Perubahan belum dipastikan tersimpan.');
    } finally {
      setSaving(false);
    }
  };

  const previewVisible = !!(form.headline && form.is_visible);
  const imageUrl: string | null = form.extra_json?.image_url ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
            <Megaphone size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Promo Banner</h3>
            <p className="text-[10px] text-ds-ink2">Banner pengumuman di atas halaman</p>
          </div>
        </div>
        <button
          onClick={() => set({ is_visible: !form.is_visible })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
            form.is_visible
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {form.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
          {form.is_visible ? 'Visible' : 'Hidden'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-emerald-500 text-xs">
          <Loader2 size={14} className="animate-spin" /> Memuat...
        </div>
      ) : (
        <div className="bg-ds-card2 border border-ds-border rounded-3xl p-7 space-y-5">
          <div>
            <label className={labelCls}>Headline</label>
            <input
              className={inputCls}
              placeholder="mis: 🎉 Promo Ramadan — Diskon 30% untuk semua produk!"
              value={form.headline ?? ''}
              onChange={e => set({ headline: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Subtitle (opsional)</label>
            <input
              className={inputCls}
              placeholder="mis: Berlaku hingga 30 Maret 2026"
              value={form.subtitle ?? ''}
              onChange={e => set({ subtitle: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Banner Image (optional)</label>
            <div className="space-y-3">
              {imageUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt="Banner preview"
                    loading="lazy"
                    decoding="async"
                    style={{ height: 80, objectFit: 'cover' }}
                    className="sp-image-reveal rounded-xl border border-ds-border w-auto max-w-[200px]"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-colors"
                  >
                    <X size={12} /> Remove image
                  </button>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <label
                  className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ds-border bg-ds-card2 text-xs font-black uppercase tracking-widest text-ds-ink3 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Mengunggah...
                    </>
                  ) : (
                    'Pilih Gambar'
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploading}
                  />
                </label>
                {!imageUrl && (
                  <span className="text-[10px] text-ds-ink2">Belum ada gambar</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className={labelCls}>Preview Live</label>
            <div className="rounded-2xl overflow-hidden border border-ds-border">
              {previewVisible ? (
                imageUrl ? (
                  <div className="relative w-full" style={{ height: 72 }}>
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="sp-image-reveal absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/50" />
                    <div className="relative h-full px-4 flex items-center justify-between gap-3 text-white">
                      <div className="flex-1 flex items-center justify-center gap-2 text-center min-w-0">
                        <span className="text-xs font-bold truncate drop-shadow">{form.headline}</span>
                        {form.subtitle && (
                          <span className="hidden sm:inline text-xs font-normal opacity-90 truncate drop-shadow">
                            — {form.subtitle}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-[10px] font-black">✕</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white">
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center justify-center gap-2 text-center min-w-0">
                        <span className="text-xs font-bold truncate">{form.headline}</span>
                        {form.subtitle && (
                          <span className="hidden sm:inline text-xs font-normal opacity-90 truncate">
                            — {form.subtitle}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-[10px] font-black">✕</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="py-4 flex items-center justify-center gap-2 text-ds-ink2 text-xs">
                  <EyeOff size={14} />
                  {form.is_visible && !form.headline ? 'Masukkan headline untuk preview' : 'Banner tersembunyi'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {saveError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">{saveError}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading || uploading}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
};

export default PromoBannerAdmin;
