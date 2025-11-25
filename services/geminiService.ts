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
    [key: string]: any;
  };
  error?: string;
}

export const analyzeVehiclePhoto = async (base64Images: string[], type: 'EXTERIOR' | 'INTERIOR' | 'DOCUMENT'): Promise<AnalysisResult> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Returning mock data for demo purposes.");
    await new Promise(resolve => setTimeout(resolve, 2500)); // Slightly longer delay for "processing" multiple images
    
    // Mock logic: fail if only 1 image is sent (demo constraint), otherwise pass
    const isComplete = base64Images.length >= 4;
    
    return {
      success: true,
      data: {
        isCar: true,
        isClear: true,
        isWhole: isComplete,
        hasDamage: false,
        damageDescription: isComplete 
          ? "Vehicle appears to be in excellent condition. No visible dents, scratches, or structural damage detected across all 4 angles. Paintwork is consistent." 
          : "Incomplete submission. Please provide photos of all 4 sides.",
        score: isComplete ? 92 : 65
      }
    };
  }

  const modelId = 'gemini-2.5-flash'; 
  
  let prompt = "";
  if (type === 'EXTERIOR') {
    prompt = `Analyze these ${base64Images.length} images for a car insurance claim/onboarding. 
    Return a JSON object with the following fields: 
    - isCar: boolean (true if a car is clearly visible in the images).
    - isClear: boolean (true if lighting is good and images are not blurry).
    - isWhole: boolean (true if the images collectively cover the front, back, left, and right sides).
    - hasDamage: boolean (true if there are visible dents, scratches, rust or accidents).
    - damageDescription: string (concise 2-3 sentence summary of the vehicle's condition and any damage found. If clean, state that).
    - score: number (0-100 integer representing overall image quality and vehicle condition suitability for insurance. 100 is perfect. Below 80 is rejected).
    `;
  } else if (type === 'INTERIOR') {
    prompt = `Analyze this car dashboard image. Return JSON: { "isDashboard": boolean, "mileageVisible": boolean, "score": number, "damageDescription": string }`;
  } else {
    prompt = `Analyze this document. Return JSON: { "isReadable": boolean, "documentType": "STNK" | "SIM" | "UNKNOWN", "score": number, "damageDescription": string }`;
  }

  try {
    // Construct the payload with multiple image parts
    const parts: any[] = [{ text: prompt }];
    
    base64Images.forEach(img => {
      const cleanBase64 = img.includes(',') ? img.split(',')[1] : img;
      parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
    });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) {
      return { success: false, error: "The AI service did not return a response. Please try again." };
    }

    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return { success: false, error: "Received invalid data format from verification service." };
    }

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    
    let userMessage = "An unexpected error occurred during verification.";
    
    if (error.message?.includes('403') || error.message?.includes('API key')) {
        userMessage = "Verification service authorization failed. Please contact support.";
    } else if (error.message?.includes('429') || error.message?.includes('quota')) {
        userMessage = "System is currently busy. Please try again in a few moments.";
    } else if (error.message?.includes('500')) {
        userMessage = "Our verification servers are experiencing issues. Please try again later.";
    }

    return { success: false, error: userMessage };
  }
};