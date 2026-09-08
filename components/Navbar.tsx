import React, { useState, useRef, useEffect } from "react";
import {
  Moon,
  Sun,
  Menu,
  X,
  Download,
} from "lucide-react";
import { Language } from "../types";
import { APP_VERSION } from "../src/version";
import { usePwaInstall, promptInstall } from "../services/pwaInstall";
import InstallAppSheet from "./shared/InstallAppSheet";

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currentPage: string;
  setPage: (p: string) => void;
}

export const SurePathLogo = ({
  className = "h-14 w-auto object-contain",
}: {
  className?: string;
}) => {
  const [src, setSrc] = useState("/logo.png");

  useEffect(() => {
    const customLogo = localStorage.getItem('surepath_custom_logo');
    if (customLogo) setSrc(customLogo);

    const handleUpdate = () => {
      const updated = localStorage.getItem('surepath_custom_logo');
      if (updated) setSrc(updated);
      else setSrc("/logo.png");
    };
    
    window.addEventListener('logo-updated', handleUpdate);
    return () => window.removeEventListener('logo-updated', handleUpdate);
  }, []);

  return (
    <img
      src={src}
      alt="SurePath Logo"
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
      onError={() => setSrc("/logo.png")}
    />
  );
};

const Navbar: React.FC<NavbarProps> = ({
  lang,
  setLang,
  darkMode,
  setDarkMode,
  currentPage,
  setPage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // PWA install — state comes from the single store in services/pwaInstall.ts,
  // which already holds the browser's prompt however early it fired.
  const { installed, method } = usePwaInstall();
  // Nothing to offer on a browser that cannot install — don't show a button
  // whose only possible outcome is an apology.
  const canOfferInstall = !installed && method !== 'unsupported';
  const [installSheet, setInstallSheet] = useState(false);

  // Always try the real install first; the guided sheet is only for browsers
  // that have no prompt to give (iOS, or Chrome before it is ready to offer).
  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') setInstallSheet(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { id: "home", label: lang === Language.EN ? "Home" : "Beranda" },
    { id: "products", label: lang === Language.EN ? "Plans" : "Produk" },
    {
      id: "claim",
      label: lang === Language.EN ? "Quick Claim" : "Klaim Cepat",
    },
    { id: "about", label: lang === Language.EN ? "About Us" : "Tentang Kami" },
    { id: "contact", label: lang === Language.EN ? "Help" : "Bantuan" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 transition-colors duration-700">
      <div className="max-w-[1400px] mx-auto px-8 lg:px-16 h-24 flex justify-between items-center">
        <div
          className="flex items-center cursor-pointer gap-3"
          onClick={() => setPage("home")}
        >
          <SurePathLogo className="h-14 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="font-semibold text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
              Sure
              <span className="text-emerald-500 font-semibold">Path</span>
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase mt-1">
              Your Path to Protection
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 opacity-60 mt-0.5">
              v{APP_VERSION}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`text-xs font-semibold uppercase tracking-widest transition-all duration-200 px-4 py-2 rounded-full ${
                currentPage === item.id
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 scale-[1.08] -translate-y-0.5 shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={() =>
              setLang(lang === Language.EN ? Language.ID : Language.EN)
            }
            aria-label="Switch language"
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold text-slate-500 hover:text-emerald-500 transition-all border border-slate-200 dark:border-white/10 shadow-sm"
          >
            {lang}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 hover:text-emerald-500 transition-all border border-slate-200 dark:border-white/10 shadow-sm"
          >
            {darkMode ? (
              <Sun size={18} strokeWidth={1.5} className="text-yellow-400" />
            ) : (
              <Moon size={18} strokeWidth={1.5} />
            )}
          </button>

          {/* PWA install chip — hidden once installed, or where install is impossible */}
          {canOfferInstall && (
            <button
              onClick={handleInstallClick}
              aria-label={lang === Language.EN ? "Install App" : "Pasang Aplikasi"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[0.6rem] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
            >
              <Download size={13} />
              {lang === Language.EN ? "Install" : "Pasang"}
            </button>
          )}

          <button
            onClick={() => setPage("auth")}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-semibold uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-all ml-2"
          >
            {lang === Language.EN ? "Get Started" : "Masuk Akun"}
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={isOpen}
          className="lg:hidden p-2 text-slate-500"
        >
          {isOpen ? (
            <X size={24} strokeWidth={1.5} />
          ) : (
            <Menu size={24} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/5 p-6 animate-fade-in space-y-4 shadow-xl">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setIsOpen(false);
              }}
              className={`w-full text-left py-3 px-5 rounded-full text-sm font-semibold uppercase tracking-widest transition-all duration-200 ${currentPage === item.id ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 scale-[1.02] shadow-sm" : "text-gray-400 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
            >
              {item.label}
            </button>
          ))}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
            <button
              onClick={() => {
                setLang(lang === Language.EN ? Language.ID : Language.EN);
                setIsOpen(false);
              }}
              className="flex-1 p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 dark:border-white/10"
            >
              {lang === Language.EN ? "Switch to ID" : "Switch to EN"}
            </button>
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                setIsOpen(false);
              }}
              className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 border border-slate-200 dark:border-white/10"
            >
              {darkMode ? (
                <Sun size={18} strokeWidth={1.5} className="text-yellow-400" />
              ) : (
                <Moon size={18} strokeWidth={1.5} />
              )}
            </button>
          </div>
          <button
            onClick={() => {
              setPage("auth");
              setIsOpen(false);
            }}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold uppercase tracking-widest shadow-sm mt-4"
          >
            {lang === Language.EN ? "Get Started" : "Masuk Akun"}
          </button>

          {/* Mobile PWA install option */}
          {canOfferInstall && (
            <button
              onClick={() => { setIsOpen(false); handleInstallClick(); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-semibold uppercase tracking-widest transition-all"
            >
              <Download size={16} />
              {lang === Language.EN ? "Install App" : "Pasang Aplikasi"}
            </button>
          )}
        </div>
      )}

      {installSheet && (
        <InstallAppSheet lang={lang} onClose={() => setInstallSheet(false)} />
      )}
    </nav>
  );
};

export default Navbar;
