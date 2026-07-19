import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import { mobilHub, mobilAllRisk, mobilTlo, mobilKlaim, mobilPremi, mobilPremiZona1, mobilPremiZona2, mobilPremiZona3 } from './mobilContent';

export type MobilSubPage = 'hub' | 'all-risk' | 'tlo' | 'klaim' | 'premi' | 'premi-zona-1' | 'premi-zona-2' | 'premi-zona-3';

const CONTENT = {
  hub: mobilHub,
  'all-risk': mobilAllRisk,
  tlo: mobilTlo,
  klaim: mobilKlaim,
  premi: mobilPremi,
  'premi-zona-1': mobilPremiZona1,
  'premi-zona-2': mobilPremiZona2,
  'premi-zona-3': mobilPremiZona3,
} as const;

interface Props extends SitePageProps {
  page: MobilSubPage;
}

const AsuransiMobilPage: React.FC<Props> = ({ page, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[page]} {...rest} />
);

export default AsuransiMobilPage;
