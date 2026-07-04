import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Image, User, Eye, Filter, Search, FileImage, Shield,
} from 'lucide-react';
import { getAllOrders, callGateway, supabase, resolveDocumentUrl } from '../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'policy' | 'vehicle' | 'ktp' | 'claim';

interface DocItem {
  id: string;
  type: DocType;
  url: string;
  ownerName: string;
  ref: string;       // order_number / claim_number / email
  status: string;
  date: string;
  isPdf?: boolean;
}

type FilterTab = 'all' | DocType;

const TYPE_META: Record<DocType, { label: string; badgeCls: string; icon: React.ElementType }> = {
  policy:  { label: 'Policy Doc',      badgeCls: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   icon: FileText  },
  vehicle: { label: 'Vehicle Image',   badgeCls: 'bg-green-500/15 text-green-400 border-green-500/20', icon: Image     },
  ktp:     { label: 'KTP',             badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: User      },
  claim:   { label: 'Claim Photo',     badgeCls: 'bg-rose-500/15 text-rose-400 border-rose-500/20',    icon: Shield    },
};

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',     label: 'Semua'          },
  { id: 'policy',  label: 'Policy Docs'    },
  { id: 'vehicle', label: 'Vehicle Images' },
  { id: 'ktp',     label: 'KTP'            },
  { id: 'claim',   label: 'Claim Photos'   },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden animate-pulse">
    <div className="h-40 bg-white/5" />
    <div className="p-4 space-y-2">
      <div className="h-3 bg-white/10 rounded w-2/3" />
      <div className="h-2.5 bg-white/5 rounded w-1/2" />
      <div className="h-2.5 bg-white/5 rounded w-1/3" />
    </div>
  </div>
);

// ─── Document card ────────────────────────────────────────────────────────────

const DocCard: React.FC<{ doc: DocItem }> = ({ doc }) => {
  const meta = TYPE_META[doc.type];
  const Icon = meta.icon;
  const isBase64 = doc.url.startsWith('data:image');
  const isImageUrl = !doc.isPdf && !isBase64 &&
    /\.(jpe?g|png|webp|gif|heic|bmp|svg)(\?|$)/i.test(doc.url);
  const showThumb = isBase64 || isImageUrl;

  return (
    <div className="group rounded-2xl border border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05] overflow-hidden transition-all flex flex-col">
      {/* Thumbnail / icon area */}
      <div className="h-40 bg-white/5 flex items-center justify-center relative overflow-hidden">
        {showThumb ? (
          <img
            src={doc.url}
            alt={meta.label}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            {doc.isPdf ? <FileText size={36} className="text-blue-400" /> : <FileImage size={36} />}
            <span className="text-[0.55rem] font-bold uppercase tracking-widest text-gray-400">
              {doc.isPdf ? 'PDF' : 'Document'}
            </span>
          </div>
        )}
        {/* Type badge overlay */}
        <span className={`absolute top-2 left-2 text-[0.5rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border backdrop-blur-sm ${meta.badgeCls}`}>
          <span className="flex items-center gap-1">
            <Icon size={8} />
            {meta.label}
          </span>
        </span>
      </div>

      {/* Meta */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="text-xs font-black text-white truncate">{doc.ownerName}</p>
        <p className="text-[0.6rem] font-medium text-gray-500 truncate">{doc.ref}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[0.5rem] font-bold uppercase tracking-widest text-gray-600">
            {doc.date ? new Date(doc.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </span>
          <span className={`text-[0.48rem] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
            doc.status === 'ISSUED' || doc.status === 'APPROVED'
              ? 'bg-emerald-500/10 text-emerald-400'
              : doc.status === 'REJECTED'
              ? 'bg-rose-500/10 text-rose-400'
              : 'bg-amber-500/10 text-amber-400'
          }`}>
            {doc.status}
          </span>
        </div>
        {/* Open button */}
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-[0.6rem] font-black uppercase tracking-widest text-gray-300 hover:text-white"
        >
          <Eye size={11} /> Buka
        </a>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const DocumentsAdminView: React.FC = () => {
  const [docs, setDocs]       = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterTab>('all');
  const [search, setSearch]   = useState('');

  // ── Fetch all document sources in parallel ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      setLoading(true);

      const [ordersResult, usersResult, claimsResult] = await Promise.allSettled([
        getAllOrders(),
        callGateway('admin_list_users', {}),
        supabase.from('sp_claims').select('*').order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      const collected: DocItem[] = [];

      // ── Orders: policy docs + vehicle images + STNK/survey_photos ──────────
      const orders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
      for (const o of orders) {
        const base = {
          ownerName: o.client_name,
          ref: o.order_number ?? o.id,
          status: o.status,
          date: o.created_at ?? '',
        };

        if (o.policy_document_url) {
          collected.push({
            id: `order-policy-${o.id}`,
            type: 'policy',
            url: o.policy_document_url,
            isPdf: true,
            ...base,
          });
        }

        if (o.vehicle_image_url) {
          collected.push({
            id: `order-vehicle-${o.id}`,
            type: 'vehicle',
            url: o.vehicle_image_url,
            ...base,
          });
        }

        // vehicle_details may have stnk_url or survey_photos
        if (o.vehicle_details && typeof o.vehicle_details === 'object') {
          const vd = o.vehicle_details as Record<string, any>;
          if (vd.stnk_url && typeof vd.stnk_url === 'string') {
            collected.push({
              id: `order-stnk-${o.id}`,
              type: 'vehicle',
              url: vd.stnk_url,
              ...base,
            });
          }
          if (Array.isArray(vd.survey_photos)) {
            vd.survey_photos.forEach((url: string, idx: number) => {
              if (url) {
                collected.push({
                  id: `order-survey-${o.id}-${idx}`,
                  type: 'vehicle',
                  url,
                  ...base,
                });
              }
            });
          }
        }
      }

      // ── Users: KTP + profile photos ────────────────────────────────────────
      if (usersResult.status === 'fulfilled') {
        const usersData = usersResult.value;
        const users: any[] = Array.isArray(usersData?.data)
          ? usersData.data
          : Array.isArray(usersData)
          ? usersData
          : [];

        for (const u of users) {
          if (u.ktp_document_url) {
            collected.push({
              id: `user-ktp-${u.id ?? u.email}`,
              type: 'ktp',
              url: u.ktp_document_url,
              ownerName: u.name ?? u.email ?? 'Unknown',
              ref: u.email ?? u.id ?? '',
              status: u.role ?? 'USER',
              date: u.created_at ?? '',
            });
          }
        }
      }

      // ── Claims: photos array ───────────────────────────────────────────────
      if (claimsResult.status === 'fulfilled' && !claimsResult.value.error) {
        const claims: any[] = claimsResult.value.data ?? [];
        for (const c of claims) {
          const photos: string[] = Array.isArray(c.photos) ? c.photos : [];
          photos.forEach((photo, idx) => {
            if (photo) {
              collected.push({
                id: `claim-photo-${c.id}-${idx}`,
                type: 'claim',
                url: photo,
                ownerName: c.claimant_name ?? 'Unknown',
                ref: c.claim_number ?? c.id,
                status: c.status ?? 'SUBMITTED',
                date: c.created_at ?? '',
              });
            }
          });
        }
      }

      // policy/ktp docs live in private buckets — swap for signed URLs before
      // rendering; still-public buckets (vehicle/claim photos) pass through as-is.
      const resolved = await Promise.all(
        collected.map(async d => ({ ...d, url: (await resolveDocumentUrl(d.url)) ?? d.url }))
      );

      if (!cancelled) {
        setDocs(resolved);
        setLoading(false);
      }
    };

    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  // ── Filtered + searched docs ───────────────────────────────────────────────
  const visible = useMemo(() => {
    let result = filter === 'all' ? docs : docs.filter(d => d.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        d => d.ownerName.toLowerCase().includes(q) || d.ref.toLowerCase().includes(q),
      );
    }
    return result;
  }, [docs, filter, search]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    policy:  docs.filter(d => d.type === 'policy').length,
    vehicle: docs.filter(d => d.type === 'vehicle').length,
    ktp:     docs.filter(d => d.type === 'ktp').length,
    claim:   docs.filter(d => d.type === 'claim').length,
  }), [docs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileImage size={14} className="text-emerald-500" />
          <p className="text-[0.55rem] font-black uppercase tracking-[0.35em] text-emerald-500">Galeri Dokumen</p>
        </div>
        <h2 className="text-3xl font-black tracking-tight leading-none text-white">
          Document Gallery
        </h2>

        {/* Stats chips */}
        {!loading && (
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: 'Policy Docs',     count: counts.policy,  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20'   },
              { label: 'Vehicle Images',  count: counts.vehicle, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
              { label: 'KTP',             count: counts.ktp,     cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
              { label: 'Claim Photos',    count: counts.claim,   cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20'    },
            ].map(chip => (
              <span key={chip.label} className={`text-[0.55rem] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${chip.cls}`}>
                {chip.count} {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 flex-wrap">
          <Filter size={12} className="ml-2 text-gray-600 flex-shrink-0" />
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
                filter === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / nomor..."
            className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500/40 w-56"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
            <FileImage size={28} className="text-gray-600" />
          </div>
          <p className="text-sm font-black text-gray-500">
            {search || filter !== 'all' ? 'Tidak ada dokumen yang cocok' : 'No documents uploaded yet'}
          </p>
          {(search || filter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="text-[0.6rem] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-[0.55rem] font-bold uppercase tracking-widest text-gray-600">
            {visible.length} dokumen
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visible.map(doc => <DocCard key={doc.id} doc={doc} />)}
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentsAdminView;
