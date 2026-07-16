// EQuotationPage.tsx — public e-quotation page behind the QR code on every
// quotation slip PDF (route: /q/:code, no auth).
//
// Shows the quotation summary, premium breakdown, coverage, subjectivity &
// terms, agent contact, and lets the customer (1) confirm intent to proceed
// and (2) see payment instructions. Confirmation here is an intent signal —
// binding acceptance always remains with the insurer.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, CheckCircle2, Clock, AlertTriangle, Phone, MessageCircle,
  FileText, Landmark, ChevronDown, BadgeCheck, XCircle, Loader2,
} from 'lucide-react';
import { getPublicQuotation, confirmPublicQuotation, type PublicQuotation } from '../../services/quotationService';

interface Props {
  code: string;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: React.FC<any> }> = {
  SENT:      { label: 'Menunggu Konfirmasi', cls: 'bg-amber-100 text-amber-700',     icon: Clock },
  VIEWED:    { label: 'Menunggu Konfirmasi', cls: 'bg-amber-100 text-amber-700',     icon: Clock },
  CONFIRMED: { label: 'Terkonfirmasi',       cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  PAID:      { label: 'Sudah Dibayar',       cls: 'bg-emerald-100 text-emerald-700', icon: BadgeCheck },
  EXPIRED:   { label: 'Kedaluwarsa',         cls: 'bg-red-100 text-red-600',         icon: XCircle },
  WITHDRAWN: { label: 'Ditarik',             cls: 'bg-gray-100 text-gray-500',       icon: XCircle },
};

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-emerald-900/10 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="text-sm font-bold text-emerald-950">{title}</span>
        <ChevronDown size={16} className={`text-emerald-700 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

const EQuotationPage: React.FC<Props> = ({ code }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState<PublicQuotation | null>(null);

  const [confirmName, setConfirmName] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    let alive = true;
    getPublicQuotation(code).then(({ data, error }) => {
      if (!alive) return;
      if (error || !data) setError(error ?? 'Quotation tidak ditemukan');
      else { setQ(data); setConfirmName(data.customer_name ?? ''); }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [code]);

  const p = q?.payload ?? {};
  const isConfirmed = q?.status === 'CONFIRMED' || q?.status === 'PAID' || justConfirmed;
  const isExpired = q?.status === 'EXPIRED';
  const waNumber = (q?.agent_phone ?? '').replace(/[^0-9]/g, '').replace(/^0/, '62');
  const waLink = useMemo(() => {
    const text = encodeURIComponent(`Halo, saya ingin konfirmasi penawaran asuransi ${q?.quotation_number ?? ''} (${q?.customer_name ?? ''}).`);
    return waNumber ? `https://wa.me/${waNumber}?text=${text}` : `https://wa.me/?text=${text}`;
  }, [waNumber, q]);

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirmErr(null);
    if (!confirmName.trim()) { setConfirmErr('Nama wajib diisi.'); return; }
    setConfirming(true);
    const { data, error } = await confirmPublicQuotation(code, confirmName.trim(), confirmPhone.trim());
    setConfirming(false);
    if (error || !data?.ok) setConfirmErr(error ?? 'Gagal mengirim konfirmasi. Coba lagi.');
    else setJustConfirmed(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E2A1C] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (error || !q) {
    return (
      <div className="min-h-screen bg-[#0E2A1C] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <img src="/logo-full.png" alt="SurePath" className="h-10 mx-auto" />
          <AlertTriangle className="mx-auto text-amber-500" size={36} />
          <h1 className="text-lg font-bold text-emerald-950">Quotation tidak ditemukan</h1>
          <p className="text-sm text-gray-500">
            Tautan e-quotation ini tidak tersedia atau sudah tidak berlaku.
            Silakan hubungi agen Anda atau tim SurePath untuk penawaran terbaru.
          </p>
          <a href="https://wa.me/?text=Halo%20SurePath%2C%20saya%20butuh%20bantuan%20dengan%20quotation%20saya."
             className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
            <MessageCircle size={16} /> Hubungi Kami
          </a>
          <p className="text-[11px] text-gray-400">halo@myinsurepath.com · myinsurepath.com</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[justConfirmed ? 'CONFIRMED' : q.status] ?? STATUS_META.SENT;
  const StatusIcon = meta.icon;

  return (
    <div className="min-h-screen bg-[#F3FAF5]">
      {/* ── Dark hero header ─────────────────────────────────────────────── */}
      <div className="bg-[#0E2A1C] text-white">
        <div className="max-w-2xl mx-auto px-5 pt-8 pb-16">
          <div className="flex items-center justify-between">
            <img src="/logo-full.png" alt="SurePath" className="h-9 bg-white rounded-lg px-2 py-1" />
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ${meta.cls}`}>
              <StatusIcon size={12} /> {meta.label}
            </span>
          </div>
          <p className="mt-8 text-emerald-400 text-[11px] font-bold tracking-widest">// E-QUOTATION</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight">
            Penawaran Asuransi <span className="text-emerald-400">untuk {q.customer_name ?? 'Anda'}.</span>
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70">
            {p.productName ?? q.product_name ?? 'Produk Asuransi'} · {q.insurer_name ?? p.insurer}
          </p>
          <p className="mt-3 font-mono text-xs text-emerald-300">{q.quotation_number}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-8 pb-16 space-y-4">
        {/* ── Summary card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg shadow-emerald-900/5 border border-emerald-900/10 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-wide">DISIAPKAN UNTUK</p>
              <p className="font-bold text-emerald-950">{q.customer_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-wide">PENANGGUNG</p>
              <p className="font-bold text-emerald-950">{q.insurer_name ?? p.insurerShort ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-wide">PERIODE</p>
              <p className="font-semibold text-emerald-950 text-xs">{p.periodStart ?? '-'} — {p.periodEnd ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-wide">BERLAKU SAMPAI</p>
              <p className="font-semibold text-emerald-950 text-xs">{q.valid_until ?? '30 hari sejak penerbitan'}</p>
            </div>
            {p.objectSummary && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-gray-400 tracking-wide">OBJEK PERTANGGUNGAN</p>
                <p className="font-semibold text-emerald-950 text-xs">{p.objectSummary}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-dashed border-emerald-900/10 flex items-end justify-between">
            <p className="text-[10px] font-bold text-gray-400 tracking-wide">TOTAL PREMI</p>
            <p className="text-xl font-extrabold text-emerald-700">
              {p.currency ?? 'IDR'} {p.totalPremium ?? (q.total_premium != null ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(q.total_premium) : '-')}
            </p>
          </div>
        </div>

        {/* ── Expired banner ───────────────────────────────────────────── */}
        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-sm text-red-700">
            <XCircle size={18} className="shrink-0 mt-0.5" />
            <p>Penawaran ini sudah kedaluwarsa. Hubungi agen Anda atau tim SurePath untuk penawaran terbaru.</p>
          </div>
        )}

        {/* ── Confirm / confirmed card ─────────────────────────────────── */}
        {!isExpired && (
          isConfirmed ? (
            <div className="bg-emerald-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} />
                <div>
                  <p className="font-bold">Konfirmasi diterima!</p>
                  <p className="text-xs text-emerald-100">
                    Tim SurePath{q.agent_name ? ` / agen Anda (${q.agent_name})` : ''} akan segera menghubungi Anda
                    untuk kelengkapan data dan pembayaran. Penerbitan polis tetap menunggu akseptasi Penanggung.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-emerald-900/10 p-5 space-y-3">
              <p className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Konfirmasi Penawaran Ini
              </p>
              <p className="text-xs text-gray-500">
                Isi nama & nomor HP Anda lalu tekan tombol di bawah — kami akan memproses penutupan Anda.
              </p>
              <input
                value={confirmName} onChange={e => setConfirmName(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full border border-emerald-900/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                value={confirmPhone} onChange={e => setConfirmPhone(e.target.value)}
                placeholder="Nomor HP / WhatsApp" inputMode="tel"
                className="w-full border border-emerald-900/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {confirmErr && <p className="text-xs text-red-600">{confirmErr}</p>}
              <button
                onClick={handleConfirm} disabled={confirming}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Konfirmasi & Lanjutkan Penutupan
              </button>
              <p className="text-[10px] text-gray-400 text-center">
                Konfirmasi ini adalah pernyataan minat, bukan penerbitan polis. Akseptasi tetap oleh Penanggung.
              </p>
            </div>
          )
        )}

        {/* ── Payment info ─────────────────────────────────────────────── */}
        {!isExpired && (
          <div className="bg-[#0E2A1C] rounded-2xl p-5 text-white">
            <p className="text-[11px] font-bold text-emerald-400 tracking-widest flex items-center gap-2">
              <Landmark size={13} /> PEMBAYARAN — TRANSFER KE
            </p>
            <p className="mt-2 text-lg font-extrabold">{p.bankName ?? 'BANK BCA'}</p>
            <p className="font-mono text-xl text-emerald-300 tracking-wider">{p.bankAccount ?? '5730 - 807 - 807'}</p>
            <p className="text-xs text-emerald-100/70">a.n. {p.bankAccountName ?? 'PT. Ruang Proteksi Indonesia'}</p>
            {p.transferMemo && (
              <p className="mt-3 text-[11px] text-emerald-100/60">
                Berita transfer: <span className="font-mono text-emerald-200">{p.transferMemo}</span>
              </p>
            )}
            <p className="mt-2 text-[10px] text-emerald-100/50">
              Setelah transfer, kirim bukti pembayaran ke agen Anda atau tim SurePath untuk verifikasi.
            </p>
          </div>
        )}

        {/* ── Agent contact ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-emerald-900/10 p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-wide">BUTUH BANTUAN? HUBUNGI</p>
            <p className="font-bold text-emerald-950">{q.agent_name ?? 'Tim SurePath'}</p>
            <p className="text-xs text-gray-500">{q.agent_name ? 'Agen Resmi SurePath' : 'PT. Ruang Proteksi Indonesia'}{q.agent_phone ? ` · ${q.agent_phone}` : ''}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {q.agent_phone && (
              <a href={`tel:${q.agent_phone}`} className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Phone size={16} />
              </a>
            )}
            <a href={waLink} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-emerald-600 text-white">
              <MessageCircle size={16} />
            </a>
          </div>
        </div>

        {/* ── Details sections ─────────────────────────────────────────── */}
        {Array.isArray(p.premiumComponents) && p.premiumComponents.length > 0 && (
          <Section title="Rincian Premi" defaultOpen>
            <div className="space-y-1.5 text-xs">
              {p.premiumComponents.map((c: any, i: number) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-gray-600">{c.component}</span>
                  <span className="font-mono font-semibold text-emerald-950">{c.premium}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 pt-1.5 border-t border-dashed border-emerald-900/10">
                <span className="text-gray-600">{p.discountLabel ?? 'Diskon'}</span>
                <span className="font-mono font-semibold text-emerald-700">{p.discountAmount}</span>
              </div>
              <div className="flex justify-between gap-3"><span className="text-gray-600">Biaya Polis</span><span className="font-mono font-semibold text-emerald-950">{p.policyFee}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-600">Biaya Materai</span><span className="font-mono font-semibold text-emerald-950">{p.stampDuty}</span></div>
              <div className="flex justify-between gap-3 pt-1.5 border-t border-emerald-900/20 text-sm">
                <span className="font-bold text-emerald-950">TOTAL</span>
                <span className="font-mono font-extrabold text-emerald-700">{p.currency ?? 'IDR'} {p.totalPremium}</span>
              </div>
            </div>
          </Section>
        )}

        {(p.coverageCondition || p.additionalCoverage) && (
          <Section title="Luas Jaminan & Kondisi">
            <div className="space-y-3 text-xs text-gray-600">
              {p.coverageCondition && <p><span className="font-bold text-emerald-950">Kondisi: </span>{p.coverageCondition}</p>}
              {p.additionalCoverage && <p><span className="font-bold text-emerald-950">Jaminan tambahan: </span>{p.additionalCoverage}</p>}
              {p.deductible && <p><span className="font-bold text-emerald-950">Risiko sendiri: </span>{p.deductible}</p>}
              {Array.isArray(p.klausulList) && p.klausulList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.klausulList.map((k: string, i: number) => (
                    <span key={i} className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">{k}</span>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {Array.isArray(p.subjectivityList) && p.subjectivityList.length > 0 && (
          <Section title="Subjectivity — Syarat Penutupan">
            <ol className="list-decimal list-outside pl-4 space-y-1.5 text-xs text-gray-600">
              {p.subjectivityList.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ol>
          </Section>
        )}

        {Array.isArray(p.termsList) && p.termsList.length > 0 && (
          <Section title="Syarat & Ketentuan">
            <ol className="list-decimal list-outside pl-4 space-y-1.5 text-xs text-gray-600">
              {p.termsList.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ol>
          </Section>
        )}

        {/* ── Disclaimer ───────────────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            Dokumen dan halaman ini adalah <b>penawaran (quotation), bukan surat konfirmasi penutupan asuransi</b>.
            Seluruh konfirmasi, akseptasi, dan penerbitan polis merupakan kewenangan penuh perusahaan asuransi
            (Penanggung). Premi bersifat indikatif hingga dikonfirmasi tertulis oleh Penanggung.
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-400 pt-2">
          SurePath · PT. Ruang Proteksi Indonesia · <a href="https://myinsurepath.com" className="text-emerald-600">myinsurepath.com</a><br />
          Bekerja sama dengan perusahaan asuransi berizin & diawasi OJK
        </p>
      </div>
    </div>
  );
};

export default EQuotationPage;
