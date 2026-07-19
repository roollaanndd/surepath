import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import { kesehatanHub, kecelakaanDiriHub, perjalananHub, perjalananInternasional } from './otherVerticalsContent';
import { proteksiBarangHub } from './proteksiBarangContent';

export type OtherVerticalPage = 'kesehatan-hub' | 'kecelakaan-diri-hub' | 'perjalanan-hub' | 'perjalanan-internasional' | 'proteksi-barang-hub';

const CONTENT = {
  'kesehatan-hub': kesehatanHub,
  'kecelakaan-diri-hub': kecelakaanDiriHub,
  'perjalanan-hub': perjalananHub,
  'perjalanan-internasional': perjalananInternasional,
  'proteksi-barang-hub': proteksiBarangHub,
} as const;

interface Props extends SitePageProps {
  page: OtherVerticalPage;
}

const OtherVerticalsPage: React.FC<Props> = ({ page, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[page]} {...rest} />
);

export default OtherVerticalsPage;
