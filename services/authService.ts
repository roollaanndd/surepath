
/**
 * SurePath Neural Security Service
 * Implements Web Crypto API for client-side encryption and robust hashing.
 */

// Constant for hashing iterations (OWASP recommendation for PBKDF2-HMAC-SHA256)
const ITERATIONS = 210000;

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

/**
 * Encrypts sensitive data using AES-GCM 256.
 * In a real app, the key would be derived from the user's password.
 */
export const encryptField = async (text: string, secretKeyHex: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Simple hex to bytes for demo purposes
    const keyData = new Uint8Array(secretKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const key = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt']);
    
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    
    // Combine IV and Encrypted Data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
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
    VIN: /^[A-HJ-NPR-Z0-9]{17}$/, // ISO standard excludes I, O, Q
    PLATE: /^[A-Z]{1,2}\s[0-9]{1,4}\s[A-Z]{1,3}$/
};
