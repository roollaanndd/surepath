// Jejak aktivitas v2.8.9 — aksi heartbeat tidak ditulis, dan kolom detail
// hanya dibangun dari whitelist kunci aman.
import { describe, it, expect } from 'vitest';
import {
  isNoiseAction,
  buildActivityDetail,
  resolveActivityTarget,
} from '../../supabase/functions/_shared/activity';

describe('isNoiseAction — polling heartbeat tidak diaudit', () => {
  it('get_my_notifications (dipoll tiap 30–60 detik tiap portal) adalah noise', () => {
    expect(isNoiseAction('get_my_notifications')).toBe(true);
  });

  it('aksi bermakna tetap ditulis', () => {
    expect(isNoiseAction('submit_claim')).toBe(false);
    expect(isNoiseAction('admin_update_user')).toBe(false);
    expect(isNoiseAction('get_my_profile')).toBe(false);
    expect(isNoiseAction('mark_my_notification_read')).toBe(false);
  });
});

describe('buildActivityDetail — whitelist kunci aman', () => {
  it('menyertakan pengenal, status, dan jumlah yang aman', () => {
    const detail = buildActivityDetail({
      order_id: 'ord-1',
      status: 'ISSUED',
      total_premium: 1500000,
      email: 'nasabah@contoh.com',
    });
    expect(detail).toContain('order_id=ord-1');
    expect(detail).toContain('status=ISSUED');
    expect(detail).toContain('total_premium=1500000');
    expect(detail).toContain('email=nasabah@contoh.com');
  });

  it('tidak pernah menyalin nilai NIK, foto, kata sandi, atau token', () => {
    const detail = buildActivityDetail({
      email: 'agen@contoh.com',
      password: 'rahasia-123',
      ktp: '3273010101800001',
      photo_base64: 'AAAA',
      id_token: 'eyJhbGci',
      otp_code: '123456',
    });
    expect(detail).toContain('email=agen@contoh.com');
    expect(detail).not.toContain('rahasia');
    expect(detail).not.toContain('3273010101800001');
    expect(detail).not.toContain('AAAA');
    expect(detail).not.toContain('eyJ');
    expect(detail).not.toContain('123456');
  });

  it('kunci yang tidak ada di whitelist tidak ikut, apa pun isinya', () => {
    const detail = buildActivityDetail({ catatan_panjang: 'budi tinggal di jalan itu', order_id: 'o1' });
    expect(detail).toContain('order_id=o1');
    expect(detail).not.toContain('budi tinggal');
  });

  it('object dan array besar tidak disalin', () => {
    const detail = buildActivityDetail({
      metadata: { besar: true },
      items: Array.from({ length: 20 }, (_, i) => `x${i}`),
      allowed_apps: ['AGENT'],
    });
    expect(detail).toContain('allowed_apps=AGENT');
    expect(detail).not.toContain('besar');
    expect(detail).not.toContain('x0');
  });

  it('dipotong pada batas panjang dan tetap string aman', () => {
    const detail = buildActivityDetail({
      name: 'a'.repeat(300),
      status: 'OK',
    });
    expect(detail!.length).toBeLessThanOrEqual(240);
    expect(detail).toContain('status=OK');
  });

  it('params kosong → null', () => {
    expect(buildActivityDetail(null)).toBeNull();
    expect(buildActivityDetail({})).toBeNull();
    expect(buildActivityDetail({ benda_asing: 'x' })).toBeNull();
  });
});

describe('resolveActivityTarget — pengenal target lebih lengkap', () => {
  it('mengenali semua kunci pengenal umum', () => {
    expect(resolveActivityTarget({ order_id: 'o1' })).toBe('o1');
    expect(resolveActivityTarget({ claim_id: 'c1' })).toBe('c1');
    expect(resolveActivityTarget({ batch_id: 'b1' })).toBe('b1');
    expect(resolveActivityTarget({ notification_id: 'n1' })).toBe('n1');
  });

  it('id generik lebih diprioritaskan sesuai urutan kunci', () => {
    expect(resolveActivityTarget({ id: 'utama', order_id: 'lain' })).toBe('utama');
  });

  it('nilai kosong/whitespace dilewati', () => {
    expect(resolveActivityTarget({ order_id: '   ', claim_id: 'c1' })).toBe('c1');
    expect(resolveActivityTarget({ order_id: 123 })).toBe('123');
    expect(resolveActivityTarget(null)).toBeNull();
    expect(resolveActivityTarget({ nama: 'budi' })).toBeNull();
  });
});
