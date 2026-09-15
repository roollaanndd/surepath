// Rekaman percakapan Pathy — mengunci dua hal yang paling mahal kalau salah.
//
// Pertama: perekaman TIDAK BOLEH menggagalkan obrolan. Tabel audit yang mati
// tidak boleh ikut mematikan fitur yang dipakai nasabah.
// Kedua: ringkasan per pengguna harus menghitung benar, karena itu yang dibaca
// admin sebelum membuka transkrip siapa pun.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();

vi.mock('../../services/db', () => ({
  supabase: { from: () => ({ insert: (rows: unknown) => insertMock(rows) }) },
}));

import {
  recordPathyTurn,
  summarisePathyUsers,
  currentPathyConversationId,
  startNewPathyConversation,
  type PathyMessageRow,
} from '../pathyLog';

beforeEach(() => {
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
});

const msg = (o: Partial<PathyMessageRow> & { user_id: string; created_at: string }): PathyMessageRow => ({
  id: Math.random(),
  user_email: 'a@test.local',
  conversation_id: 'c1',
  role: 'user',
  content: 'halo',
  tools_used: null,
  degraded: false,
  source: 'CLIENT',
  ...o,
} as PathyMessageRow);

describe('recordPathyTurn', () => {
  it('menyimpan pertanyaan dan jawaban sebagai dua baris', async () => {
    await recordPathyTurn({ question: 'berapa premi?', answer: 'sekitar 2 juta' });
    const rows = insertMock.mock.calls[0][0] as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: 'user', content: 'berapa premi?' });
    expect(rows[1]).toMatchObject({ role: 'assistant', content: 'sekitar 2 juta' });
  });

  it('tidak pernah mengirim identitas — server yang menentukannya dari JWT', async () => {
    await recordPathyTurn({ question: 'q', answer: 'a' });
    const rows = insertMock.mock.calls[0][0] as any[];
    for (const r of rows) {
      expect(r).not.toHaveProperty('user_id');
      expect(r).not.toHaveProperty('user_email');
      expect(r).not.toHaveProperty('source');
    }
  });

  it('TIDAK melempar saat penyimpanan menolak — obrolan harus tetap hidup', async () => {
    insertMock.mockResolvedValue({ error: { message: 'RLS menolak' } });
    await expect(recordPathyTurn({ question: 'q', answer: 'a' })).resolves.toBeUndefined();
  });

  it('TIDAK melempar saat jaringan putus', async () => {
    insertMock.mockRejectedValue(new Error('network down'));
    await expect(recordPathyTurn({ question: 'q', answer: 'a' })).resolves.toBeUndefined();
  });

  it('tetap menyimpan pertanyaan walau jawabannya kosong — itu justru jejak keluhan', async () => {
    await recordPathyTurn({ question: 'kenapa error?', answer: '   ' });
    const rows = insertMock.mock.calls[0][0] as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: 'user', content: 'kenapa error?' });
  });

  it('tidak menulis apa pun kalau dua-duanya kosong', async () => {
    await recordPathyTurn({ question: '  ', answer: '' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('menandai jawaban degraded dan mencatat tool yang dipakai', async () => {
    await recordPathyTurn({ question: 'q', answer: 'a', toolsUsed: ['estimate_premium'], degraded: true });
    const rows = insertMock.mock.calls[0][0] as any[];
    expect(rows[1]).toMatchObject({ degraded: true, tools_used: ['estimate_premium'] });
  });
});

describe('conversation id', () => {
  it('stabil dalam satu sesi, supaya transkrip tidak terpecah', () => {
    const a = currentPathyConversationId();
    expect(currentPathyConversationId()).toBe(a);
  });

  it('berganti saat obrolan baru dimulai, supaya transkrip tidak menyatu', () => {
    const a = currentPathyConversationId();
    const b = startNewPathyConversation();
    expect(b).not.toBe(a);
    expect(currentPathyConversationId()).toBe(b);
  });
});

describe('summarisePathyUsers', () => {
  it('menghitung pesan dan percakapan unik per pengguna', () => {
    const out = summarisePathyUsers([
      msg({ user_id: 'u1', created_at: '2026-09-15T10:00:00Z', conversation_id: 'c1' }),
      msg({ user_id: 'u1', created_at: '2026-09-15T10:01:00Z', conversation_id: 'c1' }),
      msg({ user_id: 'u1', created_at: '2026-09-15T11:00:00Z', conversation_id: 'c2' }),
      msg({ user_id: 'u2', created_at: '2026-09-15T09:00:00Z', conversation_id: 'c3' }),
    ]);
    const u1 = out.find(u => u.user_id === 'u1')!;
    expect(u1.messages).toBe(3);
    expect(u1.conversations).toBe(2);
    expect(out.find(u => u.user_id === 'u2')!.conversations).toBe(1);
  });

  it('mengurutkan yang terakhir aktif di atas', () => {
    const out = summarisePathyUsers([
      msg({ user_id: 'lama', created_at: '2026-09-01T10:00:00Z' }),
      msg({ user_id: 'baru', created_at: '2026-09-15T10:00:00Z' }),
    ]);
    expect(out.map(u => u.user_id)).toEqual(['baru', 'lama']);
  });

  it('memakai waktu TERBARU sebagai last_seen, bukan baris pertama yang kebetulan lewat', () => {
    const out = summarisePathyUsers([
      msg({ user_id: 'u1', created_at: '2026-09-10T10:00:00Z' }),
      msg({ user_id: 'u1', created_at: '2026-09-15T10:00:00Z' }),
      msg({ user_id: 'u1', created_at: '2026-09-12T10:00:00Z' }),
    ]);
    expect(out[0].last_seen).toBe('2026-09-15T10:00:00Z');
  });

  it('mengisi email dari baris mana pun yang punya — baris pertama bisa saja kosong', () => {
    const out = summarisePathyUsers([
      msg({ user_id: 'u1', created_at: '2026-09-15T10:00:00Z', user_email: null }),
      msg({ user_id: 'u1', created_at: '2026-09-15T09:00:00Z', user_email: 'nyata@test.local' }),
    ]);
    expect(out[0].user_email).toBe('nyata@test.local');
  });
});
