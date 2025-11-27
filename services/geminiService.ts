
import { GoogleGenAI, Type } from "@google/genai";

// Robustly retrieve API Key checking all common build tool conventions
const getApiKey = (): string => {
  let key = '';

  // 1. Try Vite's import.meta.env (Standard for Vercel + Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore reference errors
  }

  if (key) return key;

  // 2. Try standard process.env (Node/Webpack/CRA/Next.js/Vercel System Env)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      key = process.env.VITE_API_KEY || process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
    }
  } catch (e) {
    // Ignore reference errors
  }

  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled. Ensure VITE_API_KEY is set in your Vercel Environment Variables.");
}

// Initialize client only if key exists to prevent immediate instantiation errors
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface ActivityIdea {
  title: string;
  description: string;
  location: string;
}

export const generateClubActivityIdea = async (): Promise<ActivityIdea> => {
  if (!ai) {
      throw new Error("AI Service Unavailable: API Key not configured.");
  }

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
      throw new Error("Failed to generate activity idea.");
  }
};

export const getAIChatResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) => {
    if (!ai) {
        return "I'm sorry, but I can't chat right now because my AI configuration is missing. Please contact the administrator to set the VITE_API_KEY.";
    }

    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are the helpful AI Assistant for the ICT Club. You help members with coding questions, project ideas, and club logistics. Be concise, encouraging, and tech-savvy."
            },
            history: history
        });

        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Chat Error:", error);
        return "I'm having trouble connecting to the server right now. Please try again later.";
    }
};

export const getAiTutorResponse = async (
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    clubContext: string = ''
) => {
    if (!ai) {
        return "I'm offline right now (API Key Missing).";
    }

    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
                Your goal is to TEACH, not to do the work for the students.
                
                REAL-TIME CLUB INFORMATION (Use this to answer questions about the club schedule, challenges, or news):
                ${clubContext}
                
                CRITICAL RULES:
                1. DO NOT write complete, functional code solutions for the user's specific problem.
                2. If the user asks for code (e.g., "Write a calculator"), refuse politely and offer to explain the *logic*, *algorithm*, or provide *pseudocode* or *flowchart descriptions*.
                3. You MAY provide generic syntax examples (e.g., "Here is the syntax for a python function") but do not fill it with the user's specific logic.
                4. Guide the user with hints, questions, and debugging tips. Ask them Socratic questions to lead them to the answer.
                5. If the user presents code that is broken, explain *why* it is broken and hint at the fix, do not just rewrite it fixed.
                6. Be encouraging and fun. Use emojis occasionally.
                7. Keep responses concise and easy to read.
                8. If asked about club activities, challenges, or news, use the REAL-TIME CLUB INFORMATION provided above.`
            },
            history: history
        });

        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having a bit of trouble thinking right now. Try again in a moment.";
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, submissionContent: string): Promise<string> => {
  if (!ai) {
      return "AI Analysis Unavailable: System configuration missing (API Key). Please check your Vercel Environment Variables.";
  }

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
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return `Error generating analysis: ${error.message || "Unknown error"}.`;
  }
};
