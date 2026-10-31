import React, { useState } from 'react';
import { ArrowRight, Mail, MessageSquare, Clock, Loader2 } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SUREPATH_WHATSAPP } from '../../constants';
import { submitContactLead } from '../../services/supabaseService';
import { trackEvent } from '../analytics';
import { SitePageProps, useT, useSiteTheme, Reveal, SectionLabel, useWebsiteConfig } from './site/siteKit';

const ContactPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, sectionBg3, accent } = th;

  const config = useWebsiteConfig('footer');

  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulir ini dulu hanya memanggil `setSent(true)` lalu memberi tahu
  // pengunjung "Pesan Terkirim! Tim kami akan segera menghubungimu." tanpa
  // mengirim apa pun ke mana pun — setiap prospek dibuang, dan janjinya palsu.
  // Sekarang isinya tersimpan lewat data-gateway dan muncul di antrean
  // operator. Pesan sukses hanya tampil setelah server benar-benar menerima.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);

    const failure = await submitContactLead({
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
      source_path: typeof window !== 'undefined' ? window.location.pathname : '/contact',
    });

    setSending(false);
    if (failure) { setError(failure); return; }

    trackEvent('contact_form_submit', { source_path: '/contact' });
    setSent(true);
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  const CHANNELS = [
    { icon: MessageSquare, color: '#25d366', label: 'WhatsApp', value: `+${SUREPATH_WHATSAPP}`, href: `https://wa.me/${SUREPATH_WHATSAPP}` },
    { icon: Mail,          color: accent,    label: 'Email',    value: 'halo@myinsurepath.com', href: 'mailto:halo@myinsurepath.com' },
  ];

  // roland memastikan 24/7 yang benar (31 Okt 2026). Blok Senin–Jumat yang
  // lama bertentangan dengan "24/7 Support Online" di beranda — dua klaim
  // berbeda di situs yang sama, dan pengunjung yang menghubungi hari Minggu
  // akan menemukan mana yang salah.
  const HOURS = [
    { day: t('Senin – Jumat', 'Monday – Friday'),          hours: '24 ' + t('jam', 'hours') },
    { day: t('Sabtu & Minggu', 'Saturday & Sunday'),       hours: '24 ' + t('jam', 'hours') },
    { day: t('Hari Libur Nasional', 'Public Holidays'),    hours: '24 ' + t('jam', 'hours') },
  ];

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors border`;
  const inputStyle = { background: cardBg, borderColor: cardBorder, color: textMain } as React.CSSProperties;

  return (
    <SiteLayout {...props} active="contact" bgVideo="/bg2.mp4">

      {/* ─── Header ─── */}
      <section className="pt-36 pb-14 px-5 text-center">
        <Reveal>
          <SectionLabel darkMode={props.darkMode}>{t('Hubungi Kami', 'Contact Us')}</SectionLabel>
          <h1 className="font-bold leading-tight tracking-tight mb-4" style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', color: textMain }}>
            {config?.headline || <>{t('Kami siap ', 'We\'re ready to ')}<span style={{ color: accent }}>{t('membantu kamu', 'help you')}</span></>}
          </h1>
          <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: textMuted }}>
            {config?.subtitle || t('Pertanyaan soal produk, klaim, atau hanya ingin tahu lebih lanjut — tim kami siap menjawab kapan saja.', 'Questions about products, claims, or just want to know more — our team is ready to answer anytime.')}
          </p>
        </Reveal>
      </section>

      {/* ─── Main content ─── */}
      <section className="pb-24 px-5" style={{ borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-6xl mx-auto pt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Contact form */}
          <Reveal>
            <div className="p-8 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: textMain }}>{t('Kirim Pesan', 'Send a Message')}</h2>
              {sent ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
                    <ArrowRight size={22} style={{ color: accent }} />
                  </div>
                  <p className="font-bold text-base mb-1" style={{ color: textMain }}>{t('Pesan Terkirim!', 'Message Sent!')}</p>
                  <p className="text-sm" style={{ color: textMuted }}>{t('Tim kami akan segera menghubungimu.', 'Our team will reach out shortly.')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>{t('Nama Lengkap', 'Full Name')}</label>
                      <input required className={inputCls} style={inputStyle} placeholder={t('Masukkan nama kamu', 'Enter your name')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>{t('Nomor HP', 'Phone Number')}</label>
                      <input type="tel" className={inputCls} style={inputStyle} placeholder="+62 8xx-xxxx-xxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>Email</label>
                    <input required type="email" className={inputCls} style={inputStyle} placeholder="nama@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>{t('Pesan', 'Message')}</label>
                    <textarea required rows={4} className={inputCls + ' resize-none'} style={inputStyle} placeholder={t('Ceritakan kebutuhan atau pertanyaanmu...', 'Tell us your needs or questions...')} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm font-semibold rounded-xl px-4 py-3"
                      style={{ color: '#b91c1c', background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.25)' }}>
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={sending}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: accent, opacity: sending ? 0.7 : 1 }}>
                    {sending
                      ? <><Loader2 size={15} className="animate-spin" /> {t('Mengirim…', 'Sending…')}</>
                      : <>{t('Kirim Pesan', 'Send Message')} →</>}
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          {/* Channels + hours */}
          <div className="space-y-5">
            <Reveal>
              <div className="p-8 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                <h2 className="text-xl font-bold mb-6" style={{ color: textMain }}>{t('Hubungi Langsung', 'Reach Out Directly')}</h2>
                <div className="space-y-4">
                  {CHANNELS.map(ch => (
                    <a key={ch.label} href={ch.href} target={ch.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]"
                      style={{ background: sectionBg3, border: `1px solid ${cardBorder}` }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ch.color}12`, border: `1px solid ${ch.color}20` }}>
                        <ch.icon size={18} style={{ color: ch.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: textMuted }}>{ch.label}</p>
                        <p className="text-sm font-bold" style={{ color: textMain }}>{ch.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="p-8 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                <div className="flex items-center gap-2.5 mb-5">
                  <Clock size={18} style={{ color: accent }} />
                  <h2 className="text-base font-bold" style={{ color: textMain }}>{t('Jam Operasional', 'Operating Hours')}</h2>
                </div>
                <div className="space-y-3">
                  {HOURS.map(h => (
                    <div key={h.day} className="flex items-center justify-between text-sm">
                      <span style={{ color: textMuted }}>{h.day}</span>
                      <span className="font-semibold" style={{ color: h.hours === t('Tutup', 'Closed') ? '#ef4444' : textMain }}>{h.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Agent CTA ─── */}
      <section className="py-16 px-5" style={{ borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <SectionLabel darkMode={props.darkMode}>{t('Konsultasi Gratis', 'Free Consultation')}</SectionLabel>
            <h2 className="font-bold leading-tight mb-4" style={{ fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: textMain }}>
              {t('Lebih suka bicara langsung?', 'Prefer to talk directly?')}
            </h2>
            <p className="text-base mb-8 leading-relaxed" style={{ color: textMuted }}>
              {t('Konsultasikan kebutuhan asuransimu dengan agen kami secara langsung. Gratis, tanpa tekanan.', 'Discuss your insurance needs directly with our agent. Free, no pressure.')}
            </p>
            <button onClick={onSignIn}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: accent }}>
              {config?.cta_text || t('Chat dengan Mitra', 'Chat with Partner')} <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </section>

    </SiteLayout>
  );
};

export default ContactPage;
