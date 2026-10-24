
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Zap, ShieldCheck,
  ArrowUpRight, Activity,
  CheckCircle2, Search,
  Eye, FileText,
  ClipboardCheck, XCircle, CheckCircle, Check, Settings, ShieldAlert,
  HardDrive, Cpu, RefreshCw,

  Car, Terminal, ShieldX,
  Globe, FileDown, Upload, Plus,
  UserPlus, ChevronDown, Pencil, Shield,
  X, Clock, AlertCircle, Send, Sparkles,
} from 'lucide-react';
import { db, AuditLog, CustomProduct, User } from '../../db';
import {
  getAllAgents, getAllClaims, updateAgentVerification, updateAgentCommissionRate,
  updateAgentTier, getTierChangeRequests, evaluateAgentTier,
  callGateway,
  getAllOrders, updateOrderStatus, type SpPolicyOrder,
  type SpUser, type SpClaim,
  getAdminWithdrawals, approveWithdrawal, rejectWithdrawal, triggerDisbursement,
  type Withdrawal,
  registerAgent,
  getSecurityStats, getSessionActivityByHour,
  getAdminPayments, getAdminFinancialReports,
} from '../../services/supabaseService';
import { useToast } from '../ui';
import { formatIDR } from '../car-wizard/WizardUI';
import { UserRole } from '../../types';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';
import type { BackupRecord } from '../../services/backupService';
import { listBackups, performBackup, downloadBackup, getLastBackupTime } from '../../services/backupService';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const Card: React.FC<{ children?: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`p-8 bg-ds-card2 border border-ds-border rounded-[3rem] relative overflow-hidden backdrop-blur-sm group hover:border-emerald-500/30 transition-all duration-500 shadow-xl ${className}`}>
    {children}
  </div>
);

// ── User/Agent detail modal ──────────────────────────────────────────────────
import { getAdminUser } from '../../services/supabaseService';
import { SecureDocLink, SecureDocImage } from '../shared/SecureDoc';

const UserDetailModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getAdminUser(userId).then(d => { setUser(d); setLoading(false); });
  }, [userId]);

  const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div className="space-y-0.5">
      <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">{label}</p>
      <p className="text-xs font-bold text-white break-all">{value || <span className="text-ds-ink2">—</span>}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-12 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-2xl bg-ds-card border border-ds-border rounded-3xl shadow-2xl overflow-y-auto max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ds-border">
          <h2 className="font-black text-sm uppercase tracking-widest text-white">Detail Pengguna</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-ds-card2 text-ds-ink3 hover:text-white hover:bg-ds-card2 transition-all">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          </div>
        ) : !user ? (
          <div className="text-center py-12 text-ds-ink3 text-sm font-bold">Data tidak ditemukan.</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Photos */}
            <div className="grid grid-cols-2 gap-4">
              {/* Profile photo */}
              <div className="space-y-2">
                <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Foto Profil</p>
                {user.profile_photo_url && !imgError['profile'] ? (
                  <img
                    src={user.profile_photo_url}
                    alt="Foto profil"
                    className="w-full h-36 object-cover rounded-2xl border border-ds-border"
                    onError={() => setImgError(p => ({ ...p, profile: true }))}
                  />
                ) : (
                  <div className="w-full h-36 rounded-2xl border border-ds-border bg-ds-card2 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-ds-green flex items-center justify-center font-black text-2xl">
                      {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                  </div>
                )}
              </div>
              {/* KTP document */}
              <div className="space-y-2">
                <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Dokumen KTP</p>
                {user.ktp_document_url ? (
                  <SecureDocLink url={user.ktp_document_url} className="block w-full">
                    <SecureDocImage
                      url={user.ktp_document_url}
                      alt="KTP"
                      className="w-full h-36 object-cover rounded-2xl border border-ds-border hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </SecureDocLink>
                ) : (
                  <div className="w-full h-36 rounded-2xl border border-ds-border bg-ds-card2 flex items-center justify-center text-ds-ink2 text-xs font-bold">
                    Belum ada dokumen
                  </div>
                )}
              </div>
            </div>

            {/* Personal data */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Nama Lengkap" value={user.name} />
              <Field label="Email" value={user.email} />
              <Field label="No. Telepon" value={user.phone} />
              <Field label="Role" value={user.role} />
              <Field label="No. KTP" value={user.ktp} />
              <Field label="Alamat" value={user.address} />
              <Field label="Tanggal Daftar" value={user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null} />
              <Field label="Status" value={user.is_suspended ? 'Suspended' : user.verified ? 'Aktif ✓' : 'Pending Verifikasi'} />
            </div>

            {/* Agent-specific */}
            {user.role === 'AGENT' && (
              <div className="pt-4 border-t border-ds-border grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Kode Mitra" value={user.agent_code} />
                <Field label="Kode Referral" value={user.referral_code} />
                <Field label="Tier" value={user.tier ?? 'Standard'} />
                <Field label="Komisi Rate" value={user.commission_rate != null ? `${(user.commission_rate * 100).toFixed(0)}%` : null} />
                <Field label="Target Bulanan" value={user.monthly_target ? `Rp ${Number(user.monthly_target).toLocaleString('id-ID')}` : null} />
                <Field label="Trust Score" value={user.trust_score != null ? String(user.trust_score) : null} />
                {user.upline_id && <Field label="Upline ID" value={user.upline_id} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Claim photo-fraud detail modal ───────────────────────────────────────────

const CLAIM_FRAUD_VERDICT_META: Record<string, { label: string; color: string; Icon: any }> = {
  CLEAN:           { label: 'Foto Bersih — Tidak Ada Indikasi Fraud', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: ShieldCheck },
  REVIEW_REQUIRED: { label: 'Perlu Tinjauan Manual',                  color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       Icon: AlertCircle },
  REJECTED:        { label: 'Risiko Fraud Tinggi',                    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',          Icon: ShieldAlert },
};

const PHOTO_VERDICT_BADGE: Record<string, string> = {
  CLEAN:     'bg-emerald-500/10 text-emerald-400',
  FLAGGED:   'bg-amber-500/10 text-amber-400',
  HIGH_RISK: 'bg-rose-500/10 text-rose-400',
};

const ClaimDetailModal: React.FC<{ claim: SpClaim; claims: SpClaim[]; onClose: () => void; onSelectClaim: (c: SpClaim) => void }> = ({ claim, claims, onClose, onSelectClaim }) => {
  const photos: string[] = (claim as any).photo_urls?.length ? (claim as any).photo_urls : ((claim as any).photos ?? []);
  const reports: any[] = (claim as any).ai_photo_reports ?? [];
  const verdictMeta = claim.ai_fraud_verdict ? CLAIM_FRAUD_VERDICT_META[claim.ai_fraud_verdict] : null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-12 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-2xl bg-ds-card border border-ds-border rounded-3xl shadow-2xl overflow-y-auto max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-ds-border">
          <div>
            <h2 className="font-black text-sm uppercase tracking-widest text-white">{claim.claim_number ?? claim.id.slice(0, 8)}</h2>
            <p className="text-[0.6rem] font-bold text-ds-ink3 mt-0.5">{claim.client_name ?? '—'} · {claim.product_type ?? '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-ds-card2 text-ds-ink3 hover:text-white hover:bg-ds-card2 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {verdictMeta && (
            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${verdictMeta.color}`}>
              <verdictMeta.Icon size={26} className="shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest">{verdictMeta.label}</p>
                <p className="text-[0.6rem] font-bold opacity-70 mt-0.5">
                  Skor fraud: {claim.ai_fraud_score ?? '—'}/100
                  {claim.ai_analyzed_at ? ` · Dianalisa ${new Date(claim.ai_analyzed_at).toLocaleString('id-ID')}` : ''}
                </p>
              </div>
            </div>
          )}

          {photos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Foto ({photos.length})</p>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`claim-photo-${i}`} className="w-full aspect-square object-cover rounded-2xl border border-ds-border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {reports.length > 0 && (
            <div className="space-y-2">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Laporan Forensik Per Foto</p>
              <div className="space-y-3">
                {reports.map((r: any, i: number) => {
                  const badge = PHOTO_VERDICT_BADGE[r.verdict] ?? PHOTO_VERDICT_BADGE.CLEAN;
                  const matched = r.duplicate?.isDuplicate ? claims.find(c => c.id === r.duplicate.matchedSourceId) : null;
                  return (
                    <div key={i} className="p-4 bg-ds-card2 border border-ds-border rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[0.65rem] font-black uppercase text-white">Foto {r.photoIndex + 1}</p>
                        <span className={`px-2 py-0.5 rounded text-[0.45rem] font-black uppercase ${badge}`}>{r.verdict}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.55rem] text-ds-ink3 font-bold">
                        <span>Skor Keaslian: {r.ai?.authenticityScore ?? '—'}/100</span>
                        <span>Plat Terlihat: {r.ai?.plateVisible ? 'Ya' : 'Tidak'}</span>
                        <span>Foto Layar: {r.ai?.isScreenPhoto ? 'Ya' : 'Tidak'}</span>
                        <span>Foto Stok: {r.ai?.isStockOrDownloaded ? 'Ya' : 'Tidak'}</span>
                        <span>Metadata EXIF: {r.exif?.hasExif ? 'Ada' : 'Tidak ada'}</span>
                        {r.exif?.editingSoftware && <span className="text-rose-400">Software Editing: {r.exif.editingSoftware}</span>}
                      </div>
                      {r.duplicate?.isDuplicate && (
                        <div className="p-2 bg-rose-500/10 rounded-xl text-[0.55rem] font-bold text-rose-400 flex items-center justify-between gap-2">
                          <span>Mirip {r.duplicate.similarity}% dengan foto {r.duplicate.matchedSourceType === 'SURVEY' ? 'survei' : 'klaim'} lain{matched ? ` (${matched.claim_number ?? matched.id.slice(0, 8)})` : ''}</span>
                          {matched && (
                            <button onClick={() => onSelectClaim(matched)} className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 shrink-0">Lihat</button>
                          )}
                        </div>
                      )}
                      {r.flagReasons?.length > 0 && (
                        <ul className="space-y-0.5">
                          {r.flagReasons.map((reason: string, ri: number) => (
                            <li key={ri} className="text-[0.55rem] text-amber-400">• {reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-ds-border">
            <div className="space-y-0.5">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Status</p>
              <p className="text-xs font-bold text-white">{STATUS_LABEL[claim.status] ?? claim.status}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Estimasi</p>
              <p className="text-xs font-bold text-white">{claim.amount_estimated ? formatIDR(claim.amount_estimated) : '—'}</p>
            </div>
            <div className="space-y-0.5 col-span-2">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.25em] text-ds-ink3">Kronologi</p>
              <p className="text-xs font-bold text-white leading-relaxed">{claim.chronology || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-emerald-500/10 text-ds-green border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    emerald: "bg-emerald-500/10 text-ds-green border-emerald-500/20",
    indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[0.5rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <Card>
    <div className="flex justify-between items-start mb-6">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${color}`}>
        <Icon size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[0.65rem] font-black ${trend.startsWith('+') ? 'text-ds-green' : 'text-rose-500'}`}>
          {trend} <ArrowUpRight size={14} className={trend.startsWith('-') ? 'rotate-90' : ''} />
        </div>
      )}
    </div>
    <p className="text-3xl font-black tracking-tighter leading-none mb-2">{value}</p>
    <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">{label}</p>
  </Card>
);

export const BizAdminView = ({ isDashboard, section }: { isDashboard?: boolean, section?: string }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        setLoadError(null);
        // Real data from Supabase via data-gateway (was reading empty local IndexedDB)
        const [usersRes, polRes, commRes] = await Promise.all([
          callGateway('admin_list_users', { limit: 500 }),
          callGateway('admin_list_policies', { limit: 500 }),
          callGateway('admin_list_commissions', { limit: 500 }),
        ]);
        const allUsers: any[] = (usersRes as any)?.data ?? [];
        const allPolicies: any[] = (polRes as any)?.data ?? [];
        setPolicies(allPolicies);

        if (section === 'users') {
           const commissions: any[] = (commRes as any)?.data ?? [];
           const stats: Record<string, { sales: number; commission: number }> = {};

           // Aggregate real GWP + commission per agent
           commissions.forEach(c => {
               const aid = c.agent_id;
               if (!aid) return;
               if (!stats[aid]) stats[aid] = { sales: 0, commission: 0 };
               stats[aid].sales += c.premium_amount ?? 0;
               stats[aid].commission += c.commission_amount ?? 0;
           });

           const mappedUsers = allUsers.map(u => ({
              ...u,
              totalSales: stats[u.id]?.sales || 0,
              totalCommission: stats[u.id]?.commission || 0,
           })).sort((a, b) => b.totalSales - a.totalSales);

           setUsers(mappedUsers);
        } else {
           setUsers(allUsers);
        }
    };
    fetchData().catch((error) => setLoadError(error instanceof Error ? error.message : 'Gagal memuat data operasional.')).finally(() => setLoading(false));
  }, [section]);

  if (section === 'transactions') {
     return (
        <div className="space-y-8 animate-fade-in">
           {loadError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">Gagal memuat data operasional: {loadError} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">Coba lagi</button></div>}
           <Card>
              <h3 className="font-black uppercase tracking-widest text-sm mb-6">Live Policy Deployment Traffic</h3>
              <div className="space-y-4">
                 {policies.map((p, i) => (
                    <div key={i} className="p-4 bg-ds-card2 rounded-2xl flex items-center justify-between border border-ds-border">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.status === 'ACTIVE' ? 'bg-emerald-500/10 text-ds-green' : 'bg-amber-500/10 text-ds-amber'}`}>
                             <ShieldCheck size={20}/>
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase">{p.policyNumber}</p>
                             <p className="text-[0.5rem] text-ds-ink3 uppercase tracking-widest">{p.type} • {p.providerId}</p>
                          </div>
                       </div>
                       <p className="text-sm font-black tracking-tighter text-ds-green">{formatIDR(p.premium)}</p>
                    </div>
                 ))}
              </div>
           </Card>
        </div>
     )
  }

  const filteredUsers = searchTerm ? users.filter(u => (u.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase())) : users;

  return (
  <div className="space-y-8 animate-fade-in">
    {loadError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">Gagal memuat data operasional: {loadError} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">Coba lagi</button></div>}
    {isDashboard && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Policies" value={policies.length} trend={`+${policies.length}`} icon={FileText} color="bg-emerald-500/10 text-ds-green" />
        <StatCard label="Partner Nodes" value={users.length} trend="+12" icon={Users} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Conversion Rate" value="18.4%" trend="+2.1%" icon={TrendingUp} color="bg-emerald-500/10 text-ds-green" />
      </div>
    )}
    
    {!isDashboard && (section === 'users') && (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black uppercase tracking-widest text-sm">Direktori Partner (Top Aktif)</h3>
          <div className="flex items-center gap-3">
             <span className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">{users.length} Total Terdaftar</span>
             <div className="relative">
                <Search size={14} className="text-ds-ink3 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input 
                  type="text" 
                  placeholder="Cari user..." 
                  className="pl-9 pr-4 py-2 bg-ds-card2 border border-ds-border rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
           <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-ds-border text-[0.55rem] font-black uppercase text-ds-ink3 tracking-[0.2em]">
                  <th className="pb-4 pl-4">Partner Info</th>
                  <th className="pb-4">No. HP</th>
                  <th className="pb-4">Sales (GWP)</th>
                  <th className="pb-4">Komisi (25%)</th>
                  <th className="pb-4 text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredUsers.slice(0, 200).map((u, i) => (
                  <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-500 flex items-center justify-center font-black text-xs text-white shadow-lg">{(u.name ?? '?')[0]}</div>
                        <div>
                          <p className="text-xs font-black uppercase text-white">{u.name ?? '—'}</p>
                          <p className="text-[0.5rem] text-ds-ink3 tracking-widest">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-mono text-[0.6rem] text-ds-ink3">{u.phone}</td>
                    <td className="py-4 font-black text-ds-green">{formatIDR(u.totalSales || 0)}</td>
                    <td className="py-4 font-black text-ds-amber">{formatIDR(u.totalCommission || 0)}</td>
                    <td className="py-4 text-right pr-4">
                       <Badge color={u.totalSales > 0 ? "emerald" : "gray"}>{u.totalSales > 0 ? 'Active Seller' : 'Registered'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
           {filteredUsers.length > 200 && (
             <div className="p-4 text-center text-xs text-ds-ink3 font-bold uppercase tracking-widest">
               Menampilkan Top 200 dari {filteredUsers.length} Partner. Gunakan pencarian untuk User lainnya.
             </div>
           )}
        </div>
      </Card>
    )}
  </div>
)};

export const SecurityView = () => {
  const [sessionActivity, setSessionActivity] = useState<Array<{ hour: number; count: number }>>([]);
  const [secStats, setSecStats] = useState<{ failedLogins24h: number; activeSessionsCount: number; lastLoginAt: string | null; blockedEntries: Array<{ email: string; attempts: number; until: number }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [stats, activity] = await Promise.all([
        getSecurityStats(),
        getSessionActivityByHour(),
      ]);
      setSecStats(stats);
      setSessionActivity(activity);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat data keamanan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const maxActivity = Math.max(...sessionActivity.map(s => s.count), 1);

  return (
    <div className="space-y-8 animate-fade-in relative">
       {loadError && (
         <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
           <p className="text-sm text-red-600">Data keamanan gagal dimuat: {loadError}</p>
           <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-ds-border px-3 py-2 text-xs font-bold disabled:opacity-50">
             {loading ? 'Memuat…' : 'Coba lagi'}
           </button>
         </div>
       )}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Login Gagal (24 jam)"
            value={loading ? '…' : (secStats?.failedLogins24h ?? 0).toString()}
            icon={ShieldAlert}
            color="bg-emerald-500/10 text-ds-green"
          />
          <StatCard
            label="Sesi Aktif (5 mnt)"
            value={loading ? '…' : (secStats?.activeSessionsCount ?? 0).toString()}
            icon={Cpu}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            label="Latensi Server"
            value="N/A"
            icon={Zap}
            color="bg-emerald-500/10 text-ds-green"
          />
          <StatCard
            label="Uptime Server"
            value="N/A"
            icon={Globe}
            color="bg-emerald-500/10 text-ds-green"
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-ds-green"><Terminal size={20}/></div>
                   <div>
                      <h3 className="font-black uppercase tracking-widest text-sm">Aktivitas Sesi Per Jam (24j)</h3>
                      <p className="text-[0.5rem] font-bold text-ds-ink3 uppercase tracking-[0.2em] mt-1">Berdasarkan data sp_user_sessions nyata</p>
                   </div>
                </div>
             </div>

             <div className="h-56 flex items-end gap-1 px-2 border-b border-ds-border pb-1">
                {sessionActivity.length > 0
                  ? sessionActivity.map((s, i) => {
                      const pct = (s.count / maxActivity) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-emerald-500 transition-all duration-700 rounded-t-sm"
                          style={{
                            height: `${Math.max(pct, 2)}%`,
                            opacity: 0.15 + (i / 24) * 0.85,
                            boxShadow: pct > 70 ? '0 0 15px rgba(16,185,129,0.3)' : 'none',
                          }}
                          title={`${s.hour}:00 — ${s.count} sesi`}
                        />
                      );
                    })
                  : Array(24).fill(0).map((_, i) => (
                      <div key={i} className="flex-1 bg-ds-card2 rounded-t-sm" style={{ height: '8%' }} />
                    ))
                }
             </div>
             <div className="flex justify-between mt-2 px-2">
               <span className="text-[0.45rem] text-ds-ink2">00:00</span>
               <span className="text-[0.45rem] text-ds-ink2">12:00</span>
               <span className="text-[0.45rem] text-ds-ink2">23:00</span>
             </div>
          </Card>

          <Card>
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500"><ShieldX size={20}/></div>
                   <h3 className="font-black uppercase tracking-widest text-sm">Blokir Login</h3>
                </div>
                <Badge color="rose">Real Data</Badge>
             </div>
             {loading ? (
               <p className="text-xs text-ds-ink3">Memuat…</p>
             ) : secStats && secStats.blockedEntries.length > 0 ? (
               <div className="space-y-3">
                 {secStats.blockedEntries.slice(0, 5).map((entry, i) => (
                   <div key={i} className={`p-4 bg-ds-card2 border border-ds-border rounded-2xl flex items-center justify-between hover:bg-ds-card2 transition-all ${i === 0 ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}>
                     <div className="space-y-1 overflow-hidden">
                       <div className="flex items-center gap-2">
                         <Badge color="rose">RATE LIMIT</Badge>
                         <span className="text-[0.6rem] font-mono text-ds-ink3 truncate">{entry.email}</span>
                       </div>
                       <p className="text-[0.5rem] font-bold text-ds-ink3 uppercase tracking-widest">
                         {entry.attempts} percobaan · {entry.until > Date.now() ? `Diblokir ${Math.ceil((entry.until - Date.now()) / 60000)} mnt` : 'Kadaluarsa'}
                       </p>
                     </div>
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-ds-green'}`}>
                       <Check size={16} strokeWidth={3} />
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="space-y-3">
                 <p className="text-xs text-ds-ink3 py-4 text-center">Tidak ada blokir aktif</p>
                 {secStats?.lastLoginAt && (
                   <p className="text-[0.5rem] text-ds-ink2 text-center uppercase tracking-widest">
                     Login terakhir: {new Date(secStats.lastLoginAt).toLocaleString('id-ID')}
                   </p>
                 )}
               </div>
             )}
          </Card>
       </div>
    </div>
  );
};

interface LedgerTx { id: string; date: string; type: string; amount: number; status: string; referenceId?: string; description: string; }

export const LedgerView = () => {
    const [txs, setTxs] = useState<LedgerTx[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setLoadError(null);
            // Real ledger from Supabase (payments in, commissions + withdrawals out) — was empty local IndexedDB
            const [payments, withdrawals, commRes] = await Promise.all([
                getAdminPayments(200),
                getAdminWithdrawals(200),
                callGateway('admin_list_commissions', { limit: 200 }),
            ]);
            const commissions: any[] = (commRes as any)?.data ?? [];
            const list: LedgerTx[] = [];

            payments.forEach((p: any) => {
                const amt = p.paid_amount ?? p.amount ?? 0;
                if (!amt) return;
                list.push({
                    id: `pay-${p.id}`,
                    date: p.paid_at ?? p.created_at ?? new Date().toISOString(),
                    type: 'PAYMENT',
                    amount: amt,
                    status: p.status === 'PAID' ? 'SUCCESS' : p.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    referenceId: p.order_number ?? p.external_id,
                    description: `Premi${p.client_name ? ' — ' + p.client_name : ''}${p.product_name ? ' (' + p.product_name + ')' : ''}`,
                });
            });

            commissions.forEach((c: any) => {
                list.push({
                    id: `comm-${c.id}`,
                    date: c.created_at ?? new Date().toISOString(),
                    type: 'COMMISSION',
                    amount: c.commission_amount ?? 0,
                    status: (c.status === 'PAID' || c.status === 'APPROVED') ? 'SUCCESS' : c.status === 'REJECTED' ? 'FAILED' : 'PENDING',
                    referenceId: c.order_number,
                    description: `Komisi Mitra${c.client_name ? ' — ' + c.client_name : ''}`,
                });
            });

            withdrawals.forEach((w: any) => {
                list.push({
                    id: `wd-${w.id}`,
                    date: w.created_at ?? new Date().toISOString(),
                    type: 'WITHDRAWAL',
                    amount: w.amount ?? 0,
                    status: w.status === 'DISBURSED' ? 'SUCCESS' : (w.status === 'REJECTED' || w.status === 'FAILED') ? 'FAILED' : 'PENDING',
                    referenceId: w.id,
                    description: `Penarikan Dana${w.agent_name ? ' — ' + w.agent_name : ''}`,
                });
            });

            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTxs(list);
        };
        load().catch((error) => setLoadError(error instanceof Error ? error.message : 'Gagal memuat buku besar.')).finally(() => setLoading(false));
    }, []);

    const convert = (val: number) => {
        return `Rp ${(val).toLocaleString('id-ID')}`;
    };

    const handleExport = () => {
        const data = txs.map(t => ({
            ID: t.id,
            Tanggal: t.date,
            Tipe: t.type,
            Jumlah: t.amount,
            Status: t.status,
            Ref: t.referenceId,
            Deskripsi: t.description
        }));
        downloadCSV(data, `Buku_Besar_Transaksi`);
    };

    return (
        <div className="space-y-8 animate-fade-in text-white">
           {loadError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">Gagal memuat buku besar: {loadError} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">Coba lagi</button></div>}
           <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Buku <span className="text-ds-green">Besar</span></h2>
                 <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest mt-1">Sistem Pencatatan Transaksi Real-time</p>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleExport} className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">
                    <FileDown size={18}/> Unduh Excel
                 </button>
              </div>
           </div>

           <Card>
              <div className="overflow-x-auto no-scrollbar">
                 <table className="w-full text-left min-w-[600px]">
                    <thead>
                       <tr className="text-[0.55rem] font-black text-ds-ink3 uppercase tracking-widest border-b border-ds-border">
                          <th className="pb-4 pl-4">Tanggal</th>
                          <th className="pb-4">Tipe Transaksi</th>
                          <th className="pb-4">Deskripsi</th>
                          <th className="pb-4">Jumlah (Rp)</th>
                          <th className="pb-4 text-right pr-4">Status</th>
                       </tr>
                    </thead>
                    <tbody className="text-[0.7rem] font-bold">
                       {loading && (
                          <tr><td colSpan={5} className="py-12 text-center text-ds-ink3">Memuat transaksi…</td></tr>
                       )}
                       {!loading && txs.length === 0 && (
                          <tr><td colSpan={5} className="py-12 text-center text-ds-ink3 font-bold">Belum ada transaksi tercatat.</td></tr>
                       )}
                       {!loading && txs.slice(0, 100).map((t, i) => (
                          <tr key={i} className="border-b border-ds-border hover:bg-ds-card2 transition-colors">
                             <td className="py-4 pl-4 text-ds-ink3">{new Date(t.date).toLocaleString('id-ID')}</td>
                             <td className="py-4 text-ds-green font-mono">{t.type}</td>
                             <td className="py-4 text-white max-w-xs truncate" title={t.description}>{t.description}</td>
                             <td className="py-4 font-mono">{t.type === 'COMMISSION' || t.type === 'CLAIM_PAYOUT' || t.type === 'WITHDRAWAL' ? <span className="text-rose-500">-{convert(t.amount)}</span> : <span className="text-ds-green">+{convert(t.amount)}</span>}</td>
                             <td className="py-4 text-right pr-4">
                                <Badge color={t.status === 'SUCCESS' ? 'emerald' : t.status === 'PENDING' ? 'yellow' : 'rose'}>{t.status}</Badge>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>
    );
};

export const ReportsView = ({ compact }: { compact?: boolean }) => {
    const [orderData, setOrderData] = useState<Array<{total_premium: number; created_at: string}>>([]);
    const [commissionData, setCommissionData] = useState<Array<{commission_amount: number; created_at: string}>>([]);
    const [claimsData, setClaimsData] = useState<Array<{amount_approved: number; created_at: string}>>([]);
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState<'daily'|'monthly'|'yearly'>('monthly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { orders, commissions, claims } = await getAdminFinancialReports(selectedYear);
            setOrderData(orders);
            setCommissionData(commissions);
            setClaimsData(claims);
            setLoading(false);
        };
        load();
    }, [selectedYear]);

    const convert = (val: number) => {
        if(val === 0) return '-';
        return `Rp ${(val / 1000000).toLocaleString('id-ID', {minimumFractionDigits: 1, maximumFractionDigits: 1})}Jt`;
    };

    const getAggregatedData = () => {
        const result: any[] = [];
        const today = new Date();

        if (viewType === 'monthly') {
            for(let i=0; i<12; i++) {
                const gwp = orderData.filter(o => { const d = new Date(o.created_at); return d.getFullYear() === selectedYear && d.getMonth() === i; }).reduce((acc, o) => acc + (o.total_premium ?? 0), 0);
                const commissions = commissionData.filter(c => { const d = new Date(c.created_at); return d.getFullYear() === selectedYear && d.getMonth() === i; }).reduce((acc, c) => acc + (c.commission_amount ?? 0), 0);
                const claims = claimsData.filter(c => { const d = new Date(c.created_at); return d.getFullYear() === selectedYear && d.getMonth() === i; }).reduce((acc, c) => acc + (c.amount_approved ?? 0), 0);
                result.push({ period: `${MONTHS[i]} ${selectedYear}`, gwp, commissions, promo: gwp * 0.05, others: gwp * 0.02, claims });
            }
        } else if (viewType === 'yearly') {
            [selectedYear - 1, selectedYear].forEach(y => {
                const gwp = orderData.filter(o => new Date(o.created_at).getFullYear() === y).reduce((acc, o) => acc + (o.total_premium ?? 0), 0);
                const commissions = commissionData.filter(c => new Date(c.created_at).getFullYear() === y).reduce((acc, c) => acc + (c.commission_amount ?? 0), 0);
                const claims = claimsData.filter(c => new Date(c.created_at).getFullYear() === y).reduce((acc, c) => acc + (c.amount_approved ?? 0), 0);
                result.push({ period: `Tahun ${y}`, gwp, commissions, promo: gwp * 0.05, others: gwp * 0.02, claims });
            });
        } else if (viewType === 'daily') {
            for(let i=6; i>=0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const gwp = orderData.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((acc, o) => acc + (o.total_premium ?? 0), 0);
                const commissions = commissionData.filter(c => new Date(c.created_at).toDateString() === d.toDateString()).reduce((acc, c) => acc + (c.commission_amount ?? 0), 0);
                const claims = claimsData.filter(c => new Date(c.created_at).toDateString() === d.toDateString()).reduce((acc, c) => acc + (c.amount_approved ?? 0), 0);
                result.push({ period: d.toLocaleDateString('id-ID', { day:'numeric', month:'short' }), gwp, commissions, promo: gwp * 0.05, others: gwp * 0.02, claims });
            }
        }
        return result;
    };

    const aggregatedData = getAggregatedData();
    const totalGwp = aggregatedData.reduce((acc, r) => acc + r.gwp, 0);
    const totalClaim = aggregatedData.reduce((acc, r) => acc + r.claims, 0);
    const expenses = aggregatedData.reduce((acc, r) => acc + r.commissions + r.promo + r.others, 0);
    const combinedRatio = totalGwp > 0 ? (((totalClaim + expenses) / totalGwp) * 100).toFixed(1) : "0.0";

    const handleExport = () => {
        downloadCSV(aggregatedData, `Laporan_Keuangan_${viewType}_${selectedYear}`);
    };

    return (
        <div className={`space-y-8 ${compact ? '' : 'animate-fade-in text-white'}`}>
           {!compact && (
              <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
                 <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Laporan <span className="text-ds-green">Keuangan</span></h2>
                    <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest mt-1">Data Transaksi dan Performa Bisnis</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border">
                       {[2023, 2024, 2025, 2026].map(y => (
                          <button 
                            key={y} 
                            onClick={() => setSelectedYear(y)}
                            className={`px-4 py-3 rounded-xl text-[0.65rem] font-black uppercase transition-all ${selectedYear === y ? 'bg-ds-card2 text-white shadow-lg' : 'text-ds-ink3 hover:text-white'}`}
                          >
                             {y}
                          </button>
                       ))}
                    </div>
                    <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border">
                       {(['daily', 'monthly', 'yearly'] as const).map(v => (
                          <button 
                            key={v} 
                            onClick={() => setViewType(v)}
                            className={`px-4 py-3 rounded-xl text-[0.65rem] font-black uppercase transition-all ${viewType === v ? 'bg-emerald-500 text-white shadow-lg' : 'text-ds-ink3 hover:text-white'}`}
                          >
                             {v === 'daily' ? 'Harian' : v === 'monthly' ? 'Bulanan' : 'Tahunan'}
                          </button>
                       ))}
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl transition-all">
                       <FileDown size={18}/> Unduh Excel
                    </button>
                 </div>
              </div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="lg:col-span-3 space-y-6">
                 <Card className="p-0">
                    <div className="p-8 border-b border-ds-border flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-ds-card2 rounded-2xl flex items-center justify-center text-white"><FileText size={24}/></div>
                          <div>
                             <h3 className="font-black uppercase tracking-widest text-lg text-white">Ringkasan {viewType === 'daily' ? 'Harian' : viewType === 'monthly' ? 'Bulanan' : 'Tahunan'}</h3>
                             <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-[0.2em] mt-1">Berdasarkan Total Transaksi Masuk</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto">
                       {loading && <div className="flex justify-center py-8"><div className="w-7 h-7 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" /></div>}
                       <table className="w-full text-left min-w-[700px]">
                          <thead className="bg-black/20 text-[0.6rem] uppercase tracking-widest text-ds-ink3 font-black">
                             <tr>
                                <th className="py-4 pl-4 font-bold border-b border-ds-border">Periode</th>
                                <th className="py-4 font-bold border-b border-ds-border">Premi Masuk</th>
                                <th className="py-4 font-bold border-b border-ds-border">Komisi</th>
                                <th className="py-4 font-bold border-b border-ds-border">Promo/Marketing</th>
                                <th className="py-4 font-bold border-b border-ds-border">Operasional</th>
                                <th className="py-4 font-bold border-b border-ds-border">Klaim Dibayar</th>
                                <th className="py-4 border-b border-ds-border text-right pr-4">Status</th>
                             </tr>
                          </thead>
                          <tbody className="text-[0.7rem] font-bold">
                             {aggregatedData.map((row, i) => (
                                <tr key={i} className="border-b border-ds-border hover:bg-ds-card2 transition-colors group">
                                   <td className="py-4 pl-4 uppercase text-white font-black">{row.period}</td>
                                   <td className="py-4 text-ds-green font-mono">{convert(row.gwp)}</td>
                                   <td className="py-4 text-blue-400 font-mono">{convert(row.commissions)}</td>
                                   <td className="py-4 text-emerald-400 font-mono">{convert(row.promo)}</td>
                                   <td className="py-4 text-indigo-400 font-mono">{convert(row.others)}</td>
                                   <td className="py-4 text-rose-500 font-mono">{convert(row.claims)}</td>
                                   <td className="py-4 text-right pr-4">
                                      <div className="flex items-center justify-end gap-2 text-ds-green">
                                         <CheckCircle2 size={12}/>
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </Card>
              </div>

              <div className="space-y-6">
                 <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Activity size={20}/></div>
                       <h3 className="text-sm font-black uppercase tracking-tight">Performa Bisnis</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="p-4 bg-black/20 rounded-2xl border border-ds-border">
                          <p className="text-[0.5rem] font-black text-ds-ink3 uppercase tracking-widest">Total GWP</p>
                          <p className="text-2xl font-black text-white">{convert(totalGwp)}</p>
                       </div>
                       <div className="p-4 bg-black/20 rounded-2xl border border-ds-border">
                          <p className="text-[0.5rem] font-black text-ds-ink3 uppercase tracking-widest">Rasio Gabungan (Combined Ratio)</p>
                          <p className={`text-2xl font-black ${Number(combinedRatio) > 100 ? 'text-rose-500' : 'text-ds-green'}`}>~{combinedRatio}%</p>
                       </div>
                    </div>
                 </Card>
              </div>
           </div>
        </div>
    );
};

export const AuditLogView = ({ compact }: { compact?: boolean }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    useEffect(() => { db.auditLogs.toArray().then(res => setLogs(res.sort((a,b) => (b.id||0) - (a.id||0)).slice(0, compact ? 10 : 50))); }, [compact]);
    return (
        <div className="space-y-4">
           {logs.map(log => (
              <div key={log.id} className="flex gap-4 items-start p-4 bg-ds-card2 rounded-2xl border border-ds-border hover:bg-ds-card2 transition-all">
                 <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse ${log.domain === 'SECURITY' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_8px_#00C16A]'}`}></div>
                 <div className="min-w-0">
                    <p className="text-[0.65rem] font-bold text-ds-ink2 leading-tight"><span className="text-ds-green uppercase font-black">{log.actor.split('@')[0]}</span> {log.action}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                       <Badge color={log.domain === 'SECURITY' ? 'rose' : 'blue'}>{log.domain}</Badge>
                       <span className="text-[0.5rem] font-mono text-ds-ink2 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                    </div>
                 </div>
              </div>
           ))}
        </div>
    );
};

export const ApprovalsView = () => {
    const [orders, setOrders] = useState<SpPolicyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});

    const load = async () => {
        setLoading(true);
        // Real pending queue from Supabase (was empty local IndexedDB)
        const all = await getAllOrders();
        setOrders(all.filter(o => o.status === 'SUBMITTED' || o.status === 'UNDER_REVIEW'));
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const act = async (id: string, status: SpPolicyOrder['status']) => {
        if (status === 'REJECTED' && !(notes[id] ?? '').trim()) {
            console.warn('Wajib isi catatan penolakan.');
            return;
        }
        setActing(id);
        await updateOrderStatus(id, status, { reviewer_notes: notes[id] });
        setOrders(prev => prev.filter(o => o.id !== id));
        setActing(null);
    };

    return (
        <div className="space-y-8 animate-fade-in text-white">
            <Card>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-ds-amber"><ClipboardCheck size={22}/></div>
                <div>
                    <h3 className="font-black uppercase tracking-widest text-sm">Antrean Persetujuan Polis</h3>
                    <p className="text-[0.5rem] font-bold text-ds-ink3 uppercase tracking-[0.2em] mt-1">Pesanan menunggu review · untuk terbitkan polis buka menu Pesanan Polis</p>
                </div>
                </div>
                <Badge color="yellow">{orders.length} Pending</Badge>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            ) : orders.length === 0 ? (
                <p className="text-center py-12 text-ds-ink3 text-sm font-bold">Tidak ada pesanan menunggu persetujuan.</p>
            ) : (
            <div className="space-y-4">
                {orders.map(o => (
                <div key={o.id} className="p-6 bg-ds-card2 border border-ds-border rounded-[1.8rem] space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-gray-100/10 rounded-2xl flex items-center justify-center text-ds-ink3 flex-shrink-0"><FileText size={24}/></div>
                        <div className="min-w-0">
                            <p className="font-black text-sm uppercase truncate">{o.client_name} · {o.order_number}</p>
                            <p className="text-[0.55rem] text-ds-ink3 font-bold uppercase tracking-widest">{o.product_name} • {formatIDR(o.total_premium)} • {o.status === 'UNDER_REVIEW' ? 'Sedang Ditinjau' : 'Baru Diajukan'}</p>
                        </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            disabled={acting === o.id}
                            onClick={() => act(o.id, 'REJECTED')}
                            className="px-4 py-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[0.6rem] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
                        >
                            <XCircle size={14}/> Tolak
                        </button>
                        <button
                            disabled={acting === o.id}
                            onClick={() => act(o.id, 'APPROVED')}
                            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-[0.6rem] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
                        >
                            <CheckCircle size={14}/> {acting === o.id ? '…' : 'Setujui'}
                        </button>
                        </div>
                    </div>
                    <input
                        value={notes[o.id] ?? ''}
                        onChange={e => setNotes(prev => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder="Catatan reviewer (wajib untuk penolakan)…"
                        className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                    />
                </div>
                ))}
            </div>
            )}
            </Card>
        </div>
    );
}

export const InventoryView = () => (
  <div className="space-y-8 animate-fade-in text-white">
    <Card>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-ds-green"><HardDrive size={22}/></div>
          <h3 className="font-black uppercase tracking-widest text-sm">Active Matrix Inventory</h3>
        </div>
        <button className="p-2 text-ds-ink3 hover:text-white transition-all"><RefreshCw size={18}/></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ds-border text-[0.55rem] font-black uppercase text-ds-ink3 tracking-[0.2em]">
              <th className="pb-4 pl-4">Asset Matrix</th>
              <th className="pb-4">Status</th>
              <th className="pb-4">Risk Rating</th>
              <th className="pb-4 text-right pr-4">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {[1,2,3,4,5].map(i => (
              <tr key={i} className="border-b border-white/[0.02] group hover:bg-white/[0.01]">
                <td className="py-4 pl-4">
                  <div className="flex items-center gap-3">
                    <Car size={16} className="text-ds-ink3"/>
                    <span className="font-black uppercase">Unit-A0{i} (Matrix)</span>
                  </div>
                </td>
                <td className="py-4"><Badge color="emerald">Active</Badge></td>
                <td className="py-4 font-mono">0.122-LOW</td>
                <td className="py-4 text-right pr-4"><button className="text-ds-ink3 hover:text-white"><Eye size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

// ── Backup View ──────────────────────────────────────────────────────────────

const BackupView: React.FC = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [running, setRunning] = useState(false);
  const lastTs = getLastBackupTime();
  const now = Date.now();
  const ageH = lastTs ? (now - lastTs.getTime()) / 3_600_000 : Infinity;
  const pillColor = ageH < 24 ? 'bg-emerald-500/15 text-emerald-400' : ageH < 48 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400';
  const pillLabel = lastTs ? (ageH < 24 ? 'Up to date' : ageH < 48 ? 'Stale' : 'Outdated') : 'Never';

  const load = async () => {
    try {
      const result = await listBackups();
      setBackups(result);
    } catch (e) {
      console.error('BackupView load error:', e);
      setBackups([]);
    }
  };
  useEffect(() => { load(); }, []);

  const handleRunBackup = async () => {
    setRunning(true);
    try {
      await performBackup();
      await load();
    } catch (e) {
      console.error('BackupView handleRunBackup error:', e);
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = (id: number | string) => downloadBackup(id);

  return (
    <div className="rounded-2xl bg-ds-card2 border border-ds-border p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <p className="font-black uppercase text-sm text-white">Backup Data</p>
            <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">Auto-backup status</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-widest ${pillColor}`}>
            {pillLabel}
          </span>
          <button
            onClick={handleRunBackup}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={running ? 'animate-spin' : ''} />
            {running ? 'Running…' : 'Run Backup Now'}
          </button>
        </div>
      </div>

      {/* Table */}
      {backups.length === 0 ? (
        <p className="text-center text-[0.65rem] text-ds-ink2 font-bold py-6 uppercase tracking-widest">No backups found.</p>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[580px]">
            <thead>
              <tr className="border-b border-ds-border text-[0.55rem] font-black uppercase text-ds-ink3 tracking-[0.2em]">
                <th className="py-3 pr-4">Date / Time</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Tables</th>
                <th className="py-3 pr-4">Size (KB)</th>
                <th className="py-3 pr-4">Checksum</th>
                <th className="py-3 text-right">Export</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.id} className="border-b border-ds-border hover:bg-ds-card2 transition-colors text-xs">
                  <td className="py-3 pr-4 font-mono text-ds-ink2 text-[0.65rem]">{new Date(b.created_at).toLocaleString('id-ID')}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[0.5rem] font-black uppercase tracking-widest ${b.backup_type === 'AUTO' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {b.backup_type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ds-ink3 font-mono text-[0.65rem]">{b.tables_list?.length ?? 0}</td>
                  <td className="py-3 pr-4 text-ds-ink3 font-mono text-[0.65rem]">{(b.backup_size_bytes / 1024).toFixed(1)}</td>
                  <td className="py-3 pr-4 text-ds-ink3 font-mono text-[0.65rem]">{b.checksum.slice(0, 8)}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDownload(b.id)}
                      className="p-1.5 rounded-lg bg-ds-card2 text-ds-ink3 hover:text-emerald-400 hover:bg-ds-card2 transition-colors"
                      title="Download backup"
                    >
                      <FileDown size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Role Permissions View (Task 1) ───────────────────────────────────────────

const CONFIGURABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.INSURANCE_ADMIN,
  UserRole.FINANCE_MANAGER,
  UserRole.FINANCE_DIRECTOR,
] as const;

const MENU_IDS = [
  { id: 'dashboard',         label: 'Dashboard' },
  { id: 'reports',           label: 'Laporan' },
  { id: 'analytics',         label: 'Analytics' },
  { id: 'users',             label: 'Pengguna' },
  { id: 'user_mgmt',         label: 'Kelola Akun' },
  { id: 'transactions',      label: 'Transaksi' },
  { id: 'payments',          label: 'Pembayaran' },
  { id: 'withdrawals',       label: 'Penarikan' },
  { id: 'policy_orders',     label: 'Pesanan Polis' },
  { id: 'approvals',         label: 'Antrean Polis' },
  { id: 'claims_admin',      label: 'Antrean Klaim' },
  { id: 'inventory',         label: 'Data Polis' },
  { id: 'endorsements',      label: 'Endorsement' },
  { id: 'agents',            label: 'Manajemen Mitra' },
  { id: 'commission_ledger', label: 'Komisi' },
  { id: 'b2b',               label: 'B2B' },
  { id: 'product_config',    label: 'Produk' },
  { id: 'tier_promo',        label: 'Tier & Promo' },
  { id: 'insurers',          label: 'Asuransi' },
  { id: 'vehicle_pricelist', label: 'Kendaraan DB' },
  { id: 'website_editor',    label: 'Editor Website' },
  { id: 'financial',         label: 'Keuangan' },
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['dashboard','reports','analytics','users','user_mgmt','transactions','payments','withdrawals','policy_orders','approvals','claims_admin','inventory','endorsements','agents','commission_ledger','b2b','product_config','tier_promo','insurers','vehicle_pricelist','website_editor'],
  FINANCE: ['dashboard','reports','analytics','transactions','payments','withdrawals','commission_ledger','financial'],
  INSURANCE_ADMIN: ['dashboard','approvals','policy_orders','claims_admin','endorsements','insurers'],
  FINANCE_MANAGER: ['dashboard','withdrawals','commission_ledger','tier_promo'],
  FINANCE_DIRECTOR: ['dashboard','withdrawals','financial'],
};

const SP_ROLE_PERMISSIONS_KEY = 'SP_ROLE_PERMISSIONS';

function loadPermissions(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SP_ROLE_PERMISSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...DEFAULT_PERMISSIONS };
}

export const RolePermissionsView: React.FC<{ currentUserRole: string }> = ({ currentUserRole }) => {
  const [perms, setPerms] = useState<Record<string, string[]>>(loadPermissions);
  const [saved, setSaved] = useState(false);

  if (currentUserRole !== UserRole.MASTER_ADMIN) {
    return (
      <div className="p-8 text-center text-ds-ink3 font-bold text-sm">
        Hanya MASTER_ADMIN yang dapat mengakses konfigurasi ini.
      </div>
    );
  }

  const toggle = (role: string, menuId: string) => {
    setPerms(prev => {
      const current = prev[role] ?? [];
      const next = current.includes(menuId)
        ? current.filter(id => id !== menuId)
        : [...current, menuId];
      return { ...prev, [role]: next };
    });
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(SP_ROLE_PERMISSIONS_KEY, JSON.stringify(perms));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setPerms({ ...DEFAULT_PERMISSIONS });
    localStorage.removeItem(SP_ROLE_PERMISSIONS_KEY);
    setSaved(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black uppercase tracking-widest text-sm">Konfigurasi Akses Menu Per Role</h3>
          <p className="text-[0.55rem] font-bold text-ds-ink3 uppercase tracking-widest mt-1">Centang menu yang boleh diakses oleh setiap role</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-ds-card2 border border-ds-border text-ds-ink3 rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-ds-card2 transition-all"
          >
            Reset Default
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-2xl font-black uppercase text-[0.6rem] tracking-widest transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            {saved ? 'Tersimpan!' : 'Simpan'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ds-border">
        <table className="w-full text-left whitespace-nowrap min-w-[900px]">
          <thead>
            <tr className="border-b border-ds-border text-[0.5rem] font-black uppercase text-ds-ink3 tracking-[0.2em]">
              <th className="py-3 pl-5 pr-4 sticky left-0 bg-ds-card">Menu</th>
              {CONFIGURABLE_ROLES.map(role => (
                <th key={role} className="py-3 px-3 text-center">
                  {role.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MENU_IDS.map(menu => (
              <tr key={menu.id} className="border-b border-ds-border hover:bg-ds-card2 transition-colors">
                <td className="py-2.5 pl-5 pr-4 text-[0.65rem] font-bold text-ds-ink2 sticky left-0 bg-ds-card">
                  {menu.label}
                </td>
                {CONFIGURABLE_ROLES.map(role => {
                  const checked = (perms[role] ?? []).includes(menu.id);
                  return (
                    <td key={role} className="py-2.5 px-3 text-center">
                      <label className="inline-flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(role, menu.id)}
                          className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SettingsView = ({ products, setProducts, currentUserRole }: { products: any[], setProducts: any, currentUserRole?: string }) => {
  const toast = useToast();
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', type: 'INSURANCE', basePremium: 100000, rate: 0.05, description: '' });

  useEffect(() => {
    db.customProducts.toArray().then(setCustomProducts).catch(e => {
      console.error('customProducts load error:', e);
      setCustomProducts([]);
    });
  }, []);

  const handleAddCustomProduct = async () => {
    if (!newProduct.name) {
      toast.error('Nama produk wajib diisi');
      return;
    }
    try {
      await db.customProducts.add({ ...newProduct, isActive: true });
      setNewProduct({ name: '', type: 'INSURANCE', basePremium: 100000, rate: 0.05, description: '' });
      const list = await db.customProducts.toArray();
      setCustomProducts(list);
      toast.success('Produk kustom ditambahkan');
    } catch (e: any) {
      console.error('handleAddCustomProduct:', e);
      toast.error(`Gagal menambah produk: ${e.message ?? e}`);
    }
  };

  const toggleProduct = (id: string) => {
    setProducts(products.map((p: any) => p.id === id ? { ...p, active: !p.active } : p));
  };

  const toggleCustomProduct = async (product: CustomProduct) => {
    try {
      await db.customProducts.update(product.id!, { isActive: !product.isActive });
      const list = await db.customProducts.toArray();
      setCustomProducts(list);
    } catch (e: any) {
      console.error('toggleCustomProduct:', e);
      toast.error(`Gagal toggle produk: ${e.message ?? e}`);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error) {
        console.error('FileReader error:', reader.error);
        toast.error(`Gagal membaca file: ${reader.error.message}`);
        return;
      }
      try {
        localStorage.setItem('surepath_custom_logo', reader.result as string);
        window.dispatchEvent(new Event('logo-updated'));
        toast.success('Logo berhasil diupload');
      } catch (e: any) {
        console.error('localStorage.setItem error:', e);
        if (e?.name === 'QuotaExceededError') {
          toast.error('Storage penuh. Logo terlalu besar — gunakan < 1MB.');
        } else {
          toast.error(`Gagal simpan logo: ${e.message ?? e}`);
        }
      }
    };
    reader.onerror = () => {
      toast.error('Gagal membaca file gambar');
    };
    reader.readAsDataURL(file);
  };

  // Ensure default products is an array to fix map issue
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="space-y-8 animate-fade-in text-white pb-32">
       <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-ds-green"><Settings size={22}/></div>
          <h3 className="font-black uppercase tracking-widest text-sm">Konfigurasi Sistem</h3>
       </div>

       <div className="grid gap-4">
          <Card className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-ds-card2 text-ds-ink3`}><Upload size={24}/></div>
              <div>
                <p className="font-black uppercase text-sm">Logo Perusahaan</p>
                <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">Update Logo Platform (Maks 2MB)</p>
              </div>
            </div>
            <label className="cursor-pointer px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all bg-ds-card2 hover:bg-white/20 text-white">
              Pilih File
              <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            </label>
          </Card>

          <BackupView />
       </div>

       <div className="grid gap-4 mt-8">
          <h3 className="font-black uppercase tracking-widest text-xs text-ds-ink3 mb-2">Tambah Produk Baru</h3>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Nama Produk (Cth: Asuransi Gempa)" 
                className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              />
              <select 
                className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono [&>option]:bg-ds-card"
                value={newProduct.type}
                onChange={e => setNewProduct({...newProduct, type: e.target.value})}
              >
                <option value="INSURANCE">Standard Insurance</option>
                <option value="SERVICES">Additional Services</option>
              </select>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ds-ink3 font-mono">Rp</span>
                 <input 
                   type="number" 
                   placeholder="Basic Premium" 
                   className="w-full bg-ds-card2 border border-ds-border rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                   value={newProduct.basePremium}
                   onChange={e => setNewProduct({...newProduct, basePremium: Number(e.target.value)})}
                 />
              </div>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ds-ink3 font-mono">% Rate</span>
                 <input 
                   type="number" 
                   step="0.01"
                   placeholder="Multiplier Rate (e.g. 0.05)" 
                   className="w-full bg-ds-card2 border border-ds-border rounded-xl pl-20 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                   value={newProduct.rate}
                   onChange={e => setNewProduct({...newProduct, rate: Number(e.target.value)})}
                 />
              </div>
              <input 
                type="text" 
                placeholder="Deskripsi Singkat" 
                className="w-full md:col-span-2 bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                value={newProduct.description}
                onChange={e => setNewProduct({...newProduct, description: e.target.value})}
              />
            </div>
            <div className="mt-4 flex justify-end">
               <button 
                 onClick={handleAddCustomProduct}
                 className="flex items-center gap-2 px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all bg-emerald-500 text-white shadow-emerald-500/20 shadow-xl hover:bg-emerald-600 active:scale-95"
               >
                 <Plus size={16}/> SIMPAN PRODUK
               </button>
            </div>
          </Card>
       </div>

       {customProducts.length > 0 && (
         <div className="grid gap-4 mt-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-ds-ink3 mb-2">Daftar Produk Tambahan</h3>
            {customProducts.map(p => (
              <Card key={p.id} className="flex items-center justify-between py-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-ds-green`}><FileText size={24}/></div>
                  <div>
                    <p className="font-black uppercase text-sm">{p.name}</p>
                    <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">Rate: {(p.rate || 0) * 100}% | Premium {formatIDR(p.basePremium)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleCustomProduct(p)}
                  className={`px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${p.isActive ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}
                >
                  {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </Card>
            ))}
         </div>
       )}

       <div className="grid gap-4 mt-8">
          <h3 className="font-black uppercase tracking-widest text-xs text-ds-ink3 mb-2">Manajemen Modul Platform</h3>
          {safeProducts.map(p => (
            <Card key={p.id} className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-ds-card2 ${p.color}`}><p.icon size={24}/></div>
                <div>
                  <p className="font-black uppercase text-sm">{p.label}</p>
                  <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">{p.active ? 'Modul Aktif' : 'Modul Dinonaktifkan'}</p>
                </div>
              </div>
              <button
                onClick={() => toggleProduct(p.id)}
                className={`px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${p.active ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}
              >
                {p.active ? 'Shut Down' : 'Initialize'}
              </button>
            </Card>
          ))}
       </div>

       {/* Role Permissions sub-section — only shown to MASTER_ADMIN */}
       {currentUserRole === UserRole.MASTER_ADMIN && (
         <div className="mt-8 space-y-4">
           <h3 className="font-black uppercase tracking-widest text-xs text-ds-ink3 mb-2">Konfigurasi Akses Role</h3>
           <RolePermissionsView currentUserRole={currentUserRole} />
         </div>
       )}
    </div>
  );
};

// ── Bulk Import Modal ────────────────────────────────────────────────────────

interface BulkImportRow {
  name: string;
  email: string;
  phone: string;
  upline_code: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const parseCSV = (text: string): BulkImportRow[] => {
  const lines = text.trim().split('\n').filter(l => l.trim());
  return lines.map(line => {
    const [name, email, phone, upline_code] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    return { name: name || '', email: email || '', phone: phone || '', upline_code: upline_code || '', status: 'pending' };
  });
};

interface BulkImportModalProps {
  onClose: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose }) => {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState(false);

  const handleParse = () => {
    if (!csvText.trim()) return;
    setRows(parseCSV(csvText));
    setProgress(null);
    setDone(false);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    const updated = [...rows];
    let successCount = 0;
    setProgress({ done: 0, total: rows.length });

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (!row.name || !row.email || !row.phone) {
        updated[i] = { ...row, status: 'error', error: 'name/email/phone wajib diisi' };
      } else {
        try {
          const result = await registerAgent({ name: row.name, email: row.email, phone: row.phone });
          if (result) {
            updated[i] = { ...row, status: 'success' };
            successCount++;
          } else {
            updated[i] = { ...row, status: 'error', error: 'Gagal menyimpan' };
          }
        } catch (err: any) {
          updated[i] = { ...row, status: 'error', error: err?.message ?? 'Error' };
        }
      }
      setRows([...updated]);
      setProgress({ done: i + 1, total: rows.length });
    }

    setImporting(false);
    setDone(true);
  };

  const successCount = rows.filter(r => r.status === 'success').length;
  const errorCount   = rows.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={importing ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-ds-card border border-ds-border rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-3">
            <Upload size={18} className="text-blue-400" />
            Impor Mitra dari CSV/Excel
          </h3>
          {!importing && (
            <button onClick={onClose} className="text-ds-ink3 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest mb-4">
          Format kolom: name, email, phone, upline_code (opsional)
        </p>

        {/* Textarea */}
        {!done && (
          <>
            <textarea
              className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition-all resize-none mb-3"
              rows={6}
              placeholder={"Budi Santoso,budi@email.com,08123456789,SP-AGT-0001\nSiti Rahma,siti@email.com,08234567890,"}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              disabled={importing}
            />
            <button
              onClick={handleParse}
              disabled={!csvText.trim() || importing}
              className="px-5 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-ds-card2 text-ds-ink2 hover:bg-white/20 hover:text-white transition-all disabled:opacity-40 mb-5"
            >
              Parse CSV
            </button>
          </>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="space-y-4">
            <p className="text-[0.55rem] font-black uppercase tracking-widest text-ds-ink3">
              Preview — {rows.length} baris
            </p>
            <div className="overflow-x-auto rounded-xl border border-ds-border">
              <table className="w-full text-[0.6rem]">
                <thead>
                  <tr className="text-[0.5rem] font-black uppercase tracking-widest text-ds-ink3 border-b border-ds-border">
                    <th className="py-2.5 px-3 text-left">Nama</th>
                    <th className="py-2.5 px-3 text-left">Email</th>
                    <th className="py-2.5 px-3 text-left">Phone</th>
                    <th className="py-2.5 px-3 text-left">Upline</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-ds-card2">
                      <td className="py-2 px-3 text-white font-bold">{row.name || <span className="text-rose-400">—</span>}</td>
                      <td className="py-2 px-3 text-ds-ink3 font-mono">{row.email || <span className="text-rose-400">—</span>}</td>
                      <td className="py-2 px-3 text-ds-ink3 font-mono">{row.phone || <span className="text-rose-400">—</span>}</td>
                      <td className="py-2 px-3 text-ds-ink3">{row.upline_code || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        {row.status === 'pending' && <span className="text-ds-ink3">—</span>}
                        {row.status === 'success' && <span className="text-emerald-400 font-black">OK</span>}
                        {row.status === 'error' && (
                          <span className="text-rose-400 font-black" title={row.error}>ERR</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Progress */}
            {progress && (
              <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">
                {progress.done}/{progress.total} diproses
                {done && ` — ${successCount} berhasil, ${errorCount} gagal`}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {!done ? (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {importing ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {importing ? 'Mengimpor...' : 'Import'}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl transition-all active:scale-95"
                >
                  <CheckCircle size={14} />
                  Selesai — {successCount}/{rows.length} berhasil
                </button>
              )}
              {!importing && !done && (
                <button
                  onClick={onClose}
                  className="px-5 py-3 bg-ds-card2 text-ds-ink3 rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-ds-card2 transition-all"
                >
                  Batal
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Agent Management View ────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected', CLOSED: 'Closed',
};
const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/10 text-amber-400',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-400',
  REJECTED: 'bg-rose-500/10 text-rose-400',
  CLOSED: 'bg-ds-card2 text-ds-ink3',
};

export const AgentManagementView = () => {
  const [agents, setAgents] = useState<SpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRate, setEditRate] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [pendingTierAgentIds, setPendingTierAgentIds] = useState<Set<string>>(new Set());
  const { tiers } = useTierDefinitions();
  const toast = useToast();

  const adminRole: string = (() => {
    try { return JSON.parse(sessionStorage.getItem('SUREPATH_SESSION') ?? '{}')?.role ?? ''; }
    catch { return ''; }
  })();

  const canAssignTier = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER].includes(adminRole as UserRole);

  useEffect(() => {
    getAllAgents().then(data => { setAgents(data); setLoading(false); });
    getTierChangeRequests('PENDING').then(reqs => setPendingTierAgentIds(new Set(reqs.map(r => r.agent_id))));
  }, []);

  const handleVerify = async (agentId: string, verified: boolean) => {
    setSaving(agentId);
    await updateAgentVerification(agentId, verified);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, verified } : a));
    setSaving(null);
  };

  const handleRateUpdate = async (agentId: string) => {
    const rate = parseFloat(editRate[agentId] ?? '');
    if (isNaN(rate) || rate < 0 || rate > 1) return;
    setSaving(agentId);
    await updateAgentCommissionRate(agentId, rate);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, commission_rate: rate } as SpUser : a));
    setEditRate(prev => { const n = { ...prev }; delete n[agentId]; return n; });
    setSaving(null);
  };

  const handleTierChange = async (agentId: string, tierCode: string) => {
    setSaving(agentId + '_tier');
    const result = await updateAgentTier(agentId, tierCode);
    setSaving(null);
    if (!result.success) { toast.error(result.error ?? 'Gagal mengubah tier'); return; }
    if (result.pending) {
      setPendingTierAgentIds(prev => new Set(prev).add(agentId));
      toast.success('Perubahan tier menunggu persetujuan level atas');
    } else {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, tier: tierCode } : a));
      toast.success('Tier agen diperbarui');
    }
  };

  const handleEvaluateTier = async (agentId: string) => {
    setSaving(agentId + '_tier');
    const res = await evaluateAgentTier(agentId, true);
    setSaving(null);
    if (res.error) { toast.error(res.error); return; }
    if (res.pending) {
      setPendingTierAgentIds(prev => new Set(prev).add(agentId));
      toast.success('Tier hasil evaluasi menunggu persetujuan level atas');
    } else if (res.data?.tier) {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, tier: res.data.tier } : a));
      toast.success(`Tier diperbarui ke ${res.data.tier}`);
    } else {
      toast.success('Tier agen sudah sesuai hasil evaluasi');
    }
  };

  const pending = agents.filter(a => !(a as any).verified);
  const active  = agents.filter(a => (a as any).verified);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
    </div>
  );

  const TierBadge: React.FC<{ tier?: string | null }> = ({ tier }) => {
    const cfg = getTierByCode(tiers, tier);
    if (!cfg || cfg.is_default) return null;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-widest"
        style={{ background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}
      >
        {cfg.emoji} {cfg.name}
      </span>
    );
  };

  const AgentRow: React.FC<{ a: SpUser }> = ({ a }) => {
    const verified = !!(a as any).verified;
    const rate     = (a as any).commission_rate ?? 0.1;
    const editing  = editRate[a.id] !== undefined;
    const agentTier = a.tier ?? null;
    const isSavingTier = saving === a.id + '_tier';

    return (
      <Card key={a.id} className="py-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Avatar + info — click to view full profile */}
          <button
            type="button"
            onClick={() => setSelectedAgentId(a.id)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-ds-green flex items-center justify-center font-black text-sm flex-shrink-0 overflow-hidden">
              {a.profile_photo_url ? (
                <img loading="lazy" src={a.profile_photo_url} alt={a.name} className="w-full h-full object-cover" />
              ) : (
                a.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-sm truncate">{a.name}</p>
                <TierBadge tier={agentTier} />
              </div>
              <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest truncate">{a.email}</p>
              <p className="text-[0.6rem] font-bold text-ds-green uppercase tracking-widest">{a.agent_code ?? '-'} · <span className="text-ds-green/70">Lihat detail →</span></p>
              {(a as any).agreement_no ? (
                <p className="mt-1 text-[0.62rem] font-semibold text-ds-ink2">
                  <span className="text-ds-ink3">No. Perjanjian:</span> <span className="font-mono text-ds-green">{(a as any).agreement_no}</span>
                  {(a as any).agreement_accepted_at && <span className="ml-2 text-ds-ink3">{new Date((a as any).agreement_accepted_at).toLocaleDateString('id-ID')}</span>}
                </p>
              ) : (
                <p className="mt-1 text-[0.58rem] text-ds-ink3">Perjanjian belum tercatat</p>
              )}
            </div>
          </button>

          {/* Tier selector — business manager only */}
          {canAssignTier && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {pendingTierAgentIds.has(a.id) && (
                <span className="px-2 py-1 rounded-lg text-[0.55rem] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400">
                  Menunggu Persetujuan
                </span>
              )}
              {isSavingTier ? (
                <span className="text-[0.6rem] text-ds-ink3">…</span>
              ) : (
                <select
                  value={agentTier ?? ''}
                  onChange={e => e.target.value && handleTierChange(a.id, e.target.value)}
                  className="bg-ds-card2 border border-ds-border rounded-xl px-2 py-1.5 text-[0.6rem] font-black uppercase tracking-widest text-ds-ink2 focus:outline-none"
                >
                  {tiers.map(tier => (
                    <option key={tier.code} value={tier.code}>{tier.emoji ? `${tier.emoji} ` : ''}{tier.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => handleEvaluateTier(a.id)}
                disabled={isSavingTier}
                title="Evaluasi tier otomatis dari jumlah polis & premi"
                className="w-7 h-7 rounded-lg bg-ds-card2 text-ds-ink3 hover:bg-ds-card2 flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              >
                <Sparkles size={12} />
              </button>
            </div>
          )}

          {/* Commission rate editor */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <input
                  type="number"
                  step="0.01" min="0" max="1"
                  value={editRate[a.id]}
                  onChange={e => setEditRate(prev => ({ ...prev, [a.id]: e.target.value }))}
                  className="w-24 bg-ds-card2 border border-ds-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  disabled={saving === a.id}
                  onClick={() => handleRateUpdate(a.id)}
                  className="px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-emerald-500 text-white"
                >
                  {saving === a.id ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditRate(prev => { const n = { ...prev }; delete n[a.id]; return n; })}
                  className="px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-ds-card2 text-ds-ink3"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditRate(prev => ({ ...prev, [a.id]: String(rate) }))}
                className="px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-ds-card2 text-ds-ink3 hover:text-white hover:bg-ds-card2 transition-colors"
              >
                Rate: {(rate * 100).toFixed(0)}%
              </button>
            )}
          </div>

          {/* Verify/Reject button */}
          <button
            disabled={saving === a.id}
            onClick={() => handleVerify(a.id, !verified)}
            className={`px-6 py-2.5 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex-shrink-0 ${
              verified
                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
            }`}
          >
            {saving === a.id ? '…' : verified ? 'Revoke' : 'Approve'}
          </button>
        </div>
      </Card>
    );
  };

  const tierCounts = tiers
    .filter(tier => !tier.is_default)
    .map(tier => ({ label: tier.name, value: agents.filter(a => a.tier === tier.code).length, color: 'text-amber-400' }));

  return (
    <div className="space-y-8 animate-fade-in">
      {selectedAgentId && <UserDetailModal userId={selectedAgentId} onClose={() => setSelectedAgentId(null)} />}
      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} />}

      {/* Header actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowBulkImport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
        >
          <Upload size={14} />
          Bulk Import
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Mitra',  value: agents.length, color: 'text-white' },
          { label: 'Aktif',        value: active.length, color: 'text-emerald-400' },
          { label: 'Pending',      value: pending.length, color: 'text-amber-400' },
          ...tierCounts,
        ].map(({ label, value, color }) => (
          <Card key={label} className="py-5 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[0.55rem] font-bold text-ds-ink3 uppercase tracking-widest mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-amber-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            Pending Approval ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(a => <AgentRow key={a.id} a={a} />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-black uppercase tracking-widest text-xs text-ds-ink3 mb-4">
          Mitra Aktif ({active.length})
        </h3>
        {active.length === 0 ? (
          <Card className="text-center py-10 text-ds-ink3 text-sm font-bold">Belum ada agen aktif.</Card>
        ) : (
          <div className="space-y-3">
            {active.map(a => <AgentRow key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Claims Admin View ────────────────────────────────────────────────────────

export const ClaimsAdminView = () => {
  const [claims, setClaims] = useState<SpClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedClaim, setSelectedClaim] = useState<SpClaim | null>(null);

  useEffect(() => {
    getAllClaims().then(data => { setClaims(data); setLoading(false); });
  }, []);

  const handleStatus = async (id: string, status: SpClaim['status']) => {
    await import('../../services/supabaseService').then(m => m.updateClaimStatus(id, status));
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const needsReview = (c: SpClaim) => (c as any).ai_fraud_verdict === 'REVIEW_REQUIRED' || (c as any).ai_fraud_verdict === 'REJECTED';
  const visible = filter === 'ALL' ? claims : filter === 'NEEDS_REVIEW' ? claims.filter(needsReview) : claims.filter(c => c.status === filter);
  const needsReviewCount = claims.filter(needsReview).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          claims={claims}
          onClose={() => setSelectedClaim(null)}
          onSelectClaim={c => setSelectedClaim(c)}
        />
      )}
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[0.6rem] font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-emerald-500 text-white' : 'bg-ds-card2 text-ds-ink3 hover:bg-ds-card2'
            }`}
          >
            {f === 'ALL' ? 'All' : STATUS_LABEL[f] ?? f}
            {f === 'ALL' ? ` (${claims.length})` : ` (${claims.filter(c => c.status === f).length})`}
          </button>
        ))}
        {needsReviewCount > 0 && (
          <button
            onClick={() => setFilter('NEEDS_REVIEW')}
            className={`px-4 py-2 rounded-full text-[0.6rem] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              filter === 'NEEDS_REVIEW' ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <ShieldAlert size={12} /> Needs Review ({needsReviewCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="text-center py-12 text-ds-ink3 text-sm font-bold">No claims found.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map(claim => {
            const fraudVerdict = (claim as any).ai_fraud_verdict as string | undefined;
            const fraudMeta = fraudVerdict ? CLAIM_FRAUD_VERDICT_META[fraudVerdict] : null;
            return (
            <Card key={claim.id} className="py-5 cursor-pointer" onClick={() => setSelectedClaim(claim)}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-black text-sm">{claim.client_name ?? '—'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[0.5rem] font-black uppercase tracking-widest ${STATUS_COLOR[claim.status] ?? 'bg-ds-card2 text-ds-ink3'}`}>
                      {STATUS_LABEL[claim.status] ?? claim.status}
                    </span>
                    {fraudMeta && (
                      <span className={`px-2 py-0.5 rounded-full text-[0.5rem] font-black uppercase tracking-widest border flex items-center gap-1 ${fraudMeta.color}`}>
                        <fraudMeta.Icon size={10} /> {(claim as any).ai_fraud_score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest">
                    {claim.claim_number ?? '-'} · {claim.product_type ?? '-'} · {claim.date ?? '-'}
                  </p>
                  {claim.location && (
                    <p className="text-xs text-ds-ink3 mt-1 truncate">{claim.location}</p>
                  )}
                  {claim.amount_estimated && (
                    <p className="text-xs font-bold text-ds-green mt-1">Est: {formatIDR(claim.amount_estimated)}</p>
                  )}
                </div>
                {/* Quick status actions */}
                <div className="flex gap-2 flex-wrap flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {claim.status === 'SUBMITTED' && (
                    <button
                      onClick={() => handleStatus(claim.id, 'UNDER_REVIEW')}
                      className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      Review
                    </button>
                  )}
                  {(claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW') && (
                    <>
                      <button
                        onClick={() => handleStatus(claim.id, 'APPROVED')}
                        className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatus(claim.id, 'REJECTED')}
                        className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {claim.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStatus(claim.id, 'CLOSED')}
                      className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-ds-card2 text-ds-ink3 hover:bg-ds-card2 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── User Management View ─────────────────────────────────────────────────────

type UserWithActive = User & { isActive?: boolean };

const ROLE_FILTERS = ['All', 'MASTER_ADMIN', 'ADMIN', 'FINANCE', 'INSURANCE_ADMIN', 'AGENT', 'CUSTOMER', 'B2B_CLIENT'] as const;

const ROLE_COLOR: Record<string, string> = {
  MASTER_ADMIN: 'rose',
  ADMIN: 'primary',
  FINANCE: 'blue',
  INSURANCE_ADMIN: 'indigo',
  AGENT: 'yellow',
  CUSTOMER: 'emerald',
  B2B_CLIENT: 'indigo',
};

export const UserManagementView = () => {
  const toast = useToast();
  const [users, setUsers] = useState<UserWithActive[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editAppsId, setEditAppsId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.ADMIN as UserRole });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const result = await callGateway('admin_list_users', { limit: 500 });
      const rows = (result as any)?.data ?? [];
      setUsers(rows.map((u: any) => ({
        ...u,
        isActive: !u.is_suspended,
        memberSince: u.created_at,
      })));
    } catch (e: any) {
      setLoadError(e?.message ?? 'Gagal memuat data user');
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (u: UserWithActive, newRole: UserRole) => {
    if (!u.id) return;
    try {
      await callGateway('admin_update_user', { user_id: u.id, role: newRole });
      setEditRoleId(null);
      toast.success(`Role ${u.name} → ${newRole}`);
      load();
    } catch (e: any) {
      toast.error(`Gagal ganti role: ${e?.message ?? e}`);
      setEditRoleId(null);
    }
  };

  // ── Multi-app access toggle ─────────────────────────────────────────────
  // Toggles an app in the user's allowed_apps array. Persists to sp_users
  // via gateway. Multi-app users see the AppSelector screen on next login.
  const handleAppToggle = async (u: UserWithActive, app: string, checked: boolean) => {
    if (!u.id) return;
    const current: string[] = Array.isArray((u as any).allowed_apps) ? (u as any).allowed_apps : (u.role ? [u.role] : []);
    let next: string[];
    if (checked) {
      if (current.includes(app)) return; // already there
      next = [...current, app];
    } else {
      if (current.length <= 1) {
        toast.error('Minimal 1 app harus aktif');
        return;
      }
      next = current.filter(a => a !== app);
    }
    // Optimistic update
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, allowed_apps: next } as any : x));
    try {
      await callGateway('admin_update_user', { user_id: u.id, allowed_apps: next });
      toast.success(`${u.name}: ${next.join(', ')}`);
    } catch (e: any) {
      toast.error(`Gagal update apps: ${e?.message ?? e}`);
      // Rollback
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, allowed_apps: current } as any : x));
    }
  };

  const handleToggleActive = async (u: UserWithActive) => {
    if (!u.id) return;
    const isActive = u.isActive !== false;
    try {
      // Note: production sp_users has no is_suspended column — this will fail
      // gracefully. The column exists in dbTypes.ts but not in live schema.
      await callGateway('admin_update_user', { user_id: u.id, is_suspended: isActive });
      toast.success(`${u.name} ${isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      load();
    } catch (e: any) {
      toast.error(`Gagal toggle status: ${e?.message ?? e}`);
    }
  };

  const handleAddUser = async () => {
    setAddError(null);
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setAddError('Nama dan email wajib diisi.');
      return;
    }
    setAddLoading(true);
    try {
      await callGateway('admin_invite_user', {
        email: newUser.email.trim(),
        name: newUser.name.trim(),
        role: newUser.role,
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', role: UserRole.ADMIN });
      load();
    } catch (e: any) {
      setAddError(e?.message ?? 'Gagal mengirim undangan.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {selectedUserId && <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
      {loadError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-bold">{loadError}</div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Kelola <span className="text-ds-green">User</span></h2>
          <p className="text-[0.6rem] font-bold text-ds-ink3 uppercase tracking-widest mt-1">{users.length} User Terdaftar</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-3 bg-ds-card2 border border-ds-border text-ds-ink3 hover:text-white hover:bg-ds-card2 rounded-2xl font-black uppercase text-[0.6rem] tracking-widest transition-all active:scale-95"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl transition-all active:scale-95"
          >
            <UserPlus size={16} /> Tambah Admin
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-ink3" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-ds-card2 border border-ds-border rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map(rf => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
                roleFilter === rf ? 'bg-emerald-500 text-white' : 'bg-ds-card2 text-ds-ink3 hover:bg-ds-card2'
              }`}
            >
              {rf === 'All' ? 'All' : rf.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="border-b border-ds-border text-[0.55rem] font-black uppercase text-ds-ink3 tracking-[0.2em]">
                <th className="py-4 pl-6">Nama</th>
                <th className="py-4">Email</th>
                <th className="py-4">Role</th>
                <th className="py-4">Apps</th>
                <th className="py-4">Status</th>
                <th className="py-4">Member Sejak</th>
                <th className="py-4 text-center">T&amp;C</th>
                <th className="py-4 text-right pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.slice(0, 100).map(u => {
                const isActive = u.isActive !== false;
                const isEditingRole = editRoleId === u.id;
                const isEditingApps = editAppsId === u.id;
                const userAllowedApps: string[] = Array.isArray((u as any).allowed_apps) ? (u as any).allowed_apps : (u.role ? [u.role] : []);
                return (
                  <tr key={u.id} className="border-b border-ds-border hover:bg-ds-card2 transition-colors">
                    <td className="py-3.5 pl-6">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs flex-shrink-0 overflow-hidden">
                          {(u as any).profile_photo_url ? (
                            <img loading="lazy" src={(u as any).profile_photo_url} alt={u.name} className="w-full h-full object-cover" />
                          ) : (u.name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span className="font-bold text-white truncate max-w-[140px]">{u.name}</span>
                      </button>
                    </td>
                    <td className="py-3.5 font-mono text-[0.65rem] text-ds-ink3">{u.email}</td>
                    <td className="py-3.5">
                      {isEditingRole ? (
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={u.role}
                            onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                            className="bg-ds-card border border-ds-border rounded-lg px-2 py-1.5 text-[0.6rem] font-black uppercase text-white focus:outline-none focus:border-emerald-500 [&>option]:bg-ds-card"
                            autoFocus
                            onBlur={() => setEditRoleId(null)}
                          >
                            {Object.values(UserRole).map(r => (
                              <option key={r} value={r}>{r.replace('_', ' ')}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="text-ds-ink3" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge color={ROLE_COLOR[u.role] ?? 'primary'}>{u.role.replace('_', ' ')}</Badge>
                          <button
                            onClick={() => setEditRoleId(u.id)}
                            className="p-1 text-ds-ink2 hover:text-emerald-400 transition-colors"
                            title="Edit Role"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5">
                      {isEditingApps ? (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {['CUSTOMER', 'AGENT', 'OPERATOR', 'ADMIN'].map(app => {
                            const checked = userAllowedApps.includes(app);
                            return (
                              <label key={app} className="flex items-center gap-1 text-[0.55rem] font-bold uppercase cursor-pointer bg-ds-card2 px-1.5 py-0.5 rounded">
                                <input
                                  type="checkbox"
                                  defaultChecked={checked}
                                  onChange={e => handleAppToggle(u, app, e.target.checked)}
                                  className="w-2.5 h-2.5 accent-emerald-500"
                                />
                                {app}
                              </label>
                            );
                          })}
                          <button
                            onClick={() => setEditAppsId(null)}
                            className="text-[0.55rem] font-black text-emerald-400 hover:text-emerald-300 ml-1"
                          >Done</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditAppsId(u.id)}
                          className="flex items-center gap-1 flex-wrap max-w-[180px] hover:opacity-80 transition-opacity"
                          title="Edit Apps Access"
                        >
                          {userAllowedApps.length === 0 ? (
                            <span className="text-[0.6rem] text-ds-ink3 italic">— none —</span>
                          ) : (
                            userAllowedApps.map(app => (
                              <span key={app} className="text-[0.5rem] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                                {app}
                              </span>
                            ))
                          )}
                          <Pencil size={10} className="text-ds-ink2 hover:text-emerald-400 transition-colors" />
                        </button>
                      )}
                    </td>
                    <td className="py-3.5">
                      <Badge color={isActive ? 'emerald' : 'rose'}>{isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                    </td>
                    <td className="py-3.5 text-[0.6rem] text-ds-ink3 font-mono">
                      {u.memberSince ? new Date(u.memberSince).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-3.5 text-center">
                      {(u as any).tc_accepted ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-emerald-400 font-black text-[0.6rem]">
                            ✓ {(u as any).tc_accepted_at ? new Date((u as any).tc_accepted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Diterima'}
                          </span>
                          {(u as any).tnc_ref_number && (
                            <span className="text-[0.5rem] font-mono text-ds-ink3" title={(u as any).tnc_ref_number}>
                              {(u as any).tnc_ref_number}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ds-ink2">–</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right pr-6">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-3 py-1.5 rounded-xl text-[0.55rem] font-black uppercase tracking-widest transition-all ${
                          isActive
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p className="text-center text-[0.6rem] text-ds-ink3 font-bold uppercase tracking-widest py-4">
              Menampilkan 100 dari {filtered.length} user. Gunakan filter/pencarian.
            </p>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-[0.7rem] text-ds-ink2 font-bold py-10">Tidak ada user ditemukan.</p>
          )}
        </div>
      </Card>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-ds-card border border-ds-border rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
              <UserPlus size={18} className="text-ds-green" /> Tambah Admin Baru
            </h3>
            {addError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold">{addError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-[0.55rem] font-black text-ds-ink3 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Cth: Budi Santoso"
                  className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.55rem] font-black text-ds-ink3 uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="admin@surepath.id"
                  className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.55rem] font-black text-ds-ink3 uppercase tracking-widest mb-1.5">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full bg-ds-card2 border border-ds-border rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all [&>option]:bg-ds-card"
                >
                  {Object.values(UserRole).map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); }}
                className="flex-1 py-3 bg-ds-card2 text-ds-ink3 rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-ds-card2 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAddUser}
                disabled={addLoading}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-emerald-600 shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addLoading ? 'Mengirim...' : 'Kirim Undangan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PaymentsAdminView = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL'|'PAID'|'PENDING'|'EXPIRED'>('ALL');

    const loadPayments = useCallback(async () => {
        setLoading(true);
        const data = await getAdminPayments(200);
        if (data.length >= 0) {
            setPayments(data.map((p: any) => ({
                ...p,
                order_number: p.order_number ?? p.sp_policy_orders?.order_number,
                client_name: p.client_name ?? p.sp_policy_orders?.client_name,
                product_name: p.product_name ?? p.sp_policy_orders?.product_name,
            })));
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadPayments(); }, [loadPayments]);

    const filtered = filter === 'ALL' ? payments : payments.filter(p => p.status === filter);
    const totalPaid    = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.paid_amount ?? p.amount ?? 0), 0);
    const totalPending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + (p.amount ?? 0), 0);
    const countExpired = payments.filter(p => p.status === 'EXPIRED').length;

    const statusColor = (s: string) => ({
        PAID:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        EXPIRED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    }[s] ?? 'bg-slate-500/10 text-ds-ink3 border-slate-500/20');

    const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'2-digit' }) : '-';

    return (
        <div className="space-y-8 animate-fade-in text-white">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Pembayaran <span className="text-ds-green">Xendit</span></h2>
                    <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3 mt-1">Semua transaksi invoice dari gateway Xendit</p>
                </div>
                <button onClick={loadPayments} className="flex items-center gap-2 px-4 py-2.5 bg-ds-card2 border border-ds-border rounded-2xl text-[9px] font-black uppercase tracking-widest text-ds-ink3 hover:text-white transition-colors">
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-ds-green">Total Terbayar</p>
                    <p className="text-2xl font-black">{formatIDR(totalPaid)}</p>
                    <p className="text-[9px] text-ds-ink3">{payments.filter(p => p.status === 'PAID').length} transaksi PAID</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-ds-amber">Invoice Pending</p>
                    <p className="text-2xl font-black">{formatIDR(totalPending)}</p>
                    <p className="text-[9px] text-ds-ink3">{payments.filter(p => p.status === 'PENDING').length} invoice aktif</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-[2rem] p-6 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Kadaluarsa</p>
                    <p className="text-2xl font-black">{countExpired}</p>
                    <p className="text-[9px] text-ds-ink3">invoice expired</p>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
                {(['ALL', 'PAID', 'PENDING', 'EXPIRED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                            filter === f ? 'bg-emerald-500 text-white shadow-md' : 'bg-ds-card2 text-ds-ink3 hover:text-white border border-ds-border'
                        }`}
                    >
                        {f === 'ALL' ? `Semua (${payments.length})` : `${f} (${payments.filter(p => p.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-ds-card2 border border-ds-border rounded-[2rem] overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[900px]">
                            <thead>
                                <tr className="text-ds-ink3 text-[9px] font-black uppercase tracking-widest border-b border-ds-border">
                                    <th className="px-6 py-4 text-left">Tanggal</th>
                                    <th className="px-4 py-4 text-left">Order #</th>
                                    <th className="px-4 py-4 text-left">Klien</th>
                                    <th className="px-4 py-4 text-left">Produk</th>
                                    <th className="px-4 py-4 text-right">Jumlah</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                    <th className="px-4 py-4 text-left">Metode</th>
                                    <th className="px-4 py-4 text-left">Bayar Tgl</th>
                                    <th className="px-6 py-4 text-left">Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-ds-ink2 font-bold text-sm">
                                            Tidak ada data pembayaran.
                                        </td>
                                    </tr>
                                ) : filtered.map(p => (
                                    <tr key={p.id} className="border-b border-ds-border hover:bg-ds-card2 transition-colors">
                                        <td className="px-6 py-3 text-ds-ink3 whitespace-nowrap text-[10px]">{fmtDate(p.created_at)}</td>
                                        <td className="px-4 py-3 font-mono text-emerald-400 whitespace-nowrap text-[10px]">{p.order_number ?? p.external_id?.slice(0, 14) ?? '—'}</td>
                                        <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{p.client_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-ds-ink3 whitespace-nowrap">{p.product_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">{formatIDR(p.paid_amount ?? p.amount ?? 0)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusColor(p.status)}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-ds-ink3 whitespace-nowrap text-[10px]">{p.payment_method ?? p.payment_channel ?? '—'}</td>
                                        <td className="px-4 py-3 text-ds-ink3 whitespace-nowrap text-[10px]">{fmtDate(p.paid_at)}</td>
                                        <td className="px-6 py-3">
                                            {p.invoice_url && p.status === 'PENDING' ? (
                                                <a
                                                    href={p.invoice_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[9px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    <Globe size={10} /> Buka
                                                </a>
                                            ) : <span className="text-ds-ink2">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export const WithdrawalsAdminView: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Array<Withdrawal & { agent_name?: string; agent_email?: string }>>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; agentName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const adminUser = JSON.parse(localStorage.getItem('sp_admin_user') || '{}');

  const load = async () => {
    setLoading(true);
    const data = await getAdminWithdrawals(200);
    setWithdrawals(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? withdrawals
    : withdrawals.filter(w => w.status === filter || (filter === 'PENDING' && w.status.startsWith('PENDING')));

  const IDR = (n: number) => 'Rp ' + Math.abs(n).toLocaleString('id-ID');

  const approvalLevelForUser = (role: string): 1 | 2 | 3 | null => {
    if (role === 'MASTER_ADMIN' || role === 'FINANCE_DIRECTOR') return 3;
    if (role === 'FINANCE_MANAGER') return 2;
    if (role === 'FINANCE' || role === 'ADMIN') return 1;
    return null;
  };

  const canApprove = (wd: Withdrawal & { agent_name?: string }) => {
    const level = approvalLevelForUser(adminUser.role);
    if (!level) return false;
    if (wd.status === 'PENDING_L1' && level >= 1) return true;
    if (wd.status === 'PENDING_L2' && level >= 2) return true;
    if (wd.status === 'PENDING_L3' && level >= 3) return true;
    return false;
  };

  const handleApprove = async (wd: Withdrawal & { agent_name?: string }) => {
    const level = approvalLevelForUser(adminUser.role);
    if (!level) return;
    setActionLoading(wd.id);
    const res = await approveWithdrawal(wd.id, level);
    if (res.success) {
      const nextStatus = level === 1 && wd.amount < 10_000_000 ? 'APPROVED'
        : level === 2 && wd.amount < 25_000_000 ? 'APPROVED'
        : level === 3 ? 'APPROVED' : null;

      if (nextStatus === 'APPROVED' && !wd.scheduled_disburse_at) {
        await triggerDisbursement(wd.id);
      }
      await load();
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.id);
    await rejectWithdrawal(rejectModal.id, rejectReason.trim());
    setRejectModal(null);
    setRejectReason('');
    setActionLoading(null);
    await load();
  };

  const handleDisburse = async (id: string) => {
    setActionLoading(id);
    await triggerDisbursement(id);
    await load();
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      PENDING_L1:  { cls: 'bg-amber-500/10 text-ds-amber border-amber-500/20',  label: 'Menunggu L1' },
      PENDING_L2:  { cls: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: 'Menunggu L2' },
      PENDING_L3:  { cls: 'bg-red-500/10 text-red-400 border-red-500/20',        label: 'Menunggu L3' },
      APPROVED:    { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',      label: 'Disetujui' },
      PROCESSING:  { cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', label: 'Diproses' },
      DISBURSED:   { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Cair' },
      FAILED:      { cls: 'bg-red-500/10 text-red-400 border-red-500/20',         label: 'Gagal' },
      REJECTED:    { cls: 'bg-red-500/10 text-red-400 border-red-500/20',         label: 'Ditolak' },
      CANCELLED:   { cls: 'bg-gray-500/10 text-ds-ink3 border-gray-500/20',      label: 'Dibatalkan' },
    };
    return map[status] ?? { cls: 'bg-gray-500/10 text-ds-ink3', label: status };
  };

  const totalPending = withdrawals.filter(w => w.status.startsWith('PENDING')).reduce((s, w) => s + w.amount, 0);
  const totalDisbursed = withdrawals.filter(w => w.status === 'DISBURSED').reduce((s, w) => s + w.net_amount, 0);
  const countPending = withdrawals.filter(w => w.status.startsWith('PENDING')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight">Penarikan Dana Mitra</h2>
        <button onClick={load} className="p-2 rounded-xl bg-ds-card2 hover:bg-ds-card2 transition-all active:scale-95">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Antrian Pending', value: countPending.toString(), sub: IDR(totalPending), color: 'text-amber-400' },
          { label: 'Total Dicairkan', value: IDR(totalDisbursed), sub: `${withdrawals.filter(w => w.status === 'DISBURSED').length} transaksi`, color: 'text-emerald-400' },
          { label: 'Total Permintaan', value: withdrawals.length.toString(), sub: 'Semua waktu', color: 'text-blue-400' },
        ].map(k => (
          <div key={k.label} className="bg-ds-card2 border border-ds-border rounded-2xl p-4 space-y-1">
            <p className="text-[0.5rem] font-black uppercase tracking-widest text-ds-ink3">{k.label}</p>
            <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
            <p className="text-[0.5rem] text-ds-ink2">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {['ALL','PENDING','APPROVED','DISBURSED','REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[0.55rem] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-emerald-500 text-white' : 'bg-ds-card2 text-ds-ink3 hover:bg-ds-card2'}`}
          >
            {f === 'ALL' ? 'Semua' : f === 'PENDING' ? 'Pending' : f === 'APPROVED' ? 'Disetujui' : f === 'DISBURSED' ? 'Cair' : 'Ditolak'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-3">
        {loading && <div className="text-center py-8 text-ds-ink3 text-sm">Memuat...</div>}
        {!loading && filtered.length === 0 && <div className="text-center py-8 text-ds-ink3 text-sm">Tidak ada data</div>}
        {filtered.map(wd => {
          const { cls, label } = statusBadge(wd.status);
          const busy = actionLoading === wd.id;
          return (
            <div key={wd.id} className="bg-ds-card2 border border-ds-border rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-black text-white">{wd.agent_name ?? 'Mitra Tidak Dikenal'}</p>
                  <p className="text-[0.5rem] text-ds-ink3">{wd.agent_email}</p>
                  <p className="text-[0.5rem] text-ds-ink3 mt-0.5">{wd.bank_code} · {wd.account_number} · {wd.account_holder_name}</p>
                </div>
                <span className={`text-[0.45rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border whitespace-nowrap ${cls}`}>{label}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 bg-ds-card2 rounded-xl p-3">
                <div>
                  <p className="text-[0.45rem] text-ds-ink3 uppercase tracking-widest">Diminta</p>
                  <p className="text-xs font-black text-white">{IDR(wd.amount)}</p>
                </div>
                <div>
                  <p className="text-[0.45rem] text-ds-ink3 uppercase tracking-widest">Biaya Xendit</p>
                  <p className="text-xs font-black text-amber-400">-{IDR(wd.xendit_fee)}</p>
                </div>
                <div>
                  <p className="text-[0.45rem] text-ds-ink3 uppercase tracking-widest">Diterima Mitra</p>
                  <p className="text-xs font-black text-emerald-400">{IDR(wd.net_amount)}</p>
                </div>
              </div>
              {wd.scheduled_disburse_at && wd.status !== 'DISBURSED' && (
                <p className="text-[0.5rem] text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Clock size={10} />
                  Pencairan dijadwalkan: {new Date(wd.scheduled_disburse_at).toLocaleString('id-ID')} (24 jam delay karena &gt; Rp 25 juta)
                </p>
              )}
              {wd.amount >= 25_000_000 && (
                <p className="text-[0.5rem] text-red-400 bg-red-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={10} />
                  Di atas Rp 25 juta — memerlukan 3 level persetujuan
                </p>
              )}
              {wd.rejection_reason && (
                <p className="text-[0.5rem] text-red-400">Alasan ditolak: {wd.rejection_reason}</p>
              )}
              <div className="text-[0.45rem] text-ds-ink2">
                {wd.l1_approved_at && <span>L1: {new Date(wd.l1_approved_at).toLocaleDateString('id-ID')} · </span>}
                {wd.l2_approved_at && <span>L2: {new Date(wd.l2_approved_at).toLocaleDateString('id-ID')} · </span>}
                {wd.l3_approved_at && <span>L3: {new Date(wd.l3_approved_at).toLocaleDateString('id-ID')} · </span>}
                Dibuat: {new Date(wd.created_at).toLocaleDateString('id-ID')}
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {canApprove(wd) && (
                  <button
                    onClick={() => handleApprove(wd)}
                    disabled={busy}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[0.55rem] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-40"
                  >
                    {busy ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                    Setujui
                  </button>
                )}
                {wd.status === 'APPROVED' && (
                  <button
                    onClick={() => handleDisburse(wd.id)}
                    disabled={busy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-[0.55rem] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all active:scale-95 disabled:opacity-40"
                  >
                    {busy ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    Cairkan via Xendit
                  </button>
                )}
                {(wd.status.startsWith('PENDING') || wd.status === 'APPROVED') && (
                  <button
                    onClick={() => setRejectModal({ id: wd.id, agentName: wd.agent_name ?? 'Mitra' })}
                    disabled={busy}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[0.55rem] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-40"
                  >
                    <X size={12} />
                    Tolak
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-ds-card border border-ds-border rounded-[2rem] p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black uppercase tracking-tight">Tolak Penarikan</h3>
            <p className="text-sm text-ds-ink3">Penarikan dari {rejectModal.agentName} akan dibatalkan dan saldo dikembalikan.</p>
            <textarea
              className="w-full bg-ds-card2 border border-ds-border rounded-xl p-4 text-sm outline-none focus:border-red-500 resize-none"
              rows={3}
              placeholder="Alasan penolakan..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 py-3 rounded-xl border border-ds-border text-ds-ink3 font-black text-xs uppercase tracking-widest">Batal</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.id}
                className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-black text-xs uppercase tracking-widest disabled:opacity-40"
              >
                Tolak &amp; Kembalikan Dana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
