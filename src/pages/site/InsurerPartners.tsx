// InsurerPartners.tsx — pita kepercayaan "mitra asuransi".
//
// Menggantikan statistik karangan dan testimoni karangan di `/about`, dan
// mengisi lubang terbesar di situs publik: tidak ada satu pun nama atau logo
// perusahaan asuransi di seluruh situs. Untuk marketplace asuransi Indonesia,
// nama penerbit polis yang berizin OJK adalah sinyal kepercayaan terkuat yang
// tersedia — lebih kuat daripada angka apa pun.
//
// Logo belum ada di sistem (`sp_insurers.logo_url` NULL untuk semua baris),
// jadi tiap mitra tampil sebagai kartu nama. Begitu berkas logo resmi masuk ke
// `public/insurers/` dan diisikan di `insurerPartners.ts`, kartu yang sama
// menampilkan logonya tanpa perlu mengubah tata letak.
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Reveal, SectionLabel, useT, useSiteTheme } from './siteKit';
import { INSURER_PARTNERS } from './insurerPartners';
import { Language } from '../../../types';

interface Props {
  lang: Language;
  darkMode: boolean;
  /** Latar bagian, diteruskan pemanggil supaya ritme halaman tidak pecah. */
  background?: string;
  /** `false` di beranda, karena di sana judulnya sudah cukup dari konteks. */
  showIntro?: boolean;
}

const InsurerPartners: React.FC<Props> = ({ lang, darkMode, background, showIntro = true }) => {
  const t = useT(lang);
  const { cardBg, cardBorder, textMain, textMuted, accent } = useSiteTheme(darkMode);

  return (
    <section className="py-20 px-6" style={{ background, borderTop: `1px solid ${cardBorder}` }}>
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className={showIntro ? 'mb-12 max-w-2xl' : 'mb-10 max-w-2xl'}>
            <SectionLabel darkMode={darkMode}>{t('Mitra Asuransi', 'Insurance Partners')}</SectionLabel>
            <h2 className="font-bold leading-tight tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', color: textMain }}>
              {t('Polismu diterbitkan ', 'Your policy is issued by ')}
              <span style={{ color: accent }}>{t('perusahaan berizin OJK', 'OJK-licensed insurers')}</span>
            </h2>
            {showIntro && (
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t(
                  'SurePath bukan perusahaan asuransi. Kami memasarkan produk dari perusahaan asuransi berizin dan diawasi Otoritas Jasa Keuangan — dan inilah mitra yang menerbitkan polismu.',
                  'SurePath is not an insurance company. We market products from insurers licensed and supervised by Indonesia\'s Financial Services Authority — these are the partners that issue your policy.',
                )}
              </p>
            )}
          </div>
        </Reveal>

        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
          {INSURER_PARTNERS.map((p, i) => (
            <Reveal key={p.name} delay={i * 50}>
              <li className="rounded-2xl px-5 py-6 h-full flex items-center justify-center text-center"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                {p.logo ? (
                  <img src={p.logo} alt={p.name} loading="lazy"
                    className="max-h-10 w-auto object-contain" style={{ maxWidth: '100%' }} />
                ) : (
                  <span className="text-sm font-bold leading-snug" style={{ color: textMain }}>
                    {p.name}
                  </span>
                )}
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={120}>
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed" style={{ color: textMuted }}>
            <ShieldCheck size={14} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
            <span>
              {t(
                'Setiap polis diterbitkan langsung oleh perusahaan asuransi mitra sesuai ketentuan yang berlaku.',
                'Every policy is issued directly by the partner insurer under applicable regulations.',
              )}
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default InsurerPartners;
