
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
 * Creates a mock JWT session token
 */
export const createSessionToken = (user: any) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    nodeId: user.nodeId,
    trustScore: user.trustScore,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 Hour validity
  };
  // Base64 encode to simulate a token
  return btoa(JSON.stringify(payload));
};

/**
 * Verifies and parses a session token
 */
export const parseSessionToken = (token: string) => {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null; // Invalid
  }
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
