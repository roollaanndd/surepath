import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, User, Briefcase, Shield, ChevronDown, Mail, ArrowLeft, Check, Menu, X, Globe, Lock, LogOut } from 'lucide-react';
import { Language } from '../types';

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currentPage: string;
  setPage: (p: string) => void;
}

export const SurePathLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <img src="/logo.png" alt="SurePath Logo" className={`${className} object-contain`} />
);

const Navbar: React.FC<NavbarProps> = ({ lang, setLang, darkMode, setDarkMode, currentPage, setPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { id: 'home', label: lang === Language.EN ? 'Home' : 'Beranda' },
    { id: 'products', label: lang === Language.EN ? 'Plans' : 'Produk' },
    { id: 'claim', label: lang === Language.EN ? 'Quick Claim' : 'Klaim Cepat' },
    { id: 'about', label: lang === Language.EN ? 'About Us' : 'Tentang Kami' },
    { id: 'contact', label: lang === Language.EN ? 'Help' : 'Bantuan' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-6 h-24 flex justify-between items-center">
        <div className="flex items-center cursor-pointer gap-3" onClick={() => setPage('home')}>
          <SurePathLogo className="w-12 h-12" />
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
              Sure<span className="text-emerald-500">Path</span>
            </span>
            <span className="text-[0.5rem] text-gray-500 dark:text-gray-400 font-bold tracking-[0.4em] uppercase mt-1">
              Insurance for Everyone
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all relative group ${
                currentPage === item.id ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
              }`}
            >
              {item.label}
              <span className={`absolute -bottom-2 left-0 h-0.5 bg-emerald-500 transition-all duration-300 ${currentPage === item.id ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <button
            onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
            className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-emerald-500 transition-all border border-black/5"
          >
            {lang}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all border border-black/5"
          >
            {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={() => setPage('auth')}
            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            {lang === Language.EN ? 'Get Started' : 'Masuk Akun'}
          </button>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-3 text-slate-500">
           {isOpen ? <X size={28}/> : <Menu size={28}/>}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white dark:bg-[#0c0c0c] border-t border-gray-100 dark:border-white/5 p-6 animate-fade-in space-y-4 shadow-2xl">
           {menuItems.map(item => (
             <button 
               key={item.id} 
               onClick={() => { setPage(item.id); setIsOpen(false); }}
               className={`w-full text-left py-4 px-6 rounded-2xl text-lg font-black uppercase tracking-tighter ${currentPage === item.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}
             >
               {item.label}
             </button>
           ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;