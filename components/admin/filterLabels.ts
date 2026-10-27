// Label filter daftar pesanan.
//
// Filter "PENDING" adalah gabungan SUBMITTED + UNDER_REVIEW dan TIDAK punya
// entri di STATUS_META (yang berisi status satu per satu). Membacanya dari
// STATUS_META membuat PolicyOrdersAdmin crash tepat saat menu Antrean Review
// dibuka — halaman putih, bukan pesan error yang bisa ditindaklanjuti.

const FILTER_LABELS: Record<string, string> = {
  ALL: 'Semua',
  PENDING: 'Perlu Keputusan',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  ISSUED: 'Issued',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function filterLabel(filter: string): string {
  return FILTER_LABELS[filter] ?? filter;
}
