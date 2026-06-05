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
  { id: 'claim',    labelEn: 'Claim',   labelId: 'Klaim',   Icon: Zap },
  { id: 'products', labelEn: 'Buy',     labelId: 'Beli',    Icon: ShoppingBag },
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
            <div className="space-y-6 pb-32">
              <PortalHero
                onAction={navigate}
                lang={lang}
                userName={currentUser?.name ?? 'Nasabah'}
                nodeId={currentUser?.nodeId ?? 'SP-USER'}
                policyCount={customerPolicies.length}
                trustScore={currentUser?.trustScore ?? 85}
              />

              {/* Layanan Kami — circular icon grid (SurePath green Main Menu style) */}
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                    {t('Our Services', 'Layanan Kami')}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { id: 'products', label: t('Beli', 'Beli'),       icon: ShoppingBag, iconColor: '#2563eb', circleBg: '#DBEAFE' },
                    { id: 'claim',    label: t('Klaim', 'Klaim'),      icon: Zap,         iconColor: '#be123c', circleBg: '#FFE4E6' },
                    { id: 'history',  label: t('Riwayat', 'Riwayat'), icon: History,     iconColor: '#d97706', circleBg: '#FEF3C7' },
                    { id: 'bot',      label: 'Chat AI',                icon: Bot,         iconColor: '#7c3aed', circleBg: '#EDE9FE' },
                  ].map((action, i) => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() => navigate(action.id)}
                      style={{ animation: `spRise 0.45s cubic-bezier(.2,.7,.2,1) both`, animationDelay: `${i * 70}ms` }}
                      className="flex flex-col items-center gap-2 group active:scale-90 transition-transform duration-150 motion-reduce:transition-none focus:outline-none"
                    >
                      <div
                        className="w-16 h-16 rounded-[1.4rem] flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/[0.03] group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-90 transition-all duration-200 motion-reduce:transition-none"
                        style={{ background: action.circleBg }}
                      >
                        <action.icon size={24} strokeWidth={2.2} style={{ color: action.iconColor }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 text-center leading-tight">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active policy card — SurePath green gradient */}
              {latestPolicy && (
                <div
                  className="rounded-[1.75rem] p-5 relative overflow-hidden shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #16a34a 0%, #052e16 100%)' }}
                >
                  {/* decorative glow */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
                          {t('POLIS AKTIF', 'POLIS AKTIF')}
                        </p>
                        <p className="text-white font-black text-lg tracking-tight mt-0.5">
                          {(latestPolicy.vehicle_details as any)?.make ?? latestPolicy.product_name}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <ShieldCheck size={20} className="text-white" />
                      </div>
                    </div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">
                      {t('No. Polis', 'No. Polis')}
                    </p>
                    <p className="text-white font-black text-base tracking-widest mb-5">
                      {latestPolicy.order_number ?? '● ● ● ─ ● ● ● ─ ● ● ● ●'}
                    </p>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                      <div>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                          {t('BERLAKU HINGGA', 'BERLAKU HINGGA')}
                        </p>
                        <p className="text-white font-black text-sm mt-0.5">
                          {new Date(latestPolicy.end_date ?? '').toLocaleDateString(
                            lang === Language.EN ? 'en-US' : 'id-ID',
                            { month: 'long', year: 'numeric' }
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('profile')}
                        className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                      >
                        {t('Detail →', 'Detail →')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tip */}
              <div className="p-5 bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 flex gap-4 shadow-sm hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none">
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
                    className={`group p-5 bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 flex items-center gap-5 transition-all duration-300 motion-reduce:transition-none ${p.active ? 'cursor-pointer hover:border-primary-500/30 hover:-translate-y-0.5 shadow-sm hover:shadow-xl active:scale-[0.98] active:shadow-md' : 'opacity-40 grayscale'}`}
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
                  <div className="p-8 bg-white dark:bg-[#0d2618] rounded-[2rem] border border-dashed border-slate-200 dark:border-[#16a34a]/20 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                      <FileText size={22} />
                    </div>
                    <p className="text-slate-400 text-sm font-bold">{t('No policies yet. Buy your first plan!', 'Belum ada polis. Beli paket pertamamu!')}</p>
                    <button
                      onClick={() => navigate('products')}
                      className="px-5 py-2 bg-emerald-500 text-white rounded-xl font-black uppercase text-[0.55rem] tracking-widest shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform duration-200 motion-reduce:transition-none"
                    >
                      {t('Browse Plans', 'Lihat Paket')}
                    </button>
                  </div>
                ) : customerPolicies.map((p, i) => (
                  <div key={i} className="p-5 bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none">
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
                  <div className="p-8 bg-white dark:bg-[#0d2618] rounded-[2rem] border border-dashed border-slate-200 dark:border-[#16a34a]/20 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <AlertCircle size={22} />
                    </div>
                    <p className="text-slate-400 text-sm font-bold">{t('No claims submitted.', 'Belum ada klaim.')}</p>
                  </div>
                ) : customerClaims.map((c, i) => (
                  <div key={i} className="p-5 bg-white dark:bg-[#0d2618] rounded-[2rem] border border-slate-100 dark:border-[#16a34a]/15 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none">
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
        return (
          <div className="flex flex-col">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/40 px-4 py-3 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Konsultasi Kesehatan:</strong> Fitur pembelian polis kesehatan sedang dalam pengembangan.
                Gunakan chatbot ini untuk berkonsultasi — tim kami akan menghubungi Anda.
              </p>
            </div>
            <HealthChat onBack={() => navigate('home')} lang={lang} />
          </div>
        );

      default:
        if (activePage.startsWith('buy-custom_')) {
          const productId = activePage.replace('buy-', '');
          return <CustomInsuranceWizard onComplete={() => navigate('home')} currentUser={currentUser} lang={lang} productId={productId} />;
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#071c10] text-slate-900 dark:text-white transition-colors duration-300">

      {/* Fixed header — SurePath green gradient */}
      {!isFullscreen && (
        <header
          className="fixed top-0 inset-x-0 z-40"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 65%, #16a34a 100%)' }}
        >
          {/* Top row: logo + action icons */}
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                <SurePathLogo className="w-6 h-6 object-contain" />
              </div>
              <span className="text-white font-black text-[15px] tracking-tight">
                Sure<span style={{ color: '#4ade80' }}>Path</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  aria-label={t('Notifications', 'Notifikasi')}
                  aria-haspopup="true"
                  aria-expanded={showNotifications}
                  onClick={() => setShowNotifications(v => !v)}
                  className="relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                >
                  <Bell size={15} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 ring-1 ring-white/20" />
                  )}
                </button>
                {showNotifications && (
                  <>
                    <button
                      aria-label={t('Close notifications', 'Tutup notifikasi')}
                      onClick={() => setShowNotifications(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div role="menu" className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto no-scrollbar z-50 bg-white dark:bg-[#0d2618] rounded-2xl border border-slate-100 dark:border-[#16a34a]/20 shadow-2xl p-2">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">
                        {t('Notifications', 'Notifikasi')}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs font-bold text-slate-400">
                          {t('No notifications yet', 'Belum ada notifikasi')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`px-3 py-2.5 rounded-xl mb-1 last:mb-0 ${n.read ? 'opacity-60' : 'bg-slate-50 dark:bg-white/5'}`}>
                            <div className="text-xs font-black text-slate-800 dark:text-white leading-tight">{n.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.body}</div>
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
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
              >
                {darkMode ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-white" />}
              </button>
              <button
                aria-label={t('Log out', 'Keluar')}
                onClick={onLogout}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
              >
                <LogOut size={13} className="text-white/80" />
              </button>
            </div>
          </div>
          {/* Greeting row */}
          <div className="px-5 pt-1 pb-4">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.25em] leading-none">HALO,</p>
            <p className="text-white font-black text-xl tracking-tight leading-tight mt-0.5">
              {(currentUser?.name ?? 'Nasabah').toUpperCase()}
            </p>
            <p className="text-white/40 text-[10px] font-bold mt-0.5">
              {currentUser?.nodeId ?? 'SP-USER'} &bull; {t('SECURE ACCOUNT', 'AKUN AMAN')}
            </p>
          </div>
        </header>
      )}

      {/* Main content */}
      <main
        ref={scrollRef}
        className={isFullscreen ? 'h-screen overflow-y-auto' : 'pt-28 pb-24 px-5 min-h-screen overflow-y-auto no-scrollbar'}
      >
        {renderContent()}
      </main>

      {/* Bottom tab navigation — flat dark SurePath green bar */}
      {!isFullscreen && (
        <nav
          className="fixed bottom-0 inset-x-0 z-50"
          style={{ background: '#052e16', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
        >
          <div className="flex items-center justify-around px-2 pt-2 pb-3">
            {TABS.map(({ id, labelEn, labelId, Icon }, index) => {
              const active = activeTab === id;
              const isCenter = index === 2;
              return (
                <button
                  key={id}
                  aria-label={lang === Language.EN ? labelEn : labelId}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(id)}
                  className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 motion-reduce:transition-none ${isCenter ? '-mt-7' : ''}`}
                >
                  {isCenter ? (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #14532d)', boxShadow: '0 4px 20px rgba(22,163,74,0.5)' }}
                    >
                      <Icon size={22} strokeWidth={2.5} className="text-white" />
                    </div>
                  ) : (
                    <>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-white/15' : ''}`}>
                        <Icon size={17} strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#4ade80' : 'rgba(255,255,255,0.35)' }} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: active ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
                        {lang === Language.EN ? labelEn : labelId}
                      </span>
                    </>
                  )}
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
