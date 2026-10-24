import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import { Language } from '../../../types';

const InsurerLogin = lazy(() => import('../../../components/insurer/InsurerLogin'));
const InsurerPortal = lazy(() => import('../../../components/insurer/InsurerPortal'));

export interface InsurerRoutesProps {
  pathname: string;
  lang: Language;
  navigate: (path: string) => void;
}

export const InsurerRoutes: React.FC<InsurerRoutesProps> = ({ pathname, lang, navigate }) => {
  if (pathname === '/insurer-portal') {
    const t = new URLSearchParams(window.location.search).get('token');
    window.location.href = t ? `/insurerapp?token=${encodeURIComponent(t)}` : '/insurerapp';
    return null;
  }

  if (pathname === '/insurerapp') {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    const savedToken = sessionStorage.getItem('SUREPATH_INSURER_TOKEN');
    const token = urlToken ?? savedToken;
    if (!token) {
      return (
        <Suspense fallback={<PortalLoader lang={lang} />}>
          <InsurerLogin onLoginSuccess={() => window.location.reload()} onBack={() => navigate('/')} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PortalLoader />}>
        <InsurerPortal authToken={token} onLogout={() => { window.location.href = '/'; }} lang={lang} />
      </Suspense>
    );
  }

  return null;
};
