
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { Language, CarModelData, InsuranceType, Quote, VehicleState, UserState, TravelState, PAState, PetState } from './types';
import { CAR_DATABASE, getOJKRate, LOCATIONS, EXPANSION_RATES, TPL_OPTIONS, TRAVEL_RATES, TRAVEL_BENEFITS, PA_PLANS, PET_PLANS } from './constants';
import { analyzeVehiclePhoto } from './services/geminiService';
import { Camera, Upload, Check, Shield, Zap, Truck, Anchor, Home, Car, Heart, Briefcase, ChevronRight, Search, MapPin, ChevronLeft, CreditCard, Info, AlertCircle, Smartphone, Bell, User, Wallet, Navigation, XCircle, RefreshCw, AlertTriangle, X, FileText, PenTool, Star, Mail, CheckCircle2, Plane, GraduationCap, Stethoscope, Dog, Users } from 'lucide-react';

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
      case 'travel-flow': return <TravelInsuranceWizard lang={lang} setPage={setPage} />;
      case 'pa-flow': return <PersonalAccidentWizard lang={lang} setPage={setPage} />;
      case 'pet-flow': return <PetInsuranceWizard lang={lang} setPage={setPage} />;
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

const HeroCarousel = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const banners = [
    {
      title: lang === Language.EN ? "Travel Worry-Free" : "Travel Bebas Cemas",
      subtitle: lang === Language.EN ? "Comprehensive protection for your international trips." : "Perlindungan menyeluruh untuk perjalanan internasional Anda.",
      cta: lang === Language.EN ? "Get Started" : "Mulai Sekarang",
      action: 'travel-flow',
      bgClass: 'bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900',
      icon: Plane,
      accentColor: 'bg-blue-500'
    },
    {
      title: lang === Language.EN ? "AI-Powered Claims" : "Klaim Didukung AI",
      subtitle: lang === Language.EN ? "Settle claims in minutes. Experience the future." : "Selesaikan klaim dalam hitungan menit. Rasakan masa depan.",
      cta: lang === Language.EN ? "Try Demo" : "Coba Demo",
      action: 'claim',
      bgClass: 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900',
      icon: Camera,
      accentColor: 'bg-emerald-500'
    },
    {
      title: lang === Language.EN ? "Protect Your Ride" : "Lindungi Kendaraanmu",
      subtitle: lang === Language.EN ? "Best rates for your car with OJK approved pricing." : "Tarif terbaik untuk mobil Anda dengan harga resmi OJK.",
      cta: lang === Language.EN ? "Get Quote" : "Cek Premi",
      action: 'car-flow',
      bgClass: 'bg-gradient-to-r from-slate-900 via-gray-800 to-zinc-900',
      icon: Car,
      accentColor: 'bg-orange-500'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative w-full h-[320px] md:h-[380px] overflow-hidden rounded-3xl shadow-xl group">
      {banners.map((banner, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          {/* Background */}
          <div className={`absolute inset-0 ${banner.bgClass}`}></div>
          
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          {/* Content Grid */}
          <div className="relative z-10 h-full max-w-7xl mx-auto px-8 md:px-12 grid md:grid-cols-2 items-center">
            
            {/* Left Content */}
            <div className={`space-y-6 transition-all duration-700 delay-100 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-xs font-medium text-white mb-4`}>
                  <span className={`w-2 h-2 rounded-full ${banner.accentColor} animate-pulse`}></span>
                  {lang === Language.EN ? 'Featured Product' : 'Produk Unggulan'}
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                  {banner.title}
                </h2>
              </div>
              
              <p className="text-gray-300 text-sm md:text-base max-w-md leading-relaxed">
                {banner.subtitle}
              </p>
              
              <button 
                onClick={() => setPage(banner.action)}
                className="group/btn flex items-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all shadow-lg shadow-white/5"
              >
                {banner.cta}
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center group-hover/btn:bg-gray-300 transition-colors">
                  <ChevronRight size={14} />
                </div>
              </button>
            </div>

            {/* Right Visual */}
            <div className={`hidden md:flex justify-end transition-all duration-1000 delay-200 ${index === currentSlide ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
              <div className="relative">
                <div className={`absolute inset-0 ${banner.accentColor} blur-[60px] opacity-20 rounded-full`}></div>
                <div className="relative w-48 h-48 bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-6 transition-transform duration-500">
                  <banner.icon size={80} className="text-white drop-shadow-md" strokeWidth={1} />
                </div>
                {/* Floating Decor */}
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center -rotate-6 animate-float">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ))}

      {/* Custom Pagination Dots */}
      <div className="absolute bottom-6 left-8 md:left-12 flex gap-2 z-20">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const HomePage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => (
  <div className="space-y-20 pb-24">
    {/* Hero Section */}
    <section className="pt-6 px-4 md:px-6 max-w-7xl mx-auto">
      <HeroCarousel setPage={setPage} lang={lang} />
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
  const hasValue = value && value.toString().length > 0;

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

// Custom Cat Icon Component
const CatIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26.61.25.9.9.9 1.6 0 6.58-5.26 12-11.32 12A9 9 0 0 1 4 13.27c-3.55 0-6.07-1.33-6-3.38-.03-1.07 1.05-1.88 2.33-2.2C3.33 6.29 7.2 5 12 5z" />
    <path d="M16 10c0-2-1.33-4-3-4s-3 2-3 4c0 2 2 3 3 3s3-1 3-3z" />
    <path d="M19 7v4" />
    <path d="M12 15v2" />
    <path d="M7 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
);

// --- WIZARD COMPONENTS ---

const SuccessScreen = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => (
  <div className="animate-fade-in text-center">
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
            {lang === Language.EN ? 'E-Policy has been sent to your email.' : 'E-Polis telah dikirimkan ke email Anda.'}
          </p>
        </div>
      </div>

      <button onClick={() => setPage('home')} className="w-full btn-luxury">{lang === Language.EN ? 'Return Home' : 'Kembali ke Beranda'}</button>
    </div>
  </div>
);

const TravelInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<TravelState>({ destination: '', region: 'INTERNATIONAL', startDate: '', endDate: '', type: 'INDIVIDUAL', travelersCount: 1 });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [price, setPrice] = useState(0);

  const getDays = () => {
    if(!data.startDate || !data.endDate) return 0;
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1; // Inclusive
  };

  const calculateQuote = (planKey: string) => {
    const days = getDays();
    let durationKey = '1-4';
    if (days > 4) durationKey = '5-6';
    if (days > 6) durationKey = '7-8';
    if (days > 8) durationKey = '9-10';
    if (days > 10) durationKey = '11-15';
    if (days > 15) durationKey = '16-20';
    if (days > 20) durationKey = '21-25';
    if (days > 25) durationKey = '26-30';

    // Default to max range if over 30 for demo, ideally handle extension
    const rates = data.region === 'INTERNATIONAL' ? (TRAVEL_RATES.INTERNATIONAL as any)[durationKey] : (TRAVEL_RATES.DOMESTIC as any)[durationKey];
    
    // Safety check
    if (!rates) return 0;

    const basePrice = rates[planKey.toLowerCase().replace(' ', '')] || 0;
    // Simple multiplication for Family (mock logic as PDF implies family package vs individual)
    // PDF says: Family max 2 adult + 2 child. Often Family is 2.5x individual or specific table.
    // For this demo, if Type is FAMILY, we multiply by 2.5 for specific premium or just use individual * count if not specified.
    // The PDF mentions "Family Package ... uses individual premium". Let's assume simple logic for now.
    return basePrice * (data.type === 'FAMILY' ? 2.5 : data.travelersCount);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
        <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Travel Insurance' : 'Asuransi Perjalanan'}</h2>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setData({...data, region: 'DOMESTIC'})} className={`p-4 border-2 rounded-xl font-bold ${data.region === 'DOMESTIC' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>Domestik</button>
            <button onClick={() => setData({...data, region: 'INTERNATIONAL'})} className={`p-4 border-2 rounded-xl font-bold ${data.region === 'INTERNATIONAL' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>International</button>
          </div>
          <FloatingLabelInput label={lang === Language.EN ? "Destination" : "Tujuan"} value={data.destination} onChange={(e:any) => setData({...data, destination: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FloatingLabelInput type="date" label="Start Date" value={data.startDate} onChange={(e:any) => setData({...data, startDate: e.target.value})} />
            <FloatingLabelInput type="date" label="End Date" value={data.endDate} onChange={(e:any) => setData({...data, endDate: e.target.value})} />
          </div>
          <div className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-800 rounded-2xl">
            <span className="font-bold">{lang === Language.EN ? 'Travel Type' : 'Tipe Perjalanan'}</span>
            <div className="flex gap-2">
              <button onClick={() => setData({...data, type: 'INDIVIDUAL'})} className={`px-4 py-2 rounded-lg text-sm font-bold ${data.type === 'INDIVIDUAL' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>Individual</button>
              <button onClick={() => setData({...data, type: 'FAMILY'})} className={`px-4 py-2 rounded-lg text-sm font-bold ${data.type === 'FAMILY' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>Family</button>
            </div>
          </div>
          <button onClick={() => setStep(2)} className="w-full btn-luxury mt-4">{lang === Language.EN ? 'View Plans' : 'Lihat Paket'}</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Select Plan' : 'Pilih Paket'} <span className="text-sm font-normal text-gray-500">({getDays()} Days)</span></h3>
          
          <div className="grid gap-4">
            {data.region === 'INTERNATIONAL' ? (
              ['PLATINUM', 'GOLD', 'ASIA'].map(plan => {
                const key = plan === 'ASIA' ? 'asia' : plan.toLowerCase();
                const p = calculateQuote(key);
                const benefits = (TRAVEL_BENEFITS as any)[plan];
                return (
                  <div key={plan} onClick={() => { setSelectedPlan(plan); setPrice(p); }} className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === plan ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-bold">{plan === 'ASIA' ? 'ASIA EXTRA' : plan}</h4>
                        <p className="text-sm text-gray-500">{lang === Language.EN ? 'Medical Coverage up to' : 'Tanggungan Medis s.d'} {benefits.medical}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary-600">Rp {(p/1000).toFixed(0)}k</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {benefits.features.map((f:string) => (
                        <span key={f} className="text-xs bg-white dark:bg-black px-2 py-1 rounded border border-gray-100 dark:border-gray-700">{f}</span>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              ['GARUDA1', 'GARUDA2'].map(plan => {
                const key = plan.toLowerCase();
                const p = calculateQuote(key);
                const benefits = (TRAVEL_BENEFITS as any)[plan];
                return (
                  <div key={plan} onClick={() => { setSelectedPlan(plan); setPrice(p); }} className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === plan ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-bold">{plan.replace('1', ' I').replace('2', ' II')}</h4>
                        <p className="text-sm text-gray-500">Santunan Kematian: {benefits.death}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary-600">Rp {(p/1000).toFixed(0)}k</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {benefits.features.map((f:string) => (
                        <span key={f} className="text-xs bg-white dark:bg-black px-2 py-1 rounded border border-gray-100 dark:border-gray-700">{f}</span>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          <button disabled={!selectedPlan} onClick={() => setStep(3)} className="w-full btn-luxury mt-6">{lang === Language.EN ? 'Proceed to Payment' : 'Lanjut Pembayaran'}</button>
        </div>
      )}

      {step === 3 && <SuccessScreen lang={lang} setPage={setPage} />}
    </div>
  );
};

const PersonalAccidentWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PAState & { name: string, dob: string, schoolName: string }>({ occupation: '', type: 'GENERAL', planCode: '', name: '', dob: '', schoolName: '' });
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  const plans = data.type === 'GENERAL' ? PA_PLANS.GENERAL : PA_PLANS.STUDENT;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
        <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Personal Accident' : 'Asuransi Kecelakaan Diri'}</h2>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-2">{lang === Language.EN ? 'Who are we protecting?' : 'Siapa yang dilindungi?'}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => setData({...data, type: 'GENERAL'})} className={`p-6 border-2 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all ${data.type === 'GENERAL' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
              <Briefcase size={32} className="mb-2" />
              {lang === Language.EN ? 'Employee / General' : 'Karyawan / Umum'}
            </button>
            <button onClick={() => setData({...data, type: 'STUDENT'})} className={`p-6 border-2 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all ${data.type === 'STUDENT' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
              <GraduationCap size={32} className="mb-2" />
              {lang === Language.EN ? 'Student' : 'Pelajar / Mahasiswa'}
            </button>
          </div>

          <FloatingLabelInput label={lang === Language.EN ? "Full Name" : "Nama Lengkap"} value={data.name} onChange={(e:any) => setData({...data, name: e.target.value})} />
          <FloatingLabelInput type="date" label={lang === Language.EN ? "Date of Birth" : "Tanggal Lahir"} value={data.dob} onChange={(e:any) => setData({...data, dob: e.target.value})} />
          
          {data.type === 'GENERAL' ? (
             <FloatingLabelInput label={lang === Language.EN ? "Occupation" : "Pekerjaan"} value={data.occupation} onChange={(e:any) => setData({...data, occupation: e.target.value})} />
          ) : (
             <FloatingLabelInput label={lang === Language.EN ? "School / University Name" : "Nama Sekolah / Universitas"} value={data.schoolName} onChange={(e:any) => setData({...data, schoolName: e.target.value})} />
          )}

          <button onClick={() => setStep(2)} className="w-full btn-luxury mt-4">{lang === Language.EN ? 'Choose Plan' : 'Pilih Paket'}</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Select Coverage Plan' : 'Pilih Paket Perlindungan'}</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div key={p.code} onClick={() => setSelectedPlan(p)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedPlan?.code === p.code ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold">{p.code}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">{lang === Language.EN ? 'Plan' : 'Paket'}</span>
                  </div>
                  <p className="font-bold text-lg">{p.benefit}</p>
                  <p className="text-[10px] text-gray-500">{lang === Language.EN ? 'Death/Disablement Benefit' : 'Santunan Kematian/Cacat'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary-600">Rp {p.premium.toLocaleString()}</p>
                  <span className="text-[10px] text-gray-400">/ {lang === Language.EN ? 'year' : 'tahun'}</span>
                </div>
              </div>
            ))}
          </div>
          <button disabled={!selectedPlan} onClick={() => setStep(3)} className="w-full btn-luxury mt-6">{lang === Language.EN ? 'Review & Pay' : 'Tinjau & Bayar'}</button>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-in">
          <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 p-8 relative overflow-hidden mb-6">
             <div className="absolute top-0 left-0 w-full h-2 bg-primary-500"></div>
             <h3 className="text-2xl font-bold mb-6 text-center">{lang === Language.EN ? 'Coverage Summary' : 'Ringkasan Polis'}</h3>
             
             <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Insured Name' : 'Tertanggung'}</span>
                   <span className="font-bold">{data.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Category' : 'Kategori'}</span>
                   <span className="font-bold">{data.type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Plan' : 'Paket'}</span>
                   <span className="font-bold">Plan {selectedPlan.code}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Coverage Amount' : 'Nilai Pertanggungan'}</span>
                   <span className="font-bold">{selectedPlan.benefit}</span>
                </div>
                <div className="flex justify-between pt-4">
                   <span className="text-lg font-bold text-gray-500">{lang === Language.EN ? 'Total Premium' : 'Total Premi'}</span>
                   <span className="text-2xl font-bold text-primary-600">Rp {selectedPlan.premium.toLocaleString()}</span>
                </div>
             </div>
          </div>
          <button onClick={() => setStep(4)} className="w-full btn-luxury">{lang === Language.EN ? 'Confirm Purchase' : 'Konfirmasi Pembelian'}</button>
        </div>
      )}

      {step === 4 && <SuccessScreen lang={lang} setPage={setPage} />}
    </div>
  );
};

const PetInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PetState>({ petName: '', petType: 'DOG', breed: '', age: 1, gender: 'MALE', sterilized: false });
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
        <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan'}</h2>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-center gap-6 mb-6">
            <button onClick={() => setData({...data, petType: 'DOG'})} className={`w-32 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 font-bold transition-all duration-300 ${data.petType === 'DOG' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-110 shadow-xl' : 'border-gray-200 dark:border-gray-700 grayscale opacity-60 hover:opacity-100'}`}>
              <Dog size={40} strokeWidth={1.5} /> Dog
            </button>
            <button onClick={() => setData({...data, petType: 'CAT'})} className={`w-32 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 font-bold transition-all duration-300 ${data.petType === 'CAT' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-110 shadow-xl' : 'border-gray-200 dark:border-gray-700 grayscale opacity-60 hover:opacity-100'}`}>
              <CatIcon size={40} /> Cat
            </button>
          </div>
          
          <FloatingLabelInput label={lang === Language.EN ? "Pet Name" : "Nama Hewan"} value={data.petName} onChange={(e:any) => setData({...data, petName: e.target.value})} />
          <FloatingLabelInput label={lang === Language.EN ? "Breed" : "Ras"} value={data.breed} onChange={(e:any) => setData({...data, breed: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FloatingLabelInput type="number" label={lang === Language.EN ? "Age (Years)" : "Umur (Tahun)"} value={data.age} onChange={(e:any) => setData({...data, age: e.target.value})} />
            <div className="flex items-center gap-2 px-4 border-2 border-gray-200 dark:border-gray-800 rounded-2xl">
              <label className="flex-1 cursor-pointer flex items-center gap-2">
                <input type="checkbox" checked={data.sterilized} onChange={(e) => setData({...data, sterilized: e.target.checked})} className="w-5 h-5 accent-primary-500"/>
                <span className="text-sm font-medium">{lang === Language.EN ? 'Sterilized?' : 'Sudah Steril?'}</span>
              </label>
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full btn-luxury mt-4">{lang === Language.EN ? 'See Coverage' : 'Lihat Proteksi'}</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4">
            {PET_PLANS.map((p) => (
              <div key={p.name} onClick={() => setSelectedPlan(p)} className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan?.name === p.name ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xl font-bold">{p.name}</h4>
                  <p className="text-2xl font-bold text-primary-600">Rp {(p.price/1000).toFixed(0)}k <span className="text-sm text-gray-400 font-normal">/yr</span></p>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <div className="flex justify-between"><span>Medical Limit:</span> <b>{p.medical}</b></div>
                  <div className="flex justify-between"><span>Death Benefit:</span> <b>{p.death}</b></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.features.map(f => <span key={f} className="text-[10px] bg-white dark:bg-black px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{f}</span>)}
                </div>
              </div>
            ))}
          </div>
          <button disabled={!selectedPlan} onClick={() => setStep(3)} className="w-full btn-luxury mt-6">{lang === Language.EN ? 'Protect My Pet' : 'Lindungi Hewan Saya'}</button>
        </div>
      )}

      {step === 3 && <SuccessScreen lang={lang} setPage={setPage} />}
    </div>
  );
};

const ProductsPage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => {
  const [activeTab, setActiveTab] = useState<'retail' | 'enterprise'>('retail');

  const retailProducts = [
    { title: lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil', icon: Car, desc: lang === Language.EN ? 'Comprehensive & TLO protection.' : 'Perlindungan Comprehensive & TLO.', action: () => setPage('car-flow') },
    { title: lang === Language.EN ? 'Travel' : 'Perjalanan', icon: Plane, desc: lang === Language.EN ? 'Global coverage for your trips.' : 'Perlindungan global untuk perjalanan Anda.', action: () => setPage('travel-flow') },
    { title: lang === Language.EN ? 'Personal Accident' : 'Kecelakaan Diri', icon: Shield, desc: lang === Language.EN ? 'Safety net for you and family.' : 'Jaring pengaman untuk Anda & keluarga.', action: () => setPage('pa-flow') },
    { title: lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan', icon: Dog, desc: lang === Language.EN ? 'Because they are family too.' : 'Karena mereka juga keluarga.', action: () => setPage('pet-flow') },
  ];

  const enterpriseProducts = [
    { title: 'Surety Bond', icon: Briefcase, desc: 'Guarantee for your projects.', action: () => {} },
    { title: 'Marine Cargo', icon: Truck, desc: 'Secure logistics worldwide.', action: () => {} },
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

  // Helper to calculate TPL cost based on OJK Tiers for display
  const getTPLPremium = (limit: number) => {
    if (limit === 0) return 0;
    const amount = limit * 1000000;
    let cost = 0;
    // OJK Rules: 1% up to 25M, 0.5% for excess > 25M (simplified standard)
    const tier1 = Math.min(amount, 25000000);
    cost += tier1 * 0.01;
    if (amount > 25000000) {
      const tier2 = amount - 25000000;
      cost += tier2 * 0.005;
    }
    return cost;
  };

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
      expansionCost += getTPLPremium(expansions.tpl);
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
                  <p className="text-gray-500">{lang === Language.EN ? 'Customize your protection level.' : 'Sesuaikan tingkat perlindungan Anda.'}</p>
                </div>

                <div className="space-y-8">
                  {/* Basic Toggles */}
                  <div className="bg-gray-50 dark:bg-white/5 rounded-[2rem] p-6 grid md:grid-cols-2 gap-4">
                    {[
                      { id: 'flood', label: lang === Language.EN ? 'Flood' : 'Banjir' },
                      { id: 'earthquake', label: lang === Language.EN ? 'Earthquake' : 'Gempa' },
                      { id: 'srcc', label: 'SRCC (Huru-hara)' },
                      { id: 'terrorism', label: lang === Language.EN ? 'Terrorism' : 'Terorisme' },
                    ].map((item) => (
                      <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${ (vehicle.expansions as any)[item.id] ? 'bg-white dark:bg-black shadow-md border-2 border-primary-500' : 'border-2 border-transparent hover:bg-white dark:hover:bg-white/10' }`}>
                        <span className="font-bold">{item.label}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${ (vehicle.expansions as any)[item.id] ? 'bg-primary-500 border-primary-500' : 'border-gray-300 dark:border-gray-600' }`}>
                          {(vehicle.expansions as any)[item.id] && <Check size={14} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden"
                          checked={(vehicle.expansions as any)[item.id]}
                          onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, [item.id]: e.target.checked}})}
                        />
                      </label>
                    ))}
                  </div>

                  {/* Dynamic TPL Grid */}
                  <div className="bg-gray-50 dark:bg-white/5 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={20} className="text-primary-500" />
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-sm">Third Party Liability (TPL)</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TPL_OPTIONS.map((limit) => {
                        const cost = getTPLPremium(limit);
                        const isRecommended = vehicle.price > 500 && limit === 50;
                        const isActive = vehicle.expansions.tpl === limit;

                        return (
                          <button
                            key={limit}
                            onClick={() => setVehicle({...vehicle, expansions: {...vehicle.expansions, tpl: limit}})}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all group ${
                              isActive 
                                ? 'border-primary-500 bg-white dark:bg-black shadow-lg' 
                                : 'border-transparent bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10'
                            }`}
                          >
                            {isRecommended && (
                              <span className="absolute -top-2 -right-2 bg-accent-500 text-black text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                RECOMMENDED
                              </span>
                            )}
                            <div className={`text-lg font-bold mb-1 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {limit === 0 ? (lang === Language.EN ? 'None' : 'Tidak Ada') : `${limit} Juta`}
                            </div>
                            <div className={`text-xs font-medium ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                              {limit === 0 ? '-' : `+ Rp ${cost.toLocaleString('id-ID')}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                      {lang === Language.EN 
                        ? 'Covers legal liability for third-party bodily injury or property damage. Higher limits recommended for luxury vehicles.'
                        : 'Menjamin tanggung jawab hukum terhadap pihak ketiga. Limit lebih tinggi disarankan untuk kendaraan mewah.'}
                    </p>
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
                          <span key={k} className="text-xs font-bold uppercase text-primary-600 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded">{k === 'tpl' && (v as number) > 0 ? `TPL ${v}jt` : k}</span>
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
