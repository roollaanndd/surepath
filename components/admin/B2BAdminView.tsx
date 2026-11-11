import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, AlertTriangle, FileText, Heart, Upload, Loader2, Building2, Copy, KeyRound } from 'lucide-react';
import {
  getAllB2BSubmissions,
  updateB2BSubmissionStatus,
  createB2BQuote,
  getAllLifeApplications,
  updateLifeApplicationStatus,
  adminGetAllB2BBulkBatches,
  adminIssueB2BBulkBatch,
  adminAssignB2BBulkInsurer,
  uploadB2BBulkMasterPolicy,
  adminListB2BUsers,
  setMitraTempPassword,
  supabase,
  type SpB2BSubmission,
  type SpB2BQuote,
  type SpLifeApplication,
  type SpB2BBatch,
  type SpB2BUser,
} from '../../services/supabaseService';
import ModuleIcon from '../shared/ModuleIcon';
import { useConfirmDialog } from '../ui';
import AddUserWizard, { type WizardCredential } from './AddUserWizard';

interface InsurerOption { id: string; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Badge maps ───────────────────────────────────────────────────────────────

const B2B_STATUS_CLS: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REVIEWING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  QUOTED:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ACCEPTED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const LIFE_STATUS_CLS: Record<string, string> = {
  SUBMITTED:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UNDERWRITING:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DECLINED:    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  ISSUED:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DRAFT:       'bg-ds-card2 text-ds-ink2 dark:bg-slate-800 dark:text-ds-ink3',
};

const PRODUCT_TYPE_CLS: Record<string, string> = {
  FLEET_MV:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BONDING:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  GROUP_HEALTH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const B2B_STATUSES = ['SUBMITTED', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'REJECTED'];
const LIFE_STATUSES = ['SUBMITTED', 'UNDERWRITING', 'APPROVED', 'DECLINED', 'ISSUED'];

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ msg: string; onDone: () => void }> = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-2xl shadow-xl text-sm font-semibold animate-fade-in">
      <CheckCircle2 size={16} /> {msg}
    </div>
  );
};

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2 rounded-xl border border-ds-border dark:border-ds-border bg-white dark:bg-ds-card2 text-ds-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
const TEXTAREA = INPUT + ' resize-none';

const Badge: React.FC<{ cls: string; label: string }> = ({ cls, label }) => (
  <span className={`text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
);

// ─── B2B Quote Form ───────────────────────────────────────────────────────────

interface QuoteFormProps {
  submissionId: string;
  clientId: string;
  onSaved: () => void;
  onClose: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ submissionId, clientId, onSaved, onClose }) => {
  const [insurerName, setInsurerName] = useState('');
  const [premiumAmount, setPremiumAmount] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [terms, setTerms] = useState('');
  const [rows, setRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const addRow = () => { if (rows.length < 10) setRows(r => [...r, { key: '', value: '' }]); };
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'key' | 'value', val: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const save = async () => {
    if (!insurerName || !premiumAmount || !validUntil) { setErr('Insurer, premium, and valid-until are required.'); return; }
    setSaving(true);
    const coverageDetails: Record<string, string> = {};
    rows.filter(r => r.key.trim()).forEach(r => { coverageDetails[r.key.trim()] = r.value; });
    const quoteData: Omit<SpB2BQuote, 'id' | 'created_at' | 'updated_at'> = {
      submission_id: submissionId,
      client_id: clientId,
      insurer_name: insurerName,
      premium_amount: premiumAmount,
      coverage_details: coverageDetails,
      valid_until: validUntil,
      terms,
      status: 'PENDING',
    };
    const ok = await createB2BQuote(quoteData);
    if (ok) {
      await updateB2BSubmissionStatus(submissionId, 'QUOTED');
      onSaved();
    } else {
      setErr('Failed to save quote. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="mt-3 p-4 bg-slate-50 dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-ds-ink dark:text-white">Add Quote</p>
        <button onClick={onClose} className="text-ds-ink3 hover:text-ds-ink2"><ChevronUp size={16} /></button>
      </div>
      {err && <p className="text-xs text-rose-700 dark:text-rose-200 flex items-center gap-1"><AlertTriangle size={12} />{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-ds-ink3 mb-1">Insurer Name</label>
          <input value={insurerName} onChange={e => setInsurerName(e.target.value)} className={INPUT} placeholder="e.g. Prudential" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ds-ink3 mb-1">Premium (IDR)</label>
          <input type="number" value={premiumAmount} onChange={e => setPremiumAmount(Number(e.target.value))} className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ds-ink3 mb-1">Valid Until</label>
          <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={INPUT} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-ds-ink3">Coverage Details</label>
          <button onClick={addRow} className="text-xs text-ds-green font-semibold flex items-center gap-1"><Plus size={12} />Add Row</button>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={row.key} onChange={e => updateRow(i, 'key', e.target.value)} placeholder="Key" className={INPUT + ' flex-1'} />
              <input value={row.value} onChange={e => updateRow(i, 'value', e.target.value)} placeholder="Value" className={INPUT + ' flex-1'} />
              {rows.length > 1 && <button onClick={() => removeRow(i)}><Trash2 size={14} className="text-rose-700 dark:text-rose-300" /></button>}
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ds-ink3 mb-1">Terms</label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className={TEXTAREA} />
      </div>
      <button
        onClick={save} disabled={saving}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Save Quote
      </button>
    </div>
  );
};

// ─── B2B Submission Card ──────────────────────────────────────────────────────

const B2BCard: React.FC<{ sub: SpB2BSubmission; onUpdated: () => void; onToast: (m: string) => void }> = ({ sub, onUpdated, onToast }) => {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [status, setStatus] = useState(sub.status);
  const [notes, setNotes] = useState(sub.admin_notes ?? '');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const changeStatus = async (s: string) => {
    setStatus(s as SpB2BSubmission['status']);
    setUpdatingStatus(true);
    await updateB2BSubmissionStatus(sub.id, s);
    setUpdatingStatus(false);
    onToast('Status updated');
    onUpdated();
  };

  const saveNotes = async () => {
    await updateB2BSubmissionStatus(sub.id, status, notes);
    onToast('Notes saved');
  };

  const docs: { doc_type?: string; filename?: string }[] = (sub.submission_data?.documents as unknown[])?.map?.(d => d as { doc_type?: string; filename?: string }) ?? [];

  return (
    <div className="p-4 bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge cls={PRODUCT_TYPE_CLS[sub.product_type] ?? ''} label={sub.product_type} />
            <Badge cls={B2B_STATUS_CLS[status] ?? ''} label={status} />
          </div>
          <p className="font-bold text-ds-ink dark:text-white text-sm">{sub.company_name}</p>
          <p className="text-xs text-ds-ink3">{sub.pic_name} · {sub.pic_phone}</p>
          <p className="text-xs text-ds-ink3">{fmtDate(sub.created_at)}</p>
        </div>
        {updatingStatus && <RefreshCw size={14} className="text-ds-ink3 animate-spin flex-shrink-0 mt-1" />}
      </div>

      {/* Status Dropdown */}
      <div>
        <label className="block text-2xs font-semibold text-ds-ink3 uppercase mb-1">Change Status</label>
        <div className="relative">
          <select
            value={status}
            onChange={e => changeStatus(e.target.value)}
            className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-ds-border dark:border-ds-border bg-white dark:bg-ds-card2 text-ds-ink dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {B2B_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-ink3 pointer-events-none" />
        </div>
      </div>

      {/* Admin Notes */}
      <div>
        <label className="block text-2xs font-semibold text-ds-ink3 uppercase mb-1">Admin Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={2}
          className={TEXTAREA}
          placeholder="Internal notes…"
        />
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div>
          <p className="text-2xs font-semibold text-ds-ink3 uppercase mb-1">Documents</p>
          <div className="flex flex-wrap gap-1.5">
            {docs.map((d, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-ds-card2 dark:bg-ds-card2 rounded-lg text-ds-ink2 dark:text-ds-ink2">
                <FileText size={10} />{d.doc_type ?? 'doc'}: {d.filename ?? '—'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Quote Button */}
      <button
        onClick={() => setShowQuoteForm(v => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-ds-green hover:underline"
      >
        {showQuoteForm ? <ChevronUp size={14} /> : <Plus size={14} />}
        {showQuoteForm ? 'Close Quote Form' : 'Add Quote'}
      </button>

      {showQuoteForm && (
        <QuoteForm
          submissionId={sub.id}
          clientId={sub.client_id}
          onSaved={() => { setShowQuoteForm(false); onToast('Quote saved — status set to QUOTED'); onUpdated(); }}
          onClose={() => setShowQuoteForm(false)}
        />
      )}
    </div>
  );
};

// ─── Life Application Card ────────────────────────────────────────────────────

const LifeCard: React.FC<{ app: SpLifeApplication; onUpdated: () => void; onToast: (m: string) => void }> = ({ app, onUpdated, onToast }) => {
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.insurer_notes ?? '');
  const [policyNumber, setPolicyNumber] = useState(app.policy_number ?? '');
  const [saving, setSaving] = useState(false);

  const age = (() => {
    if (!app.client_dob) return '?';
    const today = new Date();
    const birth = new Date(app.client_dob);
    return today.getFullYear() - birth.getFullYear();
  })();

  const yesAnswers = Object.entries(app.health_declaration).filter(([, v]) => v).map(([k]) => Number(k));
  const showPolicyNumber = status === 'APPROVED' || status === 'ISSUED';

  const handleUpdate = async () => {
    setSaving(true);
    const ok = await updateLifeApplicationStatus(app.id, status, notes, showPolicyNumber ? policyNumber : undefined);
    setSaving(false);
    if (ok) { onToast('Application updated'); onUpdated(); }
  };

  return (
    <div className="p-4 bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:text-orange-300 dark:bg-orange-900/30 dark:text-orange-400 font-mono">{app.order_number}</span>
            <Badge cls={LIFE_STATUS_CLS[status] ?? ''} label={status} />
          </div>
          <p className="font-bold text-ds-ink dark:text-white text-sm">{app.client_name}</p>
          <p className="text-xs text-ds-ink3">{age} yo · {app.client_gender === 'M' ? 'Male' : 'Female'} · {app.smoker ? 'Smoker' : 'Non-smoker'}</p>
          <p className="text-xs text-ds-ink3">{app.product_code.replace('_', ' ')} · UP {fmtIDR(app.sum_assured)}</p>
          <p className="text-xs text-ds-ink3">Indicative premium/yr: {fmtIDR(app.indicative_premium)}</p>
        </div>
        <Heart size={16} className="text-rose-700 dark:text-rose-300 flex-shrink-0 mt-1" />
      </div>

      {/* Riders */}
      {app.riders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.riders.map(r => (
            <span key={r} className="text-2xs px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300 dark:text-orange-400 rounded-full font-semibold">{r.replace('_', ' ')}</span>
          ))}
        </div>
      )}

      {/* Health — Yes answers highlighted */}
      {yesAnswers.length > 0 && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
          <p className="text-2xs font-semibold text-ds-amber uppercase mb-1 flex items-center gap-1"><AlertTriangle size={10} />Health Flags</p>
          {yesAnswers.map(qi => (
            <p key={qi} className="text-xs text-amber-700 dark:text-amber-400">Q{qi + 1}: Yes</p>
          ))}
        </div>
      )}

      {/* Beneficiary */}
      <div className="text-xs text-ds-ink3">
        Beneficiary: <span className="font-semibold text-ds-ink2 dark:text-ds-ink2">{app.beneficiary_name}</span> ({app.beneficiary_relation}, {app.beneficiary_percentage}%)
      </div>

      {/* Status Update */}
      <div>
        <label className="block text-2xs font-semibold text-ds-ink3 uppercase mb-1">Change Status</label>
        <div className="relative">
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-ds-border dark:border-ds-border bg-white dark:bg-ds-card2 text-ds-ink dark:text-white text-xs font-semibold focus:outline-none"
          >
            {LIFE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-ink3 pointer-events-none" />
        </div>
      </div>

      {/* Policy Number */}
      {showPolicyNumber && (
        <div>
          <label className="block text-2xs font-semibold text-ds-ink3 uppercase mb-1">Policy Number</label>
          <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className={INPUT} placeholder="e.g. PRU-LIFE-2026-XXXXX" />
        </div>
      )}

      {/* Insurer Notes */}
      <div>
        <label className="block text-2xs font-semibold text-ds-ink3 uppercase mb-1">Insurer Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={TEXTAREA} placeholder="Underwriting notes…" />
      </div>

      <button
        onClick={handleUpdate} disabled={saving}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Update
      </button>
    </div>
  );
};

// ─── Bulk Batch Card ──────────────────────────────────────────────────────────

const BULK_STATUS_CLS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-ds-ink3',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INVOICED:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAID:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ISSUED:    'bg-emerald-500 text-white',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const fmtIDRBulk = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const BulkBatchCard: React.FC<{ batch: SpB2BBatch; insurers: InsurerOption[]; onUpdated: () => void; onToast: (m: string) => void }> = ({ batch, insurers, onUpdated, onToast }) => {
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [policyNumber, setPolicyNumber] = useState(batch.master_policy_number ?? '');
  const [insurerName, setInsurerName] = useState(batch.insurer_name ?? '');
  const [docUrl, setDocUrl] = useState(batch.master_policy_document_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigningInsurer, setAssigningInsurer] = useState(false);
  const [err, setErr] = useState('');

  const handleAssignInsurer = async (insurerId: string) => {
    if (!insurerId) return;
    setAssigningInsurer(true);
    const result = await adminAssignB2BBulkInsurer(batch.id, insurerId);
    setAssigningInsurer(false);
    if (result) { onToast('Insurer ditugaskan — batch kini terlihat di dashboard mereka.'); onUpdated(); }
    else onToast('Gagal menugaskan insurer.');
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadB2BBulkMasterPolicy(batch.id, file);
    setUploading(false);
    if (url) setDocUrl(url);
    else setErr('Gagal mengunggah dokumen polis.');
  };

  const handleIssue = async () => {
    if (!policyNumber.trim() || !docUrl.trim()) { setErr('Nomor polis dan dokumen polis wajib diisi.'); return; }
    setSaving(true);
    const result = await adminIssueB2BBulkBatch({ batchId: batch.id, masterPolicyNumber: policyNumber.trim(), masterPolicyPath: docUrl.trim(), insurerName: insurerName.trim() || undefined });
    setSaving(false);
    if (result) { onToast('Polis batch diterbitkan'); setShowIssueForm(false); onUpdated(); }
    else setErr('Gagal menerbitkan polis. Coba unggah ulang dokumennya.');
  };

  return (
    <div className="p-4 bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-2xs font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-ds-ink2">{batch.batch_number}</span>
            <Badge cls={BULK_STATUS_CLS[batch.status] ?? ''} label={batch.status} />
          </div>
          <p className="font-bold text-ds-ink dark:text-white text-sm">{batch.company_name}</p>
          <p className="text-xs text-ds-ink3">{batch.item_count} unit · {fmtIDRBulk(batch.total_amount)}</p>
          <p className="text-xs text-ds-ink3">{fmtDate(batch.created_at)}</p>
        </div>
      </div>

      {/* Insurer assignment — needed before the insurer's own token-authed
          dashboard can show this batch at all (insurer_list_bulk_batches
          filters by sp_b2b_batches.insurer_id). Available at any status so
          admin can assign early and let the insurer start preparing. */}
      {batch.status !== 'CANCELLED' && batch.status !== 'ISSUED' && (
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-ds-ink3 flex-shrink-0" />
          <select
            value={batch.insurer_id ?? ''}
            disabled={assigningInsurer}
            onChange={e => handleAssignInsurer(e.target.value)}
            className="flex-1 bg-ds-card2 border border-ds-border rounded-lg px-2.5 py-1.5 text-2xs font-bold text-ds-ink focus:outline-none focus:border-emerald-500/50 [&>option]:bg-ds-card"
          >
            <option value="">— Belum ditugaskan ke insurer —</option>
            {insurers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {assigningInsurer && <Loader2 size={12} className="animate-spin text-ds-ink3" />}
        </div>
      )}

      {batch.status === 'ISSUED' && (
        <div className="text-xs text-ds-green dark:text-emerald-400 font-semibold">
          Polis: {batch.master_policy_number} {batch.insurer_name ? `· ${batch.insurer_name}` : ''}
        </div>
      )}

      {(batch.status === 'PAID' || batch.status === 'ISSUED') && (
        <button
          onClick={() => setShowIssueForm(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-ds-green hover:underline"
        >
          {showIssueForm ? <ChevronUp size={14} /> : <Plus size={14} />}
          {batch.status === 'ISSUED' ? 'Perbarui Polis' : 'Terbitkan Polis'}
        </button>
      )}

      {showIssueForm && (
        <div className="mt-1 p-4 bg-slate-50 dark:bg-ds-card2 border border-ds-border dark:border-ds-border rounded-2xl space-y-3">
          {err && <p className="text-xs text-rose-700 dark:text-rose-200 flex items-center gap-1"><AlertTriangle size={12} />{err}</p>}
          <div>
            <label className="block text-xs font-semibold text-ds-ink3 mb-1">Nomor Polis Induk</label>
            <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className={INPUT} placeholder="e.g. POL-TLO-2026-XXXXX" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ds-ink3 mb-1">Nama Penanggung</label>
            <input value={insurerName} onChange={e => setInsurerName(e.target.value)} className={INPUT} placeholder="e.g. Asuransi ABC" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ds-ink3 mb-1">Dokumen Polis Induk (PDF)</label>
            {docUrl && <p className="text-2xs text-ds-green break-all mb-1">Tersimpan: {docUrl}</p>}
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ds-green text-ds-on-green text-xs font-bold cursor-pointer w-fit">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {docUrl ? 'Ganti Dokumen' : 'Unggah Dokumen'}
              <input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </label>
          </div>
          <button
            onClick={handleIssue} disabled={saving || uploading}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Terbitkan Polis Batch
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Pengguna Korporat (admin provisioning B2B, v2.7.56) ─────────────────────
//
// Mendaftarkan akun klien korporat B2B lengkap dengan kata sandi yang dibuat
// manual oleh admin (hanya MASTER_ADMIN; ADMIN memakai email undangan). Kata
// sandi ditampilkan sekali dan wajib diganti pengguna saat login pertama
// (must_change_password) — alur ganti sudah ditangani B2BLogin.

const UsersSection: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const confirm = useConfirmDialog();
  const [showWizard, setShowWizard] = useState(false);
  const [credential, setCredential] = useState<WizardCredential | null>(null);
  const [users, setUsers] = useState<SpB2BUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Caller role dibaca dari session — menentukan apakah opsi "Kata Sandi
  // Manual" tersedia (MASTER_ADMIN only).
  const callerRole: string = (() => {
    try {
      const raw = localStorage.getItem('SUREPATH_SESSION') ?? sessionStorage.getItem('SUREPATH_SESSION');
      return JSON.parse(raw ?? '{}')?.role ?? '';
    } catch { return ''; }
  })();

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setUsers(await adminListB2BUsers());
    setListLoading(false);
  }, []);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const copyCredential = async () => {
    if (!credential?.password) return;
    try {
      await navigator.clipboard.writeText(`Portal: https://myinsurepath.com/b2bapps\nEmail: ${credential.email}\nKata sandi: ${credential.password}\n(Berlaku permanen — pengguna bisa langsung login)`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard opsional */ }
  };

  // v2.8.8 — setel ulang kata sandi pengguna korporat secara manual. Sandi
  // baru berlaku permanen (tanpa wajib ganti), selaras dengan pembuatan akun;
  // ditampilkan sekali via banner kuning yang sama.
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const handleSetPassword = async (u: SpB2BUser) => {
    if (resettingUserId) return;
    const ok = await confirm({
      title: 'Setel Kata Sandi Baru?',
      description: `Kata sandi baru untuk ${u.name || u.email} akan dibuat dan berlaku permanen. Kata sandi lama langsung tidak berlaku.`,
      confirmLabel: 'Setel Sandi',
      cancelLabel: 'Batal',
    });
    if (!ok) return;
    setResettingUserId(u.id);
    const res = await setMitraTempPassword(u.id, false);
    setResettingUserId(null);
    if (res.error || !res.tempPassword) {
      onToast(res.error ?? 'Gagal menyetel kata sandi.');
      return;
    }
    setCredential({
      name: u.name || u.email,
      email: res.email ?? u.email,
      password: res.tempPassword,
      note: 'Kata sandi baru ini berlaku permanen — pengguna bisa langsung login dengannya. Tidak disimpan di sistem mana pun.',
    });
    onToast(`Kata sandi ${u.name || u.email} disetel ulang — tampil sekali di bawah.`);
  };

  return (
    <div className="space-y-3">
      {/* v2.8.5 — Unified AddUserWizard menggantikan form inline lama. Alur
          korporat (KYC perusahaan + PIC + dokumen NIB/NPWP/KTP) ada di
          kycMatrix.B2B_CLIENT, jadi wizard akan menampilkan field dan
          dokumen yang tepat begitu role B2B_CLIENT dipilih. */}
      <AddUserWizard
        open={showWizard}
        callerRole={callerRole}
        defaultRole="B2B_CLIENT"
        onClose={() => setShowWizard(false)}
        onCreated={(user, cred, docErrors) => {
          if (cred) setCredential(cred);
          onToast(cred ? 'Pengguna B2B terdaftar.' : 'Email undangan B2B terkirim.');
          if (docErrors.length > 0) {
            onToast(`${docErrors.length} dokumen gagal unggah — retry dari detail pengguna.`);
          }
          loadUsers();
          void user;
        }}
      />

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-black text-ds-ink dark:text-white">Pengguna Korporat</p>
            <p className="text-xs text-ds-ink3 mt-0.5">Daftarkan multifinance/logistik dengan KYC perusahaan + PIC + dokumen NIB/NPWP/KTP.</p>
          </div>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={14} /> Tambah Pengguna Korporat
        </button>
      </div>

      {/* Credential one-shot banner — tampil setelah wizard menyelesaikan
          mode password. Kartu kuning yang sama dengan inline lama. */}
      {credential?.password && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">Kata sandi awal — tampil sekali, simpan sekarang</p>
          <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
            <span className="rounded-lg bg-white dark:bg-ds-card px-2 py-1 border border-ds-border">{credential.email}</span>
            <span className="rounded-lg bg-white dark:bg-ds-card px-2 py-1 border border-ds-border">{credential.password}</span>
            <button onClick={copyCredential} className="inline-flex items-center gap-1 rounded-lg border border-ds-border px-2 py-1 text-xs font-bold text-ds-ink2">
              {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />} {copied ? 'Tersalin' : 'Salin'}
            </button>
            <button onClick={() => setCredential(null)} className="inline-flex items-center gap-1 rounded-lg border border-ds-border px-2 py-1 text-xs font-bold text-ds-ink2">
              Tutup
            </button>
          </div>
          <p className="text-2xs text-amber-700 dark:text-amber-400">{credential.note ?? 'Kredensial ini tidak disimpan di sistem mana pun. Kata sandi berlaku permanen — pengguna bisa langsung login di /b2bapps dan mengganti sandinya kapan saja dari menu Profil.'}</p>
        </div>
      )}

      {/* Daftar pengguna */}
      <div className="rounded-2xl border border-ds-border bg-white dark:bg-ds-card2 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-ds-ink dark:text-white">Pengguna Korporat Terdaftar</h3>
          <button onClick={loadUsers} className="text-ds-ink3 hover:text-ds-ink2"><RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} /></button>
        </div>
        {listLoading ? (
          <div className="flex items-center justify-center py-8 text-ds-ink3 text-sm gap-2">
            <Loader2 size={14} className="animate-spin" /> Memuat…
          </div>
        ) : users.length === 0 ? (
          <p className="py-6 text-center text-sm text-ds-ink3">Belum ada pengguna korporat terdaftar.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ds-border px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-2xs font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {(u.company_name || 'B2B').trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || 'B2B'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ds-ink dark:text-white">{u.company_name || u.name || '—'}</p>
                  <p className="truncate text-2xs text-ds-ink3">{u.name} · {u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                </div>
                {u.verified !== false && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">AKTIF</span>
                )}
                {callerRole === 'MASTER_ADMIN' && (
                  <button
                    onClick={() => handleSetPassword(u)}
                    disabled={resettingUserId === u.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-ds-border bg-ds-card px-2 py-1 text-2xs font-bold text-ds-ink2 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                  >
                    <KeyRound size={11} /> {resettingUserId === u.id ? 'Menyetel…' : 'Setel Sandi'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BULK_STATUSES = ['SUBMITTED', 'INVOICED', 'PAID', 'ISSUED', 'CANCELLED'];

const B2BAdminView: React.FC = () => {
  const [tab, setTab] = useState<'b2b' | 'bulk' | 'life' | 'users'>('b2b');
  const [b2bSubs, setB2bSubs] = useState<SpB2BSubmission[]>([]);
  const [bulkBatches, setBulkBatches] = useState<SpB2BBatch[]>([]);
  const [lifeApps, setLifeApps] = useState<SpLifeApplication[]>([]);
  const [insurers, setInsurers] = useState<InsurerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [b2bFilter, setB2bFilter] = useState('ALL');
  const [bulkFilter, setBulkFilter] = useState('ALL');
  const [lifeFilter, setLifeFilter] = useState('ALL');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [subs, batches, apps, insRes] = await Promise.all([
        getAllB2BSubmissions(), adminGetAllB2BBulkBatches(), getAllLifeApplications(),
        supabase.from('sp_insurers').select('id, name').eq('is_active', true).order('name'),
      ]);
      setB2bSubs(subs);
      setBulkBatches(batches);
      setLifeApps(apps);
      setInsurers((insRes.data ?? []) as InsurerOption[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat pengajuan B2B dan aplikasi jiwa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Surfaced prominently per the owner's request (5 Nov 2026) — bulk batches
  // awaiting payment or awaiting master-policy issuance are easy to lose
  // track of buried inside a filtered tab.
  const bulkAwaitingPayment = bulkBatches.filter(b => b.status === 'SUBMITTED' || b.status === 'INVOICED').length;
  const bulkAwaitingIssuance = bulkBatches.filter(b => b.status === 'PAID').length;

  const showToast = (msg: string) => setToast(msg);

  const visibleB2b = b2bFilter === 'ALL' ? b2bSubs : b2bSubs.filter(s => s.status === b2bFilter);
  const visibleBulk = bulkFilter === 'ALL' ? bulkBatches : bulkBatches.filter(b => b.status === bulkFilter);
  const visibleLife = lifeFilter === 'ALL' ? lifeApps : lifeApps.filter(a => a.status === lifeFilter);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-ds-card">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-5 pt-5 pb-3">
        <TabBtn active={tab === 'b2b'} onClick={() => setTab('b2b')} icon={<ModuleIcon id="b2b" size={22} />} label="B2B Submissions" />
        <TabBtn active={tab === 'bulk'} onClick={() => setTab('bulk')} icon={<ModuleIcon id="documents" size={22} />} label="Bulk Batches" badge={bulkAwaitingPayment + bulkAwaitingIssuance} />
        <TabBtn active={tab === 'life'} onClick={() => setTab('life')} icon={<ModuleIcon id="family_health" size={22} />} label="Life Applications" />
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={<Building2 size={22} />} label="Pengguna Korporat" />
        <button onClick={load} className="ml-auto p-2 rounded-xl text-ds-ink3 hover:text-ds-ink2 dark:hover:text-ds-ink">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
        {tab === 'b2b' && ['ALL', ...B2B_STATUSES].map(f => (
          <FilterPill key={f} label={f} active={b2bFilter === f} onClick={() => setB2bFilter(f)} />
        ))}
        {tab === 'bulk' && ['ALL', ...BULK_STATUSES].map(f => (
          <FilterPill key={f} label={f} active={bulkFilter === f} onClick={() => setBulkFilter(f)} />
        ))}
        {tab === 'life' && ['ALL', ...LIFE_STATUSES].map(f => (
          <FilterPill key={f} label={f} active={lifeFilter === f} onClick={() => setLifeFilter(f)} />
        ))}
      </div>

      {/* Content */}
      <div className="px-5 pb-8 space-y-3">
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            <span><strong>Data belum berhasil dimuat.</strong> {loadError}</span>
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-current px-3 py-2 font-semibold">
              <RefreshCw size={14} /> Coba lagi
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-ds-ink3 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading…
          </div>
        ) : tab === 'b2b' ? (
          visibleB2b.length === 0 ? (
            <Empty />
          ) : (
            visibleB2b.map(sub => (
              <B2BCard key={sub.id} sub={sub} onUpdated={load} onToast={showToast} />
            ))
          )
        ) : tab === 'bulk' ? (
          visibleBulk.length === 0 ? (
            <Empty />
          ) : (
            visibleBulk.map(batch => (
              <BulkBatchCard key={batch.id} batch={batch} insurers={insurers} onUpdated={load} onToast={showToast} />
            ))
          )
        ) : tab === 'users' ? (
          <UsersSection onToast={showToast} />
        ) : (
          visibleLife.length === 0 ? (
            <Empty />
          ) : (
            visibleLife.map(app => (
              <LifeCard key={app.id} app={app} onUpdated={load} onToast={showToast} />
            ))
          )
        )}
      </div>
    </div>
  );
};

// ─── Minor atoms ──────────────────────────────────────────────────────────────

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
      active ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border text-ds-ink2 dark:text-ds-ink2'
    }`}
  >
    {icon}{label}
    {!!badge && (
      <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-2xs font-black ${active ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'}`}>
        {badge}
      </span>
    )}
  </button>
);

const FilterPill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
      active ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-ds-card2 border border-ds-border dark:border-ds-border text-ds-ink3 dark:text-ds-ink3'
    }`}
  >
    {label}
  </button>
);

const Empty: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-ds-ink3">
    <ModuleIcon id="documents" size={52} className="mb-3" />
    <p className="text-sm">No records found</p>
  </div>
);

export default B2BAdminView;
