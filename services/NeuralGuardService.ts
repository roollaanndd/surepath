
export interface ThreatNode {
  id: string;
  ip: string;
  type: 'SQLI' | 'BRUTEFORCE' | 'DDOS' | 'ANOMALY' | 'HIJACKING_ATTEMPT' | 'XSS_FILTER';
  severity: 'CRITICAL' | 'HIGH' | 'MITIGATED';
  timestamp: string;
}

export interface SecurityPulse {
  status: 'OPTIMAL' | 'PROTECTING' | 'THREAT_NEUTRALIZED';
  activeShields: string[];
  threatsBlocked24h: number;
  encryptionStrength: string;
  globalUptime: string;
  neuralLoad: number;
}

const THREAT_TYPES: ThreatNode['type'][] = ['SQLI', 'BRUTEFORCE', 'DDOS', 'ANOMALY', 'HIJACKING_ATTEMPT', 'XSS_FILTER'];

export const getSecurityPulse = (): SecurityPulse => {
  return {
    status: 'OPTIMAL',
    activeShields: ['Neural WAF v4', 'DDoS Mitigator', 'Bio-Metric ID Link', 'AES-256 GCM Vault', 'Quantum-Resistant Layer'],
    threatsBlocked24h: 12401 + Math.floor(Math.random() * 50),
    encryptionStrength: 'AES-256-GCM',
    globalUptime: '99.999%',
    neuralLoad: 12 + Math.random() * 8
  };
};

export const generateLiveThreat = (): ThreatNode => {
  const id = `TR-${Math.floor(Math.random() * 900) + 100}`;
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const type = THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)];
  return {
    id,
    ip,
    type,
    severity: 'MITIGATED',
    timestamp: 'Just now'
  };
};

export const getRecentThreats = (): ThreatNode[] => {
  return [
    { id: 'TR-992', ip: '192.168.1.102', type: 'SQLI', severity: 'MITIGATED', timestamp: '2m ago' },
    { id: 'TR-881', ip: '45.12.8.201', type: 'DDOS', severity: 'MITIGATED', timestamp: '14m ago' },
    { id: 'TR-004', ip: '102.11.42.5', type: 'BRUTEFORCE', severity: 'MITIGATED', timestamp: '1h ago' },
  ];
};
