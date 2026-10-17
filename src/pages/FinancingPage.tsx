import React from 'react';
import type { SitePageProps } from './site/siteKit';
import FinancingCoreWorkspace from './financing/FinancingCoreWorkspace';

const FinancingPage: React.FC<SitePageProps> = (props) => <FinancingCoreWorkspace {...props} />;

export default FinancingPage;
