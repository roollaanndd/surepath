import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SiteTheme } from './siteKit';

// Single source of truth for breadcrumb trails: the same {name, path}[] array
// drives both the visual UI and the BreadcrumbList JSON-LD, so they can never
// diverge (per docs/SEO_ARCHITECTURE.md §4).

export interface Crumb { name: string; path: string; }

const BASE_URL = 'https://myinsurepath.com';

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${BASE_URL}${c.path}`,
    })),
  };
}

export const Breadcrumb: React.FC<{ crumbs: Crumb[]; navigate: (path: string) => void; th: SiteTheme }> = ({ crumbs, navigate, th }) => (
  <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs">
    {crumbs.map((c, i) => {
      const isLast = i === crumbs.length - 1;
      return (
        <React.Fragment key={c.path}>
          {i > 0 && <ChevronRight size={12} style={{ color: th.textSubtle, flexShrink: 0 }} />}
          {isLast ? (
            <span aria-current="page" className="font-semibold" style={{ color: th.textMain }}>{c.name}</span>
          ) : (
            <button onClick={() => navigate(c.path)} className="font-medium transition-colors hover:underline"
              style={{ color: th.textMuted }}>
              {c.name}
            </button>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

export default Breadcrumb;
