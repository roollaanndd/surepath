// ─── Voice input (Web Speech API) ────────────────────────────────────────────
//
// Why this is worth having: the moment a customer most needs Pathy is standing
// next to a damaged car at the roadside, one-handed, often in the rain. Typing
// a chronology there is miserable; speaking it is not. Dictation is also the
// difference between usable and unusable for older users and for anyone who
// types slowly on a phone keyboard.
//
// The recognition runs in the browser's own speech service. Nothing here
// records or uploads audio itself — the transcript lands in the chat input,
// where the user reads it and decides whether to send. Chrome routes audio to
// Google's speech service, so the mic is only ever opened on an explicit tap,
// never held open, and it stops on the first final result.
//
// v2.7.11 adds the OUTPUT half (Track B of the Pathy evolution plan): the same
// Web Speech stack exposes speechSynthesis, free on every engine we target.
// Deliberate properties, matching the design reasons above:
//   - TTS never turns itself on. The chat owns a toggle that starts OFF and
//     remembers the user's choice; nothing in this file speaks unprompted.
//   - Speech always accompanies the text — it annotates the answer, it does
//     not replace it. If synthesis is unavailable (old WebView, iOS audio
//     policies), callers degrade silently: the text on screen is complete.

type Ctor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
}

function getCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when this browser can dictate. Safari/iOS and Firefox generally cannot. */
export const isSpeechSupported = (): boolean => getCtor() !== null;

export interface DictationHandle {
  stop: () => void;
}

export interface DictationOptions {
  lang?: string;
  /** Fires as the user speaks, so the input can show the words appearing. */
  onPartial?: (text: string) => void;
  /** Fires once with the finished transcript. */
  onFinal: (text: string) => void;
  /** Indonesian, user-facing. */
  onError?: (message: string) => void;
  onEnd?: () => void;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Izin mikrofon ditolak. Aktifkan di pengaturan browser ya.',
  'service-not-allowed': 'Izin mikrofon ditolak. Aktifkan di pengaturan browser ya.',
  'no-speech': 'Belum ada suara yang terdengar. Coba lagi.',
  'audio-capture': 'Mikrofon tidak terdeteksi.',
  network: 'Layanan suara butuh koneksi internet.',
};

/**
 * Start one dictation. Returns a handle to stop it early, or null when the
 * browser has no speech recognition (the caller should hide its mic button —
 * see isSpeechSupported).
 */
export function startDictation(opts: DictationOptions): DictationHandle | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  let rec: SpeechRecognitionLike;
  try {
    rec = new Ctor();
  } catch {
    return null;
  }

  rec.lang = opts.lang ?? 'id-ID';
  rec.continuous = false;   // one utterance, then release the mic
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finished = false;

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const text = res?.[0]?.transcript ?? '';
      if (res?.isFinal) {
        finished = true;
        opts.onFinal(text.trim());
        return;
      }
      interim += text;
    }
    if (interim) opts.onPartial?.(interim.trim());
  };

  rec.onerror = (e) => {
    const code = String(e?.error ?? '');
    // 'aborted' is what a deliberate stop() looks like — not an error worth
    // showing the user.
    if (code === 'aborted') return;
    opts.onError?.(ERRORS[code] ?? 'Mikrofon sedang bermasalah. Ketik saja dulu ya.');
  };

  rec.onend = () => {
    // Some browsers end without ever firing a final result (silence timeout).
    if (!finished) opts.onFinal('');
    opts.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    opts.onError?.('Tidak bisa membuka mikrofon.');
    return null;
  }

  return { stop: () => { try { rec.stop(); } catch { /* already stopped */ } } };
}

// ─── Voice output (speechSynthesis) ──────────────────────────────────────────
//
// v2.7.11 — Track B. Pathy reads its answers aloud when the user has flipped
// the toggle in the chat header. Free, native, no service: same reasoning as
// the mic never costing a cent.

/** True when this browser can speak. Almost always true; off-WebView engines vary. */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Voice preference: exact id-ID, then Indonesian generic, then the default. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!isTtsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'id-ID')
    ?? voices.find(v => /^id/i.test(v.lang))
    ?? voices[0]
    ?? null;
}

/** True while the synth queue is audibly busy — used to avoid cutting a sentence off. */
export function isSpeaking(): boolean {
  return isTtsSupported() && window.speechSynthesis.speaking;
}

/**
 * Speak one bot answer. Reading is an accompaniment to the on-screen text, so
 * every failure path here is silent — the worst case is a weaker robotic
 * voice, never a broken chat. Indonesian is preferred; on engines with no
 * Indonesian voice the platform default speaks, which is still preferable to
 * nothing for an answer the user is simultaneously reading.
 */
export function speakAnswer(text: string, lang: 'id' | 'en' = 'id'): void {
  if (!isTtsSupported() || !text) return;
  try {
    // Reading one answer replaces the previous queue — overlapping speech of
    // two replies reads as a bug, not a feature.
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'id' ? 'id-ID' : 'en-US';
    u.rate = 1.02; // default 1.0 reads sluggish on several Android voices
    u.pitch = 1;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    /* synthesis is best-effort — the text is already on screen */
  }
}

/** Stop any ongoing/outstanding speech (panel close, toggle off, unmount). */
export function stopSpeaking(): void {
  if (isTtsSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* nothing was speaking */ }
  }
}
