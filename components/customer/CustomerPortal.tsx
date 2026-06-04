import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, ShoppingBag, Zap, History, UserCircle,
  Sun, Moon, LogOut, ShieldCheck, Bell,
  Car, Plane, Lightbulb, Bot, FileText, AlertCircle
} from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../Navbar';
import PortalHero from '../PortalHero';
import ClaimManager from '../ClaimManager';
import UserProfile from '../UserProfile';
import { formatIDR } from '../car-wizard/WizardUI';
import CarInsuranceWizard from '../CarInsuranceWizard';
import TravelInsuranceWizard from '../TravelInsuranceWizard';
import PAInsuranceWizard from '../PAInsuranceWizard';
import MPARInsuranceWizard from '../MPARInsuranceWizard';
import CustomInsuranceWizard from '../CustomInsuranceWizard';
import HealthChat from '../HealthChat';
import ContactPage from '../ContactPage';
import { PageTransition } from '../car-wizard/WizardUI';
import { getCustomerOrders, getCustomerClaims, type SpPolicyOrder, type SpClaim } from '../../services/supabaseService';
import { Badge } from '../shared/UI';

interface Props {
  currentUser: any;
  onLogout: () => void;
  lang: Language;
  products: any[];
}

const TABS = [
  { id: 'home',     labelEn: 'Home',    labelId: 'Beranda', Icon: Home },
  { id: 'products', labelEn: 'Buy',     labelId: 'Beli',    Icon: ShoppingBag },
  { id: 'claim',    labelEn: 'Claim',   labelId: 'Klaim',   Icon: Zap },
  { id: 'history',  labelEn: 'History', labelId: 'Riwayat', Icon: History },
  { id: 'profile',  labelEn: 'Profile', labelId: 'Profil',  Icon: UserCircle },
];

const CustomerPortal: React.FC<Props> = ({ currentUser, onLogout, lang, products }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activePage, setActivePage] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [latestPolicy, setLatestPolicy] = useState<SpPolicyOrder | null>(null);
  const [customerPolicies, setCustomerPolicies] = useState<SpPolicyOrder[]>([]);
  const [customerClaims, setCustomerClaims] = useState<SpClaim[]>([]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (currentUser?.id) {
      getCustomerOrders(currentUser.id).then(orders => {
        setCustomerPolicies(orders);
        if (orders.length > 0) setLatestPolicy(orders[0]);
      }).catch(() => {});
      getCustomerClaims(currentUser.id).then(claims => {
        setCustomerClaims(claims);
      }).catch(() => {});
    }
  }, [currentUser?.id]);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return t('Good Morning', 'Selamat Pagi');
    if (hour < 15) return t('Good Afternoon', 'Selamat Siang');
    if (hour < 19) return t('Good Afternoon', 'Selamat Sore');
    return t('Good Evening', 'Selamat Malam');
  }, [lang]);

  const navigate = (page: string) => {
    setActivePage(page);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTab = TABS.find(t => t.id === activePage)?.id
    ?? (activePage.startsWith('buy-') ? 'products' : activePage === 'bot' ? 'home' : activePage);

  const isFullscreen = activePage.startsWith('buy-') || activePage === 'bot';

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <PageTransition>
            <div className="space-y-7 pb-32">
              {/* Greeting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('profile')}
                    className="relative cursor-pointer active:scale-[0.96] transition-transform duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-[1.8rem]"
                  >
                    <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-[1.8rem] shadow-lg shadow-emerald-500/20 flex items-center justify-center border border-slate-100 dark:border-white/5 overflow-hidden ring-1 ring-emerald-500/10">
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-500 flex items-center justify-center text-xl font-black text-white">
                        {currentUser?.name?.[0]}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full border-4 border-[#fafaf9] dark:border-[#0a0a0a] flex items-center justify-center text-[0.55rem] text-white font-black shadow-lg shadow-emerald-500/40">
                      {currentUser?.trustScore || 85}
                    </div>
                  </button>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                      {timeGreeting}, {currentUser?.name?.split(' ')[0]}!
                    </h3>
                    <p className="text-[0.6rem] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-1 mt-1.5">
                      <ShieldCheck size={11} className="animate-pulse motion-reduce:animate-none" />
                      {t('SECURE ACCOUNT', 'AKUN AMAN')}
                    </p>
                  </div>
                </div>
              </div>

              <PortalHero onAction={navigate} lang={lang} />

              {/* Quick actions */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'products', label: t('Buy', 'Beli'),        icon: ShoppingBag, color: 'text-blue-500',    bg: 'bg-blue-500/10',    ring: 'group-hover:ring-blue-500/20' },
                  { id: 'claim',    label: t('Claim', 'Klaim'),      icon: Zap,         color: 'text-rose-500',    bg: 'bg-rose-500/10',    ring: 'group-hover:ring-rose-500/20' },
                  { id: 'history',  label: t('History', 'Riwayat'),  icon: History,     color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'group-hover:ring-emerald-500/20' },
                  { id: 'bot',      label: 'Chat AI',                icon: Bot,         color: 'text-amber-500',   bg: 'bg-amber-500/10',   ring: 'group-hover:ring-amber-500/20' },
                ].map(action => (
                  <button
                    type="button"
                    key={action.id}
                    onClick={() => navigate(action.id)}
                    className="flex flex-col items-center gap-2.5 cursor-pointer group active:scale-90 transition-transform duration-200 motion-reduce:transition-none focus:outline-none"
                  >
                    <div className={`w-14 h-14 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5 ${action.ring} group-hover:scale-110 group-hover:-translate-y-0.5 group-active:shadow-inner transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none`}>
                      <action.icon size={26} strokeWidth={2.5} />
                    </div>
                    <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center leading-tight group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Latest policy card */}
              {latestPolicy && (
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 relative overflow-hidden shadow-[0_24px_48px_-20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/5 group">
                  <div className="absolute -top-10 -left-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12 text-emerald-600 group-hover:rotate-0 transition-transform duration-1000 motion-reduce:transition-none">
                    {latestPolicy.type === 'CAR' ? <Car size={130} /> : <Plane size={130} />}
                  </div>
                  <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[0.55rem] font-black text-primary-500 uppercase tracking-[0.4em]">
                          {t('YOUR INSURANCE', 'ASURANSI KAMU')}
                        </p>
                        <h4 className="text-xl font-black uppercase tracking-tighter mt-0.5">
                          {(latestPolicy.vehicle_details as any)?.make ?? latestPolicy.product_name}
                        </h4>
                      </div>
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 rounded-2xl border border-emerald-500/20 shadow-sm">
                        <ShieldCheck size={20} className="text-emerald-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">
                          {t('EXPIRES ON', 'AKHIR POLIS')}
                        </p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {new Date(latestPolicy.end_date ?? '').toLocaleDateString(
                            lang === Language.EN ? 'en-US' : 'id-ID',
                            { month: 'long', year: 'numeric' }
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('profile')}
                        className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[0.55rem] tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 motion-reduce:transition-none"
                      >
                        {t('Details', 'Detail')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tip */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 flex gap-4 shadow-sm hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500/15 to-amber-500/5 rounded-2xl flex items-center justify-center text-amber-500 flex-shrink-0 ring-1 ring-inset ring-amber-500/10">
                  <Lightbulb size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-[0.55rem] font-black uppercase text-amber-600 dark:text-amber-400 tracking-[0.2em]">
                    {t('DID YOU KNOW?', 'TAHUKAH KAMU?')}
                  </p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t(
                      'You can file a claim by just taking a photo. Our AI processes it in minutes.',
                      'Kamu bisa lapor klaim cuma lewat foto HP. AI kami memprosesnya dalam hitungan menit.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </PageTransition>
        );

      case 'products':
        return (
          <PageTransition>
            <div className="space-y-7 pb-32 pt-2">
              <div className="space-y-3 text-center">
                <Badge variant="brand">{t('Simple Protection', 'Pusat Proteksi')}</Badge>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">
                  {t('Choose Plan', 'Pilih Paket')} <span className="text-primary-500">SurePath</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {products.map(p => (
                  <div
                    key={p.id}
                    onClick={() => p.active && navigate(`buy-${p.id}`)}
                    className={`group p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-5 transition-all duration-300 motion-reduce:transition-none ${p.active ? 'cursor-pointer hover:border-primary-500/30 hover:-translate-y-0.5 shadow-sm hover:shadow-xl active:scale-[0.98] active:shadow-md' : 'opacity-40 grayscale'}`}
                  >
                    <div className={`w-14 h-14 ${p.bg} dark:bg-white/5 ${p.color} rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5 group-hover:scale-110 transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none`}>
                      <p.icon size={26} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-sm uppercase tracking-tighter text-slate-900 dark:text-white">{p.title}</h4>
                        {p.tech && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-lg text-[0.45rem] font-black uppercase tracking-widest text-slate-400 flex-shrink-0 ml-2">{p.tech}</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PageTransition>
        );

      case 'claim':
        return (
          <PageTransition>
            <ClaimManager onComplete={() => navigate('home')} lang={lang} currentUser={currentUser} />
          </PageTransition>
        );

      case 'history':
        return (
          <PageTransition>
            <div className="space-y-6 pb-32 pt-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">{t('My History', 'Riwayat Saya')}</h2>

              {/* Policies */}
              <div className="space-y-3">
                <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileText size={12} />{t('Active Policies', 'Polis Aktif')}</p>
                {customerPolicies.length === 0 ? (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                      <FileText size={22} />
                    </div>
                    <p className="text-slate-400 text-sm font-bold">{t('No policies yet. Buy your first plan!', 'Belum ada polis. Beli paket pertamamu!')}</p>
                    <button
                      onClick={() => navigate('products')}
                      className="px-5 py-2 bg-primary-500 text-white rounded-xl font-black uppercase text-[0.55rem] tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-transform duration-200 motion-reduce:transition-none"
                    >
                      {t('Browse Plans', 'Lihat Paket')}
                    </button>
                  </div>
                ) : customerPolicies.map((p, i) => (
                  <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-primary-500/10 ring-1 ring-inset ring-primary-500/10 flex items-center justify-center">
                        {p.vehicle_type === 'CAR' ? <Car size={20} className="text-primary-500" /> : <ShieldCheck size={20} className="text-primary-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{p.policy_number ?? p.order_number ?? p.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-xs text-slate-400 font-medium">{p.product_code}{p.end_date ? ` · ${t('Expires','Berakhir')} ${new Date(p.end_date).toLocaleDateString('id-ID')}` : ''}</p>
                        {(() => {
                          const desc: Record<string,string> = {
                            SUBMITTED:'Menunggu konfirmasi penanggung', UNDER_REVIEW:'Sedang dikaji oleh penanggung',
                            APPROVED:'Disetujui — menunggu penerbitan polis', ISSUED:'Polis aktif & berlaku',
                            REJECTED:'Pengajuan ditolak oleh penanggung',
                          };
                          return desc[p.status] ? <p className="text-[10px] text-slate-400 mt-0.5">{desc[p.status]}</p> : null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-500">{formatIDR(p.total_premium)}</p>
                      {(() => {
                        const s: Record<string,{label:string;cls:string}> = {
                          SUBMITTED:    { label: 'Menunggu Review',         cls: 'bg-amber-500/10 text-amber-600' },
                          UNDER_REVIEW: { label: 'Sedang Dikaji',           cls: 'bg-blue-500/10 text-blue-600' },
                          APPROVED:     { label: 'Disetujui',               cls: 'bg-indigo-500/10 text-indigo-600' },
                          ISSUED:       { label: 'Polis Aktif',             cls: 'bg-emerald-500/10 text-emerald-600' },
                          REJECTED:     { label: 'Ditolak',                 cls: 'bg-rose-500/10 text-rose-600' },
                        };
                        const meta = s[p.status] ?? { label: p.status, cls: 'bg-slate-100 text-slate-400' };
                        return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Claims */}
              <div className="space-y-3">
                <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><AlertCircle size={12} />{t('My Claims', 'Klaim Saya')}</p>
                {customerClaims.length === 0 ? (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <AlertCircle size={22} />
                    </div>
                    <p className="text-slate-400 text-sm font-bold">{t('No claims submitted.', 'Belum ada klaim.')}</p>
                  </div>
                ) : customerClaims.map((c, i) => (
                  <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/10 flex items-center justify-center">
                        <AlertCircle size={20} className="text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{c.policy_number ?? c.claim_number ?? t('Claim', 'Klaim')}</p>
                        <p className="text-xs text-slate-400 font-medium">{new Date(c.created_at ?? '').toLocaleDateString('id-ID')} · {c.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-rose-500">{formatIDR(c.amount_estimated ?? 0)}</p>
                      {(() => {
                        const s: Record<string,{label:string;cls:string}> = {
                          SUBMITTED:    { label: 'Diajukan',       cls: 'bg-amber-500/10 text-amber-600' },
                          UNDER_REVIEW: { label: 'Sedang Dikaji',  cls: 'bg-blue-500/10 text-blue-600' },
                          APPROVED:     { label: 'Disetujui',      cls: 'bg-emerald-500/10 text-emerald-600' },
                          REJECTED:     { label: 'Ditolak',        cls: 'bg-rose-500/10 text-rose-600' },
                          PAID:         { label: 'Dibayarkan',     cls: 'bg-violet-500/10 text-violet-600' },
                        };
                        const meta = s[c.status] ?? { label: c.status, cls: 'bg-slate-100 text-slate-400' };
                        return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PageTransition>
        );

      case 'profile':
        return (
          <PageTransition>
            <UserProfile currentUser={currentUser} lang={lang} onLogout={onLogout} />
          </PageTransition>
        );

      case 'contact':
        return (
          <PageTransition>
            <ContactPage lang={lang} />
          </PageTransition>
        );

      case 'bot':
        return <HealthChat onBack={() => navigate('home')} lang={lang} />;

      case 'buy-car':
        return <CarInsuranceWizard onComplete={() => navigate('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-travel':
        return <TravelInsuranceWizard onComplete={() => navigate('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-pa':
        return <PAInsuranceWizard onComplete={() => navigate('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-mpar':
        return <MPARInsuranceWizard onComplete={() => navigate('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-health-ind':
        return <HealthChat onBack={() => navigate('home')} lang={lang} />;

      default:
        if (activePage.startsWith('buy-custom_')) {
          const productId = activePage.replace('buy-', '');
          return <CustomInsuranceWizard onComplete={() => navigate('home')} currentUser={currentUser} lang={lang} productId={productId} />;
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">

      {/* Fixed header */}
      {!isFullscreen && (
        <header className="fixed top-0 inset-x-0 z-40 bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 shadow-[0_1px_20px_-12px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-orange-500/30 ring-1 ring-orange-500/20 overflow-hidden">
                <SurePathLogo className="w-8 h-8 object-contain" />
              </div>
              <div>
                <div className="font-black text-sm tracking-tighter uppercase leading-none">
                  Sure<span className="text-primary-500">Path</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  {t('Customer Portal', 'Portal Nasabah')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="text-right mr-2">
                <div className="text-xs font-black tracking-tight leading-none">
                  {currentUser?.name ?? 'Nasabah'}
                </div>
                <div className="text-[10px] font-bold text-primary-500 uppercase tracking-widest leading-none mt-0.5">
                  {currentUser?.nodeId ?? 'SP-USER'}
                </div>
              </div>

              <button
                aria-label={t('Notifications', 'Notifikasi')}
                className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-90 transition-all duration-200 motion-reduce:transition-none"
              >
                <Bell size={14} className="text-slate-600 dark:text-slate-300" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#111]" />
              </button>

              <button
                aria-label={t('Toggle theme', 'Ganti tema')}
                onClick={() => setDarkMode(!darkMode)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-90 transition-all duration-200 motion-reduce:transition-none"
              >
                {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-600" />}
              </button>

              <button
                aria-label={t('Log out', 'Keluar')}
                onClick={onLogout}
                className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center ml-1 hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-90 transition-all duration-200 motion-reduce:transition-none"
              >
                <LogOut size={13} className="text-rose-500" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main
        ref={scrollRef}
        className={isFullscreen ? 'h-screen overflow-y-auto' : 'pt-16 pb-32 px-5 min-h-screen overflow-y-auto no-scrollbar'}
      >
        {renderContent()}
      </main>

      {/* Bottom tab navigation */}
      {!isFullscreen && (
        <nav className="fixed bottom-6 inset-x-3 z-50 bg-white/85 dark:bg-[#111]/85 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] border border-slate-100 dark:border-white/5 ring-1 ring-black/5 dark:ring-white/5">
          <div className="flex items-center justify-around px-1 py-2.5">
            {TABS.map(({ id, labelEn, labelId, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  aria-label={lang === Language.EN ? labelEn : labelId}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(id)}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl transition-all duration-300 ease-out motion-reduce:transition-none active:scale-95 ${
                    active
                      ? 'bg-gradient-to-br from-primary-400 to-primary-500 text-white scale-110 shadow-lg shadow-orange-500/30'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0'
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span className={`text-[8px] font-black uppercase tracking-widest leading-none transition-all duration-300 motion-reduce:transition-none ${active ? 'opacity-100' : 'opacity-80'}`}>
                    {lang === Language.EN ? labelEn : labelId}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default CustomerPortal;
