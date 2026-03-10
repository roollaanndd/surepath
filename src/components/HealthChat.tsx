
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, ShieldAlert, ChevronLeft, HeartPulse, Stethoscope } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { NeuralBot, PageTransition } from './car-wizard/WizardUI';
import { Language } from '../types';

/* Fix: Added lang prop to HealthChat component */
const HealthChat = ({ onBack, lang }: { onBack: () => void, lang?: Language }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: lang === Language.EN ? 'Hello! I am your SurePath health assistant. How can I help you today regarding health concerns or your insurance policy?' : 'Halo! Saya asisten kesehatan SurePath. Ada yang bisa saya bantu terkait keluhan kesehatan atau pertanyaan polis asuransi Anda?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [...messages, { role: 'user', text: userMsg }].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `Anda adalah SurePath Health Bot, asisten medis AI yang ramah, hangat, dan sangat membantu. 
          Tugas Anda adalah:
          1. Memberikan informasi kesehatan dasar secara umum.
          2. Membantu nasabah memahami istilah asuransi kesehatan mereka.
          3. Selalu berikan peringatan bahwa saran AI ini bukan diagnosa medis resmi dan mereka harus berkonsultasi ke dokter.
          Gunakan ${lang === Language.EN ? 'English' : 'Bahasa Indonesia'} yang santun dan mudah dimengerti orang awam.`,
          temperature: 0.7,
        }
      });

      const aiText = response.text;
      setMessages(prev => [...prev, { role: 'model', text: aiText || (lang === Language.EN ? 'Sorry, my system is experiencing issues. Can you repeat that?' : 'Maaf, sistem saya sedang mengalami kendala. Bisa ulangi?') }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: lang === Language.EN ? 'Connection to AI system lost. Please try again later.' : 'Koneksi ke sistem AI terputus. Silakan coba beberapa saat lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-full bg-white dark:bg-[#080707] transition-all duration-700">
        {/* Chat Header */}
        <div className="px-6 pt-6 pb-4 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 flex items-center justify-between z-50">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-primary-500 transition-colors">
                <ChevronLeft size={20}/>
             </button>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                   <HeartPulse size={22}/>
                </div>
                <div>
                   <h3 className="text-lg font-black uppercase tracking-tighter leading-none text-slate-800 dark:text-white">Health <span className="text-primary-500">Bot</span></h3>
                   <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">Chat Aktif • Online</p>
                </div>
             </div>
          </div>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-primary-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {m.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-primary-500 text-white rounded-tr-none' 
                  : 'bg-gray-50 dark:bg-emerald-950/20 text-slate-800 dark:text-gray-200 border border-emerald-50 dark:border-emerald-900/30 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-pulse">
               <div className="flex gap-3 items-center bg-gray-50 dark:bg-emerald-950/20 p-4 rounded-2xl rounded-tl-none border border-emerald-50 dark:border-emerald-900/30">
                  <Loader2 size={16} className="animate-spin text-primary-500"/>
                  <span className="text-[0.6rem] font-black uppercase tracking-widest text-gray-400">{lang === Language.EN ? 'AI is typing...' : 'AI Sedang Mengetik...'}</span>
               </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-6 bg-white/80 dark:bg-black/60 backdrop-blur-2xl border-t border-gray-100 dark:border-white/5 fixed bottom-0 left-0 right-0 z-20">
          <div className="max-w-3xl mx-auto flex gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={lang === Language.EN ? 'Ask about health or your policy...' : 'Tanya seputar kesehatan atau polis...'}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-4 px-5 pr-14 text-sm font-medium outline-none focus:border-primary-500 transition-all shadow-inner"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-primary-500 text-white rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-30"
              >
                <Send size={18}/>
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 opacity-40">
             <ShieldAlert size={12}/>
             <p className="text-[0.45rem] font-bold uppercase tracking-widest">{lang === Language.EN ? 'AI suggestions are not a medical diagnosis.' : 'Saran AI bukan pengganti diagnosa medis resmi.'}</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default HealthChat;
