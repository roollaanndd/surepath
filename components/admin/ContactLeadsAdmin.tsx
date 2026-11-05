import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { listContactLeads, updateContactLead, type ContactLead } from '../../services/website';
import { useToast } from '../ui';

/**
 * v2.8.0 — Antrean contact leads di admin (temuan gap analysis: fitur ini
 * ada di portal operator tapi tidak ada di CMS admin). Backend-nya sudah
 * lama siap: list_contact_leads / update_contact_lead. Read + update status;
 * tidak ada delete — jejak prospek dipertahankan.
 */
const STATUS_TABS: { id: 'NEW' | 'CONTACTED' | 'CLOSED'; label: string; cls: string }[] = [
  { id: 'NEW', label: 'Baru', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { id: 'CONTACTED', label: 'Dihubungi', cls: 'bg-sky-500/10 text-sky-600 border-sky-500/30' },
  { id: 'CLOSED', label: 'Selesai', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
];

const ContactLeadsAdmin: React.FC = () => {
  const toast = useToast();
  const [status, setStatus] = useState<'NEW' | 'CONTACTED' | 'CLOSED'>('NEW');
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (s: 'NEW' | 'CONTACTED' | 'CLOSED') => {
    setLoading(true);
    setLeads(await listContactLeads(s));
    setLoading(false);
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  const advance = async (lead: ContactLead, next: 'NEW' | 'CONTACTED' | 'CLOSED') => {
    setBusyId(lead.id ?? null);
    const ok = await updateContactLead(lead.id!, next, lead.notes);
    setBusyId(null);
    if (!ok) { toast.error('Gagal memperbarui status prospek.'); return; }
    toast.success('Status prospek diperbarui.');
    load(status);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatus(tab.id)}
              className={`px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider border transition-colors ${
                status === tab.id ? tab.cls : 'bg-ds-card2 text-ds-ink3 border-ds-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(status)}
          className="inline-flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-ds-ink2 hover:text-ds-ink"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-ds-ink3 py-8 text-center">Memuat prospek…</p>
      ) : leads.length === 0 ? (
        <div className="py-12 text-center">
          <Inbox size={28} className="mx-auto text-ds-ink3/50 mb-2" />
          <p className="text-xs text-ds-ink3">Tidak ada prospek dengan status ini.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map(lead => (
            <div key={lead.id} className="rounded-xl border border-ds-border bg-ds-card p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black text-ds-ink">{lead.name}</p>
                  <p className="text-2xs text-ds-ink3 truncate">
                    {[lead.email, lead.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <span className="text-2xs text-ds-ink3 whitespace-nowrap">
                  {lead.created_at ? new Date(lead.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                </span>
              </div>
              {lead.message && (
                <p className="text-2xs text-ds-ink2 mt-2 whitespace-pre-wrap line-clamp-3">{lead.message}</p>
              )}
              {lead.source_path && (
                <p className="text-2xs text-ds-ink3 mt-1">Sumber: {lead.source_path}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {STATUS_TABS.filter(t => t.id !== (lead.status ?? status)).map(t => (
                  <button
                    key={t.id}
                    disabled={busyId === lead.id}
                    onClick={() => advance(lead, t.id)}
                    className="px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider border border-ds-border bg-ds-card2 text-ds-ink2 hover:bg-ds-card disabled:opacity-50"
                  >
                    → {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactLeadsAdmin;
