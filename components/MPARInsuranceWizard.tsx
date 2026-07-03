
import React, { useState, useMemo } from 'react';
import {
  Laptop, Smartphone, Home as House, ChevronRight,
  ChevronLeft, Check, ShieldCheck, Wallet,
  Camera, Zap,
  Trash2, Microscope,
  ImagePlus, ExternalLink, ArrowRight, Loader2
} from 'lucide-react';
import { MPAR_PRICING } from '../constants';
import { MPARState, Language } from '../types';
import { analyzeVehicleSurvey } from '../services/geminiService';
import { createPolicyOrder } from '../services/supabaseService';
import { createXenditInvoice } from '../services/paymentService';

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STEPS = ['Select Category', 'Item Registry', 'Select Term', 'Proses Scanning', 'Review & Pay'];

const MPARInsuranceWizard = ({ onComplete, currentUser, lang: _lang }: { onComplete: () => void, currentUser?: any, lang: Language }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mpar, setMpar] = useState<MPARState>({
    category: 'GADGET',
    subCategory: 'SMARTPHONE',
    itemName: '',
    itemPrice: 0,
    itemAge: 0,
    serialNumber: '',
    periodMonths: 12
  });

  const [photos, setPhotos] = useState<{front?: string, back?: string, label?: string}>({});
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiError, setAiError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentPremium = useMemo(() => {
    const { category, subCategory, itemPrice, periodMonths } = mpar;
    
    if (category === 'ELECTRONIC') {
      const tier = MPAR_PRICING.ELECTRONIC.find(t => itemPrice >= t.min && itemPrice <= t.max);
      if (!tier) return 0;
      return subCategory === 'TV' ? tier.TV : tier.NON_TV;
    }
    
    if (category === 'GADGET') {
      const list = periodMonths === 6 ? MPAR_PRICING.GADGET.MONTHS_6 : MPAR_PRICING.GADGET.MONTHS_12;
      const tier = list.find(t => itemPrice >= t.min && itemPrice <= t.max);
      return tier?.premium || 0;
    }
    
    if (category === 'FURNITURE') {
      const tier = MPAR_PRICING.FURNITURE.find(t => itemPrice >= t.min && itemPrice <= t.max);
      return tier?.premium || 0;
    }
    
    return 0;
  }, [mpar]);

  const handleActivate = async () => {
    if (isProcessing || currentPremium === 0) return;
    setIsProcessing(true);
    setSubmitError(null);
    try {
      const order = await createPolicyOrder({
        agent_id: currentUser?.id ?? '',
        client_id: currentUser?.id,
        client_name: currentUser?.name ?? 'Nasabah',
        client_phone: currentUser?.phone,
        client_ktp: currentUser?.ktp,
        product_code: 'MPAR_INSURANCE',
        product_name: `MPAR All-Risk ${mpar.category} - ${mpar.itemName}`,
        vehicle_type: undefined,
        vehicle_details: null,
        coverage_type: 'MPAR',
        zone: 1,
        vehicle_category: 0,
        addons: { category: mpar.category, subCategory: mpar.subCategory, itemName: mpar.itemName, serialNumber: mpar.serialNumber, periodMonths: mpar.periodMonths, aiScore },
        sum_insured: mpar.itemPrice,
        base_premium: Math.round(currentPremium),
        addon_premium: 0,
        admin_fee: 0,
        stamp_duty: 10000,
        total_premium: Math.round(currentPremium),
        ojk_rate: 0,
        discount_rate: 0,
        discount_amount: 0,
        net_premium: Math.round(currentPremium),
        commission_rate: 0,
        commission_amount: 0,
        coin_reward: 0,
        insurer_name: 'SurePath MPAR',
        status: 'SUBMITTED',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + mpar.periodMonths)).toISOString(),
      });
      if (!order) throw new Error('Gagal membuat order');
      setOrderNumber(order.order_number ?? order.id);
      const invoice = await createXenditInvoice({
        order_id: order.id,
        order_number: order.order_number ?? order.id,
        client_name: currentUser?.name ?? 'Nasabah',
        client_email: currentUser?.email,
        client_phone: currentUser?.phone,
        product_name: order.product_name,
        total_premium: order.total_premium,
      });
      if (invoice?.invoice_url) {
        setInvoiceUrl(invoice.invoice_url);
        window.open(invoice.invoice_url, '_blank', 'noopener,noreferrer');
      }
      setIsSuccess(true);
    } catch (e) {
      console.error('handleActivate MPAR:', e);
      setSubmitError('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const runAiAudit = async () => {
    if (!photos.front) return;
    setLoading(true);
    setAiError(false);
    const response = await analyzeVehicleSurvey([{ id: 'item_front', data: photos.front }]);
    setLoading(false);
    if (response.success && (response.score ?? 0) > 0) {
      setAiScore(response.score || 95);
      setAiError(false);
    } else {
      setAiScore(null);
      setAiError(true);
    }
  };

  const renderStep0 = () => (
    <div className="space-y-4">
      <p className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pilih Kategori Barang</p>

      <div className="grid grid-cols-1 gap-3 px-5">
        {[
          { id: 'GADGET', label: 'Gadgets & Devices', desc: 'HP, Tablet, Laptop shield.', icon: Smartphone, sub: 'SMARTPHONE' },
          { id: 'ELECTRONIC', label: 'Electronic Appliances', desc: 'TV, Fridge, AC, and more.', icon: Laptop, sub: 'NON-TV' },
          { id: 'FURNITURE', label: 'Furniture & Decor', desc: 'Sofa, Bed, Premium items.', icon: House, sub: 'FURNITURE_CORE' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setMpar({...mpar, category: cat.id as any, subCategory: cat.sub as any})}
            className={mpar.category === cat.id ? 'rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 cursor-pointer transition-all text-left flex items-center gap-4' : 'rounded-xl border border-gray-200 p-4 cursor-pointer transition-all active:bg-gray-50 text-left flex items-center gap-4'}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 ${mpar.category === cat.id ? 'text-emerald-500' : 'text-gray-400'}`}>
               <cat.icon size={24}/>
            </div>
            <div className="flex-1">
               <h4 className="font-semibold text-sm text-gray-900">{cat.label}</h4>
               <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
            </div>
            {mpar.category === cat.id && <Check className="text-emerald-500 flex-shrink-0" size={20} strokeWidth={2.5}/>}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
       <p className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Barang</p>

       <div className="px-5 space-y-4">
          {mpar.category === 'ELECTRONIC' && (
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setMpar({...mpar, subCategory: 'TV'})}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all ${mpar.subCategory === 'TV' ? 'bg-white text-emerald-500 shadow' : 'text-gray-400'}`}
                >
                  TV Unit
                </button>
                <button
                  onClick={() => setMpar({...mpar, subCategory: 'NON-TV'})}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all ${mpar.subCategory === 'NON-TV' ? 'bg-white text-emerald-500 shadow' : 'text-gray-400'}`}
                >
                  Non-TV Electronic
                </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Asset Name / Brand</label>
            <input
              placeholder="e.g. Samsung S24 Ultra"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              value={mpar.itemName}
              onChange={(e) => setMpar({...mpar, itemName: e.target.value.toUpperCase()})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Serial Number / IMEI</label>
              <input
                placeholder="Unique ID"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                value={mpar.serialNumber}
                onChange={(e) => setMpar({...mpar, serialNumber: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Asset Value (Rp)</label>
              <input
                type="number"
                placeholder="Market Price"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                value={mpar.itemPrice || ''}
                onChange={(e) => setMpar({...mpar, itemPrice: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
            <ShieldCheck className="text-emerald-500 flex-shrink-0" size={20}/>
            <p className="text-xs text-emerald-700 leading-relaxed">
               MPAR Protection covers: Accidental Damage, Fire, Riots, and Water Damage.
            </p>
          </div>
       </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
       <p className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pilih Periode Perlindungan</p>

       <div className="px-5 grid grid-cols-1 gap-3">
          {[
            { id: 12, label: '1 Year Full Coverage', desc: '12 Months standard matrix.' },
            ...(mpar.category === 'GADGET' ? [{ id: 6, label: '6 Months Cluster', desc: 'Flexible short-term shield.' }] : [])
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMpar({...mpar, periodMonths: opt.id as any})}
              className={mpar.periodMonths === opt.id ? 'rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 cursor-pointer transition-all text-left flex items-center gap-4' : 'rounded-xl border border-gray-200 p-4 cursor-pointer transition-all active:bg-gray-50 text-left flex items-center gap-4'}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 ${mpar.periodMonths === opt.id ? 'text-emerald-500' : 'text-gray-400'}`}>
                 <Zap size={24}/>
              </div>
              <div className="flex-1">
                 <h4 className="font-semibold text-sm text-gray-900">{opt.label}</h4>
                 <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
              <div className="text-right">
                 <p className="text-sm font-bold text-emerald-600 font-mono">
                    {opt.id === 6
                      ? formatIDR(MPAR_PRICING.GADGET.MONTHS_6.find(t => mpar.itemPrice >= t.min && mpar.itemPrice <= t.max)?.premium || 0)
                      : formatIDR(currentPremium)
                    }
                 </p>
              </div>
            </button>
          ))}
       </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4 pb-4">
       <p className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Audit Barang</p>

       <div className="px-5 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4 text-center space-y-4">
             <div className="relative inline-block">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 mx-auto">
                   <Microscope size={40} className={loading ? 'animate-spin' : ''}/>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow">
                   <Camera size={14} strokeWidth={2.5}/>
                </div>
             </div>
             <p className="text-xs text-gray-500">Foto barang untuk verifikasi kondisi</p>

             <div className="grid grid-cols-1 gap-4">
                {photos.front ? (
                   <div className="relative aspect-video rounded-xl overflow-hidden group">
                      <img src={photos.front} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                         <button onClick={() => setPhotos({})} className="p-3 bg-white text-rose-500 rounded-xl shadow-xl"><Trash2 size={20}/></button>
                         <button onClick={runAiAudit} className="px-5 py-2 bg-emerald-500 text-white rounded-xl font-semibold text-xs">Retest Audit</button>
                      </div>
                      {aiScore && (
                        <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-lg font-semibold text-xs shadow-lg">
                           Score: {aiScore}% Clean
                        </div>
                      )}
                   </div>
                ) : (
                   <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500/50 transition-all">
                      <div className="flex gap-1 text-gray-400">
                        <Camera size={22}/><ImagePlus size={22}/>
                      </div>
                      <p className="text-xs text-gray-400">Upload Front View (Cam/Gallery)</p>
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setPhotos({...photos, front: reader.result as string});
                          reader.readAsDataURL(file);
                        }}
                      />
                   </label>
                )}
             </div>
          </div>

          {photos.front && !aiScore && !loading && !aiError && (
             <button onClick={runAiAudit} className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all">
                Mulai Scanning
             </button>
          )}

          {aiError && (
            <div className="space-y-3">
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 flex gap-3 items-start">
                <p className="text-xs text-rose-700 leading-relaxed">
                  AI tidak dapat memverifikasi kondisi item. Coba foto ulang dengan pencahayaan lebih baik.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={runAiAudit}
                  className="h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all"
                >
                  Coba Lagi
                </button>
                <button
                  onClick={handleNext}
                  className="h-12 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm active:bg-gray-50 transition-all"
                >
                  Lanjut Tanpa Scan
                </button>
              </div>
            </div>
          )}
       </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
       <p className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ringkasan & Pembayaran</p>

       <div className="mx-5 rounded-2xl bg-gray-50 border border-gray-100 p-4">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Item</span>
            <span className="text-sm font-semibold text-gray-900">{mpar.itemName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">S/N</span>
            <span className="text-sm font-semibold text-gray-900 font-mono">{mpar.serialNumber}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Durasi</span>
            <span className="text-sm font-semibold text-gray-900">{mpar.periodMonths} Bulan</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm font-bold text-gray-900">Total Premi Net</span>
            <span className="text-base font-bold text-emerald-600 font-mono">{formatIDR(currentPremium)}</span>
          </div>
       </div>

       {submitError && (
         <div className="mx-5 bg-rose-50 p-4 rounded-xl border border-rose-200 flex gap-3 items-center">
           <p className="text-xs text-rose-700 leading-relaxed">{submitError}</p>
         </div>
       )}

       <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100">
         <button
           onClick={handleActivate}
           disabled={isProcessing}
           className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
         >
           {isProcessing ? (
             <><Loader2 size={18} className="animate-spin"/><span>Memproses...</span></>
           ) : (
             <><Wallet size={18}/><span>Bayar Sekarang</span></>
           )}
         </button>
       </div>
    </div>
  );

  if (isSuccess) {
    return (
      <div className="bg-white min-h-screen pb-28 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-2xl mb-8">
          <ShieldCheck size={56} strokeWidth={2.5}/>
        </div>
        <div className="space-y-4 mb-12">
          <h2 className="text-2xl font-bold text-gray-900">
            Pesanan <span className="text-emerald-500">Diterima</span>
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Proteksi barang berhasil didaftarkan. Polis aktif setelah pembayaran dikonfirmasi.
          </p>
        </div>
        <div className="mx-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 w-full max-w-sm mb-10">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">No. Pesanan</span>
            <span className="text-sm font-semibold text-gray-900 font-mono">{orderNumber ?? '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Item</span>
            <span className="text-sm font-semibold text-gray-900">{mpar.itemName}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-gray-500">Status</span>
            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-semibold">Diproses</span>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4">
          {invoiceUrl && (
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
              className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all flex items-center justify-center gap-3">
              Buka Halaman Pembayaran <ExternalLink size={18}/>
            </a>
          )}
          <button onClick={onComplete}
            className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold text-sm active:bg-gray-800 transition-all flex items-center justify-center gap-3">
            Kembali ke Beranda <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-28">
       <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={step > 0 ? handleBack : onComplete} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0">
            <ChevronLeft size={20}/>
          </button>
          <h3 className="text-base font-semibold text-gray-900">{STEPS[step]}</h3>
       </div>

       <div className="px-5 py-4 flex items-center gap-2">
         {STEPS.map((_s, i) => (
           <React.Fragment key={i}>
             {i > 0 && <div className={`flex-1 h-0.5 ${i <= step ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>}
             {i < step ? (
               <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center"><Check size={12}/></div>
             ) : i === step ? (
               <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
             ) : (
               <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center">{i + 1}</div>
             )}
           </React.Fragment>
         ))}
       </div>

       <div className="px-5 py-4">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
       </div>

       <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100">
          <div className="flex items-center justify-between gap-4 mb-3">
             <div>
               <p className="text-xs text-gray-500">Net Premium</p>
               <p className="text-base font-bold text-emerald-600 font-mono">{formatIDR(currentPremium)}</p>
             </div>
             <div className="flex gap-3">
               {step > 0 && (
                 <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0">
                   <ChevronLeft size={20}/>
                 </button>
               )}
               {step < STEPS.length - 1 && (
                  <button
                    onClick={handleNext}
                    disabled={(step === 1 && (!mpar.itemName || !mpar.itemPrice)) || (step === 3 && !aiScore)}
                    className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 px-6"
                  >
                    Lanjut <ChevronRight size={18}/>
                  </button>
               )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default MPARInsuranceWizard;
