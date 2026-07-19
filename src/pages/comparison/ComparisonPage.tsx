import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import { allRiskVsTlo } from './allRiskVsTloContent';

export type ComparisonSlug = 'asuransi-all-risk-vs-tlo';

const CONTENT = {
  'asuransi-all-risk-vs-tlo': allRiskVsTlo,
} as const;

interface Props extends SitePageProps {
  slug: ComparisonSlug;
}

const ComparisonPage: React.FC<Props> = ({ slug, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[slug]} {...rest} />
);

export default ComparisonPage;
