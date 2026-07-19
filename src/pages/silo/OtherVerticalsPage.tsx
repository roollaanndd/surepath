import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import { kesehatanHub, kecelakaanDiriHub, perjalananHub, perjalananInternasional } from './otherVerticalsContent';

export type OtherVerticalPage = 'kesehatan-hub' | 'kecelakaan-diri-hub' | 'perjalanan-hub' | 'perjalanan-internasional';

const CONTENT = {
  'kesehatan-hub': kesehatanHub,
  'kecelakaan-diri-hub': kecelakaanDiriHub,
  'perjalanan-hub': perjalananHub,
  'perjalanan-internasional': perjalananInternasional,
} as const;

interface Props extends SitePageProps {
  page: OtherVerticalPage;
}

const OtherVerticalsPage: React.FC<Props> = ({ page, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[page]} {...rest} />
);

export default OtherVerticalsPage;
