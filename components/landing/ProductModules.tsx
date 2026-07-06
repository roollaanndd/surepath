import React, { useState } from "react";
import { Section } from "../shared/UI";
import {
  Users,
  ArrowRight,
  Box,
  Command,
  Shield,
  Heart,
  Anchor,
  Car,
  Plane,
  Lock,
  Building2,
  Scale,
} from "lucide-react";
import ProductAIExplainer from "../ProductAIExplainer";
import { Language } from "../../types";

const ProductModules = ({ lang }: { lang: Language }) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const t = (en: string, id: string) => (lang === "EN" ? en : id);

  const retailProducts = [
    {
      id: "auto",
      title: "Auto Protection",
      desc: "Vehicle protection with easy claims and fair pricing.",
      icon: Car,
      tag: "RETAIL_01",
    },
    {
      id: "travel",
      title: "Travel Safe",
      desc: "Worldwide coverage with fast payouts and global assistance.",
      icon: Plane,
      tag: "RETAIL_02",
    },
    {
      id: "pa",
      title: "Personal Safety",
      desc: "Personal protection with quick approval for accidental risks.",
      icon: Shield,
      tag: "RETAIL_03",
    },
    {
      id: "mpar",
      title: "Item Shield",
      desc: "All-risk protection for gadgets and valuable assets.",
      icon: Box,
      tag: "RETAIL_04",
    },
    {
      id: "health",
      title: "Family Health",
      desc: "Health coverage with digital hospital passes and easy access.",
      icon: Heart,
      tag: "RETAIL_05",
    },
  ];

  const corpProducts = [
    {
      id: "fleet",
      title: "Fleet Management",
      desc: "Unified protection for company fleets with real-time tracking.",
      icon: Building2,
      tag: "CORP_01",
    },
    {
      id: "cyber",
      title: "Cyber Shield",
      desc: "Enterprise-grade protection against data breaches and threats.",
      icon: Lock,
      tag: "CORP_02",
    },
    {
      id: "liability",
      title: "Liability Protection",
      desc: "Public and professional liability protection for modern enterprises.",
      icon: Scale,
      tag: "CORP_03",
    },
    {
      id: "marine",
      title: "Marine Protection",
      desc: "Reliable protection for logistics, cargo, and marine assets.",
      icon: Anchor,
      tag: "CORP_04",
    },
    {
      id: "employee",
      title: "Employee Benefits",
      desc: "Dynamic group health and life benefits for your workforce.",
      icon: Users,
      tag: "CORP_05",
    },
  ];

  return (
    <Section className="bg-[#f5f5f4] dark:bg-[#0a0a0a] overflow-hidden relative py-32 transition-colors duration-700 border-t border-slate-200 dark:border-white/5">
      {selectedProduct && (
        <ProductAIExplainer
          productName={selectedProduct}
          lang={lang}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-12">
          <div className="space-y-6 max-w-3xl">
            <h2 className="font-sora text-5xl md:text-7xl font-semibold text-slate-900 dark:text-white tracking-[-0.02em] leading-[0.9]">
              Protection <br />
              <span className="text-emerald-500 italic font-light">
                Modules.
              </span>
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-xl">
              {t(
                "Choose a specialized module to deploy protection for your personal assets or business.",
                "Pilih modul khusus untuk memasang proteksi bagi aset pribadi atau bisnis Anda.",
              )}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t("Product Ecosystem", "Ekosistem Produk")}
            </p>
            <div className="h-px w-12 bg-emerald-500"></div>
          </div>
        </div>

        <div className="space-y-32 relative z-10">
          {/* --- RETAIL SECTION --- */}
          <div className="space-y-12">
            <div className="flex items-center gap-6">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t("Retail", "Individu")}{" "}
                <span className="text-emerald-500 italic font-light">
                  Protection
                </span>
              </h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {retailProducts.map((p, i) => (
                <ProductCard
                  key={i}
                  p={p}
                  onDetail={() => setSelectedProduct(p.title)}
                />
              ))}
            </div>
          </div>

          {/* --- CORPORATE SECTION --- */}
          <div className="space-y-12">
            <div className="flex items-center gap-6">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t("Corporate", "Bisnis")}{" "}
                <span className="text-emerald-500 italic font-light">
                  Solutions
                </span>
              </h3>
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {corpProducts.map((p, i) => (
                <ProductCard
                  key={i}
                  p={p}
                  onDetail={() => setSelectedProduct(p.title)}
                />
              ))}
            </div>
          </div>

          {/* --- CORE PRODUCT CTA --- */}
          <div className="relative group pt-12">
            <div className="relative bg-slate-100 dark:bg-[#111] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden transition-colors duration-700">
              <div className="grid lg:grid-cols-2 items-stretch">
                <div className="p-12 md:p-20 flex flex-col justify-center space-y-10">
                  <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 w-fit">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Global Infrastructure
                    </span>
                  </div>

                  <h3 className="text-5xl md:text-7xl font-semibold tracking-tight text-slate-900 dark:text-white leading-[0.9]">
                    Reliable Core <br />
                    <span className="text-emerald-500 italic font-light">
                      System
                    </span>
                  </h3>

                  <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                    {t(
                      "The core system of SurePath. It handles claims, pricing, and distribution across all modules efficiently.",
                      "Sistem inti SurePath. Menangani klaim, harga, dan distribusi di seluruh modul secara efisien.",
                    )}
                  </p>

                  <button
                    onClick={() =>
                      setSelectedProduct("Smart Distribution System")
                    }
                    className="h-16 px-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all w-fit"
                  >
                    {t("Explore Core System", "Jelajahi Sistem Inti")}
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="relative h-full min-h-[400px] bg-white dark:bg-[#0a0a0a] border-l border-slate-200 dark:border-white/5 flex items-center justify-center p-12 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                      backgroundSize: "32px 32px",
                    }}
                  ></div>

                  <div className="relative z-10 w-full aspect-square max-w-md rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center animate-spin-slow">
                    <div className="w-3/4 h-3/4 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center animate-reverse-spin">
                      <div className="w-1/2 h-1/2 bg-slate-100 dark:bg-[#111] rounded-full flex items-center justify-center shadow-2xl">
                        <Command
                          size={48}
                          strokeWidth={1}
                          className="text-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

const ProductCard: React.FC<{ p: any; onDetail: () => void }> = ({
  p,
  onDetail,
}) => {
  return (
    <div
      onClick={onDetail}
      className="group p-8 bg-white dark:bg-[#111] rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:border-emerald-500/30 relative overflow-hidden h-full min-h-[320px]"
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-12">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/5 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all duration-500">
            <p.icon size={28} strokeWidth={1.5} />
          </div>
          <span className="px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
            {p.tag}
          </span>
        </div>

        <div className="mt-auto">
          <h4 className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white mb-4">
            {p.title}
          </h4>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            {p.desc}
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
        <ArrowRight size={18} strokeWidth={2} />
      </div>
    </div>
  );
};

export default ProductModules;
