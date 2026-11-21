// B2BClaims.tsx — roadmap B2B #1 (v2.9.31): portal klaim untuk klien korporat.
//
// Konteks yang dibayangkan:
//   Finance ops di perusahaan multi-unit mengalami insiden pada salah satu
//   armada (tabrakan, pencurian, kerusakan). Sebelum PR ini satu-satunya
//   jalur adalah email/telepon ke admin SurePath; klien kehilangan SLA
//   visibility dan admin menerima input tak terstruktur.
//
//   Sekarang: layar daftar klaim (ini) + layar ajuan baru (`B2BNewClaim`)
//   memberi klien jendela sendiri. Daftar menampilkan status + tanggal +
//   estimasi + unit yang terdampak; status chip memberi tahu klien tahap
//   proses tanpa mereka harus bertanya.
//
//   Aktor masking tidak dipakai di sini karena informasi klaim bukan
//   aktivitas sistem — apa yang klien lihat adalah apa yang admin lihat.

import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, RefreshCw, Plus, Calendar, MapPin, FileText } from 'lucide-react';
import { Language } from '../../types';
import { getMyB2BClaims } from '../../services/claims';
import type { SpClaim } from '../../services/dbTypes';
import { formatIDR } from '../car-wizard/WizardUI';
import { B2BGlass, B2BPill, B2BSectionHeader, B2BButton, type B2BPillTone } from './dashboard/ui';

interface Props {
  lang: Language;
  onNewClaim: () => void;
}

const STATUS_META: Record<string, { tone: B2BPillTone; id: string; en: string }> = {
  SUBMITTED:    { tone: 'info',    id: 'Diajukan',       en: 'Submitted' },
  UNDER_REVIEW: { tone: 'warn',    id: 'Dalam Review',   en: 'Under Review' },
  APPROVED:     { tone: 'success', id: 'Disetujui',      en: 'Approved' },
  REJECTED:     { tone: 'danger',  id: 'Ditolak',        en: 'Rejected' },
  PAID:         { tone: 'success', id: 'Dibayar',        en: 'Paid' },
};

const fmtDate = (iso: string | null | undefined, lang: Language) =>
  iso
    ? new Date(iso).toLocaleDateString(lang === Language.EN ? 'en-GB' : 'id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

const B2BClaims: React.FC<Props> = ({ lang, onNewClaim }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [rows, setRows] = useState<SpClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    const nextOffset = reset ? 0 : offset;
    const batch = await getMyB2BClaims({ limit: PAGE_SIZE, offset: nextOffset });
    setRows(prev => reset ? batch : [...prev, ...batch]);
    setHasMore(batch.length === PAGE_SIZE);
    setOffset(nextOffset + batch.length);
    setLoading(false);
  }, [offset]);

  useEffect(() => { void load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      <B2BGlass className="p-6">
        <B2BSectionHeader
          title={t('Claims', 'Klaim')}
          subtitle={t(
            'Report incidents and track the review status of each claim.',
            'Laporkan insiden armada dan pantau status setiap klaim.',
          )}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => load(true)}
                disabled={loading}
                aria-label={t('Reload', 'Muat ulang')}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {t('Reload', 'Muat ulang')}
              </button>
              <B2BButton variant="primary" icon={Plus} onClick={onNewClaim}>
                {t('New Claim', 'Ajukan Klaim')}
              </B2BButton>
            </div>
          }
        />

        {loading && rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">
            {t('Loading claims…', 'Memuat klaim…')}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <ClipboardList size={32} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-500 mb-4">
              {t('No claims yet.', 'Belum ada klaim.')}
            </p>
            <B2BButton variant="primary" icon={Plus} onClick={onNewClaim}>
              {t('File your first claim', 'Ajukan klaim pertama')}
            </B2BButton>
          </div>
        ) : (
          <ol className="space-y-3">
            {rows.map((c) => {
              const meta = STATUS_META[c.status ?? 'SUBMITTED'] ?? { tone: 'neutral' as B2BPillTone, id: c.status ?? '-', en: c.status ?? '-' };
              return (
                <li key={c.id} className="p-4 rounded-xl border border-slate-200/70 hover:bg-white/60 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-black text-slate-900" style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>
                          {c.claim_number}
                        </p>
                        <B2BPill tone={meta.tone}>
                          {lang === Language.EN ? meta.en : meta.id}
                        </B2BPill>
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        {t('Unit:', 'Unit:')} <span className="font-bold">{c.policy_number ?? '—'}</span>
                      </p>
                    </div>
                    {c.amount_estimated && (
                      <p className="text-sm font-black text-slate-900 tabular-nums flex-shrink-0"
                         style={{ fontFamily: '"JetBrains Mono",monospace' }}>
                        {formatIDR(c.amount_estimated)}
                      </p>
                    )}
                  </div>

                  {c.description && (
                    <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
                      {c.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[10px] text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={10} />
                      {t('Incident:', 'Kejadian:')} {fmtDate(c.incident_date ?? c.date, lang)}
                    </span>
                    {c.location && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin size={10} />
                        {c.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <FileText size={10} />
                      {t('Filed:', 'Diajukan:')} {fmtDate(c.created_at, lang)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {hasMore && rows.length > 0 && (
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loading}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {loading ? t('Loading…', 'Memuat…') : t('Load older', 'Muat lebih lama')}
            </button>
          </div>
        )}
      </B2BGlass>

      <p className="text-[11px] text-slate-500 leading-relaxed text-center">
        {t(
          'Claim status updates are visible here as the SurePath team reviews them. For urgent incidents outside business hours, call support.',
          'Pembaruan status klaim muncul di sini saat tim SurePath mereview. Untuk insiden darurat di luar jam kerja, hubungi support.',
        )}
      </p>
    </div>
  );
};

export default B2BClaims;
