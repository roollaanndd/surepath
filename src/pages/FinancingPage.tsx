import React, { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, CircleDollarSign, FileText, ShieldCheck, WalletCards, LogOut, LockKeyhole, Sparkles } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, SectionLabel } from './site/siteKit';

const demoApplications = [
  { id: 'SPF-DEMO-001', customer: 'PT Nusantara Logistik', product: 'Working Capital', amount: 750000000, status: 'Credit review', color: '#f59e0b' },
  { id: 'SPF-DEMO-002', customer: 'CV Sinar Mobilindo', product: 'Motor Vehicle', amount: 285000000, status: 'Documents verified', color: '#10b981' },
  { id: 'SPF-DEMO-003', customer: 'PT Cipta Karya Mandiri', product: 'Heavy Equipment', amount: 1200000000, status: 'Offer prepared', color: '#6366f1' },
];

const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(amount);

const FinancingPage: React.FC<SitePageProps> = (props) => {
  const { navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const [demoAccess, setDemoAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'products'>('applications');

  return (
    <SiteLayout {...props} active="financing" bgVideo="/bg1.mp4">
      <main className="min-h-screen px-5 pb-20 pt-32 sm:pt-36" style={{ color: th.textMain }}>
        <div className="mx-auto max-w-7xl">
          {!demoAccess ? (
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="py-8">
                <SectionLabel darkMode={props.darkMode}>{t('SUREPATH FINANCING CORE', 'SUREPATH FINANCING CORE')}</SectionLabel>
                <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {t('Pembiayaan yang lebih ', 'Financing made ')}
                  <span style={{ color: th.accent }}>{t('terhubung dan transparan', 'connected and transparent')}</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: th.textMuted }}>
                  {t(
                    'Satu workspace untuk pengajuan, verifikasi, analisis kredit, keputusan, penawaran, dan penempatan proteksi. Dirancang untuk pilot bersama Mutiara Finance.',
                    'One workspace for applications, verification, credit assessment, decisions, offers, and insurance placement. Designed for the Mutiara Finance pilot.'
                  )}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => setDemoAccess(true)} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#15803d,#10b981)', boxShadow: '0 14px 35px rgba(16,185,129,.22)' }}>
                    <Sparkles size={17} /> {t('Masuk sebagai Demo', 'Enter Demo Account')} <ArrowRight size={16} />
                  </button>
                  <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-semibold transition hover:bg-white/5"
                    style={{ borderColor: th.cardBorder, color: th.textMain }}>
                    <LockKeyhole size={16} /> {t('Login SurePath', 'SurePath Login')}
                  </button>
                </div>
                <div className="mt-5 flex items-start gap-2 text-xs leading-relaxed" style={{ color: th.textMuted }}>
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: th.accent }} />
                  <span>{t('Demo langsung tanpa password. Seluruh data di layar demo adalah data simulasi, tidak mengakses atau mengubah data pelanggan.', 'Instant demo access, no password required. All demo records are simulated and do not access or change customer data.')}</span>
                </div>
              </section>

              <section className="relative">
                <div className="absolute -inset-5 rounded-[2rem] opacity-50 blur-3xl" style={{ background: 'radial-gradient(circle,rgba(16,185,129,.28),transparent 68%)' }} />
                <div className="relative overflow-hidden rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl sm:p-7"
                  style={{ background: 'rgba(12,25,28,.78)', borderColor: 'rgba(167,243,208,.2)', boxShadow: '0 24px 80px rgba(0,0,0,.24)' }}>
                  <div className="flex items-center justify-between gap-3 border-b pb-5" style={{ borderColor: 'rgba(255,255,255,.1)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(16,185,129,.16)', color: '#6ee7b7' }}><WalletCards size={23} /></div>
                      <div><p className="text-sm font-bold text-white">Financing overview</p><p className="mt-1 text-xs text-emerald-100/60">Mutiara Finance · Pilot workspace</p></div>
                    </div>
                    <span className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200" style={{ borderColor: 'rgba(110,231,183,.25)', background: 'rgba(16,185,129,.1)' }}>DEMO</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[['Applications','128'],['In review','24'],['Approved','76'],['Pending docs','18']].map(([label,value]) => (
                      <div key={label} className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,.045)', borderColor: 'rgba(255,255,255,.09)' }}>
                        <p className="text-xs text-white/55">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,.035)', borderColor: 'rgba(255,255,255,.09)' }}>
                    <div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold text-white/80">Application pipeline</span><span className="text-xs text-emerald-300">Sample data</span></div>
                    {[['Submitted',24, '#34d399'],['Verification',18,'#60a5fa'],['Credit review',31,'#a78bfa'],['Decision / offer',27,'#fbbf24']].map(([label,value,color]) => (
                      <div key={String(label)} className="mb-3 last:mb-0">
                        <div className="mb-1.5 flex justify-between text-xs"><span className="text-white/60">{label}</span><span className="text-white/80">{value}%</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${value}%`, background: String(color) }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <section>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: 'rgba(16,185,129,.35)', background: 'rgba(16,185,129,.1)', color: th.accent }}><Sparkles size={14} /> DEMO ACCOUNT · READ-ONLY</div>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('Workspace Pembiayaan', 'Financing Workspace')}</h1>
                  <p className="mt-2 text-sm" style={{ color: th.textMuted }}>{t('Mutiara Finance · Lingkungan demonstrasi dengan data fiktif', 'Mutiara Finance · Demonstration environment with fictional data')}</p>
                </div>
                <button onClick={() => setDemoAccess(false)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: th.cardBorder, color: th.textMain }}><LogOut size={15} /> {t('Keluar Demo', 'Exit Demo')}</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total applications', value: '128', icon: FileText, detail: '+12 this month' },
                  { label: 'Requested financing', value: 'Rp 8.45B', icon: CircleDollarSign, detail: 'Sample portfolio' },
                  { label: 'Active partners', value: '6', icon: Building2, detail: 'Illustrative only' },
                  { label: 'Protection attached', value: '82%', icon: ShieldCheck, detail: 'Sample attachment rate' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border p-5 backdrop-blur-xl transition hover:-translate-y-1"
                    style={{ background: 'rgba(255,255,255,.76)', borderColor: 'rgba(16,185,129,.17)', boxShadow: '0 12px 32px rgba(6,78,59,.07)' }}>
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{item.label}</span><item.icon size={18} color="#059669" /></div>
                    <p className="mt-4 text-2xl font-black text-slate-900">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <button onClick={() => setActiveTab('applications')} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: activeTab === 'applications' ? '#047857' : 'rgba(255,255,255,.72)', color: activeTab === 'applications' ? '#fff' : '#334155' }}>Applications</button>
                <button onClick={() => setActiveTab('products')} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: activeTab === 'products' ? '#047857' : 'rgba(255,255,255,.72)', color: activeTab === 'products' ? '#fff' : '#334155' }}>Financing products</button>
              </div>
              {activeTab === 'applications' ? (
                <div className="mt-4 overflow-hidden rounded-2xl border backdrop-blur-xl" style={{ borderColor: 'rgba(16,185,129,.18)', background: 'rgba(255,255,255,.88)' }}>
                  <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(15,23,42,.08)' }}><h2 className="font-bold text-slate-900">Recent applications</h2><p className="mt-1 text-xs text-slate-500">Fictional sample records · no live customer information</p></div>
                  <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Reference / Customer</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Requested amount</th><th className="px-5 py-3">Status</th></tr></thead>
                    <tbody>{demoApplications.map(app => <tr key={app.id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{app.customer}</p><p className="mt-1 text-xs text-slate-400">{app.id}</p></td><td className="px-5 py-4 text-slate-600">{app.product}</td><td className="px-5 py-4 font-semibold text-slate-800">{rupiah(app.amount)}</td><td className="px-5 py-4"><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: app.color, background: `${app.color}18` }}>{app.status}</span></td></tr>)}</tbody>
                  </table></div>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['Motor Vehicle Financing','Vehicle financing with optional insurance placement','2.5%–8.5% indicative annual rate'],
                    ['Multipurpose Financing','Multi-purpose financing with eligibility checks','Subject to partner policy'],
                    ['Heavy Equipment','Asset-backed financing for eligible equipment','Indicative terms only'],
                    ['Working Capital','Working capital for qualified businesses','Credit review required'],
                    ['Other Financing','Additional products configured per partner','Pilot configuration'],
                  ].map(([name,desc,terms]) => <div key={name} className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,.86)', borderColor: 'rgba(16,185,129,.18)' }}><h3 className="font-bold text-slate-900">{name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p><p className="mt-4 text-xs font-semibold text-emerald-700">{terms}</p></div>)}
                </div>
              )}
              <div className="mt-6 flex items-start gap-2 rounded-2xl border p-4 text-xs leading-relaxed" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'rgba(255,251,235,.9)', color: '#92400e' }}><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>Demo only — values, rates, applications, partners and statuses are illustrative. No financing decision, credit check, customer record, or disbursement is connected.</span></div>
            </section>
          )}
        </div>
      </main>
    </SiteLayout>
  );
};

export default FinancingPage;
