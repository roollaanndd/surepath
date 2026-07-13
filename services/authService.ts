// SurePath Auth + Security Service
// PBKDF2-HMAC-SHA256 hashing, rate limiting, input sanitization

const ITERATIONS = 210000;

// --- Rate Limiting (login brute-force protection) ---
const RATE_LIMIT_KEY = 'sp_rl_';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitRecord { attempts: number; firstAttemptAt: number; lockedUntil?: number; }

export const checkRateLimit = (email: string): { allowed: boolean; remainingAttempts: number; lockedUntilMs?: number } => {
  const key = RATE_LIMIT_KEY + btoa(email.toLowerCase()).slice(0, 16);
  const raw = sessionStorage.getItem(key);
  const record: RateLimitRecord = raw ? JSON.parse(raw) : { attempts: 0, firstAttemptAt: Date.now() };

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return { allowed: false, remainingAttempts: 0, lockedUntilMs: record.lockedUntil };
  }
  // Reset window after 15 min without lockout
  if (Date.now() - record.firstAttemptAt > LOCKOUT_MS) {
    sessionStorage.removeItem(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  return { allowed: record.attempts < MAX_ATTEMPTS, remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts) };
};

export const recordFailedAttempt = (email: string): void => {
  const key = RATE_LIMIT_KEY + btoa(email.toLowerCase()).slice(0, 16);
  const raw = sessionStorage.getItem(key);
  const record: RateLimitRecord = raw ? JSON.parse(raw) : { attempts: 0, firstAttemptAt: Date.now() };
  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) record.lockedUntil = Date.now() + LOCKOUT_MS;
  sessionStorage.setItem(key, JSON.stringify(record));
};

export const clearRateLimit = (email: string): void => {
  const key = RATE_LIMIT_KEY + btoa(email.toLowerCase()).slice(0, 16);
  sessionStorage.removeItem(key);
};

// --- Input Sanitization ---
export const sanitize = {
  text: (s: string) => s.replace(/[<>"'&]/g, c => ({ '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','&':'&amp;' }[c] ?? c)),
  stripTags: (s: string) => s.replace(/<[^>]*>/g, ''),
  truncate: (s: string, max: number) => s.slice(0, max),
  email: (s: string) => s.trim().toLowerCase().slice(0, 254),
  alphaNum: (s: string) => s.replace(/[^a-zA-Z0-9\s\-_.]/g, ''),
};

export const hashPassword = async (password: string): Promise<{ hash: string; salt: string }> => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw', 
    encoder.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveBits', 'deriveKey']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key, 256
  );
  
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))),
    salt: btoa(String.fromCharCode(...new Uint8Array(salt)))
  };
};

export const verifyPassword = async (password: string, storedHash: string, storedSalt: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw', 
    encoder.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveBits', 'deriveKey']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key, 256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return hash === storedHash;
};

export const validatePasswordStrength = (pass: string) => {
    const requirements = [
        { label: 'Min 8 characters', met: pass.length >= 8 },
        { label: 'One uppercase letter', met: /[A-Z]/.test(pass) },
        { label: 'One number', met: /[0-9]/.test(pass) },
        { label: 'One special character', met: /[^A-Za-z0-9]/.test(pass) }
    ];
    const score = requirements.filter(r => r.met).length;
    return { score, requirements };
};

export const REGEX = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^08[0-9]{8,11}$/,
    NIK: /^[0-9]{16}$/,
    VIN: /^[A-HJ-NPR-Z0-9]{17}$/, 
    PLATE: /^[A-Z]{1,2}\s[0-9]{1,4}\s[A-Z]{1,3}$/
};
