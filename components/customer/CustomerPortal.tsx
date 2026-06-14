import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, ShoppingBag, Zap, History, UserCircle,
  Sun, Moon, LogOut, ShieldCheck, Bell,
  Car, Plane, Bot, FileText, AlertCircle, ArrowRight
} from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../Navbar';
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
import { HeroCard, AICard, StatCard, ActionGrid, SectionLabel, CoverageRow, FeaturedCard } from '../shared/cards';
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');
  const [latestPolicy, setLatestPolicy] = useState<SpPolicyOrder | null>(null);
  const [customerPolicies, setCustomerPolicies] = useState<SpPolicyOrder[]>([]);
  const [customerClaims, setCustomerClaims] = useState<SpClaim[]>([]);
  const [notifications, setNotifications] = useState<SpNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('sp_dark_mode', String(darkMode));
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
      case 'home': {
        const coverageLabels = Array.from(new Set(customerPolicies.map(p => {
          const code = (p.product_code ?? '').toUpperCase();
          if (p.vehicle_type === 'CAR' || code.includes('CAR') || code.includes('AUTO')) return t('Vehicle Protection', 'Proteksi Kendaraan');
          if (code.includes('TRAVEL')) return t('Travel Protection', 'Proteksi Perjalanan');
          if (code.includes('PA')) return t('Personal Accident', 'Kecelakaan Diri');
          if (code.includes('MPAR') || code.includes('GADGET')) return t('Property & Gadget', 'Properti & Gadget');
          if (code.includes('HEALTH')) return t('Health Protection', 'Proteksi Kesehatan');
          return p.product_name || t('Active Protection', 'Proteksi Aktif');
        }))).slice(0, 3);
        const totalPremium = customerPolicies.reduce((s, p) => s + (p.total_premium ?? 0), 0);
        const homeDaysLeft = latestPolicy?.end_date
          ? Math.max(0, Math.ceil((new Date(latestPolicy.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;
        return (
          <PageTransition>
            <div className="space-y-4 pb-32">
              {/* Greeting row */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ds-ink3 font-medium">{timeGreeting},</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-xl font-black text-ds-ink tracking-tight">
                      {currentUser?.name?.split(' ')[0]}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: '#00C896' }}>
                      {currentUser?.trustScore || 85}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="relative cursor-pointer active:scale-95 transition-transform focus:outline-none"
                >
                  <div className="w-11 h-11 bg-ds-green rounded-2xl flex items-center justify-center text-white font-black text-base shadow-ds-green">
                    {currentUser?.name?.[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-ds-bg" style={{ background: '#00C896' }} />
                </button>
              </div>

              {/* Protection Score Hero */}
              <HeroCard>
                <div className="flex items-center gap-5">
                  {/* SVG Protection Score Ring */}
                  <div className="relative flex-shrink-0">
                    <svg width="86" height="86" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"/>
                      <circle
                        cx="50" cy="50" r="38"
                        fill="none"
                        stroke="#00C16A"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray="238.76"
                        strokeDashoffset={238.76 * (1 - Math.min(100, currentUser?.trustScore ?? 85) / 100)}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-white leading-none">{currentUser?.trustScore ?? 85}</span>
                      <span className="text-[8px] text-white/40 font-bold">/100</span>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C16A' }} />
                      <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">{t('Protection Score', 'Skor Proteksi')}</p>
                    </div>
                    {latestPolicy ? (
                      <>
                        <h4 className="text-lg font-black text-white leading-tight mb-2">{t('You\'re Protected', 'Kamu Terlindungi')}</h4>
                        <div className="space-y-1.5">
                          {coverageLabels.map(label => <CoverageRow key={label} label={label} />)}
                        </div>
                        <button onClick={() => navigate('history')} className="mt-3 px-3 py-1.5 rounded-xl text-[11px] font-black text-white border border-white/15 bg-white/10 active:scale-95 transition-transform inline-block">
                          {t('View Policy', 'Lihat Polis')} →
                        </button>
                      </>
                    ) : (
                      <>
                        <h4 className="text-lg font-black text-white leading-tight">{t('Start Protecting', 'Mulai Lindungi')}</h4>
                        <p className="text-[11px] text-white/50 mt-1">{t('Get covered in minutes', 'Terlindungi dalam hitungan menit')}</p>
                        <button onClick={() => navigate('products')} className="mt-3 px-3 py-1.5 rounded-xl text-[11px] font-black text-white active:scale-95 transition-transform inline-block" style={{ background: '#00C16A' }}>
                          {t('Get Protected', 'Mulai Sekarang')} →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </HeroCard>

              {/* My Protection — 3 metrics */}
              {latestPolicy && (
                <div>
                  <SectionLabel>{t('My Protection', 'Proteksi Saya')}</SectionLabel>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label={t('Total Premium', 'Total Premi')} value={formatIDR(totalPremium)} sub={t('all policies', 'semua polis')} />
                    <StatCard label={t('Active', 'Aktif')} value={customerPolicies.length} sub={t('policies', 'polis')} />
                    <StatCard label={t('Days Left', 'Sisa Hari')} value={homeDaysLeft} sub={t('to renewal', 'ke perpanjangan')} progress={(homeDaysLeft / 365) * 100} />
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div>
                <SectionLabel>{t('Quick Actions', 'Aksi Cepat')}</SectionLabel>
                <ActionGrid
                  actions={[
                    { id: 'products', label: t('Buy Protection', 'Beli Proteksi'), icon: ShoppingBag, color: 'text-ds-blue',   bg: 'bg-blue-50',       onClick: () => navigate('products') },
                    { id: 'claim',    label: t('Submit Claim', 'Lapor Klaim'),     icon: Zap,         color: 'text-rose-500',  bg: 'bg-rose-50',       onClick: () => navigate('claim') },
                    { id: 'history',  label: t('My Policies', 'Polis Saya'),        icon: History,     color: 'text-ds-green',  bg: 'bg-ds-green-tint', onClick: () => navigate('history') },
                    { id: 'bot',      label: t('AI Advisor', 'Penasihat AI'),       icon: Bot,         color: 'text-ds-purple', bg: 'bg-ds-purple-lt',  onClick: () => navigate('bot') },
                  ]}
                />
              </div>

              {/* Pathy AI card */}
              <AICard
                message={latestPolicy
                  ? t(
                      `Hi ${currentUser?.name?.split(' ')[0]}! Your ${latestPolicy.product_name} is active. File a claim anytime by snapping a photo.`,
                      `Halo ${currentUser?.name?.split(' ')[0]}! Polis ${latestPolicy.product_name} kamu aktif. Lapor klaim kapan saja cukup dengan foto.`
                    )
                  : t(
                      'Get insured in minutes. Our AI makes claims fast and effortless.',
                      'Dapatkan asuransi dalam hitungan menit. AI kami membuat klaim jadi cepat & mudah.'
                    )}
                suggestion={latestPolicy ? { label: t('Add baggage delay coverage', 'Tambah proteksi bagasi'), onClick: () => navigate('buy-travel') } : undefined}
                cta={{ label: t('Chat with Pathy', 'Chat dengan Pathy'), onClick: () => navigate('bot') }}
              />

              {/* Featured for you */}
              <div>
                <SectionLabel>{t('Featured for You', 'Pilihan Untukmu')}</SectionLabel>
                <FeaturedCard
                  eyebrow={t('Travel', 'Perjalanan')}
                  title={t('Travel Protected Everywhere', 'Terlindungi di Mana Saja')}
                  subtitle={t('Global coverage from Rp 45k/trip', 'Proteksi global mulai Rp 45rb/trip')}
                  cta={{ label: t('Get Covered', 'Lindungi Sekarang'), onClick: () => navigate('buy-travel') }}
                  illustration={<Plane size={120} className="text-white/15 rotate-12" strokeWidth={1.2} />}
                />
              </div>

              {/* Recent Activity */}
              {(customerPolicies.length > 0 || customerClaims.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Recent Activity', 'Aktivitas Terbaru')}</p>
                    <button onClick={() => navigate('history')} className="text-xs font-bold text-ds-green">{t('All', 'Semua')}</button>
                  </div>
                  <div className="bg-ds-card border border-ds-border rounded-2xl shadow-ds-sm overflow-hidden">
                    {customerPolicies.slice(0, 2).map((p, i) => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < customerPolicies.slice(0, 2).length - 1 || customerClaims.length > 0 ? 'border-b border-ds-border' : ''}`}>
                        <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                          <ShieldCheck size={16} className="text-ds-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ds-ink truncate">{p.product_name}</p>
                          <p className="text-[10px] text-ds-ink3">{new Date(p.created_at ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'ISSUED' ? 'bg-ds-green-tint text-ds-green' : 'bg-amber-50 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                    {customerClaims.slice(0, 1).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                          <Zap size={16} className="text-rose-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ds-ink truncate">{t('Claim', 'Klaim')} #{c.claim_number ?? c.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-ds-ink3">{new Date(c.created_at ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PageTransition>
        );
      }

      case 'products':
        return (
          <PageTransition>
            <div className="space-y-5 pb-32 pt-2">
              {/* Header */}
              <div>
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-1">{t('Protection Centre', 'Pusat Proteksi')}</p>
                <h2 className="text-2xl font-black tracking-tight text-ds-ink">
                  {t('Choose Your', 'Pilih')} <span className="text-ds-green">{t('Protection', 'Proteksi')}</span>
                </h2>
              </div>

              {/* AI recommendation strip */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-ds-green-tint border border-green-100">
                <Bot size={16} className="text-ds-green flex-shrink-0" />
                <p className="text-xs font-bold text-ds-green flex-1">{t('Pathy recommends: add Travel protection — fits your profile', 'Pathy rekomendasikan: tambah proteksi Travel — sesuai profilmu')}</p>
                <button onClick={() => navigate('buy-travel')} className="flex-shrink-0">
                  <ArrowRight size={14} className="text-ds-green" />
                </button>
              </div>

              {/* Product cards */}
              <div className="grid grid-cols-1 gap-3">
                {(products ?? []).filter(p => p?.id).map((p, pIdx) => (
                  <div
                    key={p.id}
                    onClick={() => p.active && navigate(`buy-${p.id}`)}
                    style={{ animationDelay: `${pIdx * 60}ms` }}
                    className={`group relative bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center gap-4 transition-all duration-200 overflow-hidden animate-fade-in ${p.active ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-ds-md hover:border-emerald-500/20 active:scale-[0.98]' : 'opacity-40 grayscale pointer-events-none'}`}
                  >
                    {/* Subtle background glow — product brand color at very low opacity */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.06) 0%, transparent 70%)' }} />
                    </div>
                    {/* Faint dot-grid pattern */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className={`w-12 h-12 ${p.bg ?? 'bg-ds-card2'} ${p.color ?? 'text-ds-ink3'} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-ds-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10`}>
                      {typeof p.icon === 'function' && <p.icon size={24} strokeWidth={2} />}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-sm text-ds-ink tracking-tight">{p.title}</h4>
                        {p.tech && <span className="px-2 py-0.5 bg-ds-card2 rounded-lg text-[9px] font-bold uppercase tracking-widest text-ds-ink3">{p.tech}</span>}
                      </div>
                      <p className="text-xs text-ds-ink2 leading-relaxed">{p.desc}</p>
                    </div>
                    {p.active && (
                      <div className="w-8 h-8 rounded-xl bg-ds-green text-white flex items-center justify-center flex-shrink-0 shadow-ds-green group-hover:scale-110 group-hover:shadow-lg transition-all duration-200 relative z-10">
                        <ArrowRight size={14} />
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
            <div className="pb-32">
              {/* Pre-claim hero */}
              <div className="mb-4 rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #4D7CFE 100%)', boxShadow: '0 8px 32px rgba(124,92,252,0.3)' }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(255,255,255,0.12)' }} />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">{t('Claim Assistant', 'Asisten Klaim')}</p>
                <h3 className="text-lg font-black text-white mb-1">{t('File a Claim', 'Lapor Klaim')}</h3>
                <p className="text-[12px] text-white/70 leading-snug">{t('Photo + AI = instant processing. Most claims settled in 24h.', 'Foto + AI = proses instan. Sebagian besar klaim selesai dalam 24 jam.')}</p>
              </div>
              <ClaimManager onComplete={() => navigate('home')} lang={lang} currentUser={currentUser} />
            </div>
          </PageTransition>
        );

      case 'history': {
        const totalValue = customerPolicies.reduce((s, p) => s + (p.total_premium ?? 0), 0);
        const activePolicies = customerPolicies.filter(p => p.status === 'ISSUED');
        const pendingClaims = customerClaims.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW');
        const policyStatusMap: Record<string,{label:string;cls:string}> = {
          SUBMITTED:    { label: t('Pending Review','Menunggu Review'), cls: 'bg-amber-50 text-ds-amber' },
          UNDER_REVIEW: { label: t('Under Review','Sedang Dikaji'),    cls: 'bg-blue-50 text-ds-blue' },
          APPROVED:     { label: t('Approved','Disetujui'),             cls: 'bg-blue-50 text-ds-blue' },
          ISSUED:       { label: t('Active','Polis Aktif'),             cls: 'bg-ds-green-tint text-ds-green' },
          REJECTED:     { label: t('Rejected','Ditolak'),               cls: 'bg-rose-50 text-ds-red' },
        };
        const claimStatusMap: Record<string,{label:string;cls:string}> = {
          SUBMITTED:    { label: t('Submitted','Diajukan'),       cls: 'bg-amber-50 text-ds-amber' },
          UNDER_REVIEW: { label: t('Under Review','Sedang Dikaji'),cls: 'bg-blue-50 text-ds-blue' },
          APPROVED:     { label: t('Approved','Disetujui'),       cls: 'bg-ds-green-tint text-ds-green' },
          REJECTED:     { label: t('Rejected','Ditolak'),         cls: 'bg-rose-50 text-ds-red' },
          PAID:         { label: t('Paid','Dibayarkan'),          cls: 'bg-ds-purple-lt text-ds-purple' },
        };
        return (
          <PageTransition>
            <div className="space-y-5 pb-32 pt-2">
              {/* Summary hero */}
              <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #003B2F 0%, #005240 100%)', boxShadow: '0 8px 24px rgba(0,59,47,0.4)' }}>
                <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.2)' }} />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-3">{t('My Protection Wallet', 'Dompet Proteksi Saya')}</p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] text-white/40">{t('Total Premium', 'Total Premi')}</p>
                    <p className="text-xl font-black text-white">{formatIDR(totalValue)}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-[10px] text-white/40">{t('Active', 'Aktif')}</p>
                    <p className="text-xl font-black text-ds-green">{activePolicies.length}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-[10px] text-white/40">{t('Pending', 'Proses')}</p>
                    <p className="text-xl font-black" style={{ color: '#F5B942' }}>{pendingClaims.length}</p>
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={11} className="text-ds-green" />
                  {t('My Policies', 'Polis Saya')}
                </p>
                {customerPolicies.length === 0 ? (
                  <div className="p-8 bg-ds-card rounded-2xl border border-dashed border-ds-border flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-ds-green-tint flex items-center justify-center">
                      <FileText size={22} className="text-ds-green" />
                    </div>
                    <p className="text-ds-ink2 text-sm font-bold">{t('No policies yet.', 'Belum ada polis.')}</p>
                    <button onClick={() => navigate('products')} className="px-5 py-2 bg-ds-green text-white rounded-xl font-black text-[10px] tracking-widest shadow-ds-green active:scale-95 transition-transform">
                      {t('Browse Plans', 'Lihat Paket')}
                    </button>
                  </div>
                ) : customerPolicies.map((p, i) => {
                  const pDesc: Record<string,string> = {
                    SUBMITTED:'Menunggu konfirmasi penanggung', UNDER_REVIEW:'Sedang dikaji oleh penanggung',
                    APPROVED:'Disetujui — menunggu penerbitan polis', ISSUED:'Polis aktif & berlaku',
                    REJECTED:'Pengajuan ditolak oleh penanggung',
                  };
                  const meta = policyStatusMap[p.status] ?? { label: p.status, cls: 'bg-ds-card2 text-ds-ink3' };
                  return (
                    <div key={i} className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                          {p.vehicle_type === 'CAR' ? <Car size={18} className="text-ds-green" /> : <ShieldCheck size={18} className="text-ds-green" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-ds-ink">{p.policy_number ?? p.order_number ?? p.id.slice(0,8).toUpperCase()}</p>
                          <p className="text-xs text-ds-ink3">{p.product_code}{p.end_date ? ` · ${t('Exp','Exp')} ${new Date(p.end_date).toLocaleDateString('id-ID')}` : ''}</p>
                          {pDesc[p.status] && <p className="text-[10px] text-ds-ink3 mt-0.5">{pDesc[p.status]}</p>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-ds-green">{formatIDR(p.total_premium)}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${meta.cls}`}>{meta.label}</span>
                      </div>
                    </div>
                  );
                })}
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
                ) : customerClaims.map((c, i) => {
                  const cmeta = claimStatusMap[c.status] ?? { label: c.status, cls: 'bg-ds-card2 text-ds-ink2' };
                  return (
                    <div key={i} className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                          <AlertCircle size={18} className="text-ds-red" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-ds-ink">{c.policy_number ?? c.claim_number ?? t('Claim','Klaim')}</p>
                          <p className="text-xs text-ds-ink3">{new Date(c.created_at ?? '').toLocaleDateString('id-ID')} · {c.location}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-ds-red">{formatIDR(c.amount_estimated ?? 0)}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${cmeta.cls}`}>{cmeta.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </PageTransition>
        );
      }

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
        <header className="fixed top-0 inset-x-0 z-40 bg-white/95 dark:bg-ds-dk-s1/95 backdrop-blur-xl border-b border-ds-border dark:border-ds-dk-bd shadow-ds-sm">
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
        <nav className="fixed bottom-6 inset-x-3 z-50 bg-white/95 dark:bg-ds-dk-s1/95 backdrop-blur-2xl rounded-[3rem] shadow-ds-lg border border-ds-border dark:border-ds-dk-bd">
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
      {!isFullscreen && <PathyChat lang={lang} currentUser={{ name: currentUser.name, id: currentUser.id, role: currentUser.role }} />}
    </div>
  );
};

export default CustomerPortal;
