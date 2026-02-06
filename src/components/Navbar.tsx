
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
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" /> {/* Emerald 500 */}
        <stop offset="100%" stopColor="#047857" /> {/* Emerald 700 */}
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.2)" />
      </filter>
    </defs>
    {/* Shield Base */}
    <path 
      d="M50 5L15 18V45C15 68 30 88 50 95C70 88 85 68 85 45V18L50 5Z" 
      fill="url(#shieldGradient)" 
      filter="url(#dropShadow)"
    />
    {/* The Path (Negative Space / Light Overlay) */}
    <path 
      d="M50 95C50 95 35 75 35 55C35 35 50 35 55 25" 
      stroke="white" 
      strokeWidth="6" 
      strokeLinecap="round" 
      fill="none"
      opacity="0.9"
    />
    {/* Leaf Accent */}
    <path 
      d="M55 25C55 25 65 15 70 25C75 35 65 40 55 25Z" 
      fill="#ecfccb" /* Lime 100 */
    />
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({ lang, setLang, darkMode, setDarkMode, currentPage, setPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginView, setLoginView] = useState<'form' | 'forgot'>('form');
  const [loginRole, setLoginRole] = useState<'member' | 'partner' | 'admin'>('member');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginOpen(false);
        setLoginView('form');
        setResetSent(false);
        setResetEmail('');
        setLoginId('');
        setPassword('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(loginId && password) {
        console.log(`Logging in as ${loginRole}`, { loginId });
        setIsLoginOpen(false);
        if (loginRole === 'partner') setPage('console');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if(resetEmail) {
        setResetSent(true);
        setTimeout(() => {
            setIsLoginOpen(false);
            setLoginView('form');
            setResetSent(false);
            setResetEmail('');
        }, 2000);
    }
  };

  const getLoginLabel = () => {
    switch(loginRole) {
        case 'member': return lang === Language.EN ? 'Email / Phone' : 'Email / No. HP';
        case 'partner': return lang === Language.EN ? 'Agent ID / Email' : 'ID Agen / Email';
        case 'admin': return lang === Language.EN ? 'Employee ID' : 'ID Pegawai';
        default: return 'Email';
    }
  };

  const menuItems = [
    { id: 'home', label: lang === Language.EN ? 'Home' : 'Beranda' },
    { id: 'products', label: lang === Language.EN ? 'Products' : 'Produk' },
    { id: 'claim', label: lang === Language.EN ? 'Claim with AI' : 'Klaim AI' },
    { id: 'about', label: lang === Language.EN ? 'About Us' : 'Tentang Kami' },
    { id: 'console', label: lang === Language.EN ? 'Partner Console' : 'Konsol Mitra' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center cursor-pointer gap-3" onClick={() => setPage('home')}>
            <SurePathLogo className="w-10 h-10" />
            <div className="flex flex-col justify-center">
              <span className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white leading-none">
                Sure<span className="text-primary-500">Path</span>
              </span>
              <span className="text-[0.6rem] text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">
                Your Path to Protection
              </span>
            </div>
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
                } transition-colors text-sm uppercase tracking-wide`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold border border-gray-200 dark:border-gray-700"
            >
              {lang}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsLoginOpen(!isLoginOpen)}
                className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-primary-600 dark:hover:bg-gray-200 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg flex items-center gap-2"
              >
                {lang === Language.EN ? 'Login' : 'Masuk'}
                <ChevronDown size={16} className={`transition-transform ${isLoginOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLoginOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-fade-in origin-top-right p-4 z-[100]">
                  {loginView === 'form' ? (
                    <div className="space-y-4">
                        {/* Role Switcher */}
                        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                            {['member', 'partner', 'admin'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setLoginRole(r as any)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                                        loginRole === r 
                                        ? 'bg-white dark:bg-gray-700 shadow-md text-primary-600 dark:text-primary-400' 
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <div className="text-center mb-2">
                            <h3 className="font-bold text-lg">{lang === Language.EN ? 'Welcome Back!' : 'Selamat Datang!'}</h3>
                            <p className="text-xs text-gray-500">Login as <span className="capitalize font-bold text-primary-500">{loginRole}</span></p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-3">
                            <div className="relative">
                                <User size={16} className="absolute top-3.5 left-3 text-gray-400" />
                                <input 
                                    type="text" 
                                    required
                                    placeholder={getLoginLabel()}
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute top-3.5 left-3 text-gray-400" />
                                <input 
                                    type="password" 
                                    required
                                    placeholder={lang === Language.EN ? 'Password' : 'Kata Sandi'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                />
                            </div>
                            
                            <button className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg shadow-primary-500/30 transform active:scale-95">
                                {lang === Language.EN ? 'Login' : 'Masuk'}
                            </button>
                        </form>

                        <div className="text-center">
                            <button 
                                onClick={() => setLoginView('forgot')}
                                className="text-xs font-medium text-gray-500 hover:text-primary-500 transition-colors"
                            >
                                {lang === Language.EN ? 'Forgot Password?' : 'Lupa Kata Sandi?'}
                            </button>
                        </div>
                    </div>
                  ) : (
                    <div className="p-1">
                        <button 
                            onClick={() => { setLoginView('form'); setResetSent(false); }} 
                            className="flex items-center text-xs text-gray-500 mb-4 hover:text-primary-500 transition-colors"
                        >
                            <ArrowLeft size={14} className="mr-1" /> {lang === Language.EN ? 'Back to Login' : 'Kembali Login'}
                        </button>
                        
                        {resetSent ? (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-green-500 animate-pop-in">
                                    <Check size={24} />
                                </div>
                                <p className="font-bold text-green-600 dark:text-green-400">{lang === Language.EN ? 'Link Sent!' : 'Link Terkirim!'}</p>
                                <p className="text-xs text-gray-500 mt-1">{lang === Language.EN ? 'Check your email inbox.' : 'Cek inbox email Anda.'}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="text-center">
                                    <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-2 text-primary-500">
                                        <Lock size={20} />
                                    </div>
                                    <h4 className="font-bold">{lang === Language.EN ? 'Reset Password' : 'Reset Kata Sandi'}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Enter your email to receive a recovery link.</p>
                                </div>
                                <div className="relative">
                                    <Mail size={16} className="absolute top-3.5 left-3 text-gray-400" />
                                    <input 
                                        type="email" 
                                        required
                                        placeholder="Email Address"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-primary-500"
                                    />
                                </div>
                                <button className="w-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl py-3 text-sm font-bold transition-colors">
                                    {lang === Language.EN ? 'Send Reset Link' : 'Kirim Link Reset'}
                                </button>
                            </form>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <div onClick={() => setIsOpen(!isOpen)} className={`nav-icon ${isOpen ? 'open' : ''} text-gray-600 dark:text-gray-300`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white dark:bg-dark-card border-b dark:border-gray-800 animate-fade-in absolute w-full shadow-xl z-50 h-screen overflow-y-auto">
          <div className="px-4 pt-4 pb-20 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-4 rounded-xl text-lg font-bold transition-colors ${
                    currentPage === item.id 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
            
            <div className="border-t border-gray-200 dark:border-gray-800 my-6 pt-6 space-y-4">
               {/* Mobile Login Button */}
               <button 
                 onClick={() => { setIsOpen(false); setIsLoginOpen(true); }} 
                 className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg"
               >
                 {lang === Language.EN ? 'Login / Sign In' : 'Masuk / Daftar'}
               </button>

               {/* Mobile Settings Toggles */}
               <div className="grid grid-cols-1 gap-4 mt-4">
                 <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                    <span className="font-medium flex items-center gap-3">
                        {darkMode ? <Moon size={20} className="text-primary-500"/> : <Sun size={20} className="text-yellow-500"/>}
                        Appearance
                    </span>
                    <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${darkMode ? 'bg-primary-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${darkMode ? 'translate-x-6' : ''}`}></div>
                    </button>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                    <span className="font-medium flex items-center gap-3">
                        <Globe size={20} className="text-blue-500"/>
                        Language
                    </span>
                    <div className="flex bg-white dark:bg-black/20 rounded-lg p-1">
                        <button 
                            onClick={() => setLang(Language.ID)} 
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${lang === Language.ID ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
                        >
                            ID
                        </button>
                        <button 
                            onClick={() => setLang(Language.EN)} 
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${lang === Language.EN ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
                        >
                            EN
                        </button>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
