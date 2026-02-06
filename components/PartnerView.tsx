
import React from 'react';
import { Target, CheckCircle2, Star, Rocket, LineChart, User, Briefcase } from 'lucide-react';

const PartnerView = () => {
  return (
    <div className="space-y-12 animate-fade-in">
      <div className="mb-10">
        <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white leading-tight">Partner <span className="text-primary-500">Console</span></h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">Track your neural commissions and claim velocity.</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-8 rounded-[3rem] bg-gray-900 text-white col-span-2 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-primary-400 mb-2">Matrix Balance</p>
            <h3 className="text-5xl font-black tracking-tighter leading-none">Rp 24.5M</h3>
            <div className="mt-8 flex gap-3">
              <button className="px-6 py-2.5 bg-primary-500 rounded-xl font-black uppercase text-[0.6rem] tracking-widest shadow-lg">Withdraw</button>
              <button className="px-6 py-2.5 bg-white/10 rounded-xl font-black uppercase text-[0.6rem] tracking-widest">Reports</button>
            </div>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 p-10 opacity-10">
            <LineChart size={120}/>
          </div>
        </div>

        {[
          { label: 'Active Leads', value: '42', icon: Target, color: 'text-blue-500' },
          { label: 'Claim Payouts', value: 'Rp 140M', icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Avg Rating', value: '4.98', icon: Star, color: 'text-yellow-500' },
          { label: 'Growth', value: '+24%', icon: Rocket, color: 'text-rose-500' }
        ].map((s, i) => (
          <div key={i} className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-black/5 space-y-4">
            <div className={`w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon size={20}/></div>
            <div>
              <p className="text-2xl font-black tracking-tighter leading-none">{s.value}</p>
              <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <h5 className="font-black uppercase text-[0.65rem] tracking-widest text-gray-400 ml-4">Recent Activity</h5>
        <div className="space-y-4">
          {[
            { user: 'Budi Santoso', plan: 'Auto Neural', amount: 'Rp 4.2M', status: 'Settled' },
            { user: 'Siti Aminah', plan: 'Travel Matrix', amount: 'Rp 850k', status: 'In Audit' },
            { user: 'Randi P.', plan: 'Life Sync', amount: 'Rp 12.5M', status: 'Settled' }
          ].map((act, i) => (
            <div key={i} className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-black/5 flex items-center justify-between group cursor-pointer hover:border-primary-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"><User size={20}/></div>
                <div>
                  <p className="font-black uppercase text-sm">{act.user}</p>
                  <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{act.plan}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-sm">{act.amount}</p>
                <p className={`text-[0.55rem] font-black uppercase tracking-[0.2em] mt-1 ${act.status === 'Settled' ? 'text-emerald-500' : 'text-yellow-500'}`}>{act.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnerView;
