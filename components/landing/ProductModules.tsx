
import React, { useState } from 'react';
import { Section, Badge, GlassCard, Button } from '../shared/UI';
import { 
  Zap, Users, ShieldCheck, 
  ArrowRight, Box, Command,
  Shield, Globe, Heart, Anchor, Car, Plane,
  Info, Lock, Building2, Scale
} from 'lucide-react';
import { SurePathLogo } from '../Navbar';
import ProductAIExplainer from '../ProductAIExplainer';
import { Language } from '../../types';

const ProductModules = ({ lang }: { lang: Language }) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const t = (en: string, id: string) => lang === 'EN' ? en : id;

  const retailProducts = [
    { id: 'auto', title: "Auto Matrix", desc: "AI-driven vehicle protection with instant visual damage assessment and neural underwriting.", icon: Car, color: "text-blue-500", tag: "RETAIL_01" },
    { id: 'travel', title: "Travel Sync", desc: "Worldwide coverage with parametric flight delay automation and global emergency nodes.", icon: Plane, color: "text-emerald-500", tag: "RETAIL_02" },
    { id: 'pa', title: "Accident Core", desc: "Personal protection with 60-second neural auditing for accidental risks and medical payouts.", icon: Shield, color: "text-rose-500", tag: "RETAIL_03" },
    { id: 'mpar', title: "Property Shield", desc: "All-risk protection for gadgets, electronics, and valuable assets using computer vision verification.", icon: Box, color: "text-amber-500", tag: "RETAIL_04" },
    { id: 'health', title: "Health Sync", desc: "Biometric-synced health coverage with digital hospital passes and AI health assistant integration.", icon: Heart, color: "text-pink-500", tag: "RETAIL_05" }
  ];

  const corpProducts = [
    { id: 'fleet', title: "Fleet Node", desc: "Unified protection for company fleets with real-time telematics and automated dispatch sync.", icon: Building2, color: "text-indigo-500", tag: "CORP_01" },
    { id: 'cyber', title: "Cyber Shield", desc: "Enterprise-grade protection against data breaches, ransomware, and digital asset threats.", icon: Lock, color: "text-slate-800", tag: "CORP_02" },
    { id: 'liability', title: "Liability Sync", desc: "Public and professional liability protection for modern enterprises and tech-driven firms.", icon: Scale, color: "text-emerald-700", tag: "CORP_03" },
    { id: 'marine', title: "Marine Hub", desc: "AI-monitored protection for logistics, cargo, and marine hull assets with satellite tracking.", icon: Anchor, color: "text-blue-700", tag: "CORP_04" },
    { id: 'employee', title: "Benefit Grid", desc: "Dynamic group health and life benefits for optimized workforce scaling and employee well-being.", icon: Users, color: "text-teal-600", tag: "CORP_05" }
  ];

  return (
    <Section className="bg-[#fafaf9] dark:bg-[#050505] overflow-hidden relative border-y border-slate-100 dark:border-white/5">
      {selectedProduct && (
        <ProductAIExplainer 
          productName={selectedProduct} 
          lang={lang} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      <div className="absolute top-1/4 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="text-center mb-24 space-y-4 relative z-10">
        <Badge variant="brand">{t("Product Ecosystem", "Ekosistem Produk")}</Badge>
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
          Protection <span className="text-emerald-500">Modules.</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
          {t("Choose a specialized neural module to deploy protection for your personal assets or enterprise infrastructure.", 
             "Pilih modul neural khusus untuk memasang proteksi bagi aset pribadi atau infrastruktur bisnis Anda.")}
        </p>
      </div>

      <div className="space-y-32 relative z-10">
        {/* --- RETAIL SECTION --- */}
        <div className="space-y-12">
          <div className="flex items-center gap-6 px-4">
             <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{t("Retail", "Individu")} <span className="text-emerald-500">Matrix</span></h3>
             <div className="flex-1 h-px bg-slate-200 dark:bg-white/5"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {retailProducts.map((p, i) => (
              <ProductCard key={i} p={p} onDetail={() => setSelectedProduct(p.title)} />
            ))}
          </div>
        </div>

        {/* --- CORPORATE SECTION --- */}
        <div className="space-y-12">
          <div className="flex items-center gap-6 px-4">
             <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{t("Corporate", "Bisnis")} <span className="text-blue-500">Solutions</span></h3>
             <div className="flex-1 h-px bg-slate-200 dark:bg-white/5"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {corpProducts.map((p, i) => (
              <ProductCard key={i} p={p} theme="blue" onDetail={() => setSelectedProduct(p.title)} />
            ))}
          </div>
        </div>

        {/* --- CORE PRODUCT CTA --- */}
        <div className="relative group pt-12">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-500 rounded-[4.5rem] blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative bg-white dark:bg-slate-950 rounded-[4rem] border border-emerald-500/20 shadow-2xl overflow-hidden">
            <div className="grid lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 p-10 md:p-20 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-emerald-400 shadow-xl border border-white/10">
                    <Command size={32} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.5em] text-emerald-500">Global Infrastructure</span>
                </div>
                <h3 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                  AI Distribution <br/><span className="text-emerald-500">Omni-Engine</span>
                </h3>
                <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {t("The central nervous system of SurePath. It automates underwriting, pricing, and distribution across all modules with zero human interference.", 
                     "Sistem saraf pusat SurePath. Mengotomatisasi persetujuan, harga, dan distribusi di seluruh modul tanpa campur tangan manusia.")}
                </p>
                <div className="flex gap-4">
                  <Button size="lg" variant="brand" onClick={() => setSelectedProduct("AI Distribution Omni-Engine")} icon={ArrowRight}>
                    {t("Audit Engine Specs", "Audit Spesifikasi Mesin")}
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/50 h-full min-h-[350px] flex items-center justify-center relative border-l border-slate-100 dark:border-white/5">
                <div className="w-48 h-48 bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl flex items-center justify-center relative border-2 border-emerald-500/20 animate-float">
                  <SurePathLogo className="w-20 h-20" />
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary-500 text-white rounded-2xl shadow-xl flex items-center justify-center animate-pulse">
                     <Zap size={24} fill="currentColor"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

const ProductCard = ({ p, theme = "emerald", onDetail }: any) => {
  const colorClass = theme === "emerald" ? "group-hover:border-emerald-500/40" : "group-hover:border-blue-500/40";
  const iconBg = theme === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-500";
  
  return (
    <div 
      onClick={onDetail}
      className={`group p-8 bg-white dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-white/5 transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-2 cursor-pointer flex flex-col items-start ${colorClass}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${iconBg}`}>
        <p.icon size={28} />
      </div>
      <div className="mb-4">
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">{p.tag}</span>
        <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1 leading-tight group-hover:text-primary-500 transition-colors">{p.title}</h4>
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-xs leading-relaxed flex-1">
        {p.desc}
      </p>
      <div className="mt-8 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-500 transition-colors">
        {p.title.includes("AI") ? "View Specs" : "Read Details"} <Info size={12} />
      </div>
    </div>
  );
};

export default ProductModules;
