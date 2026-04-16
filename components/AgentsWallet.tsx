
import React, { useState, useEffect } from 'react';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, 
  Star, Download, 
  PieChart, 
  History, Box} from 'lucide-react';
import { db, Transaction } from '../db';
import { formatIDR } from './car-wizard/WizardUI';
import { Language } from '../types';

/* Fix: Added lang prop to AgentsWallet component */
const AgentsWallet = ({ lang }: { lang?: Language }) => {
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'WITHDRAWAL' | 'POINTS'>('ALL');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('SUREPATH_SESSION');
    if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        loadTransactions(user.id);
    }
  }, []);

  const loadTransactions = async (userId: number) => {
    const txs = await db.transactions.where('userId').equals(userId).toArray();
    setTransactions(txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    const totalComm = txs.filter(t => t.type === 'COMMISSION' && t.status === 'SUCCESS')
                        .reduce((acc, curr) => acc + curr.amount, 0);
    const totalWithdraw = txs.filter(t => t.type === 'WITHDRAWAL' && t.status === 'SUCCESS')
                             .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    setBalance(totalComm - totalWithdraw);

    const totalPoints = txs.filter(t => t.type === 'POINTS' && t.status === 'SUCCESS')
                          .reduce((acc, curr) => acc + curr.amount, 0);
    setPoints(totalPoints);
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'INCOME') return t.type === 'COMMISSION';
    if (filter === 'WITHDRAWAL') return t.type === 'WITHDRAWAL';
    if (filter === 'POINTS') return t.type === 'POINTS';
    return true;
  });

  const isAgent = currentUser?.role === 'AGENT';
  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      <div className="px-2">
         <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">
            {t('Smart', 'Dompet')} <span className="text-primary-500">{t('Wallet', 'Pintar')}</span>
         </h2>
         <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Matriks Reward & Pencairan v4.2</p>
      </div>

      <div className="relative p-10 bg-slate-900 rounded-[3.5rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-[5000ms]">
            <PieChart size={240}/>
         </div>
         <div className="relative z-10 space-y-10">
            <div className="flex justify-between items-start">
               <div className="space-y-1">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-primary-400">{isAgent ? 'Saldo Komisi' : 'Saldo Cashback'}</p>
                  <h3 className="text-5xl font-black tracking-tighter leading-none">{formatIDR(balance)}</h3>
               </div>
               <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                  <Wallet size={28} className="text-primary-400"/>
               </div>
            </div>

            <div className="flex gap-3">
               <button className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black uppercase text-[0.65rem] tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <ArrowUpRight size={16}/> {isAgent ? 'Tarik Komisi' : 'Gunakan Saldo'}
               </button>
               <button className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[0.65rem] tracking-widest active:scale-95 transition-all">
                  {t('Summary', 'Rekap')}
               </button>
            </div>
         </div>
      </div>

      <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                  <Star size={24} className="fill-amber-500"/>
               </div>
               <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">{t('Loyalty Status', 'Status Loyalitas')}</h4>
                  <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{t('Total Points', 'Total Poin Pintar')}</p>
               </div>
            </div>
            <div className="text-right">
                <span className="text-2xl font-black text-amber-500">{Math.floor(points).toLocaleString('id-ID')}</span>
                <p className="text-[0.45rem] font-black text-gray-400 uppercase">Poin</p>
            </div>
         </div>
         <div className="space-y-2">
            <div className="h-3 bg-gray-50 dark:bg-white/5 rounded-full overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
               <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 w-[65%] rounded-full shadow-[0_0_10px_#fb923c]"></div>
            </div>
            <div className="flex justify-between text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">
               <span>{t('Silver', 'Perak')}</span>
               <span className="text-primary-500">{t('Goal: Gold (10k Pts)', 'Target Emas (10k Pts)')}</span>
            </div>
         </div>
      </div>

      <div className="space-y-6 px-1">
         <div className="flex items-center justify-between">
            <h4 className="text-[0.65rem] font-black uppercase text-gray-400 tracking-[0.2em] ml-2 flex items-center gap-2">
               <History size={14}/> {t('Transaction History', 'Riwayat Transaksi')}
            </h4>
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/10 shadow-inner">
               {(['ALL', 'INCOME', 'POINTS', 'WITHDRAWAL'] as const).map(f => (
                  <button 
                     key={f}
                     onClick={() => setFilter(f)}
                     className={`px-3 py-2 rounded-lg text-[0.45rem] font-black uppercase transition-all ${filter === f ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-md scale-105' : 'text-gray-400'}`}
                  >
                     {f === 'ALL' ? t('All', 'Semua') : f === 'INCOME' ? (isAgent ? t('Comm', 'Komisi') : t('In', 'Masuk')) : f === 'POINTS' ? t('Points', 'Poin') : t('Out', 'Tarik')}
                  </button>
               ))}
            </div>
         </div>

         <div className="space-y-3">
            {filteredTransactions.length > 0 ? filteredTransactions.map((tx, i) => (
               <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex items-center justify-between group hover:border-primary-500/20 transition-all shadow-sm active:scale-[0.98]">
                  <div className="flex items-center gap-5">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                         tx.type === 'COMMISSION' ? 'bg-emerald-500/10 text-emerald-500' : 
                         tx.type === 'POINTS' ? 'bg-amber-500/10 text-amber-500' : 
                         'bg-rose-500/10 text-rose-500'
                     }`}>
                        {tx.type === 'COMMISSION' ? <ArrowDownLeft size={24}/> : 
                         tx.type === 'POINTS' ? <Star size={24}/> : 
                         <ArrowUpRight size={24}/>}
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">{tx.description}</p>
                        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{new Date(tx.date).toLocaleDateString('id-ID')} • {tx.type}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-sm font-black tracking-tighter ${
                         tx.type === 'POINTS' ? 'text-amber-500' : 
                         tx.type === 'WITHDRAWAL' ? 'text-rose-500' : 
                         'text-emerald-500'
                     }`}>
                        {tx.type === 'WITHDRAWAL' ? '-' : '+'}{tx.type === 'POINTS' ? Math.floor(tx.amount).toLocaleString('id-ID') : formatIDR(tx.amount)}
                     </p>
                     <div className="flex items-center justify-end gap-1.5 mt-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                        <p className="text-[0.45rem] font-black uppercase text-gray-400 tracking-widest">{tx.status === 'SUCCESS' ? t('SUCCESS', 'BERHASIL') : 'PENDING'}</p>
                     </div>
                  </div>
               </div>
            )) : (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-300">
                   <Box size={48}/>
                   <p className="text-xs font-black uppercase tracking-widest">{t('No Transactions', 'Belum Ada Transaksi')}</p>
                </div>
            )}
         </div>

         <button className="w-full py-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-[0.6rem] font-black uppercase text-gray-400 tracking-widest hover:border-primary-500/50 hover:text-primary-500 transition-all flex items-center justify-center gap-3">
            <Download size={16}/> {t('Download Report', 'Unduh Laporan Dompet')}
         </button>
      </div>
    </div>
  );
};

export default AgentsWallet;
