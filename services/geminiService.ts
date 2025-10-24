import { GoogleGenAI } from "@google/genai";

// Per SDK guidelines, the API key is expected to be available in process.env.API_KEY.
// The client is initialized here, and it's assumed the key is present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateActivityIdeas = async (query: string): Promise<{ text: string; sources: any[] }> => {
  try {
    const prompt = `Generate 5 fun and engaging activity ideas for a club based on the topic: "${query}". Provide a short, one-sentence description for each idea. Format the output as a simple list.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
        text: response.text,
        // Ensure we only return web sources, as per grounding chunk structure
        sources: sources.filter(s => s.web), 
    };
  } catch (error) {
    console.error("Error generating activity ideas with search:", error);
    throw new Error("Failed to generate ideas from AI. Please try again.");
  }
};
