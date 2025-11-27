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

// Helper to clean markdown code blocks from JSON strings
const cleanJSON = (text: string) => {
  if (!text) return "";
  return text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '').trim();
};

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

      const text = cleanJSON(response.text || "");
      if (!text) throw new Error("No response from AI");

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
                1. DO NOT write complete, functional code solutions for the user if they ask for homework help or challenge solutions.
                2. Instead, provide hints, pseudo-code, explain concepts, or fix syntax errors in *their* code.
                3. Be encouraging and use emojis.
                4. If they ask about club activities, use the provided context.
                5. Format code blocks with \`\`\`python ... \`\`\`.
                `
            },
            history: history
        });

        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    if (!ai) {
        throw new Error("API Key Missing");
    }

    const model = "gemini-2.5-flash";
    const prompt = `
      You are a Code Reviewer for the ICT Club.
      Challenge Title: ${challengeTitle}
      
      Student Submission (Python):
      \`\`\`python
      ${code}
      \`\`\`
      
      Please provide a brief, constructive review.
      1. Is it correct? (Does it likely solve the challenge?)
      2. Code Style/Efficiency tips.
      3. A short encouraging comment.
      
      Keep it under 150 words. Use Markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text || "Could not analyze submission.";
    } catch (error) {
        console.error("Analysis Error:", error);
        throw new Error("Failed to analyze submission.");
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string) => {
    if (!ai) throw new Error("API Key Missing");

    const model = "gemini-2.5-flash";
    const prompt = `
        Create a 4-milestone learning roadmap for "${topic}" suitable for a "${skillLevel}" student in an ICT Club.
        
        For each milestone, provide:
        - title: A clear step name.
        - description: What they will learn.
        - duration: Estimated time (e.g., "1 week").
        - resources: An array of 2-3 specific learning resources (Tutorials, Docs, or Video titles).
          - type: 'VIDEO' | 'ARTICLE' | 'DOCS' | 'PRACTICE'
          - title: Name of the resource.
          - url: A valid-looking URL (e.g. youtube.com/... or docs.python.org/...)
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
                        milestones: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    duration: { type: Type.STRING },
                                    resources: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                type: { type: Type.STRING, enum: ['VIDEO', 'ARTICLE', 'DOCS', 'PRACTICE'] },
                                                title: { type: Type.STRING },
                                                url: { type: Type.STRING }
                                            },
                                            required: ['type', 'title', 'url']
                                        }
                                    }
                                },
                                required: ['title', 'description', 'duration', 'resources']
                            }
                        }
                    },
                    required: ['milestones']
                }
            }
        });

        const text = cleanJSON(response.text || "");
        if (!text) throw new Error("No response");
        return JSON.parse(text).milestones;
    } catch (error) {
        console.error("Roadmap Generation Error:", error);
        throw new Error("Failed to generate roadmap.");
    }
};