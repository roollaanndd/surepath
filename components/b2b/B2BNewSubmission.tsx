import React, { useState } from 'react';
import { Truck, FileSignature, HeartPulse, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { Language } from '../../types';
import {
  createB2BSubmission,
  uploadB2BDocument,
  type SpB2BSubmission,
} from '../../services/supabaseService';

interface Props {
  clientId: string;
  client: any;
  onDone: () => void;
  lang: Language;
}

type ProductType = 'FLEET_MV' | 'BONDING' | 'GROUP_HEALTH';

const INPUT = 'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40';
const LABEL = 'block text-xs font-bold text-ds-ink3 mb-1 uppercase tracking-wider';

// The picker names each product properly; the review step below it printed the
// raw enum ("FLEET_MV") next to those names. Same source for both.
const PRODUCT_LABEL: Record<string, string> = {
  FLEET_MV:     'Armada Kendaraan',
  BONDING:      'Surety Bond',
  GROUP_HEALTH: 'Kesehatan Kumpulan',
};

const DOC_REQS: Record<ProductType, Array<{ key: string; label: string }>> = {
  FLEET_MV: [
    { key: 'vehicle_schedule', label: 'Vehicle Schedule (Excel/CSV)' },
    { key: 'stnk_copies',      label: 'STNK Copies (PDF/ZIP)' },
    { key: 'company_reg',      label: 'Company Registration (SIUP/NIB)' },
    { key: 'npwp',             label: 'NPWP' },
  ],
  BONDING: [
    { key: 'financial_statement', label: 'Financial Statement (2 years)' },
    { key: 'company_profile',     label: 'Company Profile' },
    { key: 'contract_doc',        label: 'Project Contract / Tender Doc' },
    { key: 'company_reg',         label: 'Company Registration' },
  ],
  GROUP_HEALTH: [
    { key: 'employee_census', label: 'Employee Census (Excel)' },
    { key: 'company_reg',     label: 'Company Registration' },
    { key: 'npwp',            label: 'NPWP' },
  ],
};

const STEPS = ['Product', 'Company', 'Details', 'Documents', 'Review'];

const B2BNewSubmission: React.FC<Props> = ({ clientId, client, onDone, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [step, setStep] = useState(0);
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [company, setCompany] = useState({
    company_name: client?.company_name ?? '',
    pic_name: client?.name ?? '',
    pic_phone: client?.phone ?? '',
    pic_email: client?.email ?? '',
    npwp: '',
    industry: client?.company_industry ?? '',
  });
  const [details, setDetails] = useState<Record<string, any>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const field = (label: string, key: string, placeholder = '') => (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        className={INPUT}
        placeholder={placeholder}
        value={company[key as keyof typeof company] ?? ''}
        onChange={e => setCompany(prev => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  const detailField = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        type={type}
        className={INPUT}
        placeholder={placeholder}
        value={details[key] ?? ''}
        onChange={e => setDetails(prev => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  const detailSelect = (label: string, key: string, options: string[]) => (
    <div>
      <label className={LABEL}>{label}</label>
      <select
        className={INPUT}
        value={details[key] ?? ''}
        onChange={e => setDetails(prev => ({ ...prev, [key]: e.target.value }))}
      >
        <option value="">{t('Select…', 'Pilih…')}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const canProceedStep1 = productType !== null;
  const canProceedStep2 = company.company_name.trim() && company.pic_name.trim() && company.pic_email.trim();

  const ensureSubmission = async (): Promise<string | null> => {
    if (submissionId) return submissionId;
    const payload: Omit<SpB2BSubmission, 'id' | 'created_at' | 'updated_at'> = {
      client_id: clientId,
      product_type: productType!,
      company_name: company.company_name,
      pic_name: company.pic_name,
      pic_phone: company.pic_phone,
      pic_email: company.pic_email,
      submission_data: { ...details, npwp: company.npwp, industry: company.industry },
      status: 'SUBMITTED',
    };
    const result = await createB2BSubmission(payload);
    if (result?.id) { setSubmissionId(result.id); return result.id; }
    return null;
  };

  const handleNext = async () => {
    if (step === 2) {
      // Create the submission so we have an ID for doc uploads
      await ensureSubmission();
    }
    setStep(s => s + 1);
  };

  const handleUpload = async (key: string, file: File) => {
    const sid = submissionId ?? await ensureSubmission();
    if (!sid) return;
    setUploadingKey(key);
    const url = await uploadB2BDocument(sid, clientId, file, key);
    if (url) setUploadedDocs(prev => ({ ...prev, [key]: url }));
    setUploadingKey(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await ensureSubmission();
    setSubmitting(false);
    onDone();
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="font-black text-lg">{t('Choose Product Type', 'Pilih Jenis Produk')}</h2>
      {[
        { type: 'FLEET_MV' as ProductType, Icon: Truck, title: t('Fleet MV', 'Armada Kendaraan'), desc: t('Vehicle fleet insurance, 50+ vehicles', 'Asuransi kendaraan armada, 50+ unit') },
        { type: 'BONDING' as ProductType, Icon: FileSignature, title: t('Bonding', 'Surety Bond'), desc: t('Contract bonds, bid bonds, performance bonds', 'Jaminan kontrak, penawaran, dan pelaksanaan') },
        { type: 'GROUP_HEALTH' as ProductType, Icon: HeartPulse, title: t('Group Health', 'Kesehatan Kumpulan'), desc: t('Employee group health insurance', 'Asuransi kesehatan karyawan kumpulan') },
      ].map(({ type, Icon, title, desc }) => (
        <button
          key={type}
          onClick={() => setProductType(type)}
          className={`w-full flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
            productType === type
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${productType === type ? 'bg-ds-green text-ds-on-green' : 'bg-ds-card2 text-ds-ink3'}`}>
            <Icon size={20} />
          </div>
          <div>
            <div className="font-black text-sm">{title}</div>
            <div className="text-xs text-ds-ink3 mt-0.5">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="font-black text-lg">{t('Company & Contact', 'Perusahaan & Kontak')}</h2>
      {field(t('Company Name', 'Nama Perusahaan'), 'company_name')}
      {field(t('PIC Name', 'Nama PIC'), 'pic_name')}
      {field(t('PIC Phone', 'Telepon PIC'), 'pic_phone')}
      {field(t('PIC Email', 'Email PIC'), 'pic_email')}
      {field(t('NPWP / Company Reg No', 'NPWP / No. Perusahaan'), 'npwp')}
      {field(t('Industry', 'Industri'), 'industry')}
    </div>
  );

  const renderStep3Fleet = () => (
    <div className="space-y-4">
      {detailField(t('Number of Vehicles', 'Jumlah Kendaraan'), 'num_vehicles', 'number', '50')}
      {detailSelect(t('Vehicle Types', 'Jenis Kendaraan'), 'vehicle_types', ['Sedan', 'SUV', 'Truck', 'Motorcycle', 'Mixed'])}
      {detailField(t('Estimated Fleet Value (IDR)', 'Nilai Armada (IDR)'), 'fleet_value', 'number')}
      {detailSelect(t('Coverage Type', 'Jenis Pertanggungan'), 'coverage_type', ['Comprehensive', 'TLO'])}
      {detailField(t('Locations of Use', 'Lokasi Operasional'), 'locations', 'text', 'Jakarta, Surabaya…')}
    </div>
  );

  const renderStep3Bonding = () => (
    <div className="space-y-4">
      {detailSelect(t('Bond Type', 'Jenis Jaminan'), 'bond_type', ['Bid Bond', 'Performance Bond', 'Advance Payment Bond', 'Maintenance Bond'])}
      {detailField(t('Project Name', 'Nama Proyek'), 'project_name')}
      {detailField(t('Project Owner', 'Pemilik Proyek'), 'project_owner')}
      {detailField(t('Contract Value (IDR)', 'Nilai Kontrak (IDR)'), 'contract_value', 'number')}
      {detailField(t('Bond Amount (IDR)', 'Nilai Jaminan (IDR)'), 'bond_amount', 'number')}
      {detailField(t('Bond Period (days)', 'Periode Jaminan (hari)'), 'bond_period', 'number')}
    </div>
  );

  const renderStep3Health = () => (
    <div className="space-y-4">
      {detailField(t('Number of Employees', 'Jumlah Karyawan'), 'num_employees', 'number')}
      <div className="grid grid-cols-2 gap-3">
        {detailField(t('Min Age', 'Usia Min'), 'age_min', 'number', '21')}
        {detailField(t('Max Age', 'Usia Maks'), 'age_max', 'number', '55')}
      </div>
      {detailSelect(t('Dependants Included?', 'Termasuk Tanggungan?'), 'dependants', ['Yes', 'No'])}
      {detailSelect(t('Benefit Plan', 'Paket Manfaat'), 'benefit_plan', ['Inpatient Only', 'Inpatient + Outpatient', 'Comprehensive'])}
      {detailField(t('Annual Claim Limit / Person (IDR)', 'Limit Klaim/Orang (IDR)'), 'claim_limit', 'number')}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="font-black text-lg">{t('Product Details', 'Detail Produk')}</h2>
      {productType === 'FLEET_MV'     && renderStep3Fleet()}
      {productType === 'BONDING'      && renderStep3Bonding()}
      {productType === 'GROUP_HEALTH' && renderStep3Health()}
    </div>
  );

  const renderStep4 = () => {
    const docs = productType ? DOC_REQS[productType] : [];
    return (
      <div className="space-y-4">
        <h2 className="font-black text-lg">{t('Document Upload', 'Unggah Dokumen')}</h2>
        <p className="text-xs text-ds-ink3">{t('Upload required documents. You can skip and upload later.', 'Unggah dokumen yang diperlukan. Bisa dilengkapi nanti.')}</p>
        {docs.map(({ key, label }) => (
          <div key={key} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{label}</div>
              {uploadedDocs[key] && (
                <div className="flex items-center gap-1 mt-1 text-ds-green text-[11px] font-bold">
                  <CheckCircle2 size={12} /> {t('Uploaded', 'Terunggah')}
                </div>
              )}
            </div>
            <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              uploadedDocs[key]
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-ds-green dark:text-emerald-400'
                : 'bg-ds-green text-ds-on-green'
            }`}>
              {uploadingKey === key
                ? <Loader2 size={13} className="animate-spin" />
                : <Upload size={13} />
              }
              {uploadedDocs[key] ? t('Replace', 'Ganti') : t('Upload', 'Unggah')}
              <input
                type="file"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); }}
              />
            </label>
          </div>
        ))}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-4">
      <h2 className="font-black text-lg">{t('Review & Confirm', 'Periksa & Konfirmasi')}</h2>
      <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Product', 'Produk')}</span><span className="font-bold">{PRODUCT_LABEL[productType] ?? productType}</span></div>
        <div className="flex justify-between text-sm"><span className="text-ds-ink3">{t('Company', 'Perusahaan')}</span><span className="font-bold">{company.company_name}</span></div>
        <div className="flex justify-between text-sm"><span className="text-ds-ink3">PIC</span><span className="font-bold">{company.pic_name}</span></div>
        <div className="flex justify-between text-sm"><span className="text-ds-ink3">Email</span><span className="font-bold truncate ml-2">{company.pic_email}</span></div>
        {Object.entries(details).map(([k, v]) => (
          v ? <div key={k} className="flex justify-between text-sm"><span className="text-ds-ink3 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-bold truncate ml-2">{String(v)}</span></div> : null
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-ds-ink3">{t('Docs uploaded', 'Dok. terunggah')}</span>
          <span className="font-bold">{Object.keys(uploadedDocs).length}</span>
        </div>
      </div>
      <button
        disabled={submitting}
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-white py-4 font-black text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-60"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {t('Submit Submission', 'Kirim Pengajuan')}
      </button>
    </div>
  );

  const steps = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];
  const canNext = [canProceedStep1, !!canProceedStep2, true, true, false];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-colors ${
              i < step ? 'bg-ds-green text-ds-on-green' : i === step ? 'bg-ds-green text-ds-on-green' : 'bg-slate-100 dark:bg-white/10 text-ds-ink3'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full transition-colors ${i < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {steps[step]?.()}

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft size={16} /> {t('Back', 'Kembali')}
          </button>
        )}
        {step < 4 && (
          <button
            disabled={!canNext[step]}
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-black disabled:opacity-40 shadow-lg shadow-emerald-500/20"
          >
            {t('Next', 'Lanjut')} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default B2BNewSubmission;
