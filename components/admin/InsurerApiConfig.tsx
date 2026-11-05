import React, { useState, useEffect, useCallback } from 'react';
import { Plug, Save, Loader2, ShieldCheck } from 'lucide-react';
import { callGateway } from '../../services/supabaseService';
import { useToast } from '../ui';

interface ApiConfig {
  endpoint_url: string | null;
  api_key: string | null;
  webhook_secret: string | null;
  is_active: boolean | null;
}

/**
 * v2.8.0 — UI untuk backend yang sejak v1.23.0 sudah jadi tapi tidak pernah
 * punya antarmuka (temuan audit): admin_get_insurer_api_config /
 * admin_save_insurer_api_config pada sp_insurer_api_configs. Kunci disimpan
 * server-side dan tidak pernah ditampilkan kembali — kolomnya write-only.
 */
const InsurerApiConfig: React.FC<{ insurerId: string }> = ({ insurerId }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await callGateway('admin_get_insurer_api_config', { insurer_id: insurerId });
    const cfg = (data?.data ?? null) as ApiConfig | null;
    setEndpointUrl(cfg?.endpoint_url ?? '');
    // api_key / webhook_secret tidak di-pre-fill: server mengembalikan apa yang
    // ada, tapi menampilkannya di layar admin justru kebocoran. Kosong = tidak
    // diubah (backend upsert menyimpan yang dikirim; lihat catatan di bawah).
    setApiKey('');
    setWebhookSecret('');
    setIsActive(cfg?.is_active !== false);
    setLoading(false);
  }, [insurerId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!endpointUrl.trim()) { toast.error('Endpoint URL wajib diisi.'); return; }
    setSaving(true);
    const { error } = await callGateway('admin_save_insurer_api_config', {
      insurer_id: insurerId,
      endpoint_url: endpointUrl.trim(),
      api_key: apiKey.trim() || undefined,
      webhook_secret: webhookSecret.trim() || undefined,
      is_active: isActive,
    });
    setSaving(false);
    if (error) { toast.error(`Gagal menyimpan: ${error}`); return; }
    toast.success('Konfigurasi API insurer tersimpan.');
    setApiKey('');
    setWebhookSecret('');
  };

  if (loading) {
    return <p className="text-xs text-ds-ink3 py-3 text-center flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Memuat konfigurasi API…</p>;
  }

  const inputCls = 'w-full px-3 py-2 text-xs rounded-lg bg-ds-card2 border border-ds-border text-ds-ink placeholder-ds-ink3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

  return (
    <div className="mt-5 rounded-xl border border-ds-border bg-ds-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Plug size={13} className="text-emerald-500" />
        <h4 className="text-xs font-black uppercase tracking-widest text-ds-ink2">Integrasi API Insurer</h4>
      </div>
      <p className="text-2xs text-ds-ink3 mb-3">
        Endpoint &amp; kunci untuk integrasi API langsung dengan insurer ini (guard SSRF aktif di server —
        localhost/IP privat ditolak). Kosongkan kolom kunci bila tidak ingin mengubahnya.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">Endpoint URL *</span>
          <input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder="https://api.insurer.example.com/v1/quotes" className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">API Key (write-only)</span>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">Webhook Secret (write-only)</span>
          <input type="password" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={`${inputCls} mt-1`} />
        </label>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={() => setIsActive(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider border ${isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-ds-card2 text-ds-ink3 border-ds-border'}`}
        >
          <ShieldCheck size={12} /> {isActive ? 'Aktif' : 'Nonaktif'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider bg-ds-green text-ds-on-green disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Simpan
        </button>
      </div>
    </div>
  );
};

export default InsurerApiConfig;
