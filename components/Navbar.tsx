import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Globe, Menu, X, User, Briefcase, Shield, ChevronDown, LogIn } from 'lucide-react';
import { Language } from '../types';

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currentPage: string;
  setPage: (p: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ lang, setLang, darkMode, setDarkMode, currentPage, setPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { id: 'home', label: lang === Language.EN ? 'Home' : 'Beranda' },
    { id: 'products', label: lang === Language.EN ? 'Products' : 'Produk' },
    { id: 'claim', label: lang === Language.EN ? 'Claim with AI' : 'Klaim AI' },
    { id: 'about', label: lang === Language.EN ? 'About Us' : 'Tentang Kami' },
    { id: 'console', label: lang === Language.EN ? 'Partner Console' : 'Konsol Mitra' },
  ];

  const loginOptions = [
    { id: 'member', label: lang === Language.EN ? 'Member' : 'Anggota', icon: User },
    { id: 'partner', label: lang === Language.EN ? 'Partner' : 'Mitra', icon: Briefcase },
    { id: 'admin', label: lang === Language.EN ? 'Admin' : 'Admin', icon: Shield },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center cursor-pointer" onClick={() => setPage('home')}>
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
              Sure<span className="text-primary-500">path</span>
            </span>
          </div>

          <div className="hidden md:flex space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`${
                  currentPage === item.id
                    ? 'text-primary-600 dark:text-primary-500 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-primary-500'
                } transition-colors`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              {lang}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {/* Login Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsLoginOpen(!isLoginOpen)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-primary-500/30 flex items-center gap-2"
              >
                {lang === Language.EN ? 'Login' : 'Masuk'}
                <ChevronDown size={16} className={`transition-transform ${isLoginOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLoginOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden animate-fade-in origin-top-right p-2">
                  {loginOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        // Handle login routing here in future
                        setIsLoginOpen(false);
                        console.log(`Logging in as ${opt.id}`);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <div className="p-1.5 bg-gray-100 dark:bg-white/5 rounded-lg">
                        <opt.icon size={14} className="text-primary-500" />
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 dark:text-gray-300">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-dark-card border-b dark:border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setIsOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {item.label}
              </button>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
            <div className="px-3 py-2 font-bold text-gray-400 text-xs uppercase tracking-wider">Login As</div>
            {loginOptions.map((opt) => (
               <button key={opt.id} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                 <opt.icon size={16} /> {opt.label}
               </button>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
            <div className="flex items-center space-x-4 px-3 py-2">
               <button onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
               <button onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}>
                  {lang}
               </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;