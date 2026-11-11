// AddUserWizard — unified 5-step flow for creating any user type (Mitra,
// internal roles, B2B client). Replaces three separate modals that each had
// drifted into their own visual language and KYC set.
//
// Flow:
//   0. Role        — visual card grid filtered by caller role
//   1. Identitas   — fields from FIELD_MATRIX[role]
//   2. Dokumen KYC — files from DOC_MATRIX[role] (uploaded after user
//                    creation, so the file path can embed user_id)
//   3. Akses       — invite vs manual password (+ strength meter)
//   4. Review      — summary + "Buat"
//
// On submit it dispatches to createMitra/createInternalUser/adminCreateB2BUser
// based on the chosen role, then uploads each attached file via
// uploadKycFile. Partial failures surface in a retryable error list — the
// user account is still created (don't lose data) but the operator sees
// which docs failed and can retry.

import React, { useMemo, useState } from 'react';
import {
  UserPlus, ArrowLeft, ArrowRight, Check, AlertCircle,
  KeyRound, Mail, FileText, Shield, Sparkles,
} from 'lucide-react';
import { UserRole } from '../../types';
import { createMitra, createInternalUser } from '../../services/users';
import { adminCreateB2BUser } from '../../services/b2bBulk';
import { uploadKycFile, KYC_FILE_MAX_BYTES } from '../../services/kyc';
import ModuleIcon from '../shared/ModuleIcon';
import {
  SmoothModal, StepIndicator, FileUploadField, PasswordField, RoleCard,
  WizardButton, WizardStyles, passwordStrength,
} from './wizard/ui';
import {
  FIELD_MATRIX, DOC_MATRIX, ROLE_META, rolesAvailableFor,
  type WizardRole, type WizardField,
} from './wizard/kycMatrix';

export interface WizardCredential {
  name: string;
  email: string;
  password?: string | null;
  note: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  callerRole: string | null;
  /** Pre-pick a role (comes from "Tambah Mitra" button in a role-specific
   *  view). Operator can still back to step 0 and change it. */
  defaultRole?: WizardRole;
  onCreated: (
    user: { id: string; name: string; email: string; role: string },
    credential: WizardCredential | null,
    /** Non-fatal per-doc upload failures the caller can display */
    docErrors: Array<{ doc_type: string; error: string }>,
  ) => void;
}

const STEPS = [
  { label: 'Role', icon: Shield },
  { label: 'Identitas', icon: UserPlus },
  { label: 'Dokumen', icon: FileText },
  { label: 'Akses', icon: KeyRound },
  { label: 'Review', icon: Check },
];

const AddUserWizard: React.FC<Props> = ({ open, onClose, callerRole, defaultRole, onCreated }) => {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<WizardRole | null>(defaultRole ?? null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'invite' | 'password'>('invite');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navDir, setNavDir] = useState<'forward' | 'back'>('forward');

  const availableRoles = useMemo(() => rolesAvailableFor(callerRole), [callerRole]);
  const meta = role ? ROLE_META[role] : null;
  const canManualPassword = meta?.canSetManualPassword
    && (meta?.requiredCallerRoles.includes(callerRole ?? '') ?? false)
    && callerRole === 'MASTER_ADMIN';

  const reset = () => {
    setStep(0);
    setRole(defaultRole ?? null);
    setFields({});
    setFiles({});
    setUploadErrors({});
    setUploadProgress({});
    setMode('invite');
    setPassword('');
    setBusy(false);
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  /* ── Step validation ─────────────────────────────────────────────────── */
  const validateStep = (): string | null => {
    if (step === 0) return role ? null : 'Pilih role terlebih dulu.';
    if (step === 1 && role) {
      for (const f of FIELD_MATRIX[role]) {
        if (!f.required) continue;
        const v = (fields[f.key] ?? '').trim();
        if (!v) return `${f.label} wajib diisi.`;
        if (f.pattern && !f.pattern.test(v)) return `${f.label}: ${f.patternMessage ?? 'format salah'}.`;
      }
    }
    if (step === 2 && role) {
      for (const d of DOC_MATRIX[role]) {
        if (!d.required) continue;
        if (!files[d.key]) return `Dokumen ${d.label} wajib diunggah.`;
      }
    }
    if (step === 3) {
      if (mode === 'password') {
        if (!canManualPassword) return 'Kata sandi manual hanya untuk MASTER_ADMIN.';
        if (passwordStrength(password).score < 3) return 'Kata sandi belum cukup kuat (min. 10 karakter, 3 dari 4 kelas).';
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setNavDir('forward');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setError(null);
    setNavDir('back');
    setStep(s => Math.max(s - 1, 0));
  };
  const goToStep = (i: number) => {
    if (i >= step) return;
    setError(null);
    setNavDir('back');
    setStep(i);
  };

  /* ── Submit — creates user, then uploads docs ─────────────────────────── */
  const submit = async () => {
    const vErr = validateStep();
    if (vErr) { setError(vErr); return; }
    if (!role) { setError('Role belum dipilih.'); return; }

    setBusy(true);
    setError(null);
    setUploadErrors({});

    try {
      // Create the user via the role-appropriate action.
      let createdUserId: string | null = null;
      let createdName = '';
      let createdEmail = '';
      let tempPassword: string | null = null;

      const createAction = ROLE_META[role].createAction;

      if (createAction === 'admin_create_mitra') {
        const res = await createMitra({
          name: fields.name?.trim() ?? '',
          email: fields.email?.trim().toLowerCase() ?? '',
          phone: fields.phone?.trim() ?? '',
          ktp: fields.ktp?.trim() || null,
          address: fields.address?.trim() || null,
          upline_code: fields.upline_code?.trim() || null,
          mode: mode === 'password' ? 'temp' : 'invite',
        });
        if (res.error || !res.agent) throw new Error(res.error ?? 'Gagal membuat mitra.');
        createdUserId = res.agent.id;
        createdName = res.agent.name;
        createdEmail = res.agent.email;
        tempPassword = res.tempPassword ?? null;
      } else if (createAction === 'admin_create_internal_user') {
        const roleForApi = role === 'MASTER_ADMIN' ? UserRole.MASTER_ADMIN
          : role === 'ADMIN' ? UserRole.ADMIN
          : role === 'FINANCE' ? UserRole.FINANCE
          : role === 'FINANCE_MANAGER' ? UserRole.FINANCE_MANAGER
          : role === 'FINANCE_DIRECTOR' ? UserRole.FINANCE_DIRECTOR
          : role === 'OPERATOR' ? UserRole.OPERATOR
          : UserRole.INSURANCE_ADMIN;
        const res = await createInternalUser({
          name: fields.name?.trim() ?? '',
          email: fields.email?.trim().toLowerCase() ?? '',
          role: roleForApi,
          phone: fields.phone?.trim() || null,
          mode,
          ...(mode === 'password' ? { password } : {}),
        });
        if (res.error || !res.user) throw new Error(res.error ?? 'Gagal membuat pengguna internal.');
        createdUserId = res.user.id;
        createdName = res.user.name;
        createdEmail = res.user.email;
        tempPassword = res.tempPassword ?? null;
      } else {
        // B2B client — adminCreateB2BUser expects a flat shape with mode/password.
        const res = await adminCreateB2BUser({
          name: fields.pic_name?.trim() ?? '',
          email: fields.pic_email?.trim().toLowerCase() ?? '',
          phone: fields.pic_phone?.trim() ?? '',
          company_name: fields.company_name?.trim() ?? '',
          company_reg_no: fields.company_reg_no?.trim() ?? '',
          company_industry: fields.company_industry?.trim() ?? '',
          mode,
          ...(mode === 'password' ? { password } : {}),
        });
        if (res.error) throw new Error(res.error);
        createdUserId = res.data?.id ?? null;
        createdName = fields.pic_name?.trim() ?? '';
        createdEmail = fields.pic_email?.trim().toLowerCase() ?? '';
        tempPassword = res.temp_password ?? null;
      }

      if (!createdUserId) throw new Error('Backend tidak mengembalikan id pengguna.');

      // Upload each attached file. Partial failures are collected and
      // returned to caller — user account stays created.
      const docErrors: Array<{ doc_type: string; error: string }> = [];
      for (const [docType, file] of Object.entries(files)) {
        if (!file) continue;
        setUploadProgress(p => ({ ...p, [docType]: 0.1 }));
        const res = await uploadKycFile({ user_id: createdUserId, doc_type: docType, file });
        if (res.error) {
          docErrors.push({ doc_type: docType, error: res.error });
          setUploadErrors(e => ({ ...e, [docType]: res.error! }));
          setUploadProgress(p => ({ ...p, [docType]: 0 }));
        } else {
          setUploadProgress(p => ({ ...p, [docType]: 1 }));
        }
      }

      const credential: WizardCredential | null = tempPassword ? {
        name: createdName,
        email: createdEmail,
        password: tempPassword,
        note: role === 'B2B_CLIENT'
          ? 'Catat sekarang — kata sandi tidak disimpan di mana pun dan tidak bisa ditampilkan lagi. Kata sandi ini berlaku permanen: pengguna bisa langsung login dengannya.'
          : 'Catat sekarang — kata sandi tidak disimpan di mana pun dan tidak bisa ditampilkan lagi. Pengguna wajib menggantinya saat login pertama.',
      } : null;

      onCreated(
        { id: createdUserId, name: createdName, email: createdEmail, role },
        credential,
        docErrors,
      );
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat pengguna.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <WizardStyles />
      <SmoothModal
        open={open}
        onClose={handleClose}
        size="3xl"
        busy={busy}
        icon={<UserPlus size={18} className="text-emerald-600" />}
        title={
          <span className="flex items-center gap-2">
            Tambah Pengguna Baru
            {role && (
              <span className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10">
                {ROLE_META[role].label}
              </span>
            )}
          </span>
        }
        subtitle="Satu alur untuk semua peran — role → identitas → dokumen → akses → review"
        footer={
          <div className="flex items-center justify-between gap-3">
            <WizardButton
              variant="ghost"
              icon={step === 0 ? undefined : ArrowLeft}
              onClick={step === 0 ? handleClose : goBack}
              disabled={busy}
            >
              {step === 0 ? 'Batal' : 'Kembali'}
            </WizardButton>
            {step < STEPS.length - 1 ? (
              <WizardButton
                variant="primary"
                onClick={goNext}
                disabled={busy}
              >
                Lanjut <ArrowRight size={13} />
              </WizardButton>
            ) : (
              <WizardButton
                variant="primary"
                icon={Sparkles}
                onClick={submit}
                loading={busy}
                disabled={busy}
              >
                {mode === 'password' ? 'Buat & Tampilkan Sandi' : 'Buat & Kirim Undangan'}
              </WizardButton>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {/* Step indicator */}
          <StepIndicator steps={STEPS} current={step} onStepClick={goToStep} />

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
              <AlertCircle size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {/* Step body — swaps with slide animation */}
          <div key={step} className={navDir === 'forward' ? 'wiz-step-forward' : 'wiz-step-back'}>
            {step === 0 && (
              <StepRole availableRoles={availableRoles} value={role} onChange={setRole} />
            )}
            {step === 1 && role && (
              <StepIdentitas role={role} fields={fields} setFields={setFields} />
            )}
            {step === 2 && role && (
              <StepDokumen
                role={role}
                files={files}
                setFiles={setFiles}
                uploadProgress={uploadProgress}
                uploadErrors={uploadErrors}
                disabled={busy}
              />
            )}
            {step === 3 && role && (
              <StepAkses
                mode={mode}
                setMode={setMode}
                password={password}
                setPassword={setPassword}
                canManualPassword={!!canManualPassword}
                permanentPassword={role === 'B2B_CLIENT'}
              />
            )}
            {step === 4 && role && (
              <StepReview
                role={role}
                fields={fields}
                files={files}
                mode={mode}
                password={password}
              />
            )}
          </div>
        </div>
      </SmoothModal>
    </>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
const StepRole: React.FC<{
  availableRoles: WizardRole[];
  value: WizardRole | null;
  onChange: (r: WizardRole) => void;
}> = ({ availableRoles, value, onChange }) => (
  <div>
    <p className="text-xs text-slate-600 dark:text-ds-ink3 mb-4 leading-relaxed">
      Pilih peran pengguna. Setiap peran punya set dokumen KYC berbeda —
      langkah berikutnya menyesuaikan otomatis.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {availableRoles.map(r => {
        const m = ROLE_META[r];
        return (
          <RoleCard
            key={r}
            label={m.label}
            description={m.description}
            portal={m.portal}
            icon={<ModuleIcon id={m.iconId} size={28} />}
            accent={m.accent}
            selected={value === r}
            onClick={() => onChange(r)}
          />
        );
      })}
    </div>
    {availableRoles.length === 0 && (
      <p className="text-xs text-rose-700 dark:text-rose-300 py-10 text-center">
        Peran Anda tidak diizinkan membuat pengguna manapun.
      </p>
    )}
  </div>
);

const StepIdentitas: React.FC<{
  role: WizardRole;
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({ role, fields, setFields }) => {
  const matrix = FIELD_MATRIX[role];
  const inputCls = 'w-full min-w-0 bg-white dark:bg-ds-card2 border border-slate-200 dark:border-ds-border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {matrix.map((f: WizardField) => {
        const full = f.width === 'full' || f.type === 'textarea';
        const value = fields[f.key] ?? '';
        const onChange = (v: string) => setFields(prev => ({ ...prev, [f.key]: v }));
        const labelEl = (
          <label className="block text-xs font-bold text-slate-700 dark:text-ds-ink2 mb-1.5">
            {f.label}
            {f.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        );
        return (
          <div key={f.key} className={full ? 'sm:col-span-2' : ''}>
            {labelEl}
            {f.type === 'textarea' ? (
              <textarea
                className={`${inputCls} resize-none min-h-[72px]`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
              />
            ) : f.type === 'select' ? (
              <select
                className={`${inputCls} [&>option]:bg-white dark:[&>option]:bg-ds-card`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                <option value="">— Pilih —</option>
                {f.options?.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type}
                className={inputCls}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                autoComplete={f.type === 'email' ? 'off' : undefined}
              />
            )}
            {f.hint && <p className="mt-1 text-2xs text-slate-500 dark:text-ds-ink3">{f.hint}</p>}
          </div>
        );
      })}
    </div>
  );
};

const StepDokumen: React.FC<{
  role: WizardRole;
  files: Record<string, File | null>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  uploadProgress: Record<string, number>;
  uploadErrors: Record<string, string>;
  disabled?: boolean;
}> = ({ role, files, setFiles, uploadProgress, uploadErrors, disabled }) => {
  const docs = DOC_MATRIX[role];
  return (
    <div>
      <p className="text-xs text-slate-600 dark:text-ds-ink3 mb-4 leading-relaxed">
        Dokumen diupload setelah akun berhasil dibuat. Kapasitas 3 MB per file,
        JPG/PNG/WebP/PDF. Dokumen opsional bisa dilengkapi nanti via menu
        detail pengguna.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docs.map(d => (
          <FileUploadField
            key={d.key}
            label={d.label}
            hint={d.hint}
            accept={d.accept}
            required={d.required}
            value={files[d.key] ?? null}
            onChange={(f) => {
              setFiles(prev => ({ ...prev, [d.key]: f }));
            }}
            progress={uploadProgress[d.key]}
            error={uploadErrors[d.key]}
            disabled={disabled}
          />
        ))}
      </div>
      <p className="mt-4 text-2xs text-slate-500 dark:text-ds-ink3 leading-relaxed bg-slate-50 dark:bg-ds-card2 border border-slate-100 dark:border-ds-border p-3 rounded-xl">
        <strong>Catatan:</strong> maks {(KYC_FILE_MAX_BYTES / 1024 / 1024).toFixed(0)} MB/file.
        File tersimpan di bucket privat dan hanya bisa dibuka admin via signed URL.
      </p>
    </div>
  );
};

const StepAkses: React.FC<{
  mode: 'invite' | 'password';
  setMode: (m: 'invite' | 'password') => void;
  password: string;
  setPassword: (p: string) => void;
  canManualPassword: boolean;
  permanentPassword?: boolean;
}> = ({ mode, setMode, password, setPassword, canManualPassword, permanentPassword }) => (
  <div>
    <p className="text-xs text-slate-600 dark:text-ds-ink3 mb-4 leading-relaxed">
      Pilih cara pengguna masuk pertama kali.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <button
        type="button"
        onClick={() => setMode('invite')}
        className={`text-left px-4 py-4 rounded-2xl border-2 transition-all duration-200 ${
          mode === 'invite'
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-sm'
            : 'border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 hover:border-emerald-400 hover:-translate-y-0.5'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Mail size={16} className="text-emerald-600" />
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-white">Email Undangan</p>
        </div>
        <p className="text-xs text-slate-600 dark:text-ds-ink3 leading-relaxed">
          Pengguna menerima email dan menyetel sandinya sendiri. Direkomendasikan.
        </p>
      </button>
      <button
        type="button"
        onClick={() => canManualPassword && setMode('password')}
        disabled={!canManualPassword}
        className={`text-left px-4 py-4 rounded-2xl border-2 transition-all duration-200 ${
          !canManualPassword
            ? 'border-dashed border-slate-200 dark:border-ds-border bg-slate-50/60 dark:bg-ds-card2/50 opacity-70 cursor-not-allowed'
            : mode === 'password'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 shadow-sm'
              : 'border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 hover:border-amber-400 hover:-translate-y-0.5'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <KeyRound size={16} className="text-amber-600" />
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-white">Kata Sandi Manual</p>
        </div>
        <p className="text-xs text-slate-600 dark:text-ds-ink3 leading-relaxed">
          {permanentPassword
            ? 'Anda menentukan sandi awal. Ditampilkan sekali, dan berlaku permanen — pengguna langsung login dengannya.'
            : 'Anda menentukan sandi awal. Ditampilkan sekali, wajib diganti saat login pertama.'}
          {!canManualPassword && <span className="block mt-1 font-bold text-amber-700 dark:text-amber-400">Hanya MASTER_ADMIN.</span>}
        </p>
      </button>
    </div>
    {mode === 'password' && canManualPassword && (
      <PasswordField
        value={password}
        onChange={setPassword}
        placeholder="Minimal 10 karakter, 3 dari 4 kelas"
      />
    )}
  </div>
);

const StepReview: React.FC<{
  role: WizardRole;
  fields: Record<string, string>;
  files: Record<string, File | null>;
  mode: 'invite' | 'password';
  password: string;
}> = ({ role, fields, files, mode, password }) => {
  const meta = ROLE_META[role];
  const matrix = FIELD_MATRIX[role];
  const docs = DOC_MATRIX[role];
  const uploadedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: `${meta.accent}14`, color: meta.accent }}
          >
            <ModuleIcon id={meta.iconId} size={28} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{meta.label}</p>
            <p className="text-xs text-slate-600 dark:text-ds-ink3">{meta.portal}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 p-4 space-y-2">
        <p className="text-2xs font-black uppercase tracking-widest text-slate-500 dark:text-ds-ink3 mb-1">Identitas</p>
        {matrix.map(f => (
          <div key={f.key} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-ds-ink3 flex-shrink-0">{f.label}</span>
            <span className="font-bold text-slate-900 dark:text-white text-right truncate max-w-[55%]">
              {fields[f.key]?.trim() || '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 p-4 space-y-2">
        <p className="text-2xs font-black uppercase tracking-widest text-slate-500 dark:text-ds-ink3 mb-1">
          Dokumen ({uploadedCount}/{docs.length})
        </p>
        {docs.map(d => {
          const has = !!files[d.key];
          return (
            <div key={d.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-700 dark:text-ds-ink2 flex items-center gap-1.5">
                {has ? <Check size={11} className="text-emerald-600" /> : <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-ds-border" />}
                {d.label}
              </span>
              <span className={`text-2xs font-bold ${has ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-ds-ink3'}`}>
                {has ? 'Siap upload' : d.required ? 'Wajib' : 'Opsional'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 p-4">
        <p className="text-2xs font-black uppercase tracking-widest text-slate-500 dark:text-ds-ink3 mb-2">Akses Pertama</p>
        <p className="text-xs font-bold text-slate-900 dark:text-white">
          {mode === 'password' ? 'Kata Sandi Manual' : 'Email Undangan'}
        </p>
        <p className="text-2xs text-slate-500 dark:text-ds-ink3 mt-1">
          {mode === 'password'
            ? (role === 'B2B_CLIENT'
              ? 'Sandi ditampilkan sekali setelah akun dibuat, dan berlaku permanen — pengguna bisa langsung login dengannya.'
              : `Sandi akan ditampilkan sekali setelah akun dibuat. Pengguna wajib mengganti saat login.`)
            : 'Pengguna akan menerima email dengan tautan untuk menyetel sandi sendiri.'}
        </p>
        {mode === 'password' && (
          <p className="mt-2 text-2xs font-mono text-slate-500 dark:text-ds-ink3">
            Kekuatan: <span style={{ color: passwordStrength(password).color }}>{passwordStrength(password).label}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default AddUserWizard;
