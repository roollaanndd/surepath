import React, { useState, useEffect } from 'react';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Building2, ChevronRight, Info
} from 'lucide-react';
import {
  getMyWallet, getMyWalletTransactions, getMyWithdrawals,
  requestWithdrawal, type AgentWallet, type WalletTransaction, type Withdrawal
} from '../../services/supabaseService';

const BANKS = [
  { code: 'BCA',     name: 'BCA' },
  { code: 'MANDIRI', name: 'Mandiri' },
  { code: 'BNI',     name: 'BNI' },
  { code: 'BRI',     name: 'BRI' },
  { code: 'CIMB',    name: 'CIMB Niaga' },
  { code: 'PERMATA', name: 'Permata' },
  { code: 'DANAMON', name: 'Danamon' },
  { code: 'BSI',     name: 'BSI' },
];

const IDR = (n: number) => 'Rp ' + Math.abs(n).toLocaleString('id-ID');

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING_L1:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
    PENDING_L2:  'bg-orange-500/10 text-orange-500 border-orange-500/20',
    PENDING_L3:  'bg-red-500/10 text-red-400 border-red-500/20',
    APPROVED:    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PROCESSING:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    DISBURSED:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    FAILED:      'bg-red-500/10 text-red-500 border-red-500/20',
    REJECTED:    'bg-red-500/10 text-red-500 border-red-500/20',
    CANCELLED:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  const label: Record<string, string> = {
    PENDING_L1: 'Menunggu Persetujuan L1', PENDING_L2: 'Menunggu L2', PENDING_L3: 'Menunggu L3',
    APPROVED: 'Disetujui', PROCESSING: 'Diproses', DISBURSED: 'Cair',
    FAILED: 'Gagal', REJECTED: 'Ditolak', CANCELLED: 'Dibatalkan',
  };
  return { cls: map[status] ?? 'bg-gray-500/10 text-gray-400', label: label[status] ?? status };
};

interface SavedAccount {
  bank_code: string;
  account_number: string;
  account_holder_name: string;
}

interface WithdrawFormProps {
  balance: number;
  onSuccess: () => void;
  onCancel: () => void;
  savedAccount?: SavedAccount | null;
  onSaveAccount?: (account: SavedAccount) => void;
  profileName?: string;
}

const WithdrawForm: React.FC<WithdrawFormProps> = ({ balance, onSuccess, onCancel, savedAccount, onSaveAccount, profileName }) => {
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accNum, setAccNum] = useState('');
  const [accName, setAccName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const amt = parseInt(amount.replace(/\D/g, '')) || 0;
  const fee = 5000;
  const net = amt - fee;
  const needsL2 = amt >= 10_000_000;
  const needsL3 = amt >= 25_000_000;

  const submit = async () => {
    setErr('');
    if (amt < 10000) return setErr('Minimum penarikan Rp 10.000');
    if (amt > balance) return setErr('Saldo tidak mencukupi');
    if (!bankCode) return setErr('Pilih bank');
    if (!accNum.trim()) return setErr('Masukkan nomor rekening');
    if (!accName.trim()) return setErr('Masukkan nama pemegang rekening');

    setLoading(true);
    const res = await requestWithdrawal({ amount: amt, bank_code: bankCode, account_number: accNum.trim(), account_holder_name: accName.trim() });
    setLoading(false);
    if (res.success) {
      if (onSaveAccount) {
        onSaveAccount({ bank_code: bankCode, account_number: accNum.trim(), account_holder_name: accName.trim() });
      }
      onSuccess();
    } else {
      setErr(res.error ?? 'Terjadi kesalahan');
    }
  };

  return (
    <div className="space-y-4">
      {savedAccount && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-emerald-400">{savedAccount.bank_code} · {savedAccount.account_number}</p>
            <p className="text-[10px] text-slate-400">{savedAccount.account_holder_name}</p>
          </div>
          <button
            onClick={() => { setBankCode(savedAccount.bank_code); setAccNum(savedAccount.account_number); setAccName(savedAccount.account_holder_name); }}
            className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Pakai
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Jumlah Penarikan</label>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-lg font-black outline-none focus:border-primary-500 font-mono"
          placeholder="0"
          value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
          onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
        />
        <p className="text-[0.5rem] text-gray-500 ml-1">Saldo: {IDR(balance)} · Biaya transfer: {IDR(fee)} · Diterima: {amt > fee ? IDR(net) : IDR(0)}</p>
      </div>

      {needsL3 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-red-400">Membutuhkan 3 Level Persetujuan</p>
            <p className="text-[0.55rem] text-red-300/70 mt-0.5">Penarikan di atas Rp 25 juta memerlukan persetujuan L1 + L2 + L3. Pencairan dijadwalkan 24 jam setelah semua persetujuan.</p>
          </div>
        </div>
      )}
      {needsL2 && !needsL3 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300">Penarikan di atas Rp 10 juta memerlukan persetujuan L1 + L2 (Finance Manager).</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Bank Tujuan</label>
        <select
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold outline-none focus:border-primary-500"
          value={bankCode} onChange={e => setBankCode(e.target.value)}
        >
          <option value="">Pilih Bank</option>
          {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Nomor Rekening</label>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-mono outline-none focus:border-primary-500"
          placeholder="1234567890"
          value={accNum} onChange={e => setAccNum(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Nama Pemegang Rekening</label>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold outline-none focus:border-primary-500"
          placeholder="Sesuai buku tabungan"
          value={accName} onChange={e => setAccName(e.target.value)}
        />
        {accName && profileName && accName.toUpperCase() !== profileName.toUpperCase() && (
          <p className="text-[10px] text-amber-400 flex items-center gap-1">
            <AlertCircle size={10} />
            Pastikan nama rekening sama dengan nama terdaftar: {profileName}
          </p>
        )}
      </div>

      {err && <p className="text-xs text-red-400 font-bold px-1">{err}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-4 rounded-2xl border-2 border-white/10 text-gray-400 font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
          Batal
        </button>
        <button
          onClick={submit}
          disabled={loading || amt < 10000 || !bankCode || !accNum || !accName}
          className="flex-2 flex-grow py-4 bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
          {loading ? 'Memproses...' : 'Tarik Dana'}
        </button>
      </div>
    </div>
  );
};

const SAVED_BANK_KEY = 'SUREPATH_SAVED_BANK';

const AgentWalletView: React.FC = () => {
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<'ledger' | 'withdrawals'>('ledger');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAccount, setSavedAccount] = useState<SavedAccount | null>(() => {
    try {
      const raw = localStorage.getItem(SAVED_BANK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const profileName: string | undefined = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('SUREPATH_SESSION') || '{}')?.name;
    } catch {
      return undefined;
    }
  })();

  const handleSaveAccount = (account: SavedAccount) => {
    localStorage.setItem(SAVED_BANK_KEY, JSON.stringify(account));
    setSavedAccount(account);
  };

  const load = async () => {
    setLoading(true);
    const [w, t, wd] = await Promise.all([
      getMyWallet(),
      getMyWalletTransactions(50),
      getMyWithdrawals(20),
    ]);
    setWallet(w);
    setTxns(t);
    setWithdrawals(wd);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (showWithdrawForm) {
    return (
      <div className="space-y-6 animate-fade-in pb-24 px-1">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowWithdrawForm(false)} className="p-2 rounded-xl bg-white/5 active:scale-95 transition-all">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tight">Tarik Dana</h2>
        </div>
        <WithdrawForm
          balance={wallet?.balance ?? 0}
          onSuccess={() => { setShowWithdrawForm(false); load(); }}
          onCancel={() => setShowWithdrawForm(false)}
          savedAccount={savedAccount}
          onSaveAccount={handleSaveAccount}
          profileName={profileName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Balance card */}
      <div className="relative bg-gradient-to-br from-primary-600 via-indigo-700 to-slate-900 rounded-[3rem] p-8 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-widest text-white/50">Saldo Dompet</p>
              <h2 className="text-4xl font-black text-white tracking-tighter mt-1">{IDR(wallet?.balance ?? 0)}</h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Wallet size={22} className="text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[0.5rem] font-black text-white/50 uppercase tracking-widest">Total Diterima</p>
              <p className="text-base font-black text-white mt-1">{IDR(wallet?.total_earned ?? 0)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[0.5rem] font-black text-white/50 uppercase tracking-widest">Total Ditarik</p>
              <p className="text-base font-black text-white mt-1">{IDR(wallet?.total_withdrawn ?? 0)}</p>
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawForm(true)}
            disabled={(wallet?.balance ?? 0) < 10000}
            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.25em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-40 shadow-lg"
          >
            <ArrowUpRight size={18} />
            TARIK DANA
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl">
        {(['ledger', 'withdrawals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-xl text-[0.55rem] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400'}`}
          >
            {t === 'ledger' ? 'Riwayat Kredit' : 'Penarikan'}
          </button>
        ))}
        <button onClick={load} className="p-3 rounded-xl bg-white/5 text-gray-400 active:scale-95 transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Ledger */}
      {tab === 'ledger' && (
        <div className="space-y-3">
          {txns.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">Belum ada transaksi</div>
          )}
          {txns.map(tx => (
            <div key={tx.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  {tx.amount > 0 ? <ArrowDownLeft size={18} className="text-emerald-400" /> : <ArrowUpRight size={18} className="text-amber-400" />}
                </div>
                <div>
                  <p className="text-xs font-black text-white">{tx.description ?? tx.type}</p>
                  <p className="text-[0.5rem] text-gray-500 mt-0.5">{new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{IDR(tx.amount)}
                </p>
                <p className="text-[0.45rem] text-gray-600">{IDR(tx.balance_after)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdrawals */}
      {tab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">Belum ada riwayat penarikan</div>
          )}
          {withdrawals.map(wd => {
            const { cls, label } = statusBadge(wd.status);
            return (
              <div key={wd.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-gray-400" />
                    <div>
                      <p className="text-xs font-black text-white">{wd.bank_code} · {wd.account_number}</p>
                      <p className="text-[0.5rem] text-gray-500">{wd.account_holder_name}</p>
                    </div>
                  </div>
                  <span className={`text-[0.45rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
                </div>
                <div className="flex justify-between items-end pt-1 border-t border-white/5">
                  <div>
                    <p className="text-[0.5rem] text-gray-500">Diminta: {IDR(wd.amount)}</p>
                    <p className="text-[0.5rem] text-gray-500">Biaya: {IDR(wd.xendit_fee)} · Diterima: {IDR(wd.net_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{IDR(wd.net_amount)}</p>
                    <p className="text-[0.45rem] text-gray-600">{new Date(wd.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                {wd.rejection_reason && (
                  <p className="text-[0.5rem] text-red-400 bg-red-500/10 rounded-xl px-3 py-2">Alasan ditolak: {wd.rejection_reason}</p>
                )}
                {wd.scheduled_disburse_at && wd.status !== 'DISBURSED' && (
                  <p className="text-[0.5rem] text-amber-400 flex items-center gap-1">
                    <Clock size={10} />
                    Dijadwalkan cair: {new Date(wd.scheduled_disburse_at).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentWalletView;
