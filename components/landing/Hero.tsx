import React from "react";
import { ArrowRight, ShieldCheck, Shield, Zap } from "lucide-react";

interface HeroProps {
  lang?: string;
  onAction: () => void;
  onAdminAction?: () => void;
}

const Hero = ({ onAction, onAdminAction, lang = "ID" }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-animated-gradient transition-colors duration-700">
      {/* Dynamic Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 dark:bg-slate-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-[80px] animate-bounce" style={{ animationDuration: '10s' }}></div>

      <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-2 h-full relative z-10">
        {/* Left Pane: Content */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-24 lg:py-0 relative z-10">
          <div className="space-y-12 animate-fade-in max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                {lang === "EN" ? "Next-Gen Protection" : "Proteksi Masa Depan"}
              </span>
            </div>

            <h1 className="text-7xl md:text-[112px] font-semibold text-slate-900 dark:text-white leading-[0.88] tracking-[-0.02em]">
              {lang === "EN" ? "Protection" : "Proteksi"} <br />
              <span className="text-emerald-500 italic font-light">
                {lang === "EN" ? "Made easy." : "Lebih mudah."}
              </span>
            </h1>

            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
              {lang === "EN"
                ? "We make protection straightforward and dependable. Get covered in minutes, file claims easily, and get help when you need it most."
                : "Kami membuat perlindungan menjadi mudah dan dapat diandalkan. Dapatkan perlindungan dalam hitungan menit, ajukan klaim dengan mudah, dan dapatkan bantuan saat Anda paling membutuhkannya."}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 pt-8">
              <button
                onClick={onAction}
                className="h-16 px-10 bg-emerald-500 text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)]"
              >
                {lang === "EN" ? "Get Covered" : "Mulai Proteksi"}
                <ArrowRight size={18} />
              </button>

              {onAdminAction && (
                <button
                  onClick={onAdminAction}
                  className="h-16 px-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl border border-slate-800 dark:border-white/10"
                >
                  <ShieldCheck size={18} className="text-emerald-500" />
                  {lang === "EN" ? "Admin Portal" : "Portal Admin"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Visuals */}
        <div className="hidden lg:flex relative bg-slate-100 dark:bg-[#111] border-l border-slate-200 dark:border-white/5 items-center justify-center overflow-hidden">
          {/* Background Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          ></div>

          {/* Main Image Container */}
          <div className="relative w-full max-w-lg aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 z-10 transform rotate-2 hover:rotate-0 transition-transform duration-700">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop"
              className="w-full h-full object-cover"
              alt="Approachable Insurance"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
          </div>

          {/* Floating Feature Bubbles */}
          <div className="absolute top-1/4 left-10 bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 transform -rotate-6 animate-float z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {lang === "EN" ? "Protected" : "Terlindungi"}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  24/7 Monitoring
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-1/4 right-10 bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 transform rotate-6 animate-float animation-delay-2000 z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {lang === "EN" ? "Claim Paid" : "Klaim Cair"}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Under 5 mins
                </p>
              </div>
            </div>
          </div>

          {/* Vertical Rail Text */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30">
            <p className="writing-vertical-rl rotate-180 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 bg-[#f5f5f4] dark:bg-[#0a0a0a] py-8 px-2 border-y border-r border-slate-200 dark:border-white/5 rounded-r-xl">
              {lang === "EN" ? "Simple Protection" : "Perlindungan Sederhana"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
