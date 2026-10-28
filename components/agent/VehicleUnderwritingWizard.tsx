import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car, Bike, Search, User, ChevronRight, Upload, CheckCircle,
  AlertTriangle, XCircle, ArrowLeft, Loader2, FileText,
  Mail, Package, Smartphone, ScanLine,
} from 'lucide-react';
import SearchableSelect from '../car-wizard/SearchableSelect';
import { Language } from '../../types';
import { analyzeVehicleSurvey, validateVehiclePhoto, SurveyAnalysisResult } from '../../services/geminiService';
import { extractStnkOcr, type StnkOcrResult } from '../../services/stnkOcr';
import { lookupPlate } from '../../services/plateCodes';
import {
  calcPremium, getZone, getVehicleCategory, PROVINCES,
  VEHICLE_USAGES, TPL_OPTIONS, ZONE_LABELS,
  type VehicleType, type CoverageType, type Zone, type PremiumBreakdown, type AddOns,
} from '../../services/ojkRates';
import {
  CAR_BRANDS, getModelsForBrand, getMarketValue,
  MOTO_BRANDS, getModelsForMotoBrand, getMarketValueForMoto,
} from '../../services/vehicleDatabase';
import {
  createPolicyOrder, uploadVehicleImage, addNotification, getProductConfig,
  getAvailableInsurerProducts, addClient,
  type SpClient, type SpProductConfig, type SpInsurerProduct,
} from '../../services/supabaseService';
import { createXenditInvoice } from '../../services/paymentService';
import { formatIDR } from '../car-wizard/WizardUI';
import { InsurerLogo, INSURER_BRANDS } from '../shared/InsurerLogos';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  agentId: string;
  agent: any;
  clients: SpClient[];
  lang: Language;
  initialVehicleType?: VehicleType;
  initialQuote?: {
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    brand?: string;
    model?: string;
    year?: number;
    price?: number;
    coverage?: 'COMPREHENSIVE' | 'TLO';
    addons?: Partial<AddOns>;
    discountRate?: number;
  };
  onBack: () => void;
  onOrderCreated?: (orderNumber: string) => void;
}

// ─── Plate Codes (Indonesian regional plate → OJK province) ──────────────────

interface PlateCodeEntry { code: string; region: string; province: string; }

const PLATE_CODES: PlateCodeEntry[] = [
  // Zone 2 — DKI Jakarta, Jawa Barat, Banten
  { code: 'B',  region: 'DKI Jakarta / Bekasi / Depok / Tangerang', province: 'DKI Jakarta' },
  { code: 'D',  region: 'Bandung & sekitarnya', province: 'Jawa Barat' },
  { code: 'E',  region: 'Cirebon', province: 'Jawa Barat' },
  { code: 'F',  region: 'Bogor / Sukabumi / Cianjur', province: 'Jawa Barat' },
  { code: 'T',  region: 'Purwakarta / Karawang / Subang', province: 'Jawa Barat' },
  { code: 'Z',  region: 'Tasikmalaya / Garut / Ciamis', province: 'Jawa Barat' },
  { code: 'A',  region: 'Banten / Serang / Tangerang', province: 'Banten' },
  // Zone 3 — Jawa Tengah & DIY
  { code: 'H',  region: 'Semarang & sekitarnya', province: 'Jawa Tengah' },
  { code: 'G',  region: 'Pekalongan / Tegal', province: 'Jawa Tengah' },
  { code: 'K',  region: 'Pati / Kudus / Blora / Jepara', province: 'Jawa Tengah' },
  { code: 'R',  region: 'Banyumas / Cilacap / Purbalingga', province: 'Jawa Tengah' },
  { code: 'AA', region: 'Magelang / Temanggung / Kedu', province: 'Jawa Tengah' },
  { code: 'AD', region: 'Surakarta / Solo', province: 'Jawa Tengah' },
  { code: 'AB', region: 'DI Yogyakarta', province: 'DI Yogyakarta' },
  // Zone 3 — Jawa Timur
  { code: 'AE', region: 'Madiun', province: 'Jawa Timur' },
  { code: 'AG', region: 'Kediri / Blitar / Tulungagung', province: 'Jawa Timur' },
  { code: 'L',  region: 'Surabaya', province: 'Jawa Timur' },
  { code: 'M',  region: 'Madura', province: 'Jawa Timur' },
  { code: 'N',  region: 'Malang & sekitarnya', province: 'Jawa Timur' },
  { code: 'P',  region: 'Besuki / Banyuwangi', province: 'Jawa Timur' },
  { code: 'S',  region: 'Bojonegoro / Tuban / Lamongan', province: 'Jawa Timur' },
  { code: 'W',  region: 'Sidoarjo / Mojokerto / Gresik', province: 'Jawa Timur' },
  // Zone 3 — Bali & Nusa Tenggara
  { code: 'DK', region: 'Bali', province: 'Bali' },
  { code: 'DR', region: 'Lombok / NTB', province: 'Nusa Tenggara Barat' },
  { code: 'EA', region: 'Sumbawa', province: 'Nusa Tenggara Barat' },
  { code: 'DH', region: 'Kupang / NTT', province: 'Nusa Tenggara Timur' },
  { code: 'EB', region: 'Flores / Ende', province: 'Nusa Tenggara Timur' },
  { code: 'ED', region: 'Sumba', province: 'Nusa Tenggara Timur' },
  // Zone 1 — Sumatera
  { code: 'BL', region: 'Aceh', province: 'Aceh' },
  { code: 'BK', region: 'Medan & Sumatera Utara', province: 'Sumatera Utara' },
  { code: 'BB', region: 'Tapanuli / Sumatera Utara', province: 'Sumatera Utara' },
  { code: 'BA', region: 'Padang / Sumatera Barat', province: 'Sumatera Barat' },
  { code: 'BM', region: 'Pekanbaru / Riau', province: 'Riau' },
  { code: 'BP', region: 'Batam / Kepulauan Riau', province: 'Kepulauan Riau' },
  { code: 'BN', region: 'Bangka Belitung', province: 'Kepulauan Bangka Belitung' },
  { code: 'BH', region: 'Jambi', province: 'Jambi' },
  { code: 'BD', region: 'Bengkulu', province: 'Bengkulu' },
  { code: 'BE', region: 'Lampung', province: 'Lampung' },
  { code: 'BG', region: 'Palembang / Sumatera Selatan', province: 'Sumatera Selatan' },
  // Zone 3 — Kalimantan
  { code: 'DA', region: 'Banjarmasin / Kalimantan Selatan', province: 'Kalimantan Selatan' },
  { code: 'KB', region: 'Pontianak / Kalimantan Barat', province: 'Kalimantan Barat' },
  { code: 'KH', region: 'Palangkaraya / Kalimantan Tengah', province: 'Kalimantan Tengah' },
  { code: 'KT', region: 'Samarinda / Kalimantan Timur', province: 'Kalimantan Timur' },
  { code: 'KU', region: 'Tarakan / Kalimantan Utara', province: 'Kalimantan Utara' },
  // Zone 3 — Sulawesi
  { code: 'DB', region: 'Manado / Sulawesi Utara', province: 'Sulawesi Utara' },
  { code: 'DM', region: 'Gorontalo', province: 'Gorontalo' },
  { code: 'DN', region: 'Palu / Sulawesi Tengah', province: 'Sulawesi Tengah' },
  { code: 'DC', region: 'Mamuju / Sulawesi Barat', province: 'Sulawesi Barat' },
  { code: 'DD', region: 'Makassar / Sulawesi Selatan', province: 'Sulawesi Selatan' },
  { code: 'DW', region: 'Gowa / Takalar (Sulsel)', province: 'Sulawesi Selatan' },
  { code: 'DP', region: 'Kendari / Sulawesi Tenggara', province: 'Sulawesi Tenggara' },
  { code: 'DT', region: 'Bau-Bau / Sulawesi Tenggara', province: 'Sulawesi Tenggara' },
  // Zone 3 — Maluku & Papua
  { code: 'DE', region: 'Ambon / Maluku', province: 'Maluku' },
  { code: 'DG', region: 'Ternate / Maluku Utara', province: 'Maluku Utara' },
  { code: 'DS', region: 'Jayapura / Papua', province: 'Papua' },
  { code: 'PB', region: 'Manokwari / Papua Barat', province: 'Papua Barat' },
];

const PHOTO_SLOTS = [
  { id: 'front',     label: 'Depan',      desc: 'Bagian depan kendaraan' },
  { id: 'back',      label: 'Belakang',   desc: 'Bagian belakang kendaraan' },
  { id: 'left',      label: 'Sisi Kiri',  desc: 'Samping kiri kendaraan' },
  { id: 'right',     label: 'Sisi Kanan', desc: 'Samping kanan kendaraan' },
  { id: 'dashboard', label: 'Dashboard',  desc: 'Bagian dalam / kabin kendaraan' },
] as const;

const PHOTO_GUIDELINES = [
  'Kendaraan dalam kondisi bersih sebelum difoto',
  'Tidak ada objek yang menghalangi kendaraan',
  'Pencahayaan terang dan merata (tidak di malam hari)',
  'Tidak di dalam basement atau tempat gelap',
  'Plat nomor kendaraan harus terlihat jelas',
  'Foto langsung dari kamera — bukan foto layar / foto dari internet',
  'Pastikan seluruh bodi kendaraan terlihat dari sudut yang diminta',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

const YEARS: number[] = [];
for (let y = currentYear; y >= 2000; y--) YEARS.push(y);

const todayISO = new Date().toISOString().slice(0, 10);
const oneYearLater = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  .toISOString()
  .slice(0, 10);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data:image/...;base64, prefix
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function productInfo(vehicleType: VehicleType, coverageType: CoverageType) {
  const typeLabel = vehicleType === 'CAR' ? 'Roda 4' : 'Roda 2';
  const covLabel = coverageType === 'COMPREHENSIVE' ? 'Komprehensif (All Risk)' : 'TLO';
  const covCode = coverageType === 'COMPREHENSIVE' ? 'COMP' : 'TLO';
  const typeCode = vehicleType === 'CAR' ? 'B4' : 'B2';
  return {
    code: `MRKB${typeCode}-${covCode}`,
    name: `Kendaraan ${typeLabel} – ${covLabel}`,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ZoneBadge: React.FC<{ zone: Zone }> = ({ zone }) => {
  const colors: Record<Zone, string> = {
    1: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    2: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors[zone]}`}>
      {ZONE_LABELS[zone]}
    </span>
  );
};

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 p-6 ${className}`}>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
    {children}
  </label>
);

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ds-green text-sm transition';

const PrimaryBtn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="bg-ds-green hover:bg-ds-green-dk disabled:opacity-40 text-ds-on-green rounded-2xl font-black uppercase tracking-widest px-6 py-3 transition text-sm"
  >
    {children}
  </button>
);

const SecondaryBtn: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({
  children,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 rounded-2xl px-6 py-3 font-semibold text-sm transition"
  >
    {children}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const VehicleUnderwritingWizard: React.FC<Props> = ({
  agentId,
  clients,
  initialVehicleType,
  initialQuote,
  onBack,
  onOrderCreated,
}) => {
  // ── Step ──
  // If converting a quote, continue at vehicle details and preserve all quote inputs.
  const [step, setStep] = useState(initialQuote ? 3 : initialVehicleType ? 2 : 1);

  // ── Step 1: Vehicle Type ──
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialVehicleType ?? 'CAR');

  // ── Step 2: Client ──
  const [selectedClient, setSelectedClient] = useState<SpClient | null>(
    () => clients.find(client => client.id === initialQuote?.clientId) ?? null
  );
  const [manualClient, setManualClient] = useState({
    name: initialQuote?.clientName ?? '',
    phone: initialQuote?.clientPhone ?? '',
    ktp: '',
  });
  const [useManualClient, setUseManualClient] = useState(
    () => !!initialQuote?.clientName && !clients.some(client => client.id === initialQuote.clientId)
  );
  const [clientSearch, setClientSearch] = useState('');

  // ── Step 3: Vehicle Details ──
  const [vehicleDetails, setVehicleDetails] = useState({
    make: initialQuote?.brand ?? '',
    model: initialQuote?.model ?? '',
    year: initialQuote?.year ?? currentYear,
    variant: '',
    plate: '',
    plateCode: '',
    plateNum: '',
    plateSuffix: '',
    chassis: '',
    engine: '',
    color: '',
    usage: 'PERSONAL',
  });

  // ── Step 4: Coverage ──
  const [province, setProvince] = useState('');
  const [sumInsured, setSumInsured] = useState(initialQuote?.price ?? 0);
  const [sumInsuredDisplay, setSumInsuredDisplay] = useState(
    initialQuote?.price ? initialQuote.price.toLocaleString('id-ID') : ''
  );
  const [coverageType, setCoverageType] = useState<CoverageType>(initialQuote?.coverage ?? 'COMPREHENSIVE');
  const [addons, setAddons] = useState<AddOns>({
    flood: initialQuote?.addons?.flood ?? false,
    earthquake: initialQuote?.addons?.earthquake ?? false,
    riot: initialQuote?.addons?.riot ?? false,
    tplLimit: initialQuote?.addons?.tplLimit ?? 0,
    paDriver: initialQuote?.addons?.paDriver ?? false,
    paPassengerSeats: initialQuote?.addons?.paPassengerSeats ?? 0,
  });

  // ── Step 4b: Insurer Selection ──
  const [availableProducts, setAvailableProducts] = useState<SpInsurerProduct[]>([]);
  const [excludedByAgeCount, setExcludedByAgeCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedInsurerProduct, setSelectedInsurerProduct] = useState<SpInsurerProduct | null>(null);

  // ── Step 5: Photo + AI ──
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({});
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [photoValidation, setPhotoValidation] = useState<Record<string, { status: 'LOADING' | 'VALID' | 'INVALID'; msg?: string }>>({});
  const [aiScoring, setAiScoring] = useState(false);
  const [aiResult, setAiResult] = useState<SurveyAnalysisResult | null>(null);

  // ── Step 6: Discount ──
  const [productConfig, setProductConfig] = useState<SpProductConfig | null>(null);
  const [discountRate, setDiscountRate] = useState(initialQuote?.discountRate ?? 0); // 0.00 – max_discount_rate

  // ── Step 6b: Delivery ──
  const [deliveryMethod, setDeliveryMethod] = useState<'DIGITAL' | 'POS_STANDARD' | 'POS_OVERNIGHT'>('DIGITAL');
  const [deliveryRegion, setDeliveryRegion] = useState<'JABODETABEK' | 'OUTSIDE'>('JABODETABEK');

  // ── Step 7: Order ──
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderError, setOrderError] = useState('');
  const orderStarted = useRef(false);

  // ── Payment ──
  const [payLoading, setPayLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [payError, setPayError] = useState('');

  // ─── Derived ───────────────────────────────────────────────────────────────

  const zone: Zone = province ? getZone(province) : 3;

  const deliveryFee =
    deliveryMethod === 'DIGITAL'       ? 0
    : deliveryMethod === 'POS_STANDARD'
      ? (deliveryRegion === 'JABODETABEK' ? 10_000 : 15_000)
      : /* POS_OVERNIGHT */
        (deliveryRegion === 'JABODETABEK' ? 20_000 : 25_000);

  const filteredClients = clients.filter((c) => {
    const q = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleVehicleDetailChange = useCallback(
    (field: string, value: string | number) => {
      setVehicleDetails((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSumInsuredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10) || 0;
    setSumInsured(num);
    setSumInsuredDisplay(num === 0 ? '' : num.toLocaleString('id-ID'));
  };

  // ── STNK AI OCR — auto-fill vehicle details from a photographed STNK ──────
  // Calls the same extractStnkOcr service the customer wizard uses. Fills
  // every field it can read; surfaces a warning banner with the per-field
  // validation result so the agent knows what to double-check.
  const [stnkScanning, setStnkScanning] = useState(false);
  const [stnkOcrResult, setStnkOcrResult] = useState<StnkOcrResult | null>(null);
  const stnkFileRef = useRef<HTMLInputElement>(null);

  const handleStnkScan = useCallback(async (file: File) => {
    setStnkScanning(true);
    setStnkOcrResult(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const result = await extractStnkOcr(dataUrl, file.type);
      setStnkOcrResult(result);

      if (result.status === 'UNCLEAR' || result.status === 'ERROR') {
        // Don't fill anything — let the agent enter details manually.
        return;
      }

      // Brand — only fill if it matched the vehicle database for the current
      // vehicle type (CAR vs MOTORCYCLE). Avoids setting "HONDA" for a car
      // when the agent is processing a motorcycle, etc.
      const isCar = vehicleType === 'CAR';
      const brandList = isCar ? CAR_BRANDS : MOTO_BRANDS;
      const matchedBrand = result.brand && brandList.some(b => b.toUpperCase() === result.brand!.toUpperCase())
        ? result.brand
        : '';

      if (matchedBrand) {
        handleVehicleDetailChange('make', matchedBrand);
        // Model — match against the brand's known models for the vehicle type
        const knownModels = isCar
          ? getModelsForBrand(matchedBrand)
          : getModelsForMotoBrand(matchedBrand);
        const matchedModel = result.model && knownModels.some(m => m.toUpperCase() === result.model!.toUpperCase())
          ? result.model
          : (result.model ?? '');
        handleVehicleDetailChange('model', matchedModel);

        // Auto-fill sum insured from market value when both make + model matched
        if (matchedModel) {
          const mv = isCar
            ? getMarketValue(matchedBrand, matchedModel)
            : getMarketValueForMoto(matchedBrand, matchedModel);
          if (mv && mv > 0) {
            setSumInsured(mv);
            setSumInsuredDisplay(mv.toLocaleString('id-ID'));
          }
        }
      }

      // Year
      if (result.year) handleVehicleDetailChange('year', result.year);

      // Color
      if (result.color) handleVehicleDetailChange('color', result.color);

      // Plate — split into code / number / suffix for the agent wizard's
      // 3-field plate input (e.g. "B 1234 ABC" → code=B, num=1234, suffix=ABC)
      if (result.plate) {
        const m = result.plate.match(/^([A-Z]{1,2})\s+(\d{1,4})\s+([A-Z]{1,3})$/);
        if (m) {
          handleVehicleDetailChange('plateCode', m[1]);
          handleVehicleDetailChange('plateNum', m[2]);
          handleVehicleDetailChange('plateSuffix', m[3]);
          handleVehicleDetailChange('plate', result.plate);
          // Resolve province from plate code for the zone calculation
          const entry = lookupPlate(result.plate);
          if (entry) {
            setProvince(entry.province);
          }
        }
      }

      // Chassis + engine
      if (result.vin) handleVehicleDetailChange('chassis', result.vin);
      if (result.engineNo) handleVehicleDetailChange('engine', result.engineNo);
    } catch (e) {
      console.error('STNK OCR scan failed:', e);
    } finally {
      setStnkScanning(false);
    }
  }, [vehicleType, handleVehicleDetailChange]);

  const handlePlatePartChange = useCallback((field: 'plateCode' | 'plateNum' | 'plateSuffix', value: string) => {
    setVehicleDetails(prev => {
      const updated = { ...prev, [field]: value };
      const combined = [updated.plateCode, updated.plateNum, updated.plateSuffix].filter(Boolean).join(' ');
      return { ...updated, plate: combined };
    });
  }, []);

  const handlePlateCodeChange = useCallback((code: string) => {
    setVehicleDetails(prev => {
      const combined = [code, prev.plateNum, prev.plateSuffix].filter(Boolean).join(' ');
      return { ...prev, plateCode: code, plate: combined };
    });
    const entry = PLATE_CODES.find(p => p.code === code);
    if (entry) setProvince(p => p || entry.province);
  }, []);

  const handlePhotoUpload = useCallback(async (file: File, slotId: string, slotLabel: string) => {
    const preview = URL.createObjectURL(file);
    setPhotoFiles(prev => ({ ...prev, [slotId]: file }));
    setPhotoPreviews(prev => ({ ...prev, [slotId]: preview }));
    setAiResult(null);

    if (file.size > 10 * 1024 * 1024) {
      setPhotoValidation(prev => ({ ...prev, [slotId]: { status: 'INVALID', msg: 'Ukuran file terlalu besar (maks 10MB)' } }));
      return;
    }
    setPhotoValidation(prev => ({ ...prev, [slotId]: { status: 'LOADING' } }));
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const b64 = ev.target?.result as string;
        const result = await validateVehiclePhoto(b64, slotLabel);
        setPhotoValidation(prev => ({
          ...prev,
          [slotId]: { status: result.valid ? 'VALID' : 'INVALID', msg: result.issue },
        }));
      };
      reader.readAsDataURL(file);
    } catch {
      setPhotoValidation(prev => ({ ...prev, [slotId]: { status: 'VALID' } }));
    }
  }, []);

  const handleRunAI = useCallback(async () => {
    const entries = Object.entries(photoFiles);
    if (entries.length < 3) return;
    setAiScoring(true);
    setAiResult(null);
    try {
      const images = await Promise.all(
        entries.map(async ([id, file]: [string, File]) => ({ id, data: await fileToBase64(file) }))
      );
      const result = await analyzeVehicleSurvey(images, {
        brand: vehicleDetails.make,
        model: vehicleDetails.model,
        color: vehicleDetails.color,
        plate: vehicleDetails.plate,
      });
      setAiResult(result);
    } finally {
      setAiScoring(false);
    }
  }, [photoFiles, vehicleDetails.make, vehicleDetails.model, vehicleDetails.color, vehicleDetails.plate]);

  // ─── Auto-run AI when all 5 photos are uploaded ───────────────────────────

  const photoCount = Object.keys(photoFiles).length;
  useEffect(() => {
    if (photoCount === PHOTO_SLOTS.length && !aiScoring && !aiResult) {
      handleRunAI();
    }
  }, [photoCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch product config when step 6 is reached ──────────────────────────

  useEffect(() => {
    if (step !== 6) return;
    const { code } = productInfo(vehicleType, coverageType);
    // product code in DB uses dash: MRKB4-COMP; productInfo returns MRKB4-COMP (already)
    getProductConfig(code).then(cfg => setProductConfig(cfg ?? null));
  }, [step, vehicleType, coverageType]);  

  useEffect(() => {
    if (!province || !sumInsured || !coverageType) return;
    setSelectedInsurerProduct(null);
    setLoadingProducts(true);
    const vehicleAge = currentYear - vehicleDetails.year;
    getAvailableInsurerProducts(vehicleType, coverageType, vehicleAge)
      .then(({ products, excludedByAgeCount }) => {
        setAvailableProducts(products);
        setExcludedByAgeCount(excludedByAgeCount);
      })
      .catch(error => {
        console.error('Unable to load insurer products:', error);
        setAvailableProducts([]);
        setExcludedByAgeCount(0);
      })
      .finally(() => setLoadingProducts(false));
  }, [province, sumInsured, coverageType, vehicleDetails.year, vehicleType]);

  // ─── Step 7: Submit on mount ───────────────────────────────────────────────

  useEffect(() => {
    if (step !== 7 || orderStarted.current) return;
    orderStarted.current = true;

    const submit = async () => {
      setSubmitting(true);
      setOrderError('');
      try {
        const clientName = useManualClient
          ? manualClient.name
          : (selectedClient?.name ?? '');
        const clientPhone = useManualClient
          ? manualClient.phone
          : (selectedClient?.phone ?? '');
        const clientKtp = useManualClient
          ? manualClient.ktp
          : (selectedClient?.ktp ?? '');

        // UX v1.50.0: data klien baru yang diketik manual otomatis tersimpan
        // ke CRM (sp_clients) — agent tidak perlu membuat data klien duluan.
        // Non-blocking: kegagalan simpan tidak menghambat pembuatan order.
        if (useManualClient && clientName.trim() && clientPhone.trim()) {
          const normalize = (s: string) => s.replace(/\D/g, '');
          const already = clients.some(c => normalize(c.phone ?? '') === normalize(clientPhone));
          if (!already) {
            addClient({
              agent_id: agentId,
              name: clientName.trim(),
              phone: clientPhone.trim(),
              ktp: clientKtp?.trim() || undefined,
              status: 'PROSPECT',
            }).catch(() => {});
          }
        }

        const breakdown = calcPremium(vehicleType, coverageType, sumInsured, zone, addons);
        const { code: productCode, name: productName } = productInfo(vehicleType, coverageType);

        // Commission & coin calculations — insurer product rates take priority
        const baseCommRate = Math.min(0.25, selectedInsurerProduct?.base_commission_rate
          ?? productConfig?.base_commission_rate ?? 0.10);
        const configuredMaxDiscount = selectedInsurerProduct?.max_discount_rate
          ?? productConfig?.max_discount_rate ?? 0;
        const safeMaxDiscount = Math.max(0, Math.min(configuredMaxDiscount, baseCommRate));
        const cappedDiscountRate = Math.min(discountRate, safeMaxDiscount);
        const effectiveCommRate = Math.max(0, baseCommRate - cappedDiscountRate);
        const discountAmount = Math.round(breakdown.total * cappedDiscountRate);
        // The client discount is funded from commission; keep the premium breakdown intact
        // for insurer accounting, while the displayed client net is reduced by the same amount.
        const netPremium = breakdown.total - discountAmount;
        const commissionAmount = Math.round(breakdown.total * effectiveCommRate);
        const coinRate = selectedInsurerProduct?.coin_rate ?? productConfig?.coin_rate ?? 0.05;
        const coinReward = Math.floor(breakdown.total * coinRate / 1000);

        // Upload front photo as main vehicle image
        let vehicleImageUrl: string | undefined;
        const frontFile = photoFiles['front'] ?? Object.values(photoFiles)[0];
        if (frontFile) {
          const uploadedUrl = await uploadVehicleImage(frontFile, `tmp-${Date.now()}`);
          vehicleImageUrl = uploadedUrl ?? undefined;
        }

        // Merge AI report into vehicle_details for admin notes
        const vehicleDetailsWithAI = {
          ...vehicleDetails,
          ...(aiResult ? {
            ai_report: aiResult.underwritingReport,
            ai_fraud_analysis: aiResult.fraudAnalysis,
            ai_recommendations: aiResult.recommendations,
          } : {}),
        };

        const order = await createPolicyOrder({
          agent_id: agentId,
          client_id: selectedClient?.id,
          client_name: clientName,
          client_phone: clientPhone,
          client_ktp: clientKtp,
          product_code: productCode,
          product_name: productName,
          vehicle_type: vehicleType === 'CAR' ? 'CAR' : 'MOTORCYCLE',
          vehicle_details: vehicleDetailsWithAI,
          vehicle_image_url: vehicleImageUrl,
          ai_score: aiResult?.score,
          ai_verdict: aiResult?.auditVerdict,
          ai_findings: aiResult?.detailedIssues,
          coverage_type: coverageType,
          sum_insured: sumInsured,
          zone: breakdown.zone,
          vehicle_category: breakdown.category,
          addons,
          base_premium: breakdown.basePremium,
          addon_premium: breakdown.addonPremium,
          admin_fee: breakdown.adminFee,
          stamp_duty: breakdown.stampDuty,
          total_premium: breakdown.total + 26000,
          ojk_rate: breakdown.rate,
          discount_rate: discountRate,
          discount_amount: discountAmount,
          net_premium: netPremium,
          commission_rate: effectiveCommRate,
          commission_amount: commissionAmount,
          coin_reward: coinReward,
          insurer_id: selectedInsurerProduct?.insurer_id,
          insurer_name: selectedInsurerProduct?.insurer_name,
          start_date: todayISO,
          end_date: oneYearLater,
          status: 'SUBMITTED',
        });

        if (!order) throw new Error('Gagal membuat order.');

        const num = order.order_number ?? order.id;
        setOrderId(order.id);
        setOrderNumber(num);

        // NOTE: review link ke insurer dikirim oleh operator saat approve
        // (admin_send_insurer_review_link) — bukan dari sini. Panggilan
        // autoSendReviewLink lama selalu gagal diam-diam untuk agent
        // (sp_review_tokens gateway/admin-only) dan sudah dihapus.
        await addNotification({
          agent_id: agentId,
          type: 'SYSTEM',
          title: 'Order Diajukan',
          body: `Order ${num} tersimpan dan masuk antrean persetujuan operator. Anda akan diberi tahu setiap perubahan status.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';
        setOrderError(msg);
      } finally {
        setSubmitting(false);
      }
    };

    submit();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Step Validators ───────────────────────────────────────────────────────

  const canProceedStep2 = useManualClient
    ? manualClient.name.trim().length > 0 && manualClient.phone.trim().length > 0
    : selectedClient !== null;

  const canProceedStep3 =
    vehicleDetails.make &&
    vehicleDetails.model &&
    vehicleDetails.plateCode &&
    vehicleDetails.plateNum &&
    vehicleDetails.plateSuffix &&
    vehicleDetails.chassis &&
    vehicleDetails.engine &&
    vehicleDetails.color;

  const canProceedStep4 = province && sumInsured > 0;

  const aiScore = aiResult?.score ?? 0;
  const aiVerdict = aiResult?.auditVerdict ?? '';
  // Allow proceeding if AI ran (verdict set) and not REJECTED
  // CLEAN (>=80): normal flow → payment in step 7
  // REVIEW_REQUIRED (score<80): proceed → order created with SUBMITTED, payment gated pending approval
  const canProceedStep5 = aiResult !== null && aiVerdict !== 'REJECTED';
  const isPendingApprovalAgent = aiResult !== null && aiScore < 80 && aiVerdict !== 'REJECTED';

  // ─── Render Steps ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Jenis Kendaraan</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Pilih jenis kendaraan yang akan diasuransikan.</p>
      <div className="grid grid-cols-2 gap-4">
        {(['CAR', 'MOTORCYCLE'] as VehicleType[]).map((type) => {
          const isActive = vehicleType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setVehicleType(type);
                setStep(2);
              }}
              className={`flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 p-8 transition ${
                isActive
                  ? 'border-ds-green bg-ds-green/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-ds-green'
              }`}
            >
              {type === 'CAR' ? (
                <Car
                  className={`w-12 h-12 ${isActive ? 'text-ds-green' : 'text-slate-400'}`}
                />
              ) : (
                <Bike
                  className={`w-12 h-12 ${isActive ? 'text-ds-green' : 'text-slate-400'}`}
                />
              )}
              <span
                className={`font-black text-sm uppercase tracking-wide ${
                  isActive ? 'text-ds-green' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {type === 'CAR' ? 'Roda 4 (Mobil)' : 'Roda 2 (Motor)'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Data Klien</h2>

      {/* Toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setUseManualClient(false)}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition ${
            !useManualClient
              ? 'bg-ds-green text-ds-on-green'
              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
        >
          Pilih dari Daftar Klien
        </button>
        <button
          type="button"
          onClick={() => setUseManualClient(true)}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition ${
            useManualClient
              ? 'bg-ds-green text-ds-on-green'
              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
        >
          Data Klien Baru
        </button>
      </div>

      {!useManualClient ? (
        <SectionCard>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau nomor HP..."
              value={clientSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSearch(e.target.value)}
              className={`${inputCls} pl-10`}
            />
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {filteredClients.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada klien ditemukan.</p>
            )}
            {filteredClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClient(c)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition border ${
                  selectedClient?.id === c.id
                    ? 'border-ds-green bg-ds-green/10'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-ds-green/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-ds-green" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone}</p>
                </div>
                {selectedClient?.id === c.id && (
                  <CheckCircle className="w-5 h-5 text-ds-green ml-auto" />
                )}
              </button>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Nama Lengkap *</Label>
              <input
                type="text"
                value={manualClient.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setManualClient((p) => ({ ...p, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Nama sesuai KTP"
              />
            </div>
            <div>
              <Label>Nomor HP *</Label>
              <input
                type="tel"
                value={manualClient.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setManualClient((p) => ({ ...p, phone: e.target.value }))
                }
                className={inputCls}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Nomor KTP (opsional)</Label>
              <input
                type="text"
                value={manualClient.ktp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setManualClient((p) => ({ ...p, ktp: e.target.value }))
                }
                className={inputCls}
                placeholder="16 digit NIK"
                maxLength={16}
              />
            </div>
            <p className="text-xs text-ds-green font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Data klien baru otomatis tersimpan ke daftar Klien Anda.
            </p>
          </div>
        </SectionCard>
      )}

      <PrimaryBtn onClick={() => setStep(3)} disabled={!canProceedStep2}>
        Lanjutkan <ChevronRight className="inline w-4 h-4 ml-1" />
      </PrimaryBtn>
    </div>
  );

  const renderStep3 = () => {
    const isCar = vehicleType === 'CAR';
    const brandList = isCar ? CAR_BRANDS : MOTO_BRANDS;
    const modelOptions = isCar
      ? getModelsForBrand(vehicleDetails.make)
      : getModelsForMotoBrand(vehicleDetails.make);
    const autoValue = isCar
      ? getMarketValue(vehicleDetails.make, vehicleDetails.model)
      : getMarketValueForMoto(vehicleDetails.make, vehicleDetails.model);

    const handleModelChange = (model: string) => {
      handleVehicleDetailChange('model', model);
      const mv = isCar
        ? getMarketValue(vehicleDetails.make, model)
        : getMarketValueForMoto(vehicleDetails.make, model);
      if (mv && mv > 0) {
        setSumInsured(mv);
        setSumInsuredDisplay(mv.toLocaleString('id-ID'));
      }
    };

    const handleMakeChange = (make: string) => {
      handleVehicleDetailChange('make', make);
      handleVehicleDetailChange('model', '');
    };

    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Detail Kendaraan</h2>

        {/* AI STNK OCR — auto-fills every field below from a photographed STNK.
            Same service the customer wizard uses; runs server-side via the
            stnk-ocr edge function with a fallback to Gemini Vision. */}
        <input
          ref={stnkFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleStnkScan(f);
            e.target.value = ''; // allow re-uploading the same file
          }}
        />
        <button
          type="button"
          onClick={() => stnkFileRef.current?.click()}
          disabled={stnkScanning}
          className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl border-2 border-dashed border-emerald-400/50 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition disabled:opacity-50"
        >
          {stnkScanning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Membaca STNK dengan AI…</>
          ) : (
            <><ScanLine className="w-4 h-4" /> Pindai STNK dengan AI</>
          )}
        </button>

        {/* OCR result summary + per-field validation warnings */}
        {stnkOcrResult && stnkOcrResult.status !== 'UNCLEAR' && stnkOcrResult.status !== 'ERROR' && (
          <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2 ${
            stnkOcrResult.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
          }`}>
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-black uppercase tracking-widest text-[0.6rem]">
                {stnkOcrResult.ok ? 'STNK Terbaca Lengkap' : 'STNK Terbaca Sebagian'} · {(stnkOcrResult.confidence * 100).toFixed(0)}% confidence
              </p>
              {!stnkOcrResult.ok && (
                <ul className="text-[0.55rem] font-bold list-disc list-inside opacity-90">
                  {!stnkOcrResult.validation.plate && <li>Format plat tidak standar</li>}
                  {!stnkOcrResult.validation.vin && <li>Nomor Rangka (VIN) perlu verifikasi manual</li>}
                  {!stnkOcrResult.validation.year && <li>Tahun tidak terdeteksi</li>}
                  {!stnkOcrResult.validation.brand && <li>Merk tidak cocok dengan database</li>}
                  {!stnkOcrResult.validation.model && <li>Model tidak cocok dengan database</li>}
                </ul>
              )}
              {stnkOcrResult.notes && (
                <p className="text-[0.5rem] italic opacity-70">Catatan AI: {stnkOcrResult.notes}</p>
              )}
            </div>
          </div>
        )}
        {stnkOcrResult && (stnkOcrResult.status === 'UNCLEAR' || stnkOcrResult.status === 'ERROR') && (
          <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-black uppercase tracking-widest text-[0.6rem]">STNK tidak terbaca</p>
              <p className="text-[0.55rem] opacity-90">Foto mungkin buram atau terpotong. Isi data secara manual di bawah ini.</p>
            </div>
          </div>
        )}

        <SectionCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Make */}
            <div>
              <Label>Merek *</Label>
              <SearchableSelect
                value={vehicleDetails.make}
                options={brandList}
                onChange={handleMakeChange}
                placeholder="Pilih merek..."
              />
            </div>
            {/* Model — searchable dropdown with manual fallback */}
            <div>
              <Label>Model *</Label>
              <SearchableSelect
                value={vehicleDetails.model}
                options={modelOptions}
                onChange={handleModelChange}
                placeholder={vehicleDetails.make ? 'Cari model...' : 'Pilih merek dulu'}
                disabled={!vehicleDetails.make}
                allowCustom
              />
              {autoValue && autoValue > 0 && (
                <p className="text-[10px] text-ds-green dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Nilai pasar: Rp {autoValue.toLocaleString('id-ID')} (auto-isi UP)
                </p>
              )}
              {vehicleDetails.model && !modelOptions.includes(vehicleDetails.model) && (
                <p className="text-[10px] text-ds-amber dark:text-amber-400 font-bold mt-1">
                  ✎ Model diinput manual
                </p>
              )}
            </div>
            {/* Year */}
            <div>
              <Label>Tahun *</Label>
              <select
                value={vehicleDetails.year}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleVehicleDetailChange('year', parseInt(e.target.value, 10))
                }
                className={inputCls}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {/* Variant */}
            <div>
              <Label>Varian (opsional)</Label>
              <input
                type="text"
                value={vehicleDetails.variant}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleVehicleDetailChange('variant', e.target.value)
                }
                className={inputCls}
                placeholder="Contoh: 1.5 G CVT"
              />
            </div>
            {/* Plate — structured XX-YYYY-ZZZ input */}
            <div className="sm:col-span-2">
              <Label>Nomor Polisi * (format: Kode Wilayah – Nomor – Huruf)</Label>
              <div className="flex items-center gap-2">
                <div className="w-36 flex-shrink-0">
                  <SearchableSelect
                    value={vehicleDetails.plateCode}
                    options={PLATE_CODES.map(p => p.code)}
                    onChange={handlePlateCodeChange}
                    placeholder="Kode"
                  />
                </div>
                <span className="text-slate-400 font-black text-lg">–</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={vehicleDetails.plateNum}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePlatePartChange('plateNum', e.target.value.replace(/\D/g, ''))
                  }
                  className={`${inputCls} w-24 text-center font-black tracking-widest`}
                  placeholder="1234"
                />
                <span className="text-slate-400 font-black text-lg">–</span>
                <input
                  type="text"
                  maxLength={3}
                  value={vehicleDetails.plateSuffix}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePlatePartChange('plateSuffix', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
                  }
                  className={`${inputCls} w-20 text-center font-black tracking-widest`}
                  placeholder="XYZ"
                />
              </div>
              {vehicleDetails.plateCode && (
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {PLATE_CODES.find(p => p.code === vehicleDetails.plateCode)?.region}
                  {' · '}
                  <span className="text-ds-green">OJK Zone {getZone(PLATE_CODES.find(p => p.code === vehicleDetails.plateCode)?.province ?? '')}</span>
                </p>
              )}
              {vehicleDetails.plate && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Plat: <span className="font-black text-slate-700 dark:text-slate-200">{vehicleDetails.plate}</span>
                </p>
              )}
            </div>
            {/* Color */}
            <div>
              <Label>Warna *</Label>
              <input
                type="text"
                value={vehicleDetails.color}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleVehicleDetailChange('color', e.target.value)
                }
                className={inputCls}
                placeholder="Hitam, Putih, dll"
              />
            </div>
            {/* Chassis */}
            <div>
              <Label>Nomor Rangka *</Label>
              <input
                type="text"
                value={vehicleDetails.chassis}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleVehicleDetailChange('chassis', e.target.value.toUpperCase())
                }
                className={inputCls}
                placeholder="MHF..."
              />
            </div>
            {/* Engine */}
            <div>
              <Label>Nomor Mesin *</Label>
              <input
                type="text"
                value={vehicleDetails.engine}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleVehicleDetailChange('engine', e.target.value.toUpperCase())
                }
                className={inputCls}
                placeholder="..."
              />
            </div>
            {/* Usage */}
            <div className="sm:col-span-2">
              <Label>Penggunaan Kendaraan *</Label>
              <select
                value={vehicleDetails.usage}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleVehicleDetailChange('usage', e.target.value)
                }
                className={inputCls}
              >
                {VEHICLE_USAGES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>
        <PrimaryBtn onClick={() => setStep(4)} disabled={!canProceedStep3}>
          Lanjutkan <ChevronRight className="inline w-4 h-4 ml-1" />
        </PrimaryBtn>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Jaminan & Uang Pertanggungan</h2>

      <SectionCard>
        <div className="flex flex-col gap-5">
          {/* Province */}
          <div>
            <Label>Provinsi Registrasi Kendaraan *</Label>
            <select
              value={province}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProvince(e.target.value)}
              className={inputCls}
            >
              <option value="">Pilih provinsi...</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {province && (
              <div className="mt-2">
                <ZoneBadge zone={zone} />
              </div>
            )}
          </div>

          {/* Sum Insured */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Uang Pertanggungan (IDR) *</Label>
              {vehicleType === 'CAR' && vehicleDetails.make && vehicleDetails.model && (() => {
                const dbVal = getMarketValue(vehicleDetails.make, vehicleDetails.model);
                return dbVal ? (
                  <button
                    type="button"
                    onClick={() => { setSumInsured(dbVal); setSumInsuredDisplay(dbVal.toLocaleString('id-ID')); }}
                    className="text-[10px] font-black text-ds-green dark:text-emerald-400 uppercase tracking-wider hover:underline"
                  >
                    Pakai nilai pasar (Rp {(dbVal / 1_000_000).toFixed(0)}jt)
                  </button>
                ) : null;
              })()}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                Rp
              </span>
              <input
                type="text"
                value={sumInsuredDisplay}
                onChange={handleSumInsuredChange}
                className={`${inputCls} pl-10`}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            {vehicleType === 'CAR' && sumInsured > 0 && (
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                Kategori OJK: {getVehicleCategory(sumInsured)} · {['','≤125jt','125–200jt','200–400jt','400–800jt','>800jt'][getVehicleCategory(sumInsured)]}
              </p>
            )}
          </div>

          {/* Coverage Type */}
          <div>
            <Label>Jenis Jaminan *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {(['COMPREHENSIVE', 'TLO'] as CoverageType[]).map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setCoverageType(ct)}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    coverageType === ct
                      ? 'border-ds-green bg-ds-green/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-ds-green'
                  }`}
                >
                  <p
                    className={`font-black text-sm ${coverageType === ct ? 'text-ds-green' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {ct === 'COMPREHENSIVE' ? 'Komprehensif (All Risk)' : 'TLO (Total Loss Only)'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {ct === 'COMPREHENSIVE'
                      ? 'Menanggung semua risiko kerusakan, mulai dari lecet hingga kehilangan total.'
                      : 'Hanya menanggung kerusakan total (>75%) atau kehilangan kendaraan.'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Add-ons — only for COMPREHENSIVE */}
      {coverageType === 'COMPREHENSIVE' && (
        <SectionCard>
          <h3 className="font-black text-slate-700 dark:text-slate-200 mb-4 text-sm uppercase tracking-widest">
            Perluasan Jaminan
          </h3>
          <div className="flex flex-col gap-4">
            {/* Flood */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addons.flood}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddons((p) => ({ ...p, flood: e.target.checked }))
                }
                className="w-5 h-5 accent-ds-green"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Banjir / Bencana Alam
                </p>
                <p className="text-xs text-slate-400">+0.15% dari UP</p>
              </div>
            </label>
            {/* Earthquake */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addons.earthquake}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddons((p) => ({ ...p, earthquake: e.target.checked }))
                }
                className="w-5 h-5 accent-ds-green"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Gempa Bumi / Tsunami
                </p>
                <p className="text-xs text-slate-400">+0.12% dari UP</p>
              </div>
            </label>
            {/* Riot */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addons.riot}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddons((p) => ({ ...p, riot: e.target.checked }))
                }
                className="w-5 h-5 accent-ds-green"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Kerusuhan (SRCC)
                </p>
                <p className="text-xs text-slate-400">+0.07% dari UP</p>
              </div>
            </label>

            {/* TPL */}
            <div>
              <Label>Tanggung Gugat Pihak Ketiga (TPL)</Label>
              <select
                value={addons.tplLimit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setAddons((p) => ({ ...p, tplLimit: parseInt(e.target.value, 10) }))
                }
                className={inputCls}
              >
                {TPL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* PA Driver */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addons.paDriver}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddons((p) => ({ ...p, paDriver: e.target.checked }))
                }
                className="w-5 h-5 accent-ds-green"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  PA Pengemudi
                </p>
                <p className="text-xs text-slate-400">Rp 50.000/tahun</p>
              </div>
            </label>

            {/* PA Passenger */}
            <div>
              <Label>PA Penumpang (jumlah kursi: 0–7)</Label>
              <input
                type="number"
                min={0}
                max={7}
                value={addons.paPassengerSeats}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddons((p) => ({
                    ...p,
                    paPassengerSeats: Math.min(7, Math.max(0, parseInt(e.target.value, 10) || 0)),
                  }))
                }
                className={inputCls}
              />
              {addons.paPassengerSeats > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {formatIDR(addons.paPassengerSeats * 25_000)}/tahun
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Insurer Selection */}
      {province && sumInsured > 0 && coverageType && (
        <SectionCard>
          <h3 className="font-black text-slate-700 dark:text-slate-200 mb-4 text-sm uppercase tracking-widest">
            Pilih Perusahaan Asuransi
          </h3>
          {!loadingProducts && excludedByAgeCount > 0 && (
            <p className="text-[11px] text-ds-amber dark:text-amber-400 font-semibold mb-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2">
              {excludedByAgeCount} mitra asuransi tidak ditampilkan karena melebihi batas maksimal usia kendaraan mereka.
            </p>
          )}
          {loadingProducts ? (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-4 text-xs text-slate-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />Memuat daftar asuransi yang sesuai kendaraan dan pertanggungan...</div>
          ) : availableProducts.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3 space-y-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Belum ada mitra yang cocok untuk pilihan ini</p>
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-200">Daftar hanya menampilkan perusahaan yang aktif, produk yang cocok dengan jenis kendaraan/pertanggungan, dan batas usia kendaraan. Coba ubah pertanggungan atau usia kendaraan. Jika tetap kosong, Admin perlu memeriksa menu Mitra Asuransi dan pemetaan produk.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {availableProducts.map(p => {
                const selected = selectedInsurerProduct?.id === p.id;
                const breakdown = sumInsured > 0 ? calcPremium(vehicleType, coverageType, sumInsured, zone, addons) : null;
                const estCoins = breakdown ? Math.floor(breakdown.total * (p.coin_rate ?? 0.05) / 1000) : null;
                const estComm = breakdown ? Math.round(breakdown.total * p.base_commission_rate) : null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedInsurerProduct(selected ? null : p)}
                    className={`text-left rounded-2xl border-2 p-4 transition ${
                      selected
                        ? 'border-ds-green bg-ds-green/10'
                        : 'border-slate-200 dark:border-white/10 hover:border-ds-green'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1 flex-shrink-0" style={{ background: INSURER_BRANDS[p.insurer_code ?? '']?.bg ?? '#ffffff' }}>
                        {p.insurer_logo_url ? <img loading="lazy" src={p.insurer_logo_url} alt={p.insurer_name ?? p.insurer_code} className="w-full h-full object-contain" /> : <InsurerLogo id={p.insurer_code ?? p.id} size={28} />}
                      </span>
                      <p className={`font-black text-sm ${selected ? 'text-ds-green' : 'text-slate-700 dark:text-slate-200'}`}>
                        {p.insurer_name ?? p.insurer_code}
                      </p>
                    </div>
                    {estComm !== null && estCoins !== null ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          Komisi: {formatIDR(estComm)} ({(p.base_commission_rate * 100).toFixed(1)}%)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          🪙 {estCoins.toLocaleString()} koin ≈ {formatIDR(estCoins * 1000)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mb-1">
                        Komisi {(p.base_commission_rate * 100).toFixed(1)}%
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Maks diskon {(Math.max(0, Math.min(p.max_discount_rate ?? 0, Math.min(0.25, p.base_commission_rate ?? 0))) * 100).toFixed(1)}%
                      {p.max_vehicle_age_years ? ` · Maks usia ${p.max_vehicle_age_years} thn` : ''}
                    </p>
                    <div className="mt-3 border-t border-slate-100 dark:border-white/10 pt-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="flex gap-0.5" aria-label={`Rating ${(p as any).rating ?? 0} dari 5`}>
                          {[1,2,3,4,5].map(star => <span key={star} className={star <= Math.floor(p.rating ?? 0) ? 'text-amber-500' : 'text-slate-300'}>★</span>)}
                        </span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{(p as any).rating ? `${(p as any).rating}/5` : 'Rating belum tersedia'}</span>
                      </div>
                      {Array.isArray((p as any).benefits) && (p as any).benefits.length > 0 && <div><p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">Manfaat utama</p><p className="text-[11px] text-slate-500">{(p as any).benefits.slice(0, 3).join(' · ')}</p></div>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.isArray((p as any).advantages) && (p as any).advantages.length > 0 && <div><p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Kelebihan</p><ul className="text-[11px] text-slate-500 list-disc pl-4">{(p as any).advantages.slice(0, 3).map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>}
                        {Array.isArray((p as any).disadvantages) && (p as any).disadvantages.length > 0 && <div><p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Kekurangan</p><ul className="text-[11px] text-slate-500 list-disc pl-4">{(p as any).disadvantages.slice(0, 3).map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      <PrimaryBtn onClick={() => setStep(5)} disabled={!canProceedStep4}>
        Lanjutkan <ChevronRight className="inline w-4 h-4 ml-1" />
      </PrimaryBtn>
    </div>
  );

  const renderStep5 = () => {
    const score = aiResult?.score ?? 0;
    const scoreBadge =
      score >= 80
        ? { label: 'LAYAK', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
        : score >= 60
        ? { label: 'PERLU REVIEW', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
        : { label: 'TIDAK MEMENUHI SYARAT', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
    const scoreColor = score >= 80 ? 'text-ds-green' : score >= 60 ? 'text-ds-amber' : 'text-rose-500';

    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Foto & Survei AI</h2>

        {/* Photography Guidelines */}
        <SectionCard>
          <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-3">Panduan Pengambilan Foto</p>
          <ul className="flex flex-col gap-1.5">
            {PHOTO_GUIDELINES.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-ds-green flex-shrink-0 mt-0.5" />
                {g}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* 5-Photo Upload Grid */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Foto Kendaraan</p>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${photoCount >= 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
              {photoCount}/5 foto
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PHOTO_SLOTS.map((slot, idx) => {
              const isLast = idx === PHOTO_SLOTS.length - 1;
              const preview = photoPreviews[slot.id];
              const validation = photoValidation[slot.id];
              const isLoading = validation?.status === 'LOADING';
              const isInvalid = validation?.status === 'INVALID';
              const isValid = validation?.status === 'VALID';

              return (
                <div
                  key={slot.id}
                  className={`group relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${isLast ? 'col-span-2 aspect-[3/1]' : 'aspect-video'} ${
                    preview
                      ? isInvalid
                        ? 'border-rose-400 border-solid'
                        : 'border-emerald-400 border-solid bg-emerald-500/5'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  {preview ? (
                    <>
                      <img loading="lazy" src={preview} className="absolute inset-0 w-full h-full object-cover" alt={slot.label} />
                      {(isLoading || isInvalid) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                          {isLoading && <Loader2 className="w-6 h-6 text-white animate-spin" />}
                          {isInvalid && (
                            <div className="flex flex-col items-center gap-1 px-3 py-2 bg-rose-500/90 rounded-xl">
                              <AlertTriangle className="w-4 h-4 text-white" />
                              <span className="text-[0.5rem] font-black text-white uppercase tracking-widest text-center leading-tight">{validation.msg || 'Foto tidak sesuai'}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {isValid && (
                        <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-0.5 z-10">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFiles(prev => { const n = { ...prev }; delete n[slot.id]; return n; });
                          setPhotoPreviews(prev => { const n = { ...prev }; delete n[slot.id]; return n; });
                          setPhotoValidation(prev => { const n = { ...prev }; delete n[slot.id]; return n; });
                          setAiResult(null);
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white z-20"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[0.45rem] font-black uppercase z-10">{slot.label}</div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      <Upload className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-[0.6rem] font-black uppercase text-slate-400 group-hover:text-ds-green transition-colors">{slot.label}</span>
                      <span className="text-[0.5rem] text-slate-300 dark:text-slate-600">{slot.desc}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, slot.id, slot.desc);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI trigger */}
          {photoCount >= 3 && !aiResult && (
            <div className="mt-4">
              {aiScoring ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-6 h-6 text-ds-green animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Menganalisis foto kendaraan…</p>
                </div>
              ) : (
                <PrimaryBtn onClick={handleRunAI}>
                  <Upload className="inline w-4 h-4 mr-2" />
                  Analisa AI ({photoCount} foto)
                </PrimaryBtn>
              )}
            </div>
          )}
          {photoCount < 3 && (
            <p className="mt-3 text-center text-xs text-slate-400">
              Unggah minimal 3 foto untuk memulai analisa AI. Semua 5 foto akan memicu analisa otomatis.
            </p>
          )}
        </SectionCard>

        {/* AI Result */}
        {aiResult && (
          <SectionCard>
            <div className="flex items-center gap-4 mb-4">
              <span className={`text-5xl font-black ${scoreColor}`}>{score}</span>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${scoreBadge.cls}`}>
                  {scoreBadge.label}
                </span>
                <p className="text-xs text-slate-400 mt-1">Skor Kelayakan Kendaraan</p>
              </div>
            </div>

            {aiResult.summary && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{aiResult.summary}</p>
            )}

            {aiResult.underwritingReport && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                <p className="text-[0.55rem] font-black uppercase text-ds-green tracking-widest mb-1">Laporan Surveyor AI</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{aiResult.underwritingReport}</p>
              </div>
            )}

            {aiResult.detailedIssues && aiResult.detailedIssues.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Temuan</p>
                {aiResult.detailedIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                      issue.severity === 'Severe' ? 'bg-rose-50 dark:bg-rose-900/20' :
                      issue.severity === 'Moderate' ? 'bg-amber-50 dark:bg-amber-900/20' :
                      'bg-slate-50 dark:bg-white/5'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${issue.severity === 'Severe' ? 'text-rose-500' : issue.severity === 'Moderate' ? 'text-ds-amber' : 'text-slate-400'}`} />
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{issue.part}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-1">— {issue.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aiVerdict === 'REJECTED' && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4 flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black">
                  <XCircle className="w-5 h-5" />
                  Kendaraan Tidak Memenuhi Syarat — Ditolak
                </div>
                {aiResult.rejectionReason && (
                  <p className="text-sm text-rose-700 dark:text-rose-300">{aiResult.rejectionReason}</p>
                )}
                <SecondaryBtn onClick={() => setAiResult(null)}>
                  Ganti Foto & Analisa Ulang
                </SecondaryBtn>
              </div>
            )}

            {isPendingApprovalAgent && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-4 flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black">
                  <AlertTriangle className="w-5 h-5" />
                  Perlu Pemeriksaan Manual
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Skor AI di bawah 80 atau AI tidak dapat memberikan skor otomatis. Order akan dibuat dengan status SUBMITTED dan perlu persetujuan admin/penanggung sebelum pembayaran dapat diproses.
                </p>
              </div>
            )}

            {canProceedStep5 && (
              <PrimaryBtn onClick={() => setStep(6)}>
                {isPendingApprovalAgent ? 'Lanjut (Persetujuan Manual)' : 'Lanjutkan ke Perhitungan Premi'} <ChevronRight className="inline w-4 h-4 ml-1" />
              </PrimaryBtn>
            )}
          </SectionCard>
        )}
      </div>
    );
  };

  const renderStep6 = () => {
    const breakdown: PremiumBreakdown = calcPremium(vehicleType, coverageType, sumInsured, zone, addons);
    const { code, name } = productInfo(vehicleType, coverageType);
    const cat = vehicleType === 'CAR' ? getVehicleCategory(sumInsured) : null;

    const addonRows: { label: string; amount: number }[] = [
      { label: 'Banjir / Bencana Alam', amount: breakdown.addonsDetail.flood },
      { label: 'Gempa Bumi / Tsunami', amount: breakdown.addonsDetail.earthquake },
      { label: 'Kerusuhan (SRCC)', amount: breakdown.addonsDetail.riot },
      { label: 'TPL', amount: breakdown.addonsDetail.tpl },
      { label: 'PA Pengemudi', amount: breakdown.addonsDetail.paDriver },
      { label: `PA Penumpang (${addons.paPassengerSeats} kursi)`, amount: breakdown.addonsDetail.paPassenger },
    ].filter((r) => r.amount > 0);

    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Perhitungan Premi</h2>

        <SectionCard>
          {/* Product badge */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 bg-ds-green/10 text-ds-green-dk dark:text-ds-green font-bold text-xs px-3 py-1 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              {code} — {name}
            </span>
            {selectedInsurerProduct && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-ds-green dark:text-emerald-400 font-bold text-xs px-3 py-1 rounded-full">
                {selectedInsurerProduct.insurer_name ?? selectedInsurerProduct.insurer_code}
              </span>
            )}
            <ZoneBadge zone={zone} />
          </div>

          <div className="text-xs text-slate-400 mb-1">
            Tarif OJK: <span className="font-bold text-slate-600 dark:text-slate-300">{(breakdown.rate * 100).toFixed(2)}%</span>
            {cat && (
              <> &nbsp;|&nbsp; Kategori Kendaraan: <span className="font-bold text-slate-600 dark:text-slate-300">{cat}</span></>
            )}
          </div>

          {/* Table */}
          <div className="divide-y divide-slate-100 dark:divide-white/10 mt-4">
            <div className="flex justify-between py-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Premi Dasar</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatIDR(breakdown.basePremium)}
              </span>
            </div>
            {addonRows.map((row) => (
              <div key={row.label} className="flex justify-between py-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatIDR(row.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Biaya Admin</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatIDR(breakdown.adminFee)}
              </span>
            </div>
            <div className="flex justify-between py-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Bea Materai</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatIDR(breakdown.stampDuty)}
              </span>
            </div>
            <div className="flex justify-between py-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Biaya Aplikasi SurePath</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatIDR(6000)}
              </span>
            </div>
          </div>

          {/* Total payable */}
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-white/5 px-5 py-4 flex justify-between items-center">
            <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest text-sm">
              Total Premi
            </span>
            <span className="font-black text-slate-600 dark:text-slate-300 text-xl">{formatIDR(breakdown.total + 26000)}</span>
          </div>

          {/* Dates */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div>
              <p className="font-semibold text-slate-500 dark:text-slate-300 mb-0.5">Mulai</p>
              <p>{todayISO}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500 dark:text-slate-300 mb-0.5">Berakhir</p>
              <p>{oneYearLater}</p>
            </div>
          </div>
        </SectionCard>

        {/* Discount & Commission Panel */}
        {(() => {
          const baseCommRate = Math.min(0.25, selectedInsurerProduct?.base_commission_rate
            ?? productConfig?.base_commission_rate ?? 0.10);
          const configuredMaxDisc = selectedInsurerProduct?.max_discount_rate
            ?? productConfig?.max_discount_rate ?? 0;
          // Business guardrail: commission + client discount may never exceed 25% of premium.
          const maxDisc = Math.max(0, Math.min(configuredMaxDisc, baseCommRate));
          const cappedDisc = Math.min(discountRate, maxDisc);
          const effectiveComm = Math.max(0, baseCommRate - cappedDisc);
          const discountAmt = Math.round(breakdown.total * cappedDisc);
          const netPrem = breakdown.total - discountAmt;
          const commAmt = Math.round(breakdown.total * effectiveComm);
          const coinRate = selectedInsurerProduct?.coin_rate ?? productConfig?.coin_rate ?? 0.05;
          const coins = Math.floor(breakdown.total * coinRate / 1000);

          return (
            <SectionCard>
              <h3 className="font-black text-slate-700 dark:text-slate-200 text-sm uppercase tracking-widest mb-4">
                Diskon & Komisi Mitra
              </h3>

              {/* Discount slider */}
              {maxDisc > 0 ? (
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Diskon untuk Klien</Label>
                    <span className="text-sm font-black text-ds-green">{(discountRate * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.round(maxDisc * 1000)}
                    step={5}
                    value={Math.round(discountRate * 1000)}
                    onChange={e => setDiscountRate(parseInt(e.target.value, 10) / 1000)}
                    className="w-full accent-ds-green"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    <span>0%</span><span>Max {(maxDisc * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-4">Produk ini tidak mendukung diskon.</p>
              )}

              {/* Summary table */}
              <div className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {discountRate > 0 && (
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Diskon Klien ({(discountRate*100).toFixed(1)}%)</span>
                    <span className="font-semibold text-rose-500">– {formatIDR(discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5">
                  <span className="font-black text-slate-700 dark:text-slate-200">Net Premi Klien</span>
                  <span className="font-black text-ds-green text-lg">{formatIDR(netPrem)}</span>
                </div>
              </div>

              {/* Agent earnings preview */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-ds-green mb-1">Komisi Anda</p>
                  <p className="text-base font-black text-ds-green dark:text-emerald-400">{formatIDR(commAmt)}</p>
                  <p className="text-[9px] text-slate-400">{(effectiveComm*100).toFixed(1)}% dari premi</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-ds-amber mb-1">Reward Koin</p>
                  <p className="text-base font-black text-ds-amber dark:text-amber-400">{coins.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-slate-400">= {formatIDR(coins * 1000)}</p>
                </div>
              </div>
            </SectionCard>
          );
        })()}

        {/* ── Delivery Options ── */}
        <SectionCard>
          <h3 className="font-black text-slate-700 dark:text-slate-200 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-ds-green" />
            Pengiriman Polis
          </h3>

          <div className="space-y-2 mb-4">
            {/* Digital */}
            <button
              type="button"
              onClick={() => setDeliveryMethod('DIGITAL')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${deliveryMethod === 'DIGITAL' ? 'border-ds-green bg-ds-green/5' : 'border-slate-200 dark:border-white/10'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'DIGITAL' ? 'bg-ds-green text-ds-on-green' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                <Smartphone size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800 dark:text-white">Polis Digital</p>
                <p className="text-[10px] text-slate-400">Email & Aplikasi</p>
              </div>
              <span className="text-xs font-black text-ds-green">GRATIS</span>
            </button>

            {/* Pos Standard */}
            <button
              type="button"
              onClick={() => setDeliveryMethod('POS_STANDARD')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${deliveryMethod === 'POS_STANDARD' ? 'border-ds-green bg-ds-green/5' : 'border-slate-200 dark:border-white/10'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'POS_STANDARD' ? 'bg-ds-green text-ds-on-green' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                <Mail size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800 dark:text-white">Pos Indonesia Reguler</p>
                <p className="text-[10px] text-slate-400">Jabodetabek Rp 10.000 · Luar Rp 15.000</p>
              </div>
              {deliveryMethod === 'POS_STANDARD' && (
                <span className="text-xs font-black text-ds-green">{formatIDR(deliveryFee)}</span>
              )}
            </button>

            {/* Pos One-Night */}
            <button
              type="button"
              onClick={() => setDeliveryMethod('POS_OVERNIGHT')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${deliveryMethod === 'POS_OVERNIGHT' ? 'border-ds-green bg-ds-green/5' : 'border-slate-200 dark:border-white/10'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${deliveryMethod === 'POS_OVERNIGHT' ? 'bg-ds-green text-ds-on-green' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                <Package size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800 dark:text-white">Pos One Night Service</p>
                <p className="text-[10px] text-slate-400">Jabodetabek Rp 20.000 · Luar Rp 25.000</p>
              </div>
              {deliveryMethod === 'POS_OVERNIGHT' && (
                <span className="text-xs font-black text-ds-green">{formatIDR(deliveryFee)}</span>
              )}
            </button>
          </div>

          {/* Region selector — shown when postal is chosen */}
          {deliveryMethod !== 'DIGITAL' && (
            <div className="space-y-2">
              <Label>Area Pengiriman</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['JABODETABEK', 'OUTSIDE'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDeliveryRegion(r)}
                    className={`py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${deliveryRegion === r ? 'border-ds-green bg-ds-green/10 text-ds-green-dk dark:text-ds-green' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}
                  >
                    {r === 'JABODETABEK' ? 'Jabodetabek' : 'Luar Jabodetabek'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 pl-1">Biaya pengiriman: <span className="font-bold text-slate-600 dark:text-slate-300">{formatIDR(deliveryFee)}</span></p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1.5">
            <span className="text-amber-400">⚙️</span>
            Pengiriman Express (Gojek/Grab) — Segera Hadir
          </p>
        </SectionCard>

        <PrimaryBtn onClick={() => setStep(7)}>
          Ajukan Order Polis <ChevronRight className="inline w-4 h-4 ml-1" />
        </PrimaryBtn>
      </div>
    );
  };

  const handlePay = async () => {
    if (!orderId) return;
    setPayLoading(true);
    setPayError('');
    const clientName = useManualClient ? manualClient.name : (selectedClient?.name ?? '');
    const clientPhone = useManualClient ? manualClient.phone : (selectedClient?.phone ?? '');
    const clientEmail = useManualClient ? undefined : (selectedClient?.email ?? undefined);
    const { name: productName } = productInfo(vehicleType, coverageType);
    const breakdown = calcPremium(vehicleType, coverageType, sumInsured, zone, addons);
    const result = await createXenditInvoice({
      order_id: orderId,
      order_number: orderNumber,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || undefined,
      product_name: productName,
      total_premium: breakdown.total + 26000,
    });
    setPayLoading(false);
    if (!result?.invoice_url) {
      setPayError('Gagal membuat invoice pembayaran. Silakan coba lagi.');
      return;
    }
    setInvoiceUrl(result.invoice_url);
    window.open(result.invoice_url, '_blank', 'noopener,noreferrer');
  };

  const renderStep7 = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      {submitting && (
        <>
          <Loader2 className="w-16 h-16 text-ds-green animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Memproses order polis…</p>
        </>
      )}

      {!submitting && orderError && (
        <SectionCard className="w-full max-w-md text-center">
          <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-3" />
          <p className="font-bold text-rose-600 dark:text-rose-400 mb-2">Gagal Mengajukan Order</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{orderError}</p>
          <SecondaryBtn onClick={onBack}>Kembali ke Beranda</SecondaryBtn>
        </SectionCard>
      )}

      {!submitting && orderNumber && (
        <SectionCard className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-ds-green" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">Order Berhasil Diajukan!</h3>
          <p className="text-slate-400 text-sm mb-4">
            Order Anda sedang direview. Lakukan pembayaran premi untuk melanjutkan proses.
          </p>
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl px-6 py-4 mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Nomor Order</p>
            <p className="text-2xl font-black text-ds-green">{orderNumber}</p>
          </div>

          {/* Payment section */}
          {isPendingApprovalAgent ? (
            <div className="w-full mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-sm">
                <AlertTriangle className="w-4 h-4" />
                Menunggu Persetujuan
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/70 leading-relaxed">
                Order telah diajukan untuk ditinjau manual. Pembayaran akan dibuka setelah foto dan data kendaraan disetujui oleh admin atau penanggung. Pantau status via email/aplikasi.
              </p>
            </div>
          ) : !invoiceUrl ? (
            <div className="flex flex-col gap-3 w-full mb-4">
              <PrimaryBtn onClick={handlePay} disabled={payLoading}>
                {payLoading ? (
                  <><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Membuat Invoice…</>
                ) : (
                  'Bayar Premi Sekarang'
                )}
              </PrimaryBtn>
              {payError && (
                <p className="text-xs text-rose-500 text-center">{payError}</p>
              )}
            </div>
          ) : (
            <div className="w-full mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-center">
              <CheckCircle className="w-8 h-8 text-ds-green mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">Invoice Berhasil Dibuat</p>
              <p className="text-xs text-slate-400 mb-3">Halaman pembayaran telah dibuka di tab baru.</p>
              <button
                type="button"
                onClick={() => window.open(invoiceUrl, '_blank', 'noopener,noreferrer')}
                className="text-xs font-bold text-ds-green underline"
              >
                Buka Kembali Link Pembayaran
              </button>
            </div>
          )}

          <SecondaryBtn
            onClick={() => {
              onOrderCreated?.(orderNumber);
              onBack();
            }}
          >
            Kembali ke Beranda
          </SecondaryBtn>
        </SectionCard>
      )}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  };

  const stepLabels = [
    'Jenis', 'Klien', 'Kendaraan', 'Jaminan', 'Survei', 'Premi', 'Konfirmasi',
  ];

  return (
    <div className="min-h-screen bg-ds-card2 dark:bg-ds-card flex flex-col font-sora">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-white/10">
        <button
          type="button"
          onClick={() => (step === 1 ? onBack() : setStep((s) => s - 1))}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1">
          <p className="font-black text-slate-800 dark:text-white text-sm">
            Underwriting Kendaraan
          </p>
        </div>
      </div>

      {/* Step Progress — premium segmented track */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1 mb-2">
          {stepLabels.map((_label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div
                key={n}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                  done
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : active
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(0,193,106,0.5)]'
                    : 'bg-slate-100 dark:bg-white/10'
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-slate-800 dark:text-white">{stepLabels[step - 1]}</span>
          <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Langkah {step}/7</span>
        </div>
      </div>

      {/* Step Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto">
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default VehicleUnderwritingWizard;
