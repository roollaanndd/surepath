import React, { useState, useRef, useEffect } from 'react';
import { SurePathLogo } from './Navbar';

interface Props {
  onAccept: () => Promise<void>;
}

const TC_SECTIONS = [
  {
    title: '1. Layanan SurePath',
    body: `SurePath adalah platform digital asuransi yang menghubungkan pengguna dengan produk asuransi dari berbagai penanggung (insurer) berlisensi OJK. SurePath berperan sebagai marketplace/perantara dan bukan sebagai penanggung langsung. Semua produk yang tersedia telah mendapatkan persetujuan dari Otoritas Jasa Keuangan (OJK) Republik Indonesia.`,
  },
  {
    title: '2. Syarat Penggunaan & Kelayakan',
    body: `Untuk menggunakan layanan SurePath, Anda harus:\n• Berusia minimal 17 (tujuh belas) tahun;\n• Warga Negara Indonesia (WNI) atau badan hukum Indonesia;\n• Memiliki identitas resmi yang sah (KTP/SIM/Paspor);\n• Memiliki kapasitas hukum untuk membuat perjanjian yang mengikat;\n• Tidak sedang dalam status kebangkrutan atau pengampuan hukum.\n\nSurePath berhak menolak atau menghentikan akses pengguna yang tidak memenuhi syarat kelayakan di atas.`,
  },
  {
    title: '3. Pengumpulan & Pengolahan Data Pribadi',
    body: `Dalam rangka penyediaan layanan, SurePath mengumpulkan dan memproses data pribadi Anda, meliputi:\n• Nama lengkap, tanggal lahir, dan jenis kelamin;\n• Nomor Induk Kependudukan (NIK) dan data KTP;\n• Nomor kendaraan, data STNK, dan foto kendaraan;\n• Nomor telepon dan alamat e-mail;\n• Data lokasi dan informasi perangkat.\n\nData Anda diproses berdasarkan Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) dan peraturan OJK yang berlaku. Data tidak akan dijual kepada pihak ketiga tanpa persetujuan eksplisit Anda, kecuali untuk keperluan pemrosesan klaim dan penerbitan polis oleh penanggung mitra.`,
  },
  {
    title: '4. Persetujuan Pemrosesan Klaim & Pembayaran Premi',
    body: `Dengan menggunakan layanan SurePath, Anda menyetujui:\n• Pemrosesan pembayaran premi melalui gateway pembayaran yang telah bersertifikat PCI-DSS;\n• Penyampaian data yang diperlukan kepada penanggung mitra untuk keperluan akseptasi risiko dan penerbitan polis;\n• Proses verifikasi klaim yang dapat mencakup pemeriksaan foto, dokumen, dan kunjungan lapangan oleh surveyor;\n• Penyelesaian klaim sesuai dengan ketentuan polis yang berlaku dan jadwal pembayaran yang ditetapkan penanggung.`,
  },
  {
    title: '5. Kewajiban Pengguna',
    body: `Anda wajib:\n• Memberikan informasi yang akurat, lengkap, dan tidak menyesatkan pada seluruh formulir;\n• Tidak menyembunyikan fakta material yang relevan (material fact) yang dapat memengaruhi keputusan akseptasi risiko penanggung;\n• Segera memberitahukan SurePath apabila terjadi perubahan data yang memengaruhi risiko yang diasuransikan;\n• Tidak melakukan penipuan asuransi (insurance fraud) dalam bentuk apapun;\n• Menjaga kerahasiaan kredensial akun dan segera melapor apabila terjadi akses tidak sah.\n\nPelanggaran kewajiban ini dapat mengakibatkan pembatalan polis, penolakan klaim, dan/atau tindakan hukum sesuai peraturan yang berlaku.`,
  },
  {
    title: '6. Penggunaan AI & Teknologi Computer Vision',
    body: `SurePath menggunakan teknologi Kecerdasan Buatan (AI) dan Computer Vision untuk:\n• OCR (Optical Character Recognition) dokumen STNK dan KTP guna mempercepat proses pendaftaran;\n• Validasi foto kendaraan untuk mendeteksi kerusakan pra-asuransi;\n• Survei kendaraan berbasis foto untuk penilaian risiko underwriting;\n• Analisis kuitansi medis untuk klaim asuransi kesehatan.\n\nHasil analisis AI bersifat indikatif dan dapat ditinjau ulang oleh underwriter manusia. SurePath tidak bertanggung jawab atas keputusan yang diambil semata-mata berdasarkan output AI tanpa verifikasi lebih lanjut.`,
  },
  {
    title: '7. Batasan Tanggung Jawab',
    body: `SurePath sebagai platform marketplace:\n• Tidak bertanggung jawab atas kegagalan bayar klaim yang disebabkan oleh kondisi polis atau keputusan penanggung;\n• Tidak menjamin ketersediaan layanan tanpa gangguan 24/7, meskipun kami berupaya mempertahankan uptime tertinggi;\n• Tidak bertanggung jawab atas kerugian tidak langsung, konsekuensial, atau kehilangan keuntungan;\n• Tanggung jawab SurePath dalam satu kejadian dibatasi sebesar premi yang telah Anda bayarkan untuk polis terkait.\n\nPeranggung bertanggung jawab penuh atas penyelesaian klaim sesuai syarat dan ketentuan polis masing-masing.`,
  },
  {
    title: '8. Hukum yang Berlaku & Penyelesaian Sengketa',
    body: `Syarat dan Ketentuan ini tunduk pada dan ditafsirkan berdasarkan Hukum Negara Republik Indonesia, termasuk namun tidak terbatas pada:\n• Undang-Undang No. 40 Tahun 2014 tentang Perasuransian;\n• Peraturan OJK (POJK) terkait pemasaran digital produk asuransi;\n• Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi;\n• Undang-Undang No. 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik.\n\nSengketa diselesaikan melalui musyawarah mufakat. Apabila tidak tercapai kesepakatan dalam 30 (tiga puluh) hari, sengketa diselesaikan melalui Lembaga Alternatif Penyelesaian Sengketa (LAPS) Sektor Jasa Keuangan atau Pengadilan Negeri Jakarta Selatan sesuai pilihan pengguna.`,
  },
];

const TermsModal: React.FC<Props> = ({ onAccept }) => {
  const [checked, setChecked]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const scrollRef               = useRef<HTMLDivElement>(null);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleAccept = async () => {
    if (!checked || loading) return;
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Sora', sans-serif",
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#0d1210',
          border: '1px solid rgba(6,224,0,0.18)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 0 80px rgba(6,224,0,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'rgba(6,224,0,0.06)',
              border: '1px solid rgba(6,224,0,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SurePathLogo className="w-8 h-8 object-contain" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Syarat &amp; Ketentuan
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
              Terms &amp; Conditions · SurePath
            </p>
          </div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 1.5 }}>
            Harap baca seluruh ketentuan berikut sebelum menggunakan layanan SurePath.
          </p>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {TC_SECTIONS.map(section => (
            <div key={section.title}>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'hsl(119,99%,46%)',
                  letterSpacing: '-0.01em',
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.60)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                }}
              >
                {section.body}
              </p>
            </div>
          ))}

          {/* Bottom padding so last section isn't obscured by footer */}
          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: '#0d1210',
          }}
        >
          {/* Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <div
              onClick={() => setChecked(c => !c)}
              style={{
                width: 18, height: 18,
                borderRadius: 5,
                border: `2px solid ${checked ? 'hsl(119,99%,46%)' : 'rgba(255,255,255,0.25)'}`,
                background: checked ? 'hsl(119,99%,46%)' : 'transparent',
                flexShrink: 0,
                marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s',
                cursor: 'pointer',
              }}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              onClick={() => setChecked(c => !c)}
              style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, userSelect: 'none' }}
            >
              Saya telah membaca dan menyetujui{' '}
              <span style={{ color: 'hsl(119,99%,46%)' }}>Syarat &amp; Ketentuan</span> serta{' '}
              <span style={{ color: 'hsl(119,99%,46%)' }}>Kebijakan Privasi</span> SurePath.
            </span>
          </label>

          {/* CTA button */}
          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: checked && !loading
                ? 'hsl(119,99%,46%)'
                : 'rgba(255,255,255,0.07)',
              color: checked && !loading ? '#000' : 'rgba(255,255,255,0.25)',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              cursor: checked && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
          >
            {loading ? 'Memproses…' : 'Setuju & Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
