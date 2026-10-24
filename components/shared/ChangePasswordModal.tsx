import React from 'react';
import { supabase } from '../../services/supabaseService';
import { Language } from '../../types';

export default function ChangePasswordModal({ email, onClose, lang = Language.ID }: { email: string; onClose: () => void; lang?: Language }) {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return setError(t('Use at least 8 characters, one uppercase letter and one number.', 'Gunakan minimal 8 karakter, satu huruf besar, dan satu angka.'));
    if (newPassword !== confirmPassword) return setError(t('New passwords do not match.', 'Konfirmasi kata sandi tidak cocok.'));
    setLoading(true);
    try {
      const auth = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (auth.error) throw new Error(t('Current password is incorrect.', 'Kata sandi saat ini salah.'));
      const result = await supabase.auth.updateUser({ password: newPassword });
      if (result.error) throw result.error;
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : t('Unable to change password.', 'Gagal mengubah kata sandi.')); }
    finally { setLoading(false); }
  };
  const input = 'w-full rounded-xl border border-ds-border bg-ds-card px-4 py-3 text-sm text-ds-ink focus:outline-none focus:ring-2 focus:ring-ds-green';
  return <div className="fixed inset-0 z-[2600] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-3xl border border-ds-border bg-ds-card p-6 shadow-2xl">
    <button onClick={onClose} type="button" className="absolute right-4 top-4 text-ds-ink3" aria-label={t('Close','Tutup')}>✕</button>
    <h2 className="mb-1 pr-8 text-xl font-bold text-ds-ink">{success ? t('Password changed','Kata sandi berhasil diubah') : t('Change password','Ubah kata sandi')}</h2>
    {success ? <><p className="mt-3 text-sm text-ds-ink3">{t('Your password was updated successfully.','Kata sandi berhasil diperbarui.')}</p><button onClick={onClose} className="mt-6 w-full rounded-xl bg-ds-green px-4 py-3 font-semibold text-ds-on-green">{t('Done','Selesai')}</button></> : <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm text-ds-ink">{t('Current password','Kata sandi saat ini')}<input required autoComplete="current-password" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className={input+' mt-1.5'}/></label>
      <label className="block text-sm text-ds-ink">{t('New password','Kata sandi baru')}<input required minLength={8} autoComplete="new-password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={input+' mt-1.5'}/><span className="mt-1 block text-xs text-ds-ink3">{t('At least 8 characters, one uppercase letter and one number.','Minimal 8 karakter, satu huruf besar, dan satu angka.')}</span></label>
      <label className="block text-sm text-ds-ink">{t('Confirm new password','Konfirmasi kata sandi baru')}<input required minLength={8} autoComplete="new-password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={input+' mt-1.5'}/></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex gap-3"><button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-ds-border px-3 py-3 text-sm text-ds-ink">{t('Cancel','Batal')}</button><button type="submit" disabled={loading} className="flex-1 rounded-xl bg-ds-green px-3 py-3 text-sm font-semibold text-ds-on-green disabled:opacity-60">{loading ? t('Updating…','Memperbarui…') : t('Update password','Ubah kata sandi')}</button></div>
    </form>}
  </div></div>;
}
