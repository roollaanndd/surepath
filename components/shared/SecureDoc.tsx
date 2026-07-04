import React, { useEffect, useState } from 'react';
import { resolveDocumentUrl } from '../../services/supabaseService';

/* ─── Private-storage document access ────────────────────────────────────────
   policy-documents and agent-docs are private buckets (KTP scans, full policy
   PDFs). The stored *_url fields still hold the old public-style URL string —
   resolveDocumentUrl() swaps it for a short-lived signed URL at view time so
   nothing sensitive is reachable via a guessed/leaked static link. */

export const SecureDocLink: React.FC<{
  url: string;
  className?: string;
  children: React.ReactNode;
}> = ({ url, className, children }) => {
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    const resolved = await resolveDocumentUrl(url).finally(() => setLoading(false));
    if (resolved) window.open(resolved, '_blank', 'noopener,noreferrer');
  };

  return (
    <button type="button" onClick={open} disabled={loading} className={className}>
      {children}
    </button>
  );
};

export const SecureDocImage: React.FC<{
  url: string;
  alt: string;
  className?: string;
}> = ({ url, alt, className }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveDocumentUrl(url).then(u => { if (!cancelled) setSrc(u); });
    return () => { cancelled = true; };
  }, [url]);

  if (!src) return <div className={className} />;
  return <img src={src} alt={alt} className={className} />;
};
