import React, { useState, useEffect } from 'react';
import { 
  Zap, Bot, Car, Plane, Heart, 
  Briefcase, Users, Building, ArrowRight, 
  CheckCircle2, Globe, Sun, Moon, 
  Activity, Lock, 
  Menu, X, Sparkles, Network, Package, User
} from 'lucide-react';
import { Language } from '../../types';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
}

const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLang = () => setLang(lang === Language.EN ? Language.ID : Language.EN);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080808] text-slate-900 dark:text-white font-sans transition-colors duration-500 selection:bg-emerald-500/30">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Placeholder - Users can replace src with their uploaded logo */}
            <img src="https://picsum.photos/seed/insurepath/100/100" alt="InsurePath Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover" referrerPolicy="no-referrer" />
            <span className="font-black text-2xl tracking-tighter uppercase">Insure<span className="text-emerald-500">Path</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-gray-300">
            <a href="#solutions" className="hover:text-emerald-500 transition-colors">{t('Solutions', 'Solusi')}</a>
            <a href="#products" className="hover:text-emerald-500 transition-colors">{t('Products', 'Produk')}</a>
            <a href="#technology" className="hover:text-emerald-500 transition-colors">{t('Technology', 'Teknologi')}</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={toggleLang} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-gray-300 hover:text-emerald-500 transition-colors">
              <Globe className="w-4 h-4" /> {lang === Language.EN ? 'EN' : 'ID'}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-600 dark:text-gray-300 hover:text-emerald-500 transition-colors">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={onSignIn} className="text-sm font-bold text-slate-600 dark:text-gray-300 hover:text-emerald-500 transition-colors px-4">
              {t('Sign In', 'Masuk')}
            </button>
            <button onClick={onSignIn} className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
              {t('Get Started', 'Mulai')}
            </button>
          </div>

          <button className="md:hidden p-2 text-slate-900 dark:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-[#080808] pt-24 px-6 flex flex-col gap-6 md:hidden">
          <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black uppercase">{t('Solutions', 'Solusi')}</a>
          <a href="#products" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black uppercase">{t('Products', 'Produk')}</a>
          <a href="#technology" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black uppercase">{t('Technology', 'Teknologi')}</a>
          <hr className="border-slate-200 dark:border-white/10" />
          <div className="flex items-center justify-between">
            <button onClick={toggleLang} className="flex items-center gap-2 text-lg font-bold">
              <Globe className="w-5 h-5" /> {lang === Language.EN ? 'English' : 'Bahasa Indonesia'}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2">
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
          <button onClick={() => { setMobileMenuOpen(false); onSignIn(); }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-widest mt-4">
            {t('Sign In / Register', 'Masuk / Daftar')}
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Non-static animated background blobs */}
        <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none animate-blob" />
        <div className="absolute bottom-1/4 right-[-10%] w-[500px] h-[500px] bg-primary-500/20 blur-[120px] rounded-full pointer-events-none animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none animate-blob animation-delay-4000" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
              {t('Smart & Easy Insurance', 'Asuransi Pintar & Gampang Banget')}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1]">
              {t('Insurance made', 'Asuransi jadi')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-primary-500">
                {t('super simple.', 'super simpel.')}
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t(
                'Say goodbye to confusing paperwork! Get your policy in seconds and claim instantly with our smart AI. Perfect for you, your hustle, or your big business.',
                'Nggak zaman lagi ribet urus kertas! Beli polis dalam hitungan detik dan klaim instan pakai AI pintar kita. Cocok buat kamu, agen asuransi, atau bisnis besarmu.'
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={onSignIn} className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl flex items-center justify-center gap-2">
                {t('Protect Me Now', 'Lindungi Aku Sekarang')} <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#solutions" className="bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center">
                {t('See How It Works', 'Lihat Cara Kerjanya')}
              </a>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-primary-500/20 rounded-[3rem] transform rotate-3 scale-105 blur-lg"></div>
            <div className="relative bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">InsureBot 🤖</h3>
                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest">{t('Ready to help!', 'Siap bantu kamu!')}</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                    {t('Checking your car photo...', 'Lagi ngecek foto mobil kamu nih...')}
                  </p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {t('All good! Claim approved: Rp 5.000.000', 'Beres! Klaim disetujui: Rp 5.000.000')}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                    {t('Money sent straight to your account! 💸', 'Uangnya udah ditransfer ke rekening kamu ya! 💸')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology / AI Features */}
      <section id="technology" className="py-24 px-6 bg-white dark:bg-[#0c0c0c] border-y border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter uppercase">{t('Tech that makes sense', 'Teknologi yang Bikin Gampang')}</h2>
            <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              {t('We threw away the rulebook and used AI to make insurance fast, fair, and actually enjoyable.', 'Kita buang cara lama dan pakai AI biar asuransi jadi cepat, adil, dan nggak bikin pusing.')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black mb-3">{t('Done in 60 Seconds', 'Beres dalam 60 Detik')}</h3>
              <p className="text-slate-600 dark:text-gray-400 leading-relaxed">
                {t('No waiting around. Our smart system checks everything instantly so you get protected in under a minute.', 'Nggak perlu nunggu lama. Sistem pintar kita ngecek semuanya instan, polis kamu aktif kurang dari semenit.')}
              </p>
            </div>
            
            <div className="p-8 bg-slate-50 dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-primary-500/50 transition-colors group">
              <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-xl font-black mb-3">{t('Snap & Claim', 'Foto & Klaim')}</h3>
              <p className="text-slate-600 dark:text-gray-400 leading-relaxed">
                {t('Just take a picture of the damage. Our AI figures out the cost and approves your claim on the spot.', 'Tinggal foto kerusakannya. AI kita bakal hitung biayanya dan langsung setujui klaim kamu saat itu juga.')}
              </p>
            </div>
            
            <div className="p-8 bg-slate-50 dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-blue-500/50 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-black mb-3">{t('Plug & Play APIs', 'API Tinggal Pasang')}</h3>
              <p className="text-slate-600 dark:text-gray-400 leading-relaxed">
                {t('Want to sell insurance on your app? Our APIs are super easy for developers to plug right in.', 'Mau jualan asuransi di aplikasimu? API kita gampang banget dipasang sama developer kamu.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 3 Pillars (Solutions) */}
      <section id="solutions" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter uppercase">{t('Made for Everyone', 'Buat Siapa Aja')}</h2>
            <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              {t('Whether you just need quick cover, want to sell insurance, or run a big company.', 'Mau butuh asuransi cepat, mau jualan asuransi, atau buat perusahaan besar, semua bisa.')}
            </p>
          </div>

          <div className="space-y-8" id="products">
            {/* Retail */}
            <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 flex flex-col lg:flex-row gap-12 items-center hover:shadow-2xl transition-shadow">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
                  <Heart className="w-4 h-4" /> {t('For You', 'Buat Kamu')}
                </div>
                <h3 className="text-4xl font-black tracking-tighter">{t('Protect your vibe.', 'Lindungi gaya hidupmu.')}</h3>
                <p className="text-lg text-slate-600 dark:text-gray-400">
                  {t('Buy insurance straight from your phone. No annoying sales calls, no hidden fees. Just clear, cheap cover that actually works.', 'Beli asuransi langsung dari HP. Nggak ada telepon sales yang ganggu, nggak ada biaya aneh-aneh. Cuma asuransi jelas, murah, dan beneran bisa dipakai.')}
                </p>
                <ul className="space-y-3">
                  {['Active in seconds', 'No-paperwork claims', '24/7 AI Chat'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-bold text-slate-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {lang === Language.EN ? item : ['Aktif dalam hitungan detik', 'Klaim tanpa kertas', 'Chat AI 24/7'][i]}
                    </li>
                  ))}
                </ul>
                <button onClick={onSignIn} className="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest hover:gap-4 transition-all">
                  {t('Check Prices', 'Cek Harga')} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-black/50 rounded-[2rem] p-8 border border-slate-200 dark:border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 text-center space-y-3">
                    <Car className="w-8 h-8 text-blue-500 mx-auto" />
                    <p className="font-bold text-sm uppercase">{t('Auto', 'Mobil')}</p>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 text-center space-y-3">
                    <Plane className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-sm uppercase">{t('Travel', 'Jalan-jalan')}</p>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 text-center space-y-3">
                    <Heart className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="font-bold text-sm uppercase">{t('Health', 'Kesehatan')}</p>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 text-center space-y-3">
                    <Package className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-bold text-sm uppercase">{t('Gadget', 'Gadget')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agents */}
            <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 flex flex-col lg:flex-row-reverse gap-12 items-center hover:shadow-2xl transition-shadow">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
                  <Users className="w-4 h-4" /> {t('For Agents', 'Buat Agen')}
                </div>
                <h3 className="text-4xl font-black tracking-tighter">{t('Level up your hustle.', 'Bikin jualan makin cuan.')}</h3>
                <p className="text-lg text-slate-600 dark:text-gray-400">
                  {t('The ultimate app for modern agents. Manage clients, sell policies on the spot, and get your commission sent straight to your digital wallet.', 'Aplikasi andalan buat agen zaman now. Atur klien, jualan polis di tempat, dan komisi langsung cair ke dompet digitalmu.')}
                </p>
                <ul className="space-y-3">
                  {['Instant payouts', 'Easy CRM tools', 'Quick quotes'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-bold text-slate-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" /> {lang === Language.EN ? item : ['Pencairan instan', 'Fitur CRM gampang', 'Bikin penawaran cepat'][i]}
                    </li>
                  ))}
                </ul>
                <button onClick={onSignIn} className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest hover:gap-4 transition-all">
                  {t('Join the Squad', 'Gabung Sekarang')} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-black/50 rounded-[2rem] p-8 border border-slate-200 dark:border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5"></div>
                <div className="relative z-10 bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-bold text-sm uppercase text-slate-500">{t('My Wallet', 'Dompetku')}</span>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-md">+ Rp 1.500.000 Today</span>
                  </div>
                  <h4 className="text-4xl font-black mb-8">Rp 12.450.000</h4>
                  <div className="space-y-3">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-blue-500"/></div>
                          <div>
                            <p className="text-sm font-bold">Auto Policy Sale</p>
                            <p className="text-xs text-slate-500">Client: Budi S.</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-500">+Rp 500.000</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate */}
            <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 flex flex-col lg:flex-row gap-12 items-center hover:shadow-2xl transition-shadow">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest">
                  <Building className="w-4 h-4" /> {t('For Business', 'Buat Bisnis')}
                </div>
                <h3 className="text-4xl font-black tracking-tighter">{t('Serious protection, zero stress.', 'Proteksi serius, tanpa pusing.')}</h3>
                <p className="text-lg text-slate-600 dark:text-gray-400">
                  {t('Keep your business safe from modern risks. From cyber attacks to employee health, manage it all in one simple dashboard.', 'Bikin bisnismu aman dari risiko zaman now. Dari serangan siber sampai kesehatan karyawan, atur semuanya di satu dasbor simpel.')}
                </p>
                <ul className="space-y-3">
                  {['Bulk policies', 'API for your app', 'VIP Support'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-bold text-slate-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-purple-500" /> {lang === Language.EN ? item : ['Beli polis massal', 'API buat aplikasimu', 'Dukungan VIP'][i]}
                    </li>
                  ))}
                </ul>
                <a href="mailto:sales@myinsurepath.com" className="mt-4 flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest hover:gap-4 transition-all">
                  {t('Chat with Sales', 'Ngobrol sama Sales')} <ArrowRight className="w-5 h-5" />
                </a>
              </div>
              <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-black/50 rounded-[2rem] p-8 border border-slate-200 dark:border-white/5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4">
                    <Lock className="w-10 h-10 text-purple-500" />
                    <div>
                      <h4 className="font-bold uppercase">{t('Cyber Security', 'Keamanan Siber')}</h4>
                      <p className="text-xs text-slate-500">{t('Safe from hackers & data leaks.', 'Aman dari hacker & kebocoran data.')}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4">
                    <Briefcase className="w-10 h-10 text-indigo-500" />
                    <div>
                      <h4 className="font-bold uppercase">{t('Public Liability', 'Tanggung Gugat')}</h4>
                      <p className="text-xs text-slate-500">{t('Cover for third-party accidents.', 'Cover buat kecelakaan pihak ketiga.')}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4">
                    <Users className="w-10 h-10 text-rose-500" />
                    <div>
                      <h4 className="font-bold uppercase">{t('Team Benefits', 'Benefit Tim')}</h4>
                      <p className="text-xs text-slate-500">{t('Health cover for your awesome team.', 'Asuransi kesehatan buat tim hebatmu.')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 border-t border-slate-200 dark:border-white/10 relative overflow-hidden bg-white dark:bg-[#080808]">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tighter mb-6 uppercase">{t('Ready to step into the future?', 'Siap melangkah ke masa depan?')}</h2>
          <p className="text-xl text-slate-600 dark:text-gray-400 mb-10">{t('Join thousands of users and businesses already protected by InsurePath.', 'Bergabunglah dengan ribuan pengguna dan bisnis yang sudah dilindungi oleh InsurePath.')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onSignIn} className="bg-slate-900 dark:bg-white text-white dark:text-black px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl">
              {t('Create Free Account', 'Buat Akun Gratis')}
            </button>
            <a href="mailto:sales@myinsurepath.com" className="bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/20 px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-colors inline-flex items-center justify-center">
              {t('Contact Sales', 'Hubungi Penjualan')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black pt-16 pb-8 px-6 text-sm text-slate-500 dark:text-gray-500">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <img src="https://picsum.photos/seed/insurepath/100/100" alt="InsurePath Logo" className="w-6 h-6 rounded-md object-cover" referrerPolicy="no-referrer" />
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">InsurePath</span>
            </div>
            <p className="max-w-xs">{t('AI-Powered Insurance Infrastructure for Southeast Asia.', 'Infrastruktur Asuransi Bertenaga AI untuk Asia Tenggara.')}</p>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4 uppercase tracking-widest">{t('Products', 'Produk')}</h4>
            <ul className="space-y-3">
              <li><a href="#solutions" className="hover:text-emerald-500 transition-colors">{t('Retail Insurance', 'Asuransi Ritel')}</a></li>
              <li><a href="#solutions" className="hover:text-emerald-500 transition-colors">{t('Agent Platform', 'Platform Agen')}</a></li>
              <li><a href="#solutions" className="hover:text-emerald-500 transition-colors">{t('Corporate Solutions', 'Solusi Korporat')}</a></li>
              <li><a href="#technology" className="hover:text-emerald-500 transition-colors">{t('Claims API', 'API Klaim')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4 uppercase tracking-widest">{t('Company', 'Perusahaan')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('About Us', 'Tentang Kami')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('Careers', 'Karir')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('Blog', 'Blog')}</a></li>
              <li><a href="mailto:sales@myinsurepath.com" className="hover:text-emerald-500 transition-colors">{t('Contact', 'Kontak')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4 uppercase tracking-widest">{t('Legal', 'Legal')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('Privacy Policy', 'Kebijakan Privasi')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('Terms of Service', 'Syarat Layanan')}</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">{t('Security', 'Keamanan')}</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 dark:border-white/10">
          <p>© 2026 InsurePath. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="flex items-center gap-2"><Globe className="w-4 h-4"/> {lang === Language.EN ? 'Global' : 'Indonesia'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PlatformLanding;
