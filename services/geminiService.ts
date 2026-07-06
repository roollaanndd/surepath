import OpenAI from 'openai';

// ─── Model constants — swap any of these to change the model used ─────────────
const VISION_MODEL  = 'openai/gpt-4o-mini';              // OCR, photo validation, damage
const SURVEY_MODEL  = 'openai/gpt-4o';                   // multi-image underwriting
const TEXT_MODEL    = 'anthropic/claude-3.5-haiku-20241022'; // product explainer
export const CHAT_MODEL = 'anthropic/claude-3.5-haiku-20241022'; // health chatbot

// ─── Proxy through Supabase edge function — keeps OpenRouter key server-side ──
const AI_PROXY_URL  = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/ai-proxy`;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const getClient = () => new OpenAI({
  baseURL: AI_PROXY_URL,
  apiKey:  SUPABASE_ANON,
  defaultHeaders: { apikey: SUPABASE_ANON },
  dangerouslyAllowBrowser: true,
});

// Strip markdown code-fences that some models add around JSON
function parseJSON(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// Build an image_url content part from a base64 data URL or raw base64
function imageContent(base64: string, defaultMime = 'image/jpeg') {
  const mime = base64.startsWith('data:')
    ? base64.split(';')[0].split(':')[1]
    : defaultMime;
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  return { type: 'image_url' as const, image_url: { url: `data:${mime};base64,${raw}` } };
}

// ─── Interfaces (unchanged) ───────────────────────────────────────────────────

export interface ClaimPart {
  namaPart: string;
  kondisi: string;
  tindakan: 'Perbaiki' | 'Ganti';
  estimasiBiaya: number;
}

export interface ClaimAnalysisData {
  severity: 'Ringan' | 'Sedang' | 'Berat' | 'Total Loss';
  totalEstimasi: number;
  rincianPart: ClaimPart[];
  aiInsight: string;
  technicalReasoning: string;
  rekomendasiBengkel: string;
  nextSteps: string[];
  photoId?: string;
}

export interface HealthClaimData {
  hospitalName: string;
  patientName: string;
  treatmentDate: string;
  totalAmount: number;
  diagnosisSummary: string;
  billingItems: { item: string; cost: number }[];
  isOriginalDocument: boolean;
  confidenceScore: number;
}

export interface ProductExplanation {
  technicalSummary: string;
  neuralBenefits: { title: string; desc: string }[];
  securityProtocol: string;
  impactScore: number;
  payoutLogic: string;
}

export interface DocumentSummary {
  policyNumber: string;
  incidentDate: string;
  keyPoints: string[];
  riskAssessment: string;
}

export interface DamageIssue {
  part: string;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  scorePenalty: number;
}

export interface PhotoFlag {
  id: string;
  status: 'OK' | 'FRAUD_DETECTED' | 'POOR_QUALITY' | 'NOT_MATCHING' | 'DARK_PHOTO';
  reason: string;
}

export interface SurveyAnalysisResult {
  success: boolean;
  score?: number;
  summary?: string;
  detailedIssues?: DamageIssue[];
  photoFlags?: PhotoFlag[];
  auditVerdict?: 'CLEAN' | 'REVIEW_REQUIRED' | 'REJECTED';
  rejectionReason?: string;
  underwritingReport?: string;
  error?: string;
  isDirty?: boolean;
  cleanlinessComment?: string;
  identityMatchScore?: number;
  bodyConditionScore?: number;
  paintConditionScore?: number;
  glassConditionScore?: number;
  interiorConditionScore?: number;
  fraudRiskScore?: number;
  fraudAnalysis?: string;
  recommendations?: string[];
}

// ─── Image compression ────────────────────────────────────────────────────────

async function compressImageBase64(base64: string, maxWidthPx = 1024): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(base64); // fallback if load fails
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

// ─── Functions ────────────────────────────────────────────────────────────────

export const analyzeHealthReceipt = async (base64Image: string): Promise<{ success: boolean; data?: HealthClaimData; error?: string }> => {
  try {
    const res = await getClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Anda adalah auditor klaim asuransi kesehatan senior. Analisa kuitansi medis atau tagihan rumah sakit ini.
Ekstrak data ke dalam JSON dengan struktur tepat:
{
  "hospitalName": "nama rumah sakit atau klinik",
  "patientName": "nama pasien",
  "treatmentDate": "tanggal perawatan (YYYY-MM-DD)",
  "totalAmount": number,
  "diagnosisSummary": "ringkasan diagnosa",
  "billingItems": [{ "item": "nama layanan", "cost": number }],
  "isOriginalDocument": boolean,
  "confidenceScore": number
}
Gunakan Bahasa Indonesia. Jika data tidak ada, gunakan null. Kembalikan JSON saja, tanpa teks lain.` },
          imageContent(base64Image),
        ],
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return { success: true, data: parseJSON(text) };
  } catch (e) {
    console.error('analyzeHealthReceipt error:', e);
    return { success: false, error: 'Gagal menganalisa kuitansi medis.' };
  }
};

export const explainProductAI = async (productName: string, lang: 'ID' | 'EN'): Promise<{ success: boolean; data?: ProductExplanation; error?: string }> => {
  try {
    const res = await getClient().chat.completions.create({
      model: TEXT_MODEL,
      messages: [{
        role: 'user',
        content: `You are the SurePath Lead Neural Architect. Explain the product "${productName}" to a high-end customer.
Use compelling, futuristic, and technical language. Focus on Neural Underwriting, Computer Vision, and Zero-Trust data protocols.

Return JSON only:
{
  "technicalSummary": "high-fidelity product overview",
  "neuralBenefits": [{ "title": "benefit name", "desc": "technical explanation" }],
  "securityProtocol": "encryption and data privacy description",
  "impactScore": number (0-100),
  "payoutLogic": "instant 60-second claim settlement explanation"
}

Language: ${lang === 'ID' ? 'Bahasa Indonesia' : 'English'}. Use vocabulary like 'Matriks', 'Heuristik', 'Enkripsi Kuantum', 'Visi Komputer'. Return JSON only.`,
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return { success: true, data: parseJSON(text) };
  } catch (e) {
    console.error('explainProductAI error:', e);
    return { success: false, error: 'Neural Engine failure.' };
  }
};

export const analyzeClaimPhoto = async (base64Image: string): Promise<{ success: boolean; data?: ClaimAnalysisData; error?: string }> => {
  try {
    const res = await getClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Lakukan audit investigasi kerusakan kendaraan secara mendalam dari foto ini. Anda adalah Investigator Klaim Neural SurePath.

1. Identifikasi SETIAP panel terdampak (Bumper, Lampu, Fender, dll).
2. Berikan kondisi spesifik (Goresan dalam >10cm, Retak, Penyok struktural).
3. Tentukan tindakan: 'Perbaiki' atau 'Ganti'.
4. Estimasi harga dalam Rupiah (IDR).
5. TOTAL ESTIMASI = jumlah semua rincian.

Return JSON only:
{
  "severity": "Ringan|Sedang|Berat|Total Loss",
  "totalEstimasi": number,
  "rincianPart": [{ "namaPart": string, "kondisi": string, "tindakan": "Perbaiki|Ganti", "estimasiBiaya": number }],
  "aiInsight": "analisa singkat max 2 kalimat",
  "technicalReasoning": "alasan tindakan",
  "rekomendasiBengkel": "Authorized/Partner",
  "nextSteps": ["langkah-langkah"]
}` },
          imageContent(base64Image),
        ],
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return { success: true, data: parseJSON(text) };
  } catch (e) {
    console.error('analyzeClaimPhoto error:', e);
    return { success: false, error: 'Gagal menghubungkan ke Neural Vision Engine.' };
  }
};

export const summarizeClaimDocument = async (base64Doc: string): Promise<{ success: boolean; data?: DocumentSummary; error?: string }> => {
  try {
    const res = await getClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Ringkas dokumen klaim ini. Return JSON only: { "policyNumber": string, "incidentDate": string, "keyPoints": string[], "riskAssessment": string }' },
          imageContent(base64Doc),
        ],
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return { success: true, data: parseJSON(text) };
  } catch (e) {
    return { success: false, error: 'AI Error' };
  }
};

export const extractStnkData = async (base64: string, mimeType: string = 'image/jpeg'): Promise<{ success: boolean; data?: any }> => {
  try {
    const compressed = await compressImageBase64(base64, 1200);
    const res = await getClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Lakukan OCR presisi tinggi pada dokumen STNK (Surat Tanda Nomor Kendaraan) Indonesia ini.

Ekstrak data seakurat mungkin:
1. owner: Nama Pemilik
2. plate: Nomor Polisi (Format: B 1234 XYZ)
3. brand: Merk (TOYOTA, HONDA, dll)
4. model: Tipe/Model (AVANZA 1.3 G, dll)
5. color: Warna Kendaraan
6. year: Tahun Pembuatan
7. vin: Nomor Rangka / NIK — SANGAT PENTING
8. engine: Nomor Mesin — SANGAT PENTING
9. status: 'OK' jika dokumen terlihat asli, 'UNCLEAR' jika blur/terpotong

Return JSON only: { "owner": string, "plate": string, "brand": string, "model": string, "color": string, "year": string, "vin": string, "engine": string, "status": string }` },
          imageContent(compressed, mimeType),
        ],
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return { success: true, data: parseJSON(text) };
  } catch (e) {
    console.error('extractStnkData error:', e);
    return { success: false };
  }
};

export const validateVehiclePhoto = async (base64: string, slotLabel: string): Promise<{ valid: boolean; issue?: string }> => {
  try {
    const compressed = await compressImageBase64(base64, 800);
    const res = await getClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `You are an Auto Insurance AI Auditor. Validate this photo for slot "${slotLabel}".

Check:
1. Is it a car/vehicle?
2. Is it clear and visible (not pitch black or blurry)?
3. Is lighting adequate?
4. Does it roughly match slot "${slotLabel}"? (loose check)

Return JSON only: { "valid": boolean, "issue": "Brief reason in Indonesian (max 5 words) if invalid, or null" }
Examples of issue: "Foto buram", "Bukan mobil", "Terlalu gelap"` },
          imageContent(compressed),
        ],
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return parseJSON(text);
  } catch (e) {
    console.error('validateVehiclePhoto error:', e);
    return { valid: true }; // non-blocking fallback
  }
};

export const analyzeVehicleSurvey = async (
  images: { id: string; data: string }[],
  expectedData?: { brand: string; model: string; color: string; plate: string }
): Promise<SurveyAnalysisResult> => {
  try {
    const contextBlock = expectedData
      ? `KONTEKS KENDARAAN YANG DIASURANSIKAN:
- Merk   : ${expectedData.brand}
- Model  : ${expectedData.model}
- Warna  : ${expectedData.color}
- Plat   : ${expectedData.plate}`
      : 'KONTEKS KENDARAAN: tidak tersedia — lakukan analisa tanpa verifikasi identitas.';

    const prompt = `Anda adalah Surveyor Asuransi Senior di SurePath Insurance. Lakukan inspeksi pra-asuransi (Pre-Insurance Vehicle Survey) secara menyeluruh dan teliti terhadap ${images.length} foto kendaraan berikut.

${contextBlock}

INSTRUKSI — Nilai 6 dimensi secara independen:

1. VERIFIKASI IDENTITAS (identityMatchScore 0-100)
   - Cocokkan merk, model, warna, dan plat nomor di foto dengan data di atas
   - Score 100 = semua persis cocok
   - Score 0 = tidak cocok sama sekali / tidak terbaca
   - Jika merk/plat jelas berbeda → auditVerdict WAJIB REJECTED

2. DETEKSI FRAUD (fraudRiskScore 0-100; semakin tinggi = semakin berisiko)
   Tanda-tanda kecurangan yang harus dicari:
   a) Foto layar / foto-dalam-foto: tampak piksel kasar, cahaya tidak alami, refleksi monitor/layar
   b) Foto stok atau unduhan internet: background terlalu bersih, tidak ada lingkungan nyata, watermark, kualitas terlalu sempurna
   c) Hasil editing: bayangan tidak konsisten antar panel, warna panel yang berbeda-beda secara tidak wajar, artefak digital, tepi yang terlalu tajam / blur selektif
   d) Inkonsistensi antar foto: latar belakang atau kondisi cahaya sangat berbeda padahal diambil pada sesi yang sama
   e) Nomor plat tidak terbaca atau sengaja ditutup/buram
   Score 0-20 = Aman, 21-50 = Perlu perhatian, 51-100 = Indikasi kuat fraud

3. KONDISI BODI EKSTERIOR (bodyConditionScore 0-100)
   - Periksa bumper depan & belakang, semua pintu, fender, kap mesin, atap, side skirt
   - Cari: goresan (scratch), penyok (dent), lecet, karat, deformasi struktural, lipatan bodi
   - Score 100 = mulus sempurna, 0 = kerusakan parah / struktural

4. KONDISI CAT (paintConditionScore 0-100)
   - Keseragaman warna cat di semua panel (deteksi repaint sebagian)
   - Oksidasi, baret halus (swirl marks), cat terkelupas / mengelupas
   - Score 100 = cat original mulus, 0 = cat rusak / banyak repaint

5. KONDISI KACA (glassConditionScore 0-100)
   - Kaca depan (windshield), belakang, samping kiri & kanan
   - Retak (crack), chip, baret dalam, atau tambalan kaca
   - Score 100 = kaca sempurna, 0 = kaca retak / tidak layak

6. KONDISI INTERIOR / DASHBOARD (interiorConditionScore 0-100)
   - Dashboard, konsol tengah, jok, trim pintu, plafon
   - Indikator lampu check engine atau airbag menyala (jika terlihat)
   - Score 100 = interior bersih sempurna, 0 = rusak parah

PERHITUNGAN SKOR TOTAL (score 0-100):
score = (bodyConditionScore × 0.30) + (paintConditionScore × 0.20) + (identityMatchScore × 0.25) + (glassConditionScore × 0.15) + (interiorConditionScore × 0.10)
Kurangi score sebesar (fraudRiskScore × 0.3) jika fraudRiskScore > 30

VERDICT:
- CLEAN             : score ≥ 80 DAN fraudRiskScore ≤ 20 DAN identityMatchScore ≥ 90
- REVIEW_REQUIRED   : score 65-79 ATAU fraudRiskScore 21-50
- REJECTED          : score < 65 ATAU fraudRiskScore > 50 ATAU identityMatchScore < 70

Return JSON only (tidak ada teks di luar JSON):
{
  "score": number,
  "identityMatchScore": number,
  "bodyConditionScore": number,
  "paintConditionScore": number,
  "glassConditionScore": number,
  "interiorConditionScore": number,
  "fraudRiskScore": number,
  "fraudAnalysis": "deskripsi analisa fraud (2-3 kalimat Bahasa Indonesia)",
  "summary": "kesimpulan underwriting 2-3 kalimat (Bahasa Indonesia)",
  "underwritingReport": "laporan naratif faktual lengkap (Bahasa Indonesia)",
  "isDirty": boolean,
  "cleanlinessComment": "komentar kebersihan kendaraan",
  "detailedIssues": [{ "part": string, "description": string, "severity": "Minor|Moderate|Severe", "scorePenalty": number }],
  "photoFlags": [{ "id": string, "status": "OK|FRAUD_DETECTED|POOR_QUALITY|NOT_MATCHING|DARK_PHOTO", "reason": string }],
  "auditVerdict": "CLEAN|REVIEW_REQUIRED|REJECTED",
  "rejectionReason": "alasan spesifik jika REJECTED, atau null",
  "recommendations": ["rekomendasi tindak lanjut 1", "rekomendasi 2"]
}`;

    const compressedImages = await Promise.all(images.map(async img => ({
      ...img,
      data: await compressImageBase64(img.data, 768),
    })));
    const imagesParts = compressedImages.map(img => imageContent(img.data));

    const res = await getClient().chat.completions.create({
      model: SURVEY_MODEL,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: prompt }, ...imagesParts],
      }],
      max_tokens: 2000,
    });

    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    const data = parseJSON(text);

    const flagsWithIds = data.photoFlags?.map((flag: any, index: number) => ({
      ...flag,
      id: images[index]?.id ?? `img_${index}`,
    }));

    return { success: true, ...data, photoFlags: flagsWithIds };
  } catch (e) {
    console.error('analyzeVehicleSurvey error:', e);
    return { success: false, error: 'Gagal menghubungkan ke Neural Engine.' };
  }
};

export const extractKtpData = async (base64: string): Promise<{ success: boolean; data?: any }> => {
  try {
    const res = await getClient().chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Analyze this Indonesian KTP (identity card). Extract:
- Full Name (Nama) — uppercase
- NIK — exactly 16 digits, numeric only
- Full Address (Alamat) — uppercase

Return JSON only: { "name": string|null, "nik": string|null, "address": string|null }` },
          imageContent(base64),
        ],
      }],
    });
    const text = res.choices[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response');
    return { success: true, data: parseJSON(text) };
  } catch (e) {
    console.error('extractKtpData error:', e);
    return { success: false };
  }
};
