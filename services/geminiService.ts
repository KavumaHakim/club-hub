
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

// Helper function to convert a File to a GenAI Part
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};


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
      You are a friendly but rigorous Code Mentor for a high school ICT Club.
      Review the following Python submission for the challenge: "${challengeTitle}".
      
      Student Code:
      \`\`\`python
      ${code}
      \`\`\`
      
      Provide a structured review in Markdown format:
      
      **🧐 Analysis**
      - State clearly if the code solves the problem (Yes/No/Partial).
      - Briefly explain the logic used or identify the main bug.
      
      **🚀 Style & Efficiency**
      - Comment on variable naming, readability, or indentation.
      - Mention time complexity if relevant (keep it simple).
      - Suggest Pythonic improvements (e.g., "Use a list comprehension here").
      
      **💡 Better Approach**
      - Provide a short, optimized code snippet demonstrating a better way to solve part of the problem.
      \`\`\`python
      # Example improvement
      \`\`\`
      
      **🌟 Verdict**
      - A short, encouraging closing sentence to motivate the student.
      
      Keep the tone constructive, helpful, and fun.
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

export const generateLearningRoadmap = async (topic: string, skillLevel: string, suggestedTopics?: string) => {
    if (!ai) throw new Error("API Key Missing");

    const model = "gemini-2.5-flash";
    const prompt = `
        Create a short, modular 3-milestone learning roadmap for "${topic}" suitable for a "${skillLevel}" student in an ICT Club.
        Focus on specific, bite-sized concepts rather than broad overviews.
        The goal is practical, hands-on learning.

        If provided, try to incorporate these suggested topics where they fit logically:
        "${suggestedTopics || 'Not provided'}"
        
        For each milestone, provide:
        - title: A clear step name.
        - description: What they will learn (keep it concise).
        - duration: Estimated time (e.g., "3 days").
        - resources: An array of 3-5 specific learning resources (Tutorials, Docs, or Video titles).
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

export const generateDocumentSummary = async (file: File): Promise<string> => {
    if (!ai) {
      throw new Error("AI Service Unavailable: API Key not configured.");
    }
    if (!file) {
      throw new Error("No file provided for summary.");
    }
  
    // Check if the file type is supported for this specific AI function
    const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!supportedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported for AI summary. Please use PDF, DOCX, or TXT.`);
    }
  
    const model = "gemini-2.5-flash"; // Multimodal model
    const prompt = "Summarize this document in a concise, engaging paragraph (2-4 sentences) suitable for a resource library. Capture the main purpose and key topics.";
  
    try {
      const filePart = await fileToGenerativePart(file);
      const response = await ai.models.generateContent({
          model,
          contents: { parts: [filePart, { text: prompt }] },
      });
      
      return response.text || "Could not generate a summary from the document.";
  
    } catch (error) {
      console.error("Gemini Summary Error:", error);
      throw new Error("Failed to generate document summary with AI.");
    }
  };

export type QuizQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
    id: number;
    type: QuizQuestionType;
    question: string;
    options?: string[]; // For MC and TF (TF options will be generated by AI or fixed by frontend)
    correctAnswer: string; // The correct option text or a reference answer for SA
}

export const generateMilestoneQuiz = async (milestoneTitle: string, milestoneDescription: string): Promise<QuizQuestion[]> => {
    if (!ai) throw new Error("API Key Missing");

    const model = "gemini-2.5-flash";
    const prompt = `
        Generate a short 3-question quiz to test a student's understanding of:
        Topic: ${milestoneTitle}
        Details: ${milestoneDescription}
        
        The quiz must contain exactly these 3 types of questions in this order:
        1. "MULTIPLE_CHOICE": A standard multiple choice question with 4 options.
        2. "TRUE_FALSE": A statement that is either True or False.
        3. "SHORT_ANSWER": A conceptual question requiring a brief explanation (1-2 sentences).
        
        Return a JSON object with a 'questions' array.
        Each question object should have:
        - type: One of "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"
        - question: The question text.
        - options: Array of strings (Required for MC, use ["True", "False"] for TF, empty for SA).
        - correctAnswer: The correct string value from options (for MC/TF) or a brief model answer (for SA).
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
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'] },
                                    question: { type: Type.STRING },
                                    options: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    },
                                    correctAnswer: { type: Type.STRING }
                                },
                                required: ["type", "question", "options", "correctAnswer"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        });

        const text = cleanJSON(response.text || "");
        if (!text) throw new Error("No response");
        
        const parsed = JSON.parse(text);
        return parsed.questions.map((q: any, index: number) => ({...q, id: index}));
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        throw new Error("Failed to generate quiz.");
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, context: string): Promise<{ correct: boolean, feedback: string }> => {
    if (!ai) throw new Error("API Key Missing");
    
    const prompt = `
        You are a teacher grading a student's answer.
        Question: "${question}"
        Model Answer / Context: "${context}"
        Student Answer: "${userAnswer}"
        
        Is the student's answer factually correct based on the context? 
        Return JSON:
        {
            "correct": boolean,
            "feedback": "A concise, encouraging 1-sentence explanation."
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        correct: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    },
                    required: ["correct", "feedback"]
                }
            }
        });
        
        const text = cleanJSON(response.text || "");
        return JSON.parse(text);
    } catch (error) {
        console.error("Grading error:", error);
        // Fallback for error
        return { correct: true, feedback: "Good effort! (Auto-passed due to connection error)" };
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    if (!ai) throw new Error("API Key Missing");

    const prompt = `
        You are an expert Computer Science teacher grading a student's code submission for a project task.
        
        Task Description: "${taskDescription}"
        
        Student's Python Code:
        \`\`\`python
        ${code}
        \`\`\`
        
        Please evaluate the code based on:
        1. Correctness (Does it solve the task?)
        2. Code Style & Cleanliness
        3. Efficiency
        
        Return a JSON object:
        {
            "grade": number, // An integer from 1 to 5 (1=Poor, 5=Excellent)
            "feedback": "A short paragraph providing constructive feedback and encouraging the student."
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.INTEGER },
                        feedback: { type: Type.STRING }
                    },
                    required: ["grade", "feedback"]
                }
            }
        });

        const text = cleanJSON(response.text || "");
        return JSON.parse(text);
    } catch (error) {
        console.error("Auto-grading error:", error);
        throw new Error("Failed to auto-grade submission.");
    }
};
