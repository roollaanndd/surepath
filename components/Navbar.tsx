import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Globe, ArrowRight, ShieldCheck, 
  ChevronDown, Sun, Moon, User, LayoutGrid, LogIn
} from 'lucide-react';
import { Language } from '../types';

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currentPage: string;
  setPage: (p: string) => void;
  onDemoLogin?: () => void;
}

export const SurePathLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`flex items-center justify-center bg-brand-500 rounded-2xl p-2 shadow-lg shadow-brand-500/20 ${className} transition-transform hover:rotate-3`}>
     <ShieldCheck className="text-white" size={24} strokeWidth={3}/>
  </div>
);

const Navbar: React.FC<NavbarProps> = ({ lang, setLang, darkMode, setDarkMode, currentPage, setPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 'product', en: 'Products', idn: 'Produk' },
    { id: 'how-it-works', en: 'How it Works', idn: 'Cara Kerja' },
    { id: 'why', en: 'Why Us', idn: 'Kenapa Kami' },
  ];

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  const handleAuthClick = () => {
    setPage('auth');
    setIsOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled ? 'glass-modern py-4 shadow-xl border-b border-black/5 dark:border-white/5' : 'bg-transparent py-8'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex justify-between items-center">
        {/* Brand */}
        <div className="flex items-center cursor-pointer gap-4 group" onClick={() => setPage('home')}>
          <SurePathLogo className="w-11 h-11" />
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white leading-none">
              Sure<span className="text-brand-500">Path</span>
            </span>
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mt-1.5 hidden sm:block">
              {t('Simplified Protection', 'Asuransi Jadi Gampang')}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-12">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="text-slate-600 dark:text-slate-400 hover:text-brand-500 font-bold text-[13px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t(item.en, item.idn)}
            </button>
          ))}
          {/* Tambahan Menu Masuk di Desktop Nav jika diinginkan sebagai menu */}
          <button 
            onClick={handleAuthClick}
            className="text-slate-600 dark:text-slate-400 hover:text-brand-500 font-bold text-[13px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <LogIn size={16} className="text-brand-500"/>
            {t('Login', 'Masuk')}
          </button>
        </div>

        {/* Actions Area */}
        <div className="hidden md:flex items-center space-x-6">
           <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-brand-500 transition-colors shadow-inner"
           >
              {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
           </button>
          
          <button 
            className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-500 dark:hover:bg-brand-500 dark:hover:text-white transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center gap-3"
            onClick={handleAuthClick}
          >
            {t('Dashboard', 'Buka Dashboard')}
            <ArrowRight size={16}/>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center">
          <button onClick={() => setIsOpen(!isOpen)} className="p-3 text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 rounded-2xl shadow-sm">
            {isOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <div className="fixed inset-0 top-[88px] z-[90] bg-white dark:bg-slate-950 flex flex-col p-10 space-y-12 lg:hidden animate-fade-in">
          <div className="flex flex-col space-y-10">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className="text-left text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter"
                onClick={() => { setIsOpen(false); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                {t(item.en, item.idn)}
              </button>
            ))}
            {/* Menu Masuk di Mobile */}
            <button
                onClick={handleAuthClick}
                className="text-left text-4xl font-black text-brand-500 uppercase tracking-tighter flex items-center gap-4"
              >
                <LogIn size={32}/>
                {t('Login', 'Masuk')}
            </button>
          </div>

          <div className="pt-12 border-t border-slate-100 dark:border-white/5 space-y-8">
            <button 
              className="w-full py-6 rounded-[2.5rem] bg-brand-500 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20"
              onClick={handleAuthClick}
            >
              {t('Get Started', 'Mulai Sekarang')}
            </button>
            <div className="flex justify-between items-center px-4">
               <button onClick={() => setDarkMode(!darkMode)} className="text-slate-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                 {darkMode ? <Sun size={14}/> : <Moon size={14}/>} Tampilan
               </button>
               <button onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)} className="text-slate-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                 <Globe size={14}/> {lang}
               </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;