import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: We are assuming process.env.API_KEY is available as per instructions.
// In a real build, ensure the bundler injects this.
const apiKey = process.env.API_KEY || ''; 
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateTextEnhancement = async (currentText: string, instruction: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing");
    return "API Key missing. Cannot generate.";
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are an AI writing assistant for a CMS.
      User Instruction: ${instruction}
      
      Current Text Context: "${currentText}"
      
      Return ONLY the improved/generated text. No conversational filler.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "Error generating text.";
  }
};
