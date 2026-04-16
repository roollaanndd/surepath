
import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, ShieldCheck, Zap, 
  Cpu, Globe, Radio, Activity, Fingerprint, 
  ArrowRight, Sparkles, BrainCircuit, Scan 
} from 'lucide-react';

function SurePathLogoIcon({ size, className }: any) {
  return (
    <img 
      src="/logo.png" 
      alt="SurePath Logo" 
      width={100} 
      height={100} 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

interface OnboardingFlowProps {
  onComplete: () => void;
  lang: 'ID' | 'EN';
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, lang }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      title: lang === 'ID' ? "Selamat Datang di SurePath" : "Welcome to SurePath Family",
      desc: lang === 'ID' 
        ? "SurePath lebih dari sekadar asuransi. Kami adalah sahabat digital yang melindungi aset Anda setiap saat." 
        : "SurePath is more than insurance. We are your digital companion protecting your assets 24/7.",
      icon: SurePathLogoIcon,
      tech: "PROTECTION_INIT",
      color: "text-primary-500"
    },
    {
      title: lang === 'ID' ? "Perlindungan Pintar" : "Smart Protection",
      desc: lang === 'ID' 
        ? "Sistem kami memantau risiko 24/7. Dari penundaan penerbangan hingga bantuan darurat, kami siap membantu." 
        : "Our system monitors risks 24/7. From flight delays to emergency assistance, we are ready to help.",
      icon: Radio,
      tech: "ACTIVE_MONITORING",
      color: "text-blue-400"
    },
    {
      title: lang === 'ID' ? "Klaim Cepat 60 Detik" : "60-Second Fast Claim",
      desc: lang === 'ID' 
        ? "Lupakan formulir manual. Teknologi pintar kami memproses klaim kerusakan secara instan melalui kamera ponsel Anda." 
        : "Forget manual forms. Our smart tech processes damage claims instantly through your smartphone camera.",
      icon: Scan,
      tech: "INSTANT_CLAIM",
      color: "text-rose-400"
    },
    {
      title: lang === 'ID' ? "Mulai Sekarang" : "Start Now",
      desc: lang === 'ID' 
        ? "Siap untuk melangkah? Masuk ke aplikasi untuk mengaktifkan perlindungan Anda sekarang." 
        : "Ready to proceed? Enter the app to activate your protection now.",
      icon: Zap,
      tech: "READY_TO_START",
      color: "text-amber-400"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('SUREPATH_ONBOARDING_COMPLETED', 'true');
      onComplete();
    }, 500);
  };

  return (
    <div className={`fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`w-full max-w-xl glass-titan rounded-[4rem] border-2 border-white/20 shadow-[0_80px_120px_-30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-700 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'}`}>
        
        <div className="p-8 border-b border-white/5 bg-white/5">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary-500 animate-ping"></div>
                 <span className="text-[0.6rem] font-black text-gray-400 uppercase tracking-[0.4em]">Welcome Tour</span>
              </div>
              <button onClick={finish} className="text-[0.6rem] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                 Skip <X size={14}/>
              </button>
           </div>
           <div className="flex gap-2">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-700 ${i <= currentStep ? 'bg-primary-500 shadow-[0_0_15px_#10b981]' : 'bg-white/10'}`}></div>
              ))}
           </div>
        </div>

        <div className="flex-1 p-12 space-y-10 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center space-y-8 relative z-10">
             <div className={`w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center ${steps[currentStep].color} shadow-inner border border-white/10 animate-float`}>
                {React.createElement(steps[currentStep].icon, { size: 56, strokeWidth: 1.5 })}
             </div>
             <div className="space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter text-midnight leading-none">{steps[currentStep].title}</h3>
                <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-md mx-auto">{steps[currentStep].desc}</p>
             </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 rounded-[2rem] border border-black/5 shadow-inner px-8">
             <BrainCircuit size={16} className="text-primary-500 animate-pulse"/>
             <p className="text-[0.6rem] font-mono text-gray-400 uppercase tracking-widest">
                SYSTEM: {steps[currentStep].tech}
             </p>
          </div>
        </div>

        <div className="p-10 border-t border-black/5 bg-gray-50/50 flex items-center justify-between gap-6">
           <button 
             onClick={() => currentStep > 0 && setCurrentStep(s => s - 1)}
             className={`p-5 rounded-full transition-all border border-black/5 ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'bg-white text-gray-400 hover:text-midnight hover:shadow-lg active:scale-90'}`}
           >
              <ChevronLeft size={28}/>
           </button>
           
           <button 
             onClick={handleNext}
             className="px-12 py-6 bg-midnight text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl flex items-center gap-6 transition-all hover:bg-primary-600 active:scale-95 group"
           >
              {currentStep === steps.length - 1 ? (lang === 'ID' ? 'Mulai Sekarang' : 'Get Started') : (lang === 'ID' ? 'Lanjut' : 'Next')}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform text-primary-400"/>
           </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
