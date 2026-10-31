// OperatorContactLeads.tsx — antrean prospek dari formulir kontak situs publik.
//
// Formulir di `/contact` sebelumnya tidak mengirim apa pun. Kini isinya
// masuk ke sini lewat aksi gateway `submit_contact_lead`. Lihat
// `supabase/functions/data-gateway/actions/contactLeads.ts` dan migrasi
// 20261031100000_contact_leads.sql.
import React, { useEffect, useState, useCallback } from 'react';
import { X, Mail, Phone, MessageSquare, Check, Clock } from 'lucide-react';
import {
  listContactLeads,
  updateContactLead,
  type ContactLead,
} from '../../services/supabaseService';
import { useToast } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FILTERS: Array<{ id: 'NEW' | 'CONTACTED' | 'CLOSED' | 'ALL'; label: string }> = [
  { id: 'NEW',       label: 'Baru' },
  { id: 'CONTACTED', label: 'Diproses' },
  { id: 'CLOSED',    label: 'Selesai' },
  { id: 'ALL',       label: 'Semua' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const OperatorContactLeads: React.FC<Props> = ({ open, onClose }) => {
  const toast = useToast();
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'NEW' | 'CONTACTED' | 'CLOSED' | 'ALL'>('NEW');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listContactLeads(filter === 'ALL' ? undefined : filter);
    setLeads(rows);
    setLoading(false);
  }, [filter]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const transition = async (id: string, status: 'CONTACTED' | 'CLOSED') => {
    setBusyId(id);
    const ok = await updateContactLead(id, status);
    setBusyId(null);
    if (!ok) { toast.error('Gagal menyimpan status prospek'); return; }
    toast.success(status === 'CONTACTED' ? 'Prospek ditandai diproses' : 'Prospek selesai');
    load();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="w-full sm:max-w-2xl bg-ds-card rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ds-border">
          <div>
            <h2 className="text-base font-black text-ds-ink">Prospek dari Situs</h2>
            <p className="text-2xs text-ds-ink3 mt-0.5">Formulir kontak myinsurepath.com</p>
          </div>
          <button onClick={onClose} aria-label="Tutup"
            className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center active:scale-95">
            <X size={16} className="text-ds-ink2" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-ds-border">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                filter === f.id ? 'bg-ds-green text-white' : 'bg-ds-card2 text-ds-ink2'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading && <p className="text-sm text-ds-ink3 text-center py-8">Memuat…</p>}
          {!loading && leads.length === 0 && (
            <p className="text-sm text-ds-ink3 text-center py-8">
              Tidak ada prospek untuk filter ini.
            </p>
          )}
          {!loading && leads.map(l => (
            <article key={l.id}
              className="p-4 rounded-2xl border border-ds-border bg-ds-card2">
              <header className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-ds-ink truncate">{l.name}</p>
                  <p className="text-2xs text-ds-ink3 mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {formatDate(l.created_at)}
                  </p>
                </div>
                <span className={`text-2xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                  l.status === 'NEW' ? 'bg-ds-amber/15 text-ds-amber' :
                  l.status === 'CONTACTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                  'bg-ds-card3 text-ds-ink3'
                }`}>
                  {l.status === 'NEW' ? 'BARU' : l.status === 'CONTACTED' ? 'DIPROSES' : 'SELESAI'}
                </span>
              </header>

              <div className="space-y-1.5 mb-3">
                {l.email && (
                  <a href={`mailto:${l.email}`} className="flex items-center gap-2 text-xs text-ds-ink2 hover:underline">
                    <Mail size={12} className="text-ds-green shrink-0" />
                    <span className="truncate">{l.email}</span>
                  </a>
                )}
                {l.phone && (
                  <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-ds-ink2 hover:underline">
                    <Phone size={12} className="text-ds-green shrink-0" />
                    <span className="truncate">{l.phone}</span>
                  </a>
                )}
                {l.source_path && (
                  <p className="text-2xs text-ds-ink3">
                    Dari halaman <code className="px-1 rounded bg-ds-card3">{l.source_path}</code>
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-ds-card">
                <MessageSquare size={14} className="text-ds-ink3 shrink-0 mt-0.5" />
                <p className="text-sm text-ds-ink whitespace-pre-wrap break-words">{l.message}</p>
              </div>

              {l.status !== 'CLOSED' && (
                <div className="flex gap-2 mt-3">
                  {l.status === 'NEW' && (
                    <button onClick={() => transition(l.id, 'CONTACTED')} disabled={busyId === l.id}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white active:scale-95 disabled:opacity-60">
                      Tandai Diproses
                    </button>
                  )}
                  <button onClick={() => transition(l.id, 'CLOSED')} disabled={busyId === l.id}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1">
                    <Check size={12} /> Selesai
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperatorContactLeads;
