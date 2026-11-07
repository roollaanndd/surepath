// KYC matrix — per-role identity fields + document requirements.
//
// One source of truth for the AddUserWizard: both the "Identitas" step and
// the "Dokumen KYC" step read from here, as does the server when it
// validates what the gateway was given. Keep this file pure data (no React,
// no imports from the app) so the server can mirror it in Deno if needed.
//
// Role taxonomy follows UserRole + an extra 'B2B_CLIENT' bucket (the wizard
// lets admin pick it even though the enum lists it alongside internal roles).

export type WizardRole =
  | 'AGENT'
  | 'MASTER_ADMIN' | 'ADMIN'
  | 'FINANCE' | 'FINANCE_MANAGER' | 'FINANCE_DIRECTOR'
  | 'OPERATOR' | 'INSURANCE_ADMIN'
  | 'B2B_CLIENT';

export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select';

export interface WizardField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  /** For select */
  options?: Array<{ value: string; label: string }>;
  /** 'full' takes both columns, 'half' is default */
  width?: 'half' | 'full';
  /** Shown as helper text under the input */
  hint?: string;
  /** Validation regex; failure shows a generic message */
  pattern?: RegExp;
  patternMessage?: string;
  maxLength?: number;
}

export type DocType =
  | 'ktp' | 'npwp' | 'selfie_ktp' | 'sim'
  | 'company_npwp' | 'company_nib' | 'company_siup' | 'company_akta' | 'company_profile_pdf'
  | 'pic_ktp' | 'pic_npwp'
  | 'surat_penunjukan' | 'surat_penunjukan_insurer' | 'akta_kerjasama'
  | 'foto_profil';

export interface WizardDoc {
  key: DocType;
  label: string;
  required?: boolean;
  /** Shown under the card to explain what the doc is */
  hint?: string;
  /** Accepted MIME (passed to <input accept=…>) */
  accept?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Reusable field defs (DRY — same field used by many roles)
────────────────────────────────────────────────────────────────────────── */
const FIELD = {
  name: {
    key: 'name', label: 'Nama Lengkap', type: 'text', required: true,
    placeholder: 'Sesuai KTP', width: 'full', maxLength: 100,
  } as WizardField,
  email: {
    key: 'email', label: 'Email', type: 'email', required: true,
    placeholder: 'nama@domain.com',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Format email tidak valid',
  } as WizardField,
  phone: {
    key: 'phone', label: 'Nomor HP', type: 'tel', required: true,
    placeholder: '08xxxxxxxxxx',
    pattern: /^(08|\+62|62)\d{7,13}$/,
    patternMessage: 'Nomor HP Indonesia (08… atau +62…)',
  } as WizardField,
  ktp: {
    key: 'ktp', label: 'NIK KTP', type: 'text', required: true,
    placeholder: '16 digit', maxLength: 16,
    pattern: /^\d{16}$/, patternMessage: 'NIK KTP 16 digit angka',
  } as WizardField,
  address: {
    key: 'address', label: 'Alamat Domisili', type: 'textarea', required: true,
    width: 'full', maxLength: 250,
  } as WizardField,
  nip: {
    key: 'nip', label: 'NIP / Employee ID', type: 'text', required: true,
    placeholder: 'Nomor induk pegawai internal', maxLength: 32,
  } as WizardField,
  department: {
    key: 'department', label: 'Departemen', type: 'select', required: true,
    options: [
      { value: 'OPERATIONS', label: 'Operations' },
      { value: 'FINANCE', label: 'Finance' },
      { value: 'SALES', label: 'Sales' },
      { value: 'MARKETING', label: 'Marketing' },
      { value: 'TECH', label: 'Tech' },
      { value: 'LEGAL', label: 'Legal & Compliance' },
      { value: 'SUPPORT', label: 'Customer Support' },
    ],
  } as WizardField,
  bank_name: {
    key: 'bank_name', label: 'Bank', type: 'select', required: true,
    hint: 'Untuk pembayaran komisi',
    options: [
      { value: 'BCA', label: 'BCA' }, { value: 'MANDIRI', label: 'Mandiri' },
      { value: 'BNI', label: 'BNI' }, { value: 'BRI', label: 'BRI' },
      { value: 'CIMB', label: 'CIMB Niaga' }, { value: 'PERMATA', label: 'Permata' },
      { value: 'DANAMON', label: 'Danamon' }, { value: 'BTN', label: 'BTN' },
      { value: 'JAGO', label: 'Jago' }, { value: 'SEABANK', label: 'SeaBank' },
      { value: 'OTHER', label: 'Lainnya' },
    ],
  } as WizardField,
  bank_account_no: {
    key: 'bank_account_no', label: 'No. Rekening', type: 'text', required: true,
    placeholder: 'Angka saja', pattern: /^\d{6,20}$/,
    patternMessage: '6-20 digit angka',
  } as WizardField,
  bank_account_name: {
    key: 'bank_account_name', label: 'Nama di Rekening', type: 'text', required: true,
    placeholder: 'Harus sama dengan KTP', width: 'full',
  } as WizardField,
  npwp: {
    key: 'npwp', label: 'NPWP (opsional)', type: 'text',
    placeholder: '15/16 digit', maxLength: 16,
    pattern: /^(\d{15}|\d{16})$/, patternMessage: '15 atau 16 digit',
  } as WizardField,
  upline_code: {
    key: 'upline_code', label: 'Kode Upline (opsional)', type: 'text',
    placeholder: 'SP-AGT-XXXX', maxLength: 32,
    hint: 'Kosongkan jika tidak di bawah siapa-siapa',
  } as WizardField,
  approval_limit: {
    key: 'approval_limit', label: 'Batas Approval (Rp)', type: 'text', required: true,
    placeholder: 'Contoh: 10000000',
    pattern: /^\d+$/, patternMessage: 'Angka saja (tanpa titik/koma)',
    hint: 'Nilai penarikan maksimum yang bisa diapprove tanpa eskalasi',
  } as WizardField,
  assigned_insurer: {
    key: 'assigned_insurer', label: 'Penanggung Penugasan', type: 'text', required: true,
    placeholder: 'Nama perusahaan asuransi', width: 'full',
    hint: 'Untuk Operator/Insurance Admin: insurer yang menjadi tanggung jawabnya',
  } as WizardField,

  /* ── B2B PIC fields ─────────────────────────────────────────────────── */
  pic_name: {
    key: 'pic_name', label: 'Nama PIC', type: 'text', required: true,
    placeholder: 'Person in charge', width: 'full',
  } as WizardField,
  pic_email: {
    key: 'pic_email', label: 'Email PIC', type: 'email', required: true,
    placeholder: 'pic@perusahaan.co.id',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Format email tidak valid',
  } as WizardField,
  pic_phone: {
    key: 'pic_phone', label: 'HP PIC', type: 'tel', required: true,
    placeholder: '08xxxxxxxxxx',
  } as WizardField,
  pic_ktp: {
    key: 'pic_ktp', label: 'NIK KTP PIC', type: 'text',
    placeholder: '16 digit', maxLength: 16,
    pattern: /^\d{16}$/, patternMessage: '16 digit angka',
  } as WizardField,
  company_name: {
    key: 'company_name', label: 'Nama Perusahaan', type: 'text', required: true,
    placeholder: 'PT / CV …', width: 'full',
  } as WizardField,
  company_reg_no: {
    key: 'company_reg_no', label: 'NIB / No. Registrasi', type: 'text', required: true,
    placeholder: '13 digit NIB',
  } as WizardField,
  company_npwp: {
    key: 'company_npwp', label: 'NPWP Perusahaan', type: 'text', required: true,
    placeholder: '15/16 digit',
    pattern: /^(\d{15}|\d{16})$/, patternMessage: '15 atau 16 digit',
  } as WizardField,
  company_industry: {
    key: 'company_industry', label: 'Industri', type: 'select', required: true,
    options: [
      { value: 'MULTIFINANCE', label: 'Multifinance' },
      { value: 'LEASING', label: 'Leasing' },
      { value: 'LOGISTICS', label: 'Logistik & Transportasi' },
      { value: 'TRADING', label: 'Perdagangan' },
      { value: 'MANUFACTURING', label: 'Manufaktur' },
      { value: 'CONSTRUCTION', label: 'Konstruksi' },
      { value: 'MINING', label: 'Pertambangan' },
      { value: 'AGRICULTURE', label: 'Pertanian' },
      { value: 'SERVICES', label: 'Jasa' },
      { value: 'OTHER', label: 'Lainnya' },
    ],
  } as WizardField,
  company_address: {
    key: 'company_address', label: 'Alamat Perusahaan', type: 'textarea', required: true,
    width: 'full', maxLength: 300,
  } as WizardField,
} as const;

/* ──────────────────────────────────────────────────────────────────────────
   Per-role field matrix — order matters, it is the on-screen field order
────────────────────────────────────────────────────────────────────────── */
export const FIELD_MATRIX: Record<WizardRole, WizardField[]> = {
  AGENT: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.ktp, FIELD.address,
    FIELD.bank_name, FIELD.bank_account_no, FIELD.bank_account_name,
    FIELD.npwp, FIELD.upline_code,
  ],
  ADMIN: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.department,
  ],
  MASTER_ADMIN: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.department,
  ],
  FINANCE: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.department, FIELD.approval_limit,
  ],
  FINANCE_MANAGER: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.department, FIELD.approval_limit,
  ],
  FINANCE_DIRECTOR: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.department, FIELD.approval_limit,
  ],
  OPERATOR: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.assigned_insurer,
  ],
  INSURANCE_ADMIN: [
    FIELD.name, FIELD.email, FIELD.phone, FIELD.nip, FIELD.assigned_insurer,
  ],
  B2B_CLIENT: [
    FIELD.company_name, FIELD.company_reg_no, FIELD.company_npwp,
    FIELD.company_industry, FIELD.company_address,
    FIELD.pic_name, FIELD.pic_email, FIELD.pic_phone, FIELD.pic_ktp,
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
   Per-role document matrix. Required docs must be uploaded (or admin
   explicitly skips with "lengkapi nanti"); optional docs can be deferred.
────────────────────────────────────────────────────────────────────────── */
const DOC = {
  ktp: {
    key: 'ktp', label: 'KTP', required: true,
    hint: 'Scan/foto KTP yang jelas, seluruh wajah & tulisan terbaca',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  npwp: {
    key: 'npwp', label: 'NPWP', required: true,
    hint: 'Kartu NPWP atau surat keterangan',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  selfie_ktp: {
    key: 'selfie_ktp', label: 'Selfie + KTP (opsional)',
    hint: 'Foto memegang KTP di samping wajah',
    accept: 'image/jpeg,image/png,image/webp',
  } as WizardDoc,
  sim: {
    key: 'sim', label: 'SIM (opsional)',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  foto_profil: {
    key: 'foto_profil', label: 'Foto Profil (opsional)',
    accept: 'image/jpeg,image/png,image/webp',
  } as WizardDoc,
  surat_penunjukan: {
    key: 'surat_penunjukan', label: 'Surat Penunjukan (opsional)',
    hint: 'Surat tugas dari HR / pimpinan',
    accept: 'application/pdf,image/jpeg,image/png',
  } as WizardDoc,
  surat_penunjukan_insurer: {
    key: 'surat_penunjukan_insurer', label: 'Surat Penunjukan Insurer', required: true,
    hint: 'Surat penugasan menangani penanggung tertentu',
    accept: 'application/pdf,image/jpeg,image/png',
  } as WizardDoc,
  /* B2B */
  company_npwp: {
    key: 'company_npwp', label: 'NPWP Perusahaan', required: true,
    hint: 'NPWP badan usaha',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  company_nib: {
    key: 'company_nib', label: 'NIB / SIUP', required: true,
    hint: 'Nomor Induk Berusaha atau SIUP',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  pic_ktp: {
    key: 'pic_ktp', label: 'KTP PIC', required: true,
    hint: 'KTP person in charge',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  company_akta: {
    key: 'company_akta', label: 'Akta Pendirian (opsional)',
    hint: 'Akta pendirian + perubahan terakhir',
    accept: 'application/pdf',
  } as WizardDoc,
  company_profile_pdf: {
    key: 'company_profile_pdf', label: 'Company Profile PDF (opsional)',
    accept: 'application/pdf',
  } as WizardDoc,
  pic_npwp: {
    key: 'pic_npwp', label: 'NPWP PIC (opsional)',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  } as WizardDoc,
  akta_kerjasama: {
    key: 'akta_kerjasama', label: 'Akta Kerjasama (opsional)',
    hint: 'Perjanjian keagenan yang sudah ditandatangani',
    accept: 'application/pdf',
  } as WizardDoc,
};

export const DOC_MATRIX: Record<WizardRole, WizardDoc[]> = {
  AGENT: [DOC.ktp, DOC.npwp, DOC.selfie_ktp, DOC.sim, DOC.akta_kerjasama],
  ADMIN: [DOC.ktp, DOC.foto_profil],
  MASTER_ADMIN: [DOC.ktp, DOC.foto_profil],
  FINANCE: [DOC.ktp, DOC.surat_penunjukan],
  FINANCE_MANAGER: [DOC.ktp, DOC.surat_penunjukan],
  FINANCE_DIRECTOR: [DOC.ktp, DOC.surat_penunjukan],
  OPERATOR: [DOC.ktp],
  INSURANCE_ADMIN: [DOC.ktp, DOC.surat_penunjukan_insurer],
  B2B_CLIENT: [DOC.company_npwp, DOC.company_nib, DOC.pic_ktp, DOC.company_akta, DOC.company_profile_pdf, DOC.pic_npwp],
};

/* ──────────────────────────────────────────────────────────────────────────
   Role display metadata — icon ids match ModuleIcon keys, description
   explains what the account will do.
────────────────────────────────────────────────────────────────────────── */
export interface RoleMeta {
  label: string;
  description: string;
  iconId: string;
  /** Visual accent on the role card */
  accent: string;
  /** Portal the role will end up in */
  portal: string;
  /** Which backend action creates this user */
  createAction: 'admin_create_mitra' | 'admin_create_internal_user' | 'admin_create_b2b_user';
  /** Only these caller roles can create this role */
  requiredCallerRoles: string[];
  /** Whether a "set manual password" mode is available (MASTER_ADMIN only) */
  canSetManualPassword: boolean;
}

export const ROLE_META: Record<WizardRole, RoleMeta> = {
  AGENT: {
    label: 'Mitra (Agent)',
    description: 'Menjual polis, dapat komisi ke rekening. Perlu KTP + rekening.',
    iconId: 'agents',
    accent: '#059669',
    portal: '/agapps',
    createAction: 'admin_create_mitra',
    requiredCallerRoles: ['ADMIN', 'MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  MASTER_ADMIN: {
    label: 'Master Admin',
    description: 'Akses penuh platform. Hanya Master Admin yang bisa membuat.',
    iconId: 'security', accent: '#7C3AED', portal: '/admin',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  ADMIN: {
    label: 'Admin',
    description: 'Akses CMS tanpa setting sensitif. Buat master/role lain.',
    iconId: 'user_mgmt', accent: '#4338CA', portal: '/admin',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  FINANCE: {
    label: 'Finance L1',
    description: 'Approve penarikan ≤ batas. Review pembayaran.',
    iconId: 'withdrawals', accent: '#0891B2', portal: '/admin',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['ADMIN', 'MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  FINANCE_MANAGER: {
    label: 'Finance L2',
    description: 'Approve penarikan 10jt-25jt. Eskalasi dari L1.',
    iconId: 'withdrawals', accent: '#0369A1', portal: '/admin',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['ADMIN', 'MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  FINANCE_DIRECTOR: {
    label: 'Finance L3',
    description: 'Approve penarikan ≥25jt. Final authority keuangan.',
    iconId: 'withdrawals', accent: '#1E40AF', portal: '/admin',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  OPERATOR: {
    label: 'Operator',
    description: 'Proses polis harian. Tidak akses keuangan.',
    iconId: 'ops_console', accent: '#F59E0B', portal: '/operatorapp',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['ADMIN', 'MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  INSURANCE_ADMIN: {
    label: 'Insurance Admin',
    description: 'Mewakili penanggung. Kelola polis insurer-nya.',
    iconId: 'insurers', accent: '#DB2777', portal: '/insurerapp',
    createAction: 'admin_create_internal_user',
    requiredCallerRoles: ['ADMIN', 'MASTER_ADMIN'],
    canSetManualPassword: true,
  },
  B2B_CLIENT: {
    label: 'Klien B2B (Korporat)',
    description: 'Multifinance, logistik, dsb. Ajukan polis flotila.',
    iconId: 'b2b', accent: '#9333EA', portal: '/b2bapps',
    createAction: 'admin_create_b2b_user',
    requiredCallerRoles: ['ADMIN', 'MASTER_ADMIN'],
    canSetManualPassword: true,
  },
};

/** Filter role list for a given caller role. */
export function rolesAvailableFor(callerRole: string | undefined | null): WizardRole[] {
  const all: WizardRole[] = [
    'AGENT', 'B2B_CLIENT',
    'OPERATOR', 'INSURANCE_ADMIN',
    'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR',
    'ADMIN', 'MASTER_ADMIN',
  ];
  return all.filter(r => ROLE_META[r].requiredCallerRoles.includes(callerRole ?? ''));
}
