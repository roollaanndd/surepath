import React, { useRef, useEffect } from "react";
import { ArrowRight, ShieldCheck, Shield, Zap } from "lucide-react";

interface HeroProps {
  lang?: string;
  onAction: () => void;
  onAdminAction?: () => void;
}

const Hero = ({ onAction, onAdminAction, lang = "ID" }: HeroProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Animated orbs
    const orbs = [
      { x: 0.2, y: 0.3, r: 500, color: '249,115,22', op: 0.08, sx: 0.0004, sy: 0.0003, phase: 0 },
      { x: 0.8, y: 0.6, r: 400, color: '59,130,246', op: 0.06, sx: 0.0003, sy: 0.0005, phase: 2 },
      { x: 0.5, y: 0.8, r: 350, color: '168,85,247', op: 0.05, sx: 0.0005, sy: 0.0004, phase: 4 },
      { x: 0.1, y: 0.7, r: 300, color: '16,185,129', op: 0.05, sx: 0.0006, sy: 0.0003, phase: 1 },
    ];

    let frame = 0, animId: number;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach(orb => {
        const px = canvas.width  * (orb.x + 0.25 * Math.sin(frame * orb.sx + orb.phase));
        const py = canvas.height * (orb.y + 0.20 * Math.cos(frame * orb.sy + orb.phase * 1.3));
        const g = ctx.createRadialGradient(px, py, 0, px, py, orb.r);
        g.addColorStop(0,   `rgba(${orb.color},${orb.op})`);
        g.addColorStop(0.5, `rgba(${orb.color},${(orb.op * 0.3).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${orb.color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#05080d' }}>
      {/* Animated canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent 10%, rgba(249,115,22,0.4) 50%, transparent 90%)',
      }} />

      <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-2 h-full relative z-10">
        {/* Left Pane: Content */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-24 lg:py-0 relative z-10">
          <div className="space-y-12 animate-fade-in max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                {lang === "EN" ? "Next-Gen Protection" : "Proteksi Masa Depan"}
              </span>
            </div>

            <h1 className="text-7xl md:text-[112px] font-semibold text-white leading-[0.88] tracking-[-0.02em]">
              {lang === "EN" ? "Protection" : "Proteksi"} <br />
              <span className="text-emerald-500 italic font-light">
                {lang === "EN" ? "Made easy." : "Lebih mudah."}
              </span>
            </h1>

            <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-lg">
              {lang === "EN"
                ? "We make protection straightforward and dependable. Get covered in minutes, file claims easily, and get help when you need it most."
                : "Kami membuat perlindungan menjadi mudah dan dapat diandalkan. Dapatkan perlindungan dalam hitungan menit, ajukan klaim dengan mudah, dan dapatkan bantuan saat Anda paling membutuhkannya."}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 pt-8">
              <button
                onClick={onAction}
                className="h-16 px-10 text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all"
                style={{ background: '#00C16A', boxShadow: '0 0 40px rgba(0,193,106,0.35)' }}
              >
                {lang === "EN" ? "Get Covered" : "Mulai Proteksi"}
                <ArrowRight size={18} />
              </button>

              {onAdminAction && (
                <button
                  onClick={onAdminAction}
                  className="h-16 px-10 border border-white/20 text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all hover:bg-white/5"
                >
                  <ShieldCheck size={18} className="text-emerald-500" />
                  {lang === "EN" ? "Admin Portal" : "Portal Admin"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Visuals */}
        <div className="hidden lg:flex relative border-l border-white/5 items-center justify-center overflow-hidden">
          {/* Background Pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          ></div>

          {/* Main Image Container */}
          <div className="relative w-full max-w-lg aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 z-10 transform rotate-2 hover:rotate-0 transition-transform duration-700">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop"
              className="w-full h-full object-cover"
              alt="Approachable Insurance"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
          </div>

          {/* Floating Feature Bubbles */}
          <div className="absolute top-1/4 left-10 bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-white/10 transform -rotate-6 animate-float z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === "EN" ? "Protected" : "Terlindungi"}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  24/7 Monitoring
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-1/4 right-10 bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-white/10 transform rotate-6 animate-float animation-delay-2000 z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === "EN" ? "Claim Paid" : "Klaim Cair"}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Under 5 mins
                </p>
              </div>
            </div>
          </div>

          {/* Vertical Rail Text */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30">
            <p className="writing-vertical-rl rotate-180 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 bg-[#0a0a0a] py-8 px-2 border-y border-r border-white/5 rounded-r-xl">
              {lang === "EN" ? "Simple Protection" : "Perlindungan Sederhana"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
