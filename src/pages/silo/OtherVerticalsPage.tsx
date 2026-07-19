import React from 'react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import { SitePageProps } from '../site/siteKit';
import {
  kesehatanHub, kecelakaanDiriHub, perjalananHub, perjalananInternasional,
  kesehatanKlaim, kesehatanPremi, kecelakaanDiriKlaim, kecelakaanDiriPremi, perjalananKlaim, perjalananPremi,
} from './otherVerticalsContent';
import { proteksiBarangHub, proteksiBarangKlaim, proteksiBarangPremi } from './proteksiBarangContent';

export type OtherVerticalPage =
  | 'kesehatan-hub' | 'kesehatan-klaim' | 'kesehatan-premi'
  | 'kecelakaan-diri-hub' | 'kecelakaan-diri-klaim' | 'kecelakaan-diri-premi'
  | 'perjalanan-hub' | 'perjalanan-internasional' | 'perjalanan-klaim' | 'perjalanan-premi'
  | 'proteksi-barang-hub' | 'proteksi-barang-klaim' | 'proteksi-barang-premi';

const CONTENT = {
  'kesehatan-hub': kesehatanHub,
  'kesehatan-klaim': kesehatanKlaim,
  'kesehatan-premi': kesehatanPremi,
  'kecelakaan-diri-hub': kecelakaanDiriHub,
  'kecelakaan-diri-klaim': kecelakaanDiriKlaim,
  'kecelakaan-diri-premi': kecelakaanDiriPremi,
  'perjalanan-hub': perjalananHub,
  'perjalanan-internasional': perjalananInternasional,
  'perjalanan-klaim': perjalananKlaim,
  'perjalanan-premi': perjalananPremi,
  'proteksi-barang-hub': proteksiBarangHub,
  'proteksi-barang-klaim': proteksiBarangKlaim,
  'proteksi-barang-premi': proteksiBarangPremi,
} as const;

interface Props extends SitePageProps {
  page: OtherVerticalPage;
}

const OtherVerticalsPage: React.FC<Props> = ({ page, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[page]} {...rest} />
);

export default OtherVerticalsPage;
