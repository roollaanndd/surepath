
import React, { useState } from 'react';
import { 
  ShieldCheck, Car, Smartphone, Shield, 
  AlertCircle, Hash, Palette, User, FileText, 
  Scale, Building2, Wallet, Zap, Layers,
  CheckCircle2, Plus, Package, Calendar, Users,
  BadgePercent, ArrowDown, FileDown, Loader2
} from 'lucide-react';
import { formatIDR, Badge } from './WizardUI';
import { jsPDF } from 'jspdf';

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filter proteksi tambahan yang aktif
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
        <span className="text-[0.65rem] font-bold uppercase text-gray-400 tracking-wider">{label}</span>
      </div>
      <span className={`text-[0.75rem] font-black uppercase text-slate-900 dark:text-gray-200 ${mono ? 'font-mono text-primary-500' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const date = new Date().toLocaleDateString('id-ID');
      const quoteNo = `QT-${Date.now().toString().slice(-6)}`;

      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text("SUREPATH", 20, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("ASURANSI PINTAR & CEPAT", 20, 28);
      
      doc.text(`Tanggal: ${date}`, pageWidth - 20, 20, { align: 'right' });
      doc.text(`No. Penawaran: ${quoteNo}`, pageWidth - 20, 28, { align: 'right' });

      // Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text("PENAWARAN ASURANSI KENDARAAN", 20, 55);
      doc.setDrawColor(249, 115, 22); // primary-500
      doc.setLineWidth(1);
      doc.line(20, 58, 60, 58);

      // Section: Data Nasabah
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("DATA NASABAH", 20, 75);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nama Tertanggung: ${kycData?.name || '-'}`, 25, 85);
      doc.text(`NIK: ${kycData?.ktp || '-'}`, 25, 92);
      doc.text(`Email: ${kycData?.email || '-'}`, 25, 99);

      // Section: Data Kendaraan
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("DATA KENDARAAN", 20, 115);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Merk & Model: ${vehicle.brand} ${vehicle.model}`, 25, 125);
      doc.text(`Tahun: ${vehicle.year}`, 25, 132);
      doc.text(`Nomor Polisi: ${vehicle.plate}`, 25, 139);
      doc.text(`Warna: ${stnkResult?.color || '-'}`, 25, 146);

      // Section: Rincian Pertanggungan
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("RINCIAN PERTANGGUNGAN", 20, 162);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Tipe Paket: ${coverage.type === 'COMPREHENSIVE' ? 'All Risk (Lengkap)' : 'TLO (Kehilangan)'}`, 25, 172);
      
      let expansionText = activeExpansions.map(e => e.label).join(", ");
      if (coverage.tpl > 0) expansionText += `, TPL ${formatIDR(coverage.tpl)}`;
      doc.text("Manfaat Tambahan:", 25, 179);
      doc.setFontSize(9);
      doc.text(expansionText || "Tidak ada tambahan", 30, 186, { maxWidth: 160 });

      // Section: Biaya
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("IKHTISAR BIAYA", 20, 205);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text("Premi Dasar", 25, 215);
      doc.text(formatIDR(premiumBreakdown?.basicPremium || 0), pageWidth - 20, 215, { align: 'right' });
      
      doc.text("Proteksi Tambahan", 25, 222);
      const addOnVal = (premiumBreakdown?.totalPayable || 0) - (premiumBreakdown?.basicPremium || 0) + (premiumBreakdown?.discountAmount || 0) - (premiumBreakdown?.adminFee || 0) - (premiumBreakdown?.stampDuty || 0);
      doc.text(formatIDR(addOnVal), pageWidth - 20, 222, { align: 'right' });

      doc.text("Biaya Admin & Materai", 25, 229);
      doc.text(formatIDR((premiumBreakdown?.adminFee || 0) + (premiumBreakdown?.stampDuty || 0)), pageWidth - 20, 229, { align: 'right' });

      if (premiumBreakdown?.discountAmount > 0) {
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text(`Potongan Komisi (${premiumBreakdown.discountPercent}%)`, 25, 236);
        doc.text(`-${formatIDR(premiumBreakdown.discountAmount)}`, pageWidth - 20, 236, { align: 'right' });
      }

      // Total
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 242, pageWidth - 20, 242);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("TOTAL PREMI BERSIH", 20, 252);
      doc.setTextColor(249, 115, 22);
      doc.text(formatIDR(premiumBreakdown?.totalPayable || 0), pageWidth - 20, 252, { align: 'right' });

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text("Diterbitkan secara digital oleh SurePath Engine.", pageWidth / 2, 275, { align: 'center' });
      doc.text("Terdaftar dan diawasi oleh OJK.", pageWidth / 2, 280, { align: 'center' });

      doc.save(`SurePath_Penawaran_${vehicle.plate.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Gagal menyimpan PDF. Silakan coba lagi.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
       <div className="px-2 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Cek <span className="text-primary-500">Pesananmu</span></h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Pastikan data sudah sesuai sebelum kita lanjut.</p>
          </div>
          
          <button 
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-black/5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest hover:bg-primary-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14}/>}
            {isGeneratingPdf ? 'Memproses...' : 'Simpan PDF'}
          </button>
       </div>

       {/* KELOMPOK 1: DATA MOBIL */}
       <div className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 shadow-inner">
                <Car size={20}/>
             </div>
             <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">Data Mobil</h4>
          </div>

          <div className="space-y-0 relative z-10">
             <InfoRow label="Merk & Tipe" value={`${vehicle.brand} ${vehicle.model}`} icon={Layers} color="text-blue-500" />
             <InfoRow label="Tahun" value={vehicle.year} icon={Calendar} color="text-blue-500" />
             <InfoRow label="Plat Nomor" value={vehicle.plate} icon={Smartphone} color="text-blue-500" mono />
             <InfoRow label="Warna (STNK)" value={stnkResult?.color || 'Sesuai STNK'} icon={Palette} color="text-blue-500" />
          </div>
       </div>

       {/* KELOMPOK 2: DATA PEMILIK */}
       <div className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                <User size={20}/>
             </div>
             <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">Data Pemilik</h4>
          </div>
          
          <div className="space-y-4 relative z-10">
             <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-black/5">
                <p className="text-[0.5rem] font-black uppercase text-gray-400 mb-1">Nama di KTP</p>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{kycData?.name || '-'}</p>
             </div>
             <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-black/5">
                <p className="text-[0.5rem] font-black uppercase text-gray-400 mb-1">Nama di STNK</p>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{stnkResult?.ownerName || '-'}</p>
             </div>
          </div>
       </div>

       {/* KELOMPOK 3: PILIHAN PROTEKSI */}
       <div className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 shadow-inner">
                <Shield size={20}/>
             </div>
             <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">Paket Proteksi</h4>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
                <div>
                   <p className="text-[0.5rem] font-black uppercase text-primary-500">Tipe Asuransi</p>
                   <p className="text-base font-black text-primary-600 dark:text-primary-400 uppercase">{coverage.type === 'COMPREHENSIVE' ? 'All Risk (Lengkap)' : 'TLO (Hanya Kehilangan)'}</p>
                </div>
                <Zap size={20} className="text-primary-500"/>
             </div>

             <div className="space-y-2">
                <p className="text-[0.55rem] font-black uppercase text-gray-400 ml-1">Manfaat Tambahan</p>
                <div className="flex flex-wrap gap-2">
                   {activeExpansions.map(e => (
                     <div key={e.id} className="px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full border border-black/5 flex items-center gap-2">
                        <CheckCircle2 size={10} className="text-emerald-500"/>
                        <span className="text-[0.55rem] font-bold uppercase text-gray-600 dark:text-gray-300">{e.label}</span>
                     </div>
                   ))}
                   
                   {coverage.tpl > 0 && (
                     <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 flex items-center gap-2">
                        <Plus size={10} className="text-blue-500"/>
                        <span className="text-[0.55rem] font-bold uppercase text-blue-600 dark:text-blue-400">TPL {coverage.tpl/1000000}jt</span>
                     </div>
                   )}

                   {activeExpansions.length === 0 && coverage.tpl === 0 && (
                     <p className="text-[0.6rem] font-medium text-gray-400 italic">Tidak ada tambahan dipilih.</p>
                   )}
                </div>
             </div>
          </div>
       </div>

       {/* KELOMPOK 4: RINCIAN BIAYA */}
       <div className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-emerald-500 to-primary-500"></div>
          
          <div className="flex justify-between items-start mb-10">
             <div>
                <p className="text-[0.6rem] font-black text-primary-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                <h4 className="text-2xl font-black uppercase tracking-tighter">Rincian Premi</h4>
             </div>
             <div className="p-3 bg-white/10 rounded-xl">
                <Wallet size={20} className="text-primary-400"/>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center text-xs font-bold opacity-70">
                <span>Harga Dasar Polis</span>
                <span className="font-mono">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
             </div>
             
             {(premiumBreakdown?.expansions.length > 0 || premiumBreakdown?.tplPremium > 0) && (
                <div className="space-y-2.5 pb-4 border-b border-white/10">
                   <p className="text-[0.5rem] font-black uppercase text-primary-500 tracking-widest">Tambahan Proteksi</p>
                   {premiumBreakdown.expansions.map((exp: any, i: number) => (
                      <div key={i} className="flex justify-between text-[0.65rem] opacity-60">
                         <span>• {exp.name}</span>
                         <span className="font-mono">{formatIDR(exp.val)}</span>
                      </div>
                   ))}
                   {premiumBreakdown?.tplPremium > 0 && (
                      <div className="flex justify-between text-[0.65rem] opacity-60">
                         <span>• Tanggung Jawab Pihak Ke-3</span>
                         <span className="font-mono">{formatIDR(premiumBreakdown.tplPremium)}</span>
                      </div>
                   )}
                </div>
             )}

             <div className="flex justify-between text-xs font-bold opacity-70">
                <span>Biaya Admin & Materai</span>
                <span className="font-mono">{formatIDR((premiumBreakdown?.adminFee || 0) + (premiumBreakdown?.stampDuty || 0))}</span>
             </div>

             {/* PERHITUNGAN DISKON */}
             {premiumBreakdown?.discountAmount > 0 && (
                <div className="flex justify-between items-center p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 my-4 animate-pop-in">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                         <BadgePercent size={18} className="text-white"/>
                      </div>
                      <div>
                         <span className="text-[0.65rem] font-black uppercase text-emerald-400">Hemat Kamu</span>
                         <p className="text-[0.5rem] font-bold text-emerald-500/60 uppercase">Potongan Komisi Agen {premiumBreakdown.discountPercent}%</p>
                      </div>
                   </div>
                   <span className="font-mono text-emerald-400 text-lg font-black">-{formatIDR(premiumBreakdown.discountAmount)}</span>
                </div>
             )}

             <div className="pt-6 border-t border-white/20">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[0.7rem] font-black uppercase text-primary-500 mb-1">Total Bayar</p>
                      <h3 className="text-4xl font-black tracking-tighter leading-none text-glow-primary">{formatIDR(premiumBreakdown?.totalPayable || 0)}</h3>
                   </div>
                   <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[0.45rem] font-black uppercase text-white/60">
                      <Shield size={10}/> Aman
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* PERINGATAN RAMAH */}
       <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-[2rem] border border-amber-100 flex gap-4 shadow-sm">
          <AlertCircle size={24} className="text-amber-500 flex-shrink-0"/>
          <div className="space-y-1">
             <p className="text-[0.65rem] font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">Sedikit Lagi!</p>
             <p className="text-[0.6rem] font-medium text-amber-700/80 dark:text-amber-200/60 leading-relaxed uppercase">
                Pastikan <span className="font-black">Plat Nomor & NIK</span> sudah benar ya. Setelah ini kita akan melakukan audit visual singkat dengan AI untuk memastikan kondisi mobilmu.
             </p>
          </div>
       </div>
    </div>
  );
};

export default StepPreSummary;
