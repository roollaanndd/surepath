import React, { useState, useEffect, useCallback } from 'react';
import { Save, Eye, EyeOff, CheckCircle, Loader2, Megaphone } from 'lucide-react';
import {
  SpWebsiteConfig, fetchWebsiteSection, upsertWebsiteSection,
} from '../../services/supabaseService';

const inputCls = 'bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white placeholder-gray-600 transition-colors';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block';

const PromoBannerAdmin: React.FC = () => {
  const [form, setForm] = useState<Partial<SpWebsiteConfig>>({
    section_key: 'promo_banner',
    headline: '',
    subtitle: '',
    is_visible: false,
    bg_type: 'none',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: Partial<SpWebsiteConfig>) => setForm(prev => ({ ...prev, ...field }));

  const handleSave = async () => {
    setSaving(true);
    await upsertWebsiteSection({
      section_key: 'promo_banner',
      headline: form.headline ?? '',
      subtitle: form.subtitle ?? '',
      is_visible: form.is_visible ?? false,
      bg_type: 'none',
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const previewVisible = !!(form.headline && form.is_visible);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
            <Megaphone size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Promo Banner</h3>
            <p className="text-[10px] text-gray-600">Banner pengumuman di atas halaman</p>
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
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-7 space-y-5">
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

          <div className="pt-2">
            <label className={labelCls}>Preview Live</label>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              {previewVisible ? (
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
              ) : (
                <div className="py-4 flex items-center justify-center gap-2 text-gray-600 text-xs">
                  <EyeOff size={14} />
                  {form.is_visible && !form.headline ? 'Masukkan headline untuk preview' : 'Banner tersembunyi'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
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
