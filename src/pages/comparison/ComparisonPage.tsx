import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import { allRiskVsTlo } from './allRiskVsTloContent';
import { kesehatanVsBpjs, paVsAsuransiJiwa, surepathVsBeliLangsung } from './moreComparisonsContent';

export type ComparisonSlug = 'asuransi-all-risk-vs-tlo' | 'asuransi-kesehatan-vs-bpjs' | 'personal-accident-vs-asuransi-jiwa' | 'surepath-vs-beli-langsung';

const CONTENT = {
  'asuransi-all-risk-vs-tlo': allRiskVsTlo,
  'asuransi-kesehatan-vs-bpjs': kesehatanVsBpjs,
  'personal-accident-vs-asuransi-jiwa': paVsAsuransiJiwa,
  'surepath-vs-beli-langsung': surepathVsBeliLangsung,
} as const;

interface Props extends SitePageProps {
  slug: ComparisonSlug;
}

const ComparisonPage: React.FC<Props> = ({ slug, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[slug]} {...rest} />
);

export default ComparisonPage;
