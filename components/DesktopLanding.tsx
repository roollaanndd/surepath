
// Added comment above fix
// Fix: Removed unused 'Card' from imports as it is not exported from './shared/UI'.
import { Section, Button, Badge } from './shared/UI';
import { SurePathLogo } from './Navbar';
import ProductModules from './landing/ProductModules';
// Added comment above fix
// Fix: Import Language enum to properly type the lang prop
import { Language } from '../types';
import { 
  ArrowRight, ShieldCheck, Zap, Smartphone, 
  Play, Users, Building2, 
  Car } from 'lucide-react';

const DistributionDiagram = () => (
  <div className="relative w-full h-[500px] flex items-center justify-center animate-fade-in">
    {/* Background Glows */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
    
    <svg className="w-full h-full relative z-10" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Connecting Lines with Flow Animation */}
      <path d="M200 200 L100 100" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-slate-200 dark:text-slate-800" />
      <path d="M200 200 L300 100" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-slate-200 dark:text-slate-800" />
      <path d="M200 200 L100 300" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-slate-200 dark:text-slate-800" />
      <path d="M200 200 L300 300" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-slate-200 dark:text-slate-800" />
      
      {/* Animated Flow Particles */}
      <circle r="4" fill="#10b981">
        <animateMotion path="M200 200 L100 100" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="4" fill="#10b981">
        <animateMotion path="M200 200 L300 100" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="4" fill="#10b981">
        <animateMotion path="M200 200 L100 300" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle r="4" fill="#10b981">
        <animateMotion path="M200 200 L300 300" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>

    {/* Center Node: SurePath Core */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
      <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl border-4 border-white dark:border-slate-800 animate-float">
        <SurePathLogo className="w-14 h-14" />
      </div>
      <div className="mt-4 text-center">
         <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm">Sistem Pusat</p>
      </div>
    </div>

    {/* Distribution Nodes */}
    {/* Agents */}
    <div className="absolute top-[10%] left-[15%] group">
       <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-blue-500 border border-slate-50 dark:border-white/5 transition-transform group-hover:scale-110">
          <Users size={28}/>
       </div>
       <p className="mt-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Jaringan Mitra</p>
    </div>

    {/* Direct Customer */}
    <div className="absolute top-[10%] right-[15%] group">
       <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-emerald-500 border border-slate-50 dark:border-white/5 transition-transform group-hover:scale-110">
          <Smartphone size={28}/>
       </div>
       <p className="mt-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Aplikasi Langsung</p>
    </div>

    {/* Corporate */}
    <div className="absolute bottom-[10%] left-[15%] group">
       <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-indigo-500 border border-slate-50 dark:border-white/5 transition-transform group-hover:scale-110">
          <Building2 size={28}/>
       </div>
       <p className="mt-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Bisnis & Kantor</p>
    </div>

    {/* Claims/Verification */}
    <div className="absolute bottom-[10%] right-[15%] group">
       <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-rose-500 border border-slate-50 dark:border-white/5 transition-transform group-hover:scale-110">
          <Zap size={28}/>
       </div>
       <p className="mt-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Audit Instan</p>
    </div>
  </div>
);

// Added comment above fix
// Fix: Changed lang type from string to Language to match ProductModules prop expectations
const DesktopLanding = ({ onStart, lang }: { onStart: () => void, lang: Language }) => {
  const t = (en: string, id: string) => lang === 'EN' ? en : id;

  return (
    <div className="bg-[#fafaf9]">
      {/* Hero Section */}
      <Section className="relative overflow-hidden min-h-[85vh] flex items-center pt-32">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 space-y-8 animate-fade-in">
            <Badge variant="brand">{t("Intelligent Distribution Infrastructure", "Infrastruktur Distribusi Pintar")}</Badge>
            <h1 className="text-6xl xl:text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter">
              {t("Insurance Distribution,", "Sistem Distribusi,")} <br/>
              <span className="text-emerald-500">{t("Simplified by AI.", "Dimudahkan oleh AI.")}</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl leading-relaxed">
              {t("We build the infrastructure for the next generation of insurance. Our system automates how protection reaches people, making it faster, cheaper, and more reliable for everyone.", 
                 "Kami membangun infrastruktur asuransi masa depan. Sistem kami bekerja otomatis untuk mempermudah asuransi sampai ke tangan Anda, lebih cepat, lebih hemat, dan lebih transparan.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="xl" variant="brand" onClick={onStart} icon={ArrowRight}>
                {t("Launch Dashboard", "Buka Dashboard")}
              </Button>
              <button className="flex items-center gap-4 px-8 py-4 font-bold text-slate-600 hover:text-emerald-600 transition-all group">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform border border-slate-50">
                  <Play fill="currentColor" size={18}/>
                </div>
                {t("See How it Works", "Cara Kerja")}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative hidden lg:block animate-pop-in">
             <DistributionDiagram />
          </div>
        </div>
      </Section>

      {/* NEW PRODUCT MODULES SECTION */}
      <ProductModules lang={lang} />

      {/* Value Pillars Section */}
      <Section className="bg-white">
         <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
               <Badge variant="info">{t("The SurePath Advantage", "Keunggulan SurePath")}</Badge>
               <h2 className="text-5xl font-black tracking-tighter leading-tight text-slate-900">
                 Teknologi yang <br/>
                 <span className="text-blue-500">Bekerja untuk Anda.</span>
               </h2>
               <div className="grid gap-10">
                  {[
                    { 
                      title: t("Automated Underwriting", "Persetujuan Otomatis"), 
                      icon: ShieldCheck, 
                      desc: t("Our system processes applications instantly without manual intervention, reducing costs and errors.", 
                              "Sistem kami memproses pendaftaran seketika tanpa campur tangan manual, mengurangi biaya dan kesalahan.") 
                    },
                    { 
                      title: t("Vision-Based Claims", "Audit Klaim Visual"), 
                      icon: Car, 
                      desc: t("Just take a photo of the damage. Our AI analyzes repair costs and verifies details in 60 seconds.", 
                              "Cukup ambil foto kerusakan. AI kami menganalisa biaya perbaikan dan memverifikasi data dalam 60 detik.") 
                    },
                    { 
                      title: t("Real-time Payouts", "Pembayaran Real-time"), 
                      icon: Zap, 
                      desc: t("Approved claims are settled directly to your account immediately via our smart financial ledger.", 
                              "Klaim yang disetujui dibayarkan langsung ke rekening Anda saat itu juga melalui sistem keuangan pintar kami.") 
                    }
                  ].map((f, i) => (
                    <div key={i} className="flex gap-8 items-start group">
                       <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner shrink-0">
                          <f.icon size={32}/>
                       </div>
                       <div>
                          <h4 className="text-xl font-black uppercase tracking-tight mb-2 text-slate-900">{f.title}</h4>
                          <p className="text-slate-500 text-base font-medium leading-relaxed">{f.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="relative">
               <div className="aspect-[4/5] bg-slate-900 rounded-[5rem] overflow-hidden shadow-2xl relative group">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop')] bg-cover opacity-60"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  <div className="absolute bottom-12 left-12 right-12 text-white space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Sistem Keamanan Aktif</span>
                     </div>
                     <h3 className="text-3xl font-black uppercase tracking-tighter">Seluruh Data Anda Terenkripsi & Aman</h3>
                     <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        Kami menggunakan standar keamanan tertinggi untuk memastikan setiap transaksi dan data nasabah terlindungi sepenuhnya.
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </Section>
      
      {/* Trust Footer */}
      <footer className="py-20 px-6 border-t border-slate-100 bg-white">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4">
               <SurePathLogo className="w-12 h-12" />
               <div className="flex flex-col">
                  <span className="text-3xl font-black tracking-tighter uppercase text-slate-900">Sure<span className="text-emerald-500">Path</span></span>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Distribusi Asuransi Masa Depan</span>
               </div>
            </div>
            <div className="flex flex-col md:items-end text-center md:text-right gap-3 opacity-60">
               <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-900">
                  <a href="#" className="hover:text-emerald-500 transition-colors">Tentang Kami</a>
                  <a href="#" className="hover:text-emerald-500 transition-colors">Kontak</a>
                  <a href="#" className="hover:text-emerald-500 transition-colors">Pusat Bantuan</a>
               </div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">© 2025 SurePath Insurtech. Bekerja sama dengan perusahaan asuransi berijin OJK.</p>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default DesktopLanding;
