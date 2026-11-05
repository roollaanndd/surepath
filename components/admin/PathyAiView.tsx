import React from 'react';
import { Sparkles, Bot } from 'lucide-react';
import PathyChat, { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import { Language } from '../../types';

/**
 * v2.8.0 — Pathy sebagai asisten operasional di Admin CMS.
 *
 * Dari sini MASTER_ADMIN/ADMIN mengobrol dengan Pathy yang kini punya toolset
 * admin read-only (admin_overview, admin_search_orders, admin_claim_queue,
 * admin_contact_leads, admin_user_lookup) — ditambah seluruh kemampuan Pathy
 * biasa: baca dokumen/foto (mesin vision Pathy), bedah Excel, hitung premi.
 * Semua aksi tulis tetap lewat menu CMS masing-masing.
 */
const PathyAiView: React.FC<{ currentUser: any }> = ({ currentUser }) => (
  <div className="max-w-3xl mx-auto space-y-4">
    <div className="rounded-2xl border border-ds-border bg-ds-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} className="text-emerald-500" />
        <h3 className="text-sm font-black text-ds-ink">Pathy AI · Asisten Operasional</h3>
      </div>
      <p className="text-xs text-ds-ink2 leading-relaxed">
        Tanya kondisi platform ("ringkasan hari ini"), cari order/klaim/pengguna lintas akun,
        bedah file Excel, atau minta inspeksi foto — Pathy menjawab dari data nyata via tool,
        read-only. Untuk mengubah data, Pathy akan mengarahkan ke menu CMS yang sesuai.
      </p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {['Ringkasan platform hari ini', 'Klaim yang masih berjalan', 'Cari order', 'Prospek belum dihubungi'].map(q => (
          <span key={q} className="px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            {q}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(PATHY_OPEN_EVENT))}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-2xs font-black uppercase tracking-wider bg-ds-green text-ds-on-green"
      >
        <Bot size={14} /> Buka Pathy
      </button>
    </div>

    {/* hideLauncher: satu pintu dari tombol di atas — tidak ada dua orbe
        mengapung di CMS. PathyChat merender overlay chatnya sendiri. */}
    <PathyChat
      lang={Language.ID}
      currentUser={{ name: currentUser?.name, id: currentUser?.id, role: currentUser?.role }}
      hideLauncher
    />
  </div>
);

export default PathyAiView;
