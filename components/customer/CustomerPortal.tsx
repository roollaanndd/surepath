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
  { id: 'ai',       labelEn: 'AI',      labelId: 'AI',      Icon: Bot },
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
    ?? (activePage.startsWith('buy-') ? 'products' : activePage === 'bot' ? 'ai' : activePage);

  const isFullscreen = activePage.startsWith('buy-') || activePage === 'bot' || activePage === 'ai';

  const renderContent = () => {
    switch (activePage) {
      case 'home':
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
              <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #003B2F 0%, #005240 60%, #003B2F 100%)', boxShadow: '0 8px 32px rgba(0,59,47,0.5)' }}>
                <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.18)' }} />
                <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.08)' }} />
                <div className="relative z-10 flex items-center gap-5">
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
                        <h4 className="text-lg font-black text-white leading-tight">{t('You\'re Protected', 'Kamu Terlindungi')}</h4>
                        <p className="text-[11px] text-white/50 mt-1 leading-snug">
                          {latestPolicy.product_name} · {t('Until', 'Hingga')}{' '}
                          {new Date(latestPolicy.end_date ?? '').toLocaleDateString(
                            lang === Language.EN ? 'en-US' : 'id-ID',
                            { month: 'short', year: 'numeric' }
                          )}
                        </p>
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
              </div>

              {/* My Protection Stats */}
              {latestPolicy && (() => {
                const daysLeft = latestPolicy.end_date
                  ? Math.max(0, Math.ceil((new Date(latestPolicy.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0;
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-ds-card border border-ds-border rounded-2xl p-3 shadow-ds-sm">
                      <p className="text-[10px] text-ds-ink3 font-bold uppercase tracking-wider mb-1">{t('Days Left', 'Sisa Hari')}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-ds-ink">{daysLeft}</span>
                        <span className="text-xs text-ds-ink3">{t('days', 'hari')}</span>
                      </div>
                      <div className="mt-2 h-1 bg-ds-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (daysLeft / 365) * 100)}%`, background: '#00C896' }} />
                      </div>
                    </div>
                    <div className="bg-ds-card border border-ds-border rounded-2xl p-3 shadow-ds-sm">
                      <p className="text-[10px] text-ds-ink3 font-bold uppercase tracking-wider mb-1">{t('Total Premium', 'Total Premi')}</p>
                      <div className="text-2xl font-black text-ds-ink leading-tight">
                        {formatIDR(latestPolicy.total_premium ?? 0)}
                      </div>
                      <p className="text-[10px] text-ds-ink3 mt-0.5">{latestPolicy.product_name}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Quick actions */}
              <div>
                <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-3">{t('Quick Actions', 'Aksi Cepat')}</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'products', label: t('Buy', 'Beli'),       icon: ShoppingBag, color: 'text-blue-500',  bg: 'bg-blue-50'       },
                    { id: 'claim',    label: t('Claim', 'Klaim'),     icon: Zap,         color: 'text-rose-500',  bg: 'bg-rose-50'       },
                    { id: 'history',  label: t('History', 'Riwayat'), icon: History,     color: 'text-ds-green',  bg: 'bg-ds-green-tint' },
                    { id: 'ai',       label: 'AI Chat',               icon: Bot,         color: 'text-ds-purple', bg: 'bg-ds-purple-lt'  },
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

              {/* SurePath AI card */}
              <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #003B2F, #00512E)' }}>
                <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full pointer-events-none" style={{ background: 'rgba(0,193,106,0.15)' }} />
                <div className="relative z-10 flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'rgba(0,193,106,0.2)' }}>🤖</div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#00C16A' }}>SurePath AI</p>
                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'rgba(255,255,255,0.88)' }}>
                      {latestPolicy
                        ? t(
                            `Hi ${currentUser?.name?.split(' ')[0]}! Your ${latestPolicy.product_name} is active. File a claim anytime by taking a photo.`,
                            `Halo ${currentUser?.name?.split(' ')[0]}! Polis ${latestPolicy.product_name} kamu aktif. Lapor klaim kapan saja cukup dengan foto.`
                          )
                        : t(
                            'Get insured in minutes. Our AI makes claims processing fast and easy.',
                            'Dapatkan asuransi dalam hitungan menit. AI kami membuat proses klaim jadi cepat & mudah.'
                          )
                      }
                    </p>
                    <button onClick={() => navigate('ai')} className="text-[10px] font-black uppercase tracking-widest pt-1 inline-block" style={{ color: '#00C16A' }}>
                      {t('Chat with AI →', 'Chat dengan AI →')}
                    </button>
                  </div>
                </div>
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

      case 'ai':
        return (
          <div className="h-screen flex flex-col">
            <PathyChat
              lang={lang}
              currentUser={{ name: currentUser.name, id: currentUser.id, role: currentUser.role }}
              embedded
              onBack={() => navigate('home')}
            />
          </div>
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
