
import { GoogleGenAI, Type } from "@google/genai";

// Safely retrieve API Key, handling both standard process.env and Vite's import.meta.env
const getApiKey = () => {
  let key = '';
  
  // Try standard Node/Webpack process.env
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      key = process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore reference errors
  }

  // If not found, try Vite's import.meta.env (Standard for Vercel + React)
  if (!key) {
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        key = import.meta.env.VITE_API_KEY || '';
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
    console.warn("Gemini API Key is missing. Please check your environment variables (API_KEY or VITE_API_KEY).");
}

const ai = new GoogleGenAI({ apiKey });

export interface ActivityIdea {
  title: string;
  description: string;
  location: string;
}

export const generateClubActivityIdea = async (): Promise<ActivityIdea> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are an enthusiastic and creative patron for a high school ICT Club. 
    Generate ONE detailed and exciting activity idea for the club.
    It should be feasible for a school setting, educational, and engaging.
    Topics can include coding, hardware, robotics, design, career talks, or tech trivia.
    
    Return a JSON object with:
    - title: A catchy name for the event.
    - description: A short, persuasive description of what will happen (2-3 sentences).
    - location: A suggested typical school location (e.g., "Computer Lab", "School Hall", "Maker Space", "Online").
  `;

  try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING },
            },
            required: ["title", "description", "location"],
          },
        },
      });

      let text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }

      // Cleanup: Remove markdown code blocks if present (e.g. ```json ... ```)
      if (text.startsWith('```')) {
          text = text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(text) as ActivityIdea;
  } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate activity idea. Please check your API key.");
  }
};

export const getAIChatResponse = async (history: { role: 'user' | 'model', parts: [{ text: string }] }[], message: string) => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are the helpful AI Assistant for the ICT Club. You help members with coding questions, project ideas, and club logistics. Be concise, encouraging, and tech-savvy."
        },
        history: history
    });

    const response = await chat.sendMessage({ message });
    return response.text;
};

export const analyzeChallengeSubmission = async (challengeTitle: string, submissionContent: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are an expert coding tutor for a high school ICT club.
    A student has submitted a solution for the challenge: "${challengeTitle}".

    Here is their submission:
    """
    ${submissionContent}
    """

    Please provide a short, constructive analysis.
    1. Is it correct/does it solve the problem? (If you can't tell for sure, say so).
    2. Code quality/Style feedback.
    3. A clear recommendation: APPROVE or REJECT.
    
    Format the output clearly.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze submission.");
  }
};
