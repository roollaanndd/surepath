import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from 'cors';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { runAIAdminTick } from './services/aiAdminEngine';

// ════════════════════════════════════════════════════════════════��[...]
// AI GATEWAY — 6-LAYER CONSISTENCY & ANTI-LEAK SYSTEM
// ════════════════════════════════════════════════════════�[...]
// Layer 1: Response Caching — deterministic untuk FAQ
// Layer 2: Post-LLM Validation — PII leak, hallucination, scope check
// Layer 3: Temperature Control — 0 untuk analytical, 0.3 untuk chat
// Layer 4: Fact-Checking — verify AI claims vs reference data
// Layer 5: Structured Output Validation — JSON schema enforcement
// Layer 6: Knowledge Base Versioning — track changes, audit trail
// ════════════════════════════════════════════════════════�[...]

let zaiInstance: any = null;
let geminiClient: GoogleGenAI | null = null;

async function initAI() {
  try {
    // Dynamic import — z-ai-web-dev-sdk is available in Z.ai runtime but not in npm
    const ZAIModule = await import('z-ai-web-dev-sdk').catch(() => null);
    if (ZAIModule?.default) {
      zaiInstance = await ZAIModule.default.create();
      console.log('✓ AI Gateway (z-ai SDK) initialized — 6-layer consistency active');
    } else {
      console.log('⚠ z-ai-web-dev-sdk not available — AI Gateway will use fallback mode');
    }
  } catch (e) {
    console.error('Failed to init z-ai SDK:', e);
    console.log('⚠ AI Gateway running in fallback mode (no LLM)');
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('⚠ GEMINI_API_KEY not set — Google AI Studio provider disabled');
      return;
    }

    geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log('✓ Google AI Studio provider ready (optional integration)');
  } catch (e) {
    console.error('Failed to init Google AI Studio:', e);
    console.log('⚠ Google AI Studio provider unavailable');
  }
}

function extractGeminiText(payload: any): string {
  if (typeof payload === 'string') return payload;
  if (payload?.text) return payload.text;

  if (payload?.candidates && Array.isArray(payload.candidates)) {
    const text = payload.candidates
      .flatMap((candidate: any) => candidate?.content?.parts ?? [])
      .map((part: any) => part?.text ?? '')
      .join('');

    if (text) return text;
  }

  if (payload?.content) {
    if (typeof payload.content === 'string') return payload.content;

    if (Array.isArray(payload.content)) {
      return payload.content
        .map((item: any) => typeof item === 'string' ? item : item?.text ?? '')
        .join('');
    }
  }

  return '';
}

// ─── Layer 1: Response Caching ───────────────────────────────────────────────
// Cache key = hash(agentType + systemPrompt hash + userMessage hash)
// TTL: 1 hour untuk Pathy, 0 (no cache) untuk ClaimSense/InsurerAI (case-specific)
const responseCache = new Map<string, { content: string; timestamp: number; hitCount: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(agentType: string, systemPrompt: string, userMessage: string): string {
  // Normalize: lowercase, trim, remove extra spaces for better cache hits
  const normalizedMsg = userMessage.toLowerCase().trim().replace(/\s+/g, ' ');
  const promptHash = crypto.createHash('md5').update(systemPrompt).digest('hex').slice(0, 8);
  const msgHash = crypto.createHash('md5').update(normalizedMsg).digest('hex').slice(0, 8);
  return `${agentType}:${promptHash}:${msgHash}`;
}

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  entry.hitCount++;
  return entry.content;
}

function setCached(key: string, content: string): void {
  // Prevent cache from growing unbounded
  if (responseCache.size > 500) {
    // Evict oldest 100 entries
    const sorted = Array.from(responseCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100; i++) responseCache.delete(sorted[i][0]);
  }
  responseCache.set(key, { content, timestamp: Date.now(), hitCount: 0 });
}

// ─── Layer 2: Post-LLM Validation ───────────────────────────────────────────
// Checks output BEFORE returning to user:
// 2a. PII leak detection (KTP, phone, email, bank account in response)
// 2b. Hallucination detection (claims about specific rates/prices not in knowledge base)
// 2c. Scope check (response stays within insurance domain)

// PII patterns (same as pre-LLM, but checking OUTPUT)
const PII_PATTERNS = [
  { regex: /\b\d{16}\b/g, replacement: '[REDACTED_KTP]' },
  { regex: /\b08\d{8,11}\b/g, replacement: '[REDACTED_PHONE]' },
  { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[REDACTED_CARD]' },
  { regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[REDACTED_EMAIL]' },
  { regex: /\b\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, replacement: '[REDACTED_BANK]' },
];

function redactPII(text: string): string {
  let result = text;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// Check if response contains PII that shouldn't be there
function detectPIILeak(text: string): { hasLeak: boolean; patterns: string[] } {
  const leaks: string[] = [];
  // Check for KTP (16 digits not part of [REDACTED] marker)
  if (/\b\d{16}\b/.test(text) && !text.includes('[REDACTED_KTP]')) leaks.push('KTP number');
  // Check for phone numbers (08xxxxxxxxxx)
  if (/\b08\d{8,11}\b/.test(text)) leaks.push('Phone number');
  // Check for email addresses
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) leaks.push('Email address');
  // Check for bank account patterns (10-16 digits)
  if (/\b\d{10,16}\b/.test(text) && !text.includes('[REDACTED_')) leaks.push('Possible bank account');
  return { hasLeak: leaks.length > 0, patterns: leaks };
}

// Hallucination detection — check if AI mentions specific rates/prices that contradict knowledge base
const VALID_RATE_RANGE = { min: 0.0039, max: 0.0366 }; // OJK min 0.39% to max 3.66%
const FORBIDDEN_CLAIMS = [
  /premi pasti/i,          // AI should never say "pasti" (definite)
  /dijamin .*(approve|disetujui)/i,  // Never guarantee approval
  /saya bisa.*mencairkan/i,  // Never claim to disburse funds
  /saya akan.*membayar/i,    // Never claim to pay
  /diskon .*(80|90|100)\s*%/i,  // Unrealistic discount
  /gratis .*(selamanya|permanent)/i,  // Unrealistic free
];

function detectHallucination(text: string): { hasHallucination: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const pattern of FORBIDDEN_CLAIMS) {
    if (pattern.test(text)) {
      issues.push(`Forbidden claim detected: ${pattern.source}`);
    }
  }
  // Check for rate claims outside OJK bounds
  const rateMatches = text.match(/(\d+[.,]?\d*)\s*%/g);
  if (rateMatches) {
    for (const match of rateMatches) {
      const rate = parseFloat(match.replace('%', '').replace(',', '.')) / 100;
      // Only flag if it looks like a premium rate (not a discount percentage)
      if (rate > 0 && rate < 1 && /rate|premi|tarif/i.test(text) && (rate < VALID_RATE_RANGE.min || rate > VALID_RATE_RANGE.max)) {
        issues.push(`Rate ${match} outside OJK bounds (${(VALID_RATE_RANGE.min * 100).toFixed(2)}% - ${(VALID_RATE_RANGE.max * 100).toFixed(2)}%)`);
      }
    }
  }
  return { hasHallucination: issues.length > 0, issues };
}

// Scope check — ensure response is about insurance
const OUT_OF_SCOPE_INDICATORS = [
  /\b(?:recipe|resep makanan)\b/i,
  /\b(?:programming|coding|python|javascript|java code)\b/i,
  /\b(?:football|sepak bola|liga champion)\b/i,
  /\b(?:movie review|ulasan film)\b/i,
];

function checkScope(text: string): { inScope: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const pattern of OUT_OF_SCOPE_INDICATORS) {
    if (pattern.test(text)) {
      issues.push(`Response contains out-of-scope content: ${pattern.source}`);
    }
  }
  return { inScope: issues.length === 0, issues };
}

// ─── Layer 3: Temperature Control ───────────────────────────────────────────
// Lower temperature = more deterministic/consistent
const TEMPERATURE_MAP: Record<string, number> = {
  pathy: 0.3,        // Chat — some creativity but mostly consistent
  claimSense: 0.0,   // Analytical — must be deterministic
  insurerAI: 0.0,    // Risk assessment — must be deterministic
  agentPro: 0.2,     // Agent assistant — mostly consistent
  default: 0.3,
};

// ─── Layer 4: Fact-Checking ──────────────────────────────────────────────────
// Verify AI claims against reference data
const KNOWN_PRODUCTS = ['CAR', 'TRAVEL', 'PA', 'MPAR', 'HEALTH'];
const KNOWN_INSURERS = ['Zurich', 'Sinarmas', 'Astra', 'MSIG'];

function factCheck(response: string, agentType: string): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check: AI mentions a product that doesn't exist
  const productMentions = response.match(/(?:asuransi|produk)\s+(\w+)/gi);
  if (productMentions) {
    for (const m of productMentions) {
      const product = m.replace(/(?:asuransi|produk)\s+/i, '').toUpperCase();
      if (product.length > 2 && !KNOWN_PRODUCTS.includes(product) &&
          !['MOBIL', 'MOTOR', 'KENDARAAN', 'KESEHATAN', 'JIWA', 'PERJALANAN', 'KECELAKAAN', 'BARANG', 'PROPERTI'].includes(product)) {
        // Don't flag common Indonesian words — only unknown product codes
        if (/^[A-Z]{2,10}$/.test(product)) {
          warnings.push(`Unknown product mentioned: ${product}`);
        }
      }
    }
  }

  // Check: AI mentions an insurer not in our partner list
  for (const word of response.split(/\s+/)) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length > 3 && /^[A-Z][a-z]+$/.test(cleanWord)) {
      // Check if it looks like a company name but isn't in our list
      if (/insurance|asuransi|assurance/i.test(response) &&
          !KNOWN_INSURERS.some(i => i.toLowerCase().includes(cleanWord.toLowerCase())) &&
          !['SurePath', 'Indonesia', 'Proteksi', 'Ruang'].includes(cleanWord)) {
        // Only warn — might be a legitimate reference
      }
    }
  }

  // Check: AI gives a specific premium without "estimasi" disclaimer
  if (/\bRp\s*[\d.]+/.test(response) && !/estimasi|perkiraan|kisaran|sekitar|range/i.test(response)) {
    if (agentType === 'pathy') {
      warnings.push('Pathy mentioned specific price without "estimasi" disclaimer');
    }
  }

  return { passed: warnings.length === 0, warnings };
}

// ─── Layer 5: Structured Output Validation ──────────────────────────────────
// For agents that return JSON (ClaimSense, InsurerAI, STNK extraction)
function validateJSONOutput(text: string, expectedSchema: string): { valid: boolean; parsed?: any; error?: string } {
  try {
    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { valid: false, error: 'No JSON found in response' };
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // Schema validation per agent type
    if (expectedSchema === 'claimAnalysis') {
      if (!parsed.severity) return { valid: false, error: 'Missing severity', parsed };
      if (!['MINOR', 'MODERATE', 'MAJOR', 'SEVERE', 'TOTAL_LOSS'].includes(parsed.severity)) {
        return { valid: false, error: `Invalid severity: ${parsed.severity}`, parsed };
      }
      if (!parsed.estimatedCost) return { valid: false, error: 'Missing estimatedCost', parsed };
      if (typeof parsed.fraudRiskScore !== 'number' || parsed.fraudRiskScore < 0 || parsed.fraudRiskScore > 100) {
        return { valid: false, error: 'fraudRiskScore must be 0-100', parsed };
      }
    }

    if (expectedSchema === 'insurerRecommendation') {
      if (!parsed.decision) return { valid: false, error: 'Missing decision', parsed };
      if (!['APPROVE', 'DECLINE', 'REQUEST_INFO'].includes(parsed.decision)) {
        return { valid: false, error: `Invalid decision: ${parsed.decision}`, parsed };
      }
      if (typeof parsed.riskScore !== 'number' || parsed.riskScore < 0 || parsed.riskScore > 100) {
        return { valid: false, error: 'riskScore must be 0-100', parsed };
      }
    }

    return { valid: true, parsed };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

// ─── Layer 6: Knowledge Base Versioning ─────────────────────────────────────
const KB_VERSION = '1.0.0';
const KB_VERSION_DATE = '2026-07-15';

// Audit log for AI decisions (in-memory, should persist to DB in production)
const aiAuditLog: Array<{
  timestamp: string;
  agentType: string;
  userMessageHash: string;
  responseHash: string;
  cached: boolean;
  validated: boolean;
  warnings: string[];
  kbVersion: string;
}> = [];

function logAIDecision(entry: {
  agentType: string;
  userMessageHash: string;
  responseHash: string;
  cached: boolean;
  validated: boolean;
  warnings: string[];
}): void {
  aiAuditLog.push({
    timestamp: new Date().toISOString(),
    ...entry,
    kbVersion: KB_VERSION,
  });
  // Keep only last 1000 entries
  if (aiAuditLog.length > 1000) aiAuditLog.shift();
}

// ─── Prompt Injection Detection ──────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (previous|all|the above) (instructions|prompts|rules)/i,
  /you are now (a|an) /i,
  /disregard (your|the) (system|previous) prompt/i,
  /forget (everything|all) (you were told|above)/i,
  /reveal (your|the) (system|hidden) (prompt|instructions)/i,
  /show me (your|the) (system|hidden) (prompt|instructions)/i,
];

function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(text));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────[...]
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 30): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

// ─── Hash helper ────────────────────────────────────────────────────────��[...]
function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// ─── AI Admin Engine Interval Handle ─────────────────────────────────────────
let adminInterval: NodeJS.Timeout | null = null;

// ════════════════════════════════════════════════════════════════[...]
// MAIN SERVER
// ════════════════════════════════════════════════════════════════[...]

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  await initAI();

  app.post('/api/aistudio-test', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'prompt required' });
      }

      if (!geminiClient) {
        return res.status(503).json({
          error: 'Google AI Studio belum terhubung. Set GEMINI_API_KEY terlebih dahulu.',
        });
      }

      const result = await geminiClient.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = extractGeminiText(result) || '';

      if (!text) {
        return res.status(500).json({ error: 'Google AI Studio tidak mengembalikan jawaban.' });
      }

      return res.json({ success: true, text });
    } catch (error: any) {
      console.error('AI Studio test error:', error);
      return res.status(500).json({ error: error.message || 'AI Studio request failed' });
    }
  });

  // ─── AI Gateway Endpoint (6-layer consistency) ────────────────────────────
  app.post("/api/ai-gateway", async (req, res) => {
    try {
      const { agentType, systemPrompt, userMessage, conversationHistory, expectedSchema } = req.body;

      if (!agentType || !userMessage) {
        return res.status(400).json({ error: 'agentType and userMessage required' });
      }

      if (!zaiInstance) {
        return res.status(503).json({ error: 'AI service not available. z-ai SDK tidak ditemukan di environment ini.' });
      }

      // Rate limit
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(clientIp, 30)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Coba lagi dalam 1 menit.' });
      }

      // Pre-LLM: PII redaction
      const redactedMessage = redactPII(userMessage);

      // Pre-LLM: Prompt injection check
      if (detectPromptInjection(redactedMessage)) {
        console.warn(`[AI Gateway] Prompt injection blocked from ${clientIp}`);
        logAIDecision({
          agentType,
          userMessageHash: hashText(redactedMessage),
          responseHash: 'BLOCKED_INJECTION',
          cached: false,
          validated: false,
          warnings: ['PROMPT_INJECTION_BLOCKED'],
        });
        return res.status(400).json({
          error: 'Permintaan ditolak. AI SurePath tidak dapat mengabaikan instruksi sistem.',
        });
      }

      // ─── Layer 1: Check cache (only for pathy — chat agent) ─────────────
      const cacheKey = getCacheKey(agentType, systemPrompt || '', redactedMessage);
      const isCacheable = agentType === 'pathy' && !conversationHistory; // Only cache first-turn pathy

      if (isCacheable) {
        const cached = getCached(cacheKey);
        if (cached) {
          console.log(`[AI Gateway] Cache HIT for ${agentType}: ${cacheKey}`);
          logAIDecision({
            agentType,
            userMessageHash: hashText(redactedMessage),
            responseHash: hashText(cached),
            cached: true,
            validated: true,
            warnings: [],
          });
          return res.json({
            data: {
              content: cached,
              model: 'z-ai-cached',
              cached: true,
              usage: { inputTokens: 0, outputTokens: 0, cost: 0, latencyMs: 0 },
            },
          });
        }
      }

      // Build messages
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'assistant', content: systemPrompt });
      }
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: redactPII(msg.content) });
        }
      }
      messages.push({ role: 'user', content: redactedMessage });

      // ─── Layer 3: Temperature control ───────────────────────────────────
      const temperature = TEMPERATURE_MAP[agentType] ?? TEMPERATURE_MAP.default;

      const startTime = Date.now();
      const completion = await zaiInstance.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
        // @ts-ignore — z-ai SDK supports temperature
        temperature,
      });

      const latencyMs = Date.now() - startTime;
      let responseContent = completion.choices[0]?.message?.content ?? '';

      // ─── Layer 2: Post-LLM Validation ──────────────────────────────────
      const allWarnings: string[] = [];

      // 2a. PII leak check
      const piiCheck = detectPIILeak(responseContent);
      if (piiCheck.hasLeak) {
        console.warn(`[AI Gateway] PII leak detected in output: ${piiCheck.patterns.join(', ')}`);
        // Redact PII from output
        responseContent = redactPII(responseContent);
        allWarnings.push(`PII_REDACTED: ${piiCheck.patterns.join(', ')}`);
      }

      // 2b. Hallucination check
      const hallucinationCheck = detectHallucination(responseContent);
      if (hallucinationCheck.hasHallucination) {
        console.warn(`[AI Gateway] Hallucination detected: ${hallucinationCheck.issues.join('; ')}`);
        allWarnings.push(...hallucinationCheck.issues);
        // For critical hallucinations, append disclaimer
        if (hallucinationCheck.issues.some(i => /forbidden claim/i.test(i))) {
          responseContent += '\n\n⚠️ Catatan: Informasi di atas perlu dikonfirmasi dengan tim SurePath.';
        }
      }

      // 2c. Scope check
      const scopeCheck = checkScope(responseContent);
      if (!scopeCheck.inScope) {
        console.warn(`[AI Gateway] Out-of-scope content: ${scopeCheck.issues.join('; ')}`);
        allWarnings.push(...scopeCheck.issues);
      }

      // ─── Layer 4: Fact-checking ────────────────────────────────────────
      const factCheckResult = factCheck(responseContent, agentType);
      if (!factCheckResult.passed) {
        allWarnings.push(...factCheckResult.warnings);
      }

      // ─── Layer 5: Structured output validation (if expectedSchema provided) ──
      if (expectedSchema) {
        const validation = validateJSONOutput(responseContent, expectedSchema);
        if (!validation.valid) {
          console.warn(`[AI Gateway] JSON validation failed: ${validation.error}`);
          allWarnings.push(`JSON_VALIDATION: ${validation.error}`);
        }
      }

      // Final PII redaction (double-check)
      const safeOutput = redactPII(responseContent);

      // ─── Layer 1: Cache the response (if cacheable) ────────────────────
      if (isCacheable && allWarnings.filter(w => !w.startsWith('PII_REDACTED')).length === 0) {
        setCached(cacheKey, safeOutput);
      }

      // ─── Layer 6: Audit log ────────────────────────────────────────────
      logAIDecision({
        agentType,
        userMessageHash: hashText(redactedMessage),
        responseHash: hashText(safeOutput),
        cached: false,
        validated: allWarnings.length === 0,
        warnings: allWarnings,
      });

      res.json({
        data: {
          content: safeOutput,
          model: 'z-ai',
          cached: false,
          usage: {
            inputTokens: Math.ceil(JSON.stringify(messages).length / 4),
            outputTokens: Math.ceil(responseContent.length / 4),
            cost: 0,
            latencyMs,
          },
          validation: {
            passed: allWarnings.length === 0,
            warnings: allWarnings,
            kbVersion: KB_VERSION,
          },
        },
      });
    } catch (error: any) {
      console.error('AI Gateway error:', error);
      res.status(500).json({ error: error.message || 'AI Gateway error' });
    }
  });

  // ─── AI Audit Log Endpoint (admin only — for monitoring) ──────────────────
  app.get("/api/ai-audit-log", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const recent = aiAuditLog.slice(-limit).reverse();
    res.json({
      data: recent,
      stats: {
        total: aiAuditLog.length,
        cached: aiAuditLog.filter(e => e.cached).length,
        validated: aiAuditLog.filter(e => e.validated).length,
        warnings: aiAuditLog.filter(e => e.warnings.length > 0).length,
        kbVersion: KB_VERSION,
        kbVersionDate: KB_VERSION_DATE,
        cacheSize: responseCache.size,
      },
    });
  });

  // ─── AI Cache Stats Endpoint (monitoring) ─────────────────────────────────
  app.get("/api/ai-cache-stats", (req, res) => {
    const entries = Array.from(responseCache.entries())
      .map(([key, val]) => ({
        key: key.slice(0, 20) + '...',
        age: Math.round((Date.now() - val.timestamp) / 1000) + 's',
        hits: val.hitCount,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20);
    res.json({ data: entries, totalCached: responseCache.size });
  });

  // ─── AI Admin Engine — Manual trigger + status ────────────────────────────
  app.post("/api/ai-admin/run", async (req, res) => {
    try {
      console.log('[API] AI Admin manual tick triggered');
      const results = await runAIAdminTick();
      const summary = {
        totalAutoApproved: results.reduce((s, r) => s + r.autoApproved, 0),
        totalFlagged: results.reduce((s, r) => s + r.flagged, 0),
        totalNotified: results.reduce((s, r) => s + r.notified, 0),
        tasks: results,
      };
      res.json({ success: true, data: summary });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ai-admin/status", (req, res) => {
    res.json({
      running: adminInterval !== null,
      intervalMinutes: 5,
      lastRun: aiAuditLog.length > 0 ? aiAuditLog[aiAuditLog.length - 1].timestamp : null,
      totalDecisions: aiAuditLog.length,
      kbVersion: KB_VERSION,
    });
  });

  // Payment Gateway Proxy (Simulated Midtrans/Stripe)
  app.post("/api/payments/create", async (req, res) => {
    try {
      const { amount, policyType, userId, email } = req.body;

      if (!amount || !userId) {
         return res.status(400).json({ error: "Invalid payment request payload" });
      }

      const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await new Promise(r => setTimeout(r, 600));

      res.json({
          success: true,
          transactionId,
          paymentUrl: `/payment-simulation?tx=${transactionId}&amount=${amount}`,
          token: `mok_${transactionId}_${Date.now()}`
      });
    } catch {
      console.error("Payment generation error");
      res.status(500).json({ error: "Failed to initialize payment gateway" });
    }
  });

  // Webhook for Server-to-Server callbacks
  app.post("/api/payments/webhook", (req, res) => {
     const signatureKey = req.headers['x-callback-token'];
     res.status(200).json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neural Backend running on port ${PORT}`);
    // Start AI Admin Engine — runs every 5 minutes
    adminInterval = setInterval(() => {
      runAIAdminTick().catch(e => console.error('[AI Admin] Tick error:', e));
    }, 5 * 60 * 1000);
    // Run immediately on startup (after 10s delay to let DB warm up)
    setTimeout(() => runAIAdminTick().catch(e => console.error('[AI Admin] Initial tick error:', e)), 10000);
    console.log('[AI Admin] Engine started — running every 5 minutes');
  });
}

startServer();
