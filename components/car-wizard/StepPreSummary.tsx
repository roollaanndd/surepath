
import React, { useState } from 'react';
import { 
  Car, Smartphone, Shield, 
  AlertCircle, Palette, User, 
  Wallet, Zap, Layers,
  CheckCircle2, Plus, Calendar, 
  BadgePercent, FileDown, Loader2
} from 'lucide-react';
import { formatIDR } from './WizardUI';
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
  vehicle, coverage, premiumBreakdown, stnkResult, kycData
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

  const InfoRow = ({ label, value, icon: Icon, color = "text-emerald-500", mono = false }: any) => (
    <div className="flex justify-between items-center py-3.5 border-b border-black/5 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={14} className={`${color} opacity-70`} />
        <span className="text-[0.65rem] font-bold uppercase text-gray-400 tracking-wider">{label}</span>
      </div>
      <span className={`text-[0.75rem] font-black uppercase text-slate-900 dark:text-gray-200 ${mono ? 'font-mono text-emerald-500' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const quoteNo = `QT-${Date.now().toString().slice(-6)}`;

      // --- Watermark ---
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(80);
      doc.setFont('helvetica', 'bold');
      // Rotate text for watermark
      doc.text("SUREPATH", pageWidth / 2, pageHeight / 2 + 20, { align: 'center', angle: 45 });

      // --- Header ---
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Accent line
      doc.setFillColor(0, 193, 106); 
      doc.rect(0, 45, pageWidth, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text("SUREPATH", 20, 22);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("SMART & FAST INSURANCE", 20, 32);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("PENAWARAN ASURANSI", pageWidth - 20, 22, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`No: ${quoteNo}`, pageWidth - 20, 32, { align: 'right' });
      doc.text(`Tanggal: ${date}`, pageWidth - 20, 38, { align: 'right' });

      let currentY = 60;

      // --- Helper for Section Titles ---
      const addSectionTitle = (title: string, y: number) => {
        doc.setFillColor(0, 193, 106); 
        doc.roundedRect(20, y - 4, 4, 14, 1, 1, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 28, y + 6);
        return y + 20;
      };

      // --- Section: Data Nasabah & Kendaraan (Two Columns) ---
      currentY = addSectionTitle("INFORMASI PERTANGGUNGAN", currentY);
      
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(20, currentY, pageWidth - 40, 45, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      
      // Col 1: Nasabah
      doc.text("Nama Tertanggung", 25, currentY + 10);
      doc.text("NIK", 25, currentY + 20);
      doc.text("Email", 25, currentY + 30);
      
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(kycData?.name || '-', 65, currentY + 10);
      doc.text(kycData?.ktp || '-', 65, currentY + 20);
      doc.text(kycData?.email || '-', 65, currentY + 30);

      // Col 2: Kendaraan
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text("Kendaraan", pageWidth / 2 + 5, currentY + 10);
      doc.text("Tahun / Warna", pageWidth / 2 + 5, currentY + 20);
      doc.text("Plat Nomor", pageWidth / 2 + 5, currentY + 30);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`${vehicle.brand} ${vehicle.model}`, pageWidth / 2 + 40, currentY + 10);
      doc.text(`${vehicle.year} / ${stnkResult?.color || '-'}`, pageWidth / 2 + 40, currentY + 20);
      doc.text(vehicle.plate, pageWidth / 2 + 40, currentY + 30);

      currentY += 60;

      // --- Section: Rincian Pertanggungan ---
      currentY = addSectionTitle("PAKET & MANFAAT", currentY);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, currentY, pageWidth - 40, 35, 3, 3, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text("Tipe Asuransi", 25, currentY + 10);
      doc.text("Perluasan", 25, currentY + 20);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(coverage.type === 'COMPREHENSIVE' ? 'All Risk (Komprehensif)' : 'TLO (Total Loss Only)', 65, currentY + 10);
      
      let expansionText = activeExpansions.map(e => e.label).join(", ");
      if (coverage.tpl > 0) expansionText += expansionText ? `, TPL ${formatIDR(coverage.tpl)}` : `TPL ${formatIDR(coverage.tpl)}`;
      
      doc.setFont('helvetica', 'normal');
      doc.text(expansionText || "Tidak ada perluasan tambahan", 65, currentY + 20, { maxWidth: pageWidth - 90 });

      currentY += 50;

      // --- Section: Ikhtisar Biaya ---
      currentY = addSectionTitle("IKHTISAR BIAYA", currentY);

      // Table Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(20, currentY, pageWidth - 40, 10, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("DESKRIPSI", 25, currentY + 7);
      doc.text("JUMLAH", pageWidth - 25, currentY + 7, { align: 'right' });
      
      currentY += 15;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      const addCostRow = (desc: string, amount: number, isDiscount = false) => {
        doc.text(desc, 25, currentY);
        if (isDiscount) {
          doc.setTextColor(16, 185, 129); // emerald-500
          doc.text(`-${formatIDR(amount)}`, pageWidth - 25, currentY, { align: 'right' });
          doc.setTextColor(15, 23, 42);
        } else {
          doc.text(formatIDR(amount), pageWidth - 25, currentY, { align: 'right' });
        }
        currentY += 8;
      };

      addCostRow("Premi Dasar", premiumBreakdown?.basicPremium || 0);
      
      const addOnVal = (premiumBreakdown?.totalPayable || 0) - (premiumBreakdown?.basicPremium || 0) + (premiumBreakdown?.discountAmount || 0) - (premiumBreakdown?.adminFee || 0) - (premiumBreakdown?.stampDuty || 0);
      if (addOnVal > 0) {
        addCostRow("Premi Perluasan (Add-ons)", addOnVal);
      }

      addCostRow("Biaya Administrasi & Polis", premiumBreakdown?.adminFee || 0);
      addCostRow("Biaya Materai", premiumBreakdown?.stampDuty || 0);
      addCostRow("Biaya Aplikasi", premiumBreakdown?.applicationFee || 5000);

      if (premiumBreakdown?.discountAmount > 0) {
        addCostRow(`Diskon Spesial (${premiumBreakdown.discountPercent}%)`, premiumBreakdown.discountAmount, true);
      }

      currentY += 5;
      doc.setDrawColor(226, 232, 240);
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 10;

      // Total
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("TOTAL PREMI", 25, currentY);
      doc.setTextColor(0, 193, 106); 
      doc.setFontSize(14);
      doc.text(formatIDR(premiumBreakdown?.totalPayable || 0), pageWidth - 25, currentY, { align: 'right' });

      // --- Footer ---
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text("Dokumen ini diterbitkan secara otomatis oleh sistem SurePath dan sah tanpa tanda tangan basah.", pageWidth / 2, pageHeight - 18, { align: 'center' });
      doc.text("PT SurePath Asuransi Digital terdaftar dan diawasi oleh Otoritas Jasa Keuangan (OJK).", pageWidth / 2, pageHeight - 12, { align: 'center' });

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
            <h2 className="text-2xl font-black uppercase tracking-tighter">Cek <span className="text-emerald-500">Pesananmu</span></h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Pastikan data sudah sesuai sebelum kita lanjut.</p>
          </div>
          
          <button 
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-black/5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50"
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
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                <Shield size={20}/>
             </div>
             <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">Paket Proteksi</h4>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <div>
                   <p className="text-[0.5rem] font-black uppercase text-emerald-500">Tipe Asuransi</p>
                   <p className="text-base font-black text-emerald-600 dark:text-emerald-400 uppercase">{coverage.type === 'COMPREHENSIVE' ? 'All Risk (Lengkap)' : 'TLO (Hanya Kehilangan)'}</p>
                </div>
                <Zap size={20} className="text-emerald-500"/>
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
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500"></div>
          
          <div className="flex justify-between items-start mb-10">
             <div>
                <p className="text-[0.6rem] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                <h4 className="text-2xl font-black uppercase tracking-tighter">Rincian Premi</h4>
             </div>
             <div className="p-3 bg-white/10 rounded-xl">
                <Wallet size={20} className="text-emerald-400"/>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center text-xs font-bold opacity-70">
                <span>Harga Dasar Polis</span>
                <span className="font-mono">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
             </div>
             
             {(premiumBreakdown?.expansions.length > 0 || premiumBreakdown?.tplPremium > 0) && (
                <div className="space-y-2.5 pb-4 border-b border-white/10">
                   <p className="text-[0.5rem] font-black uppercase text-emerald-500 tracking-widest">Tambahan Proteksi</p>
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
                         <p className="text-[0.5rem] font-bold text-emerald-500/60 uppercase">Potongan Komisi Mitra {premiumBreakdown.discountPercent}%</p>
                      </div>
                   </div>
                   <span className="font-mono text-emerald-400 text-lg font-black">-{formatIDR(premiumBreakdown.discountAmount)}</span>
                </div>
             )}

             <div className="pt-6 border-t border-white/20">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[0.7rem] font-black uppercase text-emerald-500 mb-1">Total Bayar</p>
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
                Butuh penawaran saja? Ketuk <span className="font-black">Unduh Penawaran</span> di atas — tanpa survei foto.
                Untuk <span className="font-black">lanjut beli & terbitkan polis</span>, kita lakukan audit visual singkat dengan AI untuk memastikan kondisi mobilmu.
             </p>
          </div>
       </div>
    </div>
  );
};

export default StepPreSummary;
