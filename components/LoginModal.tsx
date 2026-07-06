
import React, { useState } from 'react';
import { User, Lock, Mail, ChevronRight, X, AlertCircle, Loader2 } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (role: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role] = useState<'member' | 'partner' | 'admin'>('member');
  const [form, setForm] = useState({ id: '', password: '', name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    if (mode === 'login') {
      if (!form.id || !form.password) return 'ID dan password wajib diisi.';
    } else {
      if (!form.name || !form.email || !form.phone || !form.password) return 'Semua data wajib diisi.';
      if (!form.email.includes('@')) return 'Format email tidak valid.';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(role);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm glass-card rounded-[3rem] border-white/20 p-8 animate-pop-in relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-1.5 bg-gray-100 dark:bg-white/5 rounded-full"><X size={16}/></button>

        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                    {mode === 'login' ? 'Access Gate' : 'Join Path'}
                </h3>
                <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Sistem Keamanan Terenkripsi
                </p>
            </div>

            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                {['login', 'register'].map((m) => (
                    <button
                        key={m}
                        onClick={() => { setMode(m as any); setError(''); }}
                        className={`flex-1 py-2 rounded-lg text-[0.55rem] font-black uppercase tracking-widest transition-all ${
                            mode === m 
                            ? 'bg-white dark:bg-gray-700 shadow-md text-emerald-500' 
                            : 'text-gray-400'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-500 text-[0.65rem] font-bold animate-fade-in">
                    <AlertCircle size={14}/>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'register' && (
                    <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" placeholder="NAME"
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 outline-none focus:border-emerald-500 font-bold text-xs"
                            value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                        />
                    </div>
                )}

                <div className="relative">
                    {mode === 'login' ? <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /> : <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
                    <input 
                        type={mode === 'login' ? "text" : "email"} 
                        placeholder={mode === 'login' ? "ID / EMAIL" : "EMAIL"}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 outline-none focus:border-emerald-500 font-bold text-xs"
                        value={mode === 'login' ? form.id : form.email}
                        onChange={(e) => mode === 'login' ? setForm({...form, id: e.target.value}) : setForm({...form, email: e.target.value})}
                    />
                </div>

                <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="password" placeholder="KEY"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 outline-none focus:border-emerald-500 font-bold text-xs"
                        value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}
                    />
                </div>

                <button 
                    type="submit" disabled={isLoading}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={14}/> : <ChevronRight size={14}/>}
                    {mode === 'login' ? 'Decrypt Access' : 'Create Path'}
                </button>
            </form>

            <div className="text-center pt-1">
                <button className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest hover:text-emerald-500">
                    Lost Credentials?
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
