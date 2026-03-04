
import React from 'react';
// Added comment above fix
// Fix: Aliased GlassCard as Card because Card is not exported from '../shared/UI'.
import { GlassCard as Card, Section, Badge } from '../shared/UI';
import { Camera, Zap, ShieldCheck, Heart } from 'lucide-react';

const Features = () => {
  const data = [
    {
      title: "Foto & Kirim",
      desc: "Lupakan formulir panjang. Cukup ambil foto dokumen atau kerusakan, asisten pintar kami akan mengurus sisanya.",
      icon: Camera,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Persetujuan Cepat",
      desc: "Tidak perlu menunggu berhari-hari. Sistem kami bekerja otomatis untuk memberikan keputusan dalam hitungan menit.",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      title: "Biaya Transparan",
      desc: "Setiap rupiah yang Anda bayarkan jelas gunanya. Tanpa biaya tersembunyi atau potongan yang tidak masuk akal.",
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      title: "Peduli Sepenuh Hati",
      desc: "Kami bukan hanya aplikasi, tapi teman yang siap membantu saat Anda mengalami musibah atau kesulitan.",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-50"
    }
  ];

  return (
    <Section id="how-it-works" className="bg-slate-50">
      <div className="text-center mb-16 space-y-4">
        <Badge variant="success">Kenapa Memilih Kami?</Badge>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
          Perlindungan yang <br/>
          <span className="text-emerald-600">Bisa Anda Percaya.</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.map((item, i) => (
          <Card key={i} className="hover:-translate-y-2">
            <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-6 shadow-inner`}>
              <item.icon size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
};

export default Features;
