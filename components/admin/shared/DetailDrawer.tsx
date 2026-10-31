// Admin Portal 2.0 — shared DetailDrawer.
//
// A side-panel shell for "open a record, decide, close" flows — replacing
// the centered full-screen modal each admin view used to roll on its own
// (PolicyOrdersAdmin's OrderDetailModal was the first; see git history for
// that migration). Width/anatomy follow the spec already agreed in
// docs/UI_REDESIGN_2026-10.md §4: 480px, header summary, scrollable body,
// sticky action footer, Esc to close, focus trapped inside while open.
//
// This component owns none of the record's data or business logic — it is
// a layout shell. The caller still owns everything that happens inside it
// (status changes, uploads, commission math, …) exactly as before.
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Usually a status badge, rendered next to the close button. */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky footer, usually the primary/secondary action buttons. */
  footer?: React.ReactNode;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open, onClose, title, subtitle, headerExtra, children, footer,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Esc to close + a basic focus trap: Tab/Shift+Tab wrap inside the panel
  // while open, and focus returns to whatever opened the drawer on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" role="presentation">
      {/* Clicking the backdrop closes the drawer; the panel itself stops the click. */}
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-[480px] flex-col bg-ds-card shadow-2xl animate-slide-in-right"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ds-border p-5">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black tracking-tight text-ds-ink">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 truncate text-2xs font-bold uppercase tracking-widest text-ds-ink3">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-card2 text-ds-ink3 hover:text-ds-ink"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex-shrink-0 border-t border-ds-border p-5">{footer}</div>
        )}
      </div>
    </div>
  );
};

export default DetailDrawer;
