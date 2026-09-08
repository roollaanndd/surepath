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
