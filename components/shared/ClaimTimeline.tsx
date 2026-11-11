// ClaimTimeline — the "moment of truth" stepper (owner roadmap #1).
//
// A claim is where trust is won or lost: a customer who can SEE their claim
// moving (Diajukan → Diverifikasi → Disetujui → Dibayar) recommends the app;
// one staring at a silent status badge does not. The schema stores only
// created_at/updated_at, so per-stage timestamps are honest about what we
// know: submitted time is exact, every later step renders as reached/pending
// with the last update noted once.

import { Language } from '../../types';

export type ClaimStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CLOSED';

const STEPS: Array<{ key: ClaimStatus; id: string; en: string }> = [
  { key: 'SUBMITTED', id: 'Diajukan', en: 'Submitted' },
  { key: 'UNDER_REVIEW', id: 'Diverifikasi', en: 'In review' },
  { key: 'APPROVED', id: 'Disetujui', en: 'Approved' },
  { key: 'PAID', id: 'Dibayar', en: 'Paid' },
];

interface Props {
  status: ClaimStatus;
  createdAt?: string;
  updatedAt?: string;
  lang: Language;
  /** compact = dots+line only, for list rows; full = with labels & dates. */
  variant?: 'compact' | 'full';
}

export default function ClaimTimeline({ status, createdAt, updatedAt, lang, variant = 'compact' }: Props) {
  const rejected = status === 'REJECTED';
  const closed = status === 'CLOSED';
  const idx = STEPS.findIndex(s => s.key === status);
  // CLOSED claims (historical rows) render the full chain as reached — the
  // money moved even though the row's final state was renamed.
  const reached = closed ? STEPS.length : idx < 0 ? 1 : idx + 1;

  const fmt = (iso?: string) => {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return '';
    return new Date(t).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', {
      day: 'numeric', month: 'short',
    });
  };

  return (
    <div className={variant === 'compact' ? 'mt-2.5' : 'mt-3'} role="img"
      aria-label={lang === Language.EN ? `Claim progress: ${status}` : `Progres klaim: ${status}`}>
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = !rejected && i < reached;
          const isCurrent = !rejected && !closed && i === reached - 1 && status !== 'PAID';
          return (
            <div key={s.key} className="flex items-center" style={{ flex: i === STEPS.length - 1 ? 0 : 1 }}>
              <div className="relative flex items-center justify-center">
                <span
                  className={`block rounded-full transition-colors ${
                    rejected && i === 0 ? 'bg-rose-500' : done ? 'bg-emerald-500' : isCurrent ? 'bg-emerald-100 ring-2 ring-emerald-400' : 'bg-gray-200 dark:bg-white/10'
                  }`}
                  style={{ width: 9, height: 9 }}
                />
                {isCurrent && <span className="absolute h-3.5 w-3.5 rounded-full border border-emerald-400/60 animate-ping motion-reduce:animate-none" />}
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={`mx-1 h-[2px] flex-1 rounded ${done ? 'bg-emerald-400/70' : 'bg-gray-200 dark:bg-white/10'}`}
                  style={{ minWidth: 14 }}
                />
              )}
            </div>
          );
        })}
        {rejected && (
          <span className="ml-1.5 inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-2xs font-black text-rose-500">
            {lang === Language.EN ? 'Rejected' : 'Ditolak'}
          </span>
        )}
      </div>
      {variant === 'full' && (
        <div className="mt-1.5 flex items-center justify-between text-2xs text-ds-ink3">
          <span>{lang === Language.EN ? STEPS[0].en : STEPS[0].id}{fmt(createdAt) ? ` · ${fmt(createdAt)}` : ''}</span>
          <span>{fmt(updatedAt) ? `${lang === Language.EN ? 'Updated' : 'Diperbarui'} ${fmt(updatedAt)}` : ''}</span>
        </div>
      )}
    </div>
  );
}
