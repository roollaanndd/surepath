import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import { Language } from '../../../types';

const ProductsPage = lazy(() => import('../../../src/pages/ProductsPage'));
const FinancingPage = lazy(() => import('../../../src/pages/FinancingPage'));
const AITechPage = lazy(() => import('../../../src/pages/AITechPage'));
const HowItWorksPage = lazy(() => import('../../../src/pages/HowItWorksPage'));
const AboutPage = lazy(() => import('../../../src/pages/AboutPage'));
const ContactPage = lazy(() => import('../../../src/pages/ContactPage'));
const ProductInfoPage = lazy(() => import('../../../src/pages/ProductInfoPage'));
const StaticInfoPage = lazy(() => import('../../../src/pages/StaticInfoPage'));
const BlogPage = lazy(() => import('../../../src/pages/BlogPage'));
const PremiumCalculatorPage = lazy(() => import('../../../src/pages/PremiumCalculatorPage'));

export interface PublicRoutesProps {
  pathname: string;
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  navigate: (path: string) => void;
  onSignIn: () => void;
}

const MARKETING_PAGES: Record<string, React.FC<any>> = {
  '/products': ProductsPage,
  '/ai': AITechPage,
  '/how-it-works': HowItWorksPage,
  '/about': AboutPage,
  '/contact': ContactPage,
};

const STATIC_PAGES = ['careers', 'agents', 'partnership', 'privacy', 'terms', 'security', 'cookie'];

export const PublicRoutes: React.FC<PublicRoutesProps> = ({ pathname, lang, setLang, darkMode, setDarkMode, navigate, onSignIn }) => {
  if (pathname === '/insurer-portal' || pathname === '/insurerapp') {
    return null;
  }

  const productMatch = pathname.match(/^\/product\/(car|travel|pa|property|health|climate)$/);
  if (productMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <ProductInfoPage productId={productMatch[1]} lang={lang} onBack={() => navigate('/')} onSignIn={onSignIn} />
      </Suspense>
    );
  }

  if (pathname === '/kalkulator') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <PremiumCalculatorPage lang={lang} onBack={() => navigate('/')} onSignIn={onSignIn} />
      </Suspense>
    );
  }

  if (pathname === '/financing' || pathname === '/financing/dashboard') {
    return (
      <Suspense fallback={<PortalLoader lang={lang} />}>
        <FinancingPage onSignIn={onSignIn} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  const MarketingPage = MARKETING_PAGES[pathname];
  if (MarketingPage) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <MarketingPage onSignIn={onSignIn} navigate={navigate} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} />
      </Suspense>
    );
  }

  const blogSlugMatch = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (pathname === '/blog' || blogSlugMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <BlogPage slug={blogSlugMatch ? blogSlugMatch[1] : undefined} onBack={() => navigate('/')} onSignIn={onSignIn} navigate={navigate} />
      </Suspense>
    );
  }

  const staticPageId = STATIC_PAGES.find(p => pathname === `/${p}`);
  if (staticPageId) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <StaticInfoPage pageId={staticPageId} lang={lang} setLang={setLang} darkMode={darkMode} setDarkMode={setDarkMode} navigate={navigate} onSignIn={onSignIn} />
      </Suspense>
    );
  }

  return null;
};
