
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { Language, InsuranceType, VehicleState, UserState, TravelState, PAState, PetState, TravelRegion, TravelPlanType } from './types';
import { CAR_DATABASE, getOJKRate, EXPANSION_RATES, TPL_OPTIONS, TRAVEL_PRICING, TRAVEL_BENEFITS, PA_PLANS, PET_PLANS, PET_BREEDS, INSURANCE_PROVIDERS, AUTHORIZED_WORKSHOP_RATE, STAMP_DUTY, PROMO_CODES } from './constants';
import { analyzeVehiclePhoto, analyzeClaimPhoto } from './services/geminiService';
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
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPage('home')}>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="font-bold text-2xl tracking-tight group-hover:text-primary-400 transition-colors">Surepath</span>
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
          <div className="lg:col-span-2 lg:col-start-6">
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

          {/* Newsletter Section */}
          <div className="lg:col-span-4 md:col-span-2">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm hover:border-primary-500/30 transition-colors">
              <h4 className="font-bold text-lg mb-2">{lang === Language.EN ? 'Stay Ahead' : 'Terus Terupdate'}</h4>
              <p className="text-gray-400 text-xs mb-4">
                {lang === Language.EN 
                  ? 'Join our newsletter for the latest AI insurance trends.'
                  : 'Bergabung dengan newsletter kami untuk tren asuransi AI terbaru.'}
              </p>
              <form className="relative group flex gap-2">
                <input 
                  type="email" 
                  placeholder={lang === Language.EN ? "Email address" : "Alamat email"}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                />
                <button className="bg-primary-500 hover:bg-primary-400 text-white px-4 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-primary-500/20">
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2025 Surepath Insurtech. All rights reserved.</p>
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
    <div className="relative h-[380px] rounded-3xl overflow-hidden mb-12 bg-gray-900 shadow-2xl">
      {slides.map((slide, index) => (
        <div 
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Background with Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-20`}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
          
          {/* Content Grid */}
          <div className="relative h-full max-w-7xl mx-auto px-8 md:px-12 grid grid-cols-1 md:grid-cols-2 items-center">
            <div className={`space-y-6 ${index === currentSlide ? 'animate-fade-in' : ''} z-10`}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
                <span className="text-xs font-medium text-white uppercase tracking-wider">Featured</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                {slide.title}
              </h1>
              <p className="text-lg text-gray-300 max-w-md">
                {slide.subtitle}
              </p>
              <button 
                onClick={() => setPage(slide.action)}
                className="group flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                {slide.cta} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>

            {/* Visual Graphic Right Side */}
            <div className="hidden md:flex justify-end relative h-full items-center">
              <div className={`relative w-[280px] h-[220px] rounded-[2rem] shadow-2xl transform rotate-3 group transition-transform hover:rotate-0 duration-500 overflow-hidden border-4 border-white/10 ${index === currentSlide ? 'animate-float' : ''}`}>
                <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-tr ${slide.color} opacity-60 mix-blend-multiply`}></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                        <slide.icon size={40} className="text-white drop-shadow-md" />
                    </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 animate-pulse-slow animation-delay-2000">
                  <Shield size={20} className="text-white" />
                </div>
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-xs font-bold text-white">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
        {slides.map((_, i) => (
          <button 
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

const ProductsPage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => (
  <div className="py-12 animate-fade-in max-w-7xl mx-auto px-4">
    <h2 className="text-3xl font-bold mb-8 text-center">{lang === Language.EN ? 'Our Products' : 'Produk Kami'}</h2>
    
    {/* Retail Section */}
    <h3 className="text-xl font-bold mb-6 text-gray-500 uppercase tracking-wider text-sm">{lang === Language.EN ? 'Retail Insurance' : 'Asuransi Retail'}</h3>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      {[
        { id: 'car-flow', title: lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil', icon: Car, color: 'bg-blue-500' },
        { id: 'travel-flow', title: lang === Language.EN ? 'Travel Insurance' : 'Asuransi Travel', icon: Plane, color: 'bg-green-500' },
        { id: 'pa-flow', title: lang === Language.EN ? 'Personal Accident' : 'Asuransi Kecelakaan', icon: Stethoscope, color: 'bg-red-500' },
        { id: 'pet-flow', title: lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan', icon: CatIcon, color: 'bg-yellow-500' }
      ].map(p => (
        <div key={p.id} onClick={() => setPage(p.id)} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-8 hover:shadow-2xl transition-all hover:-translate-y-1">
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
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <p className="text-gray-500 text-xs mt-2">Tailored business protection.</p>
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
        <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Travel Type' : 'Tipe Perjalanan'}</label>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setTravel({...travel, participantType: 'INDIVIDUAL', travelers: {...travel.travelers, adults: 1, children: 0}})}
            className={`p-4 border-2 rounded-xl font-bold flex items-center justify-center gap-2 ${travel.participantType === 'INDIVIDUAL' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}
          >
            <User size={20} /> {lang === Language.EN ? 'Individual' : 'Individu'}
          </button>
          <button 
            onClick={() => setTravel({...travel, participantType: 'FAMILY'})}
            className={`p-4 border-2 rounded-xl font-bold flex items-center justify-center gap-2 ${travel.participantType === 'FAMILY' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}
          >
            <Users2 size={20} /> {lang === Language.EN ? 'Family' : 'Keluarga'}
          </button>
        </div>
        {travel.participantType === 'FAMILY' && (
          <div className="mt-4 grid grid-cols-2 gap-4">
             <div className="flex items-center justify-between p-3 border rounded-xl dark:border-gray-800">
                <span>Adults (Max 2)</span>
                <input type="number" min="1" max="2" value={travel.travelers.adults} onChange={(e) => setTravel({...travel, travelers: {...travel.travelers, adults: Number(e.target.value)}})} className="w-16 text-center bg-transparent font-bold"/>
             </div>
             <div className="flex items-center justify-between p-3 border rounded-xl dark:border-gray-800">
                <span>Children</span>
                <input type="number" min="0" value={travel.travelers.children} onChange={(e) => setTravel({...travel, travelers: {...travel.travelers, children: Number(e.target.value)}})} className="w-16 text-center bg-transparent font-bold"/>
             </div>
          </div>
        )}
      </div>

      <button disabled={!travel.duration || !travel.destination} onClick={() => setStep(2)} className="w-full btn-luxury">{lang === Language.EN ? 'View Plans' : 'Lihat Paket'}</button>
    </div>
  );

  const renderStep2 = () => {
    const plans = travel.region === 'INTERNATIONAL' 
      ? ['PLATINUM', 'GOLD', 'ASIA_EXTRA'] 
      : ['GARUDA_1', 'GARUDA_2'];

    return (
      <div className="space-y-6 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Select Plan' : 'Pilih Paket'}</h3>
        <div className="grid gap-4">
          {plans.map((planKey) => {
            const price = getPremium(planKey as TravelPlanType);
            const benefits = TRAVEL_BENEFITS[planKey as keyof typeof TRAVEL_BENEFITS];
            const isPlatinum = planKey === 'PLATINUM';
            const isGold = planKey === 'GOLD';

            return (
              <div key={planKey} className={`relative overflow-hidden p-6 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                travel.selectedPlan === planKey 
                  ? 'border-primary-500 shadow-xl shadow-primary-500/20' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                } ${isPlatinum ? 'bg-gradient-to-br from-gray-100 to-gray-300 dark:from-slate-800 dark:to-slate-600' : ''} ${isGold ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40' : 'bg-white dark:bg-white/5'}`}
                onClick={() => { setTravel({...travel, selectedPlan: planKey as TravelPlanType}); setStep(3); }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-wider">{planKey.replace('_', ' ')}</h4>
                    <p className="text-xs font-bold opacity-70">{travel.participantType} - {travel.duration} Days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">Rp {price.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between border-b border-black/10 dark:border-white/10 pb-1">
                    <span>Death/Disablement</span>
                    <span className="font-bold">{benefits.death}</span>
                  </div>
                  <div className="flex justify-between border-b border-black/10 dark:border-white/10 pb-1">
                    <span>Medical Expense</span>
                    <span className="font-bold">{benefits.medical}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {benefits.features.map(f => (
                    <span key={f} className="text-xs px-2 py-1 bg-black/5 dark:bg-white/10 rounded-lg">{f}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold">{lang === Language.EN ? 'Traveler Details' : 'Data Penumpang'}</h3>
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm flex gap-2">
        <Info className="shrink-0 text-yellow-600" size={18}/>
        <span>
          {lang === Language.EN 
            ? 'Ensure names match passports exactly. Age limits apply.' 
            : 'Pastikan nama sesuai paspor. Berlaku batas usia.'}
        </span>
      </div>

      {Array.from({ length: travel.travelers.adults }).map((_, i) => (
        <div key={`adult-${i}`} className="space-y-3 border-b border-gray-200 dark:border-white/10 pb-6">
          <h4 className="font-bold text-primary-500">Adult {i + 1}</h4>
          <FloatingLabelInput label={lang === Language.EN ? "Full Name" : "Nama Lengkap"} />
          <FloatingLabelInput label={lang === Language.EN ? "Date of Birth (YYYY-MM-DD)" : "Tanggal Lahir"} type="date" />
          <FloatingLabelInput label={lang === Language.EN ? "Passport / ID Number" : "No Paspor / KTP"} />
        </div>
      ))}

      {Array.from({ length: travel.travelers.children }).map((_, i) => (
        <div key={`child-${i}`} className="space-y-3 border-b border-gray-200 dark:border-white/10 pb-6">
          <h4 className="font-bold text-primary-500">Child {i + 1}</h4>
          <FloatingLabelInput label={lang === Language.EN ? "Full Name" : "Nama Lengkap"} />
          <FloatingLabelInput label={lang === Language.EN ? "Date of Birth (YYYY-MM-DD)" : "Tanggal Lahir"} type="date" />
        </div>
      ))}

      <button onClick={() => setStep(4)} className="w-full btn-luxury">{lang === Language.EN ? 'Review Summary' : 'Tinjau Ringkasan'}</button>
    </div>
  );

  const renderStep4 = () => {
    const premium = getPremium(travel.selectedPlan!);
    const total = premium + STAMP_DUTY;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl">
          <div className="bg-primary-600 p-6 text-white">
            <h3 className="font-bold text-xl">{lang === Language.EN ? 'Trip Summary' : 'Ringkasan Perjalanan'}</h3>
            <div className="flex justify-between items-end mt-2">
              <div>
                <p className="text-2xl font-black">{travel.destination}</p>
                <p className="opacity-90">{travel.startDate} - {travel.endDate} ({travel.duration} Days)</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">{travel.selectedPlan?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Participants</span>
              <span className="font-medium">{travel.travelers.adults} Adults, {travel.travelers.children} Children</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Premium</span>
              <span className="font-medium">Rp {premium.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stamp Duty</span>
              <span className="font-medium">Rp {STAMP_DUTY.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-black text-primary-600">Rp {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setStep(5)} className="w-full btn-luxury">{lang === Language.EN ? 'Pay Now' : 'Bayar Sekarang'}</button>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="animate-pop-in text-center py-12">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40">
        <CheckCircle2 size={48} className="text-white" />
      </div>
      <h2 className="text-4xl font-bold mb-4">{lang === Language.EN ? 'Have a Safe Trip!' : 'Selamat Jalan!'}</h2>
      <p className="text-gray-500 mb-8">{lang === Language.EN ? 'Your policy has been sent to your email.' : 'Polis Anda telah dikirim ke email.'}</p>
      <button onClick={() => setPage('home')} className="btn-luxury px-12">{lang === Language.EN ? 'Back to Home' : 'Kembali ke Beranda'}</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {step < 5 && (
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Travel Insurance' : 'Asuransi Perjalanan'}</h2>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary-500 h-full transition-all duration-500" style={{ width: `${(step/5)*100}%` }}></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-400">{step}/5</span>
        </div>
      )}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
};

// --- PERSONAL ACCIDENT WIZARD ---

const PersonalAccidentWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [pa, setPa] = useState<PAState>({ occupation: '', type: 'GENERAL', planCode: 'A' });

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Risk Profile' : 'Profil Risiko'}</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setPa({...pa, type: 'GENERAL'})} className={`p-6 border-2 rounded-2xl font-bold transition-all flex flex-col items-center gap-3 ${pa.type === 'GENERAL' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>
          <Briefcase size={32} />
          <span>{lang === Language.EN ? 'General / Worker' : 'Umum / Pekerja'}</span>
        </button>
        <button onClick={() => setPa({...pa, type: 'STUDENT'})} className={`p-6 border-2 rounded-2xl font-bold transition-all flex flex-col items-center gap-3 ${pa.type === 'STUDENT' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>
          <GraduationCap size={32} />
          <span>{lang === Language.EN ? 'Student' : 'Pelajar / Siswa'}</span>
        </button>
      </div>
      <FloatingLabelInput 
        label={lang === Language.EN ? (pa.type === 'GENERAL' ? "Occupation" : "School / University") : (pa.type === 'GENERAL' ? "Pekerjaan" : "Sekolah / Universitas")}
        value={pa.occupation}
        onChange={(e:any) => setPa({...pa, occupation: e.target.value})}
      />
      <button disabled={!pa.occupation} onClick={() => setStep(2)} className="w-full btn-luxury">{lang === Language.EN ? 'View Plans' : 'Lihat Paket'}</button>
    </div>
  );

  const renderStep2 = () => {
    const plans = PA_PLANS[pa.type];
    return (
      <div className="space-y-6 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Select Coverage' : 'Pilih Santunan'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.code} onClick={() => { setPa({...pa, planCode: plan.code}); setStep(3); }} className={`p-4 border-2 rounded-xl cursor-pointer flex justify-between items-center transition-all hover:border-primary-500 ${pa.planCode === plan.code ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>
              <div>
                <div className="font-bold text-lg">Plan {plan.code}</div>
                <div className="text-sm text-gray-500">{lang === Language.EN ? 'Benefit:' : 'Santunan:'} {plan.benefit}</div>
              </div>
              <div className="font-bold text-primary-600">Rp {plan.premium.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const plan = PA_PLANS[pa.type].find(p => p.code === pa.planCode);
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl">
          <div className="bg-primary-600 p-6 text-white">
            <h3 className="font-bold text-xl">{lang === Language.EN ? 'PA Summary' : 'Ringkasan PA'}</h3>
            <p className="opacity-90">{pa.type === 'GENERAL' ? 'General' : 'Student'} - Plan {pa.planCode}</p>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span>Occupation/School</span>
              <span className="font-bold">{pa.occupation}</span>
            </div>
            <div className="flex justify-between">
              <span>Benefit (Death/Disablement)</span>
              <span className="font-bold">{plan?.benefit}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-black text-primary-600">Rp {plan?.premium.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setStep(4)} className="w-full btn-luxury">{lang === Language.EN ? 'Pay Now' : 'Bayar Sekarang'}</button>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="animate-pop-in text-center py-12">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40">
        <CheckCircle2 size={48} className="text-white" />
      </div>
      <h2 className="text-4xl font-bold mb-4">{lang === Language.EN ? 'You are Protected!' : 'Anda Terlindungi!'}</h2>
      <p className="text-gray-500 mb-8">{lang === Language.EN ? 'Policy sent to your email.' : 'Polis dikirim ke email Anda.'}</p>
      <button onClick={() => setPage('home')} className="btn-luxury px-12">{lang === Language.EN ? 'Back to Home' : 'Kembali ke Beranda'}</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {step < 4 && (
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Personal Accident' : 'Asuransi Kecelakaan Diri'}</h2>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary-500 h-full transition-all duration-500" style={{ width: `${(step/4)*100}%` }}></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-400">{step}/4</span>
        </div>
      )}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};

// --- PET INSURANCE WIZARD ---

const PetInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [pet, setPet] = useState<PetState>({ petName: '', petType: 'DOG', breed: '', age: 1, gender: 'MALE', sterilized: false });
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Pet Profile' : 'Profil Hewan'}</h3>
      <FloatingLabelInput label={lang === Language.EN ? "Pet Name" : "Nama Hewan"} value={pet.petName} onChange={(e:any) => setPet({...pet, petName: e.target.value})} />
      
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setPet({...pet, petType: 'DOG', breed: ''})} className={`p-6 border-2 rounded-2xl font-bold transition-all flex flex-col items-center gap-3 ${pet.petType === 'DOG' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>
          <Dog size={32} />
          <span>Dog</span>
        </button>
        <button onClick={() => setPet({...pet, petType: 'CAT', breed: ''})} className={`p-6 border-2 rounded-2xl font-bold transition-all flex flex-col items-center gap-3 ${pet.petType === 'CAT' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>
          <CatIcon size={32} />
          <span>Cat</span>
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Breed</label>
        <select className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent" value={pet.breed} onChange={(e) => setPet({...pet, breed: e.target.value})}>
          <option value="">Select Breed</option>
          {PET_BREEDS[pet.petType].map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Age (Years)</label>
          <input type="number" min="0" max="15" className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent" value={pet.age} onChange={(e) => setPet({...pet, age: Number(e.target.value)})} />
        </div>
        <div className="flex items-center gap-4 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pet.sterilized} onChange={(e) => setPet({...pet, sterilized: e.target.checked})} className="w-5 h-5 accent-primary-500" />
            <span className="font-bold">Sterilized?</span>
          </label>
        </div>
      </div>

      <button disabled={!pet.petName || !pet.breed} onClick={() => setStep(2)} className="w-full btn-luxury">{lang === Language.EN ? 'Next' : 'Lanjut'}</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-4">{lang === Language.EN ? 'Select Plan' : 'Pilih Paket'}</h3>
      <div className="grid gap-4">
        {PET_PLANS.map(plan => (
          <div key={plan.id} onClick={() => { setSelectedPlan(plan); setStep(3); }} className="border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-primary-500 cursor-pointer transition-all hover:shadow-lg bg-white dark:bg-white/5">
            <div className="flex justify-between mb-4">
              <h4 className="text-xl font-bold">{plan.name}</h4>
              <span className="text-xl font-bold text-primary-600">Rp {plan.price.toLocaleString()}</span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span>Medical Limit</span><span className="font-bold">Rp {plan.benefits.medical}</span></div>
              <div className="flex justify-between"><span>Death Benefit</span><span className="font-bold">Rp {plan.benefits.death}</span></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(plan.features as string[]).map(f => <span key={f} className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">{f}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in text-center py-8">
      <div className="w-24 h-24 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 mb-6 relative">
        <ScanFace size={48} />
        {scanning && <div className="absolute inset-0 border-4 border-primary-500 rounded-full animate-ping"></div>}
      </div>
      <h3 className="text-2xl font-bold mb-2">{lang === Language.EN ? 'Pet Identification' : 'Identifikasi Hewan'}</h3>
      <p className="text-gray-500 mb-8">{lang === Language.EN ? 'We use nose print technology to identify your pet uniquely.' : 'Kami menggunakan teknologi sidik hidung untuk identifikasi unik hewan Anda.'}</p>
      
      <button 
        onClick={() => { setScanning(true); setTimeout(() => { setScanning(false); setStep(4); }, 3000); }}
        className="w-full btn-luxury"
        disabled={scanning}
      >
        {scanning ? 'Scanning...' : (lang === Language.EN ? 'Start Face/Nose Scan' : 'Mulai Scan Wajah/Hidung')}
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl">
        <div className="bg-primary-600 p-6 text-white">
          <h3 className="font-bold text-xl">{lang === Language.EN ? 'Policy Summary' : 'Ringkasan Polis'}</h3>
          <p className="opacity-90">{pet.petName} ({pet.breed})</p>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="flex justify-between"><span>Plan</span><span className="font-bold">{selectedPlan?.name}</span></div>
          <div className="flex justify-between"><span>Coverage</span><span className="font-bold">1 Year</span></div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between items-center">
            <span className="text-lg font-bold">TOTAL</span>
            <span className="text-2xl font-black text-primary-600">Rp {selectedPlan?.price.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <button onClick={() => setStep(5)} className="w-full btn-luxury">{lang === Language.EN ? 'Proceed to Payment' : 'Lanjut ke Pembayaran'}</button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-6">{lang === Language.EN ? 'Select Payment Method' : 'Pilih Pembayaran'}</h3>
      {[
        { id: 'va', label: 'Virtual Account', icon: CreditCard },
        { id: 'qris', label: 'QRIS', icon: Smartphone },
        { id: 'cc', label: 'Credit Card', icon: CardIcon }
      ].map(m => (
        <div key={m.id} onClick={() => setStep(6)} className="p-6 border-2 border-gray-200 dark:border-gray-800 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-primary-500 hover:shadow-lg transition-all bg-white dark:bg-white/5">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-primary-500">
            <m.icon size={24} />
          </div>
          <div>
            <h4 className="font-bold">{m.label}</h4>
            <p className="text-xs text-gray-500">{lang === Language.EN ? 'Instant Confirmation' : 'Konfirmasi Instan'}</p>
          </div>
          <ChevronRight className="ml-auto text-gray-400" />
        </div>
      ))}
    </div>
  );

  const renderStep6 = () => (
    <div className="animate-pop-in text-center py-12">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40">
        <Bone size={48} className="text-white" />
      </div>
      <h2 className="text-4xl font-bold mb-4">{lang === Language.EN ? 'Welcome to the Pack!' : 'Selamat Bergabung!'}</h2>
      <p className="text-gray-500 mb-8">{lang === Language.EN ? `${pet.petName} is now protected.` : `${pet.petName} sekarang terlindungi.`}</p>
      <button onClick={() => setPage('home')} className="btn-luxury px-12">{lang === Language.EN ? 'Back to Home' : 'Kembali ke Beranda'}</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {step < 6 && (
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan'}</h2>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary-500 h-full transition-all duration-500" style={{ width: `${(step/6)*100}%` }}></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-400">{step}/6</span>
        </div>
      )}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
    </div>
  );
};

// --- CLAIM WITH AI (Enhanced) ---

const ClaimWithAI = ({ lang }: { lang: Language }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [claimDetails, setClaimDetails] = useState({ date: '', location: '', description: '' });

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    setResult(null);
    setSubmitted(false);
  };

  const analyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    const res = await analyzeClaimPhoto(image);
    setResult(res.data);
    setAnalyzing(false);
  };

  const handleSubmitClaim = () => {
    if(claimDetails.date && claimDetails.location) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 animate-pop-in text-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-4">{lang === Language.EN ? 'Claim Submitted!' : 'Klaim Diajukan!'}</h2>
        <p className="text-gray-500 mb-8">{lang === Language.EN ? 'Our team will review your claim and update you shortly.' : 'Tim kami akan meninjau klaim Anda dan segera memberi kabar.'}</p>
        <button onClick={() => { setImage(null); setResult(null); setSubmitted(false); setClaimDetails({date:'', location:'', description:''}); }} className="btn-luxury px-12">{lang === Language.EN ? 'File Another Claim' : 'Ajukan Klaim Lain'}</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
           <Zap size={32} />
        </div>
        <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Instant AI Claim' : 'Klaim AI Instan'}</h2>
        <p className="text-gray-500">Upload photos of damage. Get an estimate in seconds.</p>
      </div>

      {!image ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-12 text-center hover:border-primary-500 transition-colors cursor-pointer bg-white dark:bg-white/5 relative">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Camera size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="font-bold text-lg mb-2">{lang === Language.EN ? 'Upload Damage Photo' : 'Unggah Foto Kerusakan'}</p>
          <p className="text-sm text-gray-500">Click to browse or drag & drop</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 relative">
            <img src={image} alt="Claim" className="w-full h-64 object-cover" />
            {!result && (
                <button onClick={() => { setImage(null); setResult(null); }} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"><X size={20} /></button>
            )}
          </div>

          {!result ? (
            <button onClick={analyze} disabled={analyzing} className="w-full btn-luxury">
              {analyzing ? 'Analyzing...' : (lang === Language.EN ? 'Analyze Damage' : 'Analisa Kerusakan')}
            </button>
          ) : (
            <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-200 dark:border-white/10 animate-pop-in">
              <h3 className="text-xl font-bold mb-4 border-b border-gray-100 dark:border-white/10 pb-4">Assessment Result</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-center">
                  <div className="text-sm text-red-500 font-bold uppercase mb-1">Severity</div>
                  <div className="text-xl font-black text-red-600">{result.severity}</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl text-center">
                  <div className="text-sm text-green-500 font-bold uppercase mb-1">Est. Cost</div>
                  <div className="text-xl font-black text-green-600">{result.estimatedCost}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="font-bold text-sm text-gray-500 uppercase">Detected Damage</h4>
                {result.damagePoints.map((pt: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <AlertCircle size={16} className="text-red-500" /> {pt}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-6">
                <strong>Recommendation:</strong> {result.recommendation}
              </div>

              <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                <h4 className="font-bold">{lang === Language.EN ? 'Incident Details' : 'Detail Kejadian'}</h4>
                <FloatingLabelInput label={lang === Language.EN ? "Date of Incident" : "Tanggal Kejadian"} type="date" value={claimDetails.date} onChange={(e:any) => setClaimDetails({...claimDetails, date: e.target.value})} />
                <FloatingLabelInput label={lang === Language.EN ? "Location" : "Lokasi"} value={claimDetails.location} onChange={(e:any) => setClaimDetails({...claimDetails, location: e.target.value})} />
                <textarea 
                    placeholder={lang === Language.EN ? "Brief Description..." : "Deskripsi Singkat..."} 
                    className="w-full bg-transparent border-2 border-gray-200 dark:border-gray-800 rounded-xl p-4 outline-none focus:border-primary-500 h-24"
                    value={claimDetails.description}
                    onChange={(e) => setClaimDetails({...claimDetails, description: e.target.value})}
                />
                <button 
                    onClick={handleSubmitClaim} 
                    disabled={!claimDetails.date || !claimDetails.location}
                    className="w-full btn-luxury"
                >
                    {lang === Language.EN ? 'Submit Claim' : 'Ajukan Klaim'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- CONSOLE PAGE ---

const ConsolePage = ({ lang }: { lang: Language }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Partner Console</h2>
          <p className="text-gray-500">Secure access for authorized partners.</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-gray-200 dark:border-white/10 space-y-4">
          <FloatingLabelInput label="Agent ID / Email" />
          <FloatingLabelInput label="Password" type="password" />
          <button onClick={() => setIsLoggedIn(true)} className="w-full btn-luxury py-3 mt-4">Login Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] animate-fade-in">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-6 hidden md:block">
        <div className="space-y-1">
          {[
            { label: 'Dashboard', icon: LayoutDashboard, active: true },
            { label: 'Policies', icon: FileCheck },
            { label: 'Claims', icon: AlertTriangle },
            { label: 'Analytics', icon: PieChart },
            { label: 'Settings', icon: Settings },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${item.active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <item.icon size={20} />
              <span className="font-bold text-sm">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 text-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl" onClick={() => setIsLoggedIn(false)}>
            <LogOut size={20} />
            <span className="font-bold text-sm">Logout</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Premium', val: 'Rp 1.2B', color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Active Policies', val: '142', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Commission', val: 'Rp 85M', color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat, i) => (
            <div key={i} className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Policy No</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {[1,2,3,4].map(i => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4 font-mono">SP-2025-00{i}</td>
                  <td className="px-6 py-4 font-bold">Customer {i}</td>
                  <td className="px-6 py-4">Car Insurance</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">Active</span></td>
                  <td className="px-6 py-4 font-medium">Rp 4.500.000</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- NEW/MISSING COMPONENTS ---

const ContactPage = ({ lang }: { lang: Language }) => (
  <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h2 className="text-3xl font-bold mb-4">{lang === Language.EN ? 'Contact Us' : 'Hubungi Kami'}</h2>
        <p className="text-gray-500 mb-8">{lang === Language.EN ? 'We are here to help you.' : 'Kami siap membantu Anda.'}</p>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500"><Mail size={20}/></div>
            <div>
              <div className="font-bold">Email</div>
              <div className="text-sm text-gray-500">support@surepath.com</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500"><MapPin size={20}/></div>
            <div>
              <div className="font-bold">{lang === Language.EN ? 'Office' : 'Kantor'}</div>
              <div className="text-sm text-gray-500">Jakarta, Indonesia</div>
            </div>
          </div>
        </div>
      </div>
      <form className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-gray-200 dark:border-white/10 space-y-4">
        <FloatingLabelInput label={lang === Language.EN ? "Name" : "Nama"} />
        <FloatingLabelInput label="Email" type="email" />
        <div className="pt-2">
          <textarea className="w-full bg-transparent border-2 border-gray-200 dark:border-gray-800 rounded-xl p-4 outline-none focus:border-primary-500 h-32" placeholder={lang === Language.EN ? "Message" : "Pesan"}></textarea>
        </div>
        <button className="w-full btn-luxury py-3">{lang === Language.EN ? 'Send Message' : 'Kirim Pesan'}</button>
      </form>
    </div>
  </div>
);

const AboutPage = ({ lang }: { lang: Language }) => (
  <div className="relative overflow-hidden py-20 animate-fade-in">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>
    </div>
    <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
      <h2 className="text-4xl font-bold mb-6">{lang === Language.EN ? 'About Surepath' : 'Tentang Surepath'}</h2>
      <p className="text-xl text-gray-500 mb-12 leading-relaxed">
        {lang === Language.EN 
          ? 'We are reinventing insurance with Artificial Intelligence. Our mission is to make protection simple, transparent, and instantly accessible for everyone.'
          : 'Kami menciptakan ulang asuransi dengan Kecerdasan Buatan. Misi kami adalah membuat perlindungan menjadi simpel, transparan, dan instan untuk semua orang.'}
      </p>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { label: '1k+', sub: 'Waiting List' },
          { label: '8', sub: 'Mitra Asuransi' },
          { label: '24/7', sub: 'AI Support' }
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="text-3xl font-black text-primary-500 mb-1">{stat.label}</div>
            <div className="text-sm text-gray-400">{stat.sub}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CareersPage = ({ lang }: { lang: Language }) => (
  <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
    <h2 className="text-2xl font-bold mb-4">{lang === Language.EN ? 'Careers' : 'Karir'}</h2>
    <div className="p-8 bg-white dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
      <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
      <p className="text-gray-500">{lang === Language.EN ? 'No open positions at the moment.' : 'Belum ada lowongan saat ini.'}</p>
    </div>
  </div>
);

const NewsroomPage = ({ lang }: { lang: Language }) => (
  <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
    <h2 className="text-2xl font-bold mb-8">{lang === Language.EN ? 'Newsroom' : 'Ruang Berita'}</h2>
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-6 items-start">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0"></div>
          <div>
            <div className="text-xs text-primary-500 font-bold mb-1">PRESS RELEASE</div>
            <h3 className="text-lg font-bold mb-2">Surepath Launches AI Claims 2.0</h3>
            <p className="text-sm text-gray-500">Revolutionizing the industry with computer vision...</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HomePage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if(waitlistEmail) {
        setJoinedWaitlist(true);
        setTimeout(() => setJoinedWaitlist(false), 3000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <HeroCarousel lang={lang} setPage={setPage} />

        {/* Trust Badges - Scrolling Marquee Effect */}
        <div className="py-8 border-b border-gray-200 dark:border-white/5 overflow-hidden">
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{lang === Language.EN ? 'Trusted by Industry Leaders' : 'Dipercaya oleh Pemimpin Industri'}</p>
            <div className="flex justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Mock Logos */}
                <div className="flex items-center gap-2 font-bold text-xl"><Shield className="text-primary-500"/> OJK</div>
                <div className="flex items-center gap-2 font-bold text-xl"><Globe2 className="text-blue-500"/> Kominfo</div>
                <div className="flex items-center gap-2 font-bold text-xl"><Lock className="text-green-500"/> ISO 27001</div>
                <div className="flex items-center gap-2 font-bold text-xl"><Users className="text-purple-500"/> Asosiasi Fintech</div>
            </div>
        </div>

        {/* Modern Features Grid (Bento Style) */}
        <div className="py-20">
          <div className="text-center mb-12">
             <h2 className="text-4xl font-black mb-4 tracking-tight">{lang === Language.EN ? 'Insurance Reimagined' : 'Asuransi Masa Depan'}</h2>
             <p className="text-gray-500 max-w-2xl mx-auto text-lg">{lang === Language.EN ? 'Experience the perfect blend of AI speed and human expertise.' : 'Rasakan perpaduan sempurna kecepatan AI dan keahlian manusia.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Large Card */}
             <div className="md:col-span-2 bg-gray-900 text-white rounded-[2rem] p-8 md:p-12 relative overflow-hidden group cursor-pointer" onClick={() => setPage('claim')}>
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                        <Zap size={32} className="text-yellow-400" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">{lang === Language.EN ? 'AI Instant Claim' : 'Klaim Instan AI'}</h3>
                    <p className="text-gray-400 text-lg max-w-md mb-8">{lang === Language.EN ? 'Settle claims in minutes using our advanced computer vision technology. No paperwork, just photos.' : 'Selesaikan klaim dalam hitungan menit dengan teknologi visi komputer kami. Tanpa kertas, cukup foto.'}</p>
                    <button className="bg-white text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                        {lang === Language.EN ? 'Try Demo' : 'Coba Demo'} <ArrowRight size={18}/>
                    </button>
                </div>
                {/* Abstract Visual */}
                <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-500/20 to-transparent"></div>
             </div>

             {/* Tall Card */}
             <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-primary-500 transition-all">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-500">
                    <Shield size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{lang === Language.EN ? 'Smart Protection' : 'Proteksi Pintar'}</h3>
                <p className="text-gray-500 leading-relaxed mb-6">{lang === Language.EN ? 'Dynamic coverage that adapts to your lifestyle and needs.' : 'Cakupan dinamis yang beradaptasi dengan gaya hidup Anda.'}</p>
                <div className="mt-auto">
                    <div className="h-32 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-dashed border-gray-200 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute top-4 left-4 right-4 h-2 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                        <div className="absolute top-8 left-4 right-12 h-2 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                        <div className="absolute bottom-0 right-0 text-blue-500 opacity-20">
                            <Shield size={80} />
                        </div>
                    </div>
                </div>
             </div>

             {/* Wide Card */}
             <div className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/10 dark:to-white/5 border border-primary-100 dark:border-white/10 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{lang === Language.EN ? '24/7 Expert Support' : 'Dukungan Ahli 24/7'}</h3>
                    <p className="text-gray-500 mb-6">{lang === Language.EN ? 'Real humans, ready to help when AI isn\'t enough.' : 'Manusia asli, siap membantu ketika AI saja tidak cukup.'}</p>
                    <div className="flex -space-x-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900 bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">U{i}</div>
                        ))}
                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900 bg-primary-500 flex items-center justify-center text-xs font-bold text-white">+</div>
                    </div>
                </div>
                <div className="w-full md:w-1/3 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-20 animate-pulse-slow"></div>
                        <Smartphone size={80} className="text-primary-600 dark:text-primary-400 relative z-10" />
                    </div>
                </div>
             </div>

             {/* Card */}
             <div className="md:col-span-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 flex items-center justify-between hover:border-primary-500 transition-all cursor-pointer" onClick={() => setPage('products')}>
                <div>
                    <h3 className="text-xl font-bold mb-2">{lang === Language.EN ? 'Explore All Products' : 'Lihat Semua Produk'}</h3>
                    <p className="text-gray-500">{lang === Language.EN ? 'Car, Travel, Personal Accident, Pet, and Enterprise.' : 'Mobil, Travel, Kecelakaan Diri, Hewan, dan Bisnis.'}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                    <ArrowRight size={24} />
                </div>
             </div>
          </div>
        </div>

        {/* SuperApp Teaser Section */}
        <div className="py-20 relative">
            <div className="absolute inset-0 bg-gray-900 rounded-[3rem] -skew-y-2 transform origin-left z-0"></div>
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center px-8 py-12">
                <div className="text-white space-y-8">
                    <div className="inline-block px-4 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm font-bold border border-primary-500/30">
                        {lang === Language.EN ? 'Coming Soon' : 'Segera Hadir'}
                    </div>
                    <h2 className="text-5xl font-black leading-tight">
                        Surepath <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">SuperApp</span>
                    </h2>
                    <p className="text-gray-400 text-lg">
                        {lang === Language.EN ? 'Manage all your policies, claims, and renewals in one single app. Smart notifications, seamless claims, and exclusive rewards.' : 'Kelola semua polis, klaim, dan perpanjangan dalam satu aplikasi. Notifikasi pintar, klaim lancar, dan hadiah eksklusif.'}
                    </p>
                    
                    <form onSubmit={handleJoin} className="bg-white/10 p-2 rounded-2xl border border-white/10 flex gap-2 max-w-md backdrop-blur-md">
                        <input 
                            type="email" 
                            required
                            placeholder={lang === Language.EN ? "Enter your email" : "Masukkan email Anda"}
                            className="flex-1 bg-transparent border-none outline-none px-4 text-white placeholder-gray-400"
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                        />
                        <button className={`px-6 py-3 rounded-xl font-bold transition-all ${joinedWaitlist ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
                            {joinedWaitlist ? <Check size={20} /> : (lang === Language.EN ? 'Join Waitlist' : 'Gabung Waitlist')}
                        </button>
                    </form>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex -space-x-2">
                            {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900"></div>)}
                        </div>
                        <span>1,000+ people joined</span>
                    </div>
                </div>

                <div className="relative flex justify-center">
                    {/* Realistic iPhone Mockup */}
                    <div className="relative w-[320px] h-[650px] bg-black rounded-[40px] border-[8px] border-gray-800 shadow-2xl animate-float overflow-hidden">
                        {/* Dynamic Island */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30 flex justify-end items-center px-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                        
                        {/* Screen Content */}
                        <div className="absolute inset-0 bg-[#0f172a] pt-14 px-5 pb-8 overflow-hidden font-sans text-white">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-xs text-gray-400">Welcome back,</p>
                                    <p className="text-xl font-bold">Alex</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-primary-500"></div>
                            </div>

                            {/* Balance Card */}
                            <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-5 rounded-2xl shadow-lg shadow-primary-900/50 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-medium text-white/70">Total Coverage</span>
                                    <Shield size={16} className="text-white/70" />
                                </div>
                                <h3 className="text-3xl font-bold mb-1">Rp 1.5 M</h3>
                                <p className="text-xs text-white/50">Across 3 active policies</p>
                            </div>

                            {/* Quick Actions Grid */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {[
                                    { icon: Car, label: 'Car', bg: 'bg-blue-500' },
                                    { icon: Plane, label: 'Travel', bg: 'bg-green-500' },
                                    { icon: Heart, label: 'Health', bg: 'bg-red-500' },
                                    { icon: Zap, label: 'Claim', bg: 'bg-yellow-500' }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center shadow-lg`}>
                                            <item.icon size={24} className="text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Activity */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-sm">Recent Activity</h4>
                                    <span className="text-xs text-primary-500">View All</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { title: 'Claim Approved', desc: 'Car Repair - B 1234 CD', time: '2h ago', icon: CheckCircle2, color: 'text-green-500' },
                                        { title: 'Policy Renewal', desc: 'Travel Insurance', time: '1d ago', icon: RefreshCw, color: 'text-blue-500' }
                                    ].map((act, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className={`p-2 bg-white/5 rounded-lg ${act.color}`}>
                                                <act.icon size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">{act.title}</p>
                                                <p className="text-xs text-gray-500">{act.desc}</p>
                                            </div>
                                            <span className="text-xs text-gray-600">{act.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Bar Mock */}
                            <div className="absolute bottom-6 left-5 right-5 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex justify-around items-center px-4 border border-white/5">
                                <Home size={20} className="text-primary-500" />
                                <FileText size={20} className="text-gray-500" />
                                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center -mt-8 shadow-lg border-4 border-[#0f172a]">
                                    <Zap size={20} />
                                </div>
                                <Bell size={20} className="text-gray-500" />
                                <User size={20} className="text-gray-500" />
                            </div>
                        </div>
                    </div>
                    
                    {/* Decorative Elements behind phone */}
                    <div className="absolute top-20 -right-10 w-32 h-32 bg-accent-500 rounded-full blur-3xl opacity-20 animate-pulse-slow"></div>
                    <div className="absolute bottom-20 -left-10 w-40 h-40 bg-primary-500 rounded-full blur-3xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
                </div>
            </div>
        </div>

        {/* Stats Section */}
        <div className="py-20">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Happy Customers', val: '50k+' },
                { label: 'Claims Paid', val: 'Rp 500M+' },
                { label: 'Avg Claim Time', val: '15m' },
                { label: 'Partner Workshops', val: '2,000+' }
              ].map((s, i) => (
                <div key={i} className="p-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 mb-2">{s.val}</div>
                  <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- CAR INSURANCE WIZARD (Full Implementation) ---

const CarInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

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
      authorizedWorkshop: false,
      tpl: 0,
      paDriver: 0,
      paPassenger: 0,
      passengers: 1
    },
    photos: {
      ktp: null, stnkFront: null, stnkBack: null,
      carFront: null, carBack: null, carLeft: null, carRight: null, dashboard: null, accessories: null
    },
    selectedProvider: null,
    promoCode: undefined,
    discountAmount: 0
  });

  const [user, setUser] = useState<UserState>({ name: '', ktp: '', domicile: '', email: '', phone: '', isMember: false });

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
    if (part === 'code' && v.length === 2) plateNumberRef.current?.focus();
    if (part === 'number' && v.length === 4) plateSuffixRef.current?.focus();
    setVehicle(prev => ({ ...prev, plateDetails: { ...prev.plateDetails, [part]: v } }));
  };

  const calculatePremiumDetails = () => {
    if (!vehicle.price) return { base: 0, expansions: 0, totalBeforeFees: 0 };
    
    const rate = getOJKRate(vehicle.price, vehicle.plateRegion, vehicle.insuranceType);
    const sumInsured = vehicle.price * 1000000;
    const base = sumInsured * (rate / 100);
    
    let expansionCost = 0;
    const exp = vehicle.expansions;
    
    if (exp.flood) expansionCost += sumInsured * (EXPANSION_RATES.FLOOD / 100);
    if (exp.earthquake) expansionCost += sumInsured * (EXPANSION_RATES.EARTHQUAKE / 100);
    if (exp.srcc) {
      const r = vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.SRCC.COMPREHENSIVE : EXPANSION_RATES.SRCC.TLO;
      expansionCost += sumInsured * (r / 100);
    }
    if (exp.terrorism) {
      const r = vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.TERRORISM.COMPREHENSIVE : EXPANSION_RATES.TERRORISM.TLO;
      expansionCost += sumInsured * (r / 100);
    }
    
    if (vehicle.insuranceType === InsuranceType.COMPREHENSIVE && exp.authorizedWorkshop) {
      // Corrected: Divide percentage by 100 (0.2 / 100 = 0.002)
      expansionCost += sumInsured * (AUTHORIZED_WORKSHOP_RATE / 100);
    }

    if (exp.tpl > 0) expansionCost += (exp.tpl * 1000000) * 0.01;

    if (exp.paDriver > 0) expansionCost += (exp.paDriver * 1000000) * (EXPANSION_RATES.PA_DRIVER / 100);
    if (exp.paPassenger > 0) expansionCost += (exp.paPassenger * 1000000) * (EXPANSION_RATES.PA_PASSENGER / 100) * exp.passengers;

    return { base, expansions: expansionCost, totalBeforeFees: base + expansionCost };
  };

  const { base, expansions, totalBeforeFees } = calculatePremiumDetails();

  const handleApplyPromo = () => {
    const code = promoInput.toUpperCase();
    if (PROMO_CODES[code as keyof typeof PROMO_CODES]) {
      const discountRate = PROMO_CODES[code as keyof typeof PROMO_CODES];
      const discountVal = totalBeforeFees * discountRate;
      setVehicle(v => ({ ...v, promoCode: code, discountAmount: discountVal }));
      setPromoError('');
    } else {
      setPromoError(lang === Language.EN ? 'Invalid code' : 'Kode tidak valid');
      setVehicle(v => ({ ...v, promoCode: undefined, discountAmount: 0 }));
    }
  };

  const handleAnalyze = async () => {
    setLoadingAI(true);
    setAiError(null);
    
    const requiredPhotos = [
      vehicle.photos.ktp, vehicle.photos.stnkFront, vehicle.photos.stnkBack,
      vehicle.photos.carFront, vehicle.photos.carBack, vehicle.photos.carLeft, vehicle.photos.carRight,
      vehicle.photos.dashboard
    ];

    if (requiredPhotos.some(p => !p)) {
      setLoadingAI(false);
      setAiError(lang === Language.EN ? "Please upload all 8 mandatory photos." : "Mohon unggah ke-8 foto wajib.");
      return;
    }

    const labels = ["KTP", "STNK Front", "STNK Back", "Car Front", "Car Back", "Car Left", "Car Right", "Dashboard"];
    
    const result = await analyzeVehiclePhoto(requiredPhotos as string[], labels);

    setLoadingAI(false);
    if (result.success && result.data) {
      if (result.data.score < 80) {
        setAiError(
          (lang === Language.EN ? "Verification Failed. Score: " : "Verifikasi Gagal. Skor: ") + result.data.score + "/100. " +
          (lang === Language.EN ? "Reasons: " : "Alasan: ") + (result.data.reasons?.join(", ") || result.data.damageDescription)
        );
      } else {
        setAiSuccess(true);
      }
    } else {
      setAiError(result.error || "Analysis failed");
    }
  };

  const handleFileUpload = (key: keyof VehicleState['photos'], file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setVehicle(v => ({ ...v, photos: { ...v.photos, [key]: reader.result as string } }));
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    const isValid = vehicle.brand && vehicle.modelCode && vehicle.year && vehicle.plateDetails.code && vehicle.plateDetails.number;
    if (isValid) {
        setStep(2);
        setShowErrors(false);
    } else {
        setShowErrors(true);
    }
  }

  // STEP RENDERING FUNCTIONS
  
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Brand' : 'Merek'}</label>
          <div className="grid grid-cols-3 gap-2">
            {brands.map(b => (
              <button key={b} onClick={() => setVehicle({...vehicle, brand: b, modelCode: ''})} className={`p-3 rounded-xl border-2 font-bold ${vehicle.brand === b ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800'}`}>{b}</button>
            ))}
          </div>
          {showErrors && !vehicle.brand && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
        {vehicle.brand && (
          <div>
            <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Model' : 'Model'}</label>
            <select className={`w-full p-4 rounded-xl border-2 bg-transparent ${showErrors && !vehicle.modelCode ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'}`} value={vehicle.modelCode} onChange={(e) => setVehicle({...vehicle, modelCode: e.target.value, year: 0})}>
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
                  <select className={`w-full p-4 rounded-xl border-2 bg-transparent ${showErrors && !vehicle.year ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'}`} value={vehicle.year} onChange={(e) => setVehicle({...vehicle, year: Number(e.target.value)})}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Plate Region' : 'Wilayah Plat'}</label>
                  <select className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.plateRegion} onChange={(e) => setVehicle({...vehicle, plateRegion: e.target.value as any})}>
                    <option value="1">Sumatra</option>
                    <option value="2">DKI/Jabar/Banten</option>
                    <option value="3">Others</option>
                  </select>
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'License Plate' : 'Nomor Polisi'}</label>
              <div className={`flex gap-2 items-center plate-visual p-2 rounded-xl bg-gray-100 dark:bg-gray-800 ${showErrors && (!vehicle.plateDetails.code || !vehicle.plateDetails.number) ? 'border border-red-500' : ''}`}>
                <input ref={plateCodeRef} type="text" maxLength={2} value={vehicle.plateDetails.code} onChange={(e) => handlePlateChange('code', e.target.value)} placeholder="B" className="w-16 bg-white/90 border-2 border-black rounded-lg px-2 py-3 text-center font-bold text-xl uppercase text-black" />
                <input ref={plateNumberRef} type="text" maxLength={4} value={vehicle.plateDetails.number} onChange={(e) => handlePlateChange('number', e.target.value)} placeholder="1234" className="flex-1 bg-white/90 border-2 border-black rounded-lg px-2 py-3 text-center font-bold text-xl text-black" />
                <input ref={plateSuffixRef} type="text" maxLength={3} value={vehicle.plateDetails.suffix} onChange={(e) => handlePlateChange('suffix', e.target.value)} placeholder="XYZ" className="w-24 bg-white/90 border-2 border-black rounded-lg px-2 py-3 text-center font-bold text-xl uppercase text-black" />
              </div>
            </div>
          </>
        )}
      </div>
      <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl flex justify-between items-center">
          <span>{lang === Language.EN ? 'Market Price' : 'Harga Pasar'}</span>
          <span className="text-xl font-bold">Rp {vehicle.price} Juta</span>
      </div>
      <button onClick={validateStep1} className="w-full btn-luxury">{lang === Language.EN ? 'Next' : 'Lanjut'}</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
        <button onClick={() => setVehicle({...vehicle, insuranceType: InsuranceType.COMPREHENSIVE})} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Comprehensive</button>
        <button onClick={() => setVehicle({...vehicle, insuranceType: InsuranceType.TLO})} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${vehicle.insuranceType === InsuranceType.TLO ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>TLO</button>
      </div>

      <div className="space-y-4">
          <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider">{lang === Language.EN ? 'Add-ons' : 'Perluasan'}</h4>
          {[
            { id: 'flood', label: 'Flood & Storm', labelId: 'Banjir & Topan', key: 'flood', icon: CloudRain },
            { id: 'earthquake', label: 'Earthquake', labelId: 'Gempa Bumi', key: 'earthquake', icon: Activity },
            { id: 'srcc', label: 'Riot & Strike', labelId: 'Huru-hara', key: 'srcc', icon: AlertTriangle },
            { id: 'terrorism', label: 'Terrorism', labelId: 'Terorisme', key: 'terrorism', icon: Shield }
          ].map((addon: any) => (
            <div key={addon.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <addon.icon size={18} />
                    </div>
                    <span className="font-medium">{lang === Language.EN ? addon.label : addon.labelId}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={(vehicle.expansions as any)[addon.key]} onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, [addon.key]: e.target.checked}})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
            </div>
          ))}
          
          {vehicle.insuranceType === InsuranceType.COMPREHENSIVE && (
            <div className="flex items-center justify-between p-4 border border-primary-200 dark:border-primary-900 rounded-2xl bg-primary-50 dark:bg-primary-900/10">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600">
                      <Wrench size={18} />
                  </div>
                  <span className="font-medium">{lang === Language.EN ? 'Authorized Workshop (0.2%)' : 'Bengkel Resmi (0.2%)'}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={vehicle.expansions.authorizedWorkshop} onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, authorizedWorkshop: e.target.checked}})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          )}
      </div>

      <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-white/10">
        <div>
          <label className="block text-sm font-bold mb-4 flex justify-between">
              <span>TPL Limit (Juta)</span>
              <span className="text-primary-500">{vehicle.expansions.tpl === 0 ? 'None' : `${vehicle.expansions.tpl} Juta`}</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="50" 
            step="10" 
            value={vehicle.expansions.tpl} 
            onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, tpl: Number(e.target.value)}})}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0</span>
              <span>50</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">PA Driver (Juta)</label>
            <select className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.expansions.paDriver} onChange={(e) => setVehicle(v => ({...v, expansions: {...v.expansions, paDriver: Number(e.target.value)}}))}>
              {[0, 10, 25, 50].map(val => <option key={val} value={val}>{val === 0 ? 'None' : val}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">PA Pass (Juta/Pax)</label>
            <select className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.expansions.paPassenger} onChange={(e) => setVehicle(v => ({...v, expansions: {...v.expansions, paPassenger: Number(e.target.value)}}))}>
              {[0, 10, 25, 50].map(val => <option key={val} value={val}>{val === 0 ? 'None' : val}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
        <Ticket size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder={lang === Language.EN ? "Enter Promo Code" : "Masukkan Kode Promo"} 
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm font-medium uppercase"
        />
        <button onClick={handleApplyPromo} className="text-primary-600 font-bold text-sm hover:underline">Apply</button>
      </div>
      {promoError && <p className="text-red-500 text-xs ml-2">{promoError}</p>}
      {vehicle.promoCode && <p className="text-green-500 text-xs font-bold ml-2">{lang === Language.EN ? 'Discount Applied!' : 'Diskon Terpasang!'} (-Rp {vehicle.discountAmount?.toLocaleString()})</p>}

      <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">{lang === Language.EN ? 'Premium Estimate' : 'Estimasi Premi'}</p>
            <p className="text-2xl font-bold text-primary-600">Rp {(Math.max(0, totalBeforeFees - (vehicle.discountAmount || 0))).toLocaleString()}</p>
          </div>
          <button onClick={() => setStep(3)} className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-bold">{lang === Language.EN ? 'Select Provider' : 'Pilih Provider'}</button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold">{lang === Language.EN ? 'Select Provider' : 'Pilih Asuransi'}</h3>
      <div className="grid gap-4">
        {INSURANCE_PROVIDERS.map(prov => {
          const total = Math.max(0, totalBeforeFees + prov.adminFee + STAMP_DUTY - (vehicle.discountAmount || 0));
          return (
            <div key={prov.id} onClick={() => { setVehicle({...vehicle, selectedProvider: prov}); setStep(4); }} className="p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-primary-500 cursor-pointer transition-all bg-white dark:bg-white/5 hover:shadow-lg group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-600 dark:text-white">
                    <prov.logo size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{prov.name}</h4>
                    <div className="flex items-center gap-1 text-sm text-yellow-500"><Star size={12} fill="currentColor" /> {prov.rating}</div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">Rp {total.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{lang === Language.EN ? 'Incl. Fees' : 'Termasuk Biaya'}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {prov.features.map(f => <span key={f} className="text-xs bg-gray-100 dark:bg-black/50 px-2 py-1 rounded text-gray-600 dark:text-gray-400">{f}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold">{lang === Language.EN ? 'Personal Details' : 'Data Diri'}</h3>
      <FloatingLabelInput label={lang === Language.EN ? "Full Name (KTP)" : "Nama Lengkap (KTP)"} value={user.name} onChange={(e:any) => setUser({...user, name: e.target.value})} />
      <FloatingLabelInput label="NIK / KTP" value={user.ktp} onChange={(e:any) => setUser({...user, ktp: e.target.value})} maxLength={16} />
      <FloatingLabelInput label="Email" type="email" value={user.email} onChange={(e:any) => setUser({...user, email: e.target.value})} />
      <FloatingLabelInput label={lang === Language.EN ? "Phone / WA" : "No. HP / WA"} value={user.phone} onChange={(e:any) => setUser({...user, phone: e.target.value})} />
      <FloatingLabelInput label={lang === Language.EN ? "Domicile Address" : "Alamat Domisili"} value={user.domicile} onChange={(e:any) => setUser({...user, domicile: e.target.value})} />
      
      <button disabled={!user.name || !user.email} onClick={() => setStep(5)} className="w-full btn-luxury">{lang === Language.EN ? 'Continue' : 'Lanjut'}</button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">{lang === Language.EN ? 'Vehicle Verification' : 'Verifikasi Kendaraan'}</h3>
        <p className="text-gray-500 text-sm">{lang === Language.EN ? 'Upload 8 required photos for AI analysis.' : 'Unggah 8 foto wajib untuk analisis AI.'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { k: 'ktp', l: 'KTP' }, { k: 'stnkFront', l: 'STNK Depan' }, 
          { k: 'stnkBack', l: 'STNK Belakang' }, { k: 'dashboard', l: 'Dashboard' },
          { k: 'carFront', l: 'Depan' }, { k: 'carBack', l: 'Belakang' },
          { k: 'carLeft', l: 'Kiri' }, { k: 'carRight', l: 'Kanan' }
        ].map((item) => (
          <div key={item.k} className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center relative overflow-hidden hover:border-primary-500 transition-colors bg-white dark:bg-white/5">
            {(vehicle.photos as any)[item.k] ? (
              <img src={(vehicle.photos as any)[item.k]} alt={item.l} className="w-full h-full object-cover" />
            ) : (
              <>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(item.k as any, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Camera className="text-gray-400 mb-2" />
                <span className="text-xs font-bold text-gray-500">{item.l}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {aiError && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertTriangle className="shrink-0" size={20} />
          <div>
            <p className="font-bold">{lang === Language.EN ? 'Verification Failed' : 'Verifikasi Gagal'}</p>
            <p>{aiError}</p>
            <p className="mt-2 text-xs opacity-80">{lang === Language.EN ? 'Please retake photos or contact support.' : 'Mohon foto ulang atau hubungi CS.'}</p>
          </div>
        </div>
      )}

      {aiSuccess ? (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl text-center animate-pop-in">
            <CheckCircle2 className="mx-auto text-green-500 mb-2" size={32} />
            <p className="font-bold text-green-700 dark:text-green-300">{lang === Language.EN ? 'Verification Successful!' : 'Verifikasi Berhasil!'}</p>
            <button onClick={() => setStep(6)} className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
                {lang === Language.EN ? 'Next' : 'Lanjut'}
            </button>
        </div>
      ) : (
        <button 
            onClick={handleAnalyze} 
            disabled={loadingAI}
            className="w-full btn-luxury"
        >
            {loadingAI ? (
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {lang === Language.EN ? 'Analyzing...' : 'Menganalisis...'}
            </div>
            ) : (
            <div className="flex items-center gap-2">
                <Zap size={18} /> {lang === Language.EN ? 'Analyze Photos' : 'Analisa Foto'}
            </div>
            )}
        </button>
      )}
    </div>
  );

  const renderStep6 = () => {
    if (!vehicle.selectedProvider) return null;
    const prov = vehicle.selectedProvider;
    const finalTotal = Math.max(0, totalBeforeFees + prov.adminFee + STAMP_DUTY - (vehicle.discountAmount || 0));
    const authWorkshopCost = vehicle.price * 1000000 * (AUTHORIZED_WORKSHOP_RATE / 100);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl">
          <div className="bg-primary-600 p-6 text-white flex justify-between items-center">
            <div>
              <h3 className="font-bold text-xl">{lang === Language.EN ? 'Final Quote' : 'Penawaran Final'}</h3>
              <p className="text-sm opacity-80">{vehicle.brand} {vehicle.modelCode}</p>
            </div>
            <div className="bg-white text-primary-600 p-2 rounded-lg">
              <prov.logo size={24} />
            </div>
          </div>
          
          <div className="p-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Base Premium ({vehicle.insuranceType})</span>
              <span className="font-medium">Rp {base.toLocaleString()}</span>
            </div>
            
            {vehicle.expansions.authorizedWorkshop && (
              <div className="flex justify-between">
                <span className="text-gray-500">Auth. Workshop ({AUTHORIZED_WORKSHOP_RATE}%)</span>
                <span className="font-medium">Rp {authWorkshopCost.toLocaleString()}</span>
              </div>
            )}
            
            {expansions - (vehicle.expansions.authorizedWorkshop ? authWorkshopCost : 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Other Expansions (Flood, PA, etc)</span>
                <span className="font-medium">Rp {(expansions - (vehicle.expansions.authorizedWorkshop ? authWorkshopCost : 0)).toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-200 dark:border-gray-800 my-2"></div>

            <div className="flex justify-between">
              <span className="text-gray-500">Admin Fee ({prov.name})</span>
              <span className="font-medium">Rp {prov.adminFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stamp Duty (Materai)</span>
              <span className="font-medium">Rp {STAMP_DUTY.toLocaleString()}</span>
            </div>
            
            {vehicle.discountAmount && vehicle.discountAmount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Discount ({vehicle.promoCode})</span>
                <span className="font-bold">- Rp {vehicle.discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-black text-primary-600">Rp {finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setStep(4)} className="py-4 rounded-xl border border-gray-200 dark:border-white/10 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">{lang === Language.EN ? 'Edit' : 'Ubah'}</button>
          <button onClick={() => setStep(7)} className="btn-luxury">{lang === Language.EN ? 'Checkout' : 'Bayar'}</button>
        </div>
      </div>
    );
  };

  const renderStep7 = () => (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold mb-6">{lang === Language.EN ? 'Select Payment Method' : 'Pilih Pembayaran'}</h3>
      {[
        { id: 'va', label: 'Virtual Account', icon: CreditCard },
        { id: 'qris', label: 'QRIS', icon: Smartphone },
        { id: 'cc', label: 'Credit Card (0% Installment)', icon: CardIcon }
      ].map(m => (
        <div key={m.id} onClick={() => setStep(8)} className="p-6 border-2 border-gray-200 dark:border-gray-800 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-primary-500 hover:shadow-lg transition-all bg-white dark:bg-white/5">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-primary-500">
            <m.icon size={24} />
          </div>
          <div>
            <h4 className="font-bold">{m.label}</h4>
            <p className="text-xs text-gray-500">{lang === Language.EN ? 'Instant Confirmation' : 'Konfirmasi Instan'}</p>
          </div>
          <ChevronRight className="ml-auto text-gray-400" />
        </div>
      ))}
    </div>
  );

  const renderStep8 = () => (
    <div className="animate-pop-in text-center py-12">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40">
        <CheckCircle2 size={48} className="text-white" />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none">
         {[...Array(20)].map((_,i) => <div key={i} className="confetti-piece animate-confetti" style={{left: `${Math.random()*100}%`, animationDelay: `${Math.random()}s`, backgroundColor: ['#10b981', '#84cc16', '#3b82f6'][Math.floor(Math.random()*3)]}}></div>)}
      </div>

      <h2 className="text-4xl font-bold mb-4">{lang === Language.EN ? 'Policy Issued!' : 'Polis Terbit!'}</h2>
      <p className="text-gray-500 mb-8">{lang === Language.EN ? 'Thank you for trusting Surepath.' : 'Terima kasih telah mempercayai Surepath.'}</p>
      
      <div className="bg-white dark:bg-white/10 p-6 rounded-2xl max-w-sm mx-auto mb-8 border border-gray-200 dark:border-white/10">
        <p className="text-sm text-gray-500 mb-2">{lang === Language.EN ? 'Policy Number' : 'Nomor Polis'}</p>
        <p className="text-2xl font-mono font-bold tracking-widest">SP-{new Date().getFullYear()}-{Math.floor(Math.random()*10000)}</p>
      </div>

      <button onClick={() => setPage('home')} className="btn-luxury px-12">{lang === Language.EN ? 'Back to Home' : 'Kembali ke Beranda'}</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {step < 8 && (
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => step > 1 ? setStep(step-1) : setPage('products')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft/></button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{lang === Language.EN ? 'Car Insurance' : 'Asuransi Mobil'}</h2>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary-500 h-full transition-all duration-500" style={{ width: `${(step/8)*100}%` }}></div>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-400">{step}/8</span>
        </div>
      )}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
      {step === 7 && renderStep7()}
      {step === 8 && renderStep8()}
    </div>
  );
};

// --- MAIN APP COMPONENT ---

function App() {
  const [lang, setLang] = useState<Language>(Language.ID);
  const [darkMode, setDarkMode] = useState(true);
  const [currentPage, setPage] = useState('home');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handlePageChange = (page: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(page);
      setIsLoading(false);
    }, 600);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <HomePage setPage={handlePageChange} lang={lang} />;
      case 'products': return <ProductsPage setPage={handlePageChange} lang={lang} />;
      case 'car-flow': return <CarInsuranceWizard lang={lang} setPage={handlePageChange} />;
      case 'travel-flow': return <TravelInsuranceWizard lang={lang} setPage={handlePageChange} />;
      case 'pa-flow': return <PersonalAccidentWizard lang={lang} setPage={handlePageChange} />;
      case 'pet-flow': return <PetInsuranceWizard lang={lang} setPage={handlePageChange} />;
      case 'claim': return <ClaimWithAI lang={lang} />;
      case 'contact': return <ContactPage lang={lang} />;
      case 'about': return <AboutPage lang={lang} />;
      case 'careers': return <CareersPage lang={lang} />;
      case 'newsroom': return <NewsroomPage lang={lang} />;
      case 'console': return <ConsolePage lang={lang} />;
      default: return <HomePage setPage={handlePageChange} lang={lang} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-500 selection:bg-primary-500 selection:text-white">
      
      {isLoading && (
        <div className="page-loader">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <Navbar 
        lang={lang} 
        setLang={setLang} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        currentPage={currentPage}
        setPage={handlePageChange}
      />
      <main className="flex-grow relative">
        {renderContent()}
      </main>
      
      {currentPage === 'home' && (
        <Footer lang={lang} setPage={handlePageChange} />
      )}
    </div>
  );
}

export default App;
