// B2BNewClaim.tsx — roadmap B2B #1 (v2.9.31): claim submission form.
//
// Scope: incident date, affected unit (plate/chassis), location, description,
// chronology, estimated loss, optional photo uploads. All fields validated
// client-side; server does its own validation at `b2b_submit_claim`.
//
// Photo uploads use the standard Supabase Storage client (bucket:
// `claim-photos`, namespaced per-user). Validator from `uploadGuard.ts`
// enforces 8 MB + image/* MIME. Each upload returns a public URL which
// is appended to `photo_urls` and sent to the gateway.
//
// Honest scope note: no AI fraud detection, no automated analysis. B2B
// claims are reviewed manually by SurePath admin — the customer-side
// ClaimManager's forensics pipeline is overkill here and would need
// dedicated fleet-context training. Keep it simple.

import React, { useState } from 'react';
import { ArrowLeft, Upload, X, Loader2, Camera } from 'lucide-react';
import { Language } from '../../types';
import { supabase } from '../../services/supabaseService';
import { submitB2BClaim, type B2BClaimPayload } from '../../services/claims';
import { validateUpload, UPLOAD_RULES } from '../../services/uploadGuard';
import { formatIDR } from '../car-wizard/WizardUI';
import { B2BGlass, B2BSectionHeader, B2BButton, useB2BToast } from './dashboard/ui';

interface Props {
  clientId: string;
  lang: Language;
  onDone: () => void;
  onCancel: () => void;
}

// Upload a single photo to Supabase Storage and return its public URL.
// Returns null on failure (toast shown by caller). Bucket must allow
// authenticated INSERT to the per-user folder — matches claim-photos
// policy used by the customer ClaimManager.
async function uploadClaimPhoto(file: File, clientId: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('claim-photos').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) {
    console.error('uploadClaimPhoto:', error);
    return null;
  }
  const { data: pub } = supabase.storage.from('claim-photos').getPublicUrl(path);
  return pub?.publicUrl ?? null;
}

const B2BNewClaim: React.FC<Props> = ({ clientId, lang, onDone, onCancel }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const toast = useB2BToast();

  const [unitLabel, setUnitLabel] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [chronology, setChronology] = useState('');
  const [amountEstimated, setAmountEstimated] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Today's date as a reasonable max for the incident date picker — you can
  // report past incidents but not future ones.
  const today = new Date().toISOString().slice(0, 10);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const check = validateUpload(file, UPLOAD_RULES.claimPhoto);
    if (!check.ok) {
      toast.error(check.reason ?? 'File tidak valid.');
      return;
    }
    if (photoUrls.length >= 10) {
      toast.error(t('Maximum 10 photos per claim.', 'Maksimum 10 foto per klaim.'));
      return;
    }
    setUploading(true);
    const url = await uploadClaimPhoto(file, clientId);
    setUploading(false);
    if (!url) {
      toast.error(t('Photo upload failed. Try again.', 'Unggah foto gagal. Coba lagi.'));
      return;
    }
    setPhotoUrls(prev => [...prev, url]);
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!unitLabel.trim()) { toast.error(t('Unit is required.', 'Unit wajib diisi.')); return; }
    if (!incidentDate) { toast.error(t('Incident date is required.', 'Tanggal kejadian wajib diisi.')); return; }
    if (description.trim().length < 10) { toast.error(t('Description must be at least 10 characters.', 'Deskripsi minimal 10 karakter.')); return; }

    setSubmitting(true);
    const payload: B2BClaimPayload = {
      unit_label: unitLabel.trim(),
      incident_date: incidentDate,
      description: description.trim(),
      location: location.trim() || undefined,
      chronology: chronology.trim() || undefined,
      amount_estimated: amountEstimated ? Number(amountEstimated.replace(/\D/g, '')) : undefined,
      photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
    };

    const result = await submitB2BClaim(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t('Claim submitted. We will review it shortly.', 'Klaim terkirim. Tim kami akan mereview.'));
    onDone();
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl text-sm text-slate-900 outline-none transition-colors';
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(67,56,202,0.14)',
  };
  const labelClass = 'block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest';

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <B2BGlass className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('Back', 'Kembali')}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div>
            <h2 className="font-black text-lg text-slate-900" style={{ letterSpacing: '-0.015em' }}>
              {t('New Claim', 'Ajukan Klaim Baru')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('Fill in the incident details; our team will review within 1 business day.',
                 'Isi detail kejadian; tim kami akan mereview dalam 1 hari kerja.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>{t('Affected unit (plate / chassis)', 'Unit terdampak (plat / nomor rangka)')}<span className="text-rose-500"> *</span></label>
            <input
              className={inputClass}
              style={inputStyle}
              value={unitLabel}
              onChange={e => setUnitLabel(e.target.value)}
              placeholder="B 1234 ABC / MHY123…"
              maxLength={100}
            />
          </div>

          <div>
            <label className={labelClass}>{t('Incident date', 'Tanggal kejadian')}<span className="text-rose-500"> *</span></label>
            <input
              type="date"
              className={inputClass}
              style={inputStyle}
              value={incidentDate}
              onChange={e => setIncidentDate(e.target.value)}
              max={today}
            />
          </div>

          <div>
            <label className={labelClass}>{t('Estimated loss (IDR, optional)', 'Estimasi kerugian (IDR, opsional)')}</label>
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              style={inputStyle}
              value={amountEstimated ? formatIDR(Number(amountEstimated.replace(/\D/g, ''))) : ''}
              onChange={e => setAmountEstimated(e.target.value.replace(/\D/g, ''))}
              placeholder="Rp 0"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>{t('Location', 'Lokasi kejadian')}</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t('e.g. Jl. Sudirman Jakarta', 'mis. Jl. Sudirman Jakarta')}
              maxLength={300}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>{t('Short description', 'Deskripsi singkat')}<span className="text-rose-500"> *</span></label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('e.g. rear-end collision at a traffic light', 'mis. tabrakan dari belakang di lampu merah')}
              maxLength={5000}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>{t('Chronology (optional)', 'Kronologi lengkap (opsional)')}</label>
            <textarea
              rows={5}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              value={chronology}
              onChange={e => setChronology(e.target.value)}
              placeholder={t('Describe what happened before, during, and after the incident.',
                             'Jelaskan apa yang terjadi sebelum, saat, dan setelah kejadian.')}
              maxLength={5000}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>{t('Photos (optional, max 10 · 8 MB each)', 'Foto (opsional, maks 10 · 8 MB per foto)')}</label>
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50">
                  <img src={url} alt={`claim photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={t('Remove photo', 'Hapus foto')}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {photoUrls.length < 10 && (
                <label className="relative w-20 h-20 rounded-xl border border-dashed border-indigo-300 bg-white/60 hover:bg-white flex items-center justify-center cursor-pointer transition-colors">
                  {uploading ? <Loader2 size={18} className="text-indigo-600 animate-spin" /> : <Camera size={18} className="text-indigo-600" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleAddPhoto}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200/70 flex justify-end gap-2">
          <B2BButton variant="ghost" onClick={onCancel} disabled={submitting}>
            {t('Cancel', 'Batal')}
          </B2BButton>
          <B2BButton variant="primary" icon={submitting ? undefined : Upload} onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {t('Submit claim', 'Kirim klaim')}
          </B2BButton>
        </div>
      </B2BGlass>
    </div>
  );
};

export default B2BNewClaim;
