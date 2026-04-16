import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight, CheckCircle2, Package } from 'lucide-react';
import { User, Language } from '../types';
import { db, CustomProduct } from '../db';
import { Badge, formatIDR } from './car-wizard/WizardUI';

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-2xl rounded-[2.5rem] relative overflow-hidden backdrop-blur-xl ${className}`}>
    {children}
  </div>
);

const Header = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="pt-20 pb-12 px-8 text-center bg-gradient-to-b from-primary-500/10 to-transparent dark:from-primary-900/20">
    <h2 className="text-4xl text-slate-900 dark:text-white font-black tracking-tighter uppercase">{title}</h2>
    <p className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{subtitle}</p>
  </div>
);

export default function CustomInsuranceWizard({ 
  onComplete, 
  currentUser, 
  lang,
  productId
}: { 
  onComplete: () => void, 
  currentUser: User, 
  lang: Language,
  productId: string 
}) {
  const [product, setProduct] = useState<CustomProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const id = productId.replace('custom_', '');
        const p = await db.customProducts.get(parseInt(id));
        if (p) setProduct(p);
      } catch(e){}
      setLoading(false);
    };
    load();
  }, [productId]);

  const handlePurchase = async () => {
    if (!product) return;
    await db.policies.add({
      userId: currentUser.id!,
      type: product.type as any,
      status: 'ACTIVE',
      policyNumber: `CST-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      premium: product.basePremium,
      coverageAmount: product.basePremium * 100 // Example
    });
    
    await db.transactions.add({
      userId: currentUser.id!,
      type: 'PAYMENT',
      amount: product.basePremium,
      status: 'SUCCESS',
      description: `Pembelian Polis ${product.name}`,
      date: new Date().toISOString(),
      referenceId: `TX-CST-${Date.now()}`
    });
    
    alert(`Polis ${product.name} berhasil diaktifkan!`);
    onComplete();
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (!product) return <div className="p-8 text-center text-white">Produk tidak ditemukan.</div>;

  return (
    <div className="bg-[#0c0a09] min-h-[100dvh] flex flex-col font-sans relative overflow-hidden transition-colors duration-700 animate-fade-in pb-32">
       <Header title={product.name} subtitle={product.description} />
       <div className="max-w-2xl mx-auto w-full px-6 pt-12">
          <Card className="mb-6 p-8">
            <div className="flex justify-between items-start mb-6">
               <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex justify-center items-center">
                  <Package size={32}/>
               </div>
               <Badge color="emerald">Custom Coverage</Badge>
            </div>
            <h2 className="text-3xl font-black uppercase text-white tracking-tighter mb-2">{product.name}</h2>
            <p className="text-sm font-medium text-gray-400 mb-8">{product.description}</p>
            
            <div className="flex justify-between items-center p-6 bg-white/5 rounded-2xl border border-white/10 mb-8">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base Premium</span>
               <span className="text-2xl font-black text-emerald-500">{formatIDR(product.basePremium)}</span>
            </div>

            <button 
                onClick={handlePurchase}
                className="w-full flex items-center justify-between p-6 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-500/20 group"
            >
                Konfirmasi & Bayar
                <ChevronRight className="group-hover:translate-x-2 transition-transform" />
            </button>
          </Card>
          <div className="text-center mt-6">
            <button onClick={onComplete} className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
              Batalkan & Kembali
            </button>
          </div>
       </div>
    </div>
  );
}
