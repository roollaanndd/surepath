
import React, { useState, useEffect, useRef } from 'react';
import Navbar, { SurePathLogo } from './components/Navbar';
import { Language, InsuranceType, VehicleState, UserState, TravelState, PAState, PetState, TravelRegion, TravelPlanType } from './types';
import { CAR_DATABASE, getOJKRate, EXPANSION_RATES, TPL_OPTIONS, TRAVEL_PRICING, TRAVEL_BENEFITS, PA_PLANS, PET_PLANS, PET_BREEDS, INSURANCE_PROVIDERS, AUTHORIZED_WORKSHOP_RATE, STAMP_DUTY, PROMO_CODES } from './constants';
// Fixed: Corrected function name to match the exported member from geminiService (analyzeVehicleSurvey instead of analyzeVehicleVerification)
import { analyzeVehicleSurvey, analyzeClaimPhoto } from './services/geminiService';
import { Camera, Shield, Zap, Anchor, Home, Car, ChevronRight, MapPin, ChevronLeft, CreditCard, Info, AlertCircle, Smartphone, Bell, User, X, FileText, Star, Mail, CheckCircle2, Plane, GraduationCap, Stethoscope, Dog, Users, Globe2, Hammer, Scale, Cpu, Tractor, ArrowRight, Lock, CreditCard as CardIcon, Users2, ScanFace, CloudRain, Activity, Wrench, Ticket, LayoutDashboard, FileCheck, PieChart, Settings, LogOut, Bone, Facebook, Linkedin, Instagram, Twitter, AlertTriangle, Check, RefreshCw, Heart, Briefcase } from 'lucide-react';

// --- HELPER COMPONENTS ---

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
    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26.61.25.9.75.68 1.42-.13.37-.29.76-.48 1.15C21.92 7.2 22 9.3 22 10c0 6-6 11-10 11S2 16 2 10c0-.7.08-2.8 1.38-4.43-.19-.39-.35-.78-.48-1.15-.22-.67.07-1.17.68-1.42C5.01 2.25 8.26 3.09 10 5.26c.65-.17 1.33-.26 2-.26z" />
    <path d="M9 11v2" />
    <path d="M15 11v2" />
    <path d="M8 15h8" />
    <path d="M4 9s2-1 3-1" />
    <path d="M20 9s-2-1-3-1" />
  </svg>
);

const FloatingLabelInput = ({ label, value, onChange, type = "text", maxLength, className, error }: any) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`relative ${className || ''}`}>
        <div className={`relative border-2 ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} rounded-xl bg-white dark:bg-white/5 transition-colors focus-within:border-primary-500`}>
        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${error ? 'text-red-500' : 'text-gray-400'} ${focused || value ? 'top-2 text-xs' : 'top-4 text-base'}`}>{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={onChange} 
            onFocus={() => setFocused(true)} 
            onBlur={() => setFocused(false)} 
            maxLength={maxLength}
            className="w-full bg-transparent px-4 pt-6 pb-2 outline-none rounded-xl dark:text-white" 
        />
        </div>
        {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
};

const Footer = ({ lang, setPage }: { lang: Language, setPage: (p: string) => void }) => {
  const footerLinks = [
    { label: lang === Language.EN ? 'About Us' : 'Tentang Kami', action: 'about' },
    { label: lang === Language.EN ? 'Careers' : 'Karir', action: 'careers' },
    { label: lang === Language.EN ? 'Newsroom' : 'Berita', action: 'newsroom' },
    { label: lang === Language.EN ? 'Contact' : 'Hubungi Kami', action: 'contact' },
  ];

  const productLinks = [
    { label: lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil', action: 'car-flow' },
    { label: lang === Language.EN ? 'Travel Insurance' : 'Asuransi Travel', action: 'travel-flow' },
    { label: lang === Language.EN ? 'Personal Accident' : 'Kecelakaan Diri', action: 'pa-flow' },
    { label: lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan', action: 'pet-flow' },
    { label: lang === Language.EN ? 'Enterprise' : 'Korporat', action: 'products' },
  ];

  return (
    <footer className="relative bg-black text-white pt-20 pb-10 overflow-hidden animate-fade-in">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          {/* Brand & Vision */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPage('home')}>
              <SurePathLogo className="w-12 h-12 group-hover:scale-105 transition-transform duration-300" />
              <span className="font-black text-3xl tracking-tighter group-hover:text-primary-400 transition-colors">Sure<span className="text-primary-500">Path</span></span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {lang === Language.EN 
                ? 'Pioneering the future of insurance with AI. We make protection simple, transparent, and instantly accessible for everyone.'
                : 'Memelopori masa depan asuransi dengan AI. Kami membuat perlindungan menjadi sederhana, transparan, dan dapat diakses secara instan untuk semua orang.'}
            </p>
            <div className="flex gap-3 pt-2">
              {[Twitter, Linkedin, Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-110 hover:text-primary-400 border border-white/5">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 lg:col-start-7">
            <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-xs">{lang === Language.EN ? 'Company' : 'Perusahaan'}</h4>
            <ul className="space-y-3">
              {footerLinks.map(item => (
                <li key={item.action}>
                  <button 
                    onClick={() => setPage(item.action)}
                    className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-xs">{lang === Language.EN ? 'Products' : 'Produk'}</h4>
            <ul className="space-y-3">
              {productLinks.map(item => (
                <li key={item.action}>
                  <button 
                    onClick={() => setPage(item.action)}
                    className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2025 SurePath Insurtech. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <span className="flex items-center gap-1"><Shield size={12} className="text-primary-500"/> OJK Reg.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const HeroCarousel = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      title: lang === Language.EN ? "AI-Powered Claims" : "Klaim Instan dengan AI",
      subtitle: lang === Language.EN ? "Settle your claims in seconds, not days." : "Selesaikan klaim dalam hitungan detik.",
      cta: lang === Language.EN ? "Try Demo" : "Coba Demo",
      action: 'claim',
      color: "from-emerald-500 to-teal-600",
      icon: Zap,
      image: "https://images.unsplash.com/photo-1625047509168-a7026f36de04?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: lang === Language.EN ? "Comprehensive Travel Protection" : "Perlindungan Perjalanan Lengkap",
      subtitle: lang === Language.EN ? "Travel confidently with worldwide coverage." : "Bepergian dengan tenang ke seluruh dunia.",
      cta: lang === Language.EN ? "Explore Plans" : "Lihat Paket",
      action: 'travel-flow',
      color: "from-blue-500 to-indigo-600",
      icon: Plane,
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: lang === Language.EN ? "Vehicle Verification" : "Verifikasi Kendaraan Pintar",
      subtitle: lang === Language.EN ? "Just snap photos. We do the rest." : "Cukup foto mobil Anda. Kami urus sisanya.",
      cta: lang === Language.EN ? "Get Quote" : "Dapatkan Penawaran",
      action: 'car-flow',
      color: "from-purple-500 to-pink-600",
      icon: Camera,
      image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800&auto=format&fit=crop"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[600px] md:h-[380px] rounded-[2rem] overflow-hidden mb-8 md:mb-12 bg-gray-900 shadow-2xl">
      {slides.map((slide, index) => (
        <div 
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Background Image for Mobile and Desktop */}
          <div className="absolute inset-0">
             <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
             {/* Stronger Mobile Gradient */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent md:hidden"></div>
          </div>

          {/* Desktop Backgrounds */}
          <div className={`hidden md:block absolute inset-0 bg-gradient-to-br ${slide.color} opacity-20`}></div>
          <div className="hidden md:block absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          
          {/* Content Grid */}
          <div className="relative h-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 items-end md:items-center pb-16 md:pb-0">
            <div className={`space-y-4 md:space-y-6 ${index === currentSlide ? 'animate-fade-in' : ''} z-10`}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Featured</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight drop-shadow-xl">
                {slide.title}
              </h1>
              <p className="text-base md:text-lg text-gray-300 max-w-md font-medium drop-shadow-md leading-relaxed">
                {slide.subtitle}
              </p>
              <button 
                onClick={() => setPage(slide.action)}
                className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 w-full md:w-fit justify-center shadow-xl mt-4"
              >
                {slide.cta} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>

            {/* Visual Graphic Right Side (Desktop Only) */}
            <div className="hidden md:flex justify-end relative h-full items-center">
              <div className={`relative w-[280px] h-[220px] rounded-[2rem] shadow-2xl transform rotate-3 group transition-transform hover:rotate-0 duration-500 overflow-hidden border-4 border-white/10 ${index === currentSlide ? 'animate-float' : ''}`}>
                <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-tr ${slide.color} opacity-60 mix-blend-multiply`}></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                        <slide.icon size={40} className="text-white drop-shadow-md" />
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Dots */}
      <div className="absolute top-6 right-6 md:top-auto md:bottom-6 md:left-6 md:right-auto flex md:flex-row flex-col gap-3 z-20">
        {slides.map((_, i) => (
          <button 
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`rounded-full transition-all duration-300 shadow-md border border-white/20 ${i === currentSlide ? 'w-2 h-8 md:w-8 md:h-1.5 bg-white' : 'w-2 h-2 md:w-2 md:h-2 bg-white/40 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
};

const ProductsPage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => (
  <div className="py-8 md:py-12 animate-fade-in max-w-7xl mx-auto px-4">
    <h2 className="text-3xl font-bold mb-8 text-center">{lang === Language.EN ? 'Our Products' : 'Produk Kami'}</h2>
    
    {/* Retail Section */}
    <h3 className="text-xl font-bold mb-6 text-gray-500 uppercase tracking-wider text-sm">{lang === Language.EN ? 'Retail Insurance' : 'Asuransi Retail'}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
      {[
        { id: 'car-flow', title: lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil', icon: Car, color: 'bg-blue-500' },
        { id: 'travel-flow', title: lang === Language.EN ? 'Travel Insurance' : 'Asuransi Travel', icon: Plane, color: 'bg-green-500' },
        { id: 'pa-flow', title: lang === Language.EN ? 'Personal Accident' : 'Asuransi Kecelakaan', icon: Stethoscope, color: 'bg-red-500' },
        { id: 'pet-flow', title: lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan', icon: CatIcon, color: 'bg-yellow-500' }
      ].map(p => (
        <div key={p.id} onClick={() => setPage(p.id)} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-6 md:p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className={`w-14 h-14 ${p.color} bg-opacity-10 rounded-2xl flex items-center justify-center mb-6 text-${p.color.replace('bg-', '')}`}>
            {p.id === 'pet-flow' ? <CatIcon size={28} className="text-yellow-500" /> : <p.icon size={28} className={p.color.replace('bg-', 'text-')} />}
          </div>
          <h3 className="text-xl font-bold mb-2">{p.title}</h3>
          <p className="text-gray-500 text-sm mb-6">{lang === Language.EN ? 'Comprehensive coverage powered by AI.' : 'Perlindungan lengkap didukung oleh AI.'}</p>
          <div className="flex items-center text-sm font-bold text-primary-500">
            {lang === Language.EN ? 'Learn More' : 'Lihat Detail'} <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      ))}
    </div>

    {/* Enterprise Section */}
    <h3 className="text-xl font-bold mb-6 text-gray-500 uppercase tracking-wider text-sm">{lang === Language.EN ? 'Enterprise Solutions' : 'Solusi Bisnis'}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {[
        { id: 'surety', title: 'Surety Bond', icon: FileText, color: 'bg-indigo-500' },
        { id: 'cargo', title: 'Marine Cargo', icon: Anchor, color: 'bg-blue-600' },
        { id: 'hull', title: 'Marine Hull', icon: ShipIcon, color: 'bg-cyan-500' },
        { id: 'property', title: 'Property', icon: Home, color: 'bg-orange-500' },
        { id: 'health', title: 'Group Health', icon: Users, color: 'bg-rose-500' },
        { id: 'engineering', title: 'Engineering', icon: Hammer, color: 'bg-slate-500' },
        { id: 'liability', title: 'Liability', icon: Scale, color: 'bg-emerald-600' },
        { id: 'cyber', title: 'Cyber Security', icon: Cpu, color: 'bg-violet-500' },
        { id: 'heavy', title: 'Heavy Equipment', icon: Tractor, color: 'bg-amber-600' },
      ].map((p, i) => (
        <div key={p.id} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-6 hover:border-primary-500 transition-all">
          <div className={`w-12 h-12 ${p.color} bg-opacity-10 rounded-xl flex items-center justify-center mb-4 text-${p.color.replace('bg-', '')}`}>
            <p.icon size={24} className={p.color.replace('bg-', 'text-')} />
          </div>
          <h3 className="text-lg font-bold">{p.title}</h3>
          <p className="text-gray-500 text-sm mt-2">Tailored business protection.</p>
        </div>
      ))}
    </div>
  </div>
);

// Mock component for ShipIcon
const ShipIcon = Anchor;

// --- TRAVEL INSURANCE WIZARD ---

const TravelInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [travel, setTravel] = useState<TravelState>({
    destination: '',
    region: 'INTERNATIONAL',
    startDate: '',
    endDate: '',
    duration: 0,
    tripType: 'SINGLE',
    participantType: 'INDIVIDUAL',
    travelers: { adults: 1, children: 0, details: [] },
    selectedPlan: null
  });

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
  };

  useEffect(() => {
    setTravel(prev => ({ ...prev, duration: calculateDuration(prev.startDate, prev.endDate) }));
  }, [travel.startDate, travel.endDate]);

  const getPremium = (plan: TravelPlanType) => {
    const regionData = TRAVEL_PRICING[travel.region] as any;
    const typeKey = travel.participantType; 
    
    const pricingTable = (travel.region === 'INBOUND' || travel.region === 'DOMESTIC') && typeKey === 'FAMILY' 
      ? regionData['INDIVIDUAL'] 
      : regionData[typeKey];

    if (!pricingTable) return 0;

    const duration = travel.duration;
    const band = pricingTable.find((b: any) => duration <= b.maxDays) || pricingTable[pricingTable.length - 1];
    
    let basePrice = band.rates[plan] || 0;

    if (travel.participantType === 'FAMILY' && travel.travelers.children > 2) {
      const extraChildren = travel.travelers.children - 2;
      const indTable = regionData['INDIVIDUAL'];
      const indBand = indTable.find((b: any) => duration <= b.maxDays) || indTable[indTable.length - 1];
      const indPrice = indBand.rates[plan] || 0;
      basePrice += (indPrice * extraChildren);
    }

    return basePrice;
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Trip Details' : 'Detail Perjalanan'}</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Destination Region' : 'Wilayah Tujuan'}</label>
          <select 
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent"
            value={travel.region}
            onChange={(e) => setTravel({...travel, region: e.target.value as TravelRegion})}
          >
            <option value="INTERNATIONAL">International (Outbound)</option>
            <option value="DOMESTIC">Domestic (Indonesia)</option>
            <option value="INBOUND">Inbound (To Indonesia)</option>
          </select>
        </div>
        <FloatingLabelInput 
          label={lang === Language.EN ? 'Destination City/Country' : 'Kota/Negara Tujuan'} 
          value={travel.destination} 
          onChange={(e:any) => setTravel({...travel, destination: e.target.value})} 
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Start Date' : 'Tanggal Mulai'}</label>
          <input 
            type="date" 
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent dark:text-white"
            value={travel.startDate}
            onChange={(e) => setTravel({...travel, startDate: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'End Date' : 'Tanggal Selesai'}</label>
          <input 
            type="date" 
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent dark:text-white"
            value={travel.endDate}
            onChange={(e) => setTravel({...travel, endDate: e.target.value})}
          />
        </div>
      </div>

      {travel.duration > 0 && (
        <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl text-center">
          <p className="text-sm text-gray-500">{lang === Language.EN ? 'Duration' : 'Durasi'}</p>
          <p className="text-2xl font-bold text-primary-600">{travel.duration} {lang === Language.EN ? 'Days' : 'Hari'}</p>
        </div>
      )}

      <div>
