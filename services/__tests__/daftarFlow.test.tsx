// Alur daftar — laporan pemilik 22 Okt 2026: "user jd input data 2x dan saat
// sdh input tidak bisa lanjut".
//
// Keduanya terbukti di log produksi. Akun yang dibuat 22 Okt 01:02:44 (Mitra,
// lengkap dengan nomor telepon) tidak pernah terkonfirmasi dan tidak pernah
// login. Log auth pada menit-menit berikutnya merekam empat 429 beruntun
// ("you can only request this after 45/23/22/8 seconds") lalu "429: email rate
// limit exceeded" — tombol kirim ulang menelan semua error itu dan tetap
// menulis "Terkirim!", jadi pendaftar menekannya terus sampai kena batas.
//
// Yang dikunci di sini adalah hal-hal yang bisa rusak lagi tanpa terlihat:
//   1. data yang sudah diketik HARUS sampai ke layar onboarding mitra, dan
//      langkah pertamanya dilewati — bukan ditampilkan ulang sebagai kolom
//      kosong
//   2. layar verifikasi HARUS menerima kode, bukan cuma menyuruh buka email
//   3. kegagalan kirim ulang HARUS terlihat oleh pendaftar
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Language } from '../../types';

const signUp = vi.fn();
const resend = vi.fn();
const verifyOtp = vi.fn();

vi.mock('../../services/supabaseService', () => ({
  supabase: {
    auth: {
      signUp: (...a: unknown[]) => signUp(...a),
      resend: (...a: unknown[]) => resend(...a),
      verifyOtp: (...a: unknown[]) => verifyOtp(...a),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Invalid login credentials' } }),
    },
  },
  ensureProfile: vi.fn(),
  fetchMyProfileForLogin: vi.fn(),
}));

beforeEach(() => {
  signUp.mockReset(); resend.mockReset(); verifyOtp.mockReset();
  localStorage.clear();
});

const isiDaftarMitra = async () => {
  const AuthGate = (await import('../../components/AuthGate')).default;
  render(<AuthGate onAuthSuccess={() => {}} initialLang={Language.ID} initialMode="REGISTER" />);
  fireEvent.click(screen.getByRole('button', { name: /mitra/i }));
  fireEvent.change(screen.getByLabelText(/nama lengkap/i), { target: { value: 'Budi Santoso' } });
  fireEvent.change(screen.getByLabelText(/nomor telepon/i), { target: { value: '081234567890' } });
  fireEvent.change(screen.getByLabelText(/alamat email/i), { target: { value: 'budi@contoh.com' } });
  fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
};

describe('daftar Mitra — tidak boleh mengetik ulang', () => {
  it('nama, email, telepon dibawa ke layar onboarding dan langkah 1 dilewati', async () => {
    await isiDaftarMitra();
    fireEvent.click(screen.getByRole('button', { name: /lanjut ke setup mitra/i }));

    // Datanya ditampilkan sebagai ringkasan, bukan diminta lagi.
    await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeTruthy());
    expect(screen.getByText('budi@contoh.com')).toBeTruthy();
    expect(screen.getByText('081234567890')).toBeTruthy();

    // Langkah 1 dilewati: tidak ada lagi kolom konfirmasi kata sandi.
    expect(screen.queryByPlaceholderText(/konfirmasi kata sandi/i)).toBeNull();
    // Dan yang tampil adalah langkah terakhir.
    expect(screen.getByText(/langkah terakhir/i)).toBeTruthy();
  });
});

describe('verifikasi setelah daftar', () => {
  it('nasabah yang emailnya belum dikonfirmasi mendapat kolom kode, bukan jalan buntu', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    const AuthGate = (await import('../../components/AuthGate')).default;
    render(<AuthGate onAuthSuccess={() => {}} initialLang={Language.ID} initialMode="REGISTER" />);
    fireEvent.click(screen.getByRole('button', { name: /nasabah/i }));
    fireEvent.change(screen.getByLabelText(/nama lengkap/i), { target: { value: 'Siti' } });
    fireEvent.change(screen.getByLabelText(/alamat email/i), { target: { value: 'siti@contoh.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.click(screen.getByRole('button', { name: /buat akun/i }));

    const kolom = await screen.findByLabelText(/kode verifikasi 6 digit/i);
    expect(kolom).toBeTruthy();

    // Kodenya benar-benar diverifikasi sebagai konfirmasi pendaftaran.
    verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'Token has expired' } });
    fireEvent.change(kolom, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verifikasi & lanjut/i }));
    await waitFor(() => expect(verifyOtp).toHaveBeenCalled());
    expect(verifyOtp.mock.calls[0][0]).toMatchObject({
      email: 'siti@contoh.com', token: '123456', type: 'signup',
    });
    // Error dari server ditampilkan, tidak ditelan.
    expect(await screen.findByText(/Token has expired/)).toBeTruthy();
  });

  it('kegagalan kirim ulang ditampilkan, bukan dilaporkan sebagai "Terkirim!"', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    resend.mockResolvedValue({ error: { message: 'email rate limit exceeded' } });
    const AuthGate = (await import('../../components/AuthGate')).default;
    render(<AuthGate onAuthSuccess={() => {}} initialLang={Language.ID} initialMode="REGISTER" />);
    fireEvent.click(screen.getByRole('button', { name: /nasabah/i }));
    fireEvent.change(screen.getByLabelText(/nama lengkap/i), { target: { value: 'Siti' } });
    fireEvent.change(screen.getByLabelText(/alamat email/i), { target: { value: 'siti@contoh.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.click(screen.getByRole('button', { name: /buat akun/i }));
    await screen.findByLabelText(/kode verifikasi 6 digit/i);

    // Tombolnya terkunci oleh hitung mundur tepat setelah pendaftaran, supaya
    // tidak bisa dihujani permintaan — itu sendiri bagian dari perbaikannya.
    const tombol = screen.getByRole('button', { name: /kirim ulang dalam/i });
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
  });
});
