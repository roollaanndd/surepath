import React, { useState, useEffect } from 'react';
import {
  Shield, Heart, TrendingUp, Landmark, ChevronLeft, ChevronRight,
  Brain, Zap, BedDouble, CheckCircle2, AlertTriangle, RefreshCw,
  Accessibility,
} from 'lucide-react';
import { Language } from '../../types';
import {
  createLifeApplication,
  getAgentLifeApplications,
  type SpLifeApplication,
} from '../../services/supabaseService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

function calcAge(dob: string): number {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getBaseRate(age: number): number {
  if (age <= 25) return 0.012;
  if (age <= 35) return 0.018;
  if (age <= 45) return 0.028;
  if (age <= 55) return 0.045;
  return 0.075;
}

const PRODUCT_MULTIPLIER: Record<string, number> = {
  TERM_LIFE: 1.0, WHOLE_LIFE: 2.5, UNIT_LINK: 3.5, ENDOWMENT: 3.0,
};

const RIDER_LOADING: Record<string, number> = {
  CRITICAL_ILLNESS: 0.12, DISABILITY: 0.08, ACCIDENT: 0.05, HOSPITAL_CASH: 0.10,
};

function calcAnnualPremium(
  sumAssured: number,
  age: number,
  productCode: string,
  smoker: boolean,
  riders: string[],
): number {
  if (!sumAssured || !age || !productCode) return 0;
  const base = sumAssured * getBaseRate(age) * (PRODUCT_MULTIPLIER[productCode] ?? 1.0) * (smoker ? 1.5 : 1.0);
  const riderLoad = riders.reduce((acc, r) => acc + (RIDER_LOADING[r] ?? 0), 0);
  return Math.round(base * (1 + riderLoad));
}

const FREQ_DIVISOR: Record<string, number> = {
  MONTHLY: 12, QUARTERLY: 4, SEMI_ANNUAL: 2, ANNUAL: 1,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { code: 'TERM_LIFE',  label: 'Term Life',  Icon: Shield,   color: 'blue',   desc: 'Proteksi jiwa murni untuk jangka waktu tertentu' },
  { code: 'WHOLE_LIFE', label: 'Whole Life', Icon: Heart,    color: 'purple', desc: 'Perlindungan seumur hidup dengan nilai tunai' },
  { code: 'UNIT_LINK',  label: 'Unit Link',  Icon: TrendingUp, color: 'amber', desc: 'Investasi + proteksi jiwa dalam satu polis' },
  { code: 'ENDOWMENT',  label: 'Endowment', Icon: Landmark, color: 'green',  desc: 'Tabungan berencana dengan proteksi jiwa' },
] as const;

const PRODUCT_COLOR_MAP: Record<string, string> = {
  blue:   'border-blue-400   bg-blue-50   dark:bg-blue-900/20   text-blue-600   dark:text-blue-400',
  purple: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  amber:  'border-amber-400  bg-amber-50  dark:bg-amber-900/20  text-amber-600  dark:text-amber-400',
  green:  'border-green-400  bg-green-50  dark:bg-green-900/20  text-green-600  dark:text-green-400',
};

const TERMS: Record<string, number[]> = {
  TERM_LIFE: [5, 10, 15, 20],
  WHOLE_LIFE: [99],
  UNIT_LINK: [10, 15, 20, 25],
  ENDOWMENT: [10, 15, 20, 25],
};

const FREQS = [
  { value: 'MONTHLY', label: 'Bulanan' },
  { value: 'QUARTERLY', label: 'Triwulan' },
  { value: 'SEMI_ANNUAL', label: 'Semesteran' },
  { value: 'ANNUAL', label: 'Tahunan' },
] as const;

const RIDERS = [
  { code: 'CRITICAL_ILLNESS', label: 'Critical Illness Rider', desc: 'Santunan 36 penyakit kritis',       Icon: Brain,         loading: '+12%' },
  { code: 'DISABILITY',       label: 'Disability Rider',       desc: 'Pembebasan premi bila cacat total', Icon: Accessibility, loading: '+8%' },
  { code: 'ACCIDENT',         label: 'Accident Rider',         desc: 'Santunan kecelakaan ganda',         Icon: Zap,           loading: '+5%' },
  { code: 'HOSPITAL_CASH',    label: 'Hospital Cash Rider',    desc: 'Tunjangan harian rawat inap',       Icon: BedDouble,     loading: '+10%' },
];

const HEALTH_QUESTIONS = [
  'Apakah Anda pernah/sedang menderita penyakit jantung atau pembuluh darah?',
  'Apakah Anda pernah/sedang menderita diabetes melitus?',
  'Apakah Anda pernah/sedang menderita stroke atau gangguan saraf?',
  'Apakah Anda pernah/sedang menderita kanker atau tumor?',
  'Apakah Anda pernah/sedang menderita penyakit paru-paru kronis?',
  'Apakah Anda pernah/sedang menderita gangguan ginjal?',
  'Apakah Anda pernah dioperasi dalam 5 tahun terakhir?',
  'Apakah Anda sedang dalam pengobatan rutin dokter?',
  'Apakah ada anggota keluarga (orang tua/saudara) dengan riwayat penyakit keturunan?',
  'Apakah Anda pernah ditolak asuransi jiwa sebelumnya?',
];

const RELATIONS = ['Suami/Istri', 'Anak', 'Orang Tua', 'Saudara', 'Lainnya'];

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UNDERWRITING:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DECLINED:    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  ISSUED:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DRAFT:       'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  agentId: string;
  agent: unknown;
  lang: Language;
  onBack: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const LifeInsuranceWizard: React.FC<Props> = ({ agentId, lang, onBack }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successApp, setSuccessApp] = useState<SpLifeApplication | null>(null);
  const [recentApps, setRecentApps] = useState<SpLifeApplication[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [healthIdx, setHealthIdx] = useState(0);

  // Step 1
  const [productCode, setProductCode] = useState<string>('');
  // Step 2
  const [clientName, setClientName] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [clientGender, setClientGender] = useState<'M' | 'F'>('M');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [smoker, setSmoker] = useState(false);
  // Step 3
  const [sumAssured, setSumAssured] = useState(500_000_000);
  const [policyTermYears, setPolicyTermYears] = useState(10);
  const [paymentFreq, setPaymentFreq] = useState<'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'>('MONTHLY');
  // Step 4
  const [riders, setRiders] = useState<string[]>([]);
  // Step 5
  const [healthDecl, setHealthDecl] = useState<Record<string, boolean>>({});
  // Step 6
  const [benefName, setBenefName] = useState('');
  const [benefRelation, setBenefRelation] = useState('Suami/Istri');
  const [benefPct, setBenefPct] = useState(100);

  const age = calcAge(clientDob);
  const annualPremium = calcAnnualPremium(sumAssured, age, productCode, smoker, riders);
  const periodPremium = annualPremium / (FREQ_DIVISOR[paymentFreq] ?? 1);

  const hasYesHealth = Object.values(healthDecl).some(Boolean);
  const allHealthAnswered = Object.keys(healthDecl).length === HEALTH_QUESTIONS.length;

  useEffect(() => {
    setLoadingRecent(true);
    getAgentLifeApplications(agentId).then(data => {
      setRecentApps(data);
      setLoadingRecent(false);
    });
  }, [agentId, successApp]);

  const canNext = (): boolean => {
    if (step === 1) return !!productCode;
    if (step === 2) return !!clientName && !!clientDob && !!clientPhone && age >= 18 && age <= 65;
    if (step === 3) return sumAssured >= 100_000_000;
    if (step === 5) return allHealthAnswered;
    if (step === 6) return !!benefName && benefPct > 0 && benefPct <= 100;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await createLifeApplication({
      agent_id: agentId,
      client_name: clientName,
      client_dob: clientDob,
      client_gender: clientGender,
      client_phone: clientPhone,
      client_email: clientEmail,
      smoker,
      product_code: productCode as SpLifeApplication['product_code'],
      sum_assured: sumAssured,
      payment_frequency: paymentFreq,
      policy_term_years: policyTermYears,
      riders,
      health_declaration: healthDecl,
      beneficiary_name: benefName,
      beneficiary_relation: benefRelation,
      beneficiary_percentage: benefPct,
      indicative_premium: annualPremium,
      status: 'SUBMITTED',
    });
    setSubmitting(false);
    if (result) setSuccessApp(result);
  };

  if (successApp) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-green-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {t('Application Submitted!', 'Aplikasi Berhasil Dikirim!')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
          {t('Order Number', 'Nomor Aplikasi')}: <span className="font-mono font-bold text-[#16a34a]">{successApp.order_number}</span>
        </p>
        <p className="text-xs text-slate-400 mb-6">
          {t('Prudential will review and contact within 3-5 business days.', 'Prudential akan mereview dan menghubungi dalam 3-5 hari kerja.')}
        </p>
        <button
          onClick={() => { setSuccessApp(null); setStep(1); setProductCode(''); setClientName(''); setClientDob(''); setClientPhone(''); setClientEmail(''); setSmoker(false); setSumAssured(500_000_000); setRiders([]); setHealthDecl({}); setBenefName(''); setHealthIdx(0); }}
          className="px-6 py-2 bg-[#16a34a] text-white rounded-xl font-semibold text-sm"
        >
          {t('New Application', 'Aplikasi Baru')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-[#0f0f0f] font-sora">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 motion-reduce:active:scale-100 transition-transform">
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
            Prudential Life Insurance
          </h1>
          <p className="text-xs text-slate-400">{t('New Application', 'Aplikasi Baru')}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-1.5 px-5 py-3">
        {Array.from({ length: 7 }, (_, i) => i + 1).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step ? 'bg-green-500 text-white' :
              s === step ? 'bg-[#16a34a] text-white' :
              'bg-slate-100 dark:bg-white/5 text-slate-400'
            }`}>{s < step ? <CheckCircle2 size={14} /> : s}</div>
            {s < 7 && <div className={`w-4 h-0.5 rounded ${s < step ? 'bg-green-400' : 'bg-slate-200 dark:bg-white/10'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {step === 1 && <StepPlanType productCode={productCode} onSelect={setProductCode} t={t} />}
        {step === 2 && (
          <StepPersonal
            clientName={clientName} setClientName={setClientName}
            clientDob={clientDob} setClientDob={setClientDob}
            clientGender={clientGender} setClientGender={setClientGender}
            clientPhone={clientPhone} setClientPhone={setClientPhone}
            clientEmail={clientEmail} setClientEmail={setClientEmail}
            smoker={smoker} setSmoker={setSmoker}
            age={age} t={t}
          />
        )}
        {step === 3 && (
          <StepCoverage
            productCode={productCode}
            sumAssured={sumAssured} setSumAssured={setSumAssured}
            policyTermYears={policyTermYears} setPolicyTermYears={setPolicyTermYears}
            paymentFreq={paymentFreq} setPaymentFreq={setPaymentFreq}
            annualPremium={annualPremium} periodPremium={periodPremium}
            t={t}
          />
        )}
        {step === 4 && <StepRiders riders={riders} setRiders={setRiders} annualPremium={annualPremium} t={t} />}
        {step === 5 && (
          <StepHealth
            healthDecl={healthDecl} setHealthDecl={setHealthDecl}
            healthIdx={healthIdx} setHealthIdx={setHealthIdx}
            hasYesHealth={hasYesHealth} t={t}
          />
        )}
        {step === 6 && (
          <StepBeneficiary
            benefName={benefName} setBenefName={setBenefName}
            benefRelation={benefRelation} setBenefRelation={setBenefRelation}
            benefPct={benefPct} setBenefPct={setBenefPct}
            t={t}
          />
        )}
        {step === 7 && (
          <StepSummary
            productCode={productCode} clientName={clientName} clientDob={clientDob}
            clientGender={clientGender} clientPhone={clientPhone} clientEmail={clientEmail}
            smoker={smoker} sumAssured={sumAssured} policyTermYears={policyTermYears}
            paymentFreq={paymentFreq} riders={riders} healthDecl={healthDecl}
            benefName={benefName} benefRelation={benefRelation} benefPct={benefPct}
            annualPremium={annualPremium} periodPremium={periodPremium}
            age={age} t={t}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 dark:border-white/5">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-semibold text-sm text-slate-600 dark:text-slate-300"
          >
            {t('Back', 'Kembali')}
          </button>
        )}
        {step < 7 ? (
          <button
            disabled={!canNext()}
            onClick={() => setStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl bg-[#16a34a] text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {t('Next', 'Lanjut')} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-[#16a34a] text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {t('Submit Application', 'Submit Aplikasi')}
          </button>
        )}
      </div>

      {/* Recent Applications */}
      <div className="px-5 pb-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          {t('Recent Applications', 'Aplikasi Terbaru')}
        </h3>
        {loadingRecent ? (
          <div className="text-xs text-slate-400">{t('Loading…', 'Memuat…')}</div>
        ) : recentApps.length === 0 ? (
          <div className="text-xs text-slate-400">{t('No applications yet.', 'Belum ada aplikasi.')}</div>
        ) : (
          <div className="space-y-2">
            {recentApps.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{app.client_name}</p>
                  <p className="text-xs text-slate-400 font-mono">{app.order_number}</p>
                  <p className="text-xs text-slate-400">{app.product_code} · {fmtIDR(app.sum_assured)}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[app.status] ?? STATUS_BADGE.DRAFT}`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-steps ────────────────────────────────────────────────────────────────

const StepPlanType: React.FC<{
  productCode: string;
  onSelect: (c: string) => void;
  t: (en: string, id: string) => string;
}> = ({ productCode, onSelect, t }) => (
  <div>
    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('Select Plan Type', 'Pilih Jenis Polis')}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('Choose the right life insurance product.', 'Pilih produk asuransi jiwa yang tepat.')}</p>
    <div className="grid grid-cols-1 gap-3">
      {PRODUCTS.map(({ code, label, Icon, color, desc }) => {
        const cls = PRODUCT_COLOR_MAP[color];
        const selected = productCode === code;
        return (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              selected ? cls + ' shadow-md' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-white/50 dark:bg-black/20' : 'bg-slate-100 dark:bg-white/5'}`}>
              <Icon size={24} className={selected ? cls.split(' ')[3] : 'text-slate-400'} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </div>
            {selected && <CheckCircle2 size={18} className="ml-auto text-[#16a34a] flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  </div>
);

const StepPersonal: React.FC<{
  clientName: string; setClientName: (v: string) => void;
  clientDob: string; setClientDob: (v: string) => void;
  clientGender: 'M' | 'F'; setClientGender: (v: 'M' | 'F') => void;
  clientPhone: string; setClientPhone: (v: string) => void;
  clientEmail: string; setClientEmail: (v: string) => void;
  smoker: boolean; setSmoker: (v: boolean) => void;
  age: number;
  t: (en: string, id: string) => string;
}> = ({ clientName, setClientName, clientDob, setClientDob, clientGender, setClientGender, clientPhone, setClientPhone, clientEmail, setClientEmail, smoker, setSmoker, age, t }) => {
  const ageInvalid = clientDob && (age < 18 || age > 65);
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('Personal Information', 'Data Pribadi')}</h2>
      <div className="space-y-4">
        <Field label={t('Full Name', 'Nama Lengkap')}>
          <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Doe" className={INPUT_CLS} />
        </Field>
        <Field label={t('Date of Birth', 'Tanggal Lahir')}>
          <input type="date" value={clientDob} onChange={e => setClientDob(e.target.value)} className={INPUT_CLS} />
          {clientDob && <p className={`text-xs mt-1 ${ageInvalid ? 'text-rose-500' : 'text-slate-400'}`}>
            {ageInvalid
              ? t(`Age ${age} is outside eligible range (18–65).`, `Usia ${age} di luar rentang yang diizinkan (18–65).`)
              : t(`Age: ${age} years`, `Usia: ${age} tahun`)}
          </p>}
          {ageInvalid && <div className="flex items-center gap-2 mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-xs text-rose-600"><AlertTriangle size={14} />{t('Age must be 18–65 to proceed.', 'Usia harus 18–65 untuk melanjutkan.')}</div>}
        </Field>
        <Field label={t('Gender', 'Jenis Kelamin')}>
          <div className="flex gap-2">
            {(['M', 'F'] as const).map(g => (
              <button key={g} onClick={() => setClientGender(g)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${clientGender === g ? 'bg-[#16a34a] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'}`}>
                {g === 'M' ? t('Male', 'Pria') : t('Female', 'Wanita')}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('Phone', 'Telepon')}>
          <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="08xx" className={INPUT_CLS} />
        </Field>
        <Field label={t('Email', 'Email')}>
          <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="email@example.com" className={INPUT_CLS} />
        </Field>
        <Field label={t('Smoker?', 'Perokok?')}>
          <div className="flex gap-2">
            {([true, false] as const).map(v => (
              <button key={String(v)} onClick={() => setSmoker(v)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${smoker === v ? 'bg-[#16a34a] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'}`}>
                {v ? t('Yes', 'Ya') : t('No', 'Tidak')}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
};

const StepCoverage: React.FC<{
  productCode: string;
  sumAssured: number; setSumAssured: (v: number) => void;
  policyTermYears: number; setPolicyTermYears: (v: number) => void;
  paymentFreq: string; setPaymentFreq: (v: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL') => void;
  annualPremium: number; periodPremium: number;
  t: (en: string, id: string) => string;
}> = ({ productCode, sumAssured, setSumAssured, policyTermYears, setPolicyTermYears, paymentFreq, setPaymentFreq, annualPremium, periodPremium, t }) => {
  const terms = TERMS[productCode] ?? [10];
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('Coverage Configuration', 'Konfigurasi Proteksi')}</h2>
      <div className="space-y-4">
        <Field label={t('Sum Assured (IDR)', 'Uang Pertanggungan (IDR)')}>
          <input
            type="number" value={sumAssured}
            onChange={e => setSumAssured(Math.max(0, Number(e.target.value)))}
            min={100_000_000} max={10_000_000_000} step={50_000_000}
            className={INPUT_CLS}
          />
          <p className="text-xs text-slate-400 mt-1">{fmtIDR(sumAssured)}</p>
          {sumAssured < 100_000_000 && <p className="text-xs text-rose-500 mt-1">{t('Minimum Rp 100.000.000', 'Minimum Rp 100.000.000')}</p>}
        </Field>
        <Field label={t('Policy Term', 'Jangka Waktu Polis')}>
          <div className="flex gap-2 flex-wrap">
            {terms.map(y => (
              <button key={y} onClick={() => setPolicyTermYears(y)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${policyTermYears === y ? 'bg-[#16a34a] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'}`}>
                {y === 99 ? t('Lifetime', 'Seumur Hidup') : `${y} ${t('yr', 'thn')}`}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('Payment Frequency', 'Frekuensi Pembayaran')}>
          <div className="flex gap-2 flex-wrap">
            {FREQS.map(f => (
              <button key={f.value} onClick={() => setPaymentFreq(f.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${paymentFreq === f.value ? 'bg-[#16a34a] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="p-4 bg-[#16a34a]/5 dark:bg-[#16a34a]/10 border border-[#16a34a]/20 dark:border-[#16a34a]/20 rounded-2xl">
          <p className="text-xs font-semibold text-[#15803d] dark:text-[#22c55e] mb-1">{t('Indicative Premium', 'Premi Indikatif')}</p>
          <p className="text-2xl font-black text-[#16a34a]">{fmtIDR(Math.round(periodPremium))}<span className="text-sm font-medium">/{FREQS.find(f => f.value === paymentFreq)?.label ?? ''}</span></p>
          <p className="text-xs text-[#22c55e] mt-0.5">{t('Annual:', 'Tahunan:')} {fmtIDR(annualPremium)}</p>
          <p className="text-[10px] text-slate-400 mt-2 italic">Premi ini bersifat indikatif dan dapat berubah sesuai hasil underwriting Prudential</p>
        </div>
      </div>
    </div>
  );
};

const StepRiders: React.FC<{
  riders: string[]; setRiders: (v: string[]) => void;
  annualPremium: number;
  t: (en: string, id: string) => string;
}> = ({ riders, setRiders, annualPremium, t }) => {
  const toggle = (code: string) => setRiders(riders.includes(code) ? riders.filter(r => r !== code) : [...riders, code]);
  const totalLoading = riders.reduce((acc, r) => acc + (RIDER_LOADING[r] ?? 0), 0);
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('Optional Riders', 'Rider Tambahan (Opsional)')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('Add extra coverage to your policy.', 'Tambahkan perlindungan ekstra pada polis Anda.')}</p>
      <div className="space-y-3">
        {RIDERS.map(({ code, label, desc, Icon, loading }) => {
          const selected = riders.includes(code);
          return (
            <button key={code} onClick={() => toggle(code)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${selected ? 'border-[#22c55e] bg-[#16a34a]/5 dark:bg-[#16a34a]/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#dcfce7] dark:bg-[#14532d]/30' : 'bg-slate-100 dark:bg-white/5'}`}>
                <Icon size={20} className={selected ? 'text-[#16a34a]' : 'text-slate-400'} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selected ? 'bg-[#16a34a] text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{loading}</span>
            </button>
          );
        })}
      </div>
      {riders.length > 0 && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-xs text-slate-500">
          {t('Rider loading:', 'Loading rider:')} +{Math.round(totalLoading * 100)}% → {t('Est. annual', 'Est. tahunan')}: {fmtIDR(Math.round(annualPremium))}
        </div>
      )}
    </div>
  );
};

const StepHealth: React.FC<{
  healthDecl: Record<string, boolean>;
  setHealthDecl: (v: Record<string, boolean>) => void;
  healthIdx: number; setHealthIdx: (v: number) => void;
  hasYesHealth: boolean;
  t: (en: string, id: string) => string;
}> = ({ healthDecl, setHealthDecl, healthIdx, setHealthIdx, hasYesHealth, t }) => {
  const question = HEALTH_QUESTIONS[healthIdx];
  const answered = healthDecl[String(healthIdx)] !== undefined;
  const answer = (val: boolean) => {
    const next = { ...healthDecl, [String(healthIdx)]: val };
    setHealthDecl(next);
    if (healthIdx < HEALTH_QUESTIONS.length - 1) setHealthIdx(healthIdx + 1);
  };
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('Health Declaration', 'Deklarasi Kesehatan')}</h2>
      <p className="text-xs text-slate-400 mb-4">{healthIdx + 1} / {HEALTH_QUESTIONS.length}</p>
      <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-1.5 mb-6">
        <div className="bg-[#16a34a] h-1.5 rounded-full transition-all" style={{ width: `${((Object.keys(healthDecl).length) / HEALTH_QUESTIONS.length) * 100}%` }} />
      </div>
      <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 mb-4 min-h-[100px] flex items-center">
        <p className="text-sm font-medium text-slate-800 dark:text-white leading-relaxed">{question}</p>
      </div>
      <div className="flex gap-3 mb-4">
        <button onClick={() => answer(true)}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${answered && healthDecl[String(healthIdx)] === true ? 'bg-rose-500 text-white' : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}>
          {t('Yes', 'Ya')}
        </button>
        <button onClick={() => answer(false)}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${answered && healthDecl[String(healthIdx)] === false ? 'bg-green-500 text-white' : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}>
          {t('No', 'Tidak')}
        </button>
      </div>
      {healthIdx > 0 && (
        <button onClick={() => setHealthIdx(healthIdx - 1)} className="text-xs text-slate-400 underline">
          {t('Previous question', 'Pertanyaan sebelumnya')}
        </button>
      )}
      {hasYesHealth && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">Informasi ini akan dikonfirmasi saat underwriting Prudential. Premi akhir mungkin disesuaikan.</p>
        </div>
      )}
    </div>
  );
};

const StepBeneficiary: React.FC<{
  benefName: string; setBenefName: (v: string) => void;
  benefRelation: string; setBenefRelation: (v: string) => void;
  benefPct: number; setBenefPct: (v: number) => void;
  t: (en: string, id: string) => string;
}> = ({ benefName, setBenefName, benefRelation, setBenefRelation, benefPct, setBenefPct, t }) => (
  <div>
    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('Beneficiary', 'Penerima Manfaat')}</h2>
    <div className="space-y-4">
      <Field label={t('Beneficiary Name', 'Nama Penerima Manfaat')}>
        <input value={benefName} onChange={e => setBenefName(e.target.value)} placeholder="Full Name" className={INPUT_CLS} />
      </Field>
      <Field label={t('Relationship', 'Hubungan')}>
        <div className="flex flex-wrap gap-2">
          {RELATIONS.map(r => (
            <button key={r} onClick={() => setBenefRelation(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${benefRelation === r ? 'bg-[#16a34a] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
              {r}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('Percentage (%)', 'Persentase (%)')}>
        <input type="number" value={benefPct} onChange={e => setBenefPct(Math.min(100, Math.max(0, Number(e.target.value))))}
          min={1} max={100} className={INPUT_CLS} />
        {benefPct !== 100 && <p className="text-xs text-amber-500 mt-1">{t('Split beneficiary: remaining must be assigned separately.', 'Penerima manfaat dibagi, sisanya ditambahkan terpisah.')}</p>}
      </Field>
    </div>
  </div>
);

const StepSummary: React.FC<{
  productCode: string; clientName: string; clientDob: string; clientGender: string;
  clientPhone: string; clientEmail: string; smoker: boolean;
  sumAssured: number; policyTermYears: number; paymentFreq: string;
  riders: string[]; healthDecl: Record<string, boolean>;
  benefName: string; benefRelation: string; benefPct: number;
  annualPremium: number; periodPremium: number; age: number;
  t: (en: string, id: string) => string;
}> = ({ productCode, clientName, clientDob, clientGender, clientPhone, clientEmail, smoker, sumAssured, policyTermYears, paymentFreq, riders, benefName, benefRelation, benefPct, annualPremium, periodPremium, t }) => {
  const freqLabel = FREQS.find(f => f.value === paymentFreq)?.label ?? paymentFreq;
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('Application Summary', 'Ringkasan Aplikasi')}</h2>
      <div className="space-y-3">
        <SummarySection title={t('Product', 'Produk')}>
          <SummaryRow label="Plan" value={productCode.replace('_', ' ')} />
        </SummarySection>
        <SummarySection title={t('Personal', 'Pribadi')}>
          <SummaryRow label={t('Name', 'Nama')} value={clientName} />
          <SummaryRow label={t('DOB', 'TGL Lahir')} value={clientDob} />
          <SummaryRow label={t('Gender', 'Gender')} value={clientGender === 'M' ? t('Male', 'Pria') : t('Female', 'Wanita')} />
          <SummaryRow label={t('Phone', 'Telepon')} value={clientPhone} />
          <SummaryRow label="Email" value={clientEmail || '—'} />
          <SummaryRow label={t('Smoker', 'Perokok')} value={smoker ? t('Yes', 'Ya') : t('No', 'Tidak')} />
        </SummarySection>
        <SummarySection title={t('Coverage', 'Proteksi')}>
          <SummaryRow label={t('Sum Assured', 'UP')} value={fmtIDR(sumAssured)} />
          <SummaryRow label={t('Term', 'Jangka')} value={policyTermYears === 99 ? t('Lifetime', 'Seumur Hidup') : `${policyTermYears} ${t('yr', 'thn')}`} />
          <SummaryRow label={t('Frequency', 'Frekuensi')} value={freqLabel} />
        </SummarySection>
        <SummarySection title={t('Riders', 'Rider')}>
          {riders.length === 0
            ? <p className="text-xs text-slate-400">{t('None', 'Tidak ada')}</p>
            : riders.map(r => <SummaryRow key={r} label={r.replace('_', ' ')} value="Added" />)}
        </SummarySection>
        <SummarySection title={t('Beneficiary', 'Penerima Manfaat')}>
          <SummaryRow label={t('Name', 'Nama')} value={benefName} />
          <SummaryRow label={t('Relation', 'Hubungan')} value={benefRelation} />
          <SummaryRow label={t('Percentage', 'Persentase')} value={`${benefPct}%`} />
        </SummarySection>
        <div className="p-4 bg-[#16a34a]/5 dark:bg-[#16a34a]/10 border border-[#16a34a]/20 dark:border-[#16a34a]/20 rounded-2xl">
          <p className="text-sm font-bold text-[#15803d] dark:text-[#22c55e] mb-2">{t('Premium Breakdown', 'Rincian Premi')}</p>
          <SummaryRow label={t('Annual', 'Tahunan')} value={fmtIDR(annualPremium)} />
          <SummaryRow label={`${freqLabel}`} value={fmtIDR(Math.round(periodPremium))} />
          <p className="text-[10px] text-slate-400 mt-2 italic">Premi ini bersifat indikatif dan dapat berubah sesuai hasil underwriting Prudential</p>
        </div>
      </div>
    </div>
  );
};

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const SummarySection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{title}</p>
    {children}
  </div>
);

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-xs py-0.5">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="font-semibold text-slate-800 dark:text-white">{value}</span>
  </div>
);

export default LifeInsuranceWizard;
