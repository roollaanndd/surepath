import React from 'react';
import {
  ArrowLeft, Users, Briefcase, FileText, Award, Handshake,
  Lock, ScrollText, Shield, ArrowRight,
} from 'lucide-react';
import { SurePathLogo } from '../../components/Navbar';

interface Props {
  pageId: string;
  onBack: () => void;
  onSignIn: () => void;
}

type Section = { heading: string; body: string | string[] };
type PageContent = {
  Icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  title: string;
  subtitle: string;
  sections: Section[];
  cta?: { label: string; action: 'signIn' | 'mailto'; value?: string };
};

const PAGES: Record<string, PageContent> = {
  about: {
    Icon: Users, color: '#22c55e',
    title: 'Tentang SurePath',
    subtitle: 'Platform asuransi digital yang transparan, humanis, dan berpusat pada kebutuhan nyata Anda.',
    sections: [
      { heading: 'Siapa Kami', body: 'SurePath adalah platform insurtech Indonesia yang menggabungkan teknologi AI mutakhir dengan sentuhan manusiawi. Didirikan pada 2023, kami hadir untuk menyederhanakan pengalaman asuransi yang selama ini terasa rumit dan tidak transparan.' },
      { heading: 'Misi Kami', body: 'Menjadikan perlindungan finansial mudah diakses oleh semua orang Indonesia — dengan proses yang transparan, cepat, dan dapat dipercaya penuh.' },
      { heading: 'Nilai-Nilai Kami', body: ['Transparansi — Tidak ada biaya tersembunyi, tidak ada klausul yang membingungkan.', 'Humanis — Di balik teknologi canggih, ada agen nyata yang siap mendampingi.', 'Inovatif — AI-powered claims, instant approval, digital-first experience.', 'Terpercaya — Terdaftar dan diawasi penuh oleh OJK Republik Indonesia.'] },
      { heading: 'Angka yang Bicara', body: ['12.000+ nasabah aktif yang mempercayai SurePath', '18+ mitra insurer berlisensi OJK terkemuka', '200+ kota jangkauan layanan di seluruh Indonesia', 'Rata-rata klaim terproses dalam waktu < 60 menit'] },
    ],
    cta: { label: 'Bergabung Sekarang', action: 'signIn' },
  },
  careers: {
    Icon: Briefcase, color: '#3b82f6',
    title: 'Karir di SurePath',
    subtitle: 'Bergabunglah dengan tim yang sedang membangun masa depan asuransi Indonesia.',
    sections: [
      { heading: 'Kenapa SurePath?', body: 'Kami adalah startup insurtech yang bergerak cepat dengan kultur kerja terbuka, menghargai setiap ide, dan memberdayakan setiap anggota tim untuk membuat dampak nyata bagi jutaan orang.' },
      { heading: 'Posisi Terbuka', body: ['Frontend Engineer (React / TypeScript)', 'Backend Engineer (Node.js / Supabase)', 'AI & Machine Learning Engineer', 'Product Manager', 'Agen Asuransi — berbagai kota di Indonesia', 'Customer Success Specialist'] },
      { heading: 'Benefit Kami', body: ['Gaji kompetitif & equity package', 'Remote-friendly dengan jam kerja fleksibel', 'BPJS Kesehatan & Ketenagakerjaan penuh', 'Asuransi kesehatan premium untuk karyawan & keluarga', 'Learning & development budget per tahun', 'Annual team retreat dan company gathering'] },
      { heading: 'Cara Melamar', body: 'Kirimkan CV dan portofolio terbaru Anda ke careers@surepath.id dengan subject: [Posisi Dilamar] — Nama Anda. Tim HR SurePath akan menghubungi dalam 5 hari kerja.' },
    ],
    cta: { label: 'Kirim Lamaran', action: 'mailto', value: 'mailto:careers@surepath.id' },
  },
  blog: {
    Icon: FileText, color: '#a855f7',
    title: 'Blog SurePath',
    subtitle: 'Insight, tips, dan berita terbaru seputar asuransi, keuangan, dan perlindungan digital.',
    sections: [
      { heading: 'Artikel Terbaru', body: ['🚗 5 Tips Memilih Asuransi Mobil yang Tepat untuk Kebutuhan dan Anggaran Anda', '✈️ Panduan Lengkap Asuransi Perjalanan Internasional 2025 — Jangan Sampai Terlewat', '💡 Cara Klaim Asuransi dengan Cepat Menggunakan Teknologi AI SurePath', '🏥 Memahami Manfaat Asuransi Kesehatan: Rawat Inap vs Rawat Jalan', '📱 Proteksi Gadget: Mengapa Asuransi Elektronik Makin Penting di Era Digital'] },
      { heading: 'Topik Populer', body: ['Tips & Panduan Asuransi untuk Pemula', 'Berita & Regulasi Industri Asuransi', 'Update Produk & Fitur Terbaru SurePath', 'Edukasi Perencanaan Keuangan & Manajemen Risiko', 'Success Stories dari Nasabah SurePath'] },
      { heading: 'Newsletter Mingguan', body: 'Dapatkan artikel edukasi asuransi terbaik langsung di inbox Anda setiap minggu. Gratis, tanpa spam, bisa unsubscribe kapan saja.' },
    ],
    cta: { label: 'Mulai Baca', action: 'signIn' },
  },
  agents: {
    Icon: Award, color: '#f59e0b',
    title: 'Program Agen SurePath',
    subtitle: 'Jadilah bagian dari jaringan agen insurtech terdepan dan paling inovatif di Indonesia.',
    sections: [
      { heading: 'Apa Itu Program Agen?', body: 'Program Agen SurePath membuka peluang bagi Anda untuk memasarkan produk asuransi unggulan dari 18+ insurer terkemuka, dengan dukungan teknologi digital penuh dan training tersertifikasi.' },
      { heading: 'Keunggulan Menjadi Agen SurePath', body: ['Komisi kompetitif hingga 15% per polis yang berhasil diterbitkan', 'Dashboard digital real-time untuk kelola klien, polis, dan komisi', 'Training online & offline tersertifikasi AAJI / AAUI', 'Lead generation support langsung dari platform SurePath', 'Tidak perlu modal awal — pendaftaran sepenuhnya gratis', 'Fleksibel: bisa part-time sambil pekerjaan utama'] },
      { heading: 'Syarat Bergabung', body: ['WNI, usia minimal 21 tahun', 'Pendidikan minimal SMA / sederajat', 'Memiliki KTP dan NPWP aktif', 'Berkomitmen tinggi, jujur, dan berintegritas'] },
      { heading: 'Proses Pendaftaran', body: 'Klik tombol "Daftar Agen", isi formulir pendaftaran agen, lalu ikuti proses onboarding dan training online. Agen aktif akan mendapat akses penuh ke portal agen dalam 3–5 hari kerja.' },
    ],
    cta: { label: 'Daftar Jadi Agen', action: 'signIn' },
  },
  partnership: {
    Icon: Handshake, color: '#06b6d4',
    title: 'Kemitraan SurePath',
    subtitle: 'Kolaborasi strategis untuk memperluas jangkauan perlindungan di seluruh Indonesia.',
    sections: [
      { heading: 'Model Kemitraan', body: ['Insurer Partnership — Integrasi produk asuransi ke ekosistem platform SurePath', 'B2B Embedded Insurance — Solusi asuransi white-label untuk bisnis Anda', 'API & Technology Integration — Platform digital terhubung langsung ke sistem SurePath', 'Channel Partnership — Distribusi produk melalui jaringan dan database Anda'] },
      { heading: 'Kenapa Bermitra dengan SurePath?', body: ['Akses ke 12.000+ nasabah aktif yang terus bertumbuh', 'Infrastruktur teknologi AI dan Computer Vision yang siap pakai', 'Proses onboarding mitra yang cepat (2–4 minggu)', 'Tim teknis, legal, dan compliance berpengalaman', 'Terdaftar OJK dan fully compliant dengan regulasi Indonesia'] },
      { heading: 'Hubungi Tim Kami', body: 'Untuk diskusi kemitraan strategis lebih lanjut, silakan hubungi tim Business Development kami di partnership@surepath.id atau isi form kemitraan online dan tim kami akan menghubungi dalam 2 hari kerja.' },
    ],
    cta: { label: 'Diskusi Kemitraan', action: 'mailto', value: 'mailto:partnership@surepath.id' },
  },
  privacy: {
    Icon: Lock, color: '#64748b',
    title: 'Kebijakan Privasi',
    subtitle: 'Kami berkomitmen penuh untuk melindungi privasi dan keamanan data pribadi Anda.',
    sections: [
      { heading: '1. Data yang Kami Kumpulkan', body: 'Kami mengumpulkan data yang Anda berikan langsung (nama, email, nomor telepon, data identitas KTP, data kendaraan), data yang dihasilkan otomatis (log akses, informasi perangkat, lokasi kota), serta data dari mitra terverifikasi (mitra verifikasi identitas, perusahaan asuransi rekanan).' },
      { heading: '2. Tujuan Penggunaan Data', body: ['Memproses aplikasi asuransi dan klaim Anda secara akurat', 'Verifikasi identitas dan pencegahan penipuan (fraud prevention)', 'Personalisasi pengalaman dan rekomendasi produk yang relevan', 'Komunikasi terkait layanan, polis, dan informasi penting', 'Kepatuhan penuh terhadap regulasi OJK dan peraturan hukum yang berlaku'] },
      { heading: '3. Keamanan Data', body: 'Seluruh data Anda disimpan dengan enkripsi AES-256 dan ditransmisikan melalui TLS 1.3. Akses dibatasi ketat hanya untuk staf yang memiliki kebutuhan bisnis yang sah, dengan audit log lengkap. SurePath tidak menjual atau menyewakan data Anda kepada pihak ketiga mana pun.' },
      { heading: '4. Hak-Hak Anda', body: ['Akses Data: Minta salinan lengkap data pribadi Anda yang kami simpan', 'Koreksi: Minta pembaruan untuk data yang tidak akurat atau tidak lengkap', 'Penghapusan: Minta penghapusan data (dengan ketentuan kewajiban regulasi)', 'Portabilitas: Ekspor data Anda dalam format terstruktur dan dapat dibaca mesin'] },
      { heading: '5. Hubungi Kami', body: 'Pertanyaan atau permintaan terkait privasi: privacy@surepath.id. Kami berkomitmen merespons dalam 5 hari kerja. Kebijakan ini berlaku efektif sejak 1 Januari 2024.' },
    ],
  },
  terms: {
    Icon: ScrollText, color: '#64748b',
    title: 'Syarat & Ketentuan',
    subtitle: 'Ketentuan penggunaan platform dan layanan SurePath yang mengikat secara hukum.',
    sections: [
      { heading: '1. Penerimaan Ketentuan', body: 'Dengan menggunakan platform SurePath (website, aplikasi mobile, atau API), Anda menyatakan telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan ini sepenuhnya. Jika Anda tidak setuju, harap hentikan penggunaan platform.' },
      { heading: '2. Layanan yang Disediakan', body: 'SurePath adalah platform insurtech berlisensi yang menyediakan akses ke produk asuransi dari berbagai perusahaan asuransi berlisensi OJK. SurePath bertindak sebagai agen / pialang asuransi yang menjadi perantara antara nasabah dan perusahaan asuransi.' },
      { heading: '3. Kewajiban Pengguna', body: ['Memberikan informasi yang benar, lengkap, dan tidak menyesatkan', 'Menjaga kerahasiaan akun, password, dan kode OTP Anda', 'Tidak menyalahgunakan platform untuk kegiatan yang melanggar hukum', 'Membayar premi tepat waktu sesuai jadwal yang tertera pada polis', 'Segera melaporkan perubahan data atau informasi material kepada SurePath'] },
      { heading: '4. Batasan Tanggung Jawab', body: 'SurePath tidak bertanggung jawab atas penolakan atau penundaan klaim oleh perusahaan asuransi yang disebabkan oleh ketidakakuratan data yang diberikan pengguna, kondisi pengecualian dalam polis, atau pelanggaran ketentuan polis oleh tertanggung.' },
      { heading: '5. Hukum yang Berlaku', body: 'Syarat dan ketentuan ini diatur oleh hukum Negara Republik Indonesia. Segala sengketa yang timbul diselesaikan melalui Badan Mediasi Asuransi Indonesia (BMAI) atau pengadilan yang berwenang di Jakarta Selatan.' },
    ],
  },
  security: {
    Icon: Shield, color: '#22c55e',
    title: 'Keamanan Data',
    subtitle: 'Infrastruktur keamanan berlapis untuk melindungi setiap aspek data dan transaksi Anda.',
    sections: [
      { heading: 'Enkripsi End-to-End', body: 'Semua data sensitif dienkripsi menggunakan standar AES-256 saat penyimpanan (at rest) dan TLS 1.3 saat transmisi (in transit). Kunci enkripsi dirotasi secara periodik dan disimpan di key management system terpisah.' },
      { heading: 'Autentikasi & Kontrol Akses', body: ['Multi-factor authentication (MFA) tersedia dan sangat direkomendasikan untuk semua akun', 'PBKDF2-HMAC-SHA256 dengan salt unik per pengguna untuk hashing password', 'Session token dengan expiry otomatis dan deteksi anomali aktifitas', 'Arsitektur Zero-Trust — setiap permintaan akses diverifikasi secara independen'] },
      { heading: 'Infrastruktur Cloud', body: 'Platform SurePath di-host di Supabase (infrastruktur AWS ap-southeast-1, Singapura) dengan uptime SLA 99,9%. Backup otomatis setiap hari dengan retensi 30 hari dan point-in-time recovery. Infrastruktur bersertifikasi SOC 2 Type II.' },
      { heading: 'Monitoring & Respons Insiden', body: ['Real-time anomaly detection dan alerting 24/7', 'Audit log komprehensif untuk semua akses ke data sensitif', 'Bug bounty program terbuka bagi peneliti keamanan independen', 'Komitmen respons insiden dalam < 4 jam untuk tingkat keparahan kritis'] },
      { heading: 'Pelaporan Kerentanan', body: 'Jika Anda menemukan celah keamanan, laporkan secara bertanggung jawab ke security@surepath.id. Kami sangat menghargai setiap laporan dan berkomitmen merespons dalam 72 jam dengan tindak lanjut yang serius.' },
    ],
  },
  cookie: {
    Icon: Shield, color: '#64748b',
    title: 'Kebijakan Cookie',
    subtitle: 'Informasi transparan tentang penggunaan cookie di platform SurePath.',
    sections: [
      { heading: 'Apa Itu Cookie?', body: 'Cookie adalah file teks kecil yang disimpan di perangkat Anda saat mengunjungi website SurePath. Cookie membantu kami mengingat preferensi Anda, menjaga keamanan sesi, dan meningkatkan pengalaman pengguna secara keseluruhan.' },
      { heading: 'Jenis Cookie yang Kami Gunakan', body: ['Cookie Esensial — Diperlukan untuk fungsi dasar platform seperti login, keamanan sesi, dan navigasi halaman', 'Cookie Analitik — Membantu kami memahami cara pengguna berinteraksi dengan platform untuk perbaikan berkelanjutan', 'Cookie Preferensi — Menyimpan pengaturan pribadi seperti pilihan bahasa, tema, dan preferensi tampilan', 'Cookie Pemasaran — Untuk menampilkan iklan yang lebih relevan (dapat dinonaktifkan sepenuhnya)'] },
      { heading: 'Cara Mengelola Cookie', body: 'Anda dapat mengatur preferensi cookie kapan saja melalui pengaturan browser Anda atau melalui panel preferensi cookie di website SurePath. Perlu diingat: menonaktifkan cookie esensial dapat mempengaruhi fungsi dan keamanan platform.' },
      { heading: 'Pertanyaan', body: 'Untuk pertanyaan lebih lanjut terkait kebijakan cookie SurePath, silakan hubungi kami di privacy@surepath.id.' },
    ],
  },
};

const StaticInfoPage: React.FC<Props> = ({ pageId, onBack, onSignIn }) => {
  const page = PAGES[pageId];

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sora" style={{ background: 'hsl(0 0% 8%)' }}>
        <div className="text-center">
          <p className="text-white mb-4">Halaman tidak ditemukan.</p>
          <button onClick={onBack} className="text-sm font-bold" style={{ color: '#22c55e' }}>← Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  const { Icon, color, title, subtitle, sections, cta } = page;
  const cardBg   = 'rgba(255,255,255,0.025)';
  const cardBdr  = 'rgba(255,255,255,0.07)';
  const textMuted = 'rgba(255,255,255,0.55)';

  const handleCta = () => {
    if (cta?.action === 'signIn') { onSignIn(); return; }
    if (cta?.action === 'mailto' && cta.value) window.location.href = cta.value;
  };

  return (
    <div className="min-h-screen font-sora text-white" style={{ background: 'hsl(0 0% 8%)' }}>
      <style>{`body { background: hsl(0 0% 8%) !important; }`}</style>
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-white"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          <ArrowLeft size={18} /> Kembali
        </button>
        <div className="flex items-center gap-2">
          <SurePathLogo className="w-6 h-6" />
          <span className="font-black tracking-tight">Sure<span style={{ color: '#22c55e' }}>Path</span></span>
        </div>
        <button onClick={onSignIn}
          className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-80 active:scale-95"
          style={{ background: '#22c55e' }}>
          Masuk
        </button>
      </nav>

      <div className="relative max-w-3xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-5"
            style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
            <Icon size={30} style={{ color }} />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-4">{title}</h1>
          <p className="text-sm leading-relaxed max-w-xl mx-auto" style={{ color: textMuted }}>{subtitle}</p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i} className="p-6 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBdr}` }}>
              <h2 className="text-base font-black mb-3" style={{ color }}>{s.heading}</h2>
              {Array.isArray(s.body) ? (
                <ul className="space-y-2">
                  {s.body.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: textMuted }}>
                      <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{s.body}</p>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        {cta && (
          <div className="mt-14 text-center py-12 px-8 rounded-3xl"
            style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
            <button onClick={handleCta}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
              {cta.label} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticInfoPage;
