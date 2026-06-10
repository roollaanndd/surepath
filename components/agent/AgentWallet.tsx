import React, { useState, useEffect } from 'react';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Building2, ChevronRight, Info,
} from 'lucide-react';
import {
  getMyWallet, getMyWalletTransactions, getMyWithdrawals,
  requestWithdrawal, getAgentCoinBalance, redeemCoins,
  supabase,
  type AgentWallet, type WalletTransaction, type Withdrawal
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
  label?: string;
}

// ─── T&C Modal ────────────────────────────────────────────────────────────────
const WithdrawalTnCModal: React.FC<{ amount: number; fee: number; onAccept: () => void; onCancel: () => void }> = ({ amount, fee, onAccept, onCancel }) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md p-6 space-y-5">
        <h3 className="text-base font-black text-white">Syarat Penarikan Dana</h3>
        <div className="space-y-2.5 text-[11px] text-slate-400 leading-relaxed">
          <div className="flex gap-2"><span className="text-[#22c55e] font-black">①</span> Biaya transfer: <span className="text-white font-bold">{IDR(fee)}</span> per transaksi</div>
          <div className="flex gap-2"><span className="text-[#22c55e] font-black">②</span> Minimum penarikan: <span className="text-white font-bold">Rp 10.000</span></div>
          <div className="flex gap-2"><span className="text-[#22c55e] font-black">③</span> Proses pencairan: <span className="text-white font-bold">1–3 hari kerja</span> setelah semua persetujuan</div>
          <div className="flex gap-2"><span className="text-amber-400 font-black">④</span> Penarikan <span className="text-white font-bold">&gt; Rp 10 juta</span> memerlukan persetujuan L1 + L2</div>
          <div className="flex gap-2"><span className="text-red-400 font-black">⑤</span> Penarikan <span className="text-white font-bold">&gt; Rp 25 juta</span> memerlukan persetujuan L1 + L2 + L3 (24 jam)</div>
          <div className="flex gap-2"><span className="text-[#22c55e] font-black">⑥</span> Dana hanya ditransfer ke rekening yang telah terdaftar atas nama agen</div>
          <div className="flex gap-2"><span className="text-[#22c55e] font-black">⑦</span> SurePath tidak bertanggung jawab atas kesalahan data rekening yang diinput agen</div>
        </div>
        <div className="bg-white/5 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-300">Jumlah yang diterima</span>
          <span className="text-sm font-black text-white">{IDR(Math.max(0, amount - fee))}</span>
        </div>
        <label className="flex items-start gap-3 cursor-pointer" onClick={() => setAgreed(v => !v)}>
          <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${agreed ? 'bg-[#16a34a] border-[#16a34a]' : 'border-white/20'}`}>
            {agreed && <CheckCircle2 size={12} className="text-white" />}
          </div>
          <span className="text-[11px] text-slate-300 leading-relaxed">Saya membaca dan menyetujui seluruh syarat dan ketentuan penarikan dana SurePath.</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl border border-white/10 text-gray-400 font-black text-xs uppercase tracking-widest">Batal</button>
          <button
            onClick={onAccept}
            disabled={!agreed}
            className="flex-1 py-3.5 bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-40 active:scale-[0.97] hover:brightness-105 transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Lanjut
          </button>
        </div>
      </div>
    </div>
  );
};

interface WithdrawFormProps {
  balance: number;
  agentId: string;
  coinBalance: number;
  onSuccess: () => void;
  onCancel: () => void;
  savedAccounts: SavedAccount[];
  onSaveAccount: (account: SavedAccount) => void;
  onDeleteAccount: (idx: number) => void;
  profileName?: string;
}

const WithdrawForm: React.FC<WithdrawFormProps> = ({
  balance, agentId, coinBalance, onSuccess, onCancel,
  savedAccounts, onSaveAccount, onDeleteAccount, profileName,
}) => {
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accNum, setAccNum] = useState('');
  const [accName, setAccName] = useState('');
  const [accLabel, setAccLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [includeCoin, setIncludeCoin] = useState(false);
  const [coinRedeem, setCoinRedeem] = useState(0);
  const [showTnC, setShowTnC] = useState(false);
  const [addingNew, setAddingNew] = useState(savedAccounts.length === 0);

  const amt = parseInt(amount.replace(/\D/g, '')) || 0;
  const fee = 5000;
  const net = amt - fee;
  const needsL2 = amt >= 10_000_000;
  const needsL3 = amt >= 25_000_000;

  const fillAccount = (acc: SavedAccount) => {
    setBankCode(acc.bank_code);
    setAccNum(acc.account_number);
    setAccName(acc.account_holder_name);
    setAddingNew(false);
  };

  const doSubmit = async () => {
    setErr('');
    setLoading(true);
    let coinRpValue = 0;
    if (includeCoin && coinRedeem > 0) {
      const ok = await redeemCoins(agentId, coinRedeem, 'Pencairan ke rekening bank');
      if (!ok) { setErr('Gagal mencairkan koin. Coba lagi.'); setLoading(false); return; }
      coinRpValue = coinRedeem * 1000;
    }
    const totalAmount = amt + coinRpValue;
    const res = await requestWithdrawal({ amount: totalAmount, bank_code: bankCode, account_number: accNum.trim(), account_holder_name: accName.trim() });
    setLoading(false);
    if (res.success) {
      const existing = savedAccounts.find(a => a.account_number === accNum.trim() && a.bank_code === bankCode);
      if (!existing) {
        onSaveAccount({ bank_code: bankCode, account_number: accNum.trim(), account_holder_name: accName.trim(), label: accLabel.trim() || undefined });
      }
      onSuccess();
    } else {
      setErr(res.error ?? 'Terjadi kesalahan');
    }
  };

  const handleSubmitClick = () => {
    setErr('');
    if (amt < 10000) return setErr('Minimum penarikan Rp 10.000');
    if (amt > balance) return setErr('Saldo tidak mencukupi');
    if (!bankCode) return setErr('Pilih bank');
    if (!accNum.trim()) return setErr('Masukkan nomor rekening');
    if (!accName.trim()) return setErr('Masukkan nama pemegang rekening');
    setShowTnC(true);
  };

  return (
    <>
      {showTnC && (
        <WithdrawalTnCModal
          amount={amt + (includeCoin ? coinRedeem * 1000 : 0)}
          fee={fee}
          onAccept={() => { setShowTnC(false); doSubmit(); }}
          onCancel={() => setShowTnC(false)}
        />
      )}
      <div className="space-y-4">
        {/* Registered bank accounts */}
        {savedAccounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Rekening Terdaftar</p>
            {savedAccounts.map((acc, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${bankCode === acc.bank_code && accNum === acc.account_number ? 'border-[#16a34a] bg-[#16a34a]/10' : 'border-white/10 bg-white/5'}`}>
                <button className="flex-1 text-left" onClick={() => fillAccount(acc)}>
                  <p className="text-xs font-black text-white">{acc.bank_code} · {acc.account_number}</p>
                  <p className="text-[10px] text-slate-400">{acc.account_holder_name}{acc.label ? ` · ${acc.label}` : ''}</p>
                </button>
                <button onClick={() => onDeleteAccount(idx)} className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-red-400 transition-colors">
                  <XCircle size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => { setBankCode(''); setAccNum(''); setAccName(''); setAccLabel(''); setAddingNew(true); }}
              className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-white/20 transition-colors"
            >
              + Tambah Rekening Baru
            </button>
          </div>
        )}

        {/* New account form */}
        {addingNew && (
          <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Rekening Baru</p>
            <select className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm font-bold outline-none focus:border-[#16a34a]" value={bankCode} onChange={e => setBankCode(e.target.value)}>
              <option value="">Pilih Bank</option>
              {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <input className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-mono" placeholder="Nomor Rekening" value={accNum} onChange={e => setAccNum(e.target.value.replace(/\D/g, ''))} />
            <input className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all" placeholder="Nama Pemegang (sesuai buku tabungan)" value={accName} onChange={e => setAccName(e.target.value)} />
            <input className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all" placeholder='Label (opsional, cth: "Rekening Utama")' value={accLabel} onChange={e => setAccLabel(e.target.value)} />
            {accName && profileName && accName.toUpperCase() !== profileName.toUpperCase() && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1"><AlertCircle size={10} />Nama tidak cocok dengan nama terdaftar: {profileName}</p>
            )}
            {bankCode && accNum.trim() && accName.trim() && (
              <button
                type="button"
                onClick={() => {
                  onSaveAccount({ bank_code: bankCode, account_number: accNum.trim(), account_holder_name: accName.trim(), label: accLabel.trim() || undefined });
                  setBankCode(''); setAccNum(''); setAccName(''); setAccLabel(''); setAddingNew(false);
                }}
                className="w-full h-12 mt-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={14} />
                Simpan Rekening
              </button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Jumlah Penarikan</label>
          <input
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-mono"
            placeholder="0"
            value={amount ? parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          <p className="text-[0.5rem] text-gray-500 ml-1">Saldo: {IDR(balance)} · Biaya: {IDR(fee)} · Diterima: {amt > fee ? IDR(net) : IDR(0)}</p>
        </div>

        {coinBalance > 0 && (
          <div className="rounded-2xl border border-white/10 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setIncludeCoin(v => !v)} className={`w-10 h-5 rounded-full transition-colors relative ${includeCoin ? 'bg-amber-500' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeCoin ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <p className="text-xs font-black text-white">Cairkan Koin Sekaligus</p>
                <p className="text-[10px] text-slate-500">Saldo: {coinBalance.toLocaleString('id-ID')} poin = {IDR(coinBalance * 1000)}</p>
              </div>
            </label>
            {includeCoin && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Jumlah Koin (maks {coinBalance.toLocaleString('id-ID')})</label>
                <input type="number" min={1} max={coinBalance} value={coinRedeem} onChange={e => setCoinRedeem(Math.min(coinBalance, Math.max(0, Number(e.target.value))))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-500/50" />
                <p className="text-[10px] text-amber-400 font-bold mt-1">= {IDR(coinRedeem * 1000)} ditambahkan</p>
              </div>
            )}
          </div>
        )}

        {needsL3 && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-red-400">3 Level Persetujuan Diperlukan</p>
              <p className="text-[0.55rem] text-red-300/70 mt-0.5">Penarikan di atas Rp 25 juta memerlukan L1 + L2 + L3. Pencairan 24 jam setelah semua persetujuan.</p>
            </div>
          </div>
        )}
        {needsL2 && !needsL3 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300">Penarikan di atas Rp 10 juta memerlukan persetujuan L1 + L2.</p>
          </div>
        )}

        {includeCoin && coinRedeem > 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex justify-between">
            <span className="text-xs font-black text-amber-300">Total Penarikan</span>
            <span className="text-xs font-black text-amber-300">{IDR(amt + coinRedeem * 1000)}</span>
          </div>
        )}

        {err && <p className="text-xs text-red-400 font-bold px-1">{err}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-4 rounded-2xl border-2 border-white/10 text-gray-400 font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Batal</button>
          <button
            onClick={handleSubmitClick}
            disabled={loading || amt < 10000 || !bankCode || !accNum || !accName}
            className="flex-2 flex-grow h-12 bg-emerald-500 text-white rounded-xl font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> : <ArrowUpRight size={16} />}
            {loading ? 'Memproses...' : 'Tarik Dana'}
          </button>
        </div>
      </div>
    </>
  );
};

const SAVED_BANKS_KEY = 'SUREPATH_SAVED_BANKS';

const AgentWalletView: React.FC = () => {
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<'ledger' | 'withdrawals' | 'accounts'>('ledger');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [agentId, setAgentId] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_BANKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // migrate old single-account format
      if (Array.isArray(parsed)) return parsed;
      if (parsed?.bank_code) return [parsed];
      return [];
    } catch {
      return [];
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
    const updated = [...savedAccounts, account];
    localStorage.setItem(SAVED_BANKS_KEY, JSON.stringify(updated));
    setSavedAccounts(updated);
  };

  const handleDeleteAccount = (idx: number) => {
    const updated = savedAccounts.filter((_, i) => i !== idx);
    localStorage.setItem(SAVED_BANKS_KEY, JSON.stringify(updated));
    setSavedAccounts(updated);
  };

  const load = async () => {
    setLoading(true);
    const authUser = await supabase.auth.getUser();
    const uid = authUser.data.user?.id ?? '';
    setAgentId(uid);
    const [w, t, wd, cb] = await Promise.all([
      getMyWallet(),
      getMyWalletTransactions(50),
      getMyWithdrawals(20),
      uid ? getAgentCoinBalance(uid) : Promise.resolve(0),
    ]);
    setWallet(w);
    setTxns(t);
    setWithdrawals(wd);
    setCoinBalance(cb);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin motion-reduce:animate-none text-[#16a34a]" />
      </div>
    );
  }

  if (showWithdrawForm) {
    return (
      <div className="space-y-6 animate-fade-in motion-reduce:animate-none pb-24 px-1 font-sora">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowWithdrawForm(false)} className="p-2 rounded-xl bg-white/5 active:scale-95 motion-reduce:active:scale-100 transition-all">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tight">Tarik Dana</h2>
        </div>
        <WithdrawForm
          balance={wallet?.balance ?? 0}
          agentId={agentId}
          coinBalance={coinBalance}
          onSuccess={() => { setShowWithdrawForm(false); load(); }}
          onCancel={() => setShowWithdrawForm(false)}
          savedAccounts={savedAccounts}
          onSaveAccount={handleSaveAccount}
          onDeleteAccount={handleDeleteAccount}
          profileName={profileName}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-28">
      {/* Balance card */}
      <div className="mx-5 mt-5 rounded-2xl p-5 bg-gray-900 text-white sp-enter">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Saldo Tersedia</p>
              <h2 className="text-3xl font-bold font-mono text-white">{IDR(wallet?.balance ?? 0)}</h2>
              <p className="text-gray-500 text-xs mt-1">Saldo Dompet</p>
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
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Saldo Koin</p>
              <p className="text-base font-black text-amber-400">🪙 {coinBalance.toLocaleString('id-ID')} Poin</p>
              <p className="text-[10px] text-white/50 font-bold">≈ {IDR(coinBalance * 1000)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Pending Tarik</p>
              <p className="text-base font-black text-orange-400">
                {IDR(withdrawals.filter(w => w.status?.startsWith('PENDING')).reduce((s, w) => s + (w.amount ?? 0), 0))}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawForm(true)}
            disabled={(wallet?.balance ?? 0) < 10000}
            className="w-full h-12 mt-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all"
          >
            <ArrowUpRight size={18} />
            TARIK DANA
          </button>
        </div>
      </div>

      {/* Registered accounts summary */}
      {savedAccounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400">Rekening Terdaftar</p>
          {savedAccounts.map((acc, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-9 h-9 rounded-xl bg-[#16a34a]/10 flex items-center justify-center">
                <Building2 size={14} className="text-[#22c55e]" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-white">{acc.bank_code} · {acc.account_number}</p>
                <p className="text-[10px] text-slate-400">{acc.account_holder_name}{acc.label ? ` · ${acc.label}` : ''}</p>
              </div>
              <button onClick={() => handleDeleteAccount(idx)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors">
                <XCircle size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl">
        {(['ledger', 'withdrawals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-xl text-[0.55rem] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-[#16a34a] text-white shadow-lg' : 'text-gray-400'}`}
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
        <div className="bg-white rounded-2xl mx-5 mt-4 overflow-hidden border border-gray-100">
          {txns.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">Belum ada transaksi</div>
          )}
          {txns.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 bg-white">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                {tx.amount > 0 ? <ArrowDownLeft size={18} className="text-emerald-400" /> : <ArrowUpRight size={18} className="text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 flex-1 truncate">{tx.description ?? tx.type}</p>
                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold text-emerald-600 font-mono ${tx.amount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
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
            const isPending = wd.status?.startsWith('PENDING');
            return (
              <div key={wd.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wd.bank_code} · {wd.account_number}</p>
                      <p className="text-xs text-gray-400">{wd.account_holder_name}</p>
                    </div>
                  </div>
                  {isPending ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{label}</span>
                  ) : (
                    <span className={`text-[0.45rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
                  )}
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
