import React, { useState, useEffect } from 'react';
import { ChevronRight, ShieldCheck, ExternalLink, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import { User } from '../db';
import { db, CustomProduct } from '../db';
import { Badge, formatIDR } from './car-wizard/WizardUI';
import { createPolicyOrder } from '../services/supabaseService';
import { createXenditInvoice } from '../services/paymentService';
import ModuleIcon from './shared/ModuleIcon';

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-2xl rounded-[2.5rem] relative overflow-hidden backdrop-blur-xl ${className}`}>
    {children}
  </div>
);

const Header = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="pt-20 pb-12 px-8 text-center bg-gradient-to-b from-emerald-500/10 to-transparent dark:from-emerald-900/20">
    <h2 className="text-4xl text-slate-900 dark:text-white font-black tracking-tighter uppercase">{title}</h2>
    <p className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{subtitle}</p>
  </div>
);

export default function CustomInsuranceWizard({
  onComplete,
  currentUser,
  lang: _lang,
  productId
}: {
  onComplete: () => void,
  currentUser: User,
  lang: Language,
  productId: string
}) {
  const [product, setProduct] = useState<CustomProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!product || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      const premium = Math.round(product.basePremium);
      const order = await createPolicyOrder({
        agent_id: currentUser?.id != null ? String(currentUser.id) : '',
        client_id: currentUser?.id != null ? String(currentUser.id) : undefined,
        client_name: currentUser?.name ?? 'Nasabah',
        client_phone: currentUser?.phone,
        client_ktp: currentUser?.ktp,
        product_code: 'CUSTOM_INSURANCE',
        product_name: product.name,
        vehicle_type: undefined,
        vehicle_details: null,
        coverage_type: 'CUSTOM',
        zone: 1,
        vehicle_category: 0,
        addons: { productId: product.id, type: product.type, description: product.description },
        sum_insured: premium * 100,
        base_premium: premium,
        addon_premium: 0,
        admin_fee: 0,
        stamp_duty: 10000,
        total_premium: premium,
        ojk_rate: 0,
        discount_rate: 0,
        discount_amount: 0,
        net_premium: premium,
        commission_rate: 0,
        commission_amount: 0,
        coin_reward: 0,
        insurer_name: 'SurePath Custom',
        status: 'SUBMITTED',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      });
      if (!order) throw new Error('Gagal membuat order');
      setOrderNumber(order.order_number ?? order.id);
      const invoice = await createXenditInvoice({
        order_id: order.id,
        order_number: order.order_number ?? order.id,
        client_name: currentUser?.name ?? 'Nasabah',
        client_email: currentUser?.email,
        client_phone: currentUser?.phone,
        product_name: order.product_name,
        total_premium: order.total_premium,
      });
      if (invoice?.invoice_url) {
        setInvoiceUrl(invoice.invoice_url);
        window.open(invoice.invoice_url, '_blank', 'noopener,noreferrer');
      } else {
        // Silence here used to leave the buyer on a success screen with no way
        // to pay, believing they were covered.
        setError('Pesanan tersimpan, tapi halaman pembayaran gagal dibuat. Polis belum aktif sampai premi dibayar — coba lagi dari menu Polis, atau hubungi tim SurePath dengan menyebut nomor pesanan.');
      }
      setIsSuccess(true);
    } catch (e) {
      console.error('handlePurchase custom:', e);
      setError('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (!product) return <div className="p-8 text-center text-white">Produk tidak ditemukan.</div>;

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-[#f0faf7] dark:bg-[#050505] animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8">
          <ShieldCheck size={56} strokeWidth={2.5}/>
        </div>
        <div className="space-y-4 mb-12">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
            Pesanan <span className="text-emerald-500">Diterima</span>
          </h2>
          <p className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
            Pesanan berhasil dikirim. Polis aktif setelah pembayaran dikonfirmasi.
          </p>
        </div>
        {error && (
          <div className="w-full max-w-sm mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-amber-700 mb-1.5">
              Tagihan belum terbit
            </p>
            <p className="text-[0.7rem] text-amber-800 leading-relaxed">{error}</p>
          </div>
        )}
        <div className="w-full max-w-sm bg-white dark:bg-white/5 border border-black/5 rounded-[3rem] p-8 space-y-4 shadow-xl mb-10">
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>No. Pesanan</span>
            <span className="text-emerald-500 font-mono">{orderNumber ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>Produk</span>
            <span className="font-black uppercase">{product.name}</span>
          </div>
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>Status</span>
            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[0.55rem] font-black uppercase tracking-widest">Diproses</span>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4">
          {invoiceUrl && (
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              Buka Halaman Pembayaran <ExternalLink size={18}/>
            </a>
          )}
          <button onClick={onComplete}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
            Kembali ke Beranda <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0a09] min-h-[100dvh] flex flex-col font-sans relative overflow-hidden transition-colors duration-700 animate-fade-in pb-32">
       <Header title={product.name} subtitle={product.description} />
       <div className="max-w-2xl mx-auto w-full px-6 pt-12">
          <Card className="mb-6 p-8">
            <div className="flex justify-between items-start mb-6">
               <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex justify-center items-center">
                  <ModuleIcon id="product" size={48}/>
               </div>
               <Badge color="emerald">Custom Coverage</Badge>
            </div>
            <h2 className="text-3xl font-black uppercase text-white tracking-tighter mb-2">{product.name}</h2>
            <p className="text-sm font-medium text-gray-400 mb-8">{product.description}</p>

            <div className="flex justify-between items-center p-6 bg-white/5 rounded-2xl border border-white/10 mb-8">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base Premium</span>
               <span className="text-2xl font-black text-emerald-500">{formatIDR(product.basePremium)}</span>
            </div>

            {error && (
              <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 flex gap-4 items-center mb-6">
                 <AlertCircle className="text-rose-500 flex-shrink-0" size={24}/>
                 <p className="text-[0.65rem] font-bold text-rose-400 leading-relaxed uppercase tracking-wider">{error}</p>
              </div>
            )}

            <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="w-full flex items-center justify-between p-6 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-500/20 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                  <>
                    Memproses...
                    <Loader2 className="animate-spin" />
                  </>
                ) : (
                  <>
                    Konfirmasi &amp; Bayar
                    <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                  </>
                )}
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
