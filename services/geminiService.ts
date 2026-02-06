
import { GoogleGenAI, Type } from "@google/genai";

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

/**
 * Interface for Vehicle Survey analysis results.
 * Added isDirty and cleanlinessComment to fix property check errors in StepSurvey.tsx.
 */
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
}

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeHealthReceipt = async (base64Image: string): Promise<{ success: boolean; data?: HealthClaimData; error?: string }> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `Anda adalah auditor klaim asuransi kesehatan senior. Analisa kuitansi medis atau tagihan rumah sakit ini.
  Ekstrak data ke dalam JSON yang ketat dengan struktur:
  {
    "hospitalName": "nama rumah sakit atau klinik",
    "patientName": "nama pasien",
    "treatmentDate": "tanggal perawatan (YYYY-MM-DD)",
    "totalAmount": number (total biaya),
    "diagnosisSummary": "ringkasan diagnosa atau jenis perawatan",
    "billingItems": [
      { "item": "nama item/layanan", "cost": number }
    ],
    "isOriginalDocument": boolean (apakah terlihat seperti dokumen asli),
    "confidenceScore": number (0-100)
  }
  Gunakan bahasa Indonesia. Jika data tidak ditemukan, isi null atau array kosong.`;

  try {
    const ai = getAi();
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }] },
      config: { responseMimeType: "application/json", temperature: 0.1 }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return { success: true, data: JSON.parse(text) };
  } catch (error) {
    console.error("Gemini Health Error:", error);
    return { success: false, error: "Gagal menganalisa kuitansi medis." };
  }
};

export const explainProductAI = async (productName: string, lang: 'ID' | 'EN'): Promise<{ success: boolean; data?: ProductExplanation; error?: string }> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `You are the SurePath Lead Neural Architect. Explain the product "${productName}" to a high-end customer.
  Use staggered, compelling, futuristic, and highly technical language.
  Focus on: Neural Underwriting, Computer Vision audits, and Zero-Trust data protocols.
  
  Return a JSON object:
  {
    "technicalSummary": "A high-fidelity overview of the product's neural kernel.",
    "neuralBenefits": [
      { "title": "Benefit Name", "desc": "Technical explanation of why this AI feature beats traditional insurance." }
    ],
    "securityProtocol": "Description of the encryption and data privacy measures.",
    "impactScore": number (0-100),
    "payoutLogic": "Explanation of the instant 60-second claim settlement logic."
  }
  
  Language: ${lang === 'ID' ? 'Bahasa Indonesia' : 'English'}. Use high-tech vocabulary like 'Matriks', 'Heuristik', 'Enkripsi Kuantum', 'Visi Komputer'.`;

  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return { success: true, data: JSON.parse(text) };
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return { success: false, error: "Neural Engine failure." };
  }
};

export const analyzeClaimPhoto = async (base64Image: string): Promise<{ success: boolean; data?: ClaimAnalysisData; error?: string }> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `Anda adalah auditor klaim asuransi kendaraan senior. Analisa foto kerusakan kendaraan ini. 
  Berikan output dalam JSON yang sangat ketat dengan struktur berikut:
  {
    "severity": "Ringan | Sedang | Berat | Total Loss",
    "totalEstimasi": number,
    "rincianPart": [
      {
        "namaPart": "nama bagian kendaraan yang rusak",
        "kondisi": "deskripsi kerusakan spesifik",
        "tindakan": "Perbaiki | Ganti",
        "estimasiBiaya": number
      }
    ],
    "aiInsight": "ringkasan eksekutif singkat",
    "technicalReasoning": "analisa teknis mengapa tindakan tersebut diambil",
    "rekomendasiBengkel": "tipe bengkel yang disarankan",
    "nextSteps": ["langkah 1", "langkah 2"]
  }
  Gunakan bahasa Indonesia. Jika tidak ada kerusakan terlihat, isi rincianPart dengan estimasi inspeksi dasar.`;

  try {
    const ai = getAi();
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }] },
      config: { responseMimeType: "application/json", temperature: 0.1 }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return { success: true, data: JSON.parse(text) };
  } catch (error) { 
    console.error("Gemini Error:", error);
    return { success: false, error: "Gagal menganalisa foto klaim." }; 
  }
};

export const summarizeClaimDocument = async (base64Doc: string): Promise<{ success: boolean; data?: DocumentSummary; error?: string }> => {
  try {
    const ai = getAi();
    const cleanBase64 = base64Doc.includes(',') ? base64Doc.split(',')[1] : base64Doc;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: "Ringkas dokumen klaim ini. JSON: { policyNumber: string, incidentDate: string, keyPoints: string[], riskAssessment: string }" }, { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }] },
      config: { responseMimeType: 'application/json' }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return { success: true, data: JSON.parse(text) };
  } catch (e) { return { success: false, error: "AI Error" }; }
};

export const extractStnkData = async (base64: string, mimeType: string = 'image/jpeg'): Promise<{ success: boolean; data?: any }> => {
  try {
    const ai = getAi();
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: `Lakukan audit OCR presisi tinggi pada dokumen STNK (Surat Tanda Nomor Kendaraan) Indonesia ini.
          
          Ekstrak data berikut seakurat mungkin (100% precision):
          1. owner: Nama Pemilik.
          2. plate: Nomor Polisi / Registrasi (Format: B 1234 XYZ).
          3. brand: Merk (Contoh: TOYOTA, HONDA).
          4. model: Tipe / Model (Contoh: AVANZA 1.3 G).
          5. color: Warna Kendaraan.
          6. year: Tahun Pembuatan / Perakitan.
          7. vin: Nomor Rangka (NIK/VIN) - SANGAT PENTING.
          8. engine: Nomor Mesin - SANGAT PENTING.
          
          Validasi Keamanan:
          - status: 'OK' hanya jika dokumen terlihat asli.
          - Jika blur/terpotong: 'UNCLEAR'.
          
          Output JSON: { owner, plate, brand, model, color, year, vin, engine, status }.` }, 
          { inlineData: { mimeType: mimeType, data: cleanBase64 } }
        ] 
      },
      config: { responseMimeType: 'application/json', temperature: 0.0 }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return { success: true, data: JSON.parse(text) };
  } catch (e) { 
    console.error("STNK Extraction Error:", e);
    return { success: false }; 
  }
};

export const validateVehiclePhoto = async (base64: string, slotLabel: string): Promise<{ valid: boolean; issue?: string }> => {
  try {
    const ai = getAi();
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const prompt = `Role: Auto Insurance AI Auditor.
    Task: Validate single photo upload.
    Context: User is uploading photo for slot "${slotLabel}".
    
    Checks:
    1. Object: Is it a car/vehicle part?
    2. Visibility: Is it clear enough (not pitch black, not extremely blurry)?
    3. Lighting: Is it bright enough to see details clearly?
    4. Angle: Does it roughly match "${slotLabel}"? (Loose check).
    
    Output JSON:
    {
      "valid": boolean,
      "issue": "Brief reason in Indonesian if invalid (max 5 words) like 'Foto terlalu gelap' or 'Foto kurang jelas'" OR null
    }
    
    Example invalid issues: "Foto buram", "Bukan mobil", "Terlalu gelap", "Lampu flash terlalu terang".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: prompt }, 
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
        ] 
      },
      config: { responseMimeType: 'application/json', temperature: 0.1 }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return JSON.parse(text);
  } catch (e) {
    console.error("Validation error", e);
    return { valid: true }; // Fallback to avoid blocking user on AI error
  }
};

export const analyzeVehicleSurvey = async (images: {id: string, data: string}[], expectedData?: { brand: string, model: string, color: string, plate: string }): Promise<SurveyAnalysisResult> => {
  try {
    const ai = getAi();
    const imageParts = images.map(img => {
      const data = img.data.includes(',') ? img.data.split(',')[1] : img.data;
      return { inlineData: { mimeType: 'image/jpeg', data } };
    });

    const contextPrompt = expectedData ? 
      `DATA EKSPEKTASI (Wajib Cocok): 
      - Merk: ${expectedData.brand}
      - Model: ${expectedData.model}
      - Warna: ${expectedData.color}
      - Plat Nomor: ${expectedData.plate}` : "";

    const prompt = `Lakukan audit pra-asuransi (Underwriting Risk Assessment) yang sangat ketat menggunakan Computer Vision. Anda adalah Chief Underwriter.

    Tugas Utama: 
    1. VERIFIKASI IDENTITAS:
       Bandingkan unit di foto dengan data ekspektasi berikut:
       ${contextPrompt}
       Jika Warna, Merk, atau Plat berbeda, status WAJIB 'REJECTED'.

    2. ANALISA KUALITAS FOTO & KEBERSIHAN:
       Cek apakah mobil terlihat kotor.
       Cek kualitas pencahayaan dan fokus setiap foto.
       Kembalikan status 'DARK_PHOTO' jika pencahayaan kurang.
       Kembalikan status 'POOR_QUALITY' jika foto blur or resolusi rendah.

    3. IDENTIFIKASI KERUSAKAN:
       - Periksa panel: Bumper, Pintu, Fender, Kap Mesin, Atap, Kaca.
       - Cari: Goresan (Scratch), Penyok (Dent), Pecah (Crack).

    4. PENILAIAN SKOR (0-100):
       - Skor 100: Mulus & Bersih total.
       - Skor < 80: Ada kerusakan visual atau mobil terlalu kotor/gelap untuk diaudit.

    Output JSON Wajib:
    {
      "score": number,
      "summary": "Kesimpulan underwriting singkat (Bahasa Indonesia).",
      "underwritingReport": "Laporan naratif faktual.",
      "isDirty": boolean,
      "cleanlinessComment": "Komentar tentang kebersihan mobil.",
      "detailedIssues": [
        { "part": "Nama Bagian", "description": "Deskripsi kerusakan", "severity": "Minor" | "Moderate" | "Severe", "scorePenalty": number }
      ],
      "photoFlags": [
        { "id": "id_foto", "status": "OK" | "FRAUD_DETECTED" | "POOR_QUALITY" | "NOT_MATCHING" | "DARK_PHOTO", "reason": "Reason (In Indonesian)" }
      ],
      "auditVerdict": "CLEAN" | "REVIEW_REQUIRED" | "REJECTED",
      "rejectionReason": "Sebutkan alasan spesifik jika REJECTED"
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }, ...imageParts.map(p => p)] },
      config: { responseMimeType: 'application/json', temperature: 0.1 }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    const data = JSON.parse(text);
    
    const flagsWithIds = data.photoFlags?.map((flag: any, index: number) => ({
      ...flag,
      id: images[index]?.id || `img_${index}`
    }));

    return { success: true, ...data, photoFlags: flagsWithIds };
  } catch (e) { 
    console.error("Vehicle Survey AI Error:", e);
    return { success: false, error: "Gagal menghubungkan ke Neural Engine." }; 
  }
};

export const extractKtpData = async (base64: string): Promise<{ success: boolean; data?: any }> => {
  try {
    const ai = getAi();
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: "Analyze this Indonesian KTP. Extract: Full Name (Nama), NIK (exactly 16 digits), and Full Address (Alamat). Return a JSON object with keys 'name', 'nik', and 'address'. Ensure NIK is cleaned of any non-numeric characters. Use uppercase for name and address. If a field is missing, use null." }, 
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
        ] 
      },
      config: { 
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });
    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return { success: true, data: JSON.parse(text) };
  } catch (e) { 
    console.error("KTP AI Error:", e);
    return { success: false }; 
  }
};
