import React, { useState, useRef } from 'react';
import { ShieldCheck, FileText, Loader2, Download, AlertCircle, CheckCircle2, Archive } from 'lucide-react';
import { Language } from '../../types';
import { acceptAgreement, attachAgreementPdf, SpAgentAgreement } from '../../services/supabaseService';
import { generateAgreementPDF, buildAgreementPdfBlob } from '../../services/agreementPdf';
import { uploadAgentAgreementPdfBlob } from '../../services/supabaseService';
import { AGREEMENT_META, AGREEMENT_CLAUSES } from './agreementContent';

interface Props {
  agent: any;
  lang: Language;
  onAccepted: (a: SpAgentAgreement) => void;
}

// Full-screen blocking gate. An agent cannot use the app until they read the
// agreement and submit their legal name + 16-digit KTP as electronic consent.
const AgentAgreementGate: React.FC<Props> = ({ agent, lang, onAccepted }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [fullName, setFullName] = useState<string>(agent?.name ?? '');
  const [ktp, setKtp] = useState<string>(agent?.ktp ?? '');
  const [checked, setChecked] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SpAgentAgreement | null>(null);
  const [archived, setArchived] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ktpValid = /^[0-9]{16}$/.test(ktp);
  const nameValid = fullName.trim().length >= 3;
  const canSubmit = checked && scrolledEnd && ktpValid && nameValid && !submitting;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolledEnd(true);
  };

  const handleAccept = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { rec, error } = await acceptAgreement(fullName, ktp);
    setSubmitting(false);
    if (!rec) {
      // Surface a more specific message for known recoverable cases.
      let msg = t('Failed to record agreement. Please try again.', 'Gagal menyimpan persetujuan. Coba lagi.');
      if (error?.code === '23505') {
        // unique_violation — agent already accepted this doc version
        msg = t(
          'You have already accepted this agreement version. Reload the app to continue.',
          'Anda telah menyetujui versi perjanjian ini. Muat ulang aplikasi untuk melanjutkan.'
        );
      } else if (error?.code === '42P01') {
        // undefined_table — migration has not been applied yet
        msg = t(
          'Agreement storage is not configured yet. Please contact support.',
          'Penyimpanan perjanjian belum dikonfigurasi. Silakan hubungi dukungan.'
        );
      } else if (error?.code === '23503') {
        // foreign_key_violation — agent_id not in sp_users
        msg = t(
          'Your profile is not fully set up yet. Please log out and log back in.',
          'Profil kamu belum siap. Silakan keluar dan masuk kembali.'
        );
      } else if (error?.code === 'NO_USER') {
        msg = t(
          'Session expired. Please log out and log back in.',
          'Sesi berakhir. Silakan keluar dan masuk kembali.'
        );
      } else if (error?.message) {
        // Show the actual error message so the user (and support) can diagnose
        msg = `${t('Failed to save agreement:', 'Gagal menyimpan:')} ${error.message}`;
      }
      setError(msg);
      return;
    }
    setDone(rec);

    // Arsip PDF perjanjian (audit 28 Okt 2026): sebelumnya PDF hanya dibuat
    // ulang di browser dan tidak pernah tersimpan server-side. Kini hasil PDF
    // diunggah ke bucket privat agent-docs dan path-nya didaftarkan pada baris
    // e-consent (pdf_bucket/pdf_path) + registry sp_documents, sehingga admin
    // memiliki salinan auditable. Kegagalan arsip tidak membatalkan persetujuan
    // — admin masih bisa membangun ulang PDF dari data e-consent.
    (async () => {
      try {
        const blob = await buildAgreementPdfBlob({
          agreementNo: rec.agreement_no,
          docVersion: rec.doc_version,
          fullName: rec.full_name,
          ktpNumber: rec.ktp_number,
          acceptedAt: rec.accepted_at,
          agentEmail: agent?.email,
          agentPhone: agent?.phone,
        });
        const agentId = agent?.id ?? rec.agent_id;
        const uploaded = await uploadAgentAgreementPdfBlob(blob, agentId, rec.agreement_no);
        if (!uploaded) { console.warn('[agreement] arsip PDF gagal diunggah'); return; }
        const base = import.meta.env.VITE_SUPABASE_URL ?? '';
        await attachAgreementPdf(rec.id, {
          bucket: 'agent-docs',
          path: uploaded.path,
          url: `${base}/storage/v1/object/agent-docs/${uploaded.path}`,
        });
        setArchived(true);
      } catch (e) {
        console.warn('[agreement] arsip PDF gagal:', e);
      }
    })();
  };

  const handleDownload = async () => {
    const rec = done;
    if (!rec) return;
    await generateAgreementPDF({
      agreementNo: rec.agreement_no,
      docVersion: rec.doc_version,
      fullName: rec.full_name,
      ktpNumber: rec.ktp_number,
      acceptedAt: rec.accepted_at,
      agentEmail: agent?.email,
      agentPhone: agent?.phone,
    });
  };

  // Success screen — agreement recorded
  if (done) {
    return (
      <div className="fixed inset-0 z-[4000] flex flex-col items-center justify-center px-6 text-center" style={{ background: '#f6faf7' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg,#10b981,#047857)', boxShadow: '0 18px 40px -14px rgba(16,185,129,0.7)' }}>
          <CheckCircle2 size={44} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">{t('Agreement Recorded', 'Perjanjian Tercatat')}</h2>
        <p className="text-sm text-slate-500 max-w-xs mb-1">
          {t('Your acceptance has been securely recorded.', 'Persetujuan Anda telah tersimpan dengan aman.')}
        </p>
        <p className="text-xs font-mono font-bold text-emerald-700 mb-3">{done.agreement_no}</p>
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center justify-center gap-1.5">
          {archived
            ? (<><Archive size={12} className="text-emerald-600" /> {t('PDF archived for audit', 'PDF terarsip untuk audit')}</>)
            : (<><Archive size={12} /> {t('Archiving PDF…', 'Mengarsipkan PDF…')}</>)}
        </p>
        <div className="w-full max-w-xs space-y-2.5">
          <button onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 active:scale-[0.98] transition-transform">
            <Download size={16} /> {t('Download PDF', 'Unduh PDF')}
          </button>
          <button onClick={() => onAccepted(done)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 14px 30px -12px rgba(5,150,105,0.6)' }}>
            {t('Enter App', 'Masuk Aplikasi')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[4000] flex flex-col" style={{ background: '#f6faf7' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-4 text-center flex-shrink-0" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
        <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 flex items-center justify-center mb-3">
          <ShieldCheck size={28} className="text-ds-green" />
        </div>
        <h1 className="text-lg font-black text-slate-900 tracking-tight">{AGREEMENT_META.title}</h1>
        <p className="text-[11px] font-bold uppercase tracking-widest text-ds-green mt-1">
          {AGREEMENT_META.version} · {t('Mandatory', 'Wajib Disetujui')}
        </p>
      </div>

      {/* Scrollable document */}
      <div ref={scrollRef} onScroll={onScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
        <div className="max-w-xl mx-auto sp-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-2 pb-3 border-b border-emerald-900/10">
            <FileText size={15} className="text-ds-green mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t(
                `Between ${AGREEMENT_META.company.name} ("Company") and you as Mitra (Partner). Read fully before accepting.`,
                `Antara ${AGREEMENT_META.company.name} ("Perusahaan") dan Anda sebagai Mitra. Baca seluruhnya sebelum menyetujui.`
              )}
            </p>
          </div>
          {AGREEMENT_CLAUSES.map((cl, i) => (
            <div key={i} className="space-y-1.5">
              <h3 className="text-xs font-black text-emerald-800 tracking-tight">{cl.heading}</h3>
              {cl.body.map((p, j) => (
                <p key={j} className="text-[11.5px] text-slate-600 leading-relaxed">{p}</p>
              ))}
            </div>
          ))}
          <div className="pt-2 text-center">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-ds-green bg-emerald-500/10 px-3 py-1 rounded-full">
              — {t('End of Document', 'Akhir Dokumen')} —
            </span>
          </div>
        </div>
      </div>

      {/* Sticky acceptance form */}
      <div className="flex-shrink-0 px-5 pt-3 pb-5 sp-glass-strong border-t border-emerald-900/10" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-xl mx-auto space-y-3">
          {!scrolledEnd && (
            <p className="text-center text-[11px] font-bold text-ds-amber flex items-center justify-center gap-1.5">
              <AlertCircle size={13} /> {t('Scroll to the end to continue', 'Gulir sampai akhir untuk melanjutkan')}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{t('Full Name (as per KTP)', 'Nama Lengkap (sesuai KTP)')}</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder={t('Full name', 'Nama lengkap')}
                className="w-full h-11 px-3.5 rounded-xl border border-emerald-900/10 bg-white/85 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{t('KTP Number (16 digits)', 'Nomor KTP (16 digit)')}</label>
              <input value={ktp} onChange={e => setKtp(e.target.value.replace(/\D/g, '').slice(0, 16))}
                inputMode="numeric" placeholder="3•••••••••••••••"
                className={`w-full h-11 px-3.5 rounded-xl border bg-white/85 text-sm font-mono tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${ktp.length > 0 && !ktpValid ? 'border-rose-400' : 'border-emerald-900/10 focus:border-emerald-500/50'}`} />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0" />
            <span className="text-[11px] text-slate-600 leading-snug">
              {t(
                'I have read, understood, and agree to be legally bound by this Partnership Agreement, including that data I provide is forwarded to the insurance company and that the insurance company holds final authority over acceptance and claims. My name and KTP number above serve as valid, voluntary electronic consent.',
                'Saya telah membaca, memahami, dan menyetujui untuk terikat secara hukum pada Perjanjian Kemitraan ini, termasuk bahwa data yang saya berikan akan diteruskan kepada perusahaan asuransi dan bahwa perusahaan asuransi memegang wewenang akhir atas akseptasi dan klaim. Nama dan Nomor KTP di atas merupakan persetujuan elektronik yang sah dan sukarela.'
              )}
            </span>
          </label>

          {error && (
            <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>
          )}

          <button onClick={handleAccept} disabled={!canSubmit}
            className="w-full h-13 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: canSubmit ? '0 14px 30px -12px rgba(5,150,105,0.6)' : 'none' }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {t('I AGREE', 'SAYA SETUJU')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentAgreementGate;
