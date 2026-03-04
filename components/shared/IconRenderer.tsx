
import React from 'react';
import { 
  Shield, Zap, Star, Anchor, Home, Car, Plane, 
  Stethoscope, HeartPulse, Laptop, Smartphone, 
  Package, Building2, User, Users, ShieldAlert, 
  Activity, ShieldX 
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Shield, Zap, Star, Anchor, Home, Car, Plane, 
  Stethoscope, HeartPulse, Laptop, Smartphone, 
  Package, Building2, User, Users, ShieldAlert, 
  Activity, ShieldX
};

export const ProviderIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const Icon = iconMap[name] || Shield;
  return <Icon size={size} className={className} />;
};
