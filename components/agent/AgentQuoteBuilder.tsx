import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Car, Plane, Shield, Smartphone, Bike,
  CheckCircle2, Send, RefreshCw, FileCheck, User, Users, Download, ClipboardList
} from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import {
  saveQuote, createPolicy, addCommission,
  type SpClient, type SpQuote, type SpPolicy
} from '../../services/supabaseService';
import { generatePolicyCertPDF } from '../../services/pdfService';
import VehicleUnderwritingWizard from './VehicleUnderwritingWizard';
import AgentOrderStatus from './AgentOrderStatus';

interface Props {
  agentId: string;
  clients: SpClient[];
  lang: Language;
  onBack: () => void;
  agent?: any;
}

type ProductType = 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
type Step = 'client' | 'product' | 'inputs' | 'summary' | 'success';
type QuoteTab = 'new' | 'orders';

interface CarInputs { brand: string; model: string; year: number; price: number; coverage: 'COMPREHENSIVE' | 'TLO'; }
interface TravelInputs { destination: string; startDate: string; endDate: string; adults: number; plan: 'PLATINUM' | 'GOLD'; }
interface PAInputs { category: 'GENERAL' | 'STUDENT'; plan: 'BASIC' | 'PREMIUM' | 'ELITE'; }
interface MPARInputs { category: 'ELECTRONIC' | 'GADGET'; itemName: string; price: number; period: 6 | 12; }

const PRODUCTS: { type: ProductType; icon: React.ElementType; color: string; bgColor: string; enLabel: string; idLabel: string; enDesc: string; idDesc: string; ojk?: boolean }[] = [
  { type: 'CAR',        icon: Car,        color: 'text-blue-500',    bgColor: 'bg-blue-500/10',    enLabel: 'Auto (Roda 4)',       idLabel: 'Kendaraan Roda 4',     enDesc: 'OJK Regulated Full Underwriting', idDesc: 'Underwriting Penuh OJK', ojk: true },
  { type: 'MOTORCYCLE', icon: Bike,       color: 'text-cyan-500',    bgColor: 'bg-cyan-500/10',    enLabel: 'Motorcycle (Roda 2)', idLabel: 'Kendaraan Roda 2',     enDesc: 'OJK Regulated Full Underwriting', idDesc: 'Underwriting Penuh OJK', ojk: true },
  { type: 'TRAVEL',     icon: Plane,      color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', enLabel: 'Travel Insurance',    idLabel: 'Asuransi Perjalanan',  enDesc: 'Domestic & International',        idDesc: 'Domestik & Internasional' },
  { type: 'PA',         icon: Shield,     color: 'text-violet-500',  bgColor: 'bg-violet-500/10',  enLabel: 'Personal Accident',   idLabel: 'Kecelakaan Diri',      enDesc: 'General & Student Plans',         idDesc: 'Umum & Pelajar' },
  { type: 'MPAR',       icon: Smartphone, color: 'text-amber-500',   bgColor: 'bg-amber-500/10',   enLabel: 'Gadget / MPAR',       idLabel: 'Gadget / MPAR',        enDesc: 'Electronics & Gadgets',           idDesc: 'Elektronik & Gadget' },
];

const calcPremium = (product: ProductType, inputs: any): number => {
  if (product === 'CAR' || product === 'MOTORCYCLE') {
    const rate = inputs.coverage === 'COMPREHENSIVE' ? 0.025 : 0.018;
    return Math.round((inputs.price ?? 0) * rate);
  }
  if (product === 'TRAVEL') {
    const start = new Date(inputs.startDate ?? Date.now());
    const end = new Date(inputs.endDate ?? Date.now());
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    return Math.round((inputs.adults ?? 1) * days * 50000);
  }
  if (product === 'PA') {
    const map: Record<string, number> = { BASIC: 200000, PREMIUM: 500000, ELITE: 1200000 };
    return map[inputs.plan ?? 'BASIC'] ?? 200000;
  }
  if (product === 'MPAR') {
    return Math.round((inputs.price ?? 0) * 0.04 * ((inputs.period ?? 12) / 12));
  }
  return 0;
};

const COMMISSION_RATE: Record<ProductType, number> = { CAR: 0.12, MOTORCYCLE: 0.12, TRAVEL: 0.15, PA: 0.20, MPAR: 0.15 };

const AgentQuoteBuilder: React.FC<Props> = ({ agentId, clients, lang, onBack, agent }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  // All hooks must come before any conditional return (Rules of Hooks)
  const [quoteTab, setQuoteTab] = useState<QuoteTab>('new');
  const [vehicleWizardType, setVehicleWizardType] = useState<'CAR' | 'MOTORCYCLE' | null>(null);

  const [step, setStep] = useState<Step>('client');
  const [clientMode, setClientMode] = useState<'select' | 'onetime'>('select');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [onetimeName, setOnetimeName] = useState('');
  const [product, setProduct] = useState<ProductType | null>(null);

  const [carInputs, setCarInputs] = useState<CarInputs>({ brand: '', model: '', year: new Date().getFullYear(), price: 0, coverage: 'COMPREHENSIVE' });
  const [travelInputs, setTravelInputs] = useState<TravelInputs>({ destination: '', startDate: '', endDate: '', adults: 1, plan: 'GOLD' });
  const [paInputs, setPAInputs] = useState<PAInputs>({ category: 'GENERAL', plan: 'BASIC' });
  const [mparInputs, setMPARInputs] = useState<MPARInputs>({ category: 'GADGET', itemName: '', price: 0, period: 12 });

  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [savedQuote, setSavedQuote] = useState<SpQuote | null>(null);
  const [createdPolicy, setCreatedPolicy] = useState<SpPolicy | null>(null);

  // Route OJK products to full underwriting wizard
  if (vehicleWizardType) {
    return (
      <VehicleUnderwritingWizard
        agentId={agentId}
        agent={agent}
        clients={clients}
        lang={lang}
        initialVehicleType={vehicleWizardType}
        onBack={() => setVehicleWizardType(null)}
        onOrderCreated={() => { setVehicleWizardType(null); setQuoteTab('orders'); }}
      />
    );
  }

  const clientName = clientMode === 'select'
    ? (clients.find(c => c.id === selectedClientId)?.name ?? '')
    : onetimeName;

  const clientId = clientMode === 'select' ? selectedClientId : undefined;

  const currentInputs = (): any => {
    if (product === 'CAR') return carInputs;
    if (product === 'TRAVEL') return travelInputs;
    if (product === 'PA') return paInputs;
    if (product === 'MPAR') return mparInputs;
    return {};
  };

  const premium = product ? calcPremium(product, currentInputs()) : 0;
  const commission = product ? Math.round(premium * COMMISSION_RATE[product]) : 0;

  const canProceedClient = clientMode === 'select' ? !!selectedClientId : !!onetimeName.trim();
  const canProceedInputs = (): boolean => {
    if (product === 'CAR') return !!carInputs.brand && !!carInputs.model && carInputs.price > 0;
    if (product === 'TRAVEL') return !!travelInputs.destination && !!travelInputs.startDate && !!travelInputs.endDate;
    if (product === 'PA') return true;
    if (product === 'MPAR') return !!mparInputs.itemName && mparInputs.price > 0;
    return false;
  };

  const buildWAText = () => {
    const lines = [
      `*SurePath Insurance Quote*`,
      `─────────────────────`,
      `Client: ${clientName}`,
      `Product: ${product}`,
      `Premium: ${formatIDR(premium)}/year`,
      `Commission: ${formatIDR(commission)}`,
      ``,
      `Contact your SurePath agent for more details.`,
    ];
    return encodeURIComponent(lines.join('\n'));
  };

  const handleSaveQuote = async () => {
    if (!product) return;
    setSaving(true);
    const q = await saveQuote({
      agent_id: agentId,
      client_id: clientId,
      client_name: clientName,
      product_type: product,
      status: 'SENT',
      premium_estimate: premium,
      details: currentInputs(),
    });
    setSavedQuote(q);
    setSaving(false);
    if (q) {
      // brief success flash
    }
  };

  const handleConvert = async () => {
    if (!product) return;
    setConverting(true);
    try {
      const today = new Date();
      const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const policy = await createPolicy({
        agent_id: agentId,
        client_id: clientId,
        client_name: clientName,
        type: product,
        status: 'ACTIVE',
        premium,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        coverage_details: currentInputs(),
      });
      if (policy) {
        await addCommission({
          agent_id: agentId,
          policy_id: policy.id,
          client_name: clientName,
          product_type: product,
          premium_amount: premium,
          commission_amount: commission,
          status: 'PENDING',
        });
        if (savedQuote) {
          // quote already saved; could update status but skip for simplicity
        }
        setCreatedPolicy(policy);
        setStep('success');
      }
    } finally {
      setConverting(false);
    }
  };

  const reset = () => {
    setStep('client');
    setClientMode('select');
    setSelectedClientId('');
    setOnetimeName('');
    setProduct(null);
    setCarInputs({ brand: '', model: '', year: new Date().getFullYear(), price: 0, coverage: 'COMPREHENSIVE' });
    setTravelInputs({ destination: '', startDate: '', endDate: '', adults: 1, plan: 'GOLD' });
    setPAInputs({ category: 'GENERAL', plan: 'BASIC' });
    setMPARInputs({ category: 'GADGET', itemName: '', price: 0, period: 12 });
    setSavedQuote(null);
    setCreatedPolicy(null);
  };

  const stepIndex = ['client', 'product', 'inputs', 'summary'].indexOf(step);

  const inputClass = "w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

  // ─── SUCCESS SCREEN ───
  if (step === 'success') {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center text-center gap-6 min-h-[70vh] justify-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <FileCheck size={40} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="font-black text-2xl tracking-tight">{t('Policy Created!', 'Polis Berhasil Dibuat!')}</h2>
          <p className="text-slate-400 mt-2 text-sm">
            {t(`Commission of ${formatIDR(commission)} is now pending.`, `Komisi ${formatIDR(commission)} sedang dalam proses.`)}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] p-5 w-full border border-emerald-200 dark:border-emerald-500/20">
          <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">{clientName} — {product}</p>
          <p className="font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">{formatIDR(premium)}</p>
          <p className="text-xs text-emerald-500 font-bold mt-1">{t('Annual Premium', 'Premi Tahunan')}</p>
        </div>
        <button
          onClick={() => {
            const today = new Date();
            const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
            generatePolicyCertPDF({
              policyNumber: createdPolicy?.policy_number ?? `SP-${product}-CERT`,
              holderName: clientName,
              productType: product ?? '',
              premium,
              startDate: createdPolicy?.start_date ?? today.toISOString().split('T')[0],
              endDate: createdPolicy?.end_date ?? endDate.toISOString().split('T')[0],
              agentName: agent?.name ?? '',
              agentCode: agent?.agent_code ?? '',
              coverageDetails: createdPolicy?.coverage_details,
            });
          }}
          className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-500/20"
        >
          <Download size={14} />
          {t('Download Certificate (PDF)', 'Unduh Sertifikat (PDF)')}
        </button>
        <div className="flex gap-3 w-full">
          <button onClick={reset} className="flex-1 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest">
            {t('New Quote', 'Kuotasi Baru')}
          </button>
          <button onClick={onBack} className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase tracking-widest">
            {t('Back to Home', 'Kembali')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl p-1">
        <button
          onClick={() => setQuoteTab('new')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            quoteTab === 'new' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'
          }`}
        >
          <RefreshCw size={12} /> {t('New Quote', 'Kuotasi Baru')}
        </button>
        <button
          onClick={() => setQuoteTab('orders')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            quoteTab === 'orders' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'
          }`}
        >
          <ClipboardList size={12} /> {t('My Orders', 'Order Saya')}
        </button>
      </div>

      {/* Orders tab */}
      {quoteTab === 'orders' && (
        <AgentOrderStatus agentId={agentId} lang={lang} />
      )}

      {quoteTab === 'new' && (<>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={step === 'client' ? onBack : () => {
          if (step === 'product') setStep('client');
          else if (step === 'inputs') setStep('product');
          else if (step === 'summary') setStep('inputs');
        }} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="font-black tracking-tight text-xl">{t('Quote Builder', 'Buat Kuotasi')}</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {t(`Step ${stepIndex + 1} of 4`, `Langkah ${stepIndex + 1} dari 4`)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / 4) * 100}%` }}
        />
      </div>

      {/* ─── STEP 1: SELECT CLIENT ─── */}
      {step === 'client' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setClientMode('select')}
              className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                clientMode === 'select'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg'
                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-500'
              }`}
            >
              <Users size={14} />{t('My Clients', 'Klien Saya')}
            </button>
            <button
              onClick={() => setClientMode('onetime')}
              className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                clientMode === 'onetime'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg'
                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-500'
              }`}
            >
              <User size={14} />{t('One-time', 'Satu Kali')}
            </button>
          </div>

          {clientMode === 'select' ? (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {clients.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-6 font-medium">{t('No clients yet. Add clients in the Clients tab.', 'Belum ada klien. Tambahkan di tab Klien.')}</p>
              )}
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    selectedClientId === c.id
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                    <span className="font-black text-sm">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-black text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.phone}</p>
                  </div>
                  {selectedClientId === c.id && <CheckCircle2 size={16} className="text-primary-500 ml-auto" />}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label className={labelClass}>{t('Client Name', 'Nama Klien')}</label>
              <input
                type="text"
                placeholder={t('Enter client name…', 'Masukkan nama klien…')}
                value={onetimeName}
                onChange={e => setOnetimeName(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <button
            disabled={!canProceedClient}
            onClick={() => setStep('product')}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {t('Next', 'Lanjut')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ─── STEP 2: SELECT PRODUCT ─── */}
      {step === 'product' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-500">
            {t('Quote for:', 'Kuotasi untuk:')} <span className="text-slate-900 dark:text-white">{clientName}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.map(p => {
              const Icon = p.icon;
              const active = product === p.type;
              return (
                <button
                  key={p.type}
                  onClick={() => setProduct(p.type)}
                  className={`p-5 rounded-[1.5rem] border text-left transition-all active:scale-95 ${
                    active
                      ? 'border-primary-500 bg-primary-500/5 shadow-lg'
                      : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className={`w-12 h-12 ${p.bgColor} rounded-2xl flex items-center justify-center mb-3`}>
                    <Icon size={22} className={p.color} />
                  </div>
                  <p className="font-black text-sm leading-tight">
                    {lang === Language.EN ? p.enLabel : p.idLabel}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {lang === Language.EN ? p.enDesc : p.idDesc}
                  </p>
                  {active && <CheckCircle2 size={14} className="text-primary-500 mt-2" />}
                  {p.ojk && (
                    <span className="mt-1.5 inline-block text-[8px] font-black uppercase tracking-widest bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full">OJK</span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            disabled={!product}
            onClick={() => {
              // OJK products launch underwriting wizard
              if (product === 'CAR' || product === 'MOTORCYCLE') {
                setVehicleWizardType(product);
              } else {
                setStep('inputs');
              }
            }}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {product === 'CAR' || product === 'MOTORCYCLE'
              ? t('Start Underwriting', 'Mulai Underwriting')
              : t('Next', 'Lanjut')}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ─── STEP 3: PRODUCT INPUTS ─── */}
      {step === 'inputs' && (
        <div className="space-y-4">
          {/* CAR */}
          {product === 'CAR' && (
            <>
              <div><label className={labelClass}>{t('Vehicle Brand', 'Merek Kendaraan')}</label>
                <input type="text" value={carInputs.brand} onChange={e => setCarInputs(v => ({ ...v, brand: e.target.value }))} className={inputClass} placeholder="Toyota, Honda, BMW…" /></div>
              <div><label className={labelClass}>{t('Model', 'Model')}</label>
                <input type="text" value={carInputs.model} onChange={e => setCarInputs(v => ({ ...v, model: e.target.value }))} className={inputClass} placeholder="Avanza, Civic…" /></div>
              <div><label className={labelClass}>{t('Year', 'Tahun')}</label>
                <input type="number" value={carInputs.year} onChange={e => setCarInputs(v => ({ ...v, year: parseInt(e.target.value) || 2020 }))} className={inputClass} /></div>
              <div><label className={labelClass}>{t('Vehicle Price (Rp)', 'Harga Kendaraan (Rp)')}</label>
                <input type="number" value={carInputs.price || ''} onChange={e => setCarInputs(v => ({ ...v, price: parseInt(e.target.value) || 0 }))} className={inputClass} placeholder="250000000" /></div>
              <div>
                <label className={labelClass}>{t('Coverage Type', 'Tipe Perlindungan')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['COMPREHENSIVE', 'TLO'] as const).map(c => (
                    <button key={c} onClick={() => setCarInputs(v => ({ ...v, coverage: c }))}
                      className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${carInputs.coverage === c ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TRAVEL */}
          {product === 'TRAVEL' && (
            <>
              <div><label className={labelClass}>{t('Destination', 'Tujuan')}</label>
                <input type="text" value={travelInputs.destination} onChange={e => setTravelInputs(v => ({ ...v, destination: e.target.value }))} className={inputClass} placeholder="Bali, Singapore, Tokyo…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>{t('Start Date', 'Tgl Berangkat')}</label>
                  <input type="date" value={travelInputs.startDate} onChange={e => setTravelInputs(v => ({ ...v, startDate: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{t('End Date', 'Tgl Pulang')}</label>
                  <input type="date" value={travelInputs.endDate} onChange={e => setTravelInputs(v => ({ ...v, endDate: e.target.value }))} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>{t('Adults', 'Peserta Dewasa')}</label>
                <input type="number" min={1} value={travelInputs.adults} onChange={e => setTravelInputs(v => ({ ...v, adults: parseInt(e.target.value) || 1 }))} className={inputClass} /></div>
              <div>
                <label className={labelClass}>{t('Plan', 'Paket')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['GOLD', 'PLATINUM'] as const).map(p => (
                    <button key={p} onClick={() => setTravelInputs(v => ({ ...v, plan: p }))}
                      className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${travelInputs.plan === p ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PA */}
          {product === 'PA' && (
            <>
              <div>
                <label className={labelClass}>{t('Category', 'Kategori')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['GENERAL', 'STUDENT'] as const).map(c => (
                    <button key={c} onClick={() => setPAInputs(v => ({ ...v, category: c }))}
                      className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${paInputs.category === c ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                      {c === 'GENERAL' ? t('General', 'Umum') : t('Student', 'Pelajar')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('Plan', 'Paket')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BASIC', 'PREMIUM', 'ELITE'] as const).map(p => (
                    <button key={p} onClick={() => setPAInputs(v => ({ ...v, plan: p }))}
                      className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${paInputs.plan === p ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['BASIC', 'PREMIUM', 'ELITE'] as const).map(p => (
                    <p key={p} className="text-center text-[10px] text-slate-400 font-bold">
                      {formatIDR({ BASIC: 200000, PREMIUM: 500000, ELITE: 1200000 }[p])}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MPAR */}
          {product === 'MPAR' && (
            <>
              <div>
                <label className={labelClass}>{t('Category', 'Kategori')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ELECTRONIC', 'GADGET'] as const).map(c => (
                    <button key={c} onClick={() => setMPARInputs(v => ({ ...v, category: c }))}
                      className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${mparInputs.category === c ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                      {c === 'ELECTRONIC' ? t('Electronic', 'Elektronik') : t('Gadget', 'Gadget')}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={labelClass}>{t('Item Name', 'Nama Barang')}</label>
                <input type="text" value={mparInputs.itemName} onChange={e => setMPARInputs(v => ({ ...v, itemName: e.target.value }))} className={inputClass} placeholder="iPhone 15, Samsung TV…" /></div>
              <div><label className={labelClass}>{t('Item Price (Rp)', 'Harga Barang (Rp)')}</label>
                <input type="number" value={mparInputs.price || ''} onChange={e => setMPARInputs(v => ({ ...v, price: parseInt(e.target.value) || 0 }))} className={inputClass} placeholder="15000000" /></div>
              <div>
                <label className={labelClass}>{t('Coverage Period', 'Periode Perlindungan')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {([6, 12] as const).map(p => (
                    <button key={p} onClick={() => setMPARInputs(v => ({ ...v, period: p }))}
                      className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${mparInputs.period === p ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                      {p} {t('Months', 'Bulan')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            disabled={!canProceedInputs()}
            onClick={() => setStep('summary')}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {t('See Quote', 'Lihat Kuotasi')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ─── STEP 4: SUMMARY ─── */}
      {step === 'summary' && product && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-6 text-white shadow-2xl">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{t('Quote Summary', 'Ringkasan Kuotasi')}</p>
            <h2 className="font-black text-2xl tracking-tight">{clientName}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{product}</p>
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('Est. Annual Premium', 'Est. Premi Tahunan')}</p>
              <p className="font-black text-3xl text-white mt-0.5">{formatIDR(premium)}</p>
            </div>
            <div className="mt-3 bg-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">{t('Your Commission', 'Komisi Anda')}</span>
              <span className="font-black text-emerald-400">{formatIDR(commission)}</span>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg p-5 space-y-2">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">{t('Details', 'Detail')}</p>
            {Object.entries(currentInputs()).map(([k, v]) => (
              v !== '' && v !== 0 ? (
                <div key={k} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-bold">{String(v)}</span>
                </div>
              ) : null
            ))}
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleSaveQuote}
            disabled={saving || !!savedQuote}
            className="w-full py-4 rounded-2xl border border-slate-200 dark:border-white/10 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <FileCheck size={14} />}
            {savedQuote ? t('Quote Saved!', 'Kuotasi Tersimpan!') : t('Save Quote', 'Simpan Kuotasi')}
          </button>

          <a
            href={`https://wa.me/?text=${buildWAText()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30"
          >
            <Send size={14} />
            {t('Share via WhatsApp', 'Kirim via WhatsApp')}
          </a>

          <button
            onClick={handleConvert}
            disabled={converting}
            className="w-full py-4 rounded-2xl bg-primary-500 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-500/30 disabled:opacity-50"
          >
            {converting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {t('Convert to Policy', 'Buat Polis')}
          </button>
        </div>
      )}
      </>)}
    </div>
  );
};

export default AgentQuoteBuilder;
