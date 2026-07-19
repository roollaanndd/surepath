import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import { mobilHub, mobilAllRisk, mobilTlo, mobilKlaim, mobilPremi } from './mobilContent';

export type MobilSubPage = 'hub' | 'all-risk' | 'tlo' | 'klaim' | 'premi';

const CONTENT = {
  hub: mobilHub,
  'all-risk': mobilAllRisk,
  tlo: mobilTlo,
  klaim: mobilKlaim,
  premi: mobilPremi,
} as const;

interface Props extends SitePageProps {
  page: MobilSubPage;
}

const AsuransiMobilPage: React.FC<Props> = ({ page, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[page]} {...rest} />
);

export default AsuransiMobilPage;
