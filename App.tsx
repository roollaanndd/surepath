
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { Language, CarModelData, InsuranceType, Quote, VehicleState, UserState } from './types';
import { CAR_DATABASE, getOJKRate, LOCATIONS, EXPANSION_RATES, TPL_OPTIONS } from './constants';
import { analyzeVehiclePhoto } from './services/geminiService';
import { Camera, Upload, Check, Shield, Zap, Truck, Anchor, Home, Car, Heart, Briefcase, ChevronRight, Search, MapPin, ChevronLeft, CreditCard, Info, AlertCircle, Smartphone, Bell, User, Wallet, Navigation, XCircle, RefreshCw, AlertTriangle, X, FileText, PenTool, Star, Mail, CheckCircle2 } from 'lucide-react';

function App() {
  // Changed default to Language.ID as requested
  const [lang, setLang] = useState<Language>(Language.ID);
  const [darkMode, setDarkMode] = useState(true);
  const [currentPage, setPage] = useState('home');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <HomePage setPage={setPage} lang={lang} />;
      case 'products': return <ProductsPage setPage={setPage} lang={lang} />;
      case 'car-flow': return <CarInsuranceWizard lang={lang} setPage={setPage} />;
      case 'claim': return <ClaimWithAI lang={lang} />;
      case 'about': return <AboutPage lang={lang} />;
      case 'console': return <ConsolePage lang={lang} />;
      default: return <HomePage setPage={setPage} lang={lang} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-500 selection:bg-primary-500 selection:text-white">
      <Navbar 
        lang={lang} 
        setLang={setLang} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        currentPage={currentPage}
        setPage={setPage}
      />
      <main className="flex-grow relative">
        {renderContent()}
      </main>
      {currentPage === 'home' && (
        <footer className="bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Surepath</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-500 text-sm">© 2025 Surepath Insurtech.</p>
              <p className="text-xs text-gray-400 mt-1">Licensed & Supervised by OJK.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

const HomePage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => (
  <div className="space-y-32 pb-24">
    {/* Hero Section */}
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-gradient-to-b from-primary-500/20 via-accent-500/10 to-transparent rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-t from-primary-600/10 via-transparent to-transparent rounded-full blur-[100px]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-xl shadow-sm mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              {lang === Language.EN ? 'The Future of Insurance' : 'Masa Depan Asuransi'}
            </span>
          </div>
          
          <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-8 leading-[0.9] animate-fade-in-up delay-100">
            <span className="block text-gray-900 dark:text-white">Sure<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500">path</span>.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto font-light animate-fade-in-up delay-200">
            {lang === Language.EN 
              ? 'Seamless protection for your life, vehicle, and business. Powered by AI for instant claims and personalized rates.'
              : 'Perlindungan tanpa batas untuk hidup, kendaraan, dan bisnis Anda. Didukung AI untuk klaim instan dan tarif personal.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full justify-center animate-fade-in-up delay-300">
            <button onClick={() => setPage('car-flow')} className="group relative bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-full font-bold text-lg shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all hover:scale-105 overflow-hidden">
              <span className="relative flex items-center gap-2 z-10">
                {lang === Language.EN ? 'Get Protected' : 'Mulai Proteksi'} <ChevronRight size={20} />
              </span>
            </button>
            <button onClick={() => setPage('claim')} className="bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-300 dark:border-white/20 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
              <Camera size={20} />
              {lang === Language.EN ? 'AI Claim' : 'Klaim AI'}
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* SuperApp Mockup Section */}
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-gray-900 dark:bg-[#0A0A0A] rounded-[3rem] overflow-hidden relative border border-gray-800">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-primary-500/20 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-accent-500/20 blur-[150px] rounded-full"></div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center p-12 md:p-24">
            <div>
              <div className="inline-block px-4 py-1 rounded-full border border-accent-500/30 text-accent-400 text-sm font-bold mb-6 uppercase tracking-wider">Coming Soon</div>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">{lang === Language.EN ? 'One App. Total Control.' : 'Satu Aplikasi. Kendali Penuh.'}</h2>
              <p className="text-xl text-gray-400 mb-10 font-light leading-relaxed">
                {lang === Language.EN 
                  ? 'Manage all your policies, file claims instantly, and track your coverage in real-time. The Surepath SuperApp is redefining insurance accessibility.'
                  : 'Kelola semua polis, ajukan klaim instan, dan pantau perlindungan secara real-time. Surepath SuperApp mendefinisikan ulang akses asuransi.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="email" 
                  placeholder={lang === Language.EN ? "Enter your email address" : "Masukan alamat email anda"}
                  className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 outline-none focus:border-primary-500 focus:bg-white/10 transition-all min-w-[300px]"
                />
                <button className="bg-primary-500 hover:bg-primary-400 text-gray-900 font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20">
                  {lang === Language.EN ? 'Join Waiting List' : 'Gabung Waiting List'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-4 ml-2">{lang === Language.EN ? 'Early access members get 10% off first year premium.' : 'Dapatkan diskon 10% premi tahun pertama untuk akses awal.'}</p>
            </div>

            {/* Phone Mockup */}
            <div className="relative flex justify-center lg:justify-end">
              {/* Phone Frame */}
              <div className="relative w-[320px] h-[650px] bg-gray-900 rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden animate-float">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-800 rounded-b-2xl z-50"></div>
                
                {/* Screen Content */}
                <div className="w-full h-full bg-dark-bg text-white pt-10 px-6 relative">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                        <User size={16} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Welcome back,</p>
                        <p className="text-sm font-bold">Alex Doe</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center relative">
                      <Bell size={16} className="text-gray-400" />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* Balance Card */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 mb-6 shadow-lg shadow-primary-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                    <p className="text-xs text-primary-200 mb-1">Total Coverage Value</p>
                    <h3 className="text-2xl font-bold mb-4">Rp 1.250.000.000</h3>
                    <div className="flex gap-3">
                      <button className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                        <Wallet size={12} /> Add Policy
                      </button>
                      <button className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium">
                        Details
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { i: <Car size={20} />, l: 'Car' },
                      { i: <Heart size={20} />, l: 'Health' },
                      { i: <Navigation size={20} />, l: 'Travel' },
                      { i: <Camera size={20} />, l: 'Claim' }
                    ].map((a, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center text-primary-400 hover:bg-gray-700 transition-colors cursor-pointer">
                          {a.i}
                        </div>
                        <span className="text-[10px] text-gray-400">{a.l}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h4 className="text-sm font-bold mb-4">Active Policies</h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                          <Car size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">Toyota Fortuner</p>
                          <p className="text-[10px] text-gray-500">Expires in 240 days</p>
                        </div>
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-md">Active</span>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400">
                          <Navigation size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">Japan Trip</p>
                          <p className="text-[10px] text-gray-500">Ends 12 Oct 2025</p>
                        </div>
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-md">Active</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom Bar Mock */}
                  <div className="absolute bottom-0 left-0 w-full h-16 bg-gray-900/90 backdrop-blur-md border-t border-white/5 flex justify-around items-center px-6">
                    <Home size={20} className="text-primary-500" />
                    <Search size={20} className="text-gray-600" />
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center -mt-6 border-4 border-gray-900">
                      <Camera size={20} className="text-white" />
                    </div>
                    <Wallet size={20} className="text-gray-600" />
                    <User size={20} className="text-gray-600" />
                  </div>
                </div>
              </div>
              
              {/* Floating Elements around phone */}
              <div className="absolute top-20 -left-12 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-xl animate-pulse-slow">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                    <Check size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Claim Approved</p>
                    <p className="text-[10px] text-gray-400">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features Grid */}
    <section className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Zap, title: lang === Language.EN ? 'Instant Quote' : 'Penawaran Kilat', desc: lang === Language.EN ? 'Get OJK-approved rates in seconds.' : 'Dapatkan tarif resmi OJK dalam hitungan detik.' },
          { icon: Shield, title: lang === Language.EN ? 'Secure & Reliable' : 'Aman & Terpercaya', desc: lang === Language.EN ? 'Backed by top-tier insurers.' : 'Didukung oleh perusahaan asuransi ternama.' },
          { icon: Smartphone, title: lang === Language.EN ? 'Digital First' : 'Serba Digital', desc: lang === Language.EN ? '100% paperless experience.' : 'Pengalaman 100% tanpa kertas.' }
        ].map((f, i) => (
          <div key={i} className="p-8 rounded-3xl bg-white dark:bg-[#0F0F0F] border border-gray-100 dark:border-white/5 hover:border-primary-500 dark:hover:border-primary-500 transition-all hover:shadow-2xl hover:shadow-primary-500/5 group">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-primary-500 mb-6 group-hover:bg-primary-500 group-hover:text-white transition-colors">
              <f.icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
            <p className="text-gray-500 dark:text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

// Helper Component for Modern Floating Inputs
const FloatingLabelInput = ({ label, value, onChange, type = "text", placeholder = "", disabled = false, className = "" }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;

  return (
    <div className={`relative group ${className}`}>
      <div className={`absolute left-4 transition-all duration-200 pointer-events-none ${isFocused || hasValue ? 'top-2 text-[10px] text-primary-500 font-bold uppercase tracking-wider' : 'top-4 text-gray-400 text-sm'}`}>
        {label}
      </div>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        onFocus={() => setIsFocused(true)} 
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={`w-full bg-white dark:bg-[#1a1a1a] border-2 rounded-2xl px-4 pt-6 pb-2 outline-none transition-all font-medium text-gray-900 dark:text-white shadow-sm
          ${isFocused ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
};

// --- MODERN REVAMPED CAR INSURANCE WIZARD ---

const CarInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<UserState>({ name: '', ktp: '', domicile: '', email: '', phone: '', isMember: false });
  const [vehicle, setVehicle] = useState<VehicleState>({
    brand: '', modelCode: '', year: 2024, price: 0, plateRegion: '2', 
    plateDetails: { code: 'B', number: '', suffix: '' },
    usage: 'PERSONAL', condition: 'NEW', vin: '', engineNo: '', accessories: '', insuranceType: InsuranceType.COMPREHENSIVE,
    expansions: { flood: false, earthquake: false, srcc: false, terrorism: false, tpl: 0, paDriver: 0, paPassenger: 0, passengers: 4 }
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  
  // AI Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [vehicleImages, setVehicleImages] = useState<{ [key: string]: string | null }>({
    front: null, back: null, left: null, right: null
  });

  // Payment State
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const availableBrands = Array.from(new Set(CAR_DATABASE.map(c => c.brand)));
  const availableModels = CAR_DATABASE.filter(c => c.brand === vehicle.brand);
  
  const steps = lang === Language.EN 
    ? ['Details', 'Car', 'Plan', 'Extra', 'Quotes', 'Summary', 'Verify', 'Pay']
    : ['Data', 'Mobil', 'Paket', 'Extra', 'Penawaran', 'Ringkasan', 'Verifikasi', 'Bayar'];

  const calculatePremiums = () => {
    const price = vehicle.price * 1000000; // Convert to Rupiah
    const rate = getOJKRate(vehicle.price, vehicle.plateRegion, vehicle.insuranceType);
    const basePremium = price * (rate / 100);

    let expansionCost = 0;
    const { expansions } = vehicle;

    if (expansions.flood) expansionCost += price * EXPANSION_RATES.FLOOD / 100;
    if (expansions.earthquake) expansionCost += price * EXPANSION_RATES.EARTHQUAKE / 100;
    const srccRate = vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.SRCC.COMPREHENSIVE : EXPANSION_RATES.SRCC.TLO;
    const tsRate = vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.TERRORISM.COMPREHENSIVE : EXPANSION_RATES.TERRORISM.TLO;
    if (expansions.srcc) expansionCost += price * srccRate / 100;
    if (expansions.terrorism) expansionCost += price * tsRate / 100;

    if (expansions.tpl > 0) {
      const tplAmount = expansions.tpl * 1000000;
      let tplCost = 0;
      const firstTier = Math.min(tplAmount, 25000000);
      tplCost += firstTier * 0.01;
      if (tplAmount > 25000000) {
        tplCost += (tplAmount - 25000000) * 0.005;
      }
      expansionCost += tplCost;
    }

    if (expansions.paDriver > 0) expansionCost += expansions.paDriver * EXPANSION_RATES.PA_DRIVER / 100;
    if (expansions.paPassenger > 0) {
      expansionCost += (expansions.paPassenger * expansions.passengers) * EXPANSION_RATES.PA_PASSENGER / 100;
    }

    const providers = [
      { name: 'Tugu Insurance', factor: 1.0, rating: 4.8, branches: 12, workshops: 450, logo: 'T' },
      { name: 'Zurich', factor: 1.05, rating: 4.9, branches: 20, workshops: 600, logo: 'Z' },
      { name: 'IntraAsia', factor: 0.95, rating: 4.5, branches: 8, workshops: 300, logo: 'I' },
    ];

    const generatedQuotes: Quote[] = providers.map(p => {
      const providerBase = basePremium * p.factor;
      const providerExpansion = expansionCost * p.factor; 
      return {
        provider: p.name,
        logo: p.logo,
        basePremium: providerBase,
        expansionPremium: providerExpansion,
        totalPremium: providerBase + providerExpansion,
        rating: p.rating,
        workshops: p.workshops,
        branches: p.branches,
        features: ['24/7 Support', 'Mobile Claim', 'Authorized Workshop']
      };
    });

    generatedQuotes.sort((a, b) => a.totalPremium - b.totalPremium);
    setQuotes(generatedQuotes);
    setStep(5);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: string) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setVehicleImages(prev => ({ ...prev, [side]: ev.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAIVerification = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setVerificationResult(null);
    
    const imagesToAnalyze = Object.values(vehicleImages).filter(img => img !== null) as string[];
    
    if (imagesToAnalyze.length === 0) {
      setAnalysisError(lang === Language.EN ? "Please upload at least one photo." : "Silahkan unggah setidaknya satu foto.");
      setIsAnalyzing(false);
      return;
    }

    try {
      const result = await analyzeVehiclePhoto(imagesToAnalyze, 'EXTERIOR');
      if (result.success) {
        setVerificationResult(result.data);
      } else {
        setAnalysisError(result.error || (lang === Language.EN ? "Verification failed." : "Verifikasi gagal."));
      }
    } catch (e) {
      setAnalysisError(lang === Language.EN ? "System error." : "Kesalahan sistem.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePayment = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('success');
    }, 2000);
  };

  // Floating Estimate Component
  const FloatingEstimate = () => {
    if (step < 2 || !selectedQuote || step === 8) return null;
    return (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-6 animate-fade-in-up">
        <div className="bg-gray-900/90 dark:bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">{lang === Language.EN ? 'Total Premium' : 'Total Premi'}</p>
            <p className="text-lg font-bold">Rp {selectedQuote.totalPremium.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
          </div>
          <button onClick={() => setStep(8)} className="bg-primary-500 hover:bg-primary-400 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            {lang === Language.EN ? 'Pay Now' : 'Bayar'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] relative pb-24">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-500/5 to-transparent"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-10 relative z-10">
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => { if(step > 1) setStep(step-1); else setPage('home'); }} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-600 dark:text-white"/>
          </button>
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step > i ? 'w-8 bg-primary-500' : step === i + 1 ? 'w-8 bg-primary-300' : 'w-2 bg-gray-200 dark:bg-white/10'}`}></div>
            ))}
          </div>
          <div className="text-sm font-bold text-gray-500">{step}/{steps.length}</div>
        </div>

        {/* Main Wizard Card */}
        <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden relative min-h-[600px]">
          
          {/* Step Content */}
          <div className="p-8 md:p-12">
            
            {step === 1 && (
              <div className="animate-fade-in max-w-lg mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Who is driving?' : 'Siapa yang berkendara?'}</h2>
                  <p className="text-gray-500">{lang === Language.EN ? 'Enter your details for the policy.' : 'Masukan data diri untuk polis asuransi.'}</p>
                </div>
                <div className="space-y-5">
                  <FloatingLabelInput label={lang === Language.EN ? "Full Name" : "Nama Lengkap"} value={user.name} onChange={(e:any) => setUser({...user, name: e.target.value})} />
                  <FloatingLabelInput label="NIK / KTP" value={user.ktp} onChange={(e:any) => setUser({...user, ktp: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <FloatingLabelInput label="Email" type="email" value={user.email} onChange={(e:any) => setUser({...user, email: e.target.value})} />
                    <FloatingLabelInput label={lang === Language.EN ? "Phone" : "Telepon"} type="tel" value={user.phone} onChange={(e:any) => setUser({...user, phone: e.target.value})} />
                  </div>
                  <FloatingLabelInput label={lang === Language.EN ? "Address" : "Alamat Domisili"} value={user.domicile} onChange={(e:any) => setUser({...user, domicile: e.target.value})} />
                </div>
                <button onClick={() => setStep(2)} className="w-full mt-10 btn-luxury">{lang === Language.EN ? 'Continue' : 'Lanjut'}</button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Vehicle Details' : 'Data Kendaraan'}</h2>
                  <p className="text-gray-500">{lang === Language.EN ? 'Select your car.' : 'Pilih mobil Anda.'}</p>
                </div>
                
                <div className="space-y-8">
                  {/* Brand Selection Grid */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">{lang === Language.EN ? 'Select Brand' : 'Pilih Merk'}</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableBrands.map(b => (
                        <button 
                          key={b} 
                          onClick={() => setVehicle({...vehicle, brand: b, modelCode: '', price: 0})}
                          className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${vehicle.brand === b ? 'border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50 dark:bg-white/5'}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Year Selection Chips */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">{lang === Language.EN ? 'Select Year' : 'Pilih Tahun'}</label>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                        <button 
                          key={y} 
                          onClick={() => setVehicle({...vehicle, year: y})}
                          className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${vehicle.year === y ? 'bg-gray-900 dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{lang === Language.EN ? 'Model' : 'Tipe Model'}</label>
                        <select 
                          className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary-500 appearance-none font-medium"
                          disabled={!vehicle.brand} 
                          value={vehicle.modelCode} 
                          onChange={(e) => {
                            const code = e.target.value;
                            const car = CAR_DATABASE.find(c => c.code === code);
                            if (car) setVehicle({ ...vehicle, modelCode: code, price: car.yearPrices[vehicle.year] || 0 });
                          }}
                        >
                          <option value="">{lang === Language.EN ? 'Select Model' : 'Pilih Model'}</option>
                          {availableModels.map(m => <option key={m.code} value={m.code}>{m.modelName}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-10 rotate-90 text-gray-400 pointer-events-none" size={20} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{lang === Language.EN ? 'Plate Number' : 'Nomor Polisi'}</label>
                        <div className="plate-visual flex items-center justify-between px-4 py-2 rounded-2xl border-4 border-black dark:border-gray-700 bg-black text-white shadow-xl">
                            <input 
                                type="text" 
                                placeholder="B" 
                                maxLength={2}
                                className="w-12 bg-transparent text-center text-3xl font-bold placeholder-gray-600 outline-none uppercase"
                                value={vehicle.plateDetails.code}
                                onChange={e => setVehicle({...vehicle, plateDetails: {...vehicle.plateDetails, code: e.target.value.toUpperCase()}})}
                            />
                            <input 
                                type="text" 
                                placeholder="1234" 
                                maxLength={4}
                                className="flex-1 bg-transparent text-center text-3xl font-bold placeholder-gray-600 outline-none"
                                value={vehicle.plateDetails.number}
                                onChange={e => setVehicle({...vehicle, plateDetails: {...vehicle.plateDetails, number: e.target.value.replace(/\D/g, '')}})}
                            />
                            <input 
                                type="text" 
                                placeholder="XYZ" 
                                maxLength={3}
                                className="w-20 bg-transparent text-center text-3xl font-bold placeholder-gray-600 outline-none uppercase"
                                value={vehicle.plateDetails.suffix}
                                onChange={e => setVehicle({...vehicle, plateDetails: {...vehicle.plateDetails, suffix: e.target.value.toUpperCase()}})}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-2">
                            <span>Kode</span>
                            <span>Nomor</span>
                            <span>Seri</span>
                        </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <FloatingLabelInput label="VIN / Rangka" value={vehicle.vin} onChange={(e:any) => setVehicle({...vehicle, vin: e.target.value})} />
                    <FloatingLabelInput label="Engine / Mesin" value={vehicle.engineNo} onChange={(e:any) => setVehicle({...vehicle, engineNo: e.target.value})} />
                  </div>

                  <button onClick={() => setStep(3)} className="w-full btn-luxury mt-6">{lang === Language.EN ? 'Next Step' : 'Selanjutnya'} <ChevronRight/></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Choose Coverage' : 'Pilih Proteksi'}</h2>
                  <p className="text-gray-500">{lang === Language.EN ? 'How much protection do you need?' : 'Seberapa besar perlindungan yang Anda butuhkan?'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { type: InsuranceType.COMPREHENSIVE, title: 'Comprehensive', subtitle: 'All Risk', icon: Shield, desc: lang === Language.EN ? 'Covers everything from scratches to theft.' : 'Menanggung semua dari lecet hingga kehilangan.' },
                    { type: InsuranceType.TLO, title: 'Total Loss Only', subtitle: 'TLO', icon: AlertTriangle, desc: lang === Language.EN ? 'Covers only major damage (>75%) or theft.' : 'Hanya menanggung kerusakan parah (>75%) atau hilang.' }
                  ].map((opt) => (
                    <div 
                      key={opt.type}
                      onClick={() => setVehicle({...vehicle, insuranceType: opt.type})}
                      className={`relative p-8 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 hover:-translate-y-2 ${vehicle.insuranceType === opt.type ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-primary-300'}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${vehicle.insuranceType === opt.type ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}>
                        <opt.icon size={28} />
                      </div>
                      <h3 className="text-2xl font-bold">{opt.title}</h3>
                      <p className="text-sm font-bold text-primary-500 uppercase tracking-wider mb-4">{opt.subtitle}</p>
                      <p className="text-gray-500 text-sm leading-relaxed">{opt.desc}</p>
                      {vehicle.insuranceType === opt.type && (
                        <div className="absolute top-6 right-6 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(4)} className="w-full btn-luxury mt-10">{lang === Language.EN ? 'Customize Add-ons' : 'Pilih Perluasan'}</button>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Add-ons' : 'Perluasan'}</h2>
                  <p className="text-gray-500">{lang === Language.EN ? 'Extra peace of mind.' : 'Ketenangan ekstra.'}</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 grid md:grid-cols-2 gap-4">
                    {[
                      { id: 'flood', label: lang === Language.EN ? 'Flood' : 'Banjir' },
                      { id: 'earthquake', label: lang === Language.EN ? 'Earthquake' : 'Gempa' },
                      { id: 'srcc', label: 'SRCC (Huru-hara)' },
                      { id: 'terrorism', label: lang === Language.EN ? 'Terrorism' : 'Terorisme' },
                    ].map((item) => (
                      <label key={item.id} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${ (vehicle.expansions as any)[item.id] ? 'bg-white dark:bg-black shadow-md border border-primary-500' : 'border border-transparent hover:bg-white dark:hover:bg-white/10' }`}>
                        <span className="font-bold">{item.label}</span>
                        <input type="checkbox" className="w-5 h-5 accent-primary-500"
                          checked={(vehicle.expansions as any)[item.id]}
                          onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, [item.id]: e.target.checked}})}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="font-bold text-sm text-gray-500 uppercase">TPL (Tanggung Jawab Pihak 3)</label>
                      <input 
                        type="range" min="0" max="50" step="10" 
                        value={vehicle.expansions.tpl}
                        onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, tpl: parseInt(e.target.value)}})}
                        className="w-full accent-primary-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs font-bold">
                        <span>0</span>
                        <span className="text-primary-600 text-lg">Current: {vehicle.expansions.tpl} Juta</span>
                        <span>50 Juta</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={calculatePremiums} className="w-full btn-luxury mt-10">{lang === Language.EN ? 'View Quotes' : 'Lihat Penawaran'} <Zap size={18}/></button>
              </div>
            )}

            {step === 5 && (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Best Quotes' : 'Penawaran Terbaik'}</h2>
                  <p className="text-gray-500">{lang === Language.EN ? 'Select the provider that fits you.' : 'Pilih penyedia yang cocok untuk Anda.'}</p>
                </div>

                <div className="space-y-4">
                  {quotes.map((q, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedQuote(q)}
                      className={`relative group overflow-hidden rounded-3xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${selectedQuote?.provider === q.provider ? 'border-primary-500 bg-white dark:bg-[#111]' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5'}`}
                    >
                      <div className="p-6 flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black ${selectedQuote?.provider === q.provider ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                          {q.logo}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold">{q.provider}</h3>
                            {idx === 0 && <span className="bg-accent-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Best Value</span>}
                          </div>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400"/> {q.rating}</span>
                            <span>{q.workshops} Workshops</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase font-bold">Yearly</p>
                          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{(q.totalPremium / 1000000).toFixed(1)}jt</p>
                        </div>
                      </div>
                      {/* Ticket Perforation Visual */}
                      <div className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-50 dark:bg-[#050505] rounded-full transform -translate-y-1/2"></div>
                      <div className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-50 dark:bg-[#050505] rounded-full transform -translate-y-1/2"></div>
                    </div>
                  ))}
                </div>
                <button onClick={() => selectedQuote && setStep(6)} disabled={!selectedQuote} className="w-full btn-luxury mt-8 disabled:opacity-50 disabled:cursor-not-allowed">{lang === Language.EN ? 'Select Plan' : 'Pilih Paket'}</button>
              </div>
            )}

            {step === 6 && selectedQuote && (
              <div className="animate-fade-in">
                <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 p-8 relative overflow-hidden">
                  {/* Receipt Pattern Top */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500"></div>
                  
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-500 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/30">
                      {selectedQuote.logo}
                    </div>
                    <h2 className="text-2xl font-bold">{selectedQuote.provider}</h2>
                    <p className="text-gray-500 text-sm">Insurance Policy Draft</p>
                  </div>

                  <div className="space-y-6 border-t border-b border-dashed border-gray-200 dark:border-white/10 py-6 my-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Vehicle</span>
                      <span className="font-bold">{vehicle.brand} {vehicle.modelCode} ({vehicle.year})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Coverage</span>
                      <span className="font-bold bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg text-sm">{vehicle.insuranceType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Add-ons</span>
                      <div className="text-right flex flex-col items-end gap-1">
                        {Object.entries(vehicle.expansions).filter(([_, v]) => v).map(([k, v]) => (
                          <span key={k} className="text-xs font-bold uppercase text-primary-600 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded">{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-xl font-bold text-gray-400">Total</span>
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">Rp {selectedQuote.totalPremium.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-6">
                  <input type="checkbox" className="mt-1 w-5 h-5 accent-primary-500" />
                  <p className="text-xs text-gray-500 leading-relaxed">{lang === Language.EN ? 'By proceeding, I agree to the Terms & Conditions and Privacy Policy of Surepath Insurtech.' : 'Dengan melanjutkan, saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi Surepath Insurtech.'}</p>
                </div>

                <button onClick={() => setStep(7)} className="w-full btn-luxury mt-8">{lang === Language.EN ? 'Verify Vehicle' : 'Verifikasi Kendaraan'} <Camera size={18}/></button>
              </div>
            )}

            {step === 7 && (
              <div className="animate-fade-in text-center">
                {verificationResult ? (
                  <div className="max-w-md mx-auto">
                    <div className="w-32 h-32 mx-auto relative mb-6">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-white/10" />
                        <circle cx="64" cy="64" r="60" stroke={verificationResult.score >= 80 ? '#10b981' : '#ef4444'} strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * verificationResult.score) / 100} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">{verificationResult.score}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-2">{verificationResult.score >= 80 ? 'Passed' : 'Failed'}</h3>
                    <p className="text-sm text-gray-500 mb-8">{verificationResult.damageDescription}</p>

                    {verificationResult.score >= 80 ? (
                      <button onClick={() => setStep(8)} className="w-full btn-luxury">{lang === Language.EN ? 'Proceed to Payment' : 'Lanjut Pembayaran'}</button>
                    ) : (
                      <button onClick={() => setVerificationResult(null)} className="w-full py-4 rounded-xl border font-bold">{lang === Language.EN ? 'Retake Photos' : 'Foto Ulang'}</button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-gradient-to-tr from-primary-400 to-accent-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/30">
                      {isAnalyzing ? <RefreshCw className="animate-spin text-white" size={32} /> : <Camera className="text-white" size={32} />}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{lang === Language.EN ? 'AI Verification' : 'Verifikasi AI'}</h3>
                    <p className="text-gray-500 mb-8 text-sm max-w-sm mx-auto">{lang === Language.EN ? 'Upload 4 clear photos of your vehicle.' : 'Unggah 4 foto jelas kendaraan Anda (Depan, Belakang, Kiri, Kanan).'}</p>

                    {!isAnalyzing && (
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        {['front', 'back', 'left', 'right'].map(side => (
                          <label key={side} className="relative aspect-square bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center hover:border-primary-500 cursor-pointer transition-all group overflow-hidden">
                            {vehicleImages[side] ? (
                              <img src={vehicleImages[side]!} className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <Upload className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                            )}
                            <span className="absolute bottom-2 text-xs font-bold uppercase text-gray-400 bg-white/80 dark:bg-black/80 px-2 py-0.5 rounded">{side}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, side)} />
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {analysisError && <div className="text-red-500 text-sm font-bold mb-4 bg-red-500/10 p-3 rounded-xl">{analysisError}</div>}

                    <button onClick={handleAIVerification} disabled={isAnalyzing} className="w-full btn-luxury">{isAnalyzing ? 'Analyzing...' : (lang === Language.EN ? 'Analyze Photos' : 'Analisa Foto')}</button>
                  </>
                )}
              </div>
            )}

            {step === 8 && selectedQuote && (
              <div className="animate-fade-in text-center">
                {paymentStatus === 'success' ? (
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40 animate-scale-in">
                      <CheckCircle2 size={48} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">{lang === Language.EN ? 'Payment Successful!' : 'Pembayaran Berhasil!'}</h2>
                    <p className="text-gray-500 mb-2">{lang === Language.EN ? 'Thank you for choosing Surepath.' : 'Terima kasih telah memilih Surepath.'}</p>
                    
                    <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-2xl p-6 mb-8 flex items-center gap-4 text-left">
                      <div className="p-3 bg-primary-100 dark:bg-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400">
                        <Mail size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-primary-700 dark:text-primary-300">{lang === Language.EN ? 'Policy Sent' : 'Polis Terkirim'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lang === Language.EN 
                            ? `E-Policy has been sent to ${user.email}` 
                            : `E-Polis telah dikirimkan ke ${user.email}`}
                        </p>
                      </div>
                    </div>

                    <button onClick={() => setPage('home')} className="w-full btn-luxury">{lang === Language.EN ? 'Return Home' : 'Kembali ke Beranda'}</button>
                  </div>
                ) : paymentStatus === 'processing' ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 border-4 border-gray-200 dark:border-white/10 border-t-primary-500 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-bold animate-pulse">{lang === Language.EN ? 'Processing Payment...' : 'Memproses Pembayaran...'}</h3>
                  </div>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/40">
                      <CreditCard size={48} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Final Step' : 'Langkah Terakhir'}</h2>
                    <p className="text-gray-500 mb-10">{lang === Language.EN ? 'Choose your payment method.' : 'Pilih metode pembayaran.'}</p>

                    <div className="space-y-4 max-w-md mx-auto mb-10">
                      {[
                        { icon: CreditCard, label: 'Credit Card', sub: '0% Installment' },
                        { icon: Smartphone, label: 'QRIS', sub: 'Instant Pay' },
                        { icon: Wallet, label: 'Virtual Account', sub: 'Bank Transfer' }
                      ].map((m, i) => (
                        <button key={i} onClick={handlePayment} className="w-full p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-primary-500 hover:shadow-lg flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-100 dark:bg-white/10 rounded-xl group-hover:bg-primary-500 group-hover:text-white transition-colors"><m.icon size={20}/></div>
                            <div className="text-left">
                              <p className="font-bold">{m.label}</p>
                              <p className="text-xs text-gray-500">{m.sub}</p>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-300 group-hover:text-primary-500" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
      <FloatingEstimate />
    </div>
  );
};

const ProductsPage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => {
  const [activeTab, setActiveTab] = useState<'retail' | 'enterprise'>('retail');

  const retailProducts = [
    { title: lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil', icon: Car, desc: lang === Language.EN ? 'Comprehensive & TLO protection.' : 'Perlindungan Comprehensive & TLO.', action: () => setPage('car-flow') },
    { title: lang === Language.EN ? 'Travel' : 'Perjalanan', icon: MapPin, desc: lang === Language.EN ? 'Global coverage for your trips.' : 'Perlindungan global untuk perjalanan Anda.', action: () => {} },
    { title: lang === Language.EN ? 'Personal Accident' : 'Kecelakaan Diri', icon: Shield, desc: lang === Language.EN ? 'Safety net for you and family.' : 'Jaring pengaman untuk Anda & keluarga.', action: () => {} },
    { title: lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan', icon: Heart, desc: lang === Language.EN ? 'Because they are family too.' : 'Karena mereka juga keluarga.', action: () => {} },
  ];

  const enterpriseProducts = [
    { title: 'Surety Bond', icon: Briefcase, desc: 'Guarantee for your projects.', action: () => {} },
    { title: 'Marine Cargo', icon: Anchor, desc: 'Secure logistics worldwide.', action: () => {} },
    { title: 'Marine Hull', icon: Anchor, desc: 'Vessel protection.', action: () => {} },
    { title: 'Property', icon: Home, desc: 'Asset protection for business.', action: () => {} },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">{lang === Language.EN ? 'Our Products' : 'Produk Kami'}</h2>
        <p className="text-gray-500">{lang === Language.EN ? 'Tailored solutions for every need.' : 'Solusi tepat untuk setiap kebutuhan.'}</p>
      </div>
      
      <div className="flex justify-center mb-16">
        <div className="bg-white dark:bg-white/5 p-1 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 flex backdrop-blur-md">
          {['retail', 'enterprise'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-10 py-3 rounded-xl font-bold capitalize transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(activeTab === 'retail' ? retailProducts : enterpriseProducts).map((p, idx) => (
          <div key={idx} onClick={p.action} className="bg-white dark:bg-[#0F0F0F] p-8 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-none">
            <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300">
              <p.icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold mb-2">{p.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{p.desc}</p>
            <div className="mt-6 flex items-center text-primary-500 font-bold text-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              {lang === Language.EN ? 'Explore' : 'Lihat Detail'} <ChevronRight size={16} className="ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClaimWithAI = ({ lang }: { lang: Language }) => (
  <div className="max-w-2xl mx-auto px-6 py-24 text-center">
    <h2 className="text-5xl font-bold mb-6">{lang === Language.EN ? 'AI Instant Claim' : 'Klaim Instan AI'}</h2>
    <p className="text-gray-500 text-lg mb-12">{lang === Language.EN ? 'Experience the fastest claim process in the industry. Upload a photo, get an estimate, and book a workshop in minutes.' : 'Nikmati proses klaim tercepat. Unggah foto, dapatkan estimasi, dan booking bengkel dalam hitungan menit.'}</p>
    <div className="border-2 border-dashed border-primary-500/30 bg-primary-50/10 rounded-[3rem] p-16 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group cursor-pointer hover:border-primary-500 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
        <Camera size={48} className="text-primary-500" />
      </div>
      <h3 className="text-2xl font-bold mb-2">{lang === Language.EN ? 'Upload Damage Photo' : 'Unggah Foto Kerusakan'}</h3>
      <p className="text-gray-400 mb-8">{lang === Language.EN ? 'or drag and drop here' : 'atau tarik dan lepas di sini'}</p>
      <button className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary-500/30">
        {lang === Language.EN ? 'Start Camera' : 'Buka Kamera'}
      </button>
    </div>
  </div>
);

const AboutPage = ({ lang }: { lang: Language }) => (
  <div className="max-w-4xl mx-auto px-6 py-24">
    <h1 className="text-5xl font-bold mb-8">{lang === Language.EN ? 'We are Surepath.' : 'Kami Adalah Surepath.'}</h1>
    <p className="text-2xl text-gray-500 leading-relaxed font-light">
      {lang === Language.EN 
        ? 'A team of dreamers, engineers, and insurance experts building the future of financial safety. We believe insurance should be invisible until you need it, and magical when you do.'
        : 'Tim pemimpi, insinyur, dan ahli asuransi yang membangun masa depan keamanan finansial. Kami percaya asuransi harus tidak terasa sampai Anda membutuhkannya, dan ajaib saat Anda menggunakannya.'}
    </p>
  </div>
);

const ConsolePage = ({ lang }: { lang: Language }) => (
  <div className="max-w-7xl mx-auto px-6 py-24">
    <h1 className="text-4xl font-bold mb-12 text-center">Surepath Console</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <div className="p-10 border border-gray-200 dark:border-gray-800 rounded-[2rem] hover:shadow-2xl transition-all bg-white dark:bg-[#0F0F0F] group">
        <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/20 text-accent-600 rounded-xl flex items-center justify-center mb-6">
          <Briefcase size={24} />
        </div>
        <h3 className="text-2xl font-bold mb-4">{lang === Language.EN ? 'Partner Dashboard' : 'Dashboard Mitra'}</h3>
        <p className="mb-8 text-gray-500">{lang === Language.EN ? 'Manage your leads, commissions, and client portfolio.' : 'Kelola leads, komisi, dan portofolio klien Anda.'}</p>
        <button className="text-primary-500 font-bold flex items-center group-hover:translate-x-2 transition-transform">{lang === Language.EN ? 'Access Portal' : 'Akses Portal'} <ChevronRight size={16}/></button>
      </div>
      <div className="p-10 border border-gray-200 dark:border-gray-800 rounded-[2rem] hover:shadow-2xl transition-all bg-gray-50 dark:bg-gray-800/50 group opacity-75 hover:opacity-100">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 text-gray-600 rounded-xl flex items-center justify-center mb-6">
          <Shield size={24} />
        </div>
        <h3 className="text-2xl font-bold mb-4">{lang === Language.EN ? 'Employee Internal' : 'Internal Pegawai'}</h3>
        <p className="mb-8 text-gray-500">{lang === Language.EN ? 'Underwriting tools, claim approval, and admin panel.' : 'Alat underwriting, persetujuan klaim, dan panel admin.'}</p>
        <button className="text-gray-900 dark:text-white font-bold flex items-center group-hover:translate-x-2 transition-transform">{lang === Language.EN ? 'Restricted Access' : 'Akses Terbatas'} <ChevronRight size={16}/></button>
      </div>
    </div>
  </div>
);

export default App;