import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import {
  Zap, ShieldCheck,
  Car, Plane, Bot, FileText, AlertCircle, ArrowRight, RefreshCw
} from 'lucide-react';
import { Language } from '../../types';
import { IcHome, IcBuy, IcPathy, IcClaim, IcHistory, IcBell } from '../shared/CustomerIcons';
import PortalHeader from '../shared/PortalHeader';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import NotificationDrawer from '../shared/NotificationDrawer';
import UserProfile from '../UserProfile';
import { formatIDR } from '../car-wizard/WizardUI';
// ── Performance: lazy-load heavy wizards + chat so they don't bloat the
//    initial CustomerPortal chunk. Each is ~50-150 KB; loading all 7 eagerly
//    adds ~700 KB to the initial bundle. Now they only load when the customer
//    actually opens them.
const ClaimManager = lazy(() => import('../ClaimManager'));
const CarInsuranceWizard = lazy(() => import('../CarInsuranceWizard'));
const TravelInsuranceWizard = lazy(() => import('../TravelInsuranceWizard'));
const PAInsuranceWizard = lazy(() => import('../PAInsuranceWizard'));
const MPARInsuranceWizard = lazy(() => import('../MPARInsuranceWizard'));
const CustomInsuranceWizard = lazy(() => import('../CustomInsuranceWizard'));
const HealthChat = lazy(() => import('../HealthChat'));
const ContactPage = lazy(() => import('../ContactPage'));
import { PageTransition } from '../car-wizard/WizardUI';
import { getCustomerOrders, getCustomerClaims, getNotifications, type SpPolicyOrder, type SpClaim, type SpNotification } from '../../services/supabaseService';
import { HeroCard, AICard, StatCard, SectionLabel, CoverageRow, FeaturedCard } from '../shared/cards';
import { HeroProtected, EmptyStateSearch } from '../shared/Illustrations';
import { CircularActionGrid, LiveBadge, ClayCard, ReferralCard } from '../ui';
import PathyChat, { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import { CLAIM_OPEN_EVENT } from '../../services/claimHandoff';
import OrderDetailSheet from './OrderDetailSheet';
import OnboardingFlow, { needsOnboarding } from '../OnboardingFlow';

// Lightweight Suspense fallback — matches the portal's general feel
const WizardLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 rounded-full border-4 border-ds-green/20 border-t-ds-green animate-spin" />
  </div>
);

interface Props {
  currentUser: any;
  onLogout: () => void;
  lang: Language;
  products: any[];
}

// Bottom nav — same shape as the agent portal: two tabs, a raised centre
// action, two tabs. The centre slot opens Pathy (the service front door since
// v2.3.0) rather than switching page. Profil lives on the header avatar, as it
// does in the agent portal.
const PATHY_TAB = 'pathy';

const TABS: { id: string; labelEn: string; labelId: string; Icon: PortalTab['Icon']; center?: boolean; overlay?: boolean }[] = [
  { id: 'home',     labelEn: 'Home',    labelId: 'Beranda', Icon: IcHome },
  { id: 'products', labelEn: 'Buy',     labelId: 'Beli',    Icon: IcBuy },
  { id: PATHY_TAB,  labelEn: 'Pathy',   labelId: 'Pathy',   Icon: IcPathy, center: true, overlay: true },
  { id: 'claim',    labelEn: 'Claim',   labelId: 'Klaim',   Icon: IcClaim },
  { id: 'history',  labelEn: 'History', labelId: 'Riwayat', Icon: IcHistory },
];

const CustomerPortal: React.FC<Props> = ({ currentUser, onLogout, lang, products }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [showOnboarding, setShowOnboarding] = useState(() => needsOnboarding('CUSTOMER'));
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activePage, setActivePage] = useState('home');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');
  const [latestPolicy, setLatestPolicy] = useState<SpPolicyOrder | null>(null);
  const [customerPolicies, setCustomerPolicies] = useState<SpPolicyOrder[]>([]);
  const [customerClaims, setCustomerClaims] = useState<SpClaim[]>([]);
  const [notifications, setNotifications] = useState<SpNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SpPolicyOrder | null>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  const loadCustomerData = useCallback(async () => {
    if (!currentUser?.id) return;
    setRefreshing(true);
    try {
      const [orders, claims, notifs] = await Promise.allSettled([
        getCustomerOrders(currentUser.id),
        getCustomerClaims(currentUser.id),
        getNotifications(currentUser.id),
      ]);
      if (orders.status === 'fulfilled') {
        setCustomerPolicies(orders.value);
        if (orders.value.length > 0) setLatestPolicy(orders.value[0]);
      }
      if (claims.status === 'fulfilled') setCustomerClaims(claims.value);
      if (notifs.status === 'fulfilled') setNotifications(notifs.value);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  useEffect(() => {
    if (activePage === 'history') loadCustomerData();
  }, [activePage]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // The drawer marks notifications read on its own — resync the header badge
  // when it closes.
  const refreshNotifications = useCallback(() => {
    if (!currentUser?.id) return;
    getNotifications(currentUser.id).then(setNotifications).catch(() => {});
  }, [currentUser?.id]);

  // Pathy is an overlay, not a page — the centre tab and the AI cards open it.
  const openPathy = () => window.dispatchEvent(new Event(PATHY_OPEN_EVENT));

  const handleTabSelect = (id: string) => {
    if (id === PATHY_TAB) { openPathy(); return; }
    navigate(id);
  };

  // Pathy prepares a claim and parks the prefill; this switches to the claim
  // form so the user lands straight on it. Submission still happens there.
  useEffect(() => {
    const open = () => navigate('claim');
    window.addEventListener(CLAIM_OPEN_EVENT, open);
    return () => window.removeEventListener(CLAIM_OPEN_EVENT, open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              {/* Protection Score Hero — with character illustration */}
              <HeroCard>
                {/* Character illustration — top right of hero card */}
                <div className="absolute top-2 right-2 opacity-90 pointer-events-none">
                  <HeroProtected size={90} />
                </div>
                <div className="flex items-center gap-5 relative z-10">
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

              {/* My Protection — 3 metrics (wrapped in ClayCard for tangible feel) */}
              {latestPolicy && (
                <div>
                  <SectionLabel>{t('My Protection', 'Proteksi Saya')}</SectionLabel>
                  <ClayCard padding="md" variant="default">
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label={t('Total Premium', 'Total Premi')} value={formatIDR(totalPremium)} sub={t('all policies', 'semua polis')} />
                      <StatCard label={t('Active', 'Aktif')} value={customerPolicies.length} sub={t('policies', 'polis')} />
                      <StatCard label={t('Days Left', 'Sisa Hari')} value={homeDaysLeft} sub={t('to renewal', 'ke perpanjangan')} progress={(homeDaysLeft / 365) * 100} />
                    </div>
                  </ClayCard>
                </div>
              )}

              {/* Quick actions — Livin'-style circular action grid */}
              <div>
                <SectionLabel>{t('Quick Actions', 'Aksi Cepat')}</SectionLabel>
                <ClayCard padding="md" variant="default">
                  <CircularActionGrid
                    actions={[
                      { id: 'buy', label: t('Buy', 'Beli'), icon: IcBuy, color: '#00C16A', onClick: () => navigate('products') },
                      { id: 'claim', label: t('Claim', 'Klaim'), icon: IcClaim, color: '#EF4444', onClick: () => navigate('claim') },
                      { id: 'history', label: t('Policies', 'Polis'), icon: IcHistory, color: '#3B82F6', onClick: () => navigate('history') },
                      { id: 'pathy', label: 'Pathy', icon: IcPathy, color: '#7C3AED', onClick: openPathy },
                    ]}
                  />
                </ClayCard>
              </div>

              {/* Live social proof — "Sedang Ramai" pattern from Livin' */}
              {!latestPolicy && (
                <div className="flex justify-center">
                  <LiveBadge count={43} label={t('buying insurance now', 'orang sedang beli asuransi')} />
                </div>
              )}

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
                cta={{ label: t('Chat with Pathy', 'Chat dengan Pathy'), onClick: openPathy }}
              />

              {/* Referral card — "Ajak Teman" (v1: share + attribution) */}
              <ReferralCard
                referralCode={currentUser?.nodeId ?? currentUser?.agent_code}
                customerName={currentUser?.name?.split(' ')[0]}
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
                  <div className="sp-glass rounded-2xl overflow-hidden">
                    {customerPolicies.slice(0, 2).map((p, i) => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < customerPolicies.slice(0, 2).length - 1 || customerClaims.length > 0 ? 'border-b border-ds-border' : ''}`}>
                        <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                          <ShieldCheck size={16} className="text-ds-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ds-ink truncate">{p.product_name}</p>
                          <p className="text-[10px] text-ds-ink3">{new Date(p.created_at ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'ISSUED' ? 'bg-ds-green-tint text-ds-green' : 'bg-ds-amber-lt text-ds-amber'}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                    {customerClaims.slice(0, 1).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-ds-red-lt flex items-center justify-center flex-shrink-0">
                          <Zap size={16} className="text-ds-red" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ds-ink truncate">{t('Claim', 'Klaim')} #{c.claim_number ?? c.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-ds-ink3">{new Date(c.created_at ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ds-red-lt text-ds-red">{c.status}</span>
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
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-ds-green-tint">
                <Bot size={16} className="text-ds-green flex-shrink-0" />
                <p className="text-xs font-bold text-ds-green flex-1">{t('Pathy recommends: add Travel protection — fits your profile', 'Pathy rekomendasikan: tambah proteksi Travel — sesuai profilmu')}</p>
                <button onClick={() => navigate('buy-travel')} className="flex-shrink-0">
                  <ArrowRight size={14} className="text-ds-green" />
                </button>
              </div>

              {/* Product cards — creative tilt-tile layout */}
              <div className="grid grid-cols-1 gap-3.5">
                {(products ?? []).filter(p => p?.id).map((p, pIdx) => (
                  <div
                    key={p.id}
                    onClick={() => p.active && navigate(`buy-${p.id}`)}
                    style={{ animationDelay: `${pIdx * 60}ms` }}
                    className={`group relative sp-glass rounded-[1.6rem] p-4 pl-5 flex items-center gap-4 transition-all duration-300 overflow-hidden animate-fade-in ${p.active ? 'cursor-pointer hover:-translate-y-1 hover:shadow-ds-md active:scale-[0.98]' : 'opacity-40 grayscale pointer-events-none'}`}
                  >
                    {/* left color rail — product identity */}
                    <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${p.bg ?? 'bg-ds-card2'} opacity-80`} />
                    {/* oversized ghost icon watermark */}
                    <div className={`absolute -right-4 -bottom-6 opacity-[0.06] group-hover:opacity-[0.12] group-hover:-rotate-6 transition-all duration-500 ${p.color ?? 'text-ds-ink3'}`}>
                      {typeof p.icon === 'function' && <p.icon size={104} strokeWidth={1.4} />}
                    </div>
                    {/* hover glow */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute top-0 right-8 w-36 h-36 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)' }} />
                    </div>
                    {/* icon tile — gradient ring, lifts on hover */}
                    <div className={`relative z-10 w-14 h-14 rounded-[1.15rem] flex items-center justify-center flex-shrink-0 ${p.bg ?? 'bg-ds-card2'} ${p.color ?? 'text-ds-ink3'} shadow-ds-sm ring-1 ring-black/5 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-lg transition-all duration-300`}>
                      {typeof p.icon === 'function' && <p.icon size={26} strokeWidth={2} />}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-[0.95rem] text-ds-ink tracking-tight">{p.title}</h4>
                        {p.tech && <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest bg-ds-green-tint text-ds-green">{p.tech}</span>}
                      </div>
                      <p className="text-xs text-ds-ink2 leading-relaxed line-clamp-2">{p.desc}</p>
                    </div>
                    {p.active && (
                      <div className="relative z-10 w-9 h-9 rounded-full bg-ds-green text-white flex items-center justify-center flex-shrink-0 shadow-ds-green group-hover:scale-110 group-hover:translate-x-0.5 transition-all duration-200">
                        <ArrowRight size={15} />
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
              <HeroCard variant="navy" className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">{t('Claim Assistant', 'Asisten Klaim')}</p>
                <h3 className="text-lg font-black text-white mb-1">{t('File a Claim', 'Lapor Klaim')}</h3>
                <p className="text-[12px] text-white/70 leading-snug">{t('Photo + AI = instant processing. Most claims settled in 24h.', 'Foto + AI = proses instan. Sebagian besar klaim selesai dalam 24 jam.')}</p>
              </HeroCard>
              <ClaimManager onComplete={() => navigate('home')} lang={lang} currentUser={currentUser} />
            </div>
          </PageTransition>
        );

      case 'history': {
        const totalValue = customerPolicies.reduce((s, p) => s + (p.total_premium ?? 0), 0);
        const activePolicies = customerPolicies.filter(p => p.status === 'ISSUED');
        const pendingClaims = customerClaims.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW');
        const policyStatusMap: Record<string,{label:string;cls:string}> = {
          SUBMITTED:    { label: t('Pending Review','Menunggu Review'), cls: 'bg-ds-amber-lt text-ds-amber' },
          UNDER_REVIEW: { label: t('Under Review','Sedang Dikaji'),    cls: 'bg-ds-blue-lt text-ds-blue' },
          APPROVED:     { label: t('Approved','Disetujui'),             cls: 'bg-ds-blue-lt text-ds-blue' },
          ISSUED:       { label: t('Active','Polis Aktif'),             cls: 'bg-ds-green-tint text-ds-green' },
          REJECTED:     { label: t('Rejected','Ditolak'),               cls: 'bg-ds-red-lt text-ds-red' },
          CANCELLED:    { label: t('Cancelled','Dibatalkan'),           cls: 'bg-ds-card2 text-ds-ink3' },
        };
        const claimStatusMap: Record<string,{label:string;cls:string}> = {
          SUBMITTED:    { label: t('Submitted','Diajukan'),       cls: 'bg-ds-amber-lt text-ds-amber' },
          UNDER_REVIEW: { label: t('Under Review','Sedang Dikaji'),cls: 'bg-ds-blue-lt text-ds-blue' },
          APPROVED:     { label: t('Approved','Disetujui'),       cls: 'bg-ds-green-tint text-ds-green' },
          REJECTED:     { label: t('Rejected','Ditolak'),         cls: 'bg-ds-red-lt text-ds-red' },
          PAID:         { label: t('Paid','Dibayarkan'),          cls: 'bg-ds-purple-lt text-ds-purple' },
        };
        return (
          <PageTransition>
            <div className="space-y-5 pb-32 pt-2">
              {/* Summary hero */}
              <HeroCard>
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
              </HeroCard>

              {/* Policies */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={11} className="text-ds-green" />
                    {t('My Policies', 'Polis Saya')}
                  </p>
                  <button
                    onClick={() => loadCustomerData()}
                    aria-label={t('Refresh', 'Muat Ulang')}
                    className="w-7 h-7 rounded-full bg-ds-card2 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <RefreshCw size={12} className={`text-ds-ink3 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {customerPolicies.length === 0 ? (
                  <div className="p-8 bg-ds-card rounded-2xl border border-dashed border-ds-border flex flex-col items-center text-center gap-3">
                    <EmptyStateSearch size={100} />
                    <p className="text-ds-ink2 text-sm font-bold">{t('No policies yet.', 'Belum ada polis.')}</p>
                    <button onClick={() => navigate('products')} className="px-5 py-2 bg-ds-green text-white rounded-xl font-black text-[10px] tracking-widest shadow-ds-green active:scale-95 transition-transform">
                      {t('Browse Plans', 'Lihat Paket')}
                    </button>
                  </div>
                ) : customerPolicies.map((p, i) => {
                  const pDesc: Record<string,string> = {
                    SUBMITTED:'Menunggu konfirmasi penanggung', UNDER_REVIEW:'Sedang dikaji oleh penanggung',
                    APPROVED:'Disetujui — menunggu penerbitan polis', ISSUED:'Polis aktif & berlaku',
                    REJECTED:'Pengajuan ditolak oleh penanggung', CANCELLED:'Pengajuan dibatalkan',
                  };
                  const meta = policyStatusMap[p.status] ?? { label: p.status, cls: 'bg-ds-card2 text-ds-ink3' };
                  return (
                    <div key={i} onClick={() => setSelectedOrder(p)} className="sp-glass rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
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
                    <div className="w-12 h-12 rounded-2xl bg-ds-red-lt flex items-center justify-center">
                      <AlertCircle size={22} className="text-ds-red" />
                    </div>
                    <p className="text-ds-ink2 text-sm font-bold">{t('No claims submitted.', 'Belum ada klaim.')}</p>
                  </div>
                ) : customerClaims.map((c, i) => {
                  const cmeta = claimStatusMap[c.status] ?? { label: c.status, cls: 'bg-ds-card2 text-ds-ink2' };
                  return (
                    <div key={i} className="sp-glass rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-ds-red-lt flex items-center justify-center flex-shrink-0">
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
        return <CarInsuranceWizard onComplete={() => { loadCustomerData(); navigate('home'); }} currentUser={currentUser} lang={lang} />;
      case 'buy-travel':
        return <TravelInsuranceWizard onComplete={() => { loadCustomerData(); navigate('home'); }} currentUser={currentUser} lang={lang} />;
      case 'buy-pa':
        return <PAInsuranceWizard onComplete={() => { loadCustomerData(); navigate('home'); }} currentUser={currentUser} lang={lang} />;
      case 'buy-mpar':
        return <MPARInsuranceWizard onComplete={() => { loadCustomerData(); navigate('home'); }} currentUser={currentUser} lang={lang} />;
      case 'buy-health-ind':
        return <HealthChat onBack={() => navigate('home')} lang={lang} />;

      default:
        if (activePage.startsWith('buy-custom_')) {
          const productId = activePage.replace('buy-', '');
          return <CustomInsuranceWizard onComplete={() => { loadCustomerData(); navigate('home'); }} currentUser={currentUser} lang={lang} productId={productId} />;
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink transition-colors duration-300 font-sora">
      <div aria-hidden className="sp-ambient" />
      {showOnboarding && (
        <OnboardingFlow role="CUSTOMER" lang={lang === Language.EN ? 'EN' : 'ID'} onComplete={() => setShowOnboarding(false)} />
      )}

      {!isFullscreen && (
        <PortalHeader
          portalLabel={t('Customer', 'Nasabah')}
          userName={currentUser?.name ?? 'Nasabah'}
          userCode={currentUser?.nodeId ?? 'SP-USER'}
          unreadCount={unreadCount}
          onBellClick={() => setShowNotifications(true)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          onAvatarClick={() => navigate('profile')}
          BellIcon={IcBell}
          labels={{
            notifications: t('Notifications', 'Notifikasi'),
            theme: t('Toggle theme', 'Ganti tema'),
            profile: t('Profile', 'Profil'),
          }}
        />
      )}

      {/* Main content */}
      <main
        ref={scrollRef}
        className={isFullscreen ? 'relative z-10 h-screen overflow-y-auto' : 'relative z-10 pt-[4.75rem] pb-32 px-5 min-h-screen overflow-y-auto no-scrollbar'}
      >
        <Suspense fallback={<WizardLoader />}>
          {renderContent()}
        </Suspense>
      </main>

      {!isFullscreen && (
        <PortalTabBar
          tabs={TABS.map(tab => ({ ...tab, label: lang === Language.EN ? tab.labelEn : tab.labelId }))}
          activeId={activeTab}
          onSelect={handleTabSelect}
        />
      )}

      {/* Floating Pathy assistant */}
      {!isFullscreen && (
        <PathyChat
          lang={lang}
          currentUser={{ name: currentUser.name, id: currentUser.id, role: currentUser.role }}
          hideLauncher
        />
      )}

      {/* Notification drawer */}
      {showNotifications && (
        <NotificationDrawer
          userId={currentUser?.id}
          lang={lang}
          onClose={() => { setShowNotifications(false); refreshNotifications(); }}
          onNavigate={navigate}
        />
      )}

      {/* Order detail sheet */}
      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          lang={lang}
          onClose={() => setSelectedOrder(null)}
          onCancelled={() => { setSelectedOrder(null); loadCustomerData(); }}
          onResubmit={(page) => { setSelectedOrder(null); navigate(page); }}
        />
      )}
    </div>
  );
};

export default CustomerPortal;
