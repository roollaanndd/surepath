
import React, { useState, useEffect } from 'react';
import Hero from './landing/Hero';
import Features from './landing/Features';
import ProductModules from './landing/ProductModules';
import { Language } from '../types';
import { Section, Button, Badge, GlassCard } from './shared/UI';
import { 
  ArrowRight, LogIn, ShieldCheck, Zap, Smartphone, 
  CheckCircle, Clock, Mail, Phone, MapPin, 
  Twitter, Linkedin, Instagram, Facebook, ArrowUp,
  Globe, ExternalLink
} from 'lucide-react';
import { SurePathLogo } from './Navbar';

interface DesktopWebsiteProps {
  onEnterPortal: (mode?: 'LOGIN' | 'REGISTER') => void;
  onAdminAccess: () => void;
  currentLang: Language;
  onLangChange: (l: Language) => void;
}

const DesktopWebsite: React.FC<DesktopWebsiteProps> = ({ onEnterPortal, currentLang }) => {
  const t = (en: string, idn: string) => currentLang === Language.EN ? en : idn;

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#080707] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-700 overflow-x-hidden">
      
      {/* Dynamic Hero Section */}
      <Hero 
        lang={currentLang === Language.EN ? 'EN' : 'ID'} 
        onAction={() => onEnterPortal('REGISTER')} 
      />

      {/* Trust Bar (Partners) */}
      <div className="py-12 border-y border-slate-100 dark:border-white/5 bg-white/50 dark:bg-black/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] w-full text-center mb-4 text-slate-400">{t("Our Strategic Reinsurance Partners", "Mitra Strategis Reasuransi Kami")}</p>
           <div className="flex items-center gap-3 font-black text-xl italic uppercase">Zurich</div>
           <div className="flex items-center gap-3 font-black text-xl italic uppercase">Tugu</div>
           <div className="flex items-center gap-3 font-black text-xl italic uppercase">Intra Asia</div>
           <div className="flex items-center gap-3 font-black text-xl italic uppercase">Swiss Re</div>
        </div>
      </div>

      {/* Features & Ecosystem Section */}
      <Features lang={currentLang === Language.EN ? 'EN' : 'ID'} />

      {/* NEW PRODUCT MODULES SECTION (Integrated from specialized component) */}
      <ProductModules lang={currentLang} />

      {/* Dashboard Call to Action */}
      <Section className="bg-white dark:bg-[#0c0c0c]">
         <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="inline-flex items-center gap-4 p-4 bg-brand-500 rounded-[2rem] text-white shadow-xl animate-float">
               <Zap size={40} fill="currentColor"/>
            </div>
            <div className="space-y-6">
               <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-tight">
                  {t("Ready to step onto", "Siap melangkah ke")} <br/>
                  <span className="text-brand-500">{t("The Neural Path?", "Jalur Neural?")}</span>
               </h2>
               <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
                  {t(
                    "Join over 50,000 users who have switched to a smarter, faster way of managing protection. No documents, no delays.", 
                    "Bergabunglah dengan lebih dari 50.000 pengguna yang telah beralih ke cara cerdas dan cepat dalam mengelola proteksi. Tanpa dokumen, tanpa tunda."
                  )}
               </p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
               <Button size="xl" onClick={() => onEnterPortal('REGISTER')} icon={ArrowRight}>
                  {t("Join Now", "Daftar Sekarang")}
               </Button>
               <button 
                  onClick={() => onEnterPortal('LOGIN')}
                  className="px-12 py-6 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-3 border border-black/5"
               >
                  <LogIn size={18}/>
                  {t("Member Login", "Masuk Member")}
               </button>
            </div>
         </div>
      </Section>

      {/* RE-DESIGNED FOOTER */}
      <footer className="bg-white dark:bg-[#050505] border-t border-slate-100 dark:border-white/5 pt-24 pb-12 overflow-hidden transition-colors duration-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-24 mb-20">
            
            {/* Brand Section */}
            <div className="lg:col-span-4 space-y-8">
              <div 
                className="flex items-center gap-4 group cursor-pointer w-fit" 
                onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
              >
                <SurePathLogo className="w-14 h-14 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="font-black text-3xl uppercase tracking-tighter text-slate-900 dark:text-white">Sure<span className="text-emerald-500">Path</span></span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] leading-none mt-1">Insurtech Platform</span>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                {t(
                  "We're on a mission to simplify protection using Neural AI. Experience a zero-friction insurance ecosystem built for the digital age.",
                  "Misi kami adalah menyederhanakan proteksi menggunakan Neural AI. Rasakan ekosistem asuransi tanpa hambatan yang dibangun untuk era digital."
                )}
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Twitter, href: "#" },
                  { icon: Linkedin, href: "#" },
                  { icon: Instagram, href: "#" },
                  { icon: Facebook, href: "#" }
                ].map((social, i) => (
                  <a 
                    key={i} 
                    href={social.href} 
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-all border border-transparent hover:border-emerald-500/20"
                  >
                    <social.icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-8">
              {/* Product Navigation */}
              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-gray-500">{t("Products", "Pilihan Produk")}</h4>
                <ul className="space-y-5">
                  {[
                    { label: t("Auto Matrix", "Asuransi Mobil"), href: "#" },
                    { label: t("Travel Sync", "Asuransi Perjalanan"), href: "#" },
                    { label: t("Health Core", "Kecelakaan Diri"), href: "#" },
                    { label: t("Property Shield", "Proteksi Barang"), href: "#" },
                    { label: t("Business Hub", "Asuransi Bisnis"), href: "#" }
                  ].map((link, i) => (
                    <li key={i}>
                      <a href={link.href} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors flex items-center gap-2 group">
                        {link.label}
                        <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-500" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Navigation */}
              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-gray-500">{t("Company", "Perusahaan")}</h4>
                <ul className="space-y-5">
                  {[
                    { label: t("About Us", "Tentang Kami"), href: "#" },
                    { label: t("Neural Partners", "Kemitraan"), href: "#" },
                    { label: t("Careers", "Karir"), href: "#" },
                    { label: t("Press Center", "Pusat Berita"), href: "#" },
                    { label: t("Contact", "Hubungi Kami"), href: "#" }
                  ].map((link, i) => (
                    <li key={i}>
                      <a href={link.href} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors flex items-center gap-2 group">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact & Support Section */}
            <div className="lg:col-span-3 space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-gray-500">{t("Direct Support", "Dukungan Langsung")}</h4>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-white/5 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("Hotline 24/7", "Layanan 24 Jam")}</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">1500-SURE (7873)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-white/5 flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("Email Support", "Dukungan Email")}</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">support@surepath.ai</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t("HQ Office", "Kantor Pusat")}</p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      SurePath Tower, SCBD Lot 10 <br/> Jakarta Selatan, 12190
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OJK & Trust Badges Section */}
          <div className="py-12 border-y border-slate-100 dark:border-white/5 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 leading-none">{t("Data Privacy", "Privasi Data")}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ISO 27001 Certified</p>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <Globe size={20} className="text-blue-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Global Security Standards", "Standar Keamanan Global")}</p>
              </div>
            </div>
            
            {/* OJK Badge */}
            <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-slate-100 dark:border-white/5 shadow-inner group">
               <div className="flex flex-col items-end text-right">
                  <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white leading-none">{t("Licensed Insurtech", "Insurtech Berizin")}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t("Registered & Supervised by OJK", "Terdaftar & Diawasi oleh OJK")}</p>
               </div>
               <div className="h-10 w-24 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-500">
                  {/* Mock OJK Logo - In real app, replace with actual SVG/Image */}
                  <span className="font-black text-rose-600 text-xs italic">OJK</span>
                  <div className="h-4 w-px bg-slate-200 mx-2"></div>
                  <span className="font-bold text-slate-400 text-[8px]">Reg: 42/IX</span>
               </div>
            </div>
          </div>

          {/* Bottom Footer (Copyright & Legal) */}
          <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center md:text-left leading-relaxed">
              © 2025 PT SurePath Neural Insurtech Indonesia. <br/> {t("All protection nodes active.", "Seluruh hak cipta dilindungi.")}
            </p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {[
                { label: t("Privacy Policy", "Kebijakan Privasi"), href: "#" },
                { label: t("Terms of Use", "Syarat & Ketentuan"), href: "#" },
                { label: t("Cookie Registry", "Daftar Cookie"), href: "#" },
                { label: t("Fraud Policy", "Kebijakan Fraud"), href: "#" }
              ].map((legal, i) => (
                <a key={i} href={legal.href} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {legal.label}
                </a>
              ))}
            </div>
            
            {/* Scroll to Top Button */}
            <button 
              onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm active:scale-90 group"
            >
              <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DesktopWebsite;
