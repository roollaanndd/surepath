// Konsol Operasi — layar yang menjawab "apa yang perlu saya kerjakan pagi ini".
//
// CMS yang ada sekarang bisa menampilkan apa yang ADA, tapi tidak bisa
// menampilkan apa yang SEHARUSNYA terjadi tapi tidak. Untuk bisnis asuransi,
// justru yang kedua itu uangnya: 5 order mandek sejak Juli dan 0 invoice pernah
// terbentuk sepanjang aplikasi hidup — dua-duanya tidak salah di layar mana
// pun, karena tidak ada layar yang menghitung selisih antar tahap.
//
// Dua blok, dua pertanyaan berbeda:
//   • Corong  — "di tahap mana uang berhenti mengalir"
//   • Antrean — "pekerjaan mana yang paling lama terlantar"
//
// Antrean diurutkan berdasarkan UMUR, bukan tanggal buat. Order berumur 60 hari
// harus berteriak, dan pengurutan tanggal-terbaru-di-atas justru menguburnya.
//
// Semuanya komposisi ulang dari dua action yang SUDAH hidup di gateway produksi
// (`admin_list_orders`, `admin_list_payments`) — sengaja, supaya layar ini
// berguna hari ini juga dan tidak ikut antre di belakang deploy edge function.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { getAllOrders, getAdminPayments } from '../../services/orders';
import type { SpPolicyOrder, SpPayment } from '../../services/dbTypes';
import ModuleIcon from '../shared/ModuleIcon';

/** Hari penuh sejak `iso`. Null kalau tanggalnya tidak ada — dibedakan dari 0
 *  supaya baris tanpa tanggal tidak menyamar sebagai baris paling segar. */
const ageInDays = (iso?: string): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
};

/** Ambang eskalasi. Dipakai bersama oleh warna umur dan daftar "macet" supaya
 *  satu baris tidak bisa tampil merah di satu blok dan normal di blok lain. */
const STALE_DAYS = 7;
const WARN_DAYS = 3;

const ageTone = (days: number | null): string => {
  if (days === null) return 'text-ds-ink3';
  if (days >= STALE_DAYS) return 'text-ds-red font-semibold';
  if (days >= WARN_DAYS) return 'text-ds-amber font-medium';
  return 'text-ds-ink2';
};

const fmtAge = (days: number | null) => (days === null ? '—' : `${days} hari`);

const fmtRp = (n?: number) =>
  typeof n === 'number' && !Number.isNaN(n)
    ? `Rp ${n.toLocaleString('id-ID')}`
    : '—';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Antrean: apa yang harus dikerjakan, bukan sekadar status apa adanya ──────
//
// Status mentah menjawab "order ini di mana", bukan "siapa yang harus bergerak".
// APPROVED tanpa invoice dan APPROVED dengan invoice belum dibayar punya status
// yang sama persis tapi pekerjaannya di meja orang yang berbeda.
type TaskKind =
  | 'REVIEW'        // menunggu ditinjau
  | 'BILL'          // sudah disetujui, belum ditagih  ← kebocoran uang
  | 'AWAIT_PAYMENT' // invoice terbit, menunggu nasabah bayar
  | 'ISSUE';        // sudah dibayar, polis belum terbit

interface Task {
  order: SpPolicyOrder;
  kind: TaskKind;
  days: number | null;
}

const TASK_META: Record<TaskKind, { label: string; hint: string; chip: string }> = {
  REVIEW:        { label: 'Perlu ditinjau',    hint: 'Buka Antrean Polis',      chip: 'bg-ds-blue-lt text-ds-blue' },
  BILL:          { label: 'Belum ditagih',     hint: 'Terbitkan invoice',       chip: 'bg-ds-red-lt text-ds-red' },
  AWAIT_PAYMENT: { label: 'Menunggu bayar',    hint: 'Ingatkan nasabah',        chip: 'bg-ds-amber-lt text-ds-amber' },
  ISSUE:         { label: 'Polis belum terbit', hint: 'Terbitkan polis',        chip: 'bg-ds-purple-lt text-ds-purple' },
};

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  iconId: string;
}

const OpsConsoleView: React.FC = () => {
  const [orders, setOrders] = useState<SpPolicyOrder[]>([]);
  const [payments, setPayments] = useState<SpPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [o, p] = await Promise.all([getAllOrders(), getAdminPayments(500)]);
      setOrders(o);
      setPayments(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal memuat data operasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Satu order bisa punya lebih dari satu baris pembayaran (invoice kedaluwarsa
  // lalu diterbitkan ulang). Yang menentukan tahap corong adalah hasil TERBAIK
  // yang pernah dicapai order itu, bukan baris terakhir — invoice yang expired
  // setelah dibayar tidak membatalkan fakta bahwa uangnya sudah masuk.
  const payByOrder = useMemo(() => {
    const m = new Map<string, { any: boolean; paid: boolean }>();
    for (const p of payments) {
      if (!p.order_id) continue;
      const cur = m.get(p.order_id) ?? { any: false, paid: false };
      cur.any = true;
      if (p.status === 'PAID') cur.paid = true;
      m.set(p.order_id, cur);
    }
    return m;
  }, [payments]);

  // Order yang dibatalkan dikeluarkan dari corong: ia bukan kebocoran, ia
  // keputusan. Mencampurnya membuat setiap tahap terlihat bocor lebih parah
  // dari kenyataannya.
  const live = useMemo(
    () => orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'REJECTED'),
    [orders],
  );

  const funnel = useMemo<FunnelStage[]>(() => {
    const invoiced = live.filter(o => payByOrder.get(o.id)?.any).length;
    const paid = live.filter(o => payByOrder.get(o.id)?.paid).length;
    const issued = live.filter(o => o.status === 'ISSUED').length;
    return [
      { key: 'created',  label: 'Order dibuat',   count: live.length, iconId: 'policy_orders' },
      { key: 'invoiced', label: 'Invoice terbit', count: invoiced,    iconId: 'documents' },
      { key: 'paid',     label: 'Dibayar',        count: paid,        iconId: 'payments' },
      { key: 'issued',   label: 'Polis terbit',   count: issued,      iconId: 'policy' },
    ];
  }, [live, payByOrder]);

  const tasks = useMemo<Task[]>(() => {
    const out: Task[] = [];
    for (const o of live) {
      const pay = payByOrder.get(o.id);
      let kind: TaskKind | null = null;

      if (o.status === 'SUBMITTED' || o.status === 'UNDER_REVIEW') kind = 'REVIEW';
      else if (o.status === 'APPROVED' && !pay?.any) kind = 'BILL';
      else if (o.status === 'APPROVED' && pay?.any && !pay.paid) kind = 'AWAIT_PAYMENT';
      else if (pay?.paid && o.status !== 'ISSUED') kind = 'ISSUE';

      if (kind) out.push({ order: o, kind, days: ageInDays(o.created_at) });
    }
    // Paling tua di atas. Baris tanpa tanggal ditaruh paling bawah — tidak
    // diketahui umurnya bukan berarti mendesak.
    return out.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
  }, [live, payByOrder]);

  const stale = useMemo(
    () => tasks.filter(t => t.days !== null && t.days >= STALE_DAYS),
    [tasks],
  );

  const uang = useMemo(
    () => tasks
      .filter(t => t.kind === 'BILL')
      .reduce((s, t) => s + (t.order.total_premium ?? 0), 0),
    [tasks],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-ds-ink3">
        <Loader2 className="animate-spin mr-2" size={18} /> Memuat konsol operasi…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-ds-ink">Konsol Operasi</h2>
          <p className="text-ds-sm text-ds-ink3 mt-1">
            Apa yang perlu dikerjakan hari ini, dan di tahap mana uang berhenti mengalir.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ds-card2 border border-ds-border text-ds-sm text-ds-ink2 hover:text-ds-ink transition-colors"
        >
          <RefreshCw size={14} /> Muat ulang
        </button>
      </div>

      {err && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-ds-red-lt border border-ds-red/30">
          <AlertTriangle size={18} className="text-ds-red shrink-0 mt-0.5" />
          <div className="text-ds-sm text-ds-red">{err}</div>
        </div>
      )}

      {/* ── Corong ──────────────────────────────────────────────────────────
          Angka yang jatuh di antara dua tahap adalah uang yang hilang. Selisih
          ditampilkan DI ANTARA tahap, bukan sebagai kolom terpisah, supaya
          kebocorannya terbaca sebagai bagian dari alur — bukan sebagai statistik
          yang harus dicari sendiri. */}
      <section className="bg-ds-card border border-ds-border rounded-2xl p-5">
        <h3 className="font-semibold text-ds-ink mb-1">Corong</h3>
        <p className="text-ds-sm text-ds-ink3 mb-5">
          Order dibuat → invoice terbit → dibayar → polis terbit.
        </p>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {funnel.map((s, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            const drop = prev === null ? 0 : prev - s.count;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <div className="flex flex-col items-center justify-center px-1 shrink-0">
                    <ArrowRight size={16} className="text-ds-ink3" />
                    {drop > 0 && (
                      <span className="text-[11px] font-semibold text-ds-red whitespace-nowrap mt-1">
                        −{drop}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-[130px] bg-ds-card2 border border-ds-border rounded-xl p-4">
                  <ModuleIcon id={s.iconId} size={30} className="mb-2" />
                  <div className="text-2xl font-bold text-ds-ink tabular-nums">{s.count}</div>
                  <div className="text-ds-sm text-ds-ink3 mt-0.5">{s.label}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {funnel[0].count > 0 && funnel[1].count === 0 && (
          <div className="flex items-start gap-3 mt-5 p-4 rounded-xl bg-ds-red-lt border border-ds-red/30">
            <AlertTriangle size={18} className="text-ds-red shrink-0 mt-0.5" />
            <div className="text-ds-sm text-ds-red">
              <strong>{funnel[0].count} order, nol invoice.</strong> Tidak ada satu pun
              tagihan pernah terbentuk, jadi tidak ada uang yang bisa masuk. Ini
              menghentikan pendapatan sepenuhnya, bukan memperlambatnya.
            </div>
          </div>
        )}
      </section>

      {/* ── Antrean bertindak ───────────────────────────────────────────────── */}
      <section className="bg-ds-card border border-ds-border rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-semibold text-ds-ink">Antrean bertindak</h3>
          <span className="text-ds-sm text-ds-ink3">
            {tasks.length} pekerjaan
            {stale.length > 0 && (
              <> · <span className="text-ds-red font-medium">{stale.length} lewat {STALE_DAYS} hari</span></>
            )}
          </span>
        </div>
        <p className="text-ds-sm text-ds-ink3 mb-4">
          Diurutkan berdasarkan umur — yang paling lama terlantar di atas.
          {uang > 0 && (
            <> Nilai yang menunggu ditagih: <strong className="text-ds-ink2">{fmtRp(uang)}</strong>.</>
          )}
        </p>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox size={28} className="text-ds-ink3 mb-3" />
            <p className="text-ds-ink2 font-medium">Tidak ada yang menunggu</p>
            <p className="text-ds-sm text-ds-ink3 mt-1 max-w-sm">
              Semua order sudah bergerak ke tahap akhir. Kalau Anda menduga ini keliru,
              muat ulang — layar ini membaca 500 order terakhir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-ds-sm border-collapse">
              <thead>
                <tr className="text-left text-ds-ink3 border-b border-ds-border">
                  <th className="py-2 pr-4 font-medium whitespace-nowrap">Umur</th>
                  <th className="py-2 pr-4 font-medium whitespace-nowrap">Tindakan</th>
                  <th className="py-2 pr-4 font-medium whitespace-nowrap">Order</th>
                  <th className="py-2 pr-4 font-medium">Nasabah</th>
                  <th className="py-2 pr-4 font-medium whitespace-nowrap">Premi</th>
                  <th className="py-2 pr-4 font-medium whitespace-nowrap">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const meta = TASK_META[t.kind];
                  return (
                    <tr key={t.order.id} className="border-b border-ds-border/60 last:border-0">
                      <td className={`py-2.5 pr-4 whitespace-nowrap tabular-nums ${ageTone(t.days)}`}>
                        {fmtAge(t.days)}
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${meta.chip}`}>
                          {meta.label}
                        </span>
                        <span className="block text-[11px] text-ds-ink3 mt-0.5">{meta.hint}</span>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-ds-ink2 font-mono text-[12px]">
                        {t.order.order_number ?? t.order.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 pr-4 text-ds-ink2">
                        {t.order.client_name || '—'}
                        <span className="block text-[11px] text-ds-ink3">{t.order.product_name}</span>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-ds-ink2 tabular-nums">
                        {fmtRp(t.order.total_premium)}
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-ds-ink3">
                        {fmtDate(t.order.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default OpsConsoleView;
