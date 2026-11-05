// TncAdmin.tsx — versioned Terms & Conditions editor.
//
// Agent agreements (sp_agent_agreements, actions/users.ts accept_agreement)
// used to carry a hardcoded doc_version — there was nowhere to even see,
// let alone edit, the actual text a mitra agrees to. This gives admin a
// draft/publish workflow: edit freely, "Terbitkan" is the one action that
// makes a version the one new signups must agree to (and sets published_at/
// published_by for the audit trail) — separate from Save so an edit-in-
// progress never accidentally becomes live.
import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Save, CheckCircle2, Trash2, Copy, Rocket } from 'lucide-react';
import {
  adminListTncDocuments, adminSaveTncDocument, adminPublishTncDocument, adminDeleteTncDocument,
  type SpTncDocument,
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

const emptyDraft = (): Omit<SpTncDocument, 'id' | 'created_at' | 'updated_at' | 'published_at' | 'published_by'> => ({
  doc_version: '',
  title: 'Syarat & Ketentuan Mitra Agen SurePath',
  content: '',
  is_active: false,
});

const TncAdmin: React.FC = () => {
  const confirm = useConfirmDialog();
  const toastUi = useToast();
  const [docs, setDocs] = useState<SpTncDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SpTncDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminListTncDocuments();
    setDocs(data);
    const keep = data.find(d => d.id === selectedId) ?? data.find(d => d.is_active) ?? data[0] ?? null;
    setSelectedId(keep?.id ?? null);
    setForm(keep ? { ...keep } : null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const selectDoc = (id: string) => {
    setSelectedId(id);
    const d = docs.find(x => x.id === id);
    setForm(d ? { ...d } : null);
  };

  const handleSave = async () => {
    if (!form || !form.doc_version.trim()) { toastUi.error('Nomor versi wajib diisi.'); return; }
    setSaving(true);
    const result = await adminSaveTncDocument({ id: form.id, doc_version: form.doc_version, title: form.title, content: form.content });
    setSaving(false);
    if (result) { flash('Tersimpan (draft).'); load(); } else { toastUi.error('Gagal menyimpan.'); }
  };

  const handlePublish = async () => {
    if (!form || form.is_active) return;
    const ok = await confirm({
      title: 'Terbitkan Versi Ini?',
      description: `Mulai sekarang, mitra baru harus menyetujui versi "${form.doc_version}". Mitra yang sudah menyetujui versi sebelumnya TIDAK diminta menyetujui ulang secara otomatis.`,
      confirmLabel: 'Terbitkan',
      cancelLabel: 'Batal',
    });
    if (!ok) return;
    const result = await adminPublishTncDocument(form.id);
    if (result) { toastUi.success('Diterbitkan — versi ini sekarang aktif.'); load(); } else { toastUi.error('Gagal menerbitkan.'); }
  };

  const handleDuplicate = async () => {
    if (!form) return;
    const result = await adminSaveTncDocument({ doc_version: `${form.doc_version}-draft`, title: form.title, content: form.content });
    if (result) { flash('Draft baru dibuat.'); load(); } else { toastUi.error('Gagal membuat draft.'); }
  };

  const handleDelete = async () => {
    if (!form || form.is_active) return;
    const ok = await confirm({ title: 'Hapus Versi?', description: `Versi "${form.doc_version}" akan dihapus permanen.`, confirmLabel: 'Hapus', cancelLabel: 'Batal' });
    if (!ok) return;
    const deleted = await adminDeleteTncDocument(form.id);
    if (deleted) { toastUi.success('Dihapus.'); setSelectedId(null); load(); } else { toastUi.error('Gagal menghapus.'); }
  };

  const handleNewBlank = async () => {
    const draft = emptyDraft();
    draft.doc_version = `v-draft-${new Date().toISOString().slice(0, 10)}`;
    const result = await adminSaveTncDocument(draft as any);
    if (result) { flash('Draft baru dibuat.'); load(); } else { toastUi.error('Gagal membuat draft.'); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-ds-ink flex items-center gap-2">
            <ModuleIcon id="documents" size={32} /> Syarat &amp; Ketentuan Mitra
          </h2>
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mt-1">
            {docs.length} versi tersimpan · dibaca saat mitra menyetujui perjanjian (AgentAgreementGate)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 hover:text-ds-ink transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleNewBlank} className={secondaryBtn}>+ Versi Baru</button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg">
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {docs.map(d => (
          <button
            key={d.id}
            onClick={() => selectDoc(d.id)}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
              d.id === selectedId ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-ds-card2 text-ds-ink3 border-ds-border hover:bg-ds-card2'
            }`}
          >
            {d.doc_version} {d.is_active && '· AKTIF'}
          </button>
        ))}
      </div>

      {!form ? (
        <div className="text-center py-20 text-ds-ink3 text-sm font-bold">Belum ada dokumen. Klik "+ Versi Baru".</div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleSave} disabled={saving} className={primaryBtn}>
              <span className="flex items-center gap-1.5"><Save size={13} /> Simpan Draft</span>
            </button>
            {!form.is_active && (
              <button onClick={handlePublish} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5">
                <Rocket size={13} /> Terbitkan
              </button>
            )}
            <button onClick={handleDuplicate} className={secondaryBtn}>
              <span className="flex items-center gap-1.5"><Copy size={13} /> Duplikat sebagai Draft</span>
            </button>
            {!form.is_active && (
              <button onClick={handleDelete} className="text-rose-700 dark:text-rose-300 hover:text-rose-300 text-xs font-black uppercase tracking-widest px-4 py-2.5 flex items-center gap-1.5">
                <Trash2 size={13} /> Hapus
              </button>
            )}
          </div>

          {form.is_active && (
            <p className="text-2xs text-emerald-700 dark:text-emerald-400 font-bold">
              Versi aktif — diterbitkan {form.published_at ? new Date(form.published_at).toLocaleString('id-ID') : '—'}.
            </p>
          )}

          <div className="bg-ds-card2 border border-ds-border rounded-2xl p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <SectionLabel>Nomor Versi</SectionLabel>
                <input className={inputCls} value={form.doc_version} onChange={e => setForm(f => f && { ...f, doc_version: e.target.value })} disabled={form.is_active} />
              </div>
              <div>
                <SectionLabel>Judul</SectionLabel>
                <input className={inputCls} value={form.title} onChange={e => setForm(f => f && { ...f, title: e.target.value })} />
              </div>
            </div>
            <div>
              <SectionLabel>Isi (Markdown/teks biasa)</SectionLabel>
              <textarea
                className={`${inputCls} min-h-[420px] font-mono text-xs leading-relaxed`}
                value={form.content}
                onChange={e => setForm(f => f && { ...f, content: e.target.value })}
                placeholder="Tulis isi Syarat &amp; Ketentuan di sini…"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TncAdmin;
