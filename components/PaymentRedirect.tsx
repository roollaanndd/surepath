import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowLeft, Loader2, Clock } from 'lucide-react';
import { callGateway } from '../services/supabaseService';

interface Props {
  status: 'success' | 'failed';
}

type VerifyState = 'verifying' | 'confirmed' | 'timeout' | 'failed';

const PaymentRedirect: React.FC<Props> = ({ status }) => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order') ?? '';

  const [verifyState, setVerifyState] = useState<VerifyState>(
    status === 'success' && orderId ? 'verifying' : status === 'success' ? 'confirmed' : 'failed',
  );

  useEffect(() => {
    if (verifyState !== 'verifying' || !orderId) return;

    let attempts = 0;
    const MAX = 6;
    const INTERVAL = 3000;

    const check = async () => {
      attempts += 1;
      try {
        const { data } = await callGateway('get_my_orders');
        const orders = (data ?? []) as any[];
        const order = orders.find((o: any) => o.id === orderId || o.order_number === orderId);
        if (order && ['PAID', 'ISSUED', 'APPROVED'].includes(order.status)) {
          setVerifyState('confirmed');
          return;
        }
      } catch {
        // network hiccup — keep polling
      }
      if (attempts >= MAX) {
        setVerifyState('timeout');
      } else {
        setTimeout(check, INTERVAL);
      }
    };

    const t = setTimeout(check, 1500);
    return () => clearTimeout(t);
  }, [orderId, verifyState]);

  const isSuccess = verifyState === 'confirmed' || (verifyState === 'timeout' && status === 'success');

  if (verifyState === 'verifying') {
    return (
      <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Memverifikasi Pembayaran</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Menunggu konfirmasi dari gateway pembayaran…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isSuccess ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
        }`}>
          {isSuccess
            ? <CheckCircle className="w-12 h-12 text-emerald-500" />
            : <XCircle className="w-12 h-12 text-rose-500" />
          }
        </div>

        <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
          {verifyState === 'timeout'
            ? 'Pembayaran Sedang Diproses'
            : isSuccess ? 'Pembayaran Berhasil!' : 'Pembayaran Gagal'}
        </h1>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
          {verifyState === 'timeout'
            ? 'Pembayaran Anda sedang dikonfirmasi. Polis akan aktif setelah pembayaran terverifikasi (maks. 1×24 jam).'
            : isSuccess
            ? 'Terima kasih! Premi asuransi Anda telah kami terima. Order akan segera diproses oleh tim kami.'
            : 'Pembayaran tidak dapat diproses. Silakan coba lagi atau hubungi agen Anda.'}
        </p>

        {orderId && (
          <p className="text-xs text-slate-400 mb-8">
            Order ID: <span className="font-bold text-slate-600 dark:text-slate-300">{orderId}</span>
          </p>
        )}

        {verifyState === 'timeout' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 mb-8 text-left flex items-start gap-3">
            <Clock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Jika pembayaran sudah diselesaikan, status polis akan diperbarui otomatis. Cek menu <strong>Pesanan Saya</strong> untuk status terkini.
            </p>
          </div>
        )}

        {isSuccess && verifyState !== 'timeout' && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4 mb-8 text-left space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Langkah Selanjutnya</p>
            {['Tim kami akan mereview order dalam 1×24 jam.', 'Anda akan menerima notifikasi via WhatsApp.', 'Polis digital tersedia di aplikasi setelah disetujui.'].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-[9px] font-black mt-0.5">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { window.location.href = '/'; }}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-transform active:scale-95 ${
            isSuccess
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
        >
          <ArrowLeft size={16} />
          Kembali ke SurePath
        </button>
      </div>
    </div>
  );
};

export default PaymentRedirect;
