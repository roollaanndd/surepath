import React from "react";
import { SearchCheck, FileText, ShieldCheck, ArrowRight } from "lucide-react";

interface HowItWorksProps { lang?: string; onAction?: () => void }

const STEPS = [
  {
    n: "01",
    icon: SearchCheck,
    titleEN: "Choose Protection",
    titleID: "Pilih Proteksi",
    descEN: "Browse 40+ products from 18+ insurers. Our AI suggests the right fit for your profile.",
    descID: "Jelajahi 40+ produk dari 18+ insurer. AI kami merekomendasikan yang paling sesuai profil Anda.",
    accent: "#00C16A",
  },
  {
    n: "02",
    icon: FileText,
    titleEN: "Fill in Minutes",
    titleID: "Isi dalam Menit",
    descEN: "Smart forms, OCR document scanning, no repeated data entry. Done in under 3 minutes.",
    descID: "Formulir pintar, scan dokumen OCR, tanpa input berulang. Selesai kurang dari 3 menit.",
    accent: "#3B82F6",
  },
  {
    n: "03",
    icon: ShieldCheck,
    titleEN: "Get Covered Now",
    titleID: "Langsung Terlindungi",
    descEN: "Policy issued instantly. Coverage starts immediately. Claims settled in under 5 minutes.",
    descID: "Polis terbit seketika. Perlindungan langsung aktif. Klaim diselesaikan kurang dari 5 menit.",
    accent: "#7C3AED",
  },
];

const HowItWorks: React.FC<HowItWorksProps> = ({ lang = "ID", onAction }) => {
  const t = (en: string, id: string) => lang === "EN" ? en : id;

  return (
    <section className="relative py-32 border-t border-slate-200 dark:border-white/5 overflow-hidden" style={{ background: '#ffffff' }}>
      <div className="dark:hidden absolute inset-0" style={{ background: '#ffffff' }} />
      <div className="hidden dark:block absolute inset-0" style={{ background: '#080B12' }} />

      <div className="max-w-[1400px] mx-auto px-8 lg:px-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-2xs font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                {t("How it works", "Cara Kerja")}
              </span>
            </div>
            <h2 className="font-sora font-semibold text-slate-900 dark:text-white leading-[0.9] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)' }}>
              {t("Covered in", "Terlindungi dalam")} <br />
              <span className="text-emerald-500 italic font-light">
                {t("3 simple steps.", "3 langkah mudah.")}
              </span>
            </h2>
          </div>
          {onAction && (
            <button
              onClick={onAction}
              className="h-14 px-8 text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
              style={{ background: '#00C16A', boxShadow: '0 0 32px rgba(0,193,106,0.3)' }}
            >
              {t("Start Now", "Mulai Sekarang")}
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-0 border border-slate-200 dark:border-white/5 rounded-[3rem] overflow-hidden">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className={`relative p-10 lg:p-14 flex flex-col gap-8 group ${i < STEPS.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/5' : ''}`}>
                {/* Step number watermark */}
                <div className="absolute top-6 right-8 font-sora font-black text-[5rem] leading-none pointer-events-none select-none opacity-[0.04]"
                  style={{ color: step.accent }}>
                  {step.n}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
                  style={{ background: `${step.accent}15`, color: step.accent }}>
                  <Icon size={28} strokeWidth={1.5} />
                </div>

                {/* Connector line (desktop) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute top-[4.5rem] -right-px h-px w-8 hidden lg:block"
                    style={{ background: `linear-gradient(90deg, transparent, ${step.accent}40)` }} />
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="font-sora font-black text-2xs uppercase tracking-[0.3em]"
                      style={{ color: step.accent }}>
                      {t(`Step ${i + 1}`, `Langkah ${i + 1}`)}
                    </span>
                  </div>
                  <h3 className="font-sora font-bold text-slate-900 dark:text-white tracking-tight"
                    style={{ fontSize: 'clamp(1.25rem,2vw,1.75rem)' }}>
                    {t(step.titleEN, step.titleID)}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {t(step.descEN, step.descID)}
                  </p>
                </div>

                <div className="mt-auto">
                  <div className="h-1 w-12 rounded-full transition-all duration-500 group-hover:w-20"
                    style={{ background: step.accent }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
