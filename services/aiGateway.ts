// aiGateway.ts — Client-side wrapper for AI Gateway edge function.
// All AI agents (Pathy, ClaimSense, InsurerAI, AgentPro) go through this.

import {
  buildSystemPrompt,
  AI_BOUNDARIES,
  COMPANY_INFO,
  PRODUCTS,
  INSURERS,
  OJK_RULES,
  CLAIM_RULES,
  CLAIM_ESTIMATION_DATA,
  getProduct,
  getInsurer,
} from './aiKnowledge';

// ─── Types ───────────────────────────────────────────────────────────────────
export type AgentType = 'pathy' | 'claimSense' | 'insurerAI' | 'agentPro';

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latencyMs: number;
  };
}

// ─── Core: Call AI Gateway (via local server with z-ai SDK) ─────────────────
// `npm run dev` serves /api/ai-gateway from server.ts (z-ai SDK + caching, PII
// redaction and prompt-injection layers). Production is a static Vercel build:
// vercel.json excludes `api/` from the SPA rewrite and there is no api/
// directory, so that path is a guaranteed 404 there. FIX: only try it in dev —
// previously every AI call in production burned a round-trip and logged a
// console error before falling through. Production goes straight to the
// ai-proxy edge function (OpenRouter, authenticated with the user's JWT).
async function callAIGateway(
  agentType: AgentType,
  userMessage: string,
  context?: Record<string, any>,
  extraMessages?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(agentType, context);

  if (!import.meta.env.DEV) {
    return await callAiProxyFallback(systemPrompt, userMessage, extraMessages);
  }

  try {
    // Call the local server's /api/ai-gateway endpoint (uses z-ai SDK)
    const response = await fetch('/api/ai-gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType,
        systemPrompt,
        userMessage,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'AI Gateway error' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    return data as AIResponse;
  } catch (e) {
    console.warn(`AI Gateway unavailable for ${agentType}, falling back to ai-proxy:`, e);
    return await callAiProxyFallback(systemPrompt, userMessage, extraMessages);
  }
}

// ─── Fallback: ai-proxy edge function (OpenRouter) ──────────────────────────
async function callAiProxyFallback(
  systemPrompt: string,
  userMessage: string,
  extraMessages?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<AIResponse> {
  const { supabase } = await import('./db');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Silakan login terlebih dahulu untuk menggunakan asisten AI.');

  const started = Date.now();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(extraMessages ?? []),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `AI proxy error (HTTP ${res.status})`);
  }

  const content: string = body?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('AI tidak memberikan jawaban. Coba lagi.');

  return {
    content,
    model: body?.model ?? 'openai/gpt-4o-mini',
    usage: {
      inputTokens: body?.usage?.prompt_tokens ?? 0,
      outputTokens: body?.usage?.completion_tokens ?? 0,
      cost: 0,
      latencyMs: Date.now() - started,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PATHY — Customer AI Assistant
// ════════════════════════════════════════════════════════════════════════════

export async function askPathy(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  // FIX: history goes through as real chat turns. It used to be flattened into
  // one "Riwayat percakapan: …" string inside the user message, which both
  // wasted the model's turn structure and let a pasted transcript read as
  // instructions. Keep the last few turns only — this path has no tools and
  // exists as the degraded fallback behind pathy-agent.
  const history = (conversationHistory ?? []).slice(-8).map(m => ({
    role: m.role,
    content: String(m.content ?? '').slice(0, 2000),
  }));

  const response = await callAIGateway(
    'pathy',
    message,
    {
      products: PRODUCTS.map(p => ({ code: p.code, name: p.name, minPremium: p.minPremium })),
      company: COMPANY_INFO,
    },
    history,
  );

  return response.content;
}

// ════════════════════════════════════════════════════════════════════════════
// CLAIMSENSE — AI Claim Analysis
// ════════════════════════════════════════════════════════════════════════════

export interface ClaimAnalysis {
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE' | 'TOTAL_LOSS';
  estimatedCost: {
    parts: Array<{ name: string; cost: number; laborHours: number }>;
    labor: number;
    paint: number;
    total: number;
    range: string;
  };
  estimatedWorkingDays: number;
  fraudRiskScore: number;
  fraudIndicators: string[];
  recommendation: string;
  disclaimer: string;
}

export async function analyzeClaim(
  claimData: {
    photos?: string[];
    description: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    sumInsured?: number;
    policyAgeDays?: number;
    claimHistoryCount?: number;
  },
): Promise<ClaimAnalysis> {
  const message = `Analisis klaim asuransi kendaraan berikut:

Deskripsi kerusakan: ${claimData.description}
Kendaraan: ${claimData.vehicleBrand ?? ''} ${claimData.vehicleModel ?? ''} ${claimData.vehicleYear ?? ''}
Nilai pertanggungan: Rp ${claimData.sumInsured?.toLocaleString('id-ID') ?? 'N/A'}
Usia polis: ${claimData.policyAgeDays ?? 'N/A'} hari
Riwayat klaim nasabah: ${claimData.claimHistoryCount ?? 0} klaim

Berdasarkan data kerusakan di atas, berikan analisis dalam format JSON:
{
  "severity": "MINOR|MODERATE|MAJOR|SEVERE|TOTAL_LOSS",
  "estimatedCost": {
    "parts": [{"name": "nama part", "cost": 0, "laborHours": 0}],
    "labor": 0,
    "paint": 0,
    "total": 0,
    "range": "Rp X - Rp Y"
  },
  "estimatedWorkingDays": 0,
  "fraudRiskScore": 0,
  "fraudIndicators": [],
  "recommendation": "rekomendasi singkat",
  "disclaimer": "Estimasi bersifat indikatif. Keputusan final klaim adalah hak insurer."
}

Gunakan data referensi parts berikut untuk estimasi biaya:
${JSON.stringify(CLAIM_ESTIMATION_DATA.parts)}

Tarif labor: Rp ${CLAIM_ESTIMATION_DATA.laborRatePerHour}/jam
Tarif cat: Rp ${CLAIM_ESTIMATION_DATA.paintRatePerPanel}/panel

Aturan severity:
${JSON.stringify(CLAIM_RULES.severityLevels, null, 2)}

Indikator fraud:
${CLAIM_RULES.fraudIndicators.map(f => `- ${f}`).join('\n')}`;

  const response = await callAIGateway('claimSense', message, {
    claimRules: CLAIM_RULES,
    estimationData: CLAIM_ESTIMATION_DATA,
  });

  // Try to parse JSON from response
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ClaimAnalysis;
    }
  } catch (e) {
    console.warn('ClaimSense: failed to parse JSON, returning raw');
  }

  // Fallback: return raw content as recommendation
  return {
    severity: 'MODERATE',
    estimatedCost: {
      parts: [], labor: 0, paint: 0, total: 0,
      range: 'Estimasi tidak tersedia',
    },
    estimatedWorkingDays: 0,
    fraudRiskScore: 0,
    fraudIndicators: [],
    recommendation: response.content,
    disclaimer: 'Estimasi bersifat indikatif. Keputusan final klaim adalah hak insurer.',
  };
}

// ════════════════════════════════════════════════════════════════════════════
// INSURER AI — Decision Recommendation
// ════════════════════════════════════════════════════════════════════════════

export interface InsurerAIRecommendation {
  decision: 'APPROVE' | 'DECLINE' | 'REQUEST_INFO';
  riskScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  redFlags: string[];
  suggestedTerms?: {
    deductible?: string;
    tplLimit?: string;
    additionalEndorsements?: string[];
  };
  disclaimer: string;
}

export async function getInsurerAIRecommendation(
  orderData: {
    orderNumber: string;
    clientName: string;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: number;
    sumInsured: number;
    totalPremium: number;
    coverageType: string;
    insurerName: string;
    agentName: string;
    agentVerified: boolean;
    agentTrackRecord?: string;
    promoCode?: string;
    discountRate?: number;
    previousClaims?: number;
  },
): Promise<InsurerAIRecommendation> {
  const message = `Sebagai InsurerAI, berikan rekomendasi untuk order asuransi berikut:

Order: ${orderData.orderNumber}
Nasabah: ${orderData.clientName}
Kendaraan: ${orderData.vehicleBrand} ${orderData.vehicleModel} ${orderData.vehicleYear}
Nilai Pertanggungan: Rp ${orderData.sumInsured.toLocaleString('id-ID')}
Total Premi: Rp ${orderData.totalPremium.toLocaleString('id-ID')}
Coverage: ${orderData.coverageType}
Insurer: ${orderData.insurerName}
Agent: ${orderData.agentName} (Verified: ${orderData.agentVerified})
Promo: ${orderData.promoCode ?? 'N/A'} (Discount: ${(orderData.discountRate ?? 0) * 100}%)
Riwayat klaim nasabah: ${orderData.previousClaims ?? 0}

Berdasarkan data di atas, berikan rekomendasi dalam format JSON:
{
  "decision": "APPROVE|DECLINE|REQUEST_INFO",
  "riskScore": 0-100,
  "confidence": "high|medium|low",
  "reasoning": "penjelasan singkat",
  "redFlags": [],
  "suggestedTerms": {
    "deductible": "Rp 300.000 per kejadian",
    "tplLimit": "Rp 25.000.000",
    "additionalEndorsements": []
  },
  "disclaimer": "Rekomendasi AI bersifat indikatif. Keputusan final adalah hak insurer."
}

Pertimbangkan:
- Usia kendaraan (max 15 tahun per OJK)
- Konsistensi premi dengan OJK SEOJK 6/2017
- Track record agent
- Pola promo/discount
- Riwayat klaim
- Rasio premi terhadap TSI

Insurer info: ${JSON.stringify(getInsurer(orderData.insurerName) ?? INSURERS[0])}`;

  const response = await callAIGateway('insurerAI', message, {
    insurerInfo: getInsurer(orderData.insurerName),
    ojkRules: OJK_RULES,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as InsurerAIRecommendation;
    }
  } catch (e) {
    console.warn('InsurerAI: failed to parse JSON');
  }

  return {
    decision: 'REQUEST_INFO',
    riskScore: 50,
    confidence: 'low',
    reasoning: response.content,
    redFlags: [],
    disclaimer: 'Rekomendasi AI bersifat indikatif. Keputusan final adalah hak insurer.',
  };
}


// ─── Export knowledge for components ─────────────────────────────────────────
export {
  AI_BOUNDARIES,
  COMPANY_INFO,
  PRODUCTS,
  INSURERS,
  OJK_RULES,
  CLAIM_RULES,
  CLAIM_ESTIMATION_DATA,
  buildSystemPrompt,
  getProduct,
  getInsurer,
};
