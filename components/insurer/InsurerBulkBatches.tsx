// InsurerBulkBatches.tsx — B2B bulk fleet batches assigned to this insurer.
//
// Folded into the "Polis" tab via a mode toggle (InsurerOrders.tsx) rather
// than a 6th bottom-nav tab — same reasoning as B2BPortal.tsx's bulkMode
// toggle this session: PortalTabBar is already full at 5.
//
// Token-authed, same as the rest of /insurerapp — no Supabase session, so
// the master-policy upload goes through a signed upload URL issued by the
// gateway (insurer_bulk_request_upload_url) rather than a direct client
// upload, which the private b2b-documents bucket's owner-folder RLS would
// otherwise reject outright for a caller with no auth.uid() at all.
import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertTriangle, Download, Building2 } from 'lucide-react';
import { useToast } from '../ui';
import { listInsurerBulkBatches, uploadInsurerBulkMasterPolicy, type InsurerBulkBatch as BulkBatch } from '../../services/insurerService';

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

interface Props {
  authToken: string;
  refreshTick: number;
}

const InsurerBulkBatches: React.FC<Props> = ({ authToken, refreshTick }) => {
  const toast = useToast();
  const [batches, setBatches] = useState<BulkBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [policyNumber, setPolicyNumber] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await listInsurerBulkBatches(authToken));
    } catch (e: any) {
      toast.error(`Gagal memuat batch: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [authToken, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const startIssue = (batch: BulkBatch) => {
    setIssuingId(batch.id);
    setPolicyNumber(batch.master_policy_number ?? '');
    setPendingFile(null);
  };

  const handleSelectFile = (file: File) => {
    setPendingFile(file);
  };

  const handleSubmit = async (batchId: string) => {
    if (!policyNumber.trim() || !pendingFile) { toast.error('Nomor polis dan dokumen wajib diisi.'); return; }
    setSubmitting(true);
    try {
      await uploadInsurerBulkMasterPolicy(authToken, batchId, pendingFile, policyNumber.trim());
      toast.success('Polis induk diterbitkan.');
      setIssuingId(null);
      load();
    } catch (e: any) {
      toast.error(`Gagal menerbitkan: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-ds-ink3" /></div>;
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-16 text-ds-ink3">
        <Building2 size={48} className="mx-auto mb-3 opacity-60" />
        <p className="text-sm font-bold">Belum ada batch B2B yang ditugaskan ke Anda.</p>
        <p className="text-xs mt-1">Batch akan muncul di sini setelah admin SurePath menugaskannya dan nasabah membayar.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {batches.map(b => (
        <div key={b.id} className="bg-white dark:bg-ds-card2 border border-ds-border rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-2xs font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-ds-ink2">{b.batch_number}</span>
                <span className={`text-2xs font-black uppercase px-2 py-0.5 rounded-full ${b.status === 'ISSUED' ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {b.status === 'ISSUED' ? 'Terbit' : 'Menunggu Polis'}
                </span>
              </div>
              <p className="font-bold text-ds-ink dark:text-white text-sm mt-1">{b.company_name}</p>
              <p className="text-xs text-ds-ink3">{b.item_count} unit · {fmtIDR(b.total_amount)} · {fmtDate(b.created_at)}</p>
            </div>
          </div>

          {b.status === 'ISSUED' ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Polis {b.master_policy_number}
              </span>
              {b.master_policy_signed_url && (
                <a href={b.master_policy_signed_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-ds-ink3 hover:text-emerald-400 font-semibold">
                  <Download size={12} /> Unduh
                </a>
              )}
            </div>
          ) : issuingId === b.id ? (
            <div className="p-3 bg-slate-50 dark:bg-ds-card border border-ds-border rounded-xl space-y-2.5">
              <div>
                <label className="block text-2xs font-semibold text-ds-ink3 mb-1">Nomor Polis Induk</label>
                <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)}
                  placeholder="e.g. POL-TLO-2026-XXXXX"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-ds-card2 border border-ds-border text-sm text-ds-ink focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-2xs font-semibold text-ds-ink3 mb-1">Dokumen Polis Induk (PDF)</label>
                {pendingFile && <p className="text-2xs text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle2 size={11} /> {pendingFile.name}</p>}
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ds-green text-ds-on-green text-xs font-bold cursor-pointer w-fit">
                  <Upload size={13} />
                  {pendingFile ? 'Ganti Dokumen' : 'Pilih Dokumen'}
                  <input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSelectFile(f); }} />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleSubmit(b.id)} disabled={submitting || !pendingFile}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Terbitkan
                </button>
                <button onClick={() => setIssuingId(null)} className="px-4 py-2 rounded-xl bg-ds-card2 border border-ds-border text-ds-ink2 font-semibold text-xs">
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => startIssue(b)}
              className="w-full py-2 rounded-xl bg-ds-card2 border border-ds-border text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5">
              <FileText size={13} /> Terbitkan Polis Induk
            </button>
          )}
        </div>
      ))}
      <p className="text-2xs text-ds-ink3 text-center flex items-center justify-center gap-1 pt-1">
        <AlertTriangle size={11} /> Dokumen hanya terlihat oleh Anda dan admin SurePath — bukan tautan publik.
      </p>
    </div>
  );
};

export default InsurerBulkBatches;
