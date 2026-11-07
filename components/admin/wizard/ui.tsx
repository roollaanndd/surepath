// Wizard primitives — SmoothModal, StepIndicator, FileUploadField,
// PasswordField, RoleCard, KycDocCard. One file so the AddUserWizard pulls
// its full vocabulary from one import and all animations stay consistent.
//
// Emerald SurePath palette + design floor (no sub-11px text, respects
// prefers-reduced-motion). Builds on top of AdminModal/AdminStyles patterns
// introduced in v2.8.4 — keeps a single motion language in the admin shell.

import React, { useEffect, useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  X, Check, Upload, FileText, Image as ImageIcon, Loader2, Eye, EyeOff,
  Copy, RefreshCw, AlertCircle,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
   Global styles for the wizard. Mounted once by the host component.
────────────────────────────────────────────────────────────────────────── */
export const WizardStyles: React.FC = () => (
  <style>{`
    @keyframes wiz-backdrop-in { from { opacity: 0; backdrop-filter: blur(0px) } to { opacity: 1; backdrop-filter: blur(4px) } }
    @keyframes wiz-panel-in { from { opacity: 0; transform: translateY(16px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
    @keyframes wiz-panel-out { from { opacity: 1; transform: translateY(0) scale(1) } to { opacity: 0; transform: translateY(8px) scale(.98) } }
    @keyframes wiz-step-in { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: translateX(0) } }
    @keyframes wiz-step-back-in { from { opacity: 0; transform: translateX(-16px) } to { opacity: 1; transform: translateX(0) } }
    @keyframes wiz-pulse { 0%,100% { transform: scale(1); opacity: .5 } 50% { transform: scale(1.5); opacity: 0 } }
    @keyframes wiz-pop-check { 0% { transform: scale(0) rotate(-8deg); opacity: 0 } 60% { transform: scale(1.15) rotate(2deg); opacity: 1 } 100% { transform: scale(1) rotate(0) } }
    @keyframes wiz-ripple { 0% { transform: scale(0); opacity: .35 } 100% { transform: scale(2.4); opacity: 0 } }

    .wiz-backdrop { animation: wiz-backdrop-in .22s cubic-bezier(.2,.8,.2,1) both }
    .wiz-panel-in { animation: wiz-panel-in .26s cubic-bezier(.2,.8,.2,1) both }
    .wiz-panel-out { animation: wiz-panel-out .18s cubic-bezier(.2,.8,.2,1) both }
    .wiz-step-forward { animation: wiz-step-in .28s cubic-bezier(.2,.8,.2,1) both }
    .wiz-step-back { animation: wiz-step-back-in .28s cubic-bezier(.2,.8,.2,1) both }
    .wiz-pop-check { animation: wiz-pop-check .35s cubic-bezier(.2,.8,.2,1) both }

    /* Button ripple */
    .wiz-ripple { position: relative; overflow: hidden }
    .wiz-ripple::after {
      content: ''; position: absolute; left: var(--wx, 50%); top: var(--wy, 50%);
      width: 10px; height: 10px; margin-left: -5px; margin-top: -5px;
      border-radius: 50%; background: rgba(255,255,255,.55); opacity: 0;
      pointer-events: none;
    }
    .wiz-ripple.is-ripping::after { animation: wiz-ripple .55s cubic-bezier(.2,.8,.2,1) both }

    @media (prefers-reduced-motion: reduce) {
      .wiz-backdrop, .wiz-panel-in, .wiz-panel-out,
      .wiz-step-forward, .wiz-step-back, .wiz-pop-check { animation: none !important }
    }
  `}</style>
);

/* ──────────────────────────────────────────────────────────────────────────
   SmoothModal — replaces AdminModal for this wizard. Scale+slide enter,
   backdrop blur fade, esc/backdrop close. z-index above toast (90), palette
   (80), focus bar (70) so nothing hides it.
────────────────────────────────────────────────────────────────────────── */
export const SmoothModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'lg' | 'xl' | '2xl' | '3xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Blocks close while true (during submit) */
  busy?: boolean;
}> = ({ open, onClose, title, subtitle, icon, size = '2xl', footer, children, busy }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  const sizeClass = {
    lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-5">
      <div
        aria-hidden
        onClick={() => !busy && onClose()}
        className="wiz-backdrop absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.42)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`wiz-panel-in relative z-10 w-full ${sizeClass} max-h-[92dvh] flex flex-col bg-white dark:bg-ds-card text-slate-900 dark:text-white rounded-2xl sm:rounded-3xl shadow-[0_24px_80px_rgba(15,23,42,0.28)] border border-slate-200 dark:border-ds-border overflow-hidden`}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 sm:px-7 sm:py-5 border-b border-slate-100 dark:border-ds-border">
          <div className="flex items-start gap-3 min-w-0">
            {icon && <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">{icon}</div>}
            <div className="min-w-0">
              <h2 className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-ds-ink3">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-ds-card2 text-slate-500 dark:text-ds-ink3 hover:text-slate-900 dark:hover:text-slate-100 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5">
          {children}
        </div>
        {footer && (
          <footer className="flex-shrink-0 px-5 py-4 sm:px-7 sm:py-5 border-t border-slate-100 dark:border-ds-border bg-slate-50/50 dark:bg-ds-card2/40">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   StepIndicator — horizontal progress with pill segments. Not clickable
   to prevent skipping validation; click-to-prev handled by caller via
   explicit "Back" button.
────────────────────────────────────────────────────────────────────────── */
export const StepIndicator: React.FC<{
  steps: Array<{ label: string }>;
  current: number;
  onStepClick?: (i: number) => void;
}> = ({ steps, current, onStepClick }) => (
  <div className="flex items-center gap-2">
    {steps.map((s, i) => {
      const active = i === current;
      const done = i < current;
      const clickable = done && onStepClick;
      return (
        <React.Fragment key={s.label}>
          <button
            type="button"
            onClick={() => clickable && onStepClick(i)}
            disabled={!clickable}
            className={`flex items-center gap-2 transition-all duration-200 ${clickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}`}
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-2xs font-black transition-colors ${
                done ? 'bg-emerald-600 text-white' :
                active ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/25' :
                'bg-slate-100 dark:bg-ds-card2 text-slate-500 dark:text-ds-ink3'
              }`}
            >
              {done ? <Check size={13} className="wiz-pop-check" /> : i + 1}
            </span>
            <span className={`hidden sm:inline text-xs font-bold tracking-tight ${
              done || active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-ds-ink3'
            }`}>
              {s.label}
            </span>
          </button>
          {i < steps.length - 1 && (
            <span
              className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
                done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-ds-border'
              }`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
   FileUploadField — click-or-drop, preview, inline progress, error state.
   The caller owns the upload itself; this component only surfaces the
   chosen File + the progress/error state the caller reports back.
────────────────────────────────────────────────────────────────────────── */
export interface UploadedDoc {
  path: string;
  size_bytes: number;
  mime: string;
  uploaded_at: string;
}
export const FileUploadField: React.FC<{
  label: string;
  hint?: string;
  accept?: string;
  required?: boolean;
  value: File | UploadedDoc | null;
  onChange: (file: File | null) => void;
  /** 0-1 progress during upload */
  progress?: number;
  /** Error message to show below the field */
  error?: string | null;
  disabled?: boolean;
}> = ({ label, hint, accept = 'image/*,application/pdf', required, value, onChange, progress, error, disabled }) => {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFile = value instanceof File;
  const isUploaded = value && !isFile;
  const fileName = isFile ? value.name : isUploaded ? (value as UploadedDoc).path.split('/').pop() : null;
  const fileSize = isFile ? value.size : isUploaded ? (value as UploadedDoc).size_bytes : 0;
  const mime = isFile ? value.type : isUploaded ? (value as UploadedDoc).mime : '';
  const isImage = mime?.startsWith('image/');

  const uploading = typeof progress === 'number' && progress < 1 && !error;

  const handleFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (f && !disabled) onChange(f);
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-ds-ink2 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer?.files ?? null);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed' :
          dragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 scale-[1.01]' :
          error ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-500/10' :
          value ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-500/5 hover:border-emerald-400' :
          'border-slate-200 dark:border-ds-border bg-slate-50/60 dark:bg-ds-card2 hover:border-emerald-400 hover:bg-emerald-50/30'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {value ? (
          <>
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-ds-card flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
              {isImage ? <ImageIcon size={16} className="text-emerald-600" /> : <FileText size={16} className="text-emerald-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{fileName}</p>
              <p className="text-2xs text-slate-500 dark:text-ds-ink3">
                {(fileSize / 1024).toFixed(1)} KB
                {isUploaded && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">✓ Terunggah</span>}
                {uploading && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">Mengunggah {Math.round((progress ?? 0) * 100)}%…</span>}
              </p>
              {uploading && (
                <div className="mt-1.5 h-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            {!uploading && !disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                aria-label="Hapus file"
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-ds-card flex items-center justify-center">
              <Upload size={16} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Klik atau tarik file ke sini</p>
              {hint && <p className="text-2xs text-slate-500 dark:text-ds-ink3">{hint}</p>}
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-2xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   PasswordField — animated strength meter + visibility toggle + generate.
────────────────────────────────────────────────────────────────────────── */
export const passwordStrength = (p: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } => {
  if (!p) return { score: 0, label: 'Belum ada', color: '#CBD5E1' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(p)).length;
  const long = p.length >= 10;
  const vlong = p.length >= 14;
  if (!long) return { score: 1, label: 'Terlalu pendek', color: '#E11D48' };
  if (classes < 3) return { score: 2, label: 'Masih lemah', color: '#F59E0B' };
  if (!vlong) return { score: 3, label: 'Cukup', color: '#059669' };
  return { score: 4, label: 'Kuat', color: '#047857' };
};

export const generateStrongPassword = (length = 14): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};

export const PasswordField: React.FC<{
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  showStrength?: boolean;
  showGenerate?: boolean;
}> = ({ label = 'Kata Sandi', value, onChange, placeholder = 'Minimal 10 karakter', disabled, autoComplete = 'new-password', showStrength = true, showGenerate = true }) => {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const strength = passwordStrength(value);

  const inputCls = 'w-full min-w-0 bg-white dark:bg-ds-card2 border border-slate-200 dark:border-ds-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all';

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-ds-ink2">{label}</label>
          {showGenerate && !disabled && (
            <button
              type="button"
              onClick={() => { onChange(generateStrongPassword()); setShow(true); }}
              className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={11} /> Generate kuat
            </button>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`${inputCls} pr-24`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); }
                catch { /* ignore */ }
              }}
              aria-label="Salin"
              className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              title={copied ? 'Tersalin!' : 'Salin'}
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>
      {showStrength && (
        <div className="mt-2">
          <div className="h-1 rounded-full bg-slate-200 dark:bg-ds-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${(strength.score / 4) * 100}%`,
                background: strength.color,
              }}
            />
          </div>
          <p className="mt-1 text-2xs font-bold text-slate-600 dark:text-ds-ink3">
            Kekuatan: <span style={{ color: strength.color }}>{strength.label}</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   RoleCard — big visual role picker. Shows portal + description.
────────────────────────────────────────────────────────────────────────── */
export const RoleCard: React.FC<{
  label: string;
  description: string;
  portal: string;
  icon: React.ReactNode;
  accent: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, description, portal, icon, accent, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      selected
        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-sm'
        : 'border-slate-200 dark:border-ds-border bg-white dark:bg-ds-card2 hover:border-emerald-400 hover:-translate-y-0.5 hover:shadow-md'
    }`}
    style={selected ? { boxShadow: `0 8px 24px -14px ${accent}66` } : {}}
  >
    {selected && (
      <span
        aria-hidden
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center wiz-pop-check"
        style={{ background: accent, color: 'white' }}
      >
        <Check size={13} />
      </span>
    )}
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
      style={{ background: `${accent}14`, color: accent }}
    >
      {icon}
    </div>
    <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{label}</p>
    <p className="mt-1 text-xs text-slate-600 dark:text-ds-ink3 leading-snug">{description}</p>
    <p className="mt-2 inline-block text-2xs font-mono font-bold text-slate-500 dark:text-ds-ink3 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-ds-card">
      {portal}
    </p>
  </button>
);

/* ──────────────────────────────────────────────────────────────────────────
   Primary action button with ripple on press.
────────────────────────────────────────────────────────────────────────── */
export const WizardButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
}> = ({ variant = 'primary', icon: Icon, children, className = '', loading, onClick, ...rest }) => {
  const base = 'wiz-ripple inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
  const variantCls = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md',
    ghost: 'bg-slate-100 dark:bg-ds-card2 text-slate-700 dark:text-ds-ink2 hover:bg-slate-200 dark:hover:bg-white/5',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  }[variant];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--wx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--wy', `${e.clientY - rect.top}px`);
    el.classList.remove('is-ripping');
    void el.offsetWidth;
    el.classList.add('is-ripping');
    onClick?.(e);
  };

  return (
    <button
      {...rest}
      onClick={handleClick}
      className={`${base} ${variantCls} ${className}`}
      disabled={rest.disabled || loading}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
};
