import React from "react";
import Hero from "./landing/Hero";
import Features from "./landing/Features";
import ProductModules from "./landing/ProductModules";
import SocialProof from "./landing/SocialProof";
import HowItWorks from "./landing/HowItWorks";
import { Language } from "../types";
import { Section } from "./shared/UI";
import {
  ArrowRight,
  LogIn,
  ShieldCheck,
  Zap,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  ArrowUp,
  Globe,
  ExternalLink,
} from "lucide-react";
import { SurePathLogo } from "./Navbar";

interface DesktopWebsiteProps {
  onEnterPortal: (mode?: "LOGIN" | "REGISTER" | "ADMIN_LOGIN") => void;
  currentLang: Language;
  onLangChange: (l: Language) => void;
}

const DesktopWebsite: React.FC<DesktopWebsiteProps> = ({
  onEnterPortal,
  currentLang,
}) => {
  const t = (en: string, idn: string) =>
    currentLang === Language.EN ? en : idn;

  return (
    <div className="min-h-screen bg-[#f5f5f4] dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-700 overflow-x-hidden">
      {/* Dynamic Hero Section */}
      <Hero
        lang={currentLang === Language.EN ? "EN" : "ID"}
        onAction={() => onEnterPortal("REGISTER")}
        onAdminAction={() => onEnterPortal("ADMIN_LOGIN")}
      />

      {/* Social Proof Strip */}
      <SocialProof lang={currentLang === Language.EN ? "EN" : "ID"} />

      {/* How It Works */}
      <HowItWorks
        lang={currentLang === Language.EN ? "EN" : "ID"}
        onAction={() => onEnterPortal("REGISTER")}
      />

      {/* Features & Ecosystem Section */}
      <Features lang={currentLang === Language.EN ? "EN" : "ID"} />

      {/* NEW PRODUCT MODULES SECTION (Integrated from specialized component) */}
      <ProductModules lang={currentLang} />

      {/* Dashboard Call to Action */}
      <Section className="bg-white dark:bg-[#111] py-32 transition-colors duration-700 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
          <div className="bg-slate-100 dark:bg-[#0a0a0a] rounded-[3rem] p-12 md:p-24 border border-slate-200 dark:border-white/5 relative overflow-hidden">
            {/* Background Pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            ></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="space-y-8 max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-sm border border-emerald-500/20 animate-float mx-auto lg:mx-0">
                  <Zap size={32} strokeWidth={1.5} />
                </div>
                <h2 className="font-sora text-5xl md:text-7xl font-semibold tracking-[-0.02em] leading-[0.9] text-slate-900 dark:text-white">
                  {t("Ready to step onto", "Siap melangkah ke")} <br />
                  <span className="text-emerald-500 italic font-light">
                    {t("SurePath?", "SurePath?")}
                  </span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xl">
                  {t(
                    "Join us and switch to a smarter, faster way of managing protection. No documents, no delays.",
                    "Bergabunglah dan beralih ke cara cerdas dan cepat dalam mengelola proteksi. Tanpa dokumen, tanpa tunda.",
                  )}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <button
                  onClick={() => onEnterPortal("REGISTER")}
                  className="h-16 px-10 bg-emerald-500 text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full sm:w-auto"
                >
                  {t("Join Now", "Daftar Sekarang")}
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => onEnterPortal("LOGIN")}
                  className="h-16 px-10 bg-white dark:bg-white/5 text-slate-900 dark:text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-white/10 w-full sm:w-auto"
                >
                  <LogIn size={18} />
                  {t("Member Login", "Masuk Member")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* RE-DESIGNED FOOTER */}
      <footer className="bg-[#f5f5f4] dark:bg-[#0a0a0a] border-t border-slate-200/50 dark:border-white/5 pt-32 pb-12 overflow-hidden transition-colors duration-700">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-24 mb-32">
            {/* Brand Section */}
            <div className="lg:col-span-4 space-y-10">
              <div
                className="flex items-center gap-4 group cursor-pointer w-fit"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <SurePathLogo className="h-16 w-auto object-contain group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="font-semibold text-3xl tracking-tight text-slate-900 dark:text-white">
                    Sure
                    <span className="text-emerald-500 italic font-light">
                      Path
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-1">
                    Protection Platform
                  </span>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                {t(
                  "We're on a mission to simplify protection. Experience a zero-friction ecosystem built for the digital age.",
                  "Misi kami adalah menyederhanakan proteksi. Rasakan ekosistem tanpa hambatan yang dibangun untuk era digital.",
                )}
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Twitter, href: "#" },
                  { icon: Linkedin, href: "#" },
                  { icon: Instagram, href: "#" },
                  { icon: Facebook, href: "#" },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all border border-slate-200 dark:border-white/5 shadow-sm hover:-translate-y-1"
                  >
                    <social.icon size={20} strokeWidth={1.5} />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-12">
              {/* Product Navigation */}
              <div className="space-y-8">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t("Products", "Pilihan Produk")}
                </h4>
                <ul className="space-y-6">
                  {[
                    { label: t("Auto Matrix", "Proteksi Mobil"), href: "#" },
                    {
                      label: t("Travel Sync", "Proteksi Perjalanan"),
                      href: "#",
                    },
                    { label: t("Health Core", "Kecelakaan Diri"), href: "#" },
                    {
                      label: t("Property Shield", "Proteksi Barang"),
                      href: "#",
                    },
                    { label: t("Business Hub", "Proteksi Bisnis"), href: "#" },
                  ].map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.href}
                        className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                      >
                        {link.label}
                        <ArrowRight
                          size={14}
                          className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-500"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Navigation */}
              <div className="space-y-8">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t("Company", "Perusahaan")}
                </h4>
                <ul className="space-y-6">
                  {[
                    {
                      label: t("About Us", "Tentang Kami"),
                      href: "#",
                      isExternal: false,
                    },
                    {
                      label: t("Careers", "Karir"),
                      href: "#",
                      isExternal: false,
                    },
                    {
                      label: t("Press Center", "Pusat Berita"),
                      href: "#",
                      isExternal: false,
                    },
                    {
                      label: t("Contact", "Hubungi Kami"),
                      href: "#",
                      isExternal: false,
                    },
                    {
                      label: t("Admin Access", "Akses Admin"),
                      href: "#/admin",
                      isExternal: false,
                    },
                  ].map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.href}
                        className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors flex items-center gap-2 group"
                      >
                        {link.label}
                        {link.isExternal && (
                          <ExternalLink size={14} className="opacity-50" />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact & Support Section */}
            <div className="lg:col-span-3 space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {t("Direct Support", "Dukungan Langsung")}
              </h4>
              <div className="space-y-8">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-emerald-500 border border-slate-200 dark:border-white/5 shadow-sm flex-shrink-0">
                    <Phone size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {t("Hotline 24/7", "Layanan 24 Jam")}
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      1500-SURE (7873)
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-emerald-500 border border-slate-200 dark:border-white/5 shadow-sm flex-shrink-0">
                    <Mail size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {t("Email Support", "Dukungan Email")}
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      support@surepath.ai
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-white/5 shadow-sm flex-shrink-0">
                    <MapPin size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                      {t("HQ Office", "Kantor Pusat")}
                    </p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {t("Global Operations", "Operasional Global")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Badges Section */}
          <div className="py-12 border-y border-slate-200/50 dark:border-white/5 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 leading-none">
                    {t("Data Privacy", "Privasi Data")}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                    ISO 27001 Certified
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <Globe size={28} strokeWidth={1.5} className="text-slate-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t("Global Security Standards", "Standar Keamanan Global")}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Footer (Copyright & Legal) */}
          <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase text-center md:text-left leading-relaxed">
              © 2025 PT Ruang Proteksi Indonesia. <br />{" "}
              {t("All rights reserved.", "Seluruh hak cipta dilindungi.")}
            </p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {[
                { label: t("Privacy Policy", "Kebijakan Privasi"), href: "#" },
                { label: t("Terms of Use", "Syarat & Ketentuan"), href: "#" },
                { label: t("Cookie Policy", "Kebijakan Cookie"), href: "#" },
                { label: t("Fraud Policy", "Kebijakan Fraud"), href: "#" },
              ].map((legal, i) => (
                <a
                  key={i}
                  href={legal.href}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  {legal.label}
                </a>
              ))}
            </div>

            {/* Scroll to Top Button */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-14 h-14 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm active:scale-90 group"
            >
              <ArrowUp
                size={24}
                className="group-hover:-translate-y-1 transition-transform"
              />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DesktopWebsite;
