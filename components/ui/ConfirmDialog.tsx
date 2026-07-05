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
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

interface ConfirmContextValue {
  confirm: ConfirmFn;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [loading, setLoading] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const haptic = useHaptic();

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({ opts, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    if (ok) haptic.success();
    else haptic.tap();
    setLoading(false);
    setPending(null);
    if (resolveRef.current) {
      resolveRef.current(ok);
      resolveRef.current = null;
    }
  }, [haptic]);

  // Close on Escape
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[5100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close(false);
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
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => close(false)}
                disabled={loading}
              >
                {pending.opts.cancelLabel ?? 'Batal'}
              </Button>
              <Button
                variant={pending.opts.variant === 'danger' ? 'danger' : 'primary'}
                size="md"
                onClick={() => close(true)}
                loading={loading}
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

export default ConfirmDialogProvider;
