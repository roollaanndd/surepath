
import React from 'react';
import { Mail, Phone, MapPin, MessageSquare, ArrowRight, Globe, Clock } from 'lucide-react';
import { Language } from '../types';
import { Badge } from './shared/UI';

const ContactPage = ({ lang }: { lang: Language }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  return (
    <div className="space-y-16 animate-fade-in pb-20">
      <div className="text-center space-y-6 max-w-2xl mx-auto">
         <Badge>{t("Direct Access", "Akses Langsung")}</Badge>
         <h2 className="text-5xl font-black tracking-tighter uppercase text-slate-900 dark:text-white leading-none">
           {t("Contact", "Hubungi")} <span className="text-primary-500">{t("Our Nodes", "Simpul Kami")}</span>
         </h2>
         <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
           {t("Need help with your policy or claim? Our tim support is available 24/7 through multiple protocols.", 
              "Butuh bantuan terkait polis atau klaim? Tim support kami tersedia 24/7 melalui berbagai protokol.")}
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: t("Email Protocol", "Protokol Email"), value: "support@surepath.ai", icon: Mail, color: "text-blue-500", bg: "bg-blue-50" },
           { label: t("Voice Link", "Jalur Suara"), value: "1500-SURE (7873)", icon: Phone, color: "text-emerald-500", bg: "bg-emerald-50" },
           { label: t("AI Live Chat", "Chat AI Langsung"), value: "Open Pulse Chat", icon: MessageSquare, color: "text-primary-500", bg: "bg-orange-50" },
         ].map((item, i) => (
           <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl hover:border-primary-500/20 transition-all group">
              <div className={`w-16 h-16 ${item.bg} dark:bg-white/5 ${item.color} rounded-[1.8rem] flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform`}>
                 <item.icon size={32}/>
              </div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-2">{item.label}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white truncate">{item.value}</p>
           </div>
         ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-stretch">
         {/* Map / Location Module */}
         <div className="p-10 bg-slate-900 rounded-[4rem] text-white relative overflow-hidden shadow-2xl min-h-[400px]">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=800&auto=format&fit=crop')] bg-cover opacity-20 grayscale"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Headquarters Node</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">{t("Jakarta Core Hub", "Pusat Inti Jakarta")}</h3>
               </div>
               
               <div className="space-y-6">
                  <div className="flex gap-6 items-start">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary-500 border border-white/10">
                        <MapPin size={24}/>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-300 leading-relaxed uppercase tracking-tight">
                          SurePath Tower, Floor 42 <br/>
                          SCBD Lot 10, Jakarta Selatan <br/>
                          Indonesia, 12190
                        </p>
                     </div>
                  </div>
                  
                  <div className="flex gap-4">
                     <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                        <Globe size={14} className="text-blue-400"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Global Ops</span>
                     </div>
                     <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                        <Clock size={14} className="text-emerald-400"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">24/7 Online</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Form Module */}
         <div className="p-10 bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-8">
               <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">{t("Secure Message", "Pesan Terenkripsi")}</h3>
               <div className="space-y-5">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Subject Protocol</label>
                     <input className="w-full bg-slate-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-primary-500 transition-all" placeholder={t("Policy Inquiry / Claim Status", "Pertanyaan Polis / Status Klaim")} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Detail Matrix</label>
                     <textarea rows={4} className="w-full bg-slate-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-3xl py-4 px-6 text-sm font-medium outline-none focus:border-primary-500 transition-all resize-none" placeholder={t("Type your message here...", "Ketik pesan Anda di sini...")}></textarea>
                  </div>
               </div>
            </div>
            
            <button className="mt-8 w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-4">
               {t("Initialize Transmission", "Kirim Transmisi")} <ArrowRight size={18}/>
            </button>
         </div>
      </div>
    </div>
  );
};

export default ContactPage;
