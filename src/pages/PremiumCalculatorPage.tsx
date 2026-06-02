import React, { useState } from 'react';
import { ArrowLeft, Shield, Car, CheckCircle } from 'lucide-react';

// Rate batas bawah OJK per SE OJK No.06/SEOJK.05/2017
// [allRisk%, tlo%]
const OJK_RATES = {
  wilayah1: [ // Sumatera, Kep Riau, Bangka, NTT, Maluku, Papua
    [3.82, 0.47], // ≤ 125 juta
    [2.67, 0.65], // 125–200 juta
    [2.18, 0.44], // 200–400 juta
    [1.20, 0.53], // 400–800 juta
    [1.05, 0.27], // > 800 juta
  ],
  wilayah2: [ // DKI Jakarta, Banten, Jawa Barat
    [3.82, 0.63],
    [2.67, 0.63],
    [2.18, 0.53],
    [1.20, 0.53],
    [1.05, 0.27],
  ],
  wilayah3: [ // Jateng, Jatim, Bali, Kalimantan, Sulawesi, dll
    [3.18, 0.51],
    [2.56, 0.44],
    [2.18, 0.37],
    [1.20, 0.27],
    [1.05, 0.24],
  ],
};

function getCategory(valueJuta: number): number {
  if (valueJuta <= 125) return 0;
  if (valueJuta <= 200) return 1;
  if (valueJuta <= 400) return 2;
  if (valueJuta <= 800) return 3;
  return 4;
}

type WilayahKey = 'wilayah1' | 'wilayah2' | 'wilayah3';
type Coverage = 'allRisk' | 'tlo';
type Step = 'form' | 'results' | 'success';

interface Props {
  onSignIn: () => void;
  onBack: () => void;
}

const GREEN = 'hsl(119,99%,46%)';
const BG = 'hsl(0,0%,8%)';
const CARD_BG = 'rgba(255,255,255,0.04)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = 'rgba(255,255,255,0.06)';

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const wilayahOptions: { key: WilayahKey; label: string; desc: string }[] = [
  { key: 'wilayah1', label: 'Wilayah 1', desc: 'Sumatera, Papua, Maluku, NTT, Kep. Riau, Bangka' },
  { key: 'wilayah2', label: 'Wilayah 2', desc: 'Jakarta, Banten, Jawa Barat' },
  { key: 'wilayah3', label: 'Wilayah 3', desc: 'Jateng, Jatim, Bali, Kalimantan, Sulawesi' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: INPUT_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 8,
  color: '#fff',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  padding: '16px 20px',
};

export default function PremiumCalculatorPage({ onSignIn, onBack }: Props) {
  // Form state
  const [hargaJuta, setHargaJuta] = useState(250);
  const [wilayah, setWilayah] = useState<WilayahKey>('wilayah2');
  const [coverage, setCoverage] = useState<Coverage>('allRisk');

  // Results state
  const [step, setStep] = useState<Step>('form');
  const [annualPremium, setAnnualPremium] = useState(0);
  const [rateUsed, setRateUsed] = useState(0);

  // Lead form state
  const [leadName, setLeadName] = useState('');
  const [leadWa, setLeadWa] = useState('');
  const [leadSuccess, setLeadSuccess] = useState(false);

  function calculate() {
    const cat = getCategory(hargaJuta);
    const rates = OJK_RATES[wilayah][cat];
    const rate = coverage === 'allRisk' ? rates[0] : rates[1];
    const premium = Math.round((rate / 100) * hargaJuta * 1_000_000);
    setRateUsed(rate);
    setAnnualPremium(premium);
    setStep('results');
  }

  function reset() {
    setStep('form');
    setLeadName('');
    setLeadWa('');
    setLeadSuccess(false);
  }

  function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Store to localStorage
    const existing = JSON.parse(localStorage.getItem('sp_calc_leads') || '[]');
    existing.push({
      name: leadName,
      wa: leadWa,
      hargaJuta,
      coverage,
      wilayah,
      annualPremium,
      ts: new Date().toISOString(),
    });
    localStorage.setItem('sp_calc_leads', JSON.stringify(existing));

    // Open WhatsApp
    const coverageLabel = coverage === 'allRisk' ? 'All Risk' : 'TLO';
    const wilayahLabel = wilayahOptions.find(w => w.key === wilayah)?.label ?? wilayah;
    const text = encodeURIComponent(
      `Halo SurePath, saya ${leadName} ingin tanya asuransi mobil ${coverageLabel} harga Rp${hargaJuta}juta di ${wilayahLabel}`
    );
    window.open(`https://wa.me/6281234567890?text=${text}`, '_blank');
    setLeadSuccess(true);
    setStep('success');
  }

  const wilayahLabel = wilayahOptions.find(w => w.key === wilayah)?.label ?? '';

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 0' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: 14, padding: '6px 0', marginBottom: 24,
          }}
        >
          <ArrowLeft size={16} /> Kembali
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Car size={26} color={GREEN} />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                Kalkulator Premi Asuransi Mobil
              </h1>
              <span style={{
                display: 'inline-block', marginTop: 6,
                background: 'rgba(57,255,20,0.12)', color: GREEN,
                border: `1px solid rgba(57,255,20,0.3)`,
                borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
              }}>
                Tarif Resmi OJK
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: Form */}
        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>

            {/* Harga Kendaraan */}
            <div style={cardStyle}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
                Harga Kendaraan
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <input
                  type="number"
                  min={50} max={2000}
                  value={hargaJuta}
                  onChange={e => setHargaJuta(Math.max(50, Math.min(2000, Number(e.target.value))))}
                  style={{ ...inputStyle, width: 130, flexShrink: 0 }}
                />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>juta rupiah</span>
                <span style={{ marginLeft: 'auto', color: GREEN, fontWeight: 700, fontSize: 15 }}>
                  {formatRupiah(hargaJuta * 1_000_000)}
                </span>
              </div>
              <input
                type="range"
                min={50} max={2000} step={5}
                value={hargaJuta}
                onChange={e => setHargaJuta(Number(e.target.value))}
                style={{ width: '100%', accentColor: GREEN, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                <span>Rp 50 juta</span><span>Rp 2.000 juta</span>
              </div>
            </div>

            {/* Wilayah */}
            <div style={cardStyle}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
                Wilayah Kendaraan
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {wilayahOptions.map(opt => (
                  <label
                    key={opt.key}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      background: wilayah === opt.key ? 'rgba(57,255,20,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${wilayah === opt.key ? 'rgba(57,255,20,0.4)' : CARD_BORDER}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="wilayah"
                      value={opt.key}
                      checked={wilayah === opt.key}
                      onChange={() => setWilayah(opt.key)}
                      style={{ accentColor: GREEN, marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Jenis Perlindungan */}
            <div style={cardStyle}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
                Jenis Perlindungan
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  {
                    key: 'allRisk' as Coverage,
                    title: 'All Risk',
                    sub: 'Komprehensif',
                    desc: 'Menanggung semua jenis kerusakan — goresan ringan, kecelakaan, hingga bencana alam.',
                    icon: <Shield size={22} color={GREEN} />,
                  },
                  {
                    key: 'tlo' as Coverage,
                    title: 'TLO',
                    sub: 'Total Loss Only',
                    desc: 'Menanggung kehilangan atau kerusakan total ≥ 75% dari nilai kendaraan.',
                    icon: <Car size={22} color={coverage === 'tlo' ? GREEN : 'rgba(255,255,255,0.4)'} />,
                  },
                ] as const).map(opt => (
                  <label
                    key={opt.key}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 8,
                      padding: '14px 14px', borderRadius: 10, cursor: 'pointer',
                      background: coverage === opt.key ? 'rgba(57,255,20,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${coverage === opt.key ? 'rgba(57,255,20,0.4)' : CARD_BORDER}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="coverage"
                      value={opt.key}
                      checked={coverage === opt.key}
                      onChange={() => setCoverage(opt.key)}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {opt.icon}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{opt.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{opt.sub}</div>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{opt.desc}</p>
                    {coverage === opt.key && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: GREEN, fontSize: 12, fontWeight: 600 }}>
                        <CheckCircle size={13} /> Dipilih
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={calculate}
              style={{
                width: '100%', padding: '15px 24px', borderRadius: 10, border: 'none',
                background: GREEN, color: '#000', fontWeight: 700, fontSize: 16,
                cursor: 'pointer', letterSpacing: 0.3,
              }}
            >
              Hitung Premi →
            </button>
          </div>
        )}

        {/* STEP 2 & 3: Results + Lead Capture */}
        {(step === 'results' || step === 'success') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>

            {/* Premium Result Card */}
            <div style={{
              ...cardStyle,
              background: 'rgba(57,255,20,0.07)',
              border: '1px solid rgba(57,255,20,0.25)',
              textAlign: 'center', padding: '28px 24px',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Estimasi Premi Tahunan
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800, color: GREEN, lineHeight: 1.1 }}>
                {formatRupiah(annualPremium)}
              </p>
              <p style={{ margin: '0 0 20px', fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>
                {formatRupiah(Math.round(annualPremium / 12))} <span style={{ fontSize: 13 }}>/bulan</span>
              </p>

              {/* Summary grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'left', marginTop: 8 }}>
                {[
                  { label: 'Tarif Digunakan', value: `${rateUsed.toFixed(2)}% (batas bawah OJK)` },
                  { label: 'Harga Kendaraan', value: `Rp ${hargaJuta} juta` },
                  { label: 'Perlindungan', value: coverage === 'allRisk' ? 'All Risk' : 'TLO' },
                  { label: 'Wilayah', value: wilayahLabel },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <p style={{
                margin: '18px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14,
              }}>
                Estimasi berdasarkan tarif batas bawah OJK (SE OJK No.06/SEOJK.05/2017).<br />
                Premi final ditentukan oleh perusahaan asuransi.
              </p>
            </div>

            <button
              onClick={reset}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer', fontSize: 13, textDecoration: 'underline', textAlign: 'left', padding: 0,
              }}
            >
              ← Hitung Ulang
            </button>

            {/* Lead Capture */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>
                Dapatkan penawaran resmi dari agen SurePath
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Isi data berikut dan kami akan menghubungi kamu via WhatsApp.
              </p>

              {step === 'success' ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 10, padding: '20px 0', textAlign: 'center',
                }}>
                  <CheckCircle size={36} color={GREEN} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Terima kasih!</p>
                  <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    Agen kami akan segera menghubungi kamu.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama kamu"
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>
                      No. WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="08xxxxxxxxxx"
                      value={leadWa}
                      onChange={e => setLeadWa(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '13px 20px', borderRadius: 9, border: 'none',
                      background: GREEN, color: '#000', fontWeight: 700, fontSize: 15,
                      cursor: 'pointer', marginTop: 4,
                    }}
                  >
                    Kirim &amp; Dapatkan Penawaran
                  </button>
                </form>
              )}
            </div>

            {/* Secondary CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
              <button
                onClick={onSignIn}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 9,
                  border: `1px solid ${CARD_BORDER}`, background: CARD_BG,
                  color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >
                Beli Langsung di App
              </button>
              <p style={{ textAlign: 'center', margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Sudah punya akun?{' '}
                <button
                  onClick={onSignIn}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0,
                  }}
                >
                  Masuk dulu
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
