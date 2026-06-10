
import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, User, Users, GraduationCap, Briefcase,
  ChevronRight, ChevronLeft, Check, Wallet,
  ShieldCheck, Heart, Zap, Cpu, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { createPolicyOrder } from '../services/supabaseService';
import { createXenditInvoice } from '../services/paymentService';
import { PA_PLANS } from '../constants';
import { PAState, Language } from '../types';

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STEPS = ['Select Category', 'Select Plan', 'Insured Data', 'Beneficiary', 'Review'];

/* Fix: Added lang to props */
const PAInsuranceWizard = ({ onComplete, currentUser, lang }: { onComplete: () => void, currentUser?: any, lang: Language }) => {
  const [step, setStep] = useState(0);
  const [paData, setPaData] = useState<PAState>({
    category: 'GENERAL',
    planCode: '',
    beneficiaryName: '',
    beneficiaryRelation: ''
  });
  
  // Local state for insured data, pre-filled from currentUser
  const [insuredData, setInsuredData] = useState({
    name: currentUser?.name || '',
    ktp: currentUser?.ktp || '',
    email: currentUser?.email || '',
    birthDate: ''
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  const [period, setPeriod] = useState<'1' | '12'>('12');

  const plans = paData.category === 'GENERAL' ? PA_PLANS.GENERAL : PA_PLANS.STUDENT;
  const selectedPlanData = useMemo(() => plans.find(p => p.code === paData.planCode), [paData.planCode, plans]);

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handleActivate = async () => {
    if (isProcessing || !selectedPlanData) return;
    setIsProcessing(true);
    try {
      const order = await createPolicyOrder({
        agent_id: currentUser?.id ?? '',
        client_id: currentUser?.id,
        client_name: insuredData.name || currentUser?.name || 'Nasabah',
        client_phone: currentUser?.phone,
        client_ktp: insuredData.ktp || currentUser?.ktp,
        product_code: 'PA_INSURANCE',
        product_name: `Asuransi Kecelakaan Diri PA-${paData.planCode} (${paData.category})`,
        vehicle_type: undefined,
        vehicle_details: null,
        coverage_type: 'PA',
        zone: 1,
        vehicle_category: 0,
        addons: { category: paData.category, planCode: paData.planCode, beneficiaryName: paData.beneficiaryName, beneficiaryRelation: paData.beneficiaryRelation, period },
        sum_insured: selectedPlanData.benefit ? parseInt(String(selectedPlanData.benefit).replace(/\D/g, '')) * 1000000 : 0,
        base_premium: Math.round(selectedPlanData.premium),
        addon_premium: 0,
        admin_fee: 0,
        stamp_duty: 10000,
        total_premium: Math.round(selectedPlanData.premium),
        ojk_rate: 0,
        discount_rate: 0,
        discount_amount: 0,
        net_premium: Math.round(selectedPlanData.premium),
        commission_rate: 0,
        commission_amount: 0,
        coin_reward: 0,
        insurer_name: 'SurePath PA',
        status: 'SUBMITTED',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      });
      if (!order) throw new Error('Gagal membuat order');
      setOrderNumber(order.order_number ?? order.id);
      const invoice = await createXenditInvoice({
        order_id: order.id,
        order_number: order.order_number ?? order.id,
        client_name: insuredData.name || currentUser?.name || 'Nasabah',
        client_email: insuredData.email || currentUser?.email,
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
      console.error('handleActivate PA:', e);
      alert('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep0 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="p-4 bg-primary-500/10 rounded-3xl border border-primary-500/20 flex gap-4">
         <ShieldAlert className="text-primary-500 flex-shrink-0" size={24}/>
         <p className="text-[0.65rem] font-bold text-gray-600 dark:text-gray-300 leading-relaxed uppercase tracking-wider">
           Sistem Asuransi Kecelakaan Diri. Protect yourself or your students with PSAKDI grade coverage.
         </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { id: 'GENERAL', label: 'Umum / Karyawan', desc: 'Proteksi untuk profesional & umum.', icon: Briefcase, color: 'text-blue-500' },
          { id: 'STUDENT', label: 'Pelajar / Mahasiswa', desc: 'Proteksi khusus akademisi.', icon: GraduationCap, color: 'text-emerald-500' }
        ].map(cat => (
          <button 
            key={cat.id}
            onClick={() => setPaData({...paData, category: cat.id as any, planCode: ''})}
            className={`p-6 rounded-[2.5rem] border-2 text-left flex items-center gap-6 transition-all tap-feedback ${paData.category === cat.id ? 'border-primary-500 bg-primary-500/[0.03] shadow-xl' : 'border-black/5 bg-white dark:bg-white/5 opacity-60'}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-white/10 ${paData.category === cat.id ? cat.color : 'text-gray-400'}`}>
               <cat.icon size={28}/>
            </div>
            <div>
               <h4 className="font-black text-lg uppercase tracking-tighter">{cat.label}</h4>
               <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{cat.desc}</p>
            </div>
            {paData.category === cat.id && <Check className="ml-auto text-primary-500" size={24} strokeWidth={3}/>}
          </button>
        ))}
      </div>

      <div className="space-y-4 pt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Periode Pertanggungan</label>
          <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={() => setPeriod('1')}
               className={`py-4 rounded-2xl border-2 font-black text-sm transition-all ${period === '1' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-black/5 text-gray-400'}`}
             >
               1 BULAN
             </button>
             <button 
               onClick={() => setPeriod('12')}
               className={`py-4 rounded-2xl border-2 font-black text-sm transition-all ${period === '12' ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-black/5 text-gray-400'}`}
             >
               12 BULAN
             </button>
          </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4 animate-fade-in">
       <div className="flex items-center justify-between px-2">
          <h4 className="text-[0.65rem] font-black uppercase text-gray-400 tracking-widest">Select Plan Code</h4>
          <span className="text-[0.6rem] font-bold text-primary-500 uppercase">{paData.category} Core</span>
       </div>

       <div className="grid grid-cols-1 gap-3">
          {plans.map(p => (
            <div 
              key={p.code}
              onClick={() => setPaData({...paData, planCode: p.code})}
              className={`p-5 rounded-[2.2rem] border-2 cursor-pointer transition-all relative overflow-hidden flex items-center justify-between group ${paData.planCode === p.code ? 'border-primary-500 bg-primary-500/5 shadow-xl' : 'border-black/5 bg-white dark:bg-white/5'}`}
            >
               <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${paData.planCode === p.code ? 'bg-primary-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                    {p.code}
                  </div>
                  <div>
                    <p className="text-[0.5rem] font-black text-primary-500 uppercase tracking-widest">Santunan Meninggal</p>
                    <h5 className="text-lg font-black uppercase tracking-tight">Rp {p.benefit}</h5>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{formatIDR(p.premium)}</p>
                  <p className="text-[0.45rem] font-bold text-gray-400 uppercase">Premi Tahunan</p>
               </div>
               {paData.planCode === p.code && (
                 <div className="absolute top-0 right-0 p-3">
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pop-in">
                       <Check size={12} strokeWidth={4}/>
                    </div>
                 </div>
               )}
            </div>
          ))}
       </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg"><User size={20}/></div>
                <div>
                   <p className="text-[0.5rem] font-black uppercase text-primary-400">Identity Registry</p>
                   <p className="text-lg font-black uppercase tracking-tight">Insured Member</p>
                </div>
             </div>
             <p className="text-[0.55rem] text-gray-400 leading-relaxed font-bold uppercase tracking-widest">Validasi sistem ensures instant payout eligibility.</p>
          </div>
       </div>

       <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Nama Lengkap (KTP)</label>
            <input 
              placeholder="Sesuai Kartu Identitas"
              className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm uppercase"
              value={insuredData.name}
              onChange={(e) => setInsuredData({...insuredData, name: e.target.value.toUpperCase()})}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
                <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">NIK (16 Digit)</label>
                <input 
                  maxLength={16} 
                  placeholder="3271xxxxxxxx" 
                  className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"
                  value={insuredData.ktp}
                  onChange={(e) => setInsuredData({...insuredData, ktp: e.target.value.replace(/\D/g, '')})}
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Tgl Lahir</label>
                <input 
                  type="date" 
                  className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"
                  value={insuredData.birthDate}
                  onChange={(e) => setInsuredData({...insuredData, birthDate: e.target.value})}
                />
             </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Alamat Email</label>
            <input 
              type="email"
              placeholder="member@surepath.ai"
              className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"
              value={insuredData.email}
              onChange={(e) => setInsuredData({...insuredData, email: e.target.value})}
            />
          </div>
       </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className="p-6 bg-rose-500/10 rounded-[2.5rem] border border-rose-500/20 text-rose-500 flex gap-4">
          <Heart size={24} className="flex-shrink-0 animate-pulse"/>
          <p className="text-[0.65rem] font-bold leading-relaxed uppercase tracking-wider">
            Tentukan penerima manfaat (Ahli Waris) untuk validasi klaim secara otomatis.
          </p>
       </div>

       <div className="space-y-5">
          <div className="space-y-1.5">
             <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Nama Ahli Waris</label>
             <input 
                placeholder="Nama Lengkap"
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm uppercase"
                value={paData.beneficiaryName}
                onChange={(e) => setPaData({...paData, beneficiaryName: e.target.value.toUpperCase()})}
             />
          </div>
          <div className="space-y-1.5">
             <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Hubungan</label>
             <div className="grid grid-cols-2 gap-2">
                {['ORANG TUA', 'SUAMI / ISTRI', 'ANAK', 'LAINNYA'].map(rel => (
                  <button 
                    key={rel}
                    onClick={() => setPaData({...paData, beneficiaryRelation: rel})}
                    className={`py-3 rounded-xl border-2 font-black text-[0.6rem] transition-all ${paData.beneficiaryRelation === rel ? 'border-primary-500 text-primary-500 bg-primary-500/5' : 'border-black/5 text-gray-400'}`}
                  >
                    {rel}
                  </button>
                ))}
             </div>
          </div>
       </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border-2 border-black/5 space-y-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 p-10 opacity-[0.03] dark:opacity-[0.06] -rotate-12 translate-x-12 -translate-y-12"><ShieldCheck size={200}/></div>
          <div className="flex justify-between items-start relative z-10">
             <div>
               <p className="text-[0.6rem] font-black uppercase text-gray-400 tracking-[0.4em] mb-1.5 opacity-80">Policy Config</p>
               <h4 className="text-3xl font-black uppercase tracking-tighter text-primary-500">PA Plan {paData.planCode}</h4>
             </div>
             <div className="p-4 bg-primary-500/10 rounded-2xl text-primary-500 shadow-inner"><Cpu size={24}/></div>
          </div>
          
          <div className="grid grid-cols-1 gap-5 pt-6 border-t border-black/5 dark:border-white/5 relative z-10">
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><ShieldAlert size={16} className="text-primary-500"/> Kategori</span>
                <span className="font-black text-right uppercase">{paData.category}</span>
             </div>
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Users size={16} className="text-primary-500"/> Ahli Waris</span>
                <span className="font-black text-right uppercase">{paData.beneficiaryName}</span>
             </div>
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Zap size={16} className="text-primary-500"/> Santunan</span>
                <span className="font-black text-right text-primary-500 tracking-widest">Rp {selectedPlanData?.benefit}</span>
             </div>
          </div>

          <div className="pt-8 border-t border-black/5 dark:border-white/5 relative z-10">
              <div className="flex justify-between items-end">
                 <div>
                    <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">Total Premi Net</p>
                    <h3 className="text-4xl font-black tracking-tighter text-primary-500">{formatIDR(selectedPlanData?.premium || 0)}</h3>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <p className="text-[0.45rem] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> OJK Approved</p>
                    <p className="text-[0.45rem] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> Instant Issue</p>
                 </div>
              </div>
          </div>
       </div>

       <button
         onClick={handleActivate}
         disabled={isProcessing}
         className="w-full py-6 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-base tracking-[0.25em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
       >
         {isProcessing ? (
           <><Loader2 size={24} className="animate-spin text-primary-500"/><span>Memproses...</span></>
         ) : (
           <><Wallet size={24} className="text-primary-500"/><span>ACTIVATE POLICY</span></>
         )}
       </button>
    </div>
  );

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-[#f0faf7] dark:bg-[#050505] animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8">
          <ShieldCheck size={56} strokeWidth={2.5}/>
        </div>
        <div className="space-y-4 mb-12">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
            Pesanan <span className="text-emerald-500">Diterima</span>
          </h2>
          <p className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
            Pengajuan kecelakaan diri berhasil dikirim. Polis aktif setelah pembayaran dikonfirmasi.
          </p>
        </div>
        <div className="w-full max-w-sm bg-white dark:bg-white/5 border border-black/5 rounded-[3rem] p-8 space-y-4 shadow-xl mb-10">
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>No. Pesanan</span>
            <span className="text-primary-500 font-mono">{orderNumber ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>Plan</span>
            <span className="font-black">PA-{paData.planCode}</span>
          </div>
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>Status</span>
            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[0.55rem] font-black uppercase tracking-widest">Diproses</span>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4">
          {invoiceUrl && (
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              Buka Halaman Pembayaran <ExternalLink size={18}/>
            </a>
          )}
          <button onClick={onComplete}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
            Kembali ke Beranda <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-28">
       <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors">
                 <ChevronLeft size={20}/>
               </button>
               <span className="text-base font-semibold text-gray-900">Personal Accident</span>
            </div>
            <span className="text-xs text-gray-400">{step + 1}/{STEPS.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
             {STEPS.map((_s, i) => (
               <React.Fragment key={i}>
                 {i > 0 && <div className={i <= step ? "flex-1 h-0.5 bg-emerald-500" : "flex-1 h-0.5 bg-gray-200"}></div>}
                 {i === step ? (
                   <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                 ) : i < step ? (
                   <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={12} strokeWidth={3}/></div>
                 ) : (
                   <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center">{i + 1}</div>
                 )}
               </React.Fragment>
             ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
       </div>

       <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex-1">
             <p className="text-xs text-gray-500">Net Premium</p>
             <p className="text-lg font-bold text-emerald-600 font-mono">{selectedPlanData ? formatIDR(selectedPlanData.premium) : 'Rp 0'}</p>
          </div>
          <div className="flex gap-2">
             {step < STEPS.length - 1 && (
                <button
                  onClick={handleNext}
                  disabled={(step === 1 && !paData.planCode) || (step === 3 && !paData.beneficiaryName)}
                  className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 px-8 flex items-center gap-2"
                >
                  Lanjut <ChevronRight size={16}/>
                </button>
             )}
          </div>
       </div>
    </div>
  );
};

export default PAInsuranceWizard;
