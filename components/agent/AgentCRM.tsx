import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Pencil, Trash2, RefreshCw,
  Phone, Mail, MapPin, FileText, ChevronRight, User, AlertCircle
} from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentClients, addClient, updateClient, deleteClient, getAgentPolicies,
  type SpClient, type SpPolicy
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agentId: string;
  lang: Language;
  onSelectClient?: (client: SpClient) => void;
}

type FilterStatus = 'ALL' | 'PROSPECT' | 'ACTIVE' | 'INACTIVE';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  PROSPECT: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  INACTIVE: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  ktp: '',
  address: '',
  occupation: '',
  status: 'PROSPECT' as SpClient['status'],
  notes: '',
};

const AgentCRM: React.FC<Props> = ({ agentId, lang, onSelectClient }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [clients, setClients] = useState<SpClient[]>([]);
  const [policies, setPolicies] = useState<SpPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  // Detail modal
  const [selectedClient, setSelectedClient] = useState<SpClient | null>(null);

  // Add/edit sheet
  const [showSheet, setShowSheet] = useState(false);
  const [editingClient, setEditingClient] = useState<SpClient | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SpClient | null>(null);

  const loadData = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        getAgentClients(agentId),
        getAgentPolicies(agentId),
      ]);
      setClients(c);
      setPolicies(p);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = clients.filter(c => {
    const matchFilter = filter === 'ALL' || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const clientPolicies = (clientId: string) => policies.filter(p => p.client_id === clientId);
  const clientPremiumTotal = (clientId: string) => clientPolicies(clientId).reduce((s, p) => s + p.premium, 0);

  const openAdd = () => {
    setEditingClient(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowSheet(true);
  };

  const openEdit = (client: SpClient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email ?? '',
      ktp: client.ktp ?? '',
      address: client.address ?? '',
      occupation: client.occupation ?? '',
      status: client.status,
      notes: client.notes ?? '',
    });
    setFormError('');
    setShowSheet(true);
    setSelectedClient(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError(t('Name is required.', 'Nama wajib diisi.')); return; }
    if (!form.phone.trim()) { setFormError(t('Phone is required.', 'No. HP wajib diisi.')); return; }
    setSubmitting(true);
    setFormError('');
    try {
      if (editingClient) {
        const updated = await updateClient(editingClient.id, form);
        if (updated) {
          setClients(prev => prev.map(c => c.id === editingClient.id ? updated : c));
        }
      } else {
        const created = await addClient({ ...form, agent_id: agentId });
        if (created) {
          setClients(prev => [created, ...prev]);
        }
      }
      setShowSheet(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteClient(deleteTarget.id);
    if (ok) {
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id));
      if (selectedClient?.id === deleteTarget.id) setSelectedClient(null);
    }
    setDeleteTarget(null);
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const avatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className="relative min-h-screen pb-32 font-sora">

      {/* Header */}
      <div className="px-4 pt-6 pb-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('Search clients…', 'Cari klien…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#16a34a]/40 shadow-lg"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {(['ALL', 'PROSPECT', 'ACTIVE', 'INACTIVE'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg'
                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400'
              }`}
            >
              {f === 'ALL' ? t('All', 'Semua') : f}
            </button>
          ))}
        </div>

        {/* Count + Refresh */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-xs font-bold">
            {filtered.length} {t('clients', 'klien')}
          </p>
          <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#16a34a] transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
            {t('Refresh', 'Perbarui')}
          </button>
        </div>
      </div>

      {/* Client List */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 p-4 animate-pulse h-20" />
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 p-8 text-center shadow-lg">
            <User size={40} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="font-black text-slate-400">{t('No clients found', 'Klien tidak ditemukan')}</p>
            <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">{t('Try adjusting your search or add a new client.', 'Coba ubah pencarian atau tambah klien baru.')}</p>
          </div>
        ) : (
          filtered.map(client => {
            const pols = clientPolicies(client.id);
            const total = clientPremiumTotal(client.id);
            return (
              <div
                key={client.id}
                onClick={() => { setSelectedClient(client); onSelectClient?.(client); }}
                className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-lg p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:border-[#16a34a]/30"
              >
                <div className={`w-11 h-11 rounded-2xl ${avatarColor(client.name)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-black text-sm">{initials(client.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm truncate">{client.name}</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[client.status]}`}>
                      {client.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{client.phone}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400 font-bold">{pols.length} {t('pols', 'polis')}</span>
                    {total > 0 && <span className="text-[10px] text-emerald-500 font-bold">{formatIDR(total)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => openEdit(client, e)}
                    className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center hover:bg-[#16a34a]/10 transition-colors"
                  >
                    <Pencil size={13} className="text-slate-400" />
                  </button>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-full shadow-[0_8px_30px_rgba(22,163,74,0.5)] flex items-center justify-center z-30 active:scale-95 motion-reduce:active:scale-100 hover:brightness-105 transition-all"
      >
        <Plus size={24} className="text-white" strokeWidth={3} />
      </button>

      {/* ─── Client Detail Modal ─── */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedClient(null)} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2rem] max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl ${avatarColor(selectedClient.name)} flex items-center justify-center`}>
                    <span className="text-white font-black text-lg">{initials(selectedClient.name)}</span>
                  </div>
                  <div>
                    <h2 className="font-black text-xl tracking-tight">{selectedClient.name}</h2>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusColors[selectedClient.status]}`}>
                      {selectedClient.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              {/* Info */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-3">
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-slate-400" />
                    <span className="font-medium">{selectedClient.phone}</span>
                  </div>
                )}
                {selectedClient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-slate-400" />
                    <span className="font-medium">{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="font-medium">{selectedClient.address}</span>
                  </div>
                )}
                {selectedClient.occupation && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-slate-400" />
                    <span className="font-medium">{selectedClient.occupation}</span>
                  </div>
                )}
                {selectedClient.notes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">{t('Notes', 'Catatan')}</p>
                    <p className="text-sm">{selectedClient.notes}</p>
                  </div>
                )}
              </div>

              {/* Policies */}
              <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">
                  {t('Policies', 'Polis')} ({clientPolicies(selectedClient.id).length})
                </p>
                {clientPolicies(selectedClient.id).length === 0 ? (
                  <p className="text-slate-300 dark:text-slate-600 text-sm font-medium py-2">
                    {t('No policies yet.', 'Belum ada polis.')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clientPolicies(selectedClient.id).map(pol => (
                      <div key={pol.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3">
                        <div>
                          <p className="font-bold text-sm">{pol.policy_number ?? pol.type}</p>
                          <p className="text-xs text-slate-400">{pol.type} · {pol.status}</p>
                        </div>
                        <p className="font-black text-sm text-emerald-500">{formatIDR(pol.premium)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={(e) => openEdit(selectedClient, e)}
                  className="py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Pencil size={14} />
                  {t('Edit', 'Edit')}
                </button>
                <button
                  onClick={() => { setDeleteTarget(selectedClient); setSelectedClient(null); }}
                  className="py-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Trash2 size={14} />
                  {t('Delete', 'Hapus')}
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#16a34a]/5 rounded-2xl border border-[#16a34a]/20">
                <FileText size={14} className="text-[#16a34a] flex-shrink-0" />
                <p className="text-xs text-[#16a34a] font-bold">
                  {t('Go to Quotes tab to create a new quote or policy for this client.', 'Buka tab Penawaran untuk membuat penawaran atau polis baru untuk klien ini.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add / Edit Sheet ─── */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSheet(false)} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2rem] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
            </div>
            <div className="px-5 pb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-xl tracking-tight">
                  {editingClient ? t('Edit Client', 'Edit Klien') : t('Add Client', 'Tambah Klien')}
                </h2>
                <button onClick={() => setShowSheet(false)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl px-4 py-3 text-sm font-bold">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              <div className="space-y-3">
                {[
                  { key: 'name', label: t('Full Name *', 'Nama Lengkap *'), type: 'text', required: true },
                  { key: 'phone', label: t('Phone *', 'No. HP *'), type: 'tel', required: true },
                  { key: 'email', label: t('Email', 'Email'), type: 'email', required: false },
                  { key: 'ktp', label: t('KTP Number', 'No. KTP'), type: 'text', required: false },
                  { key: 'address', label: t('Address', 'Alamat'), type: 'text', required: false },
                  { key: 'occupation', label: t('Occupation', 'Pekerjaan'), type: 'text', required: false },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#16a34a]/40"
                    />
                  </div>
                ))}

                {/* Status */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    {t('Status', 'Status')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PROSPECT', 'ACTIVE'] as SpClient['status'][]).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                          form.status === s
                            ? s === 'ACTIVE'
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                              : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    {t('Notes', 'Catatan')}
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#16a34a]/40 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                {submitting
                  ? t('Saving…', 'Menyimpan…')
                  : editingClient
                    ? t('Save Changes', 'Simpan Perubahan')
                    : t('Add Client', 'Tambah Klien')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl w-full max-w-sm">
            <h3 className="font-black text-lg tracking-tight mb-2">{t('Delete Client?', 'Hapus Klien?')}</h3>
            <p className="text-slate-500 text-sm mb-5">
              {t(`Are you sure you want to delete ${deleteTarget.name}? This cannot be undone.`, `Yakin ingin menghapus ${deleteTarget.name}? Tindakan ini tidak bisa dibatalkan.`)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase tracking-widest"
              >
                {t('Cancel', 'Batal')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/30"
              >
                {t('Delete', 'Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentCRM;
