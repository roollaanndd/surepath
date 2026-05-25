import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Monitor, Layout, Type, Image, Eye, EyeOff, Save,
  RotateCcw, CheckCircle, ChevronRight, Layers, Palette, Upload, Loader2,
} from 'lucide-react';
import { db, WebsiteSection } from '../../db';
import { uploadSectionImage } from '../../services/supabaseService';

type SectionKey = 'hero' | 'marquee' | 'products' | 'claims' | 'stats' | 'testimonials' | 'footer';

const SECTIONS: { key: SectionKey; label: string; desc: string }[] = [
  { key: 'hero',         label: 'Hero',          desc: 'Headline utama & CTA pertama' },
  { key: 'marquee',      label: 'Ticker',         desc: 'Strip teks berjalan' },
  { key: 'products',     label: 'Produk',         desc: 'Grid kartu produk asuransi' },
  { key: 'claims',       label: 'Klaim',          desc: 'Seksi cara lapor klaim' },
  { key: 'stats',        label: 'Statistik',      desc: 'Bar angka kepercayaan' },
  { key: 'testimonials', label: 'Testimoni',      desc: 'Ulasan dari pelanggan' },
  { key: 'footer',       label: 'Footer',         desc: 'Bagian bawah halaman' },
];

const BG_TYPES: { value: WebsiteSection['bgType']; label: string; desc: string }[] = [
  { value: 'animated-mesh', label: 'Animated Mesh', desc: 'Canvas blob animation (default)' },
  { value: 'gradient',      label: 'Gradient CSS',  desc: 'Custom gradient string' },
  { value: 'solid',         label: 'Solid Color',   desc: 'Warna latar polos' },
  { value: 'image',         label: 'Image',         desc: 'Upload file atau masukkan URL gambar' },
  { value: 'none',          label: 'None',          desc: 'Transparan / tanpa bg' },
];

const inputCls = 'bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500/50 w-full text-white placeholder-gray-600 transition-colors';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block';

const defaultSection = (key: SectionKey): WebsiteSection => ({
  sectionKey: key,
  bgType: 'animated-mesh',
  isVisible: true,
  updatedAt: '',
});

const WebsiteEditorAdmin: React.FC = () => {
  const [activeKey, setActiveKey] = useState<SectionKey>('hero');
  const [form, setForm] = useState<WebsiteSection>(defaultSection('hero'));
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'background'>('content');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSection = useCallback(async (key: SectionKey) => {
    const existing = await db.websiteConfig.where('sectionKey').equals(key).first();
    setForm(existing ?? defaultSection(key));
    setSaved(false);
  }, []);

  useEffect(() => {
    loadSection(activeKey);
    setActiveTab('content');
  }, [activeKey, loadSection]);

  const handleSave = async () => {
    const payload: WebsiteSection = { ...form, updatedAt: new Date().toISOString() };
    if (payload.id !== undefined) {
      await db.websiteConfig.put(payload);
    } else {
      const id = await db.websiteConfig.add(payload);
      setForm(prev => ({ ...prev, id, updatedAt: payload.updatedAt }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = async () => {
    if (form.id !== undefined) {
      await db.websiteConfig.delete(form.id);
    }
    setForm(defaultSection(activeKey));
    setSaved(false);
  };

  const set = (field: Partial<WebsiteSection>) => setForm(prev => ({ ...prev, ...field }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadSectionImage(file, activeKey);
    setUploading(false);
    if (url) set({ bgValue: url });
    e.target.value = '';
  };

  const savedAt = form.updatedAt ? new Date(form.updatedAt).toLocaleString('id-ID') : null;

  return (
    <div className="flex gap-6 h-full min-h-[70vh]">
      {/* ── Left: section list ─────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <Layers size={12} /> Sections
        </p>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveKey(s.key)}
            className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
              activeKey === s.key
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide">{s.label}</span>
              <ChevronRight size={12} className={activeKey === s.key ? 'text-emerald-400' : 'text-gray-600 group-hover:text-gray-400'} />
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{s.desc}</p>
          </button>
        ))}
      </aside>

      {/* ── Right: editor ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Monitor size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                {SECTIONS.find(s => s.key === activeKey)?.label}
              </h3>
              {savedAt && (
                <p className="text-[10px] text-gray-600">Terakhir disimpan: {savedAt}</p>
              )}
            </div>
          </div>

          {/* Visibility toggle */}
          <button
            onClick={() => set({ isVisible: !form.isVisible })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
              form.isVisible
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {form.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            {form.isVisible ? 'Visible' : 'Hidden'}
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
                  ? 'bg-white/[0.08] border-white/15 text-white'
                  : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'content' ? <Type size={12} /> : <Palette size={12} />}
              {tab === 'content' ? 'Konten' : 'Background'}
            </button>
          ))}
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-7 space-y-6">
          {activeTab === 'content' && (
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
                    value={form.ctaText ?? ''}
                    onChange={e => set({ ctaText: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teks CTA Sekunder</label>
                  <input
                    className={inputCls}
                    placeholder="mis: Lihat Demo"
                    value={form.ctaSecondaryText ?? ''}
                    onChange={e => set({ ctaSecondaryText: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'background' && (
            <>
              <div>
                <label className={labelCls}>Tipe Background</label>
                <div className="grid grid-cols-1 gap-2">
                  {BG_TYPES.map(bt => (
                    <label
                      key={bt.value}
                      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                        form.bgType === bt.value
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bgType"
                        value={bt.value}
                        checked={form.bgType === bt.value}
                        onChange={() => set({ bgType: bt.value })}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">{bt.label}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{bt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(form.bgType === 'gradient' || form.bgType === 'solid' || form.bgType === 'image') && (
                <div>
                  <label className={labelCls}>
                    {form.bgType === 'gradient' && 'CSS Gradient (e.g. linear-gradient(135deg, #667eea 0%, #764ba2 100%))'}
                    {form.bgType === 'solid'    && 'Hex Color (e.g. #0f0f1a)'}
                    {form.bgType === 'image'    && 'Gambar Background'}
                  </label>

                  {form.bgType === 'image' ? (
                    <div className="space-y-3">
                      {/* Upload button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploading ? 'Mengupload...' : 'Upload Gambar dari Perangkat'}
                      </button>

                      {/* URL fallback */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">atau URL</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      <input
                        className={inputCls}
                        placeholder="https://..."
                        value={form.bgValue ?? ''}
                        onChange={e => set({ bgValue: e.target.value })}
                      />

                      {/* Preview */}
                      {form.bgValue && (
                        <div
                          className="mt-1 h-32 rounded-2xl border border-white/10 bg-center bg-cover relative overflow-hidden"
                          style={{ backgroundImage: `url(${form.bgValue})` }}
                        >
                          <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                            <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Preview</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        className={inputCls}
                        placeholder={form.bgType === 'gradient' ? 'linear-gradient(...)' : '#0f0f1a'}
                        value={form.bgValue ?? ''}
                        onChange={e => set({ bgValue: e.target.value })}
                      />
                      {form.bgValue && (
                        <div
                          className="mt-3 h-12 rounded-2xl border border-white/10"
                          style={{ background: form.bgValue }}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20"
          >
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-3 bg-white/[0.04] border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            <RotateCcw size={14} /> Reset ke Default
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl">
            <Layout size={12} className="text-gray-600" />
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Live Preview on Website</span>
            <Image size={12} className="text-gray-600" />
          </div>
        </div>

        <p className="text-[10px] text-gray-700 mt-3 leading-relaxed">
          Perubahan berlaku setelah disimpan dan halaman website di-refresh. Kosongkan field untuk kembali ke konten default.
        </p>
      </div>
    </div>
  );
};

export default WebsiteEditorAdmin;
