// ─── Toast System ────────────────────────────────────────────────────────────
//
// Replaces the 30+ alert() calls across the app with a world-class toast
// notification system. Non-blocking, auto-dismissing, with optional action
// button.
//
// Usage:
//   const toast = useToast();
//   toast.success('Pembayaran berhasil');
//   toast.error('Gagal menyimpan', { action: { label: 'Coba lagi', onClick: retry } });
//   toast.info('Koneksi terputus — perubahanmu tersimpan lokal');
//
// Toasts stack at the bottom of the screen on mobile, top on desktop. They
// auto-dismiss after 3s (success), 5s (info/warning), 7s (error with action).

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useHaptic } from './useHaptic';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  duration: number;
}

interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3000,
  info: 5000,
  warning: 5000,
  error: 7000,
};

const VARIANT_CONFIG: Record<ToastVariant, { icon: React.ElementType; colorClass: string; bgClass: string; haptic: 'success' | 'error' | 'selection' | 'warning' }> = {
  success: { icon: CheckCircle2, colorClass: 'text-ds-green', bgClass: 'bg-ds-green-tint border-ds-green/30', haptic: 'success' },
  error:   { icon: AlertCircle,  colorClass: 'text-ds-red',   bgClass: 'bg-ds-red-tint border-ds-red/30',     haptic: 'error' },
  info:    { icon: Info,         colorClass: 'text-ds-blue',  bgClass: 'bg-ds-info-tint border-ds-blue/30',   haptic: 'selection' },
  warning: { icon: AlertTriangle,colorClass: 'text-ds-amber', bgClass: 'bg-ds-warning-tint border-ds-amber/30', haptic: 'warning' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const haptic = useHaptic();
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const show = useCallback((variant: ToastVariant, message: string, opts?: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = opts?.duration ?? DEFAULT_DURATION[variant];
    const item: ToastItem = { id, variant, message, action: opts?.action, duration };
    setToasts(prev => [...prev, item]);
    haptic.raw(VARIANT_CONFIG[variant].haptic);
    const timeout = setTimeout(() => dismiss(id), duration);
    timeoutsRef.current.set(id, timeout);
  }, [dismiss, haptic]);

  const ctx: ToastContextValue = {
    success: (m, o) => show('success', m, o),
    error:   (m, o) => show('error', m, o),
    info:    (m, o) => show('info', m, o),
    warning: (m, o) => show('warning', m, o),
    dismiss,
  };

  // Cleanup on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(t => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container — fixed bottom on mobile, top-right on desktop */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[5000] inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:w-96 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(toast => {
          const cfg = VARIANT_CONFIG[toast.variant];
          const Icon = cfg.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={[
                'pointer-events-auto',
                'flex items-start gap-3 p-3.5 rounded-2xl border shadow-ds-md',
                'animate-pop-in',
                cfg.bgClass,
              ].join(' ')}
            >
              <Icon size={18} className={`${cfg.colorClass} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ds-ink font-medium leading-snug">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action!.onClick();
                      dismiss(toast.id);
                    }}
                    className={`mt-1.5 text-xs font-bold uppercase tracking-wider ${cfg.colorClass} hover:underline`}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Tutup"
                className="shrink-0 text-ds-ink2 hover:text-ds-ink p-1"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback — return no-op functions so components don't crash
    // if used outside the provider (e.g., in legacy tests).
    return {
      success: (m: string) => console.log('[toast.success]', m),
      error:   (m: string) => console.error('[toast.error]', m),
      info:    (m: string) => console.info('[toast.info]', m),
      warning: (m: string) => console.warn('[toast.warning]', m),
      dismiss: () => {},
    };
  }
  return ctx;
}

export default ToastProvider;
