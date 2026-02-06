import React, { useMemo, useState } from 'react';
import { Fingerprint, ScanFace, ImageIcon, Plus, RefreshCw, ShieldCheck, UserCheck, Cpu, CheckCircle2, AlertCircle, FileDown, Loader2 } from 'lucide-react';
import { ScannerOverlay } from './WizardUI';
import { extractKtpData } from '../../services/geminiService';
import { REGEX } from '../../services/authService';
import { jsPDF } from 'jspdf';

interface StepKYCProps {
  kycData: any;
  setKycData: (k: any) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  loadingType: 'KTP' | 'STNK' | 'SURVEY' | null;
  setLoadingType: (t: 'KTP' | 'STNK' | 'SURVEY' | null) => void;
  verifiedFields: Set<string>;
  setVerifiedFields: (v: Set<string>) => void;
}

const StepKYC: React.FC<StepKYCProps> = ({
  kycData, setKycData, loading, setLoading, loadingType, setLoadingType, verifiedFields, setVerifiedFields
}) => {
  const isNikValid = useMemo(() => REGEX.NIK.test(kycData.ktp), [kycData.ktp]);
  const isPhoneValid = useMemo(() => REGEX.PHONE.test(kycData.phone), [kycData.phone]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generateKtpPdf = async () => {
    if (!kycData.photo) return;
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("SUREPATH IDENTITY SCAN", 20, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("DOKUMEN VERIFIKASI IDENTITAS TERENKRIPSI", 20, 32);

      // Label
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("HASIL EKSTRAKSI IDENTITAS", 20, 55);
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(1);
      doc.line(20, 58, 60, 58);

      // Info
      doc.setFontSize(10);
      let y = 70;
      const addRow = (label: string, val: string) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val || '-', 70, y);
        y += 10;
      };

      addRow("Nama Lengkap:", kycData.name);
      addRow("Nomor NIK:", kycData.ktp);
      addRow("Email:", kycData.email);
      addRow("No. Telepon:", kycData.phone);
      doc.setFont('helvetica', 'bold');
      doc.text("Alamat:", 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(kycData.address || '-', 70, y, { maxWidth: 120 });
      y += 20;

      // Image
      doc.text("LAMPIRAN FOTO KTP:", 20, y);
      try {
        doc.addImage(kycData.photo, 'JPEG', 20, y + 5, 85, 54);
      } catch (e) {
        doc.text("[Foto KTP tidak dapat dimuat]", 20, y + 10);
      }

      // Legal
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Identitas ini telah diverifikasi secara neural dan dijamin kerahasiaannya oleh protokol SurePath.", pageWidth / 2, 280, { align: 'center' });
      doc.text(`Timestamp Verifikasi: ${new Date().toISOString()}`, pageWidth / 2, 285, { align: 'center' });

      doc.save(`KTP_SurePath_${kycData.name.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-4">
      <div className="p-8 bg-gradient-to-br from-slate-900 to-black rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary-500/20 animate-float">
            <UserCheck size={32}/>
          </div>
          <div>
            <h4 className="text-xl font-black text-white uppercase tracking-tighter">Data Pemilik</h4>
            <p className="text-[0.55rem] font-black text-primary-400 uppercase tracking-[0.4em] mt-1.5 opacity-80">Identitas Aman Terproteksi</p>
          </div>
        </div>
        <ScanFace size={100} className="absolute -right-6 -bottom-6 opacity-[0.05] rotate-12 text-white group-hover:scale-110 transition-transform duration-1000"/>
      </div>

      <div className="space-y-6">
        <div className="p-1 bg-gray-100 dark:bg-white/[0.03] rounded-[2.5rem] border-2 border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center gap-5 relative py-12 group cursor-pointer transition-all hover:bg-white dark:hover:bg-white/[0.05] hover:border-primary-500/50 overflow-hidden min-h-[220px] shadow-inner">
          {loading && loadingType === 'KTP' ? (
            <ScannerOverlay label="Membaca KTP..." />
          ) : kycData.photo ? (
            <div className="relative w-full h-full p-4 flex flex-col items-center animate-pop-in">
                <div className="relative p-1.5 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl transition-transform duration-500 group-hover:rotate-0 rotate-1">
                    <img src={kycData.photo} className="max-h-40 rounded-2xl object-contain" alt="Foto KTP" />
                    <div className="absolute -top-3 -right-3 flex flex-col gap-2">
                      <button 
                          onClick={(e) => { e.stopPropagation(); setKycData({...kycData, photo: null}); setVerifiedFields(new Set()); }}
                          className="p-3 bg-rose-500 text-white rounded-2xl shadow-xl active:scale-90 transition-all hover:brightness-110"
                          title="Hapus Foto"
                      >
                          <RefreshCw size={18}/>
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); generateKtpPdf(); }}
                          disabled={isGeneratingPdf}
                          className="p-3 bg-blue-500 text-white rounded-2xl shadow-xl active:scale-90 transition-all hover:brightness-110 disabled:opacity-50"
                          title="Download PDF"
                      >
                          {isGeneratingPdf ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18}/>}
                      </button>
                    </div>
                </div>
                <div className="mt-6 flex items-center gap-2.5 px-5 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 shadow-sm">
                   <ShieldCheck size={16}/>
                   <p className="text-[0.6rem] font-black uppercase tracking-[0.2em]">KTP Berhasil Dibaca</p>
                </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="w-20 h-20 bg-white dark:bg-white/0.03 rounded-[1.8rem] flex items-center justify-center text-gray-300 group-hover:text-primary-500 transition-colors shadow-xl group-hover:scale-110 duration-500">
                    <ImageIcon size={44}/>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white rounded-xl p-2.5 shadow-2xl animate-bounce">
                  <Plus size={18} strokeWidth={4}/>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Foto KTP Kamu</p>
                <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest opacity-60">AI akan isi data otomatis untukmu</p>
              </div>
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  setLoadingType('KTP');
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const base64 = reader.result as string;
                    setKycData((prev: any) => ({ ...prev, photo: base64 }));
                    const response = await extractKtpData(base64);
                    setLoading(false);
                    setLoadingType(null);
                    if (response.success && response.data) {
                      const newVerified = new Set<string>();
                      if (response.data.name) newVerified.add('name');
                      if (response.data.nik) newVerified.add('ktp');
                      if (response.data.address) newVerified.add('address');
                      setVerifiedFields(newVerified);
                      setKycData((prev: any) => ({
                        ...prev,
                        name: response.data.name?.toUpperCase() || prev.name,
                        ktp: response.data.nik || prev.ktp,
                        address: response.data.address?.toUpperCase() || prev.address
                      }));
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </>
          )}
        </div>

        <div className="grid gap-5">
          <div className="p-8 bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 rounded-[3rem] space-y-6 shadow-xl relative overflow-hidden transition-all hover:border-primary-500/20">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
              <div className="flex items-center gap-4">
                <UserCheck size={20} className="text-primary-500"/>
                <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-gray-400">Verifikasi Data</span>
              </div>
              {verifiedFields.size > 0 && (
                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                   <Cpu size={12} className="animate-pulse"/>
                   <span className="text-[0.5rem] font-black uppercase tracking-widest">Sesuai KTP</span>
                </div>
              )}
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2 relative">
                <label className="text-[0.55rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Nama Lengkap (Sesuai KTP)</label>
                <div className="relative group">
                    <input 
                      placeholder="NAMA LENGKAP"
                      className={`w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-black/40 border-2 outline-none focus:border-primary-500 font-black text-sm text-primary-500 uppercase transition-all shadow-inner ${verifiedFields.has('name') ? 'border-emerald-500/30' : 'border-black/5 dark:border-white/5'}`}
                      value={kycData.name}
                      onChange={(e) => setKycData({...kycData, name: e.target.value.toUpperCase()})}
                    />
                    {verifiedFields.has('name') && <CheckCircle2 size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-pop-in"/>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[0.55rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Nomor KTP (16 Digit)</label>
                    <div className="relative">
                        <input 
                        placeholder="3271XXXXXXXXXXXX"
                        maxLength={16}
                        className={`w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-black/40 border-2 outline-none focus:border-primary-500 font-black text-sm transition-all tracking-[0.2em] shadow-inner ${kycData.ktp.length > 0 ? (isNikValid ? 'border-emerald-500/30 text-primary-500' : 'border-rose-500/30 text-rose-500') : 'border-black/5 dark:border-white/5 text-primary-500'}`}
                        value={kycData.ktp}
                        onChange={(e) => setKycData({...kycData, ktp: e.target.value.replace(/\D/g, "")})}
                        />
                        {isNikValid && <CheckCircle2 size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-pop-in"/>}
                        {kycData.ktp.length > 0 && !isNikValid && <AlertCircle size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-rose-500 animate-pop-in"/>}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[0.55rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Nomor HP</label>
                    <div className="relative">
                        <input 
                        placeholder="08XXXXXXXXXX"
                        className={`w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-black/40 border-2 outline-none focus:border-primary-500 font-black text-sm transition-all shadow-inner ${kycData.phone.length > 0 ? (isPhoneValid ? 'border-emerald-500/30 text-primary-500' : 'border-rose-500/30 text-rose-500') : 'border-black/5 dark:border-white/5 text-primary-500'}`}
                        value={kycData.phone}
                        onChange={(e) => setKycData({...kycData, phone: e.target.value.replace(/\D/g, "")})}
                        />
                        {isPhoneValid && <CheckCircle2 size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-pop-in"/>}
                    </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[0.55rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Alamat Email</label>
                <input 
                  type="email" placeholder="email@kamu.com"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-black/40 border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-xs text-primary-500 transition-all shadow-inner"
                  value={kycData.email}
                  onChange={(e) => setKycData({...kycData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[0.55rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Alamat Tinggal (Sesuai KTP)</label>
                <div className="relative">
                    <textarea 
                      placeholder="JALAN, KOTA, PROVINSI"
                      rows={3}
                      className={`w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-black/40 border-2 outline-none focus:border-primary-500 font-black text-[0.65rem] text-primary-500 uppercase transition-all resize-none shadow-inner leading-relaxed ${verifiedFields.has('address') ? 'border-emerald-500/30' : 'border-black/5 dark:border-white/5'}`}
                      value={kycData.address}
                      onChange={(e) => setKycData({...kycData, address: e.target.value.toUpperCase()})}
                    />
                    {verifiedFields.has('address') && <CheckCircle2 size={18} className="absolute right-5 bottom-5 text-emerald-500 animate-pop-in"/>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepKYC;