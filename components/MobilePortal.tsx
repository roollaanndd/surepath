import React from 'react';
import { Badge } from './shared/UI';
import {
  ShieldCheck, Bell, ChevronRight, Sparkles,
  Car, Plane, Heart, Home, Zap, FileText,
  TrendingUp, Clock, ArrowUpRight
} from 'lucide-react';
import { formatIDR } from './car-wizard/WizardUI';

const MobilePortal = ({ currentUser, setPage, lang }: { currentUser: any, setPage: (p: string) => void, lang: string }) => {
  const t = (en: string, id: string) => lang === 'EN' ? en : id;
  const firstName = currentUser?.name?.split(' ')[0] ?? 'Pengguna';
  const initials = currentUser?.name?.[0]?.toUpperCase() ?? 'U';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return t('Good morning', 'Selamat pagi');
    if (h < 15) return t('Good afternoon', 'Selamat siang');
    if (h < 18) return t('Good evening', 'Selamat sore');
    return t('Good night', 'Selamat malam');
  };

  const products = [
    { icon: Car,     label: t('Vehicle', 'Kendaraan'),  page: 'car',     color: 'bg-blue-50 text-blue-600' },
    { icon: Plane,   label: t('Travel', 'Perjalanan'),  page: 'travel',  color: 'bg-violet-50 text-violet-600' },
    { icon: Heart,   label: t('Health', 'Kesehatan'),   page: 'health',  color: 'bg-rose-50 text-rose-600' },
    { icon: Home,    label: t('Property', 'Properti'),  page: 'mpar',    color: 'bg-amber-50 text-amber-600' },
    { icon: Zap,     label: t('Other', 'Lainnya'),      page: 'products',color: 'bg-gray-100 text-gray-600' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-28">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div>
              <p className="text-xs text-gray-500">{getGreeting()}</p>
              <h2 className="text-base font-semibold text-gray-900">{firstName}</h2>
            </div>
          </div>
          <button
            onClick={() => setPage('profile')}
            className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200 transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Hero Protection Card */}
        <div
          onClick={() => setPage('profile')}
          className="sp-enter rounded-2xl p-5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-sp-hero active:scale-[0.99] transition-transform cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-200 text-xs font-medium mb-1">
                {t('Protection Status', 'Status Perlindungan')}
              </p>
              <h3 className="text-xl font-bold leading-tight">
                {t('You\'re Protected', 'Kamu Terlindungi')}
              </h3>
              <p className="text-emerald-200 text-sm mt-1">
                {t('1 active policy', '1 polis aktif')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck size={24} className="text-white" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex gap-6">
            <div>
              <p className="text-emerald-200 text-xs">{t('Next renewal', 'Perpanjangan')}</p>
              <p className="text-white text-sm font-semibold">12 {t('days', 'hari')}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs">{t('Total claims', 'Total klaim')}</p>
              <p className="text-white text-sm font-semibold">0</p>
            </div>
            <div className="ml-auto flex items-end">
              <button className="text-emerald-200 text-xs flex items-center gap-1">
                {t('Detail', 'Detail')} <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="sp-enter sp-enter-d1 rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-800/30">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-300 mb-0.5">SurePath AI</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t(
                  'Your travel insurance doesn\'t cover baggage loss. Add coverage from Rp 45k/trip.',
                  'Asuransi perjalananmu belum mencakup kehilangan bagasi. Tambahkan dari Rp 45rb/trip.'
                )}
              </p>
              <button
                onClick={() => setPage('travel')}
                className="mt-2 text-xs font-semibold text-emerald-400"
              >
                {t('See offer', 'Lihat penawaran')} →
              </button>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="sp-enter sp-enter-d2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('Buy Insurance', 'Beli Asuransi')}</h3>
            <button
              onClick={() => setPage('products')}
              className="text-xs font-medium text-emerald-600"
            >
              {t('All', 'Semua')}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {products.map(({ icon: Icon, label, page, color }) => (
              <button
                key={page}
                onClick={() => setPage(page)}
                className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center`}>
                  <Icon size={22} />
                </div>
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* My Policies */}
        <div className="sp-enter sp-enter-d3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('My Policies', 'Polis Saya')}</h3>
            <button
              onClick={() => setPage('profile')}
              className="text-xs font-medium text-emerald-600"
            >
              {t('All', 'Semua')}
            </button>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Car size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Asuransi Kendaraan</p>
                <p className="text-xs text-gray-400 truncate">Aktif · Jatuh tempo 12 hari lagi</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
                Aktif
              </span>
            </div>
            <button
              onClick={() => setPage('products')}
              className="w-full flex items-center justify-between p-4 text-emerald-600 active:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-medium">{t('+ Add new policy', '+ Tambah polis baru')}</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="sp-enter sp-enter-d4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('Activity', 'Aktivitas')}</h3>
            <button
              onClick={() => setPage('profile')}
              className="text-xs font-medium text-emerald-600"
            >
              {t('All', 'Semua')}
            </button>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-5 text-center">
            <Clock size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">{t('No recent activity', 'Belum ada aktivitas')}</p>
          </div>
        </div>

        {/* Quick Claim CTA */}
        <button
          onClick={() => setPage('claims')}
          className="sp-enter w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{t('File a Claim', 'Lapor Klaim')}</p>
              <p className="text-xs text-gray-400">{t('Quick & easy process', 'Proses cepat & mudah')}</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default MobilePortal;
