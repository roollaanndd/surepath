// CRM marketing/sales — Fase 1.
//
// Yang diuji di sini dipilih karena bisa salah TANPA terlihat:
//   1. parameter yang dikirim ke gateway (salah nama = aksi tidak pernah jalan)
//   2. normalisasi nomor WA (0812… -> 62812…), salah satu sumber bug klasik
//   3. kartu pendamping harus TIDAK merender apa pun kalau belum ada handler
//   4. dashboard harus menampilkan pembilang/penyebut dan catatan produksi,
//      bukan angka tanpa konteks
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const callGateway = vi.fn();
vi.mock('../db', () => ({ callGateway: (...a: unknown[]) => callGateway(...a), supabase: {} }));

beforeEach(() => { callGateway.mockReset(); });

describe('services/marketing — kontrak parameter gateway', () => {
  it('logMarketingActivity mengirim snake_case yang dikenali server', async () => {
    callGateway.mockResolvedValue({ data: { id: 'x' } });
    const { logMarketingActivity } = await import('../marketing');
    await logMarketingActivity({
      kind: 'WA', agentId: 'a1', outcome: 'oke',
      nextAction: 'telepon lagi', nextActionAt: '2026-11-01T02:00:00.000Z',
    });
    const [action, params] = callGateway.mock.calls[0];
    expect(action).toBe('marketing_log_activity');
    expect(params.agent_id).toBe('a1');
    expect(params.next_action).toBe('telepon lagi');
    expect(params.next_action_at).toBe('2026-11-01T02:00:00.000Z');
    // marketing_id TIDAK boleh dikirim dari klien — server mengambilnya dari
    // pemanggil terverifikasi.
    expect('marketing_id' in params).toBe(false);
  });

  it('hanya_telat dikirim sebagai boolean, bukan string', async () => {
    callGateway.mockResolvedValue({ data: [] });
    const { fetchMarketingActivities } = await import('../marketing');
    await fetchMarketingActivities({ hanyaTelat: true });
    expect(callGateway.mock.calls[0][1].hanya_telat).toBe(true);
  });

  it('daftar mengembalikan array kosong, bukan undefined, saat gateway gagal', async () => {
    callGateway.mockResolvedValue({ error: 'Not authenticated' });
    const { fetchMarketingAgents, fetchUnassignedAgents } = await import('../marketing');
    expect(await fetchMarketingAgents()).toEqual([]);
    expect(await fetchUnassignedAgents()).toEqual([]);
  });

  it('assignAgentHandler melempar saat server menolak', async () => {
    callGateway.mockResolvedValue({ error: 'Forbidden: admin only' });
    const { assignAgentHandler } = await import('../marketing');
    await expect(assignAgentHandler('a1', 'm1')).rejects.toThrow('Forbidden: admin only');
  });
});

describe('AgentHandlerCard', () => {
  it('tidak merender apa pun kalau agen belum punya pendamping', async () => {
    callGateway.mockResolvedValue({ data: null });
    const { default: Card } = await import('../../components/agent/AgentHandlerCard');
    const { container } = render(<Card />);
    await waitFor(() => expect(callGateway).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('menormalkan 0812… menjadi 62812… pada tautan WhatsApp', async () => {
    callGateway.mockResolvedValue({ data: { id: 'm1', name: 'Rina', phone: '0812-3456-789', profile_photo_url: null } });
    const { default: Card } = await import('../../components/agent/AgentHandlerCard');
    render(<Card />);
    const link = await screen.findByRole('link');
    expect(link.getAttribute('href')).toBe('https://wa.me/628123456789');
  });

  it('tidak menampilkan tautan WA kalau nomor kosong', async () => {
    callGateway.mockResolvedValue({ data: { id: 'm1', name: 'Rina', phone: null, profile_photo_url: null } });
    const { default: Card } = await import('../../components/agent/AgentHandlerCard');
    render(<Card />);
    expect(await screen.findByText('Rina')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('tidak melempar saat gateway error — ini kartu pelengkap', async () => {
    callGateway.mockRejectedValue(new Error('boom'));
    const { default: Card } = await import('../../components/agent/AgentHandlerCard');
    const { container } = render(<Card />);
    await waitFor(() => expect(callGateway).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});

describe('MarketingDashboard', () => {
  const summary = {
    pipeline: {
      DAFTAR: { jumlah: 5, mandek_14h: 3 },
      DOKUMEN: { jumlah: 7, mandek_14h: 2 },
      TERVERIFIKASI: { jumlah: 9, mandek_14h: 0 },
      PRODUKTIF: { jumlah: 2, mandek_14h: 0 },
    },
    total_agen: 23,
    belum_pernah_produksi: 21,
    follow_up_telat: 4,
    agen_tanpa_handler: 23,
    catatan_produksi: 'Angka premi/komisi/status bayar belum ditampilkan: sumbernya belum sah sampai Fase 0 selesai.',
  };

  it('menampilkan pembilang dan penyebut, bukan hanya persen', async () => {
    callGateway.mockResolvedValue({ data: summary });
    const { default: Dash } = await import('../../components/marketing/MarketingDashboard');
    render(<Dash />);
    expect(await screen.findByText('2 dari 23 pernah berproduksi')).toBeTruthy();
  });

  it('memunculkan jumlah yang MANDEK per tahap, bukan hanya jumlah', async () => {
    callGateway.mockResolvedValue({ data: summary });
    const { default: Dash } = await import('../../components/marketing/MarketingDashboard');
    render(<Dash />);
    expect(await screen.findByText('3 mandek >14 hari')).toBeTruthy();
    expect(screen.getByText('2 mandek >14 hari')).toBeTruthy();
  });

  it('menyatakan keterbatasan data produksi secara terbuka', async () => {
    callGateway.mockResolvedValue({ data: summary });
    const { default: Dash } = await import('../../components/marketing/MarketingDashboard');
    render(<Dash />);
    expect(await screen.findByText(/belum ditampilkan/)).toBeTruthy();
  });
});
