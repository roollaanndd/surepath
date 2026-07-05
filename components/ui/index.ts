// ─── SurePath UI Library — World-Class Component Primitives ──────────────────
//
// Single import surface for the new design system primitives. Each component
// consumes only the v3 design tokens (no inline styles allowed) and meets
// WCAG AA accessibility standards.
//
// Migration guide (existing components → ui/ primitives):
//   - <button className="bg-emerald-500 ...">  →  <Button variant="primary">
//   - <button className="w-8 h-8 ..."><Icon/></button>  →  <IconButton aria-label="...">
//   - <div className="rounded-2xl border ...">  →  <Card>
//   - alert('...')  →  toast.error('...')
//   - window.confirm('...')  →  const ok = await confirm({ ... })
//   - <div className="animate-spin ...">  →  <SkeletonCard />

export { Button, type ButtonProps } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { Card, type CardProps } from './Card';
export { ToastProvider, useToast } from './Toast';
export { ConfirmDialogProvider, useConfirmDialog } from './ConfirmDialog';
export { Skeleton, SkeletonCard, SkeletonList, SkeletonText } from './Skeleton';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { useHaptic, type HapticPattern } from './useHaptic';
