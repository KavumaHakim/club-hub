
/**
 * AI Service using Hugging Face Router (GPT-OSS)
 * Reverted from Gemini as per user request.
 */

const getApiKey = (): string => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_HF_TOKEN || import.meta.env.VITE_API_KEY || process.env.API_KEY || '';
  } catch (e) {
    try {
      // @ts-ignore
      return process.env.API_KEY || '';
    } catch (e2) {
      return '';
    }
  }
};

const apiKey = getApiKey();
const MODEL_NAME = "openai/gpt-oss-20b";
const API_ENDPOINT = `https://router.huggingface.co/v1/chat/completions`;

if (!apiKey) {
    console.warn("Hugging Face API Token is missing. AI features will be disabled.");
}

// Helper to clean and parse responses
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

const callAI = async (messages: any[], jsonMode: boolean = false): Promise<string> => {
    if (!apiKey) throw new Error("AI Service missing API Key");

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048,
        })
    });

    if (!response.ok) {
        throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
};

export interface QuizQuestion {
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    question: string;
    options?: string[];
    correctAnswer: string;
}

export interface CodingTip {
    title: string;
    explanation: string;
    codeSnippet: string;
    language: 'python' | 'javascript';
}

export const getAiTutorResponse = async (
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    clubContext: string = ''
) => {
    try {
        const systemPrompt = `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
        Your goal is to TEACH, not to do the work for the students. 
        
        DETECT LANGUAGE: Automatically identify if the student is asking about Python or JavaScript.
        
        REAL-TIME CLUB INFORMATION:
        ${clubContext}
        
        CRITICAL RULES:
        1. DO NOT write complete code solutions. Provide hints or pseudo-code.
        2. Explain concepts specific to the language being used.
        3. Be encouraging and use emojis.`;

        const chatMessages = [
            { role: "system", content: systemPrompt },
            ...history.map(h => ({
                role: h.role === 'model' ? 'assistant' : 'user',
                content: h.parts[0].text
            })),
            { role: "user", content: message }
        ];

        const text = await callAI(chatMessages);
        return cleanResponse(text);
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, language: string = 'Python', suggestedTopics?: string) => {
    const prompt = `Create a comprehensive learning roadmap for "${topic}" in ${language}.
    Target Level: ${skillLevel}.
    Additional Context: ${suggestedTopics || 'None'}.
    
    Return ONLY a JSON object with this structure:
    { "milestones": [ { "title": "...", "description": "...", "duration": "...", "resources": [ { "type": "VIDEO"|"ARTICLE", "title": "...", "url": "..." } ] } ] }`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        const parsed = parseJSONResponse(text);
        return parsed.milestones;
    } catch (error) {
        console.error("Roadmap Error:", error);
        throw error;
    }
};

export const generateDocumentSummary = async (file: File): Promise<string> => {
    const fileToText = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || "");
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    let fileContent = await fileToText(file);
    if (fileContent.length > 10000) fileContent = fileContent.substring(0, 10000);

    const prompt = `Summarize this document for high school students in 2 sentences:\n\n${fileContent}`;

    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        throw error;
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    const prompt = `Grade this code for task: "${taskDescription}".
    Code:
    ${code}
    
    Return JSON: { "grade": number 1-5, "feedback": "string" }`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        return parseJSONResponse(text);
    } catch (error) {
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string, language: string = 'python'): Promise<string> => {
    const prompt = `Suggest ONE improvement for this ${language} code:\n${code}`;
    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        throw error;
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    const prompt = `Analyze this solution for "${challengeTitle}":\n${code}`;
    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        throw error;
    }
};

const ensureCodingQuestion = (questions: QuizQuestion[], language: string, title: string, description: string): QuizQuestion[] => {
    const lang = language.toLowerCase();
    const hasCoding = questions.some(q => {
        if (q.type !== 'SHORT_ANSWER') return false;
        const text = `${q.question} ${q.correctAnswer}`.toLowerCase();
        return text.includes('code') || text.includes('function') || text.includes('def ') || text.includes('class ') || text.includes('console.log') || text.includes('print(');
    });
    if (hasCoding) return questions;

    const codingQ: QuizQuestion = lang.includes('javascript')
        ? {
            type: 'SHORT_ANSWER',
            question: `Write a short JavaScript snippet related to "${title}" that logs "Hello, ${title}" to the console.`,
            correctAnswer: `console.log("Hello, ${title}");`
        }
        : {
            type: 'SHORT_ANSWER',
            question: `Write a short Python snippet related to "${title}" that prints "Hello, ${title}".`,
            correctAnswer: `print("Hello, ${title}")`
        };

    return [...questions, codingQ].slice(0, Math.max(questions.length, 3));
};

export const generateMilestoneQuiz = async (
    title: string,
    description: string,
    language: string = 'Python',
    resources: { title: string; type: string; url: string }[] = []
): Promise<QuizQuestion[]> => {
    const resourceHints = resources.length
        ? `Reference materials:\n${resources.map(r => `- ${r.title} (${r.type})`).join('\n')}`
        : 'No reference materials provided.';

    const prompt = `You are generating a milestone quiz for a learning roadmap.
Milestone title: ${title}
Milestone description: ${description}
Programming language: ${language}
${resourceHints}

Requirements:
- Return ONLY JSON: { "questions": [ ... ] }
- 4 questions total.
- Every question must be about the milestone content and the specified language.
- Include AT LEAST ONE coding question that asks the learner to write a small code snippet.
- For coding questions use type "SHORT_ANSWER" and provide a correctAnswer that is valid ${language} code.
- For multiple choice: include 4 options.

Question format:
{ "type": "MULTIPLE_CHOICE"|"TRUE_FALSE"|"SHORT_ANSWER", "question": "...", "options": ["..."], "correctAnswer": "..." }`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        const parsed = parseJSONResponse(text);
        const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

        const normalized: QuizQuestion[] = questions.map((q: any) => ({
            type: q.type,
            question: String(q.question || '').trim(),
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : undefined,
            correctAnswer: String(q.correctAnswer || '').trim()
        })).filter(q => q.question && q.correctAnswer);

        return ensureCodingQuestion(normalized, language, title, description);
    } catch (error) {
        throw error;
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, expectedAnswer: string): Promise<{ correct: boolean, feedback: string }> => {
    const prompt = `Grade this answer. Q: ${question}, Expected: ${expectedAnswer}, User: ${userAnswer}. 
    Return JSON: { "correct": boolean, "feedback": "string" }`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        return parseJSONResponse(text);
    } catch (error) {
        return { correct: false, feedback: "Error validating answer." };
    }
};

export const generateCodingTip = async (lang: 'python' | 'javascript', skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER'): Promise<CodingTip> => {
    const prompt = `Generate a modern ${lang} tip (JSON) for high school students.
    Target skill level: ${skillLevel}.
    Keep it short, practical, and appropriate for the level.
    Include title, explanation, and codeSnippet.`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        const result = parseJSONResponse(text);
        return { ...result, language: lang };
    } catch (error) {
        throw error;
    }
};

export const generatePythonTip = (skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER') => generateCodingTip('python', skillLevel);
