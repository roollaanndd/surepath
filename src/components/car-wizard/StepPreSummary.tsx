import React from 'react';
import { 
  ShieldCheck, Info, Car, Smartphone, Shield, ClipboardList, 
  ChevronDown, AlertCircle, Hash, Palette, User, FileText, 
  Fingerprint, Cpu, Scale, Building2, Wallet, Zap, Layers,
  CheckCircle2, Plus, Package, Calendar
} from 'lucide-react';
import { formatIDR, Badge } from './WizardUI';

interface StepPreSummaryProps {
  vehicle: any;
  coverage: any;
  premiumBreakdown: any;
  showBreakdown: boolean;
  setShowBreakdown: (b: boolean) => void;
  stnkResult: any;
  kycData: any;
}

const StepPreSummary: React.FC<StepPreSummaryProps> = ({
  vehicle, coverage, premiumBreakdown, showBreakdown, setShowBreakdown, stnkResult, kycData
}) => {
  // Helper to get list of active expansions
  const activeExpansions = [
    { id: 'authorized', label: 'Bengkel Resmi', active: coverage.authorized },
    { id: 'flood', label: 'Banjir & Badai', active: coverage.flood },
    { id: 'earthquake', label: 'Gempa & Tsunami', active: coverage.earthquake },
    { id: 'srcc', label: 'Kerusuhan (SRCC)', active: coverage.srcc },
    { id: 'terrorism', label: 'Terorisme & Sabotase', active: coverage.terrorism },
  ].filter(e => e.active);

  const InfoRow = ({ label, value, icon: Icon, color = "text-primary-500", mono = false }: any) => (
    <div className="flex justify-between items-center py-3.5 border-b border-black/5 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={14} className={`${color} opacity-70`} />
        <span className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">{label}</span>
      </div>
      <span className={`text-[0.75rem] font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 ${mono ? 'font-mono tracking-widest text-primary-500' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
       {/* SECTION 1: UNIT & TECHNICAL MATRIX */}
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
            <Car size={200}/>
          </div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 shadow-inner">
                <Car size={24}/>
             </div>
             <div>
                <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Unit Technical Audit</h4>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest">Hardware Registry Node</p>
             </div>
          </div>

          <div className="space-y-0 relative z-10">
             <InfoRow label="Merk / Brand" value={vehicle.brand} icon={Layers} />
             <InfoRow label="Tipe / Model" value={vehicle.model} icon={Package} />
             <InfoRow label="Tahun Unit" value={vehicle.year} icon={Calendar} />
             <InfoRow label="Warna (STNK)" value={stnkResult?.color || vehicle.color || 'N/A'} icon={Palette} />
             <InfoRow label="Nomor Polisi" value={vehicle.plate} icon={Smartphone} color="text-blue-500" mono />
             <InfoRow label="No. Rangka (VIN)" value={vehicle.vin} icon={Hash} mono />
             <InfoRow label="No. Mesin" value={vehicle.engine} icon={Cpu} mono />
          </div>
       </div>

       {/* SECTION 2: IDENTITY SYNC */}
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                <Fingerprint size={24}/>
             </div>
             <div>
                <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Identity Registry</h4>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest">Underwriting Verification</p>
             </div>
          </div>
          
          <div className="grid gap-4 relative z-10">
             <div className="p-5 rounded-[2rem] bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col gap-3 group hover:border-emerald-500/30 transition-all">
                <div className="flex justify-between items-center">
                   <p className="text-[0.55rem] font-black uppercase text-gray-400 tracking-widest">Tertanggung (KTP)</p>
                   <Badge color="blue">Primary Payer</Badge>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm">
                      <User size={18}/>
                   </div>
                   <p className="text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">{kycData?.name || '-'}</p>
                </div>
             </div>
             
             <div className="p-5 rounded-[2rem] bg-gray-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col gap-3 group hover:border-emerald-500/30 transition-all">
                <div className="flex justify-between items-center">
                   <p className="text-[0.55rem] font-black uppercase text-gray-400 tracking-widest">Pemilik Kendaraan (STNK)</p>
                   <Badge color="emerald">Asset Owner</Badge>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm">
                      <FileText size={18}/>
                   </div>
                   <p className="text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">{stnkResult?.ownerName || '-'}</p>
                </div>
             </div>
          </div>
       </div>

       {/* SECTION 3: POLICY MATRIX */}
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 shadow-inner">
                <Shield size={24}/>
             </div>
             <div>
                <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Policy Configuration</h4>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest">Selected Protection Layer</p>
             </div>
          </div>

          <div className="space-y-5">
             <div className="flex justify-between items-center p-5 bg-primary-500/5 rounded-[2rem] border border-primary-500/10 shadow-inner">
                <div>
                   <p className="text-[0.5rem] font-black uppercase text-primary-400 tracking-widest">Main Product</p>
                   <p className="text-lg font-black uppercase text-primary-600 dark:text-primary-400 tracking-tighter">{coverage.type}</p>
                </div>
                <Zap size={24} className="text-primary-500 animate-pulse"/>
             </div>

             <div className="space-y-3">
                <p className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Active Add-ons</p>
                <div className="flex flex-wrap gap-2.5">
                   {activeExpansions.length > 0 ? activeExpansions.map(e => (
                     <div key={e.id} className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/10 flex items-center gap-2.5 shadow-sm">
                        <CheckCircle2 size={12} className="text-emerald-500"/>
                        <span className="text-[0.6rem] font-black uppercase text-gray-600 dark:text-gray-300 tracking-widest">{e.label}</span>
                     </div>
                   )) : (
                     <p className="text-[0.65rem] font-bold text-gray-400 italic ml-2">No additional expansions selected.</p>
                   )}
                   {coverage.tpl > 0 && (
                     <div className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20 flex items-center gap-2.5 shadow-sm">
                        <Plus size={12} className="text-blue-500"/>
                        <span className="text-[0.6rem] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">TPL {coverage.tpl/1000000}JT Limit</span>
                     </div>
                   )}
                </div>
             </div>
          </div>
       </div>

       {/* SECTION 4: FINANCIAL LEDGER */}
       <div className="p-10 bg-gray-900 dark:bg-black rounded-[4rem] border border-white/5 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-500 via-emerald-500 to-primary-500 animate-mesh"></div>
          
          <div className="flex justify-between items-start mb-12 mt-4">
             <div className="space-y-1.5">
                <p className="text-[0.65rem] font-black uppercase text-gray-500 tracking-[0.5em]">Financial Audit Ledger</p>
                <h4 className="text-4xl font-black uppercase tracking-tighter">Premium Matrix</h4>
             </div>
             <div className="px-5 py-2.5 bg-white/10 rounded-2xl border border-white/10 flex flex-col items-end shadow-xl">
                <span className="text-[0.5rem] font-black text-primary-500 uppercase tracking-widest">Node Status</span>
                <span className="text-sm font-black uppercase tracking-widest flex items-center gap-2">ACTIVE <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div></span>
             </div>
          </div>

          <div className="space-y-5">
             <div className="flex justify-between items-center text-[0.8rem] font-bold tracking-wider opacity-90 border-b border-white/10 pb-4">
                <span className="flex items-center gap-3"><Zap size={16} className="text-primary-500"/> Premi Dasar ({premiumBreakdown?.baseRate}%)</span>
                <span className="font-mono text-xl">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
             </div>
             
             {premiumBreakdown?.expansions.length > 0 && (
                <div className="space-y-3.5 border-b border-white/10 pb-5">
                   <p className="text-[0.6rem] font-black uppercase text-primary-500 tracking-[0.4em] mb-2">Expansion Loadings</p>
                   {premiumBreakdown.expansions.map((exp: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-[0.7rem] font-medium opacity-80">
                         <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-primary-500 rounded-full shadow-[0_0_8px_#f97316]"></div> {exp.name}</span>
                         <span className="font-mono">{formatIDR(exp.val)}</span>
                      </div>
                   ))}
                </div>
             )}

             {premiumBreakdown?.tplPremium > 0 && (
                <div className="flex justify-between items-center text-[0.75rem] border-b border-white/10 pb-4 opacity-90">
                   <span className="flex items-center gap-3"><Plus size={14} className="text-blue-400"/> TPL Core Protection</span>
                   <span className="font-mono">{formatIDR(premiumBreakdown.tplPremium)}</span>
                </div>
             )}

             <div className="grid grid-cols-2 gap-8 py-2">
                <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[0.6rem] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2"><Building2 size={12}/> Policy & Admin</span>
                    <p className="text-base font-black font-mono">{formatIDR(premiumBreakdown?.adminFee || 0)}</p>
                </div>
                <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/5 text-right">
                    <span className="text-[0.6rem] font-black uppercase text-gray-500 tracking-widest flex items-center justify-end gap-2"><Scale size={12}/> OJK Stamp Duty</span>
                    <p className="text-base font-black font-mono">{formatIDR(premiumBreakdown?.stampDuty || 0)}</p>
                </div>
             </div>

             {premiumBreakdown?.discountAmount > 0 && (
                <div className="flex justify-between items-center p-5 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 mt-4 shadow-inner">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                         <Zap size={20} className="text-white fill-white"/>
                      </div>
                      <div>
                         <span className="text-[0.75rem] font-black uppercase tracking-widest text-emerald-400">Commission Offset</span>
                         <p className="text-[0.55rem] font-bold text-emerald-600/60 uppercase">Applied Discount: {premiumBreakdown.discountPercent}%</p>
                      </div>
                   </div>
                   <span className="font-mono text-emerald-400 text-xl font-black">-{formatIDR(premiumBreakdown.discountAmount)}</span>
                </div>
             )}

             <div className="pt-8 mt-8 border-t-2 border-white/10">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[0.8rem] font-black uppercase tracking-[0.5em] text-primary-500 mb-2">Total Final Payable</p>
                      <h3 className="text-5xl font-black tracking-tighter leading-none text-glow-primary">{formatIDR(premiumBreakdown?.totalPayable || 0)}</h3>
                   </div>
                   <div className="p-5 bg-primary-500 rounded-[2rem] shadow-[0_0_30px_rgba(249,115,22,0.4)] border border-white/20">
                      <Wallet size={32} className="text-white"/>
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* ALERT / CAUTION */}
       <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[3rem] border-2 border-amber-200 dark:border-amber-900/30 flex gap-6 shadow-sm animate-pop-in">
          <AlertCircle className="text-amber-500 flex-shrink-0" size={32}/>
          <div className="space-y-2">
             <p className="text-[0.8rem] font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">Final Data Validation Required</p>
             <p className="text-[0.7rem] font-medium text-amber-700/80 dark:text-amber-200/60 leading-relaxed uppercase tracking-wide">
                Lakukan Cross-Check final pada data hardware & identitas di atas. Kesalahan input pada <span className="text-amber-600 dark:text-amber-400 font-black">VIN / No. Mesin / Plat Nomor</span> dapat menghambat proses klaim otomatis di masa mendatang.
             </p>
          </div>
       </div>
    </div>
  );
};

export default StepPreSummary;