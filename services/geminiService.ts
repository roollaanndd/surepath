import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface AnalysisResult {
  success: boolean;
  data?: {
    isCar: boolean;
    isClear: boolean;
    isWhole: boolean;
    hasDamage: boolean;
    damageDescription: string;
    score: number;
    reasons?: string[];
    [key: string]: any;
  };
  error?: string;
}

export interface ClaimAnalysisResult {
  success: boolean;
  data?: {
    validImage: boolean;
    severity: 'Low' | 'Medium' | 'High' | 'Total Loss';
    estimatedCost: string;
    damagePoints: string[];
    recommendation: string;
  };
  error?: string;
}

export const analyzeVehiclePhoto = async (base64Images: string[], labels: string[]): Promise<AnalysisResult> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Returning mock data for demo purposes.");
    await new Promise(resolve => setTimeout(resolve, 3500)); // Longer delay for "comprehensive" analysis
    
    const isComplete = base64Images.length >= 8;
    const randomScore = Math.floor(Math.random() * 20) + 80; // Mock passing score between 80-100
    
    return {
      success: true,
      data: {
        isCar: true,
        isClear: true,
        isWhole: isComplete,
        hasDamage: false,
        damageDescription: isComplete 
          ? "Vehicle confirmed: Brand, Color, and Plate match input. No visible dents on 4 sides. Documents are legible." 
          : "Incomplete submission. Please provide all 8 required photos.",
        score: isComplete ? randomScore : 65,
        reasons: isComplete ? [] : ["Missing required angles"]
      }
    };
  }

  const modelId = 'gemini-2.5-flash'; 
  
  const prompt = `
    You are an expert insurance underwriter AI. Analyze these ${base64Images.length} images for car insurance verification.
    The images correspond to: ${labels.join(', ')}.
    
    Strictly validate:
    1. Completeness: Are all 8 required angles/docs present? (KTP, STNK Front/Back, Car Front/Back/Left/Right, Dashboard)
    2. Condition: Are there dents, scratches, or pre-existing damage?
    3. Legibility: Are documents readable?
    4. Consistency: Does the car in all photos look like the same vehicle?
    
    Return JSON:
    {
      "isCar": boolean,
      "isClear": boolean,
      "hasDamage": boolean,
      "damageDescription": string (detailed),
      "score": number (0-100. <80 implies rejection),
      "reasons": string[] (list of specific reasons if score < 100, e.g. "Dent on left door", "Blurry STNK")
    }
  `;

  try {
    const parts: any[] = [{ text: prompt }];
    
    base64Images.forEach(img => {
      const cleanBase64 = img.includes(',') ? img.split(',')[1] : img;
      parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
    });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: parts }],
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return { success: false, error: "No response from AI." };

    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch (parseError) {
      return { success: false, error: "Invalid JSON format from AI." };
    }

  } catch (error: any) {
    console.error("Analysis Failed:", error);
    return { success: false, error: "Verification service unavailable." };
  }
};

export const analyzeClaimPhoto = async (base64Image: string): Promise<ClaimAnalysisResult> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Returning mock claim data.");
    await new Promise(resolve => setTimeout(resolve, 3000));
    return {
      success: true,
      data: {
        validImage: true,
        severity: 'Medium',
        estimatedCost: 'Rp 2.500.000 - Rp 4.000.000',
        damagePoints: ['Dent on front bumper', 'Scratch on left fender', 'Headlight misalignment'],
        recommendation: 'Proceed to Authorized Workshop for panel beating and repainting.'
      }
    };
  }

  const modelId = 'gemini-2.5-flash';
  const prompt = `
    Analyze this image of a vehicle for an insurance claim.
    Identify the damage, estimate severity, and provide a rough repair cost range in IDR (Rupiah).
    
    Return JSON:
    {
      "validImage": boolean (is this a car with damage?),
      "severity": "Low" | "Medium" | "High" | "Total Loss",
      "estimatedCost": string (e.g., "Rp 1.000.000 - Rp 2.000.000"),
      "damagePoints": string[] (list of visible damages),
      "recommendation": string (repair advice)
    }
  `;

  try {
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }] }],
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return { success: false, error: "No response from AI." };
    
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (error: any) {
    console.error("Claim Analysis Failed:", error);
    return { success: false, error: "AI Service Unavailable" };
  }
};
