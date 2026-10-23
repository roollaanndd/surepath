// ─── ConfirmDialog Primitive ─────────────────────────────────────────────────
//
// Replaces the 30+ window.confirm() calls across the app with a world-class
// bottom-sheet confirmation on mobile, centered modal on desktop.
//
// Usage:
//   const confirm = useConfirmDialog();
//   const ok = await confirm({
//     title: 'Batalkan pesanan?',
//     description: 'Tindakan ini tidak dapat dibatalkan.',
//     confirmLabel: 'Ya, batalkan',
//     cancelLabel: 'Tetap pesan',
//     variant: 'danger',
//   });
//   if (ok) doCancel();

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { useHaptic } from './useHaptic';

type Variant = 'default' | 'danger' | 'primary';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  /**
   * Ask for a line of text alongside the confirmation — the replacement for
   * `window.prompt()`, which browsers may suppress entirely and which offers
   * no label, no validation and no styling. Use `usePromptDialog()` to read
   * the answer; `useConfirmDialog()` still resolves to a plain boolean.
   */
  input?: {
    label: string;
    placeholder?: string;
    /** Block confirmation until the field is non-blank. Default: false. */
    required?: boolean;
    multiline?: boolean;
  };
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
/** Resolves to the text entered, or null when the dialog was dismissed. */
type PromptFn = (opts: ConfirmOptions & { input: NonNullable<ConfirmOptions['input']> }) => Promise<string | null>;

interface ConfirmContextValue {
  confirm: ConfirmFn;
  prompt: PromptFn;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingConfirm {
  opts: ConfirmOptions;
}

/** What the dialog resolves with: the choice, plus any text that was typed. */
interface ConfirmResult {
  ok: boolean;
  value: string;
}

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const resolveRef = useRef<((result: ConfirmResult) => void) | null>(null);
  const haptic = useHaptic();

  const open = useCallback((opts: ConfirmOptions) => {
    return new Promise<ConfirmResult>((resolve) => {
      // A second dialog opened while one is pending would otherwise strand the
      // first caller's promise forever; settle it as a dismissal first.
      resolveRef.current?.({ ok: false, value: '' });
      resolveRef.current = resolve;
      setValue('');
      setPending({ opts });
    });
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (opts) => open(opts).then(r => r.ok),
    [open],
  );

  const prompt = useCallback<PromptFn>(
    (opts) => open(opts).then(r => (r.ok ? r.value : null)),
    [open],
  );

  const close = useCallback((ok: boolean, text: string) => {
    if (ok) haptic.success();
    else haptic.tap();
    setLoading(false);
    setPending(null);
    setValue('');
    if (resolveRef.current) {
      resolveRef.current({ ok, value: text });
      resolveRef.current = null;
    }
  }, [haptic]);

  // A required field that is still blank must block confirmation everywhere:
  // the button, the Enter key and the form submit all read this one value.
  const blocked = !!pending?.opts.input?.required && value.trim() === '';

  // Close on Escape
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false, '');
      // Enter inside a multiline field inserts a newline rather than submitting.
      if (e.key === 'Enter' && !pending.opts.input?.multiline && !blocked) close(true, value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, close, value, blocked]);

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[5100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close(false, '');
          }}
        >
          <div
            className="w-full sm:max-w-sm bg-ds-card rounded-t-3xl sm:rounded-3xl border border-ds-border shadow-ds-lg p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-pop-in"
          >
            <div className="flex items-start gap-3 mb-4">
              {pending.opts.variant === 'danger' && (
                <div className="w-10 h-10 rounded-xl bg-ds-red-tint flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-ds-red" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 id="confirm-title" className="text-base font-bold text-ds-ink leading-tight">
                  {pending.opts.title}
                </h2>
                {pending.opts.description && (
                  <p className="mt-1 text-sm text-ds-ink2 leading-relaxed">{pending.opts.description}</p>
                )}
              </div>
            </div>
            {pending.opts.input && (
              <div className="mb-4">
                <label htmlFor="confirm-input" className="block text-xs font-bold text-ds-ink2 mb-1.5">
                  {pending.opts.input.label}
                </label>
                {pending.opts.input.multiline ? (
                  <textarea
                    id="confirm-input"
                    autoFocus
                    rows={3}
                    value={value}
                    placeholder={pending.opts.input.placeholder}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full rounded-lg border border-ds-border bg-ds-card2 px-3 py-2 text-sm text-ds-ink placeholder:text-ds-ink3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green"
                  />
                ) : (
                  <input
                    id="confirm-input"
                    autoFocus
                    type="text"
                    value={value}
                    placeholder={pending.opts.input.placeholder}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-ds-border bg-ds-card2 px-3 text-sm text-ds-ink placeholder:text-ds-ink3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green"
                  />
                )}
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => close(false, '')}
                disabled={loading}
              >
                {pending.opts.cancelLabel ?? 'Batal'}
              </Button>
              <Button
                variant={pending.opts.variant === 'danger' ? 'danger' : 'primary'}
                size="md"
                onClick={() => close(true, value)}
                loading={loading}
                disabled={blocked}
              >
                {pending.opts.confirmLabel ?? 'Konfirmasi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirmDialog(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to native confirm() if used outside the provider
    return (opts: ConfirmOptions) => Promise.resolve(window.confirm(`${opts.title}\n\n${opts.description ?? ''}`));
  }
  return ctx.confirm;
}

/**
 * Ask for a line of text. Resolves to what was typed, or null if dismissed —
 * the same contract as `window.prompt()`, which this replaces.
 */
export function usePromptDialog(): PromptFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return (opts) => Promise.resolve(window.prompt(opts.input.label) ?? null);
  }
  return ctx.prompt;
}

export default ConfirmDialogProvider;
