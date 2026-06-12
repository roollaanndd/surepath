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
import { getCustomerOrders, getCustomerClaims, getNotifications, type SpPolicyOrder, type SpClaim, type SpNotification } from '../../services/supabaseService';
import { Badge } from '../shared/UI';
import PathyChat from '../shared/PathyChat';

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
  const [notifications, setNotifications] = useState<SpNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
      getNotifications(currentUser.id).then(notifs => {
        setNotifications(notifs);
      }).catch(() => {});
    }
  }, [currentUser?.id]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

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
            <div className="space-y-5 pb-32">
              {/* Greeting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('profile')}
                    className="relative cursor-pointer active:scale-95 transition-transform focus:outline-none"
                  >
                    <div className="w-12 h-12 bg-ds-green rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-ds-green">
                      {currentUser?.name?.[0]}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-ds-bg flex items-center justify-center text-[8px] text-ds-green font-black shadow-sm">
                      {currentUser?.trustScore || 85}
                    </div>
                  </button>
                  <div>
                    <p className="text-xs text-ds-ink3">{timeGreeting}</p>
                    <h3 className="text-base font-black text-ds-ink tracking-tight">
                      {currentUser?.name?.split(' ')[0]}!
                    </h3>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-ds-green-tint rounded-full text-[10px] font-bold text-ds-green">
                  <ShieldCheck size={10} />
                  {t('Protected', 'Terlindungi')}
                </span>
              </div>

              {/* Hero protection card */}
              <div className="rounded-3xl p-5 bg-ds-navy text-white relative overflow-hidden shadow-ds-navy">
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(0,200,150,0.12)' }} />
                <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,200,150,0.06)' }} />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">
                    {t('Protection Status', 'Status Proteksi')}
                  </p>
                  {latestPolicy ? (
                    <>
                      <h4 className="text-xl font-black text-white">
                        {(latestPolicy.vehicle_details as any)?.make ?? latestPolicy.product_name}
                      </h4>
                      <p className="text-xs text-white/50 mt-0.5">
                        {t('Active until', 'Aktif hingga')}{' '}
                        {new Date(latestPolicy.end_date ?? '').toLocaleDateString(
                          lang === Language.EN ? 'en-US' : 'id-ID',
                          { month: 'long', year: 'numeric' }
                        )}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-ds-green animate-pulse" />
                          <span className="text-xs text-ds-green font-bold">{t('Active', 'Aktif')}</span>
                        </div>
                        <button
                          onClick={() => navigate('profile')}
                          className="px-4 py-1.5 bg-white/10 border border-white/10 rounded-xl text-xs text-white font-bold hover:bg-white/15 transition-all active:scale-95"
                        >
                          {t('Details', 'Detail')} →
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-xl font-black text-white mt-1">{t('No active policy', 'Belum ada polis')}</h4>
                      <p className="text-xs text-white/50 mt-0.5">{t('Start protecting yourself today', 'Mulai lindungi dirimu sekarang')}</p>
                      <button
                        onClick={() => navigate('products')}
                        className="mt-4 px-4 py-2 bg-ds-green rounded-xl text-xs text-white font-black tracking-wide shadow-ds-green active:scale-95 transition-transform"
                      >
                        {t('Buy Insurance', 'Beli Asuransi')} →
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-3">{t('Quick Actions', 'Aksi Cepat')}</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'products', label: t('Buy', 'Beli'),       icon: ShoppingBag, color: 'text-blue-500',  bg: 'bg-blue-50'       },
                    { id: 'claim',    label: t('Claim', 'Klaim'),     icon: Zap,         color: 'text-rose-500',  bg: 'bg-rose-50'       },
                    { id: 'history',  label: t('History', 'Riwayat'), icon: History,     color: 'text-ds-green',  bg: 'bg-ds-green-tint' },
                    { id: 'bot',      label: 'AI Chat',               icon: Bot,         color: 'text-ds-purple', bg: 'bg-ds-purple-lt'  },
                  ].map(action => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() => navigate(action.id)}
                      className="flex flex-col items-center gap-2 group active:scale-90 transition-transform focus:outline-none"
                    >
                      <div className={`w-14 h-14 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shadow-ds-sm group-hover:scale-105 transition-transform duration-200`}>
                        <action.icon size={24} strokeWidth={2} />
                      </div>
                      <span className="text-[10px] font-bold text-ds-ink2 text-center">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <PortalHero onAction={navigate} lang={lang} />

              {/* AI insight card */}
              <div className="rounded-3xl p-4 bg-ds-purple-lt border border-purple-100 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-ds-sm">
                  <Lightbulb size={20} className="text-ds-purple" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-ds-purple uppercase tracking-wider">SurePath AI</p>
                  <p className="text-sm text-ds-ink leading-relaxed">
                    {t(
                      'File a claim by just taking a photo. Our AI processes it in minutes.',
                      'Lapor klaim cukup dengan foto HP. AI kami memprosesnya dalam hitungan menit.'
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
            <div className="space-y-6 pb-32 pt-2">
              {/* Section header */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Simple Protection', 'Pusat Proteksi')}</p>
                <h2 className="text-2xl font-black tracking-tight text-ds-ink">
                  {t('Choose a Plan', 'Pilih Paket')} <span className="text-ds-green">SurePath</span>
                </h2>
              </div>

              {/* Product cards */}
              <div className="grid grid-cols-1 gap-3">
                {(products ?? []).filter(p => p?.id).map(p => (
                  <div
                    key={p.id}
                    onClick={() => p.active && navigate(`buy-${p.id}`)}
                    className={`group bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center gap-4 transition-all duration-200 ${p.active ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-ds-md active:scale-[0.98]' : 'opacity-40 grayscale pointer-events-none'}`}
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 ${p.bg ?? 'bg-ds-card2'} ${p.color ?? 'text-ds-ink3'} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-ds-sm group-hover:scale-105 transition-transform duration-200`}>
                      {typeof p.icon === 'function' && <p.icon size={24} strokeWidth={2} />}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="font-black text-sm text-ds-ink tracking-tight">{p.title}</h4>
                        {p.tech && (
                          <span className="px-2 py-0.5 bg-ds-card2 rounded-lg text-[9px] font-bold uppercase tracking-widest text-ds-ink3 flex-shrink-0">{p.tech}</span>
                        )}
                      </div>
                      <p className="text-xs text-ds-ink2 leading-relaxed">{p.desc}</p>
                    </div>

                    {/* CTA arrow for active products */}
                    {p.active && (
                      <div className="w-8 h-8 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                        <span className="text-ds-green text-sm font-black">→</span>
                      </div>
                    )}
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
            <div className="space-y-5 pb-32 pt-2">
              <div>
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-1">{t('Your Activity', 'Aktivitas Anda')}</p>
                <h2 className="text-2xl font-black text-ds-ink tracking-tight">{t('My History', 'Riwayat Saya')}</h2>
              </div>

              {/* Policies */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={11} className="text-ds-green" />
                  {t('Active Policies', 'Polis Aktif')}
                </p>
                {customerPolicies.length === 0 ? (
                  <div className="p-8 bg-ds-card rounded-2xl border border-dashed border-ds-border flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-ds-green-tint flex items-center justify-center">
                      <FileText size={22} className="text-ds-green" />
                    </div>
                    <p className="text-ds-ink2 text-sm font-bold">{t('No policies yet. Buy your first plan!', 'Belum ada polis. Beli paket pertamamu!')}</p>
                    <button
                      onClick={() => navigate('products')}
                      className="px-5 py-2 bg-ds-green text-white rounded-xl font-black text-[10px] tracking-widest shadow-ds-green active:scale-95 transition-transform"
                    >
                      {t('Browse Plans', 'Lihat Paket')}
                    </button>
                  </div>
                ) : customerPolicies.map((p, i) => (
                  <div key={i} className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                        {p.vehicle_type === 'CAR' ? <Car size={18} className="text-ds-green" /> : <ShieldCheck size={18} className="text-ds-green" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-ds-ink">{p.policy_number ?? p.order_number ?? p.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-xs text-ds-ink3">{p.product_code}{p.end_date ? ` · ${t('Expires','Berakhir')} ${new Date(p.end_date).toLocaleDateString('id-ID')}` : ''}</p>
                        {(() => {
                          const desc: Record<string,string> = {
                            SUBMITTED:'Menunggu konfirmasi penanggung', UNDER_REVIEW:'Sedang dikaji oleh penanggung',
                            APPROVED:'Disetujui — menunggu penerbitan polis', ISSUED:'Polis aktif & berlaku',
                            REJECTED:'Pengajuan ditolak oleh penanggung',
                          };
                          return desc[p.status] ? <p className="text-[10px] text-ds-ink3 mt-0.5">{desc[p.status]}</p> : null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-ds-green">{formatIDR(p.total_premium)}</p>
                      {(() => {
                        const s: Record<string,{label:string;cls:string}> = {
                          SUBMITTED:    { label: 'Menunggu Review', cls: 'bg-amber-50 text-ds-amber' },
                          UNDER_REVIEW: { label: 'Sedang Dikaji',   cls: 'bg-blue-50 text-ds-blue' },
                          APPROVED:     { label: 'Disetujui',       cls: 'bg-blue-50 text-ds-blue' },
                          ISSUED:       { label: 'Polis Aktif',     cls: 'bg-ds-green-tint text-ds-green' },
                          REJECTED:     { label: 'Ditolak',         cls: 'bg-rose-50 text-ds-red' },
                        };
                        const meta = s[p.status] ?? { label: p.status, cls: 'bg-ds-card2 text-ds-ink3' };
                        return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${meta.cls}`}>{meta.label}</span>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Claims */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle size={11} className="text-ds-red" />
                  {t('My Claims', 'Klaim Saya')}
                </p>
                {customerClaims.length === 0 ? (
                  <div className="p-8 bg-ds-card rounded-2xl border border-dashed border-ds-border flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                      <AlertCircle size={22} className="text-ds-red" />
                    </div>
                    <p className="text-ds-ink2 text-sm font-bold">{t('No claims submitted.', 'Belum ada klaim.')}</p>
                  </div>
                ) : customerClaims.map((c, i) => (
                  <div key={i} className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={18} className="text-ds-red" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-ds-ink">{c.policy_number ?? c.claim_number ?? t('Claim', 'Klaim')}</p>
                        <p className="text-xs text-ds-ink3">{new Date(c.created_at ?? '').toLocaleDateString('id-ID')} · {c.location}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-ds-red">{formatIDR(c.amount_estimated ?? 0)}</p>
                      {(() => {
                        const s: Record<string,{label:string;cls:string}> = {
                          SUBMITTED:    { label: 'Diajukan',     cls: 'bg-amber-50 text-ds-amber' },
                          UNDER_REVIEW: { label: 'Sedang Dikaji',cls: 'bg-blue-50 text-ds-blue' },
                          APPROVED:     { label: 'Disetujui',    cls: 'bg-ds-green-tint text-ds-green' },
                          REJECTED:     { label: 'Ditolak',      cls: 'bg-rose-50 text-ds-red' },
                          PAID:         { label: 'Dibayarkan',   cls: 'bg-ds-purple-lt text-ds-purple' },
                        };
                        const meta = s[c.status] ?? { label: c.status, cls: 'bg-ds-card2 text-ds-ink3' };
                        return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${meta.cls}`}>{meta.label}</span>;
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
    <div className="min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink dark:text-white transition-colors duration-300">

      {/* Fixed header */}
      {!isFullscreen && (
        <header className="fixed top-0 inset-x-0 z-40 bg-ds-card/95 dark:bg-ds-dk-s1/95 backdrop-blur-xl border-b border-ds-border dark:border-ds-dk-bd shadow-ds-sm">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-500/20 overflow-hidden">
                <SurePathLogo className="w-8 h-8 object-contain" />
              </div>
              <div>
                <div className="font-black text-sm tracking-tighter uppercase leading-none">
                  Sure<span className="text-ds-green">Path</span>
                </div>
                <div className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest leading-none">
                  {t('Customer Portal', 'Portal Nasabah')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="text-right mr-2">
                <div className="text-xs font-black tracking-tight leading-none">
                  {currentUser?.name ?? 'Nasabah'}
                </div>
                <div className="text-[10px] font-bold text-ds-green uppercase tracking-widest leading-none mt-0.5">
                  {currentUser?.nodeId ?? 'SP-USER'}
                </div>
              </div>

              <div className="relative">
                <button
                  aria-label={t('Notifications', 'Notifikasi')}
                  aria-haspopup="true"
                  aria-expanded={showNotifications}
                  onClick={() => setShowNotifications(v => !v)}
                  className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-90 transition-all duration-200 motion-reduce:transition-none"
                >
                  <Bell size={14} className="text-slate-600 dark:text-slate-300" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#111]" />
                  )}
                </button>

                {showNotifications && (
                  <>
                    {/* Click-away backdrop */}
                    <button
                      aria-label={t('Close notifications', 'Tutup notifikasi')}
                      onClick={() => setShowNotifications(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto no-scrollbar z-50 bg-white dark:bg-[#161616] rounded-2xl border border-slate-100 dark:border-white/10 shadow-2xl p-2"
                    >
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {t('Notifications', 'Notifikasi')}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs font-bold text-slate-400">
                          {t('No notifications yet', 'Belum ada notifikasi')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`px-3 py-2.5 rounded-xl mb-1 last:mb-0 ${n.read ? 'opacity-60' : 'bg-slate-50 dark:bg-white/5'}`}
                          >
                            <div className="text-xs font-black text-slate-800 dark:text-white leading-tight">{n.title}</div>
                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.body}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

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
        <nav className="fixed bottom-6 inset-x-3 z-50 bg-ds-card/95 dark:bg-ds-dk-s1/95 backdrop-blur-2xl rounded-[3rem] shadow-ds-lg border border-ds-border dark:border-ds-dk-bd">
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
                      ? 'bg-ds-green text-white scale-110 shadow-ds-green'
                      : 'text-ds-ink3 hover:text-ds-ink2 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0'
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

      {/* Floating Pathy assistant */}
      {!isFullscreen && <PathyChat lang={lang} />}
    </div>
  );
};

export default CustomerPortal;
