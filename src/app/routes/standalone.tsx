import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';

const PaymentRedirect = lazy(() => import('../../../components/PaymentRedirect'));
const InsuranceReviewPage = lazy(() => import('../../../components/InsuranceReviewPage'));
const EQuotationPage = lazy(() => import('../../../components/public/EQuotationPage'));

export interface StandaloneRoutesProps {
  pathname: string;
}

export const StandaloneRoutes: React.FC<StandaloneRoutesProps> = ({ pathname }) => {
  if (pathname === '/payment/success' || pathname === '/payment/failed') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <PaymentRedirect status={pathname === '/payment/success' ? 'success' : 'failed'} />
      </Suspense>
    );
  }

  const reviewMatch = pathname.match(/^\/review\/([0-9a-f-]{36})$/i);
  if (reviewMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <InsuranceReviewPage token={reviewMatch[1]} />
      </Suspense>
    );
  }

  const eQuoteMatch = pathname.match(/^\/q\/([A-Za-z0-9_-]{8,40})$/);
  if (eQuoteMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <EQuotationPage code={eQuoteMatch[1]} />
      </Suspense>
    );
  }

  return null;
};
