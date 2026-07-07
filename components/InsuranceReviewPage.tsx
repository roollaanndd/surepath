import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Download, Shield, Car, User,
  FileText, AlertTriangle, Clock, ExternalLink
} from 'lucide-react';
import {
  getOrderByToken, submitInsurerReview,
  type SpPolicyOrder, type SpReviewToken,
} from '../services/supabaseService';
import { formatIDR } from './car-wizard/WizardUI';

interface Props {
  token: string;
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(order: SpPolicyOrder) {
  const v = order.vehicle_details ?? {};
  const rows: [string, string][] = [
    ['=== DATA NASABAH ===', ''],
    ['Nama Lengkap', order.client_name ?? ''],
    ['Nomor Telepon', order.client_phone ?? ''],
    ['Nomor KTP', order.client_ktp ?? ''],
    ['', ''],
    ['=== DATA KENDARAAN ===', ''],
    ['Jenis Kendaraan', order.vehicle_type === 'MOTORCYCLE' ? 'Roda 2 (Motor)' : 'Roda 4 (Mobil)'],
    ['Merk', v.make ?? ''],
    ['Model', v.model ?? ''],
    ['Tahun', v.year ?? ''],
    ['Warna', v.color ?? ''],
    ['Plat Nomor', v.plate ?? ''],
    ['No. Rangka', v.chassis ?? ''],
    ['No. Mesin', v.engine ?? ''],
    ['Penggunaan', v.usage ?? ''],
    ['Provinsi', v.province ?? ''],
    ['Zona', order.zone ?? ''],
    ['', ''],
    ['=== DATA POLIS ===', ''],
    ['No. Order', order.order_number ?? ''],
    ['Produk', order.product_name ?? ''],
    ['Jenis Pertanggungan', order.coverage_type ?? ''],
    ['Harga Pertanggungan', order.sum_insured ? `Rp ${order.sum_insured.toLocaleString('id-ID')}` : ''],
    ['Total Premi', order.total_premium ? `Rp ${order.total_premium.toLocaleString('id-ID')}` : ''],
    ['Status', order.status ?? ''],
    ['Tanggal Order', order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : ''],
    ['', ''],
    ['=== AI SURVEY ===', ''],
    ['Skor AI', order.ai_score?.toString() ?? '-'],
    ['Verdict AI', order.ai_verdict ?? '-'],
  ];

  const csv = rows.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SurePath_Order_${order.order_number ?? order.id}_Data.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Components ─────────────────────────────────────────────────────────────────

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/5 rounded-2xl p-3">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
    <p className="text-sm font-bold text-white break-all">{value || '—'}</p>
  </div>
);

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} className="text-violet-400" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
    </div>
    {children}
  </div>
);

// ── Main ───────────────────────────────────────────────────────────────────────

const InsuranceReviewPage: React.FC<Props> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SpPolicyOrder | null>(null);
  const [tokenRecord, setTokenRecord] = useState<SpReviewToken | null>(null);
  const [error, setError] = useState<'expired' | 'not_found' | null>(null);
  const [action, setAction] = useState<'APPROVED' | 'REQUEST_INFO' | 'DECLINED' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getOrderByToken(token).then(result => {
      if (!result) {
        setError('not_found');
      } else {
        setOrder(result.order);
        setTokenRecord(result.tokenRecord);
        if (result.tokenRecord.insurer_action) {
          setDone(true);
          setAction(result.tokenRecord.insurer_action as 'APPROVED' | 'REQUEST_INFO' | 'DECLINED');
        }
      }
      setLoading(false);
    });
  }, [token]);

  const handleSubmit = async () => {
    if (!action || !tokenRecord || !order) return;
    if ((action === 'REQUEST_INFO' || action === 'DECLINED') && notes.trim().length < 5) {
      alert('Catatan wajib diisi (minimal 5 karakter) untuk Request Info dan Decline.');
      return;
    }
    setSubmitting(true);
    const ok = await submitInsurerReview(tokenRecord.id, order.id, action, notes);
    if (ok) {
      setDone(true);
    } else {
      alert('Gagal mengirim keputusan. Coba lagi.');
    }
    setSubmitting(false);
  };

  const daysLeft = tokenRecord
    ? Math.max(0, Math.ceil((new Date(tokenRecord.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Memverifikasi Link…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-rose-500/10 rounded-[2rem] flex items-center justify-center">
            <AlertTriangle size={36} className="text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Link Tidak Valid</h2>
            <p className="text-sm text-slate-400 mt-2">
              Link ini sudah kadaluarsa atau tidak ditemukan. Hubungi tim SurePath untuk link baru.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const v = order.vehicle_details ?? {};

  // ── Done state ────────────────────────────────────────────────────────────

  if (done) {
    const isApproved = action === 'APPROVED';
    const isRequestInfo = action === 'REQUEST_INFO';
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center ${
            isApproved ? 'bg-emerald-500/10'
            : isRequestInfo ? 'bg-amber-500/10'
            : 'bg-rose-500/10'
          }`}>
            {isApproved
              ? <CheckCircle size={36} className="text-emerald-400" />
              : isRequestInfo
              ? <AlertTriangle size={36} className="text-amber-400" />
              : <XCircle size={36} className="text-rose-400" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              {isApproved ? 'Pengajuan Disetujui'
              : isRequestInfo ? 'Permintaan Info Terkirim'
              : 'Pengajuan Ditolak'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {isRequestInfo
                ? 'Permintaan informasi tambahan telah dikirim ke nasabah dan tim SurePath. Mereka akan melengkapi data yang dibutuhkan.'
                : `Keputusan Anda telah disimpan. Tim SurePath akan menindaklanjuti order ${order?.order_number}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main review page ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Ambient */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <Shield size={16} className="text-emerald-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400">SurePath · Portal Tinjauan</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{order.order_number ?? '—'}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{order.product_name}</p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full">
              <Clock size={9} /> {daysLeft}h tersisa
            </span>
            <button
              onClick={() => exportCSV(order)}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
            >
              <Download size={9} /> Export CSV
            </button>
          </div>
        </div>

        {/* Client info */}
        <Section title="Informasi Nasabah" icon={User}>
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Nama Lengkap" value={order.client_name} />
            <InfoCard label="No. Telepon" value={order.client_phone ?? ''} />
            <InfoCard label="No. KTP" value={order.client_ktp ?? ''} />
          </div>
        </Section>

        {/* Vehicle info */}
        <Section title="Data Kendaraan" icon={Car}>
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Jenis" value={order.vehicle_type === 'MOTORCYCLE' ? 'Roda 2 (Motor)' : 'Roda 4 (Mobil)'} />
            <InfoCard label="Merk / Model" value={`${v.make ?? ''} ${v.model ?? ''}`.trim()} />
            <InfoCard label="Tahun" value={String(v.year ?? '')} />
            <InfoCard label="Warna" value={v.color ?? ''} />
            <InfoCard label="Plat Nomor" value={v.plate ?? ''} />
            <InfoCard label="No. Rangka" value={v.chassis ?? ''} />
            <InfoCard label="No. Mesin" value={v.engine ?? ''} />
            <InfoCard label="Penggunaan" value={v.usage ?? ''} />
            <InfoCard label="Provinsi" value={v.province ?? ''} />
            <InfoCard label="Zona OJK" value={`Zona ${order.zone}`} />
          </div>
        </Section>

        {/* Vehicle photo */}
        {order.vehicle_image_url && (
          <Section title="Foto Kendaraan" icon={FileText}>
            <div className="grid gap-3">
              <div className="relative group">
                <img
                  src={order.vehicle_image_url}
                  alt="Foto kendaraan"
                  className="w-full rounded-2xl object-cover max-h-72 border border-white/10"
                />
                <a
                  href={order.vehicle_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink size={9} /> Buka Penuh
                </a>
              </div>
            </div>
          </Section>
        )}

        {/* AI Analysis */}
        {(order.ai_score !== undefined && order.ai_score !== null) && (
          <Section title="Hasil Analisis AI" icon={Shield}>
            <div className="bg-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Skor Kondisi Kendaraan</p>
                <span className={`text-3xl font-black ${
                  order.ai_score >= 80 ? 'text-emerald-400' :
                  order.ai_score >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}>{order.ai_score}</span>
              </div>
              {order.ai_verdict && (
                <p className="text-sm font-bold text-slate-300 mb-3">{order.ai_verdict}</p>
              )}
              {Array.isArray(order.ai_findings) && order.ai_findings.length > 0 && (
                <ul className="space-y-1.5">
                  {(order.ai_findings as any[]).map((f: any, i: number) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-violet-400 font-black">•</span>
                      {f.description ?? String(f)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        )}

        {/* Premium breakdown */}
        <Section title="Rincian Premi" icon={FileText}>
          <div className="bg-white/5 rounded-2xl p-4 space-y-2">
            {[
              ['Jenis Pertanggungan', order.coverage_type],
              ['Harga Pertanggungan', formatIDR(order.sum_insured)],
              ['OJK Rate', order.ojk_rate ? `${(order.ojk_rate * 100).toFixed(2)}%` : '-'],
              ['Premi Dasar', formatIDR(order.base_premium)],
              ['Premi Add-on', formatIDR(order.addon_premium)],
              ['Biaya Admin', formatIDR(order.admin_fee)],
              ['Bea Materai', formatIDR(order.stamp_duty)],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-400">{k}</span>
                <span className="font-bold">{val}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">Total Premi</span>
              <span className="font-black text-emerald-400">{formatIDR(order.total_premium)}</span>
            </div>
          </div>
        </Section>

        {/* Decision form */}
        {(order.status === 'SUBMITTED' || order.status === 'UNDER_REVIEW') && (
          <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 space-y-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keputusan Anda</p>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setAction('APPROVED')}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  action === 'APPROVED'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                }`}
              >
                <CheckCircle size={16} className="mx-auto mb-1" />
                Setujui
              </button>
              <button
                onClick={() => setAction('REQUEST_INFO')}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  action === 'REQUEST_INFO'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white/5 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400'
                }`}
              >
                <AlertTriangle size={16} className="mx-auto mb-1" />
                Info
              </button>
              <button
                onClick={() => setAction('DECLINED')}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  action === 'DECLINED'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400'
                }`}
              >
                <XCircle size={16} className="mx-auto mb-1" />
                Tolak
              </button>
            </div>

            {action && (
              <div className="space-y-3 animate-fade-in">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Catatan {(action === 'REQUEST_INFO' || action === 'DECLINED') ? '(wajib diisi — min 5 karakter)' : '(opsional)'}
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder={
                    action === 'APPROVED'
                      ? 'Catatan persetujuan (opsional)…'
                      : action === 'REQUEST_INFO'
                      ? 'Contoh: Foto STNK kurang jelas, mohon kirim ulang dengan resolusi lebih tinggi…'
                      : 'Alasan penolakan (wajib)…'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none transition-colors"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                    action === 'APPROVED'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : action === 'REQUEST_INFO'
                      ? 'bg-amber-500 hover:bg-amber-400 text-white'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  } disabled:opacity-50`}
                >
                  {submitting ? 'Mengirim…' : `Konfirmasi ${
                    action === 'APPROVED' ? 'Persetujuan'
                    : action === 'REQUEST_INFO' ? 'Permintaan Info'
                    : 'Penolakan'
                  }`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-widest pb-4">
          PT Ruang Proteksi Indonesia · Link ini bersifat rahasia dan hanya untuk digunakan oleh pihak penanggung
        </p>
      </div>
    </div>
  );
};

export default InsuranceReviewPage;
