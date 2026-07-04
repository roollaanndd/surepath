import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Download,
  Car, User, FileText, ChevronRight, ChevronLeft, RefreshCw,
  Upload, X, Clock, LayoutGrid, Loader2, ExternalLink,
} from 'lucide-react';
import {
  validateInsurerAuthToken, getInsurerOrders, updateOrderStatus,
  uploadPolicyDocument, supabase,
  type SpInsurer, type SpPolicyOrder,
} from '../services/supabaseService';
import { formatIDR } from './car-wizard/WizardUI';
import jsPDF from 'jspdf';
import { SecureDocLink } from './shared/SecureDoc';

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function downloadCSV(rows: [string, string][], filename: string) {
  const csv = rows.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCustomerCSV(o: SpPolicyOrder) {
  downloadCSV([
    ['Nama Lengkap', o.client_name ?? ''],
    ['No. Telepon', o.client_phone ?? ''],
    ['No. KTP', o.client_ktp ?? ''],
  ], `SurePath_Nasabah_${o.order_number ?? o.id}.csv`);
}

function exportVehicleCSV(o: SpPolicyOrder) {
  const v = o.vehicle_details ?? {};
  downloadCSV([
    ['Jenis', o.vehicle_type === 'MOTORCYCLE' ? 'Roda 2 (Motor)' : 'Roda 4 (Mobil)'],
    ['Merk', v.make ?? ''], ['Model', v.model ?? ''], ['Tahun', String(v.year ?? '')],
    ['Warna', v.color ?? ''], ['Plat Nomor', v.plate ?? ''],
    ['No. Rangka', v.chassis ?? ''], ['No. Mesin', v.engine ?? ''],
    ['Penggunaan', v.usage ?? ''], ['Provinsi', v.province ?? ''],
    ['Zona OJK', String(o.zone ?? '')],
    ['No. Order', o.order_number ?? ''],
    ['Produk', o.product_name ?? ''],
    ['Jenis Pertanggungan', o.coverage_type ?? ''],
    ['Nilai Pertanggungan', o.sum_insured ? `Rp ${o.sum_insured.toLocaleString('id-ID')}` : ''],
    ['Total Premi', o.total_premium ? `Rp ${o.total_premium.toLocaleString('id-ID')}` : ''],
  ], `SurePath_Kendaraan_${o.order_number ?? o.id}.csv`);
}

function generateSurveyPDF(o: SpPolicyOrder) {
  const v = o.vehicle_details ?? {};
  const doc = new jsPDF();
  const fmtRp = (n?: number) => n ? `Rp ${n.toLocaleString('id-ID')}` : '-';

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('SurePath — Laporan Survei Kendaraan', 14, 20);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`No. Order: ${o.order_number ?? '-'}   |   Tanggal: ${o.created_at ? new Date(o.created_at).toLocaleDateString('id-ID') : '-'}`, 14, 28);

  let y = 40;
  const section = (title: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(title, 14, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  };
  const row = (label: string, val: string) => {
    doc.text(`${label}:`, 14, y); doc.text(val || '-', 80, y); y += 6;
  };

  section('Data Nasabah');
  row('Nama', o.client_name ?? ''); row('No. KTP', o.client_ktp ?? ''); row('No. Telepon', o.client_phone ?? '');

  y += 4; section('Data Kendaraan');
  row('Jenis', o.vehicle_type === 'MOTORCYCLE' ? 'Roda 2 (Motor)' : 'Roda 4 (Mobil)');
  row('Merk / Model', `${v.make ?? ''} ${v.model ?? ''}`.trim());
  row('Tahun', String(v.year ?? '')); row('Warna', v.color ?? '');
  row('Plat Nomor', v.plate ?? ''); row('No. Rangka', v.chassis ?? '');
  row('No. Mesin', v.engine ?? ''); row('Penggunaan', v.usage ?? '');
  row('Provinsi', v.province ?? ''); row('Zona OJK', String(o.zone ?? ''));

  y += 4; section('Data Polis');
  row('Produk', o.product_name ?? ''); row('Pertanggungan', o.coverage_type ?? '');
  row('Nilai Pertanggungan', fmtRp(o.sum_insured)); row('Total Premi', fmtRp(o.total_premium));
  row('Periode', `${o.start_date ? new Date(o.start_date).toLocaleDateString('id-ID') : '-'} – ${o.end_date ? new Date(o.end_date).toLocaleDateString('id-ID') : '-'}`);

  if (o.ai_score !== undefined && o.ai_score !== null) {
    y += 4; section('Hasil Analisis AI');
    row('Skor Kendaraan', `${o.ai_score} / 100`);
    if (o.ai_verdict) row('Verdict', o.ai_verdict);
  }

  doc.save(`SurePath_Survei_${o.order_number ?? o.id}.pdf`);
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Diajukan', UNDER_REVIEW: 'Review', APPROVED: 'Disetujui',
  ISSUED: 'Terbit', REJECTED: 'Ditolak',
};
const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/15 text-amber-400',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  ISSUED: 'bg-violet-500/15 text-violet-400',
  REJECTED: 'bg-rose-500/15 text-rose-400',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const Chip: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = 'text-white' }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
    <span className={`text-2xl font-black ${accent}`}>{value}</span>
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-baseline gap-2 py-2 border-b border-white/5 last:border-0">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0">{label}</span>
    <span className="text-xs font-bold text-white text-right break-all">{value || '—'}</span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const InsurerPortal: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [phase, setPhase] = useState<'loading' | 'invalid' | 'portal'>('loading');
  const [insurer, setInsurer] = useState<SpInsurer | null>(null);
  const [orders, setOrders] = useState<SpPolicyOrder[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<SpPolicyOrder | null>(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { setPhase('invalid'); return; }
    validateInsurerAuthToken(token).then(ins => {
      if (!ins) { setPhase('invalid'); return; }
      setInsurer(ins);
      return getInsurerOrders(ins.id);
    }).then(list => {
      if (list) { setOrders(list); setPhase('portal'); }
    }).catch(() => setPhase('invalid'));
  }, [token]);

  const refresh = async () => {
    if (!insurer) return;
    setRefreshing(true);
    const list = await getInsurerOrders(insurer.id);
    setOrders(list);
    if (selected) {
      const updated = list.find(o => o.id === selected.id);
      if (updated) setSelected(updated);
    }
    setRefreshing(false);
  };

  const submitReview = async (action: 'APPROVED' | 'REJECTED') => {
    if (!selected) return;
    if (action === 'REJECTED' && !note.trim()) {
      alert('Catatan wajib diisi untuk penolakan.');
      return;
    }
    setActionLoading(true);
    const ok = await updateOrderStatus(selected.id, action, { reviewer_notes: note });
    if (ok) {
      const label = action === 'APPROVED' ? 'disetujui' : 'ditolak';
      const { data: ord } = await supabase.from('sp_policy_orders')
        .select('agent_id, order_number, client_name').eq('id', selected.id).maybeSingle();
      if (ord?.agent_id) {
        await supabase.from('sp_notifications').insert({
          agent_id: ord.agent_id, type: `POLICY_${action}`,
          title: `Polis ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'}: ${ord.order_number}`,
          body: `Pengajuan ${ord.client_name} (${ord.order_number}) telah ${label}.${note ? ` Catatan: ${note}` : ''}`,
        });
      }
      await supabase.from('sp_admin_notifications').insert({
        type: `POLICY_${action}`,
        title: `[Portal] Polis ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'}: ${ord?.order_number}`,
        body: `${insurer?.name} ${label} pengajuan ${ord?.client_name ?? ''}.`,
      });
      await refresh();
      setNote('');
    } else {
      alert('Gagal mengirim keputusan. Coba lagi.');
    }
    setActionLoading(false);
  };

  const uploadPolicy = async () => {
    if (!selected || !policyFile) return;
    setUploadLoading(true);
    const url = await uploadPolicyDocument(policyFile, selected.order_number ?? selected.id);
    if (url) {
      await updateOrderStatus(selected.id, 'ISSUED', { policy_document_url: url });
      await refresh();
      setPolicyFile(null);
    } else {
      alert('Gagal upload dokumen.');
    }
    setUploadLoading(false);
  };

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Memverifikasi Akses…</p>
      </div>
    </div>
  );

  // ── Invalid ──────────────────────────────────────────────────────────────────
  if (phase === 'invalid') return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-rose-500/10 rounded-[2rem] flex items-center justify-center">
          <AlertTriangle size={36} className="text-rose-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Link Tidak Valid</h2>
          <p className="text-sm text-slate-400 mt-2">Link ini sudah kadaluarsa, sudah digunakan, atau tidak ditemukan.<br/>Minta link baru ke tim SurePath.</p>
        </div>
      </div>
    </div>
  );

  // ── Order Detail Panel ────────────────────────────────────────────────────────
  if (selected) {
    const v = selected.vehicle_details ?? {};
    const canAct = selected.status === 'SUBMITTED' || selected.status === 'UNDER_REVIEW';
    const canUpload = selected.status === 'APPROVED' && !selected.policy_document_url;

    return (
      <div className="min-h-screen bg-[#030712] text-white">
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Back + header */}
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelected(null); setNote(''); setPolicyFile(null); }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={16} /> Kembali
            </button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-400 mb-1">SurePath · Portal Penanggung</p>
              <h1 className="text-2xl font-black tracking-tight">{selected.order_number ?? '—'}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{selected.product_name}</p>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${STATUS_COLOR[selected.status] ?? 'bg-white/10 text-white'}`}>
              {STATUS_LABEL[selected.status] ?? selected.status}
            </span>
          </div>

          {/* Downloads */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Data Nasabah', icon: User, fn: () => exportCustomerCSV(selected) },
              { label: 'Data Kendaraan', icon: Car, fn: () => exportVehicleCSV(selected) },
              { label: 'Laporan Survei', icon: FileText, fn: () => generateSurveyPDF(selected) },
            ].map(btn => (
              <button key={btn.label} onClick={btn.fn}
                className="flex flex-col items-center gap-1.5 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                <btn.icon size={16} className="text-orange-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Nasabah */}
          <div className="bg-white/5 rounded-2xl p-5 space-y-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Data Nasabah</p>
            <InfoRow label="Nama" value={selected.client_name} />
            <InfoRow label="No. KTP" value={selected.client_ktp ?? ''} />
            <InfoRow label="No. Telepon" value={selected.client_phone ?? ''} />
          </div>

          {/* Kendaraan */}
          <div className="bg-white/5 rounded-2xl p-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Data Kendaraan</p>
            <InfoRow label="Jenis" value={selected.vehicle_type === 'MOTORCYCLE' ? 'Roda 2 (Motor)' : 'Roda 4 (Mobil)'} />
            <InfoRow label="Merk / Model" value={`${v.make ?? ''} ${v.model ?? ''}`.trim()} />
            <InfoRow label="Tahun" value={String(v.year ?? '')} />
            <InfoRow label="Plat Nomor" value={v.plate ?? ''} />
            <InfoRow label="No. Rangka" value={v.chassis ?? ''} />
            <InfoRow label="No. Mesin" value={v.engine ?? ''} />
            <InfoRow label="Zona OJK" value={`Zona ${selected.zone}`} />
          </div>

          {/* Foto kendaraan */}
          {selected.vehicle_image_url && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Foto Kendaraan</p>
              <div className="relative group rounded-2xl overflow-hidden border border-white/10">
                <img src={selected.vehicle_image_url} alt="Foto kendaraan"
                  className="w-full object-cover max-h-64" />
                <a href={selected.vehicle_image_url} target="_blank" rel="noopener noreferrer"
                  className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={9} /> Buka
                </a>
              </div>
            </div>
          )}

          {/* Polis */}
          <div className="bg-white/5 rounded-2xl p-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Data Polis</p>
            <InfoRow label="Produk" value={selected.product_name} />
            <InfoRow label="Pertanggungan" value={selected.coverage_type} />
            <InfoRow label="Nilai" value={formatIDR(selected.sum_insured)} />
            <InfoRow label="Total Premi" value={formatIDR(selected.total_premium)} />
            <InfoRow label="Periode Mulai" value={selected.start_date ? new Date(selected.start_date).toLocaleDateString('id-ID') : ''} />
            <InfoRow label="Periode Akhir" value={selected.end_date ? new Date(selected.end_date).toLocaleDateString('id-ID') : ''} />
          </div>

          {/* AI */}
          {selected.ai_score != null && (
            <div className="bg-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Analisis AI</p>
                <span className={`text-2xl font-black ${selected.ai_score >= 80 ? 'text-emerald-400' : selected.ai_score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {selected.ai_score}
                </span>
              </div>
              {selected.ai_verdict && <p className="text-sm font-bold text-slate-300 mb-2">{selected.ai_verdict}</p>}
              {Array.isArray(selected.ai_findings) && selected.ai_findings.map((f: any, i: number) => (
                <p key={i} className="text-xs text-slate-400"><span className="text-orange-400 font-black">•</span> {f.description ?? String(f)}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          {canAct && (
            <div className="space-y-3 pb-8">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Keputusan</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Catatan (wajib jika ditolak)..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-orange-500/50 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => submitReview('REJECTED')} disabled={actionLoading}
                  className="py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Tolak
                </button>
                <button onClick={() => submitReview('APPROVED')} disabled={actionLoading}
                  className="py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Setujui
                </button>
              </div>
            </div>
          )}

          {/* Policy upload (APPROVED only) */}
          {canUpload && (
            <div className="space-y-3 pb-8">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Upload Polis (PDF)</p>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => setPolicyFile(e.target.files?.[0] ?? null)} />
              {policyFile ? (
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <span className="text-xs text-white font-bold truncate">{policyFile.name}</span>
                  <button onClick={() => setPolicyFile(null)} className="text-slate-500 hover:text-white ml-2"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-orange-500/40 hover:text-orange-400 transition-colors flex items-center justify-center gap-2">
                  <Upload size={14} /> Pilih File PDF
                </button>
              )}
              {policyFile && (
                <button onClick={uploadPolicy} disabled={uploadLoading}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {uploadLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload & Terbitkan Polis
                </button>
              )}
            </div>
          )}

          {/* Already uploaded */}
          {selected.policy_document_url && (
            <div className="pb-8">
              <SecureDocLink url={selected.policy_document_url}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors">
                <Download size={14} /> Unduh Dokumen Polis
              </SecureDocLink>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Portal Dashboard ──────────────────────────────────────────────────────────
  const counts = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'SUBMITTED' || o.status === 'UNDER_REVIEW').length,
    approved: orders.filter(o => o.status === 'APPROVED' || o.status === 'ISSUED').length,
    rejected: orders.filter(o => o.status === 'REJECTED').length,
  };

  const FILTERS = [
    { key: 'ALL', label: 'Semua' },
    { key: 'SUBMITTED', label: 'Diajukan' },
    { key: 'UNDER_REVIEW', label: 'Review' },
    { key: 'APPROVED', label: 'Disetujui' },
    { key: 'ISSUED', label: 'Terbit' },
    { key: 'REJECTED', label: 'Ditolak' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-orange-500/6 rounded-full blur-[130px] pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500/15 rounded-xl flex items-center justify-center">
                <Shield size={16} className="text-orange-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-400">SurePath · Portal Penanggung</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{insurer?.name}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Kode: {insurer?.code}</p>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* KPI chips */}
        <div className="grid grid-cols-4 gap-3">
          <Chip label="Total" value={counts.total} />
          <Chip label="Pending" value={counts.pending} accent="text-amber-400" />
          <Chip label="Approved" value={counts.approved} accent="text-emerald-400" />
          <Chip label="Rejected" value={counts.rejected} accent="text-rose-400" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${
                filter === f.key ? 'bg-orange-500 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 opacity-40 space-y-3">
            <LayoutGrid size={40} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada pengajuan</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {filtered.map(o => (
              <button key={o.id} onClick={() => { setSelected(o); setNote(''); }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:bg-white/8 hover:border-white/20 transition-all group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-black text-white">{o.client_name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{o.order_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${STATUS_COLOR[o.status] ?? 'bg-white/10 text-white'}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-orange-400 transition-colors" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-bold">{o.product_name}</span>
                  <span className="text-sm font-black text-orange-400">{formatIDR(o.total_premium)}</span>
                </div>
                <p className="text-[9px] text-slate-600 mt-1 flex items-center gap-1">
                  <Clock size={9} /> {o.created_at ? new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsurerPortal;
