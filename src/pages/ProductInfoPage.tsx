import React from 'react';
import { ArrowLeft, Car, Plane, Shield, Smartphone, Heart, CheckCircle, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { SurePathLogo } from '../../components/Navbar';

interface Props {
  productId: string;
  onBack: () => void;
  onSignIn: () => void;
}

type ProductData = {
  Icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
  name: string;
  tagline: string;
  color: string;
  description: string;
  features: string[];
  coverageItems: { title: string; desc: string }[];
  startingPrice: string;
  highlights: string[];
};

const PRODUCT_DATA: Record<string, ProductData> = {
  car: {
    Icon: Car, name: 'Asuransi Kendaraan', tagline: 'Komprehensif & TLO', color: '#22c55e',
    description: 'Perlindungan menyeluruh untuk kendaraan Anda dari berbagai risiko — dari goresan ringan hingga kecelakaan besar. Dengan teknologi AI SurePath, klaim bisa diajukan hanya dengan foto dari HP Anda.',
    features: [
      'Proses klaim via foto HP — tanpa survei fisik ke bengkel',
      'Jaringan 500+ bengkel rekanan resmi di seluruh Indonesia',
      'Estimasi biaya kerusakan instan menggunakan Computer Vision AI',
      'Perlindungan banjir, gempa, dan risiko alam lainnya',
      'Roadside assistance 24 jam di seluruh Indonesia',
    ],
    coverageItems: [
      { title: 'Komprehensif (All Risk)', desc: 'Kerusakan akibat tabrakan, terbalik, tergelincir, perbuatan jahat, dan kebakaran' },
      { title: 'Total Loss Only (TLO)', desc: 'Ganti rugi bila kendaraan hilang atau rusak parah (≥75% dari nilai pasar)' },
      { title: 'Pencurian Kendaraan', desc: 'Kehilangan akibat pencurian atau percobaan pencurian yang disertai laporan polisi' },
      { title: 'Tanggung Jawab Pihak Ketiga', desc: 'Kerugian material/fisik yang diderita pihak ketiga akibat kendaraan Anda' },
    ],
    startingPrice: 'Rp 500.000/tahun', highlights: ['Klaim <60 menit', 'OJK Licensed', 'AI-Powered'],
  },
  travel: {
    Icon: Plane, name: 'Asuransi Perjalanan', tagline: 'Dalam & Luar Negeri', color: '#3b82f6',
    description: 'Nikmati setiap perjalanan dengan tenang — dari perjalanan bisnis internasional hingga wisata keluarga dalam negeri. SurePath Travel Safe melindungi dari keterlambatan pesawat hingga darurat medis di mana saja.',
    features: [
      'Perlindungan medis darurat hingga USD 100.000 di luar negeri',
      'Klaim otomatis untuk penerbangan yang delay lebih dari 4 jam',
      'Evakuasi medis ke fasilitas kesehatan terbaik',
      'Perlindungan bagasi hilang, tertunda, atau rusak',
      'Pembatalan perjalanan akibat force majeure',
    ],
    coverageItems: [
      { title: 'Darurat Medis', desc: 'Biaya rumah sakit, dokter, dan perawatan medis darurat selama perjalanan' },
      { title: 'Keterlambatan Penerbangan', desc: 'Ganti rugi otomatis bila pesawat delay lebih dari 4 jam — tanpa klaim manual' },
      { title: 'Kehilangan Bagasi', desc: 'Penggantian barang berharga yang hilang atau rusak akibat maskapai' },
      { title: 'Pembatalan Perjalanan', desc: 'Pengembalian biaya tiket dan akomodasi akibat pembatalan mendadak' },
    ],
    startingPrice: 'Rp 75.000/hari', highlights: ['Auto Claim', 'Worldwide Cover', '24/7 Support'],
  },
  pa: {
    Icon: Shield, name: 'Kecelakaan Diri', tagline: 'Personal Accident', color: '#a855f7',
    description: 'Kecelakaan bisa terjadi kapan saja dan di mana saja. Asuransi Kecelakaan Diri SurePath memberikan santunan finansial yang cepat untuk Anda dan keluarga, agar kehidupan tetap berjalan meski menghadapi kejadian tak terduga.',
    features: [
      'Pendaftaran online selesai hanya dalam 60 detik',
      'Santunan meninggal dunia akibat kecelakaan',
      'Penggantian biaya perawatan medis akibat kecelakaan',
      'Santunan cacat tetap total maupun sebagian',
      'Perlindungan aktif 24 jam, di mana saja di seluruh dunia',
    ],
    coverageItems: [
      { title: 'Meninggal Dunia', desc: 'Santunan penuh kepada ahli waris bila tertanggung meninggal akibat kecelakaan' },
      { title: 'Cacat Tetap Total', desc: 'Santunan 100% uang pertanggungan bila mengalami cacat permanen total' },
      { title: 'Cacat Tetap Sebagian', desc: 'Santunan proporsional sesuai tabel manfaat yang tertera pada polis' },
      { title: 'Biaya Perawatan Medis', desc: 'Penggantian biaya rumah sakit dan tindakan medis akibat kecelakaan' },
    ],
    startingPrice: 'Rp 50.000/bulan', highlights: ['Daftar 60 Detik', 'Global Coverage', 'Instant Approval'],
  },
  property: {
    Icon: Smartphone, name: 'Proteksi Barang', tagline: 'Gadget & Elektronik', color: '#f59e0b',
    description: 'Dari smartphone mahal hingga laptop kerja, perangkat elektronik Anda adalah investasi berharga. SurePath Item Shield memberikan perlindungan total dari kerusakan tak terduga, jatuh, terkena air, hingga pencurian.',
    features: [
      'Klaim mudah cukup unggah foto kerusakan via aplikasi',
      'Perlindungan dari jatuh, terkena cairan, dan kerusakan fisik',
      'Garansi perbaikan dengan teknisi tersertifikasi',
      'Pengiriman perangkat pinjaman sementara saat perbaikan',
      'Perlindungan hingga 2 tahun untuk setiap perangkat',
    ],
    coverageItems: [
      { title: 'Kerusakan Fisik', desc: 'Layar retak, casing pecah, atau kerusakan fisik akibat jatuh dan benturan' },
      { title: 'Kerusakan Akibat Cairan', desc: 'Kerusakan akibat terkena air, minuman, hujan, atau terendam banjir' },
      { title: 'Pencurian', desc: 'Kehilangan perangkat akibat pencurian disertai bukti laporan polisi resmi' },
      { title: 'Kerusakan Komponen Internal', desc: 'Kerusakan IC, baterai kembung, atau komponen akibat lonjakan listrik' },
    ],
    startingPrice: 'Rp 35.000/bulan', highlights: ['Photo Claim', 'Fast Repair', 'Loaner Device'],
  },
  health: {
    Icon: Heart, name: 'Kesehatan Keluarga', tagline: 'Individu & Keluarga', color: '#ef4444',
    description: 'Kesehatan adalah aset terbesar Anda dan keluarga. Asuransi Kesehatan SurePath memberikan akses ke ribuan rumah sakit dan klinik terbaik di Indonesia, dilengkapi asisten medis AI yang siaga 24 jam.',
    features: [
      'Asisten medis AI aktif 24 jam untuk konsultasi kesehatan',
      'Cashless di 3.000+ rumah sakit dan klinik rekanan',
      'Manfaat rawat inap, rawat jalan, dan kesehatan gigi',
      'Manfaat melahirkan dan perawatan bayi baru lahir',
      'Tidak ada masa tunggu untuk kondisi darurat medis',
    ],
    coverageItems: [
      { title: 'Rawat Inap', desc: 'Biaya kamar, dokter, obat-obatan, dan semua tindakan medis selama dirawat' },
      { title: 'Rawat Jalan', desc: 'Konsultasi dokter umum dan spesialis, laboratorium, dan apotek rekanan' },
      { title: 'Gawat Darurat', desc: 'Penanganan medis darurat di IGD 24 jam tanpa persetujuan awal dari SurePath' },
      { title: 'Kesehatan Gigi', desc: 'Perawatan gigi dasar meliputi scaling, pencabutan, dan penambalan gigi' },
    ],
    startingPrice: 'Rp 200.000/bulan', highlights: ['AI Health Bot', '3000+ RS', 'Cashless'],
  },
};

const ProductInfoPage: React.FC<Props> = ({ productId, onBack, onSignIn }) => {
  const product = PRODUCT_DATA[productId];

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sora" style={{ background: 'hsl(0 0% 8%)' }}>
        <div className="text-center">
          <p className="text-white mb-4">Produk tidak ditemukan.</p>
          <button onClick={onBack} className="text-sm font-bold" style={{ color: '#22c55e' }}>← Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  const { Icon, name, tagline, color, description, features, coverageItems, startingPrice, highlights } = product;

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
          style={{ background: color }}>
          Beli Sekarang
        </button>
      </nav>

      <div className="relative max-w-4xl mx-auto px-5 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-6"
            style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
            <Icon size={36} style={{ color }} />
          </div>
          <span className="block text-[0.6rem] font-black uppercase tracking-[0.35em] mb-3" style={{ color }}>
            {tagline}
          </span>
          <h1 className="text-4xl font-black tracking-tight mb-5">{name}</h1>
          <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {description}
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7 mb-8">
            {highlights.map(h => (
              <span key={h} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-widest"
                style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}>
                <Star size={10} fill={color} /> {h}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onSignIn}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
              Beli Sekarang <ArrowRight size={16} />
            </button>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Mulai dari {startingPrice}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-xl font-black mb-8 text-center tracking-tight">Fitur Unggulan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color }} />
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage */}
        <div className="mb-16">
          <h2 className="text-xl font-black mb-8 text-center tracking-tight">Jaminan Perlindungan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coverageItems.map((c, i) => (
              <div key={i} className="p-5 rounded-2xl"
                style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <h3 className="text-sm font-black mb-2" style={{ color }}>{c.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-14 px-8 rounded-3xl"
          style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
          <ShieldCheck size={40} className="mx-auto mb-5" style={{ color }} />
          <h2 className="text-2xl font-black mb-3 tracking-tight">Siap Terlindungi?</h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Daftar sekarang dan dapatkan perlindungan aktif dalam hitungan menit. Tanpa survei, tanpa kerumitan.
          </p>
          <button onClick={onSignIn}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
            Mulai Sekarang <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoPage;
