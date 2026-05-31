import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car, Bike, Search, User, ChevronRight, Upload, CheckCircle,
  AlertTriangle, XCircle, ArrowLeft, Loader2, FileText,
} from 'lucide-react';
import { Language } from '../../types';
import { analyzeVehicleSurvey, SurveyAnalysisResult } from '../../services/geminiService';
import {
  calcPremium, getZone, getVehicleCategory, PROVINCES,
  MOTO_MAKES, VEHICLE_USAGES, TPL_OPTIONS, ZONE_LABELS,
  type VehicleType, type CoverageType, type Zone, type PremiumBreakdown, type AddOns,
} from '../../services/ojkRates';
import {
  CAR_BRANDS, getModelsForBrand, getMarketValue,
} from '../../services/vehicleDatabase';
import {
  createPolicyOrder, uploadVehicleImage, addNotification, getProductConfig,
  getAvailableInsurerProducts, autoSendReviewLink,
  type SpClient, type SpProductConfig, type SpInsurerProduct,
} from '../../services/supabaseService';
import { createXenditInvoice } from '../../services/paymentService';
import { formatIDR } from '../car-wizard/WizardUI';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  agentId: string;
  agent: any;
  clients: SpClient[];
  lang: Language;
  initialVehicleType?: VehicleType;
  onBack: () => void;
  onOrderCreated?: (orderNumber: string) => void;
}

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
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm transition';

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
    className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white rounded-2xl font-black uppercase tracking-widest px-6 py-3 transition text-sm"
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
  onBack,
  onOrderCreated,
}) => {
  // ── Step ──
  const [step, setStep] = useState(1);

  // ── Step 1: Vehicle Type ──
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialVehicleType ?? 'CAR');

  // ── Step 2: Client ──
  const [selectedClient, setSelectedClient] = useState<SpClient | null>(null);
  const [manualClient, setManualClient] = useState({ name: '', phone: '', ktp: '' });
  const [useManualClient, setUseManualClient] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // ── Step 3: Vehicle Details ──
  const [vehicleDetails, setVehicleDetails] = useState({
    make: '',
    model: '',
    year: currentYear,
    variant: '',
    plate: '',
    chassis: '',
    engine: '',
    color: '',
    usage: 'PERSONAL',
  });

  // ── Step 4: Coverage ──
  const [province, setProvince] = useState('');
  const [sumInsured, setSumInsured] = useState(0);
  const [sumInsuredDisplay, setSumInsuredDisplay] = useState('');
  const [coverageType, setCoverageType] = useState<CoverageType>('COMPREHENSIVE');
  const [addons, setAddons] = useState<AddOns>({
    flood: false,
    earthquake: false,
    riot: false,
    tplLimit: 0,
    paDriver: false,
    paPassengerSeats: 0,
  });

  // ── Step 4b: Insurer Selection ──
  const [availableProducts, setAvailableProducts] = useState<SpInsurerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedInsurerProduct, setSelectedInsurerProduct] = useState<SpInsurerProduct | null>(null);

  // ── Step 5: Photo + AI ──
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [aiScoring, setAiScoring] = useState(false);
  const [aiResult, setAiResult] = useState<SurveyAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 6: Discount ──
  const [productConfig, setProductConfig] = useState<SpProductConfig | null>(null);
  const [discountRate, setDiscountRate] = useState(0); // 0.00 – max_discount_rate

  // ── Step 7: Order ──
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [orderError, setOrderError] = useState('');
  const orderStarted = useRef(false);

  // ── Payment ──
  const [payLoading, setPayLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [payError, setPayError] = useState('');

  // ─── Derived ───────────────────────────────────────────────────────────────

  const zone: Zone = province ? getZone(province) : 3;

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setAiResult(null);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setImageFile(file);
    setAiResult(null);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleRunAI = async () => {
    if (!imageFile) return;
    setAiScoring(true);
    try {
      const b64 = await fileToBase64(imageFile);
      const result = await analyzeVehicleSurvey(
        [{ id: 'vehicle-main', data: b64 }],
        {
          brand: vehicleDetails.make,
          model: vehicleDetails.model,
          color: vehicleDetails.color,
          plate: vehicleDetails.plate,
        },
      );
      setAiResult(result);
    } finally {
      setAiScoring(false);
    }
  };

  // ─── Fetch product config when step 6 is reached ──────────────────────────

  useEffect(() => {
    if (step !== 6) return;
    const { code } = productInfo(vehicleType, coverageType);
    // product code in DB uses dash: MRKB4-COMP; productInfo returns MRKB4-COMP (already)
    getProductConfig(code).then(cfg => setProductConfig(cfg ?? null));
  }, [step, vehicleType, coverageType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!province || !sumInsured || !coverageType) return;
    setSelectedInsurerProduct(null);
    setLoadingProducts(true);
    const vehicleAge = currentYear - vehicleDetails.year;
    getAvailableInsurerProducts('CAR', coverageType, vehicleAge)
      .then(setAvailableProducts)
      .finally(() => setLoadingProducts(false));
  }, [province, sumInsured, coverageType, vehicleDetails.year]);

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

        const breakdown = calcPremium(vehicleType, coverageType, sumInsured, zone, addons);
        const { code: productCode, name: productName } = productInfo(vehicleType, coverageType);

        // Commission & coin calculations — insurer product rates take priority
        const baseCommRate = selectedInsurerProduct?.base_commission_rate
          ?? productConfig?.base_commission_rate ?? 0.10;
        const cappedDiscountRate = selectedInsurerProduct
          ? Math.min(discountRate, selectedInsurerProduct.max_discount_rate)
          : discountRate;
        const effectiveCommRate = Math.max(0, baseCommRate - cappedDiscountRate);
        const discountAmount = Math.round(breakdown.total * cappedDiscountRate);
        const netPremium = breakdown.total - discountAmount;
        const commissionAmount = Math.round(breakdown.total * effectiveCommRate);
        const coinRate = selectedInsurerProduct?.coin_rate ?? productConfig?.coin_rate ?? 0.05;
        const coinReward = Math.floor(breakdown.total * coinRate / 1000);

        // Upload image first
        let vehicleImageUrl: string | undefined;
        if (imageFile) {
          const uploadedUrl = await uploadVehicleImage(imageFile, `tmp-${Date.now()}`);
          vehicleImageUrl = uploadedUrl ?? undefined;
        }

        const order = await createPolicyOrder({
          agent_id: agentId,
          client_id: selectedClient?.id,
          client_name: clientName,
          client_phone: clientPhone,
          client_ktp: clientKtp,
          product_code: productCode,
          product_name: productName,
          vehicle_type: vehicleType === 'CAR' ? 'CAR' : 'MOTORCYCLE',
          vehicle_details: vehicleDetails,
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
          total_premium: breakdown.total,
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

        // Auto-generate review link and notify admin
        autoSendReviewLink(
          order.id,
          num,
          clientName,
          selectedInsurerProduct ? undefined : undefined
        ).then(reviewUrl => {
          if (reviewUrl) setReviewUrl(reviewUrl);
        }).catch(() => {});

        await addNotification({
          agent_id: agentId,
          type: 'SYSTEM',
          title: 'Order Diajukan',
          body: `Order ${num} sedang dalam review. Link tinjauan telah dikirim ke admin.`,
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
    vehicleDetails.plate &&
    vehicleDetails.chassis &&
    vehicleDetails.engine &&
    vehicleDetails.color;

  const canProceedStep4 = province && sumInsured > 0;

  const aiScore = aiResult?.score ?? 0;
  const canProceedStep5 = aiResult !== null && aiScore >= 80;

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
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary-300'
              }`}
            >
              {type === 'CAR' ? (
                <Car
                  className={`w-12 h-12 ${isActive ? 'text-primary-500' : 'text-slate-400'}`}
                />
              ) : (
                <Bike
                  className={`w-12 h-12 ${isActive ? 'text-primary-500' : 'text-slate-400'}`}
                />
              )}
              <span
                className={`font-black text-sm uppercase tracking-wide ${
                  isActive ? 'text-primary-500' : 'text-slate-600 dark:text-slate-300'
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
              ? 'bg-primary-500 text-white'
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
              ? 'bg-primary-500 text-white'
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
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone}</p>
                </div>
                {selectedClient?.id === c.id && (
                  <CheckCircle className="w-5 h-5 text-primary-500 ml-auto" />
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
    const brandList = isCar ? CAR_BRANDS : MOTO_MAKES;
    const modelOptions = isCar ? getModelsForBrand(vehicleDetails.make) : [];
    const autoValue = isCar ? getMarketValue(vehicleDetails.make, vehicleDetails.model) : null;

    const handleModelChange = (model: string) => {
      handleVehicleDetailChange('model', model);
      if (isCar) {
        const mv = getMarketValue(vehicleDetails.make, model);
        if (mv && mv > 0) {
          setSumInsured(mv);
          setSumInsuredDisplay(mv.toLocaleString('id-ID'));
        }
      }
    };

    const handleMakeChange = (make: string) => {
      handleVehicleDetailChange('make', make);
      handleVehicleDetailChange('model', '');
    };

    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Detail Kendaraan</h2>
        <SectionCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Make */}
            <div>
              <Label>Merek *</Label>
              <select
                value={vehicleDetails.make}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleMakeChange(e.target.value)
                }
                className={inputCls}
              >
                <option value="">Pilih merek...</option>
                {brandList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {/* Model — searchable datalist for cars */}
            <div>
              <Label>Model *</Label>
              {isCar ? (
                <>
                  <input
                    type="text"
                    list="vehicle-model-list"
                    value={vehicleDetails.model}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleModelChange(e.target.value)
                    }
                    className={inputCls}
                    placeholder={vehicleDetails.make ? 'Ketik untuk cari model...' : 'Pilih merek dulu'}
                    disabled={!vehicleDetails.make}
                  />
                  <datalist id="vehicle-model-list">
                    {modelOptions.map((m) => (
                      <option key={m.model} value={m.model} />
                    ))}
                  </datalist>
                  {autoValue && autoValue > 0 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Nilai pasar: Rp {autoValue.toLocaleString('id-ID')} (auto-isi UP)
                    </p>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={vehicleDetails.model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleVehicleDetailChange('model', e.target.value)
                  }
                  className={inputCls}
                  placeholder="Contoh: Beat, Vario, dll"
                />
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
            {/* Plate */}
            <div>
              <Label>Nomor Polisi *</Label>
              <input
                type="text"
                value={vehicleDetails.plate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleVehicleDetailChange('plate', e.target.value.toUpperCase())
                }
                className={inputCls}
                placeholder="B 1234 XYZ"
              />
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
                    className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider hover:underline"
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
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-primary-300'
                  }`}
                >
                  <p
                    className={`font-black text-sm ${coverageType === ct ? 'text-primary-500' : 'text-slate-700 dark:text-slate-200'}`}
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
                className="w-5 h-5 accent-orange-500"
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
                className="w-5 h-5 accent-orange-500"
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
                className="w-5 h-5 accent-orange-500"
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
                className="w-5 h-5 accent-orange-500"
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
          {loadingProducts ? (
            <p className="text-xs text-slate-400">Memuat daftar insurer...</p>
          ) : availableProducts.length === 0 ? (
            <p className="text-xs text-slate-400">Tidak ada produk tersedia untuk konfigurasi ini.</p>
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
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-slate-200 dark:border-white/10 hover:border-primary-300'
                    }`}
                  >
                    <p className={`font-black text-sm mb-2 ${selected ? 'text-primary-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {p.insurer_name ?? p.insurer_code}
                    </p>
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
                      Maks diskon {(p.max_discount_rate * 100).toFixed(1)}%
                      {p.max_vehicle_age_years ? ` · Maks usia ${p.max_vehicle_age_years} thn` : ''}
                    </p>
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
        : { label: 'DITOLAK', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
    const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';

    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Foto & Survei AI</h2>

        {/* Upload Box */}
        <SectionCard>
          <div
            className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center gap-3 p-8 cursor-pointer hover:border-primary-400 transition"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview kendaraan"
                className="max-h-52 rounded-xl object-contain"
              />
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-400 text-center">
                  Seret foto kendaraan ke sini, atau klik untuk memilih file
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          {imageFile && !aiResult && (
            <div className="mt-4 flex justify-center">
              <PrimaryBtn onClick={handleRunAI} disabled={aiScoring}>
                {aiScoring ? (
                  <>
                    <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  'Mulai Survei AI'
                )}
              </PrimaryBtn>
            </div>
          )}
          {aiScoring && (
            <p className="text-center text-sm text-slate-400 mt-3 animate-pulse">
              Menganalisis kondisi kendaraan…
            </p>
          )}
        </SectionCard>

        {/* AI Result */}
        {aiResult && (
          <SectionCard>
            <div className="flex items-center gap-4 mb-4">
              <span className={`text-5xl font-black ${scoreColor}`}>{score}</span>
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${scoreBadge.cls}`}
                >
                  {scoreBadge.label}
                </span>
                <p className="text-xs text-slate-400 mt-1">Skor Kelayakan Kendaraan</p>
              </div>
            </div>

            {aiResult.summary && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{aiResult.summary}</p>
            )}

            {aiResult.detailedIssues && aiResult.detailedIssues.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Temuan</p>
                {aiResult.detailedIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                      issue.severity === 'Severe'
                        ? 'bg-rose-50 dark:bg-rose-900/20'
                        : issue.severity === 'Moderate'
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : 'bg-slate-50 dark:bg-white/5'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        issue.severity === 'Severe'
                          ? 'text-rose-500'
                          : issue.severity === 'Moderate'
                          ? 'text-amber-500'
                          : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {issue.part}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 ml-1">
                        — {issue.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {score < 80 && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black">
                  <XCircle className="w-5 h-5" />
                  Kendaraan Tidak Memenuhi Syarat
                </div>
                {aiResult.rejectionReason && (
                  <p className="text-sm text-rose-700 dark:text-rose-300">{aiResult.rejectionReason}</p>
                )}
                <SecondaryBtn onClick={() => { setAiResult(null); setImageFile(null); setImagePreview(''); }}>
                  Ulangi Survei
                </SecondaryBtn>
              </div>
            )}

            {canProceedStep5 && (
              <div className="mt-4">
                <PrimaryBtn onClick={() => setStep(6)}>
                  Lanjutkan ke Perhitungan Premi <ChevronRight className="inline w-4 h-4 ml-1" />
                </PrimaryBtn>
              </div>
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
            <span className="inline-flex items-center gap-1.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold text-xs px-3 py-1 rounded-full">
              <FileText className="w-3.5 h-3.5" />
              {code} — {name}
            </span>
            {selectedInsurerProduct && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs px-3 py-1 rounded-full">
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
          </div>

          {/* Total (before discount) */}
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-white/5 px-5 py-4 flex justify-between items-center">
            <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest text-sm">
              Total Premi OJK
            </span>
            <span className="font-black text-slate-600 dark:text-slate-300 text-xl">{formatIDR(breakdown.total)}</span>
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
          const baseCommRate = selectedInsurerProduct?.base_commission_rate
            ?? productConfig?.base_commission_rate ?? 0.10;
          const maxDisc = selectedInsurerProduct?.max_discount_rate
            ?? productConfig?.max_discount_rate ?? 0;
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
                Diskon & Komisi Agen
              </h3>

              {/* Discount slider */}
              {maxDisc > 0 ? (
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Diskon untuk Klien</Label>
                    <span className="text-sm font-black text-primary-500">{(discountRate * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.round(maxDisc * 1000)}
                    step={5}
                    value={Math.round(discountRate * 1000)}
                    onChange={e => setDiscountRate(parseInt(e.target.value, 10) / 1000)}
                    className="w-full accent-orange-500"
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
                  <span className="font-black text-primary-500 text-lg">{formatIDR(netPrem)}</span>
                </div>
              </div>

              {/* Agent earnings preview */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Komisi Anda</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatIDR(commAmt)}</p>
                  <p className="text-[9px] text-slate-400">{(effectiveComm*100).toFixed(1)}% dari premi</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">Reward Koin</p>
                  <p className="text-base font-black text-amber-600 dark:text-amber-400">{coins.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-slate-400">= {formatIDR(coins * 1000)}</p>
                </div>
              </div>
            </SectionCard>
          );
        })()}

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
      total_premium: breakdown.total,
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
          <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
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
            <CheckCircle className="w-16 h-16 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">Order Berhasil Diajukan!</h3>
          <p className="text-slate-400 text-sm mb-4">
            Order Anda sedang direview. Lakukan pembayaran premi untuk melanjutkan proses.
          </p>
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl px-6 py-4 mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Nomor Order</p>
            <p className="text-2xl font-black text-primary-500">{orderNumber}</p>
          </div>

          {/* Review link auto-generated */}
          {reviewUrl && (
            <div className="w-full mb-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-left space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">Link Tinjauan Penanggung</p>
              <p className="text-xs text-slate-300 break-all">{reviewUrl}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(reviewUrl).catch(() => {})}
                  className="text-[10px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  Salin Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Tinjauan order polis ${orderNumber}:\n${reviewUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  Kirim WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Payment section */}
          {!invoiceUrl ? (
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
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">Invoice Berhasil Dibuat</p>
              <p className="text-xs text-slate-400 mb-3">Halaman pembayaran telah dibuka di tab baru.</p>
              <button
                type="button"
                onClick={() => window.open(invoiceUrl, '_blank', 'noopener,noreferrer')}
                className="text-xs font-bold text-primary-500 underline"
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

  const stepContent: Record<number, React.ReactNode> = {
    1: renderStep1(),
    2: renderStep2(),
    3: renderStep3(),
    4: renderStep4(),
    5: renderStep5(),
    6: renderStep6(),
    7: renderStep7(),
  };

  const stepLabels = [
    'Jenis', 'Klien', 'Kendaraan', 'Jaminan', 'Survei', 'Premi', 'Konfirmasi',
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0a] flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-slate-100 dark:bg-white/10 w-full">
        <div
          className="h-1 bg-primary-500 transition-all duration-500"
          style={{ width: `${(step / 7) * 100}%` }}
        />
      </div>

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
          <p className="text-xs text-slate-400">
            Langkah {step} dari 7 — {stepLabels[step - 1]}
          </p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="px-4 pt-4 flex gap-1.5 overflow-x-auto">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div
              key={n}
              className={`flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold rounded-full px-3 py-1 ${
                active
                  ? 'bg-primary-500 text-white'
                  : done
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-400'
              }`}
            >
              <span>{done ? '✓' : n}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Step Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto">
        {stepContent[step]}
      </div>
    </div>
  );
};

export default VehicleUnderwritingWizard;
