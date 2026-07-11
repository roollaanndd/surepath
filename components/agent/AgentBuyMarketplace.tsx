import React, { useState } from 'react';
import { Car, Bike, Plane, Shield, Smartphone, Heart, ChevronRight, ArrowLeft } from 'lucide-react';
import { Language } from '../../types';
import VehicleUnderwritingWizard from './VehicleUnderwritingWizard';
import LifeInsuranceWizard from './LifeInsuranceWizard';
import TravelInsuranceWizard from '../TravelInsuranceWizard';
import PAInsuranceWizard from '../PAInsuranceWizard';
import MPARInsuranceWizard from '../MPARInsuranceWizard';
import { type SpClient } from '../../services/supabaseService';
import { AgentArtKeyframes, AgentHero, SpotMarket } from './AgentArt';

interface Props {
  agentId: string;
  agent: any;
  clients: SpClient[];
  lang: Language;
  onBack: () => void;
}

type ProductChoice = 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR' | 'LIFE' | null;

const PRODUCTS = [
  {
    id: 'CAR' as const,
    icon: Car,
    gradient: 'from-blue-600 to-blue-800',
    shadow: 'shadow-blue-500/30',
    label: 'Kendaraan Roda 4',
    desc: 'Comprehensive & TLO · OJK',
    badge: 'OJK',
    badgeColor: 'bg-blue-400/20 text-blue-200',
  },
  {
    id: 'MOTORCYCLE' as const,
    icon: Bike,
    gradient: 'from-cyan-600 to-teal-700',
    shadow: 'shadow-cyan-500/30',
    label: 'Kendaraan Roda 2',
    desc: 'Comprehensive & TLO · OJK',
    badge: 'OJK',
    badgeColor: 'bg-cyan-400/20 text-cyan-200',
  },
  {
    id: 'TRAVEL' as const,
    icon: Plane,
    gradient: 'from-emerald-600 to-green-700',
    shadow: 'shadow-emerald-500/30',
    label: 'Asuransi Perjalanan',
    desc: 'Domestik & Internasional',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'PA' as const,
    icon: Shield,
    gradient: 'from-violet-600 to-purple-800',
    shadow: 'shadow-violet-500/30',
    label: 'Kecelakaan Diri',
    desc: 'Umum & Pelajar',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'MPAR' as const,
    icon: Smartphone,
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/30',
    label: 'Gadget / MPAR',
    desc: 'Elektronik & Gadget',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'LIFE' as const,
    icon: Heart,
    gradient: 'from-rose-500 to-pink-700',
    shadow: 'shadow-rose-500/30',
    label: 'Asuransi Jiwa',
    desc: 'Jiwa, Seumur Hidup & Unit Link',
    badge: null,
    badgeColor: '',
  },
];

const AgentBuyMarketplace: React.FC<Props> = ({ agentId, agent, clients, lang, onBack }) => {
  const [selected, setSelected] = useState<ProductChoice>(null);

  if (selected === 'CAR' || selected === 'MOTORCYCLE') {
    return (
      <VehicleUnderwritingWizard
        agentId={agentId}
        agent={agent}
        clients={clients}
        lang={lang}
        initialVehicleType={selected}
        onBack={() => setSelected(null)}
        onOrderCreated={() => setSelected(null)}
      />
    );
  }

  if (selected === 'LIFE') {
    return (
      <LifeInsuranceWizard
        agentId={agentId}
        agent={agent}
        lang={lang}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (selected === 'TRAVEL') {
    return (
      <TravelInsuranceWizard
        currentUser={agent}
        lang={lang}
        onComplete={() => setSelected(null)}
      />
    );
  }

  if (selected === 'PA') {
    return (
      <PAInsuranceWizard
        currentUser={agent}
        lang={lang}
        onComplete={() => setSelected(null)}
      />
    );
  }

  if (selected === 'MPAR') {
    return (
      <MPARInsuranceWizard
        currentUser={agent}
        lang={lang}
        onComplete={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 font-sora">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center active:scale-90 motion-reduce:active:scale-100 transition-transform">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-black text-xl tracking-tight">Pilih Produk</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Langsung mulai proses pembelian</p>
        </div>
      </div>

      {/* Hero banner */}
      <AgentArtKeyframes />
      <AgentHero
        title="Marketplace Produk"
        subtitle="Semua produk proteksi dengan tarif resmi OJK — siap dijual hari ini."
        art={<SpotMarket size={76} />}
      />

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3">
        {PRODUCTS.map(({ id, icon: Icon, gradient, shadow, label, desc, badge, badgeColor }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`relative rounded-[1.75rem] overflow-hidden text-left active:scale-95 motion-reduce:active:scale-100 hover:-translate-y-0.5 hover:brightness-105 transition-all duration-200 motion-reduce:transition-none shadow-xl ${shadow}`}
          >
            <div className={`bg-gradient-to-br ${gradient} p-5 h-full flex flex-col gap-3`}>
              {badge && (
                <span className={`self-start text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {badge}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <Icon size={22} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="font-black text-white text-sm leading-snug">{label}</p>
                <p className="text-[10px] text-white/60 mt-0.5 font-medium leading-tight">{desc}</p>
              </div>
              <div className="self-end">
                <ChevronRight size={14} className="text-white/40" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-3 text-[10px] text-slate-400 font-medium leading-relaxed">
        Pilih produk untuk memulai proses pembelian polis lengkap, termasuk survei kendaraan, upload dokumen, dan pembayaran.
      </div>
    </div>
  );
};

export default AgentBuyMarketplace;
