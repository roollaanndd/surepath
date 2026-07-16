import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Car, Plane, Shield, Smartphone, Bike,
  CheckCircle2, Send, RefreshCw, FileCheck, User, Users, UserPlus, Download, ClipboardList, Heart, FileText
} from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import {
  saveQuote, createPolicy, addCommission, addClient,
  type SpClient, type SpQuote, type SpPolicy
} from '../../services/supabaseService';
import { generatePolicyCertPDF } from '../../services/pdfService';
import { publishAndDownloadQuotation } from '../../services/quotationService';
import { fromAgentQuote } from '../../services/quotationSlipAdapter';
import STNKAutoExtract from '../shared/STNKAutoExtract';
import { useToast } from '../ui';
import { calcPremium as calcOjkPremium, getZone, getBaseRateByBand, getVehicleCategory } from '../../services/ojkRates';
import VehicleUnderwritingWizard from './VehicleUnderwritingWizard';
import AgentOrderStatus from './AgentOrderStatus';
import LifeInsuranceWizard from './LifeInsuranceWizard';
import {
  VEHICLE_BRANDS, getModelsForBrand, getMarketValue, getMarketValueForYear,
  MOTO_BRANDS, getModelsForMotoBrand, getMarketValueForMoto, getMarketValueForMotoYear,
} from '../../services/vehicleDatabase';

interface Props {
  agentId: string;
  clients: SpClient[];
  lang: Language;
  onBack: () => void;
  agent?: any;
  quoteOnly?: boolean;
}

type ProductType = 'CAR' | 'MOTORCYCLE' | 'TRAVEL' | 'PA' | 'MPAR';
// UX v1.50.0: product-first flow — pilih produk dulu, data klien belakangan
// (step 'client' pindah ke setelah 'inputs', dengan quick-add klien inline).
type Step = 'product' | 'inputs' | 'client' | 'quote_summary' | 'summary' | 'success';
type QuoteTab = 'new' | 'orders';
type QuoteMode = 'penawaran' | 'beli' | null;
type ClientMode = 'select' | 'new' | 'onetime';

interface CarInputs { brand: string; model: string; year: number; price: number; coverage: 'COMPREHENSIVE' | 'TLO'; }

// Addon coverage options for quote builder
interface AddonState {
  flood: boolean;
  earthquake: boolean;
  riot: boolean;
  tplLimit: number; // 0 = none, else IDR amount
  paDriver: boolean;
  paPassengerSeats: number;
}
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

const calcPremium = (product: ProductType, inputs: any, addonState?: AddonState): number => {
  if (product === 'CAR' || product === 'MOTORCYCLE') {
    const zone = getZone('');
    // Use OJK calc with addons if provided
    if (addonState) {
      const breakdown = calcOjkPremium(
        product === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR',
        inputs.coverage, inputs.price ?? 0, zone,
        {
          flood: addonState.flood,
          earthquake: addonState.earthquake,
          riot: addonState.riot,
          tplLimit: addonState.tplLimit,
          paDriver: addonState.paDriver,
          paPassengerSeats: addonState.paPassengerSeats,
        }
      );
      return breakdown.total;
    }
    // Fallback: base rate only
    const rate = getBaseRateByBand(
      product === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR',
      inputs.coverage, zone, getVehicleCategory(inputs.price ?? 0), 'MID',
    );
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

const AgentQuoteBuilder: React.FC<Props> = ({ agentId, clients, lang, onBack, agent, quoteOnly = false }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const toast = useToast();

  // All hooks must come before any conditional return (Rules of Hooks)
  const [quoteTab, setQuoteTab] = useState<QuoteTab>('new');
  const [vehicleWizardType, setVehicleWizardType] = useState<'CAR' | 'MOTORCYCLE' | null>(null);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('product');
  const [clientMode, setClientMode] = useState<ClientMode>(clients.length > 0 ? 'select' : 'new');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [onetimeName, setOnetimeName] = useState('');
  // Quick-add klien inline — tersimpan otomatis ke sp_clients (CRM) tanpa
  // harus keluar ke tab Klien dulu.
  const [localClients, setLocalClients] = useState<SpClient[]>(clients);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });
  const [createdClientId, setCreatedClientId] = useState<string>('');
  const [addingClient, setAddingClient] = useState(false);
  const [product, setProduct] = useState<ProductType | null>(null);
  const [quoteMode, setQuoteMode] = useState<QuoteMode>(null);

  useEffect(() => { setLocalClients(clients); }, [clients]);

  const [carInputs, setCarInputs] = useState<CarInputs>({ brand: '', model: '', year: new Date().getFullYear(), price: 0, coverage: 'COMPREHENSIVE' });
  const [addons, setAddons] = useState<AddonState>({ flood: false, earthquake: false, riot: false, tplLimit: 0, paDriver: false, paPassengerSeats: 0 });
  const [travelInputs, setTravelInputs] = useState<TravelInputs>({ destination: '', startDate: '', endDate: '', adults: 1, plan: 'GOLD' });
  const [paInputs, setPAInputs] = useState<PAInputs>({ category: 'GENERAL', plan: 'BASIC' });
  const [mparInputs, setMPARInputs] = useState<MPARInputs>({ category: 'GADGET', itemName: '', price: 0, period: 12 });

  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [printingQuote, setPrintingQuote] = useState(false);
  const [savedQuote, setSavedQuote] = useState<SpQuote | null>(null);
  const [createdPolicy, setCreatedPolicy] = useState<SpPolicy | null>(null);

  // Route OJK products to full underwriting wizard
  if (vehicleWizardType) {
    return (
      <VehicleUnderwritingWizard
        agentId={agentId}
        agent={agent}
        clients={localClients}
        lang={lang}
        initialVehicleType={vehicleWizardType}
        onBack={() => setVehicleWizardType(null)}
        onOrderCreated={() => { setVehicleWizardType(null); setQuoteTab('orders'); }}
      />
    );
  }

  // Route life insurance to life wizard
  if (activeProduct === 'life') {
    return (
      <LifeInsuranceWizard
        agentId={agentId}
        agent={agent}
        lang={lang}
        onBack={() => setActiveProduct(null)}
      />
    );
  }

  const clientName = clientMode === 'select'
    ? (localClients.find(c => c.id === selectedClientId)?.name ?? '')
    : clientMode === 'new' ? newClient.name : onetimeName;

  const clientId = clientMode === 'select'
    ? selectedClientId
    : clientMode === 'new' ? (createdClientId || undefined) : undefined;

  const currentInputs = (): any => {
    if (product === 'CAR' || product === 'MOTORCYCLE') return carInputs;
    if (product === 'TRAVEL') return travelInputs;
    if (product === 'PA') return paInputs;
    if (product === 'MPAR') return mparInputs;
    return {};
  };

  const premium = product ? calcPremium(product, currentInputs(), (product === 'CAR' || product === 'MOTORCYCLE') ? addons : undefined) : 0;
  const commission = product ? Math.round(premium * COMMISSION_RATE[product]) : 0;

  const canProceedClient = clientMode === 'select'
    ? !!selectedClientId
    : clientMode === 'new'
      ? !!newClient.name.trim() && !!newClient.phone.trim()
      : !!onetimeName.trim();

  // Lanjut dari step client → ringkasan. Mode 'new' menyimpan klien ke CRM
  // dulu (non-blocking untuk UX: kalau gagal simpan, penawaran tetap lanjut
  // dengan nama yang diisi).
  const proceedAfterClient = () => {
    if ((product === 'CAR' || product === 'MOTORCYCLE') && quoteMode === 'penawaran') {
      setStep('quote_summary');
    } else {
      setStep('summary');
    }
  };

  const handleClientNext = async () => {
    if (clientMode === 'new' && !createdClientId) {
      setAddingClient(true);
      const c = await addClient({
        agent_id: agentId,
        name: newClient.name.trim(),
        phone: newClient.phone.trim(),
        status: 'PROSPECT',
      });
      setAddingClient(false);
      if (c) {
        setLocalClients(prev => [c, ...prev]);
        setCreatedClientId(c.id);
        toast.success(t('Client saved to your client list', 'Klien otomatis tersimpan di daftar Klien Anda'));
      } else {
        toast.error(t('Could not save client — continuing as one-time client.', 'Gagal menyimpan klien — penawaran tetap dilanjutkan.'));
      }
    }
    proceedAfterClient();
  };
  const canProceedInputs = (): boolean => {
    if (product === 'CAR' || product === 'MOTORCYCLE') return !!carInputs.brand && !!carInputs.model && carInputs.price > 0;
    if (product === 'TRAVEL') return !!travelInputs.destination && !!travelInputs.startDate && !!travelInputs.endDate;
    if (product === 'PA') return true;
    if (product === 'MPAR') return !!mparInputs.itemName && mparInputs.price > 0;
    return false;
  };

  const buildWAText = () => {
    const lines: string[] = [
      `*SUREPATH — Penawaran Asuransi*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Nama: ${clientName}`,
      ``,
      `*Produk:* ${product}`,
    ];

    // Add product-specific details
    if (product === 'CAR' || product === 'MOTORCYCLE') {
      lines.push(`*Kendaraan:* ${carInputs.brand} ${carInputs.model} (${carInputs.year})`);
      lines.push(`*Coverage:* ${carInputs.coverage}`);
      lines.push(`*Nilai Pertanggungan:* ${formatIDR(carInputs.price)}`);
      if (addons.flood) lines.push(`✓ Perluasan Banjir`);
      if (addons.earthquake) lines.push(`✓ Perluasan Gempa`);
      if (addons.riot) lines.push(`✓ Perluasan Huru-Hara`);
      if (addons.tplLimit > 0) lines.push(`✓ TPL: ${formatIDR(addons.tplLimit)}`);
      if (addons.paDriver) lines.push(`✓ PA Pengemudi`);
      if (addons.paPassengerSeats > 0) lines.push(`✓ PA Penumpang: ${addons.paPassengerSeats} kursi`);
    } else if (product === 'PA') {
      lines.push(`*Kategori:* ${paInputs.category}`);
      lines.push(`*Plan:* ${paInputs.plan}`);
    } else if (product === 'TRAVEL') {
      lines.push(`*Tujuan:* ${travelInputs.destination}`);
      lines.push(`*Peserta:* ${travelInputs.adults} dewasa`);
      lines.push(`*Periode:* ${travelInputs.startDate} - ${travelInputs.endDate}`);
    } else if (product === 'MPAR') {
      lines.push(`*Barang:* ${mparInputs.itemName}`);
      lines.push(`*Nilai:* ${formatIDR(mparInputs.price)}`);
      lines.push(`*Periode:* ${mparInputs.period} bulan`);
    }

    lines.push(``);
    lines.push(`*PREMI: ${formatIDR(premium)}/tahun*`);
    lines.push(``);
    lines.push(`Penawaran berlaku 30 hari.`);
    lines.push(`Hubungi agen SurePath untuk konfirmasi.`);
    lines.push(``);
    lines.push(`_SurePath — Your Path to Protection_`);
    lines.push(`myinsurepath.com`);

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
    setSaving(false);
    if (q) {
      setSavedQuote(q);
      toast.success(t('Quote saved!', 'Penawaran tersimpan!'));
    } else {
      toast.error(t('Failed to save the quote. Please check your connection and try again.',
              'Gagal menyimpan penawaran. Periksa koneksi dan coba lagi.'));
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

  const handlePrintQuote = async () => {
    if (!product) return;
    setPrintingQuote(true);
    try {
      // Build rows based on product type
      let quoteRows: Array<{ label: string; amount: number }> = [];
      let vehicleBrand = 'N/A';
      let vehicleModel = '';
      let vehicleYear = new Date().getFullYear();
      let vehiclePrice = 0;
      let coverageType: 'COMPREHENSIVE' | 'TLO' = 'COMPREHENSIVE';

      if (product === 'CAR' || product === 'MOTORCYCLE') {
        const zone = getZone('');
        const breakdown = calcOjkPremium(product === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR', carInputs.coverage, carInputs.price, zone, {
          flood: addons.flood, earthquake: addons.earthquake, riot: addons.riot,
          tplLimit: addons.tplLimit, paDriver: addons.paDriver, paPassengerSeats: addons.paPassengerSeats,
        });
        quoteRows = [
          { label: 'Premi Dasar', amount: breakdown.basePremium },
          ...(breakdown.addonsDetail.flood > 0      ? [{ label: 'Perluasan Banjir',     amount: breakdown.addonsDetail.flood }]      : []),
          ...(breakdown.addonsDetail.earthquake > 0 ? [{ label: 'Perluasan Gempa Bumi', amount: breakdown.addonsDetail.earthquake }] : []),
          ...(breakdown.addonsDetail.riot > 0       ? [{ label: 'Perluasan Huru-Hara',  amount: breakdown.addonsDetail.riot }]       : []),
          ...(breakdown.addonsDetail.tpl > 0        ? [{ label: 'TPL',                  amount: breakdown.addonsDetail.tpl }]        : []),
          ...(breakdown.addonsDetail.paDriver > 0   ? [{ label: 'PA Pengemudi',         amount: breakdown.addonsDetail.paDriver }]   : []),
          ...(breakdown.addonsDetail.paPassenger > 0? [{ label: 'PA Penumpang',         amount: breakdown.addonsDetail.paPassenger }]: []),
          { label: 'Biaya Admin', amount: breakdown.adminFee },
          { label: 'Materai', amount: breakdown.stampDuty },
        ];
        vehicleBrand = carInputs.brand;
        vehicleModel = carInputs.model;
        vehicleYear = carInputs.year;
        vehiclePrice = carInputs.price;
        coverageType = carInputs.coverage;
      } else {
        // PA, TRAVEL, MPAR — simple premium
        quoteRows = [{ label: `Premi ${product}`, amount: premium }];
        vehicleBrand = product;
        vehicleModel = product === 'PA' ? `Plan: ${paInputs.plan}` : product === 'TRAVEL' ? `${travelInputs.adults} adult(s)` : mparInputs.itemName;
        vehicleYear = new Date().getFullYear();
        vehiclePrice = premium;
      }

      const quoteNumber = `QS/SP/${new Date().getFullYear()}/${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()]}/${Math.floor(Math.random() * 9000 + 1000)}`;
      await publishAndDownloadQuotation(fromAgentQuote({
        quoteNumber,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        clientName,
        clientPhone: '',
        agentName: agent?.name ?? 'Mitra SurePath',
        agentCode: agent?.agent_code ?? '',
        agentPhone: agent?.phone ?? agent?.whatsapp ?? '',
        product,
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        vehiclePrice,
        coverageType,
        zone: getZone(''),
        ojkRate: product === 'CAR' || product === 'MOTORCYCLE' ? (premium > 0 && vehiclePrice > 0 ? premium / vehiclePrice : 0.025) : 0,
        rateBand: 'MID',
        providerName: 'PT Zurich Asuransi Indonesia Tbk',
        rows: quoteRows,
        totalPremium: premium,
      }), { sourceApp: 'AGENT', totalPremiumNumeric: premium });
      toast.success(t('Quotation slip generated!', 'Slip penawaran berhasil dibuat!'));
    } catch (e: any) {
      console.error('Print quote error:', e);
      toast.error(t('Failed to generate PDF: ', 'Gagal membuat PDF: ') + (e?.message ?? ''));
    } finally {
      setPrintingQuote(false);
    }
  };

  const reset = () => {
    setStep('product');
    setClientMode(localClients.length > 0 ? 'select' : 'new');
    setSelectedClientId('');
    setOnetimeName('');
    setNewClient({ name: '', phone: '' });
    setCreatedClientId('');
    setProduct(null);
    setQuoteMode(null);
    setCarInputs({ brand: '', model: '', year: new Date().getFullYear(), price: 0, coverage: 'COMPREHENSIVE' });
    setAddons({ flood: false, earthquake: false, riot: false, tplLimit: 0, paDriver: false, paPassengerSeats: 0 });
    setTravelInputs({ destination: '', startDate: '', endDate: '', adults: 1, plan: 'GOLD' });
    setPAInputs({ category: 'GENERAL', plan: 'BASIC' });
    setMPARInputs({ category: 'GADGET', itemName: '', price: 0, period: 12 });
    setSavedQuote(null);
    setCreatedPolicy(null);
  };

  const stepIndex = ['product', 'inputs', 'client', 'summary'].indexOf(
    step === 'quote_summary' ? 'summary' : step
  );

  const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1.5";

  // ─── SUCCESS SCREEN ───
  if (step === 'success') {
    return (
      <div className="bg-gray-50 min-h-screen pb-28 px-4 py-6 max-w-lg mx-auto flex flex-col items-center text-center gap-6 min-h-[70vh] justify-center font-sora">
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
          className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all w-full flex items-center justify-center gap-2"
        >
          <Download size={14} />
          {t('Download Certificate (PDF)', 'Unduh Sertifikat (PDF)')}
        </button>
        <div className="flex gap-3 w-full">
          <button onClick={reset} className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all">
            {t('New Quote', 'Penawaran Baru')}
          </button>
          <button onClick={onBack} className="h-12 px-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm active:bg-gray-50 transition-all">
            {t('Back to Home', 'Kembali')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-28 px-4 py-6 max-w-lg mx-auto space-y-5 font-sora">
      {/* Tab switcher */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1">
        <button
          onClick={() => setQuoteTab('new')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            quoteTab === 'new' ? 'bg-gray-100 shadow-sm text-gray-900' : 'text-gray-400'
          }`}
        >
          <RefreshCw size={12} /> {t('New Quote', 'Penawaran Baru')}
        </button>
        <button
          onClick={() => setQuoteTab('orders')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            quoteTab === 'orders' ? 'bg-gray-100 shadow-sm text-gray-900' : 'text-gray-400'
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
        <button onClick={step === 'product' ? onBack : () => {
          if (step === 'inputs') { setStep('product'); setQuoteMode(null); }
          else if (step === 'client') setStep('inputs');
          else if (step === 'quote_summary') setStep('client');
          else if (step === 'summary') setStep('client');
        }} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{t('Quote Builder', 'Buat Penawaran')}</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
            {t(`Step ${stepIndex + 1} of 4`, `Langkah ${stepIndex + 1} dari 4`)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / 4) * 100}%`, background: 'linear-gradient(90deg, #00C16A, #047857)' }}
        />
      </div>

      {/* ─── STEP 3: CLIENT (setelah produk & input — tidak wajib buat data klien duluan) ─── */}
      {step === 'client' && (
        <div className="space-y-4">
          <div className="mx-0 rounded-2xl bg-white border border-gray-100 p-4 text-sm font-medium text-gray-500">
            {t('Who is this quote for?', 'Penawaran ini untuk siapa?')}
            <p className="text-xs text-gray-400 mt-1 font-normal">
              {t('Pick an existing client, add a new one instantly, or just type a name.',
                 'Pilih klien lama, tambah klien baru langsung di sini, atau cukup ketik nama.')}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setClientMode('select')}
              className={`py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                clientMode === 'select'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-white border border-gray-200 text-gray-500'
              }`}
            >
              <Users size={14} />{t('My Clients', 'Klien Saya')}
            </button>
            <button
              onClick={() => setClientMode('new')}
              className={`py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                clientMode === 'new'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-white border border-gray-200 text-gray-500'
              }`}
            >
              <UserPlus size={14} />{t('New Client', 'Klien Baru')}
            </button>
            <button
              onClick={() => setClientMode('onetime')}
              className={`py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                clientMode === 'onetime'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-white border border-gray-200 text-gray-500'
              }`}
            >
              <User size={14} />{t('One-time', 'Satu Kali')}
            </button>
          </div>

          {clientMode === 'select' && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {localClients.length === 0 && (
                <div className="text-center py-6 space-y-2">
                  <p className="text-slate-400 text-sm font-medium">{t('No clients yet.', 'Belum ada klien.')}</p>
                  <button
                    onClick={() => setClientMode('new')}
                    className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-bold"
                  >
                    <UserPlus size={14} /> {t('Add a new client here', 'Tambah klien baru di sini')}
                  </button>
                </div>
              )}
              {localClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    selectedClientId === c.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    <span className="font-black text-sm">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  {selectedClientId === c.id && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {clientMode === 'new' && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>{t('Client Name', 'Nama Klien')} *</label>
                <input
                  type="text"
                  placeholder={t('Enter client name…', 'Masukkan nama klien…')}
                  value={newClient.name}
                  onChange={e => { setNewClient(v => ({ ...v, name: e.target.value })); setCreatedClientId(''); }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('Phone (WhatsApp)', 'No. HP (WhatsApp)')} *</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={newClient.phone}
                  onChange={e => { setNewClient(v => ({ ...v, phone: e.target.value })); setCreatedClientId(''); }}
                  className={inputClass}
                />
              </div>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                {t('Saved automatically to your client list.', 'Otomatis tersimpan ke daftar Klien Anda.')}
              </p>
            </div>
          )}

          {clientMode === 'onetime' && (
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
            disabled={!canProceedClient || addingClient}
            onClick={handleClientNext}
            className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {addingClient ? <RefreshCw size={16} className="animate-spin" /> : <>{t('See Quote', 'Lihat Penawaran')} <ChevronRight size={16} /></>}
          </button>
        </div>
      )}

      {/* ─── STEP 1: SELECT PRODUCT ─── */}
      {step === 'product' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.map(p => {
              const Icon = p.icon;
              const active = product === p.type;
              return (
                <button
                  key={p.type}
                  onClick={() => { setProduct(p.type); setActiveProduct(null); }}
                  className={`p-5 rounded-xl border text-left transition-all active:scale-95 ${
                    active
                      ? 'border-2 border-emerald-500 bg-emerald-50'
                      : 'border border-gray-200 bg-white'
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
                  {active && <CheckCircle2 size={14} className="text-[#16a34a] mt-2" />}
                  {p.ojk && (
                    <span className="mt-1.5 inline-block text-[8px] font-black uppercase tracking-widest bg-[#16a34a]/10 text-[#16a34a] px-2 py-0.5 rounded-full">OJK</span>
                  )}
                </button>
              );
            })}
            {/* Life Insurance card */}
            <button
              onClick={() => { setProduct(null); setActiveProduct('life'); }}
              className={`p-5 rounded-xl border text-left transition-all active:scale-95 ${
                activeProduct === 'life'
                  ? 'border-2 border-emerald-500 bg-emerald-50'
                  : 'border border-gray-200 bg-white'
              }`}
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3">
                <Heart size={22} className="text-emerald-500" />
              </div>
              <p className="font-black text-sm leading-tight">
                {lang === Language.EN ? 'Life Insurance' : 'Asuransi Jiwa'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {lang === Language.EN ? 'Term, Whole Life & Unit Link' : 'Jiwa, Seumur Hidup & Unit Link'}
              </p>
              {activeProduct === 'life' && <CheckCircle2 size={14} className="text-emerald-500 mt-2" />}
            </button>
          </div>
          {/* Mode chooser for CAR/MOTORCYCLE */}
          {(product === 'CAR' || product === 'MOTORCYCLE') && (
            <div className="space-y-3 pt-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Pilih Tindakan</p>
              <button
                onClick={() => { setQuoteMode('penawaran'); setStep('inputs'); }}
                className="w-full rounded-[1.5rem] overflow-hidden text-left active:scale-95 transition-all shadow-lg"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">📄</div>
                    <div>
                      <p className="font-black text-white text-sm">Buat Penawaran</p>
                      <p className="text-[10px] text-blue-100/80 mt-0.5">Hitung premi, cetak PDF. Tanpa dokumen.</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-white/60" />
                  </div>
                </div>
              </button>
              {!quoteOnly && (
                <button
                  onClick={() => { setQuoteMode('beli'); setVehicleWizardType(product as 'CAR' | 'MOTORCYCLE'); }}
                  className="w-full rounded-[1.5rem] overflow-hidden text-left active:scale-95 transition-all shadow-lg"
                >
                  <div className="bg-gradient-to-r from-[#16a34a] to-[#15803d] p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🛒</div>
                      <div>
                        <p className="font-black text-white text-sm">Beli Langsung</p>
                        <p className="text-[10px] text-emerald-100/80 mt-0.5">Proses polis lengkap + survei + pembayaran.</p>
                      </div>
                      <ChevronRight size={16} className="ml-auto text-white/60" />
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* For non-vehicle or life products */}
          {product && product !== 'CAR' && product !== 'MOTORCYCLE' && (
            <button
              onClick={() => setStep('inputs')}
              className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              {t('Next', 'Lanjut')} <ChevronRight size={16} />
            </button>
          )}

          {activeProduct === 'life' && (
            <button
              onClick={() => setActiveProduct('life')}
              className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              {t('Start Life Application', 'Mulai Aplikasi Jiwa')} <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* ─── STEP 2: PRODUCT INPUTS ─── */}
      {step === 'inputs' && (
        <div className="space-y-4">
          {/* STNK Auto-Extract — AI reads STNK and pre-fills vehicle data + recommends package */}
          {(product === 'CAR' || product === 'MOTORCYCLE') && (
            <STNKAutoExtract
              onExtracted={(data) => {
                // Auto-fill car inputs from STNK extraction
                setCarInputs(v => ({
                  ...v,
                  brand: data.extraction.brand || v.brand,
                  model: data.extraction.model || v.model,
                  year: data.extraction.year || v.year,
                  price: data.extraction.estimatedMarketValue || v.price,
                }));
                toast.success(`STNK terbaca: ${data.extraction.brand} ${data.extraction.model} ${data.extraction.year}. Premi estimasi: Rp ${data.recommendation.estimatedPremium.toLocaleString('id-ID')}`);
              }}
              compact
            />
          )}

          {/* CAR / MOTORCYCLE — dropdowns from vehicle database */}
          {(product === 'CAR' || product === 'MOTORCYCLE') && (
            <>
              <div>
                <label className={labelClass}>{t('Vehicle Brand', 'Merek Kendaraan')}</label>
                <select
                  value={carInputs.brand}
                  onChange={e => setCarInputs(v => ({ ...v, brand: e.target.value, model: '', price: 0 }))}
                  className={inputClass}
                >
                  <option value="">— Pilih Merek —</option>
                  {(product === 'CAR' ? VEHICLE_BRANDS : MOTO_BRANDS).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {carInputs.brand && (
                <div>
                  <label className={labelClass}>{t('Model', 'Model')}</label>
                  <select
                    value={carInputs.model}
                    onChange={e => {
                      const model = e.target.value;
                      const mv = product === 'CAR'
                        ? getMarketValue(carInputs.brand, model)
                        : getMarketValueForMoto(carInputs.brand, model);
                      setCarInputs(v => ({ ...v, model, price: mv ?? v.price }));
                    }}
                    className={inputClass}
                  >
                    <option value="">— Pilih Model —</option>
                    {(product === 'CAR' ? getModelsForBrand(carInputs.brand) : getModelsForMotoBrand(carInputs.brand)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {carInputs.brand && carInputs.model && carInputs.price > 0 && (
                <p className="text-xs text-emerald-400 font-bold">
                  Nilai Pasar: {formatIDR(carInputs.price)}
                </p>
              )}

              <div>
                <label className={labelClass}>{t('Year', 'Tahun')}</label>
                <input
                  type="number"
                  value={carInputs.year}
                  onChange={e => {
                    const yr = parseInt(e.target.value) || new Date().getFullYear();
                    const yearPrice = carInputs.model
                      ? (product === 'CAR'
                          ? getMarketValueForYear(carInputs.brand, carInputs.model, yr)
                          : getMarketValueForMotoYear(carInputs.brand, carInputs.model, yr))
                      : null;
                    setCarInputs(v => ({ ...v, year: yr, price: yearPrice ?? v.price }));
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t('Vehicle Price (Rp)', 'Harga Kendaraan (Rp)')}</label>
                <input
                  type="number"
                  value={carInputs.price || ''}
                  onChange={e => setCarInputs(v => ({ ...v, price: parseInt(e.target.value) || 0 }))}
                  className={inputClass}
                  placeholder="250000000"
                />
              </div>

              <div>
                <label className={labelClass}>{t('Coverage Type', 'Tipe Perlindungan')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['COMPREHENSIVE', 'TLO'] as const).map(c => (
                    <button key={c} onClick={() => setCarInputs(v => ({ ...v, coverage: c }))}
                      className={`py-3 rounded-xl text-xs font-semibold transition-all ${carInputs.coverage === c ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}>
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
                      className={`py-3 rounded-xl text-xs font-semibold transition-all ${travelInputs.plan === p ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}>
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
                      className={`py-3 rounded-xl text-xs font-semibold transition-all ${paInputs.category === c ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}>
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
                      className={`py-3 rounded-xl text-xs font-semibold transition-all ${paInputs.plan === p ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}>
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
                      className={`py-3 rounded-xl text-xs font-semibold transition-all ${mparInputs.category === c ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}>
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
                      className={`py-3 rounded-xl text-xs font-semibold transition-all ${mparInputs.period === p ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}>
                      {p} {t('Months', 'Bulan')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            disabled={!canProceedInputs()}
            onClick={() => setStep('client')}
            className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {t('Next: Client Info', 'Lanjut: Data Klien')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ─── STEP QUOTE_SUMMARY: Penawaran-only for CAR/MOTORCYCLE ─── */}
      {step === 'quote_summary' && (product === 'CAR' || product === 'MOTORCYCLE') && (
        <div className="space-y-4">
          {/* Addon Coverage Selection */}
          <div className="bg-white dark:bg-[#242836] rounded-2xl p-4 border border-gray-200 dark:border-[#3A3F52] space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-[#B8BFD0]">Perluasan Jaminan</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAddons(v => ({ ...v, flood: !v.flood }))}
                className={`p-3 rounded-xl text-left border-2 transition-all ${addons.flood ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-[#3A3F52] bg-gray-50 dark:bg-[#2C3142]'}`}
              >
                <p className="text-xs font-bold text-gray-800 dark:text-white">🌊 Banjir & Badai</p>
                <p className="text-[10px] text-gray-500 dark:text-[#8E95A8]">Perluasan bencana alam</p>
              </button>
              <button
                onClick={() => setAddons(v => ({ ...v, earthquake: !v.earthquake }))}
                className={`p-3 rounded-xl text-left border-2 transition-all ${addons.earthquake ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-[#3A3F52] bg-gray-50 dark:bg-[#2C3142]'}`}
              >
                <p className="text-xs font-bold text-gray-800 dark:text-white">⚡ Gempa & Tsunami</p>
                <p className="text-[10px] text-gray-500 dark:text-[#8E95A8]">Perluasan gempa bumi</p>
              </button>
              <button
                onClick={() => setAddons(v => ({ ...v, riot: !v.riot }))}
                className={`p-3 rounded-xl text-left border-2 transition-all ${addons.riot ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-[#3A3F52] bg-gray-50 dark:bg-[#2C3142]'}`}
              >
                <p className="text-xs font-bold text-gray-800 dark:text-white">🔥 Huru-Hara</p>
                <p className="text-[10px] text-gray-500 dark:text-[#8E95A8]">Kerusuhan & SRCC</p>
              </button>
              <button
                onClick={() => setAddons(v => ({ ...v, paDriver: !v.paDriver }))}
                className={`p-3 rounded-xl text-left border-2 transition-all ${addons.paDriver ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-[#3A3F52] bg-gray-50 dark:bg-[#2C3142]'}`}
              >
                <p className="text-xs font-bold text-gray-800 dark:text-white">🧑‍✈️ PA Pengemudi</p>
                <p className="text-[10px] text-gray-500 dark:text-[#8E95A8]">Kecelakaan diri pengemudi</p>
              </button>
            </div>
            {/* TPL selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E95A8]">TPL (Tanggung Jawab Pihak Ketiga)</label>
              <div className="flex gap-2">
                {[0, 10000000, 25000000, 50000000].map(limit => (
                  <button
                    key={limit}
                    onClick={() => setAddons(v => ({ ...v, tplLimit: v.tplLimit === limit ? 0 : limit }))}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${addons.tplLimit === limit ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-[#2C3142] text-gray-500 dark:text-[#8E95A8]'}`}
                  >
                    {limit === 0 ? 'Tidak' : `${limit / 1000000}jt`}
                  </button>
                ))}
              </div>
            </div>
            {/* PA Passenger seats */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8E95A8]">PA Penumpang (jumlah kursi)</label>
              <div className="flex gap-2">
                {[0, 1, 2, 4].map(seats => (
                  <button
                    key={seats}
                    onClick={() => setAddons(v => ({ ...v, paPassengerSeats: v.paPassengerSeats === seats ? 0 : seats }))}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${addons.paPassengerSeats === seats ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-[#2C3142] text-gray-500 dark:text-[#8E95A8]'}`}
                  >
                    {seats === 0 ? 'Tidak' : `${seats} kursi`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-6 text-white shadow-2xl">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Penawaran Kendaraan</p>
            <h2 className="font-black text-2xl tracking-tight">{clientName}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{carInputs.brand} {carInputs.model} ({carInputs.year})</p>
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs font-bold">Harga Kendaraan</span>
                <span className="font-bold text-sm">{formatIDR(carInputs.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs font-bold">Perlindungan</span>
                <span className="font-bold text-sm">{carInputs.coverage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs font-bold">Rate OJK</span>
                <span className="font-bold text-sm">{(getBaseRateByBand(product === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR', carInputs.coverage, getZone(''), getVehicleCategory(carInputs.price), 'MID') * 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Est. Premi Tahunan</p>
              <p className="font-black text-3xl text-white mt-0.5">{formatIDR(premium)}</p>
            </div>
            <div className="mt-3 bg-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">Komisi Anda</span>
              <span className="font-black text-emerald-400">{formatIDR(commission)}</span>
            </div>
          </div>

          <button
            onClick={handlePrintQuote}
            disabled={printingQuote || !carInputs.brand || !carInputs.model || carInputs.price <= 0}
            className="h-12 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
          >
            {printingQuote ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Cetak Slip Penawaran (4 halaman)
          </button>

          <button
            onClick={handleSaveQuote}
            disabled={saving || !!savedQuote}
            className="h-12 px-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm active:bg-gray-50 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <FileCheck size={14} />}
            {savedQuote ? 'Penawaran Tersimpan!' : 'Simpan Penawaran'}
          </button>

          <a
            href={`https://wa.me/?text=${buildWAText()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all w-full flex items-center justify-center gap-2"
          >
            <Send size={14} />
            Kirim via WhatsApp
          </a>

          <button
            onClick={() => { setQuoteMode('beli'); setVehicleWizardType(product as 'CAR' | 'MOTORCYCLE'); }}
            className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all w-full flex items-center justify-center gap-2"
          >
            <ChevronRight size={14} />
            Lanjut ke Pembelian
          </button>
        </div>
      )}

      {/* ─── STEP 4: SUMMARY ─── */}
      {step === 'summary' && product && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-6 text-white shadow-2xl">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{t('Quote Summary', 'Ringkasan Penawaran')}</p>
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
          <div className="mx-5 mt-4 rounded-2xl bg-white border border-gray-100 p-4 space-y-2">
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
            className="h-12 px-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm active:bg-gray-50 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <FileCheck size={14} />}
            {savedQuote ? t('Quote Saved!', 'Penawaran Tersimpan!') : t('Save Quote', 'Simpan Penawaran')}
          </button>

          {/* PDF download — available for ALL products */}
          <button
            onClick={handlePrintQuote}
            disabled={printingQuote}
            className="h-12 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
          >
            {printingQuote ? <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" /> : <FileText size={14} />}
            {t('Print Quotation Slip (4 pages)', 'Cetak Slip Penawaran (4 halaman)')}
          </button>

          <a
            href={`https://wa.me/?text=${buildWAText()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all w-full flex items-center justify-center gap-2"
          >
            <Send size={14} />
            {t('Share via WhatsApp', 'Kirim via WhatsApp')}
          </a>

          <button
            onClick={handleConvert}
            disabled={converting}
            className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
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
