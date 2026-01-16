import { GoogleGenAI, Type } from "@google/genai";

// Initialization with required named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Types ---

export interface QuizQuestion {
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    question: string;
    options?: string[];
    correctAnswer: string;
}

export interface PythonTip {
    title: string;
    explanation: string;
    codeSnippet: string;
}

// --- Helper Functions ---

const cleanResponse = (text: string): string => {
    if (!text) return "";
    return text.trim();
};

const parseJSONResponse = (text: string) => {
    const cleaned = text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON from AI:", cleaned);
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch(e2) {}
        }
        throw new Error("AI returned invalid JSON format.");
    }
};

// --- API Functions ---

export const getAiTutorResponse = async (
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    clubContext: string = ''
) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
                    Your goal is to TEACH, not to do the work for the students. 
                    
                    REAL-TIME CLUB INFORMATION:
                    ${clubContext}
                    
                    CRITICAL RULES:
                    1. DO NOT write complete code solutions. Provide hints or pseudo-code.
                    2. Explain concepts specific to the language being used.
                    3. Be encouraging and use emojis.` }]
                },
                ...history.map(h => ({
                    role: h.role === 'model' ? 'model' : 'user',
                    parts: h.parts
                })),
                { role: 'user', parts: [{ text: message }] }
            ]
        });

        return cleanResponse(response.text || "I'm having trouble thinking right now.");
    } catch (error) {
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, language: string = 'Python', suggestedTopics?: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a comprehensive learning roadmap for "${topic}" in ${language}. Target Level: ${skillLevel}. Additional Context: ${suggestedTopics || 'None'}. Return min 8 milestones.`,
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
                                                type: { type: Type.STRING, description: "VIDEO, ARTICLE, DOCS, or PRACTICE" },
                                                title: { type: Type.STRING },
                                                url: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const parsed = parseJSONResponse(response.text || "{}");
        return parsed.milestones;
    } catch (error) {
        console.error("Roadmap Error:", error);
        throw error;
    }
};

export const generateDocumentSummary = async (file: File): Promise<string> => {
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Data } },
                        { text: "Summarize this educational resource in 2-3 engaging sentences for high school students." }
                    ]
                }
            ]
        });
        return cleanResponse(response.text || "No summary available.");
    } catch (error) {
        throw new Error("Failed to summarize document.");
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Grade this student submission. Task: "${taskDescription}". Code:\n${code}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.NUMBER, description: "1-5 scale" },
                        feedback: { type: Type.STRING }
                    },
                    required: ["grade", "feedback"]
                }
            }
        });
        return parseJSONResponse(response.text || "{}");
    } catch (error) {
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string, language: string = 'python'): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a ${language} mentor. Analyze this snippet and provide ONE specific improvement: \`\`\`${language}\n${code}\n\`\`\``
        });
        return cleanResponse(response.text || "");
    } catch (error) {
        throw error;
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Review this submission for: "${challengeTitle}". Code:\n${code}. Use Markdown sections: Analysis, Style, Verdict.`
        });
        return cleanResponse(response.text || "");
    } catch (error) {
        throw error;
    }
};

export const generateMilestoneQuiz = async (title: string, description: string): Promise<QuizQuestion[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a 3-question quiz for: "${title}". Description: "${description}"`,
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
                                    type: { type: Type.STRING, description: "MULTIPLE_CHOICE, TRUE_FALSE, or SHORT_ANSWER" },
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswer: { type: Type.STRING }
                                },
                                required: ["type", "question", "correctAnswer"]
                            }
                        }
                    }
                }
            }
        });
        return parseJSONResponse(response.text || "{}").questions;
    } catch (error) {
        throw error;
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, expectedAnswer: string): Promise<{ correct: boolean, feedback: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Grade this short answer. Question: "${question}". Expected: "${expectedAnswer}". User: "${userAnswer}"`,
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
        return parseJSONResponse(response.text || "{}");
    } catch (error) {
        return { correct: false, feedback: "Unable to verify answer at this time." };
    }
};

export const generatePythonTip = async (): Promise<PythonTip> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Provide a useful Python coding tip for high school students.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        codeSnippet: { type: Type.STRING }
                    },
                    required: ["title", "explanation", "codeSnippet"]
                }
            }
        });
        return parseJSONResponse(response.text || "{}");
    } catch (error) {
        throw error;
    }
};
