// Konsol Operasi — mengunci aritmetika yang jadi dasar keputusan bisnis.
//
// Layar ini ada justru karena "5 order / 0 invoice" luput berbulan-bulan. Kalau
// penghitungan corong atau pengurutan antreannya salah, ia mengulangi kegagalan
// yang sama — tenang, hijau, dan salah. Karena itu yang diuji di sini bukan
// tampilannya melainkan angkanya: siapa masuk corong, siapa tidak, dan siapa
// yang muncul paling atas di antrean.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

const mockGetAllOrders = vi.fn();
const mockGetAdminPayments = vi.fn();

vi.mock('../../services/orders', () => ({
  getAllOrders: () => mockGetAllOrders(),
  getAdminPayments: (n?: number) => mockGetAdminPayments(n),
}));

import OpsConsoleView from '../../components/admin/OpsConsoleView';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const order = (o: Partial<Record<string, unknown>> & { id: string }) => ({
  agent_id: 'a1',
  client_name: 'Budi',
  product_code: 'CAR',
  product_name: 'Asuransi Mobil',
  coverage_type: 'COMPREHENSIVE',
  sum_insured: 100_000_000,
  zone: 2,
  vehicle_category: 3,
  addons: {},
  base_premium: 1_000_000,
  addon_premium: 0,
  admin_fee: 0,
  stamp_duty: 0,
  total_premium: 1_000_000,
  vehicle_details: {},
  status: 'SUBMITTED',
  created_at: daysAgo(1),
  ...o,
});

const payment = (order_id: string, status: string) => ({
  id: `p-${order_id}-${status}`,
  order_id,
  external_id: 'x',
  amount: 1_000_000,
  currency: 'IDR',
  status,
});

beforeEach(() => {
  mockGetAllOrders.mockReset();
  mockGetAdminPayments.mockReset();
});

const mount = async (orders: unknown[], payments: unknown[]) => {
  mockGetAllOrders.mockResolvedValue(orders);
  mockGetAdminPayments.mockResolvedValue(payments);
  render(<OpsConsoleView />);
  await waitFor(() => expect(screen.getByText('Corong')).toBeTruthy());
};

/** Angka besar yang ditampilkan tepat di atas label tahap corong. */
const stageCount = (label: string): string => {
  const labelEl = screen.getByText(label);
  const card = labelEl.parentElement!;
  return within(card).getAllByText(/^\d+$/)[0].textContent!;
};

describe('Corong', () => {
  it('menghitung tiap tahap dari data yang ada, bukan dari status saja', async () => {
    await mount(
      [
        order({ id: 'o1', status: 'APPROVED' }),                 // ada invoice, belum bayar
        order({ id: 'o2', status: 'APPROVED' }),                 // ada invoice, sudah bayar
        order({ id: 'o3', status: 'ISSUED' }),                   // bayar + polis terbit
        order({ id: 'o4', status: 'SUBMITTED' }),                // belum ada invoice
      ],
      [
        payment('o1', 'PENDING'),
        payment('o2', 'PAID'),
        payment('o3', 'PAID'),
      ],
    );

    expect(stageCount('Order dibuat')).toBe('4');
    expect(stageCount('Invoice terbit')).toBe('3');
    expect(stageCount('Dibayar')).toBe('2');
    expect(stageCount('Polis terbit')).toBe('1');
  });

  it('mengeluarkan order batal dan ditolak — itu keputusan, bukan kebocoran', async () => {
    await mount(
      [
        order({ id: 'o1', status: 'SUBMITTED' }),
        order({ id: 'o2', status: 'CANCELLED' }),
        order({ id: 'o3', status: 'REJECTED' }),
      ],
      [],
    );
    expect(stageCount('Order dibuat')).toBe('1');
  });

  it('invoice kedaluwarsa setelah dibayar tidak membatalkan pembayarannya', async () => {
    // Satu order, dua baris bayar: yang pertama LUNAS, yang kedua EXPIRED.
    // Kalau kode memakai baris terakhir, order ini hilang dari tahap "Dibayar".
    await mount(
      [order({ id: 'o1', status: 'APPROVED' })],
      [payment('o1', 'PAID'), payment('o1', 'EXPIRED')],
    );
    expect(stageCount('Dibayar')).toBe('1');
  });

  it('meneriakkan kondisi "ada order, nol invoice" — kegagalan yang luput berbulan-bulan', async () => {
    await mount([order({ id: 'o1' }), order({ id: 'o2' })], []);
    expect(screen.getByText(/2 order, nol invoice/i)).toBeTruthy();
  });

  it('tidak meneriakkannya saat invoice memang sudah terbit', async () => {
    await mount([order({ id: 'o1' })], [payment('o1', 'PENDING')]);
    expect(screen.queryByText(/nol invoice/i)).toBeNull();
  });
});

describe('Antrean bertindak', () => {
  it('menaruh yang paling tua di atas, bukan yang paling baru', async () => {
    await mount(
      [
        order({ id: 'baru', order_number: 'BARU', created_at: daysAgo(1) }),
        order({ id: 'tua', order_number: 'TUA', created_at: daysAgo(60) }),
        order({ id: 'sedang', order_number: 'SEDANG', created_at: daysAgo(10) }),
      ],
      [],
    );
    const rows = screen.getAllByRole('row').slice(1); // buang header
    const urutan = rows.map(r => within(r).getByText(/^(BARU|TUA|SEDANG)$/).textContent);
    expect(urutan).toEqual(['TUA', 'SEDANG', 'BARU']);
  });

  it('membedakan "belum ditagih" dari "menunggu bayar" — status order-nya sama persis', async () => {
    await mount(
      [
        order({ id: 'o1', order_number: 'TANPA-INVOICE', status: 'APPROVED' }),
        order({ id: 'o2', order_number: 'SUDAH-INVOICE', status: 'APPROVED' }),
      ],
      [payment('o2', 'PENDING')],
    );
    const baris = (num: string) =>
      screen.getByText(num).closest('tr')!;
    expect(within(baris('TANPA-INVOICE')).getByText('Belum ditagih')).toBeTruthy();
    expect(within(baris('SUDAH-INVOICE')).getByText('Menunggu bayar')).toBeTruthy();
  });

  it('menandai order yang sudah dibayar tapi polisnya belum terbit', async () => {
    await mount(
      [order({ id: 'o1', order_number: 'LUNAS', status: 'APPROVED' })],
      [payment('o1', 'PAID')],
    );
    expect(screen.getByText('Polis belum terbit')).toBeTruthy();
  });

  it('tidak memasukkan order yang sudah selesai ke antrean', async () => {
    await mount(
      [order({ id: 'o1', status: 'ISSUED' })],
      [payment('o1', 'PAID')],
    );
    expect(screen.getByText(/Tidak ada yang menunggu/i)).toBeTruthy();
  });

  it('menjumlahkan nilai yang menunggu ditagih — itu angka rupiah yang tertahan', async () => {
    await mount(
      [
        order({ id: 'o1', status: 'APPROVED', total_premium: 1_500_000 }),
        order({ id: 'o2', status: 'APPROVED', total_premium: 2_500_000 }),
        order({ id: 'o3', status: 'APPROVED', total_premium: 9_000_000 }), // sudah ditagih
      ],
      [payment('o3', 'PENDING')],
    );
    expect(screen.getByText(/Rp 4\.000\.000/)).toBeTruthy();
  });

  it('menghitung yang lewat ambang basi', async () => {
    await mount(
      [
        order({ id: 'o1', created_at: daysAgo(30) }),
        order({ id: 'o2', created_at: daysAgo(8) }),
        order({ id: 'o3', created_at: daysAgo(2) }),
      ],
      [],
    );
    expect(screen.getByText(/2 lewat 7 hari/i)).toBeTruthy();
  });

  it('tidak memperlakukan tanggal yang hilang sebagai paling mendesak', async () => {
    await mount(
      [
        order({ id: 'o1', order_number: 'TANPA-TANGGAL', created_at: undefined }),
        order({ id: 'o2', order_number: 'ADA-TANGGAL', created_at: daysAgo(5) }),
      ],
      [],
    );
    const rows = screen.getAllByRole('row').slice(1);
    const urutan = rows.map(r => within(r).getByText(/^(TANPA-TANGGAL|ADA-TANGGAL)$/).textContent);
    expect(urutan).toEqual(['ADA-TANGGAL', 'TANPA-TANGGAL']);
  });
});
