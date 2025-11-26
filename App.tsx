
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { Language, CarModelData, InsuranceType, VehicleState, UserState, TravelState, PAState, PetState, Provider, TravelRegion, TravelParticipantType, TravelPlanType, TravelerDetails } from './types';
import { CAR_DATABASE, getOJKRate, LOCATIONS, EXPANSION_RATES, TPL_OPTIONS, TRAVEL_PRICING, TRAVEL_BENEFITS, PA_PLANS, PET_PLANS, INSURANCE_PROVIDERS, AUTHORIZED_WORKSHOP_RATE, STAMP_DUTY, PROMO_CODES } from './constants';
import { analyzeVehiclePhoto } from './services/geminiService';
import { Camera, Upload, Check, Shield, Zap, Truck, Anchor, Home, Car, Heart, Briefcase, ChevronRight, Search, MapPin, ChevronLeft, CreditCard, Info, AlertCircle, Smartphone, Bell, User, Wallet, Navigation, XCircle, RefreshCw, AlertTriangle, X, FileText, PenTool, Star, Mail, CheckCircle2, Plane, GraduationCap, Stethoscope, Dog, Users, Lightbulb, Target, Globe2, Hammer, Scale, Cpu, Tractor, Newspaper, TrendingUp, ArrowRight, Lock, CreditCard as CardIcon, Calendar, Users2 } from 'lucide-react';

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

const FloatingLabelInput = ({ label, value, onChange, type = "text", maxLength, className }: any) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`relative border-2 border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-white/5 transition-colors focus-within:border-primary-500 ${className}`}>
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none text-gray-400 ${focused || value ? 'top-2 text-xs' : 'top-4 text-base'}`}>{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        onFocus={() => setFocused(true)} 
        onBlur={() => setFocused(false)} 
        maxLength={maxLength}
        className="w-full bg-transparent px-4 pt-6 pb-2 outline-none rounded-xl" 
      />
    </div>
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
      icon: Zap
    },
    {
      title: lang === Language.EN ? "Comprehensive Travel Protection" : "Perlindungan Perjalanan Lengkap",
      subtitle: lang === Language.EN ? "Travel confidently with worldwide coverage." : "Bepergian dengan tenang ke seluruh dunia.",
      cta: lang === Language.EN ? "Explore Plans" : "Lihat Paket",
      action: 'travel-flow',
      color: "from-blue-500 to-indigo-600",
      icon: Plane
    },
    {
      title: lang === Language.EN ? "Vehicle Verification" : "Verifikasi Kendaraan Pintar",
      subtitle: lang === Language.EN ? "Just snap photos. We do the rest." : "Cukup foto mobil Anda. Kami urus sisanya.",
      cta: lang === Language.EN ? "Get Quote" : "Dapatkan Penawaran",
      action: 'car-flow',
      color: "from-purple-500 to-pink-600",
      icon: Camera
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
            <div className={`space-y-6 ${index === currentSlide ? 'animate-fade-in' : ''}`}>
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
            <div className="hidden md:flex justify-end relative">
              <div className={`relative w-64 h-64 bg-gradient-to-br ${slide.color} rounded-[2rem] shadow-2xl flex items-center justify-center transform rotate-6 group transition-transform hover:rotate-0 duration-500 border border-white/10 backdrop-blur-xl ${index === currentSlide ? 'animate-float' : ''}`}>
                <div className="absolute inset-0 bg-white/10 rounded-[2rem]"></div>
                <slide.icon size={80} className="text-white drop-shadow-lg" />
                
                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 animate-pulse-slow animation-delay-2000">
                  <Shield size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-4 -left-8 w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 animate-pulse-slow">
                  <Star size={32} className="text-yellow-300 fill-yellow-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
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
        { title: 'Surety Bond', icon: FileText, color: 'bg-indigo-500' },
        { title: 'Marine Cargo', icon: Anchor, color: 'bg-blue-600' },
        { title: 'Marine Hull', icon: ShipIcon, color: 'bg-cyan-500' },
        { title: 'Property', icon: Home, color: 'bg-orange-500' },
        { title: 'Group Health', icon: Users, color: 'bg-rose-500' },
        { title: 'Engineering', icon: Hammer, color: 'bg-slate-500' },
        { title: 'Liability', icon: Scale, color: 'bg-emerald-600' },
        { title: 'Cyber Security', icon: Cpu, color: 'bg-violet-500' },
        { title: 'Heavy Equipment', icon: Tractor, color: 'bg-amber-600' },
      ].map((p, i) => (
        <div key={i} className="cursor-pointer group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-6 hover:border-primary-500 transition-all">
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
    // Simple logic to map duration to price band
    const regionData = TRAVEL_PRICING[travel.region] as any;
    const typeKey = travel.participantType; // INDIVIDUAL or FAMILY
    
    // Handle Inbound specific logic if needed, or map back to INDIVIDUAL as it lacks Family table in simple mock
    const pricingTable = (travel.region === 'INBOUND' || travel.region === 'DOMESTIC') && typeKey === 'FAMILY' 
      ? regionData['INDIVIDUAL'] // Fallback or specific logic
      : regionData[typeKey];

    if (!pricingTable) return 0;

    const duration = travel.duration;
    const band = pricingTable.find((b: any) => duration <= b.maxDays) || pricingTable[pricingTable.length - 1];
    
    let basePrice = band.rates[plan] || 0;

    // Additional Child Logic for Family Plan (>2 children)
    if (travel.participantType === 'FAMILY' && travel.travelers.children > 2) {
      const extraChildren = travel.travelers.children - 2;
      // Find individual rate for calculation
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

const PersonalAccidentWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => (
  <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-fade-in">
    <Stethoscope size={64} className="mx-auto text-primary-500 mb-6" />
    <h2 className="text-2xl font-bold mb-4">{lang === Language.EN ? 'Personal Accident' : 'Asuransi Kecelakaan Diri'}</h2>
    <p className="text-gray-500 mb-8">Coming soon.</p>
    <button onClick={() => setPage('products')} className="btn-luxury">Back</button>
  </div>
);

const PetInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => (
  <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-fade-in">
    <CatIcon size={64} className="mx-auto text-primary-500 mb-6" />
    <h2 className="text-2xl font-bold mb-4">{lang === Language.EN ? 'Pet Insurance' : 'Asuransi Hewan Peliharaan'}</h2>
    <p className="text-gray-500 mb-8">Coming soon.</p>
    <button onClick={() => setPage('products')} className="btn-luxury">Back</button>
  </div>
);

const ClaimWithAI = ({ lang }: { lang: Language }) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
           <Zap size={32} />
        </div>
        <h2 className="text-3xl font-bold mb-2">{lang === Language.EN ? 'Instant AI Claim' : 'Klaim AI Instan'}</h2>
        <p className="text-gray-500">Upload photos of damage. Get an estimate in seconds.</p>
      </div>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-12 text-center hover:border-primary-500 transition-colors cursor-pointer bg-white dark:bg-white/5">
        <Camera size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="font-bold text-lg mb-2">{lang === Language.EN ? 'Upload Photos' : 'Unggah Foto'}</p>
        <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
      </div>
    </div>
  );
};

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
    </div>
    <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
      <h2 className="text-4xl font-bold mb-6">{lang === Language.EN ? 'About Surepath' : 'Tentang Surepath'}</h2>
      <p className="text-xl text-gray-500 mb-12 leading-relaxed">
        {lang === Language.EN 
          ? 'We are reinventing insurance with Artificial Intelligence. Our mission is to make protection simple, transparent, and instant for everyone.'
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

const ConsolePage = ({ lang }: { lang: Language }) => (
  <div className="max-w-md mx-auto py-20 px-4 animate-fade-in text-center">
    <Lock size={48} className="mx-auto text-gray-400 mb-6" />
    <h2 className="text-2xl font-bold mb-4">Partner Console</h2>
    <p className="text-gray-500 mb-8">Please login to access the dashboard.</p>
    <button className="btn-luxury w-full">Login</button>
  </div>
);

// --- HOME PAGE ---

const HomePage = ({ setPage, lang }: { setPage: (p: string) => void, lang: Language }) => (
  <div className="animate-fade-in">
    <div className="max-w-7xl mx-auto px-4 pt-6">
      <HeroCarousel lang={lang} setPage={setPage} />
      
      {/* Features Section */}
      <div className="py-16">
        <div className="text-center mb-12">
           <h2 className="text-3xl font-bold mb-4">{lang === Language.EN ? 'Why Surepath?' : 'Mengapa Surepath?'}</h2>
           <p className="text-gray-500 max-w-2xl mx-auto">{lang === Language.EN ? 'We combine advanced AI technology with human expertise to provide the best protection for you.' : 'Kami menggabungkan teknologi AI canggih dengan keahlian manusia untuk memberikan perlindungan terbaik bagi Anda.'}</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
           {[
             { title: lang === Language.EN ? 'AI Claims' : 'Klaim AI', desc: lang === Language.EN ? 'Instant assessment using computer vision.' : 'Penilaian instan menggunakan computer vision.', icon: Zap },
             { title: lang === Language.EN ? 'Best Rates' : 'Harga Terbaik', desc: lang === Language.EN ? 'Dynamic pricing based on real data.' : 'Harga dinamis berdasarkan data real-time.', icon: TrendingUp },
             { title: lang === Language.EN ? '24/7 Support' : 'Support 24/7', desc: lang === Language.EN ? 'Always here when you need us.' : 'Selalu ada saat Anda membutuhkan.', icon: Heart }
           ].map((f, i) => (
             <div key={i} className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-primary-500 transition-colors">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mb-6">
                  <f.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
             </div>
           ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-12 border-t border-gray-200 dark:border-white/5">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Happy Customers', val: '50k+' },
              { label: 'Claims Paid', val: 'Rp 500M+' },
              { label: 'Avg Claim Time', val: '15m' },
              { label: 'Partner Workshops', val: '2,000+' }
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{s.val}</div>
                <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{s.label}</div>
              </div>
            ))}
         </div>
      </div>
    </div>
  </div>
);

// --- CAR INSURANCE WIZARD (Full Implementation) ---

const CarInsuranceWizard = ({ lang, setPage }: { lang: Language, setPage: (p:string) => void }) => {
  const [step, setStep] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

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
        setStep(6);
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
        </div>
        {vehicle.brand && (
          <div>
            <label className="block text-sm font-medium mb-2">{lang === Language.EN ? 'Model' : 'Model'}</label>
            <select className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.modelCode} onChange={(e) => setVehicle({...vehicle, modelCode: e.target.value, year: 0})}>
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
                  <select className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.year} onChange={(e) => setVehicle({...vehicle, year: Number(e.target.value)})}>
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
              <div className="flex gap-2 items-center plate-visual p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
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
      <button disabled={!vehicle.price} onClick={() => setStep(2)} className="w-full btn-luxury">{lang === Language.EN ? 'Next' : 'Lanjut'}</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setVehicle({...vehicle, insuranceType: InsuranceType.COMPREHENSIVE})} className={`p-4 border-2 rounded-xl font-bold ${vehicle.insuranceType === InsuranceType.COMPREHENSIVE ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>Comprehensive</button>
        <button onClick={() => setVehicle({...vehicle, insuranceType: InsuranceType.TLO})} className={`p-4 border-2 rounded-xl font-bold ${vehicle.insuranceType === InsuranceType.TLO ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>TLO</button>
      </div>

      <div className="space-y-3">
          <h4 className="font-bold">{lang === Language.EN ? 'Main Add-ons' : 'Perluasan Utama'}</h4>
          {[
            { id: 'flood', label: 'Banjir & Topan', key: 'flood' },
            { id: 'earthquake', label: 'Gempa Bumi & Tsunami', key: 'earthquake' },
            { id: 'srcc', label: 'Huru-hara (SRCC)', key: 'srcc' },
            { id: 'terrorism', label: 'Terorisme & Sabotase', key: 'terrorism' }
          ].map((addon) => (
            <label key={addon.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                <span>{addon.label}</span>
                <input type="checkbox" checked={(vehicle.expansions as any)[addon.key]} onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, [addon.key]: e.target.checked}})} className="w-5 h-5 accent-primary-500" />
            </label>
          ))}
          
          {vehicle.insuranceType === InsuranceType.COMPREHENSIVE && (
            <label className="flex items-center justify-between p-3 border border-primary-200 dark:border-primary-900 rounded-xl bg-primary-50 dark:bg-primary-900/10 cursor-pointer">
              <span>{lang === Language.EN ? 'Authorized Workshop (0.2%)' : 'Bengkel Resmi (0.2%)'}</span>
              <input type="checkbox" checked={vehicle.expansions.authorizedWorkshop} onChange={(e) => setVehicle({...vehicle, expansions: {...vehicle.expansions, authorizedWorkshop: e.target.checked}})} className="w-5 h-5 accent-primary-500" />
            </label>
          )}
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/10">
        <div>
          <label className="block text-sm font-medium mb-2">TPL Limit (Juta)</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TPL_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setVehicle({...vehicle, expansions: {...vehicle.expansions, tpl: opt}})} className={`px-4 py-2 rounded-lg text-sm font-bold border whitespace-nowrap ${vehicle.expansions.tpl === opt ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-gray-200 dark:border-gray-700'}`}>{opt === 0 ? 'None' : `${opt}`}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">PA Driver (Juta)</label>
            <select className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.expansions.paDriver} onChange={(e) => setVehicle(v => ({...v, expansions: {...v.expansions, paDriver: Number(e.target.value)}}))}>
              {[0, 10, 25, 50].map(val => <option key={val} value={val}>{val === 0 ? 'None' : val}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">PA Pass (Juta/Pax)</label>
            <select className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent" value={vehicle.expansions.paPassenger} onChange={(e) => setVehicle(v => ({...v, expansions: {...v.expansions, paPassenger: Number(e.target.value)}}))}>
              {[0, 10, 25, 50].map(val => <option key={val} value={val}>{val === 0 ? 'None' : val}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder={lang === Language.EN ? "Promo Code" : "Kode Promo"} 
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          className="flex-1 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 uppercase"
        />
        <button onClick={handleApplyPromo} className="bg-gray-900 dark:bg-white text-white dark:text-black px-4 rounded-xl font-bold text-sm">Apply</button>
      </div>
      {promoError && <p className="text-red-500 text-xs">{promoError}</p>}
      {vehicle.promoCode && <p className="text-green-500 text-xs font-bold">{lang === Language.EN ? 'Discount Applied!' : 'Diskon Terpasang!'} (-Rp {vehicle.discountAmount?.toLocaleString()})</p>}

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

  // Page transition effect
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

  const footerLinks = [
    { label: lang === Language.EN ? 'About Us' : 'Tentang Kami', action: 'about' },
    { label: lang === Language.EN ? 'Careers' : 'Karir', action: 'careers' },
    { label: lang === Language.EN ? 'Newsroom' : 'Berita', action: 'newsroom' },
    { label: lang === Language.EN ? 'Contact' : 'Hubungi Kami', action: 'contact' },
  ];

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
                    onClick={() => handlePageChange(item.action)}
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

export default App;
