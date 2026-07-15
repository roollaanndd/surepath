import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from 'cors';
import ZAI from 'z-ai-web-dev-sdk';

// ─── AI Gateway (z-ai SDK) ───────────────────────────────────────────────────
let zaiInstance: any = null;

async function initAI() {
  try {
    zaiInstance = await ZAI.create();
    console.log('✓ AI Gateway (z-ai SDK) initialized');
  } catch (e) {
    console.error('Failed to init z-ai SDK:', e);
  }
}

// PII Redaction
const PII_PATTERNS = [
  { regex: /\b\d{16}\b/g, replacement: '[REDACTED_KTP]' },
  { regex: /\b08\d{8,11}\b/g, replacement: '[REDACTED_PHONE]' },
  { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[REDACTED_CARD]' },
  { regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[REDACTED_EMAIL]' },
];

function redactPII(text: string): string {
  let result = text;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// Prompt Injection Detection
const INJECTION_PATTERNS = [
  /ignore (previous|all|the above) (instructions|prompts|rules)/i,
  /you are now (a|an) /i,
  /disregard (your|the) (system|previous) prompt/i,
  /forget (everything|all) (you were told|above)/i,
];

function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(text));
}

// Simple in-memory rate limiting (per IP)
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // 10mb for STNK image uploads

  // Initialize AI on startup
  await initAI();

  // ─── AI Gateway Endpoint ─────────────────────────────────────────────────
  app.post("/api/ai-gateway", async (req, res) => {
    try {
      const { agentType, systemPrompt, userMessage, conversationHistory } = req.body;

      if (!agentType || !userMessage) {
        return res.status(400).json({ error: 'agentType and userMessage required' });
      }

      if (!zaiInstance) {
        return res.status(503).json({ error: 'AI service not initialized' });
      }

      // Rate limit
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(clientIp, 30)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Coba lagi dalam 1 menit.' });
      }

      // PII redaction
      const redactedMessage = redactPII(userMessage);

      // Prompt injection check
      if (detectPromptInjection(redactedMessage)) {
        console.warn(`[AI Gateway] Prompt injection blocked from ${clientIp}: ${redactedMessage.slice(0, 100)}`);
        return res.status(400).json({
          error: 'Permintaan ditolak. AI SurePath tidak dapat mengabaikan instruksi sistem.',
        });
      }

      // Build messages array for z-ai SDK
      // SDK uses 'assistant' role for system prompts
      const messages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: 'assistant', content: systemPrompt });
      }

      // Add conversation history if provided
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: redactPII(msg.content) });
        }
      }

      messages.push({ role: 'user', content: redactedMessage });

      const startTime = Date.now();
      const completion = await zaiInstance.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });

      const latencyMs = Date.now() - startTime;
      const responseContent = completion.choices[0]?.message?.content ?? '';

      // PII check on output
      const safeOutput = redactPII(responseContent);

      res.json({
        data: {
          content: safeOutput,
          model: 'z-ai',
          usage: {
            inputTokens: Math.ceil(JSON.stringify(messages).length / 4),
            outputTokens: Math.ceil(responseContent.length / 4),
            cost: 0,
            latencyMs,
          },
        },
      });
    } catch (error: any) {
      console.error('AI Gateway error:', error);
      res.status(500).json({ error: error.message || 'AI Gateway error' });
    }
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
  });
}

startServer();
