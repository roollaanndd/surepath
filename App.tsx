
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { Language, CarModelData, InsuranceType, Quote, VehicleState, UserState, TravelState, PAState, PetState } from './types';
import { CAR_DATABASE, getOJKRate, LOCATIONS, EXPANSION_RATES, TPL_OPTIONS, TRAVEL_RATES, TRAVEL_BENEFITS, PA_PLANS, PET_PLANS } from './constants';
import { analyzeVehiclePhoto } from './services/geminiService';
import { Camera, Upload, Check, Shield, Zap, Truck, Anchor, Home, Car, Heart, Briefcase, ChevronRight, Search, MapPin, ChevronLeft, CreditCard, Info, AlertCircle, Smartphone, Bell, User, Wallet, Navigation, XCircle, RefreshCw, AlertTriangle, X, FileText, PenTool, Star, Mail, CheckCircle2, Plane, GraduationCap, Stethoscope, Dog, Users, Lightbulb, Target, Globe2, Hammer, Scale, Cpu, Tractor, Newspaper, TrendingUp, ArrowRight } from 'lucide-react';

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
      case 'contact': return <ContactPage lang={lang} />;
      case 'about': return <AboutPage lang={lang} />;
      case 'careers': return <CareersPage lang={lang} />;
      case 'newsroom': return <NewsroomPage lang={lang} />;
      case 'console': return <ConsolePage lang={lang} />;
      default: return <HomePage setPage={setPage} lang={lang} />;
    }
  };

  const footerLinks = [
    { label: lang === Language.EN ? 'About Us' : 'Tentang Kami', action: 'about' },
    { label: lang === Language.EN ? 'Careers' : 'Karir', action: 'careers' },
    { label: lang === Language.EN ? 'Newsroom' : 'Berita', action: 'newsroom' },
    { label: lang === Language.EN ? 'Contact' : 'Hubungi Kami', action: 'contact' },
  ];

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
        <footer className="bg-gray-900 dark:bg-black text-white border-t border-gray-800 dark:border-white/10 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
              <div className="md:col-span-5 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <span className="text-white font-bold text-xl">S</span>
                  </div>
                  <span className="font-bold text-3xl tracking-tight">Surepath</span>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
                  {lang === Language.EN 
                    ? 'Reinventing insurance with Artificial Intelligence. Simple, transparent, and instant.'
                    : 'Menciptakan ulang asuransi dengan Kecerdasan Buatan. Simpel, transparan, dan instan.'}
                </p>
                <div className="flex gap-4 pt-4">
                  {['Twitter', 'LinkedIn', 'Instagram'].map(social => (
                    <div key={social} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors">
                      <span className="text-xs font-bold">{social[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <h4 className="font-bold text-lg mb-6">{lang === Language.EN ? 'Company' : 'Perusahaan'}</h4>
                {footerLinks.map(item => (
                  <button 
                    key={item.action} 
                    onClick={() => setPage(item.action)}
                    className="block text-left text-gray-400 hover:text-primary-400 cursor-pointer transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 space-y-4">
                <h4 className="font-bold text-lg mb-6">{lang === Language.EN ? 'Products' : 'Produk'}</h4>
                {['Car Insurance', 'Travel', 'Health', 'Enterprise'].map(item => (
                  <div key={item} className="text-gray-400 hover:text-primary-400 cursor-pointer transition-colors">{item}</div>
                ))}
              </div>

              <div className="md:col-span-3 bg-white/5 rounded-3xl p-8 border border-white/5">
                <h4 className="font-bold text-lg mb-2">{lang === Language.EN ? 'Stay Protected' : 'Tetap Terlindungi'}</h4>
                <p className="text-gray-400 text-sm mb-4">{lang === Language.EN ? 'Get the latest updates and tips.' : 'Dapatkan update dan tips terbaru.'}</p>
                <div className="flex flex-col gap-3">
                  <input type="email" placeholder="Email" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors" />
                  <button className="bg-primary-500 hover:bg-primary-400 text-white font-bold py-3 rounded-xl text-sm transition-colors">{lang === Language.EN ? 'Subscribe' : 'Berlangganan'}</button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
              <p>© 2025 Surepath Insurtech. All rights reserved.</p>
              <div className="flex gap-6">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>License: OJK-123/2025</span>
              </div>
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

const HomePage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => {
  const [waitingListStatus, setWaitingListStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleJoin = () => {
    setWaitingListStatus('submitting');
    setTimeout(() => {
      setWaitingListStatus('success');
    }, 1500);
  };

  return (
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
                  {waitingListStatus === 'success' ? (
                    <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-8 py-4 rounded-2xl flex items-center gap-3 font-bold animate-fade-in w-full sm:w-auto">
                      <CheckCircle2 size={24} />
                      {lang === Language.EN ? "You're on the list!" : "Anda sudah terdaftar!"}
                    </div>
                  ) : (
                    <>
                      <input 
                        type="email" 
                        placeholder={lang === Language.EN ? "Enter your email address" : "Masukan alamat email anda"}
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 outline-none focus:border-primary-500 focus:bg-white/10 transition-all min-w-[300px]"
                      />
                      <button 
                        onClick={handleJoin}
                        disabled={waitingListStatus === 'submitting'}
                        className="bg-primary-500 hover:bg-primary-400 text-gray-900 font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                      >
                        {waitingListStatus === 'submitting' ? (
                          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          lang === Language.EN ? 'Join Waiting List' : 'Gabung Waiting List'
                        )}
                      </button>
                    </>
                  )}
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
};

// Helper Component for Modern Floating Inputs
const FloatingLabelInput = ({ label, value, onChange, type = "text", placeholder = "", disabled = false, className = "", maxLength }: any) => {
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
        maxLength={maxLength}
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

const CarInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState<VehicleState>({
    brand: '',
    modelCode: '',
    year: new Date().getFullYear(),
    price: 0,
    plateRegion: '2',
    plateDetails: { code: 'B', number: '', suffix: '' },
    usage: 'PERSONAL',
    condition: 'NEW',
    vin: '',
    engineNo: '',
    accessories: '',
    insuranceType: InsuranceType.COMPREHENSIVE,
    expansions: {
      flood: false,
      earthquake: false,
      srcc: false,
      terrorism: false,
      tpl: 0,
      paDriver: 0,
      paPassenger: 0,
      passengers: 1
    }
  });

  const plateCodeRef = useRef<HTMLInputElement>(null);
  const plateNumberRef = useRef<HTMLInputElement>(null);
  const plateSuffixRef = useRef<HTMLInputElement>(null);

  const brands = Array.from(new Set(CAR_DATABASE.map(c => c.brand)));
  const models = CAR_DATABASE.filter(c => c.brand === vehicle.brand);
  const years = vehicle.modelCode 
    ? Object.keys(CAR_DATABASE.find(c => c.code === vehicle.modelCode)?.yearPrices || {}).map(Number).sort((a,b) => b-a)
    : [];

  useEffect(() => {
    if (vehicle.modelCode && vehicle.year) {
      const model = CAR_DATABASE.find(c => c.code === vehicle.modelCode);
      if (model && model.yearPrices[vehicle.year]) {
        setVehicle(v => ({ ...v, price: model.yearPrices[vehicle.year] }));
      }
    }
  }, [vehicle.modelCode, vehicle.year]);

  const handlePlateChange = (part: 'code' | 'number' | 'suffix', val: string) => {
    const v = val.toUpperCase();
    // Logic to jump focus
    if (part === 'code') {
      if (v.length === 2) plateNumberRef.current?.focus();
    }
    if (part === 'number') {
      if (v.length === 4) plateSuffixRef.current?.focus();
    }

    setVehicle(prev => ({
      ...prev,
      plateDetails: { ...prev.plateDetails, [part]: v }
    }));
  };

  const calculatePremium = () => {
    if (!vehicle.price) return { total: 0, rate: 0 };
    const rate = getOJKRate(vehicle.price, vehicle.plateRegion, vehicle.insuranceType);
    const sumInsured = vehicle.price * 1000000;
    let total = sumInsured * (rate / 100);

    // Expansions
    if (vehicle.expansions.flood) total += sumInsured * (EXPANSION_RATES.FLOOD / 100);
    if (vehicle.expansions.earthquake) total += sumInsured * (EXPANSION_RATES.EARTHQUAKE / 100);
    if (vehicle.expansions.srcc) {
      const r = vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.SRCC.COMPREHENSIVE : EXPANSION_RATES.SRCC.TLO;
      total += sumInsured * (r / 100);
    }
    if (vehicle.expansions.terrorism) {
      const r = vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.TERRORISM.COMPREHENSIVE : EXPANSION_RATES.TERRORISM.TLO;
      total += sumInsured * (r / 100);
    }

    // TPL
    if (vehicle.expansions.tpl > 0) total += (vehicle.expansions.tpl * 1000000) * 0.01; // 1%

    // PA
    if (vehicle.expansions.paDriver > 0) total += (vehicle.expansions.paDriver * 1000000) * (EXPANSION_RATES.PA_DRIVER / 100);
    if (vehicle.expansions.paPassenger > 0) total += (vehicle.expansions.paPassenger * 1000000) * (EXPANSION_RATES.PA_PASSENGER / 100) * vehicle.expansions.passengers;

    return { total, rate };
  };

  const { total: premium, rate: appliedRate } = calculatePremium();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
        <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil'}</h2>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Brand' : 'Merek'}</label>
              <div className="grid grid-cols-3 gap-2">
                {brands.map(b => (
                  <button key={b} onClick={() => setVehicle({...vehicle, brand: b, modelCode: ''})} className={`p-3 rounded-xl border-2 font-bold ${vehicle.brand === b ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>{b}</button>
                ))}
              </div>
            </div>
            
            {vehicle.brand && (
              <div>
                <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Model' : 'Model'}</label>
                <select 
                  className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent"
                  value={vehicle.modelCode}
                  onChange={(e) => setVehicle({...vehicle, modelCode: e.target.value, year: 0})}
                >
                  <option value="">Select Model</option>
                  {models.map(m => <option key={m.code} value={m.code}>{m.modelName}</option>)}
                </select>
              </div>
            )}

            {vehicle.modelCode && (
              <>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Year' : 'Tahun'}</label>
                      <select 
                        className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent"
                        value={vehicle.year}
                        onChange={(e) => setVehicle({...vehicle, year: Number(e.target.value)})}
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Plate Region' : 'Wilayah Plat'}</label>
                      <select 
                        className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent"
                        value={vehicle.plateRegion}
                        onChange={(e) => setVehicle({...vehicle, plateRegion: e.target.value as any})}
                      >
                        <option value="1">Sumatra</option>
                        <option value="2">DKI/Jabar/Banten</option>
                        <option value="3">Others</option>
                      </select>
                   </div>
                </div>

                {/* License Plate Visual Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'License Plate' : 'Nomor Polisi'}</label>
                  <div className="flex gap-2 items-center">
                    <div className="w-16">
                      <input 
                        ref={plateCodeRef}
                        type="text" 
                        maxLength={2}
                        value={vehicle.plateDetails.code}
                        onChange={(e) => handlePlateChange('code', e.target.value)}
                        placeholder="B"
                        className="w-full bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-3 text-center font-mono font-bold text-lg uppercase focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <input 
                        ref={plateNumberRef}
                        type="text" 
                        maxLength={4}
                        value={vehicle.plateDetails.number}
                        onChange={(e) => handlePlateChange('number', e.target.value)}
                        placeholder="1234"
                        className="w-full bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-3 text-center font-mono font-bold text-lg focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div className="w-24">
                      <input 
                        ref={plateSuffixRef}
                        type="text" 
                        maxLength={3}
                        value={vehicle.plateDetails.suffix}
                        onChange={(e) => handlePlateChange('suffix', e.target.value)}
                        placeholder="XYZ"
                        className="w-full bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-3 text-center font-mono font-bold text-lg uppercase focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl flex justify-between items-center">
             <span>{lang === Language.EN ? 'Market Price' : 'Harga Pasar'}</span>
             <span className="text-xl font-bold">Rp {vehicle.price} Juta</span>
          </div>

          <button disabled={!vehicle.price} onClick={() => setStep(2)} className="w-full btn-luxury">{lang === Language.EN ? 'Next' : 'Lanjut'}</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setVehicle({...vehicle, insuranceType: InsuranceType.COMPREHENSIVE})} className={`p-4 border-2 rounded-xl font-bold ${vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>Comprehensive</button>
            <button onClick={() => setVehicle({...vehicle, insuranceType: InsuranceType.TLO})} className={`p-4 border-2 rounded-xl font-bold ${vehicle.insuranceType === InsuranceType.TLO ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>TLO</button>
          </div>

          <div className="space-y-3">
             <h4 className="font-bold">{lang === Language.EN ? 'Add-ons' : 'Perluasan'}</h4>
             {[
               { id: 'flood', label: 'Banjir & Topan', key: 'flood' },
               { id: 'earthquake', label: 'Gempa Bumi & Tsunami', key: 'earthquake' },
               { id: 'srcc', label: 'Huru-hara (SRCC)', key: 'srcc' },
               { id: 'terrorism', label: 'Terorisme & Sabotase', key: 'terrorism' }
             ].map((addon) => (
                <div key={addon.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-xl">
                   <span>{addon.label}</span>
                   <input 
                     type="checkbox" 
                     checked={(vehicle.expansions as any)[addon.key]}
                     onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, [addon.key]: e.target.checked}})}
                     className="w-5 h-5 accent-primary-500"
                   />
                </div>
             ))}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Third Party Liability (TPL)' : 'Tanggung Jawab Hukum Pihak Ketiga'}</label>
            <div className="grid grid-cols-3 gap-2">
               {TPL_OPTIONS.map(opt => (
                 <button key={opt} onClick={() => setVehicle({...vehicle, expansions: {...vehicle.expansions, tpl: opt}})} className={`py-2 px-1 rounded-lg text-sm font-bold border ${vehicle.expansions.tpl === opt ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-gray-200 dark:border-gray-700'}`}>
                    {opt === 0 ? 'None' : `${opt} Jt`}
                 </button>
               ))}
            </div>
          </div>

          <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl flex justify-between items-center">
             <div>
                <p className="text-sm text-gray-500">{lang === Language.EN ? 'Total Premium' : 'Total Premi'}</p>
                <p className="text-2xl font-bold text-primary-600">Rp {(premium/1000).toLocaleString()}k</p>
             </div>
             <button onClick={() => setStep(3)} className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-bold">{lang === Language.EN ? 'Review' : 'Tinjau'}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 p-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-primary-500"></div>
             <h3 className="text-2xl font-bold mb-6 text-center">{lang === Language.EN ? 'Quote Summary' : 'Ringkasan Penawaran'}</h3>
             
             <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Vehicle' : 'Kendaraan'}</span>
                   <span className="font-bold text-right">{vehicle.brand} {vehicle.year} <span className="block text-xs font-normal text-gray-400">{vehicle.plateDetails.code} {vehicle.plateDetails.number} {vehicle.plateDetails.suffix}</span></span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Model' : 'Model'}</span>
                   <span className="font-bold text-right text-xs max-w-[200px]">{CAR_DATABASE.find(c => c.code === vehicle.modelCode)?.modelName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Coverage' : 'Jaminan'}</span>
                   <div className="text-right">
                     <span className="font-bold block">{vehicle.insuranceType}</span>
                     <span className="text-xs text-primary-500">Rate: {appliedRate.toFixed(2)}%</span>
                   </div>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-gray-500">{lang === Language.EN ? 'Expansions' : 'Perluasan'}</span>
                   <span className="font-bold text-right max-w-[150px]">
                      {[
                        vehicle.expansions.flood && 'Flood',
                        vehicle.expansions.earthquake && 'EQ',
                        vehicle.expansions.srcc && 'SRCC',
                        vehicle.expansions.tpl > 0 && `TPL ${vehicle.expansions.tpl}jt`
                      ].filter(Boolean).join(', ') || '-'}
                   </span>
                </div>
                
                <div className="flex justify-between pt-4">
                   <span className="text-lg font-bold text-gray-500">{lang === Language.EN ? 'Total Premium' : 'Total Premi'}</span>
                   <span className="text-2xl font-bold text-primary-600">Rp {premium.toLocaleString()}</span>
                </div>
             </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl border border-gray-200 dark:border-white/10 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              {lang === Language.EN ? 'Edit Details' : 'Ubah Data'}
            </button>
            <button onClick={() => setStep(4)} className="flex-[2] btn-luxury">
              {lang === Language.EN ? 'Purchase Policy' : 'Beli Polis'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && <SuccessScreen lang={lang} setPage={setPage} />}
    </div>
  );
};

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
            <h3 className="text-xl font-bold mb-2">{lang === Language.EN ? 'Who is we protecting?' : 'Siapa yang dilindungi?'}</h3>
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
    { title: lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan', icon: <CatIcon size={28} />, desc: lang === Language.EN ? 'Because they are family too.' : 'Karena mereka juga keluarga.', action: () => setPage('pet-flow') },
  ];

  const enterpriseProducts = [
    { title: 'Surety Bond', icon: <Briefcase size={28}/>, desc: 'Guarantee for your projects.', action: () => {} },
    { title: 'Marine Cargo', icon: <Truck size={28}/>, desc: 'Secure logistics worldwide.', action: () => {} },
    { title: 'Marine Hull', icon: <Anchor size={28}/>, desc: 'Vessel protection.', action: () => {} },
    { title: 'Property', icon: <Home size={28}/>, desc: 'Asset protection for business.', action: () => {} },
    { title: 'Engineering', icon: <Hammer size={28}/>, desc: 'Construction & Erection risks.', action: () => {} },
    { title: 'Liability', icon: <Scale size={28}/>, desc: 'Public & Product Liability.', action: () => {} },
    { title: 'Cyber Security', icon: <Cpu size={28}/>, desc: 'Data breach & cyber attacks.', action: () => {} },
    { title: 'Heavy Equipment', icon: <Tractor size={28}/>, desc: 'Coverage for heavy machinery.', action: () => {} },
    { title: 'Group Health', icon: <Users size={28}/>, desc: 'Comprehensive health for employees.', action: () => {} },
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
              {React.isValidElement(p.icon) ? p.icon : <p.icon size={28} strokeWidth={1.5} />}
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

const CareersPage = ({ lang }: { lang: Language }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#050505] py-20 relative overflow-hidden">
    <AnimatedBackground />
    <div className="max-w-6xl mx-auto px-6 relative z-10">
      <div className="text-center mb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-sm font-medium mb-8 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          {lang === Language.EN ? 'We are hiring!' : 'Kami sedang merekrut!'}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
          {lang === Language.EN ? 'Join the Revolution' : 'Bergabunglah dalam Revolusi'}
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          {lang === Language.EN 
            ? 'We are looking for passionate individuals to help us build the future of insurance technology.'
            : 'Kami mencari individu bersemangat untuk membantu kami membangun masa depan teknologi asuransi.'}
        </p>
      </div>

      <div className="grid gap-6">
        {[
          { role: 'Senior Frontend Engineer', dept: 'Engineering', loc: 'Remote / Jakarta' },
          { role: 'AI Research Scientist', dept: 'Data Science', loc: 'Jakarta' },
          { role: 'Product Manager', dept: 'Product', loc: 'Jakarta' },
          { role: 'Insurance Underwriter', dept: 'Operations', loc: 'Jakarta' }
        ].map((job, i) => (
          <div key={i} className="bg-white/50 dark:bg-[#111]/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center hover:border-primary-500 transition-all group cursor-pointer">
            <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold mb-2">{job.role}</h3>
              <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Briefcase size={14}/> {job.dept}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> {job.loc}</span>
              </div>
            </div>
            <button className="px-6 py-3 rounded-xl bg-white dark:bg-white/10 font-bold text-sm group-hover:bg-primary-500 group-hover:text-white transition-all">
              {lang === Language.EN ? 'Apply Now' : 'Lamar Sekarang'}
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NewsroomPage = ({ lang }: { lang: Language }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#050505] py-20">
    <div className="max-w-7xl mx-auto px-6">
      <h1 className="text-4xl md:text-6xl font-bold mb-16 text-center">{lang === Language.EN ? 'Newsroom' : 'Berita Terkini'}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Surepath Raises Series A Funding', date: 'Oct 24, 2025', cat: 'Corporate' },
          { title: 'Launching AI Instant Claim Feature', date: 'Sep 15, 2025', cat: 'Product' },
          { title: 'Partnership with Top 5 Insurers in Indonesia', date: 'Aug 01, 2025', cat: 'Partnership' }
        ].map((news, i) => (
          <div key={i} className="bg-white dark:bg-[#0F0F0F] border border-gray-100 dark:border-white/5 rounded-3xl overflow-hidden hover:shadow-2xl transition-all group cursor-pointer">
            <div className="h-48 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-4 left-4 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">{news.cat}</div>
            </div>
            <div className="p-8">
              <p className="text-sm text-gray-500 mb-3">{news.date}</p>
              <h3 className="text-2xl font-bold mb-4 leading-tight group-hover:text-primary-500 transition-colors">{news.title}</h3>
              <div className="flex items-center text-sm font-bold text-gray-400 group-hover:translate-x-2 transition-transform">
                {lang === Language.EN ? 'Read Article' : 'Baca Artikel'} <ArrowRight size={16} className="ml-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ContactPage = ({ lang }: { lang: Language }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#050505] py-20 relative overflow-hidden">
    <AnimatedBackground />
    <div className="max-w-6xl mx-auto px-6 relative z-10">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{lang === Language.EN ? 'Get in Touch' : 'Hubungi Kami'}</h1>
        <p className="text-gray-500">{lang === Language.EN ? 'We are here to help you with any questions.' : 'Kami siap membantu menjawab pertanyaan Anda.'}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 bg-white/50 dark:bg-[#111]/50 backdrop-blur-xl border border-white/20 rounded-[3rem] p-8 md:p-12 shadow-2xl">
        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">{lang === Language.EN ? 'Contact Information' : 'Informasi Kontak'}</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="font-bold mb-1">{lang === Language.EN ? 'Office' : 'Kantor'}</p>
                  <p className="text-gray-500 text-sm">Surepath Tower, Level 25<br/>Jl. Jend. Sudirman Kav. 52-53<br/>Jakarta Selatan 12190</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="font-bold mb-1">Email</p>
                  <p className="text-gray-500 text-sm">support@surepath.id<br/>partners@surepath.id</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 shrink-0">
                  <Smartphone size={24} />
                </div>
                <div>
                  <p className="font-bold mb-1">{lang === Language.EN ? 'Phone' : 'Telepon'}</p>
                  <p className="text-gray-500 text-sm">+62 21 5050 8888 (Hunting)<br/>0812 3456 7890 (WhatsApp)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-100 dark:border-white/10">
          <h3 className="text-xl font-bold mb-6">{lang === Language.EN ? 'Send Message' : 'Kirim Pesan'}</h3>
          <div className="space-y-4">
            <FloatingLabelInput label={lang === Language.EN ? 'Name' : 'Nama'} />
            <FloatingLabelInput label='Email' type='email' />
            <FloatingLabelInput label={lang === Language.EN ? 'Subject' : 'Subjek'} />
            <div className="relative group">
              <textarea 
                className="w-full bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-4 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all min-h-[150px]"
                placeholder={lang === Language.EN ? 'Message...' : 'Pesan...'}
              ></textarea>
            </div>
            <button className="w-full btn-luxury">{lang === Language.EN ? 'Submit' : 'Kirim'}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

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

const AnimatedBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-gray-50 dark:bg-[#050505]">
    {/* Subtle Gradient Base */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:from-transparent dark:via-[#050505]/50 dark:to-[#050505]"></div>

    {/* Moving Grid */}
    <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05]"></div>
    
    {/* Floating Blobs - Slower, larger, more elegant */}
    <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob"></div>
    <div className="absolute top-[10%] right-[-20%] w-[600px] h-[600px] bg-accent-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-blue-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[90px] animate-blob animation-delay-4000"></div>
    
    {/* Noise Texture for texture/luxury feel */}
    <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
  </div>
);

const AboutPage = ({ lang }: { lang: Language }) => (
  <div className="relative min-h-screen overflow-hidden">
    <AnimatedBackground />
    
    <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto mb-24 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-sm font-medium mb-8 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
          {lang === Language.EN ? 'Our Vision' : 'Visi Kami'}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-tight">
          {lang === Language.EN ? 'Redefining Insurance for the Digital Age.' : 'Mendefinisikan Ulang Asuransi di Era Digital.'}
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
          {lang === Language.EN 
            ? 'We are a team of engineers, data scientists, and insurance experts building the future of financial safety. Insurance should be invisible until you need it, and magical when you do.'
            : 'Kami adalah tim insinyur, ilmuwan data, dan ahli asuransi yang membangun masa depan keamanan finansial. Asuransi harus tidak terasa sampai Anda membutuhkannya, dan ajaib saat Anda menggunakannya.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
        {[
          { val: '1k', label: lang === Language.EN ? 'Waiting List' : 'Daftar Tunggu' },
          { val: '98%', label: lang === Language.EN ? 'Claim Approval' : 'Klaim Disetujui' },
          { val: '8', label: lang === Language.EN ? 'Insurance Partners' : 'Mitra Asuransi' },
          { val: '24/7', label: lang === Language.EN ? 'Support' : 'Layanan' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 dark:bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl text-center group hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-500 hover:-translate-y-1">
            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500 mb-2">
              {stat.val}
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Core Values */}
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { icon: Lightbulb, title: lang === Language.EN ? 'Innovation First' : 'Inovasi Utama', desc: lang === Language.EN ? 'We use AI to simplify complex processes.' : 'Kami menggunakan AI untuk menyederhanakan proses rumit.' },
          { icon: Target, title: lang === Language.EN ? 'Customer Centric' : 'Fokus Pelanggan', desc: lang === Language.EN ? 'Every feature is built to solve your problems.' : 'Setiap fitur dibuat untuk menyelesaikan masalah Anda.' },
          { icon: Globe2, title: lang === Language.EN ? 'Transparency' : 'Transparansi', desc: lang === Language.EN ? 'No hidden fees. No fine print surprises.' : 'Tanpa biaya tersembunyi. Tanpa kejutan.' }
        ].map((val, i) => (
          <div key={i} className="p-8 rounded-3xl bg-white/80 dark:bg-[#0F0F0F]/80 backdrop-blur-sm border border-gray-200 dark:border-white/5 hover:border-primary-500 transition-all duration-500 group relative overflow-hidden hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10">
              <val.icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold mb-3 relative z-10">{val.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 relative z-10">{val.desc}</p>
          </div>
        ))}
      </div>
    </div>
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
