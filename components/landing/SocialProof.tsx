import React, { useEffect, useRef, useState } from "react";

const Counter = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const dur = 1600;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(ease * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-sora font-black tabular-nums" style={{ fontSize: 'clamp(2.5rem,5vw,4rem)', lineHeight: 1, letterSpacing: '-0.04em' }}>
      {count.toLocaleString("id-ID")}{suffix}
    </div>
  );
};

interface SocialProofProps { lang?: string }

const STATS = [
  { target: 12400, suffix: "+", labelEN: "Active Clients",    labelID: "Nasabah Aktif" },
  { target: 98,    suffix: "%", labelEN: "Satisfaction Rate", labelID: "Tingkat Kepuasan" },
  { target: 18,    suffix: "+", labelEN: "Insurer Partners",  labelID: "Mitra Insurer" },
  { target: 5,     suffix: "m", labelEN: "Claims Paid",       labelID: "Klaim Dibayar" },
];

const SocialProof: React.FC<SocialProofProps> = ({ lang = "ID" }) => {
  const t = (en: string, id: string) => lang === "EN" ? en : id;

  return (
    <section className="relative py-16 border-y border-slate-200 dark:border-white/5 overflow-hidden" style={{ background: '#05080d' }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-0 lg:divide-x divide-white/10">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center lg:items-start text-center lg:text-left lg:px-12 first:pl-0 last:pr-0 gap-3">
              <div className="text-emerald-500">
                <Counter target={s.target} suffix={s.suffix} />
              </div>
              <div className="h-px w-8 bg-emerald-500/60 hidden lg:block" />
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-slate-400">
                {t(s.labelEN, s.labelID)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
