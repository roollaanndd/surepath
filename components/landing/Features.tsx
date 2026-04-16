import React from "react";
import { Section, Badge } from "../shared/UI";
import { Camera, Zap, ShieldCheck, Heart } from "lucide-react";

const Features = ({ lang = "ID" }: { lang?: string }) => {
  const data = [
    {
      title: lang === "EN" ? "Simple Claims" : "Klaim Sederhana",
      desc:
        lang === "EN"
          ? "Forget long forms. Just take a photo of the document or damage, and we handle the rest."
          : "Lupakan formulir panjang. Cukup ambil foto dokumen atau kerusakan, dan kami akan mengurus sisanya.",
      icon: Camera,
      number: "01",
    },
    {
      title: lang === "EN" ? "Fast Decisions" : "Keputusan Cepat",
      desc:
        lang === "EN"
          ? "No need to wait days. Our system works to provide decisions in minutes, so you can move forward."
          : "Tidak perlu menunggu berhari-hari. Sistem kami bekerja untuk memberikan keputusan dalam hitungan menit.",
      icon: Zap,
      number: "02",
    },
    {
      title: lang === "EN" ? "Clear Pricing" : "Harga Jelas",
      desc:
        lang === "EN"
          ? "Every penny you pay is clearly accounted for. No hidden fees or unreasonable deductions."
          : "Setiap rupiah yang Anda bayarkan jelas gunanya. Tanpa biaya tersembunyi atau potongan yang tidak masuk akal.",
      icon: ShieldCheck,
      number: "03",
    },
    {
      title: lang === "EN" ? "Always Here" : "Selalu Ada",
      desc:
        lang === "EN"
          ? "We are not just a service, but a partner ready to help when you experience a difficulty."
          : "Kami bukan hanya layanan, tapi mitra yang siap membantu saat Anda mengalami kesulitan.",
      icon: Heart,
      number: "04",
    },
  ];

  return (
    <Section
      id="how-it-works"
      className="bg-white dark:bg-[#111] transition-colors duration-700 py-32 border-t border-slate-200 dark:border-white/5"
    >
      <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-12">
          <div className="space-y-6 max-w-3xl">
            <h2 className="text-5xl md:text-7xl font-semibold text-slate-900 dark:text-white tracking-[-0.02em] leading-[0.9]">
              {lang === "EN" ? "Protection you can" : "Perlindungan yang bisa"}{" "}
              <br />
              <span className="text-emerald-500 italic font-light">
                {lang === "EN" ? "trust." : "Anda percaya."}
              </span>
            </h2>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {lang === "EN" ? "Why Choose Us?" : "Kenapa Memilih Kami?"}
            </p>
            <div className="h-px w-12 bg-emerald-500"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 border-t border-l border-slate-200 dark:border-white/5">
          {data.map((item, i) => (
            <div
              key={i}
              className="p-10 border-r border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="font-mono text-6xl font-black text-slate-900 dark:text-white">
                  {item.number}
                </span>
              </div>

              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-12 group-hover:scale-110 transition-transform duration-500 relative z-10">
                <item.icon size={24} strokeWidth={1.5} />
              </div>

              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Features;
