
/**
 * AI Service using Hugging Face Router (Gemma 4)
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

const getGeminiKey = (): string => {
    try {
        // @ts-ignore
        return import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    } catch {
        try {
            // @ts-ignore
            return process.env.GEMINI_API_KEY || '';
        } catch {
            return '';
        }
    }
};

const getGeminiModel = (): string => {
    try {
        // @ts-ignore
        return import.meta.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    } catch {
        try {
            // @ts-ignore
            return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        } catch {
            return 'gemini-1.5-flash';
        }
    }
};

const getCachedGeminiModel = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
        const model = localStorage.getItem('gemini_model_resolved');
        const ts = Number(localStorage.getItem('gemini_model_resolved_at') || '0');
        if (model && Date.now() - ts < 1000 * 60 * 60 * 24) return model; // 24h cache
        return null;
    } catch {
        return null;
    }
};

const setCachedGeminiModel = (model: string) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('gemini_model_resolved', model);
        localStorage.setItem('gemini_model_resolved_at', String(Date.now()));
    } catch { }
};

const fetchGeminiModels = async (): Promise<string[]> => {
    if (!geminiKey) return [];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    if (!response.ok) return [];
    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    return models
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => String(m.name || '').replace(/^models\//, ''))
        .filter(Boolean);
};

const apiKey = getApiKey();
const geminiKey = getGeminiKey();
// Gemma 4 26B-A4B (instruction-tuned) via Novita. This is a Mixture-of-Experts:
// 26B total but only ~4B active params per token, so it's fast/low-load — the medium
// pick over the largest gemma-4-31B-it. The router needs a provider suffix (":novita");
// the dense 12B/E4B variants aren't deployed by any provider, so they aren't routable.
const MODEL_NAME = "google/gemma-4-26B-A4B-it:novita";
const API_ENDPOINT = `https://router.huggingface.co/v1/chat/completions`;
const GEMINI_MODEL = getGeminiModel();

if (!apiKey) {
    console.warn("Hugging Face API Token is missing. AI features will be disabled.");
}
if (!geminiKey) {
    console.warn("Gemini API key is missing. Roadmap/quiz generation will fall back to Hugging Face.");
}

// Helper to clean and parse responses
const cleanResponse = (text: string): string => {
    if (!text) return "";
    return text.trim();
};

const parseJSONResponse = (text: string) => {
    const cleaned = text
        .replace(/^\uFEFF/, '')
        .replace(/^```(json)?\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Try to find the JSON object/array within the text if direct parsing fails
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                // If it's still failing, it might be truncated. Try to close it manually if it's an object
                const segment = jsonMatch[0];
                if (segment.startsWith('{') && !segment.endsWith('}')) {
                    try { return JSON.parse(segment + '}'); } catch (e3) { }
                    // Further aggressive recovery could go here, but usually risky
                }
            }
        }
        console.error("Failed to parse JSON from AI:", cleaned);
        throw new Error("AI returned invalid JSON format.");
    }
};

const toSafeText = (value: unknown, fallback: string = ''): string => {
    if (typeof value === 'string') return value;
    if (value == null) return fallback;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return fallback;
    }
};

const normalizeChallengeEvaluation = (value: any): {
    passed: boolean;
    feedback: string;
    weaknesses: string;
    improvements: string;
} => {
    const passed = typeof value?.passed === 'boolean'
        ? value.passed
        : String(value?.passed ?? '').toLowerCase() === 'true';

    return {
        passed,
        feedback: toSafeText(
            value?.feedback,
            passed
                ? 'Your submission passed evaluation.'
                : 'Your submission was evaluated, but detailed feedback was unavailable.'
        ),
        weaknesses: toSafeText(value?.weaknesses, ''),
        improvements: toSafeText(value?.improvements, ''),
    };
};

const callAI = async (messages: any[], jsonMode: boolean = false, options?: { maxTokens?: number; temperature?: number }): Promise<string> => {
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
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 4096,
            stream: false,
        })
    });

    if (!response.ok) {
        throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    // Gemma returns the answer in `content`. The reasoning_content/reasoning
    // fallbacks are kept defensively in case the router serves a reasoning model.
    const text = message?.content || message?.reasoning_content || message?.reasoning || "";
    if (!text.trim()) {
        throw new Error("AI returned an empty response");
    }
    return text;
};

const pickPreferredModel = (models: string[], preferred: string | null): string | null => {
    if (!Array.isArray(models) || models.length === 0) return preferred || null;
    const normalized = models.map(m => m.trim()).filter(Boolean);
    if (preferred) {
        const direct = normalized.find(m => m.toLowerCase() === preferred.toLowerCase());
        if (direct) return direct;
    }

    const preferenceOrder = [
        'gemini-2.0-pro',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash'
    ];
    for (const pref of preferenceOrder) {
        const match = normalized.find(m => m.toLowerCase() === pref);
        if (match) return match;
    }
    return normalized[0] || preferred || null;
};

const resolveGeminiModel = async (forceRefresh: boolean = false): Promise<string> => {
    const preferred = GEMINI_MODEL || null;
    if (!forceRefresh) {
        const cached = getCachedGeminiModel();
        if (cached) return cached;
    }
    const models = await fetchGeminiModels();
    const chosen = pickPreferredModel(models, preferred);
    if (chosen) setCachedGeminiModel(chosen);
    return chosen || preferred || 'gemini-1.5-flash';
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let lastGeminiCallAt = 0;
let geminiQueue: Promise<void> = Promise.resolve();
const geminiInFlight = new Map<string, Promise<string>>();

const applyGeminiThrottle = async () => {
    const minGapMs = 4500;
    const now = Date.now();
    const waitMs = lastGeminiCallAt + minGapMs - now;
    if (waitMs > 0) await sleep(waitMs);
    lastGeminiCallAt = Date.now();
};

const enqueueGemini = async <T>(fn: () => Promise<T>): Promise<T> => {
    let resolveQueue: () => void;
    const queued = new Promise<void>(resolve => { resolveQueue = resolve; });
    const prev = geminiQueue;
    geminiQueue = prev.then(() => queued);
    await prev;
    try {
        return await fn();
    } finally {
        // @ts-ignore
        resolveQueue();
    }
};

const callGemini = async (prompt: string): Promise<string> => {
    if (!geminiKey) throw new Error("Gemini API key missing");
    const existing = geminiInFlight.get(prompt);
    if (existing) return existing;

    const request = enqueueGemini(async () => {
        let lastError: Error | null = null;
        let model = await resolveGeminiModel(false);
        const maxRetries = 3;

        for (let attempt = 0; attempt < maxRetries; attempt += 1) {
            try {
                await applyGeminiThrottle();
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
                const response = await fetch(`${endpoint}?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 4096,
                            responseMimeType: "application/json"
                        }
                    })
                });
                if (!response.ok) {
                    if (response.status === 429) {
                        const retryAfter = Number(response.headers.get('retry-after') || '0');
                        const jitter = Math.floor(Math.random() * 500);
                        // If 429, wait at least 5 seconds or what the header says
                        const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 5000 * (attempt + 1) + jitter;
                        lastError = new Error(`Gemini API Error: ${response.status}`);
                        await sleep(backoffMs);
                        continue;
                    }
                    if (response.status === 404 || response.status === 400) {
                        // Model not found or invalid; refresh model list and retry once
                        lastError = new Error(`Gemini API Error: ${response.status}`);
                        model = await resolveGeminiModel(true);
                        continue;
                    }
                    throw new Error(`Gemini API Error: ${response.status}`);
                }
                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
                throw new Error("Gemini API Error: empty response");
            } catch (err: any) {
                lastError = err;
            }
        }
        throw lastError || new Error("Gemini API Error");
    });

    geminiInFlight.set(prompt, request);
    try {
        return await request;
    } finally {
        geminiInFlight.delete(prompt);
    }
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
        const systemPrompt = `You are a friendly, patient, and wise AI Tutor for St. Joseph's SSS Naggalama Secondary school ICT Club. 
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
        console.warn("Hugging Face tutor error, falling back to Gemini:", error);
        try {
            const fallbackPrompt = chatMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');
            const text = await callGemini(fallbackPrompt);
            return cleanResponse(text);
        } catch (geminiError) {
            console.error("Tutor Error:", geminiError);
            return "I'm having trouble thinking right now. Ask me again in a moment!";
        }
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, language: string = 'Python', suggestedTopics?: string) => {
    const prompt = `Create a comprehensive learning roadmap for "${topic}" in ${language}.
    Target Level: ${skillLevel}.
    Additional Context: ${suggestedTopics || 'None'}.
    
    Return ONLY a JSON object with this structure:
    { "milestones": [ { "title": "...", "description": "...", "duration": "...", "resources": [ { "type": "VIDEO"|"ARTICLE", "title": "...", "url": "..." } ] } ] }`;

    try {
        const text = await callGemini(prompt);
        const parsed = parseJSONResponse(text);
        return parsed.milestones;
    } catch (error) {
        console.warn("Gemini roadmap error, falling back to Hugging Face:", error);
        const text = await callAI([{ role: "user", content: prompt }], true);
        const parsed = parseJSONResponse(text);
        return parsed.milestones;
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
        console.warn("Hugging Face document summary error, falling back to Gemini:", error);
        const text = await callGemini(prompt);
        return cleanResponse(text);
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
        console.warn("Hugging Face grading error, falling back to Gemini:", error);
        const text = await callGemini(prompt);
        return parseJSONResponse(text);
    }
};

export const getAIPlaygroundHint = async (code: string, language: string = 'python'): Promise<string> => {
    const prompt = `Suggest ONE improvement for this ${language} code:\n${code}`;
    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        console.warn("Hugging Face playground hint error, falling back to Gemini:", error);
        const text = await callGemini(prompt);
        return cleanResponse(text);
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string): Promise<string> => {
    const prompt = `Analyze this solution for "${challengeTitle}":\n${code}`;
    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        console.warn("Hugging Face challenge analysis error, falling back to Gemini:", error);
        const text = await callGemini(prompt);
        return cleanResponse(text);
    }
};

export const autoEvaluateChallenge = async (
    challengeTitle: string,
    challengeDescription: string,
    code: string
): Promise<{ passed: boolean; feedback: string; weaknesses: string; improvements: string }> => {
    const prompt = `You are a strict but encouraging programming instructor evaluating a coding challenge to decide if a student deserves a "Badge" for their achievement.

Challenge Title: "${challengeTitle}"
Challenge Description: "${challengeDescription}"

Student's Submitted Code:
${code}

Evaluation Guidelines:
1. Compare the student's code DIRECTLY against the Scenario, Task, and Requirements listed in the description.
2. If the code correctly solves the task and meets all mandatory requirements, set "passed" to true.
3. If "passed" is true, the student will AUTOMATICALLY EARN A BADGE.
4. If "passed" is false, explain exactly which requirements were missed or where the logic failed.
5. Provide constructive feedback that helps the student learn, regardless of the result.

Return ONLY a JSON object with this exact structure:
{
    "passed": boolean,
    "feedback": "Start with a clear verdict (e.g., 'Your code is excellent' or 'Your code does not yet meet all requirements'). Then, provide a concise explanation of why it passed or failed. If it failed, explicitly point out which specific demands from the challenge were missing or incorrect. Finally, end with a clear statement: 'You have earned the badge!' or 'The badge remains locked for now.'",
    "weaknesses": "List the specific technical errors, missing requirements, or logical bugs. Use bullet points if multiple items are missing.",
    "improvements": "Actionable advice on how to fix the errors or how to write even better code in the future."
}`;

    try {
        const text = await callGemini(prompt);
        return normalizeChallengeEvaluation(parseJSONResponse(text));
    } catch (error) {
        console.warn("Gemini evaluation error, falling back to Hugging Face:", error);
        const text = await callAI([{ role: "user", content: prompt }], true);
        return normalizeChallengeEvaluation(parseJSONResponse(text));
    }
};

export const generateAIChallenge = async (
    skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    concepts: string,
    language: string = 'python'
): Promise<{ title: string; description: string }> => {
    const prompt = `Act as a creative coding tutor. Create a unique, scenario-based coding challenge for a student at the ${skillLevel} level.

    The challenge must focus on these concepts: ${concepts}
    Programming language: ${language}

    FORMAT (Markdown inside "description"):
    - "Scenario" heading with a vivid story context.
    - "Task" heading with a clear, specific objective.
    - "Requirements" heading with 3-5 concrete constraints.
    - "Example" heading with sample input/output if applicable.

    Difficulty Context (must noticeably differ by level):
    - BEGINNER: Simple logic, basic loops, variables, standard data types.
    - INTERMEDIATE: Functions, classes, complex data structures, basic algorithms.
    - ADVANCED: Optimization, complex algorithms, system design, or advanced language features.

    Important: Do NOT reuse the same structure/constraints across levels; tailor complexity and constraints to the selected level.

    Return ONLY a JSON object:
    {
        "title": "A short, catchy title",
        "description": "The full challenge description in Markdown, including Scenario, Task, Requirements, and Example."
    }`;

    try {
        const text = await callGemini(prompt); // Use Gemini for more creative writing
        return parseJSONResponse(text);
    } catch (error) {
        console.warn("Gemini challenge error, falling back to Hugging Face:", error);
        const text = await callAI([{ role: "user", content: prompt }], true);
        return parseJSONResponse(text);
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
- 10 questions total.
- Every question must be about the milestone content and the specified language.
- Include AT LEAST THREE coding questions that ask the learner to write a small code snippet.
- For questions that refer to a code example, include the code snippet IN the "question" field using Markdown code blocks (e.g. \`\`\`${language.toLowerCase()} ... \`\`\`).
- For questions of type "SHORT_ANSWER" the correctAnswer must be valid ${language} code or a very specific technical term.
- For multiple choice: include 4 options.

Question format:
{ "type": "MULTIPLE_CHOICE"|"TRUE_FALSE"|"SHORT_ANSWER", "question": "...", "options": ["..."], "correctAnswer": "..." }`;

    try {
        const text = await callGemini(prompt);
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
        console.warn("Gemini quiz error, falling back to Hugging Face:", error);
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
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, expectedAnswer: string): Promise<{ correct: boolean, feedback: string }> => {
    const prompt = `Grade this answer. Q: ${question}, Expected: ${expectedAnswer}, User: ${userAnswer}. 
    Return JSON: { "correct": boolean, "feedback": "string" }`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        return parseJSONResponse(text);
    } catch (error) {
        console.warn("Hugging Face evaluation error, falling back to Gemini:", error);
        try {
            const text = await callGemini(prompt);
            return parseJSONResponse(text);
        } catch (geminiError) {
            return { correct: false, feedback: "Error validating answer." };
        }
    }
};

export const generateCodingTip = async (lang: 'python' | 'javascript', skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER'): Promise<CodingTip> => {
    const todayIndex = Math.floor(Date.now() / 86400000);
    const beginnerConcepts = [
        'variables and types',
        'print/output basics',
        'if/else conditionals',
        'loops (for/while)',
        'lists/arrays basics',
        'string methods',
        'indexing and slicing',
        'simple functions',
        'input and type conversion',
        'basic dictionaries/objects'
    ];
    const intermediateConcepts = [
        'list/array comprehensions',
        'functions with defaults',
        'error handling',
        'file reading basics',
        'working with sets',
        'classes and objects',
        'higher-order functions',
        'sorting with keys',
        'string formatting options',
        'basic algorithm patterns'
    ];
    const advancedConcepts = [
        'generators and iterators',
        'async patterns',
        'performance tips',
        'data structures tradeoffs',
        'decorators',
        'type hints/typing',
        'complexity analysis',
        'testing patterns',
        'module design',
        'advanced language features'
    ];

    const pool = skillLevel === 'BEGINNER'
        ? beginnerConcepts
        : skillLevel === 'INTERMEDIATE'
            ? intermediateConcepts
            : advancedConcepts;
    const topic = pool[todayIndex % pool.length];

    const prompt = `Generate a modern ${lang} tip (JSON) for high school students.
    Target skill level: ${skillLevel}.
    Focus topic: ${topic}.
    Keep it short, practical, and appropriate for the level.
    For BEGINNER tips, avoid overusing f-strings; rotate across core concepts.
    Include title, explanation, and codeSnippet.`;

    try {
        const text = await callAI([{ role: "user", content: prompt }], true);
        const result = parseJSONResponse(text);
        return { ...result, language: lang };
    } catch (error) {
        console.warn("Hugging Face coding tip error, falling back to Gemini:", error);
        const text = await callGemini(prompt);
        const result = parseJSONResponse(text);
        return { ...result, language: lang };
    }
};

export const generatePythonTip = (skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER') => generateCodingTip('python', skillLevel);

// --- Code Duel Arena: AI problem generation + AI judging ---

export type DuelSkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface DuelGeneratedTestCase {
    id: string;
    input: string;
    expectedOutput: string;
    explanation?: string;
    hidden: boolean;
}

export interface DuelGeneratedProblem {
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    statementMarkdown: string;
    constraints: string[];
    tags: string[];
    starterCode: string;
    estimatedMinutes: number;
    targetLevel: DuelSkillLevel;
    testCases: DuelGeneratedTestCase[];
}

export interface DuelJudgeCaseResult {
    id: string;
    passed: boolean;
    actualOutput?: string;
    note?: string;
}

export interface DuelJudgeResult {
    verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error';
    passed: number;
    total: number;
    caseResults: DuelJudgeCaseResult[];
    summary: string;
    hiddenFailureReason?: string;
    efficiencyScore: number;
    estimatedRuntimeMs: number;
}

const LEVEL_ORDER: DuelSkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

// Duels target the average of the two players' levels so neither side is overwhelmed.
export const averageSkillLevel = (levels: Array<DuelSkillLevel | undefined>): DuelSkillLevel => {
    const known = levels.filter((l): l is DuelSkillLevel => !!l && LEVEL_ORDER.includes(l));
    if (known.length === 0) return 'BEGINNER';
    const avg = known.reduce((sum, l) => sum + LEVEL_ORDER.indexOf(l), 0) / known.length;
    return LEVEL_ORDER[Math.round(avg)];
};

const DUEL_LEVEL_GUIDANCE: Record<DuelSkillLevel, string> = {
    BEGINNER: `Use ONE core idea: lists, strings, dictionaries, sets, counting, or simple loops.
Acceptable stdlib: collections.Counter, math, string methods. No recursion, no graphs.
Solvable by a motivated beginner in 10-15 minutes with basic Python syntax.`,
    INTERMEDIATE: `Combine TWO ideas: sorting with keys, two pointers, stacks/queues, hash maps, prefix sums, or simple recursion.
Acceptable stdlib: collections (Counter, defaultdict, deque), heapq, itertools, math, bisect.
Solvable in 15-20 minutes; requires choosing the right data structure, not advanced theory.`,
    ADVANCED: `Use a real algorithmic insight: heaps, binary search on answer, BFS/DFS on grids or graphs, dynamic programming (1D/simple 2D), or greedy with proof.
Acceptable stdlib: heapq, collections, itertools, functools, bisect, math.
Solvable in 20-25 minutes by a strong student; hidden tests punish brute force.`,
};

const normalizeDuelTestCases = (raw: any, publicCount: number): DuelGeneratedTestCase[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((tc: any) => tc && typeof tc.input !== 'undefined' && typeof tc.expectedOutput !== 'undefined')
        .map((tc: any, index: number) => ({
            id: `tc-${index + 1}`,
            input: toSafeText(tc.input),
            expectedOutput: toSafeText(tc.expectedOutput),
            explanation: tc.explanation ? toSafeText(tc.explanation) : undefined,
            hidden: index >= publicCount,
        }));
};

export const generateDuelProblem = async (
    levels: Array<DuelSkillLevel | undefined>,
    publicTestCount: number = 5,
    minTotalTests: number = 20
): Promise<DuelGeneratedProblem> => {
    const targetLevel = averageSkillLevel(levels);

    const prompt = `You are the problem setter for a 1v1 competitive coding duel between two high-school club members.

Create ONE original Python 3 problem at the ${targetLevel} level.

LEVEL RULES (follow strictly):
${DUEL_LEVEL_GUIDANCE[targetLevel]}

THEME RULES:
- Data Structures & Algorithms in Python, wrapped in a short, fun scenario (2-3 sentences max).
- The solution must exercise clear Python syntax and idiomatic use of common standard library modules.
- Input/output contract: the player writes a function solve(input_text: str) -> str.
  input_text is the raw test input (may span multiple lines); the return value is compared to the expected output EXACTLY (trailing whitespace ignored).

TEST CASE RULES:
- Provide EXACTLY ${Math.max(minTotalTests, 22)} test cases in one array, simplest first.
- The FIRST ${publicTestCount} are public samples: small, easy to trace by hand, each with a one-line explanation.
- The remaining cases are hidden: cover edge cases (minimum input, duplicates, ties, larger inputs, tricky orderings). No "explanation" field for hidden cases.
- Keep every input and expectedOutput a SHORT string (single line where possible) so the JSON stays compact.
- Every expectedOutput must be exactly what a correct solve() returns for that input. Double-check each one.

OUTPUT RULES:
- Keep statementMarkdown under 180 words.
- Do NOT think out loud. Output the JSON object directly and nothing else.
- Never mention AI, language models, or how the problem was created in any text field. Write as "the arena".

Return ONLY a JSON object:
{
  "title": "Short catchy title",
  "difficulty": "Easy" | "Medium" | "Hard",
  "statementMarkdown": "Scenario, task, and input/output format in Markdown. Be precise about the format of input_text and the returned string.",
  "constraints": ["3-5 short constraint strings"],
  "tags": ["2-4 DSA topic tags, e.g. 'Hash Map', 'Stacks'"],
  "starterCode": "def solve(input_text: str) -> str:\\n    # parse input_text\\n    ...\\n",
  "estimatedMinutes": number,
  "testCases": [{ "input": "...", "expectedOutput": "...", "explanation": "only for the first ${publicTestCount}" }]
}`;

    // Try HF twice, then Gemini, then the built-in problem bank.
    // Accepting a duel must never hard-fail on a flaky AI response.
    const attempts: Array<() => Promise<string>> = [
        () => callAI([{ role: 'user', content: prompt }], true, { maxTokens: 12288, temperature: 0.7 }),
        () => callAI([{ role: 'user', content: prompt }], true, { maxTokens: 12288, temperature: 0.4 }),
        () => callGemini(prompt),
    ];

    let parsed: any = null;
    let testCases: DuelGeneratedTestCase[] = [];
    for (const attempt of attempts) {
        try {
            parsed = parseJSONResponse(await attempt());
            testCases = normalizeDuelTestCases(parsed?.testCases, publicTestCount);
            if (testCases.length >= Math.min(minTotalTests, 12)) break;
            console.warn(`Duel problem attempt returned only ${testCases.length} test cases; retrying.`);
            parsed = null;
        } catch (error) {
            console.warn('Duel problem generation attempt failed:', error);
            parsed = null;
        }
    }

    if (!parsed) {
        console.warn('All AI duel problem attempts failed. Using built-in problem bank.');
        const { buildBankProblem } = await import('./duelProblemBank');
        return buildBankProblem(targetLevel, publicTestCount);
    }

    return {
        title: toSafeText(parsed?.title, 'Untitled Duel Problem'),
        difficulty: ['Easy', 'Medium', 'Hard'].includes(parsed?.difficulty) ? parsed.difficulty : 'Medium',
        statementMarkdown: toSafeText(parsed?.statementMarkdown, ''),
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints.map((c: any) => toSafeText(c)) : [],
        tags: Array.isArray(parsed?.tags) ? parsed.tags.map((t: any) => toSafeText(t)) : ['DSA', 'Python'],
        starterCode: toSafeText(parsed?.starterCode, 'def solve(input_text: str) -> str:\n    # parse input_text and return the answer as a string\n    return ""\n'),
        estimatedMinutes: Number(parsed?.estimatedMinutes) > 0 ? Math.min(30, Number(parsed.estimatedMinutes)) : 18,
        targetLevel,
        testCases,
    };
};

export const judgeDuelSubmission = async (
    problemTitle: string,
    statementMarkdown: string,
    code: string,
    testCases: DuelGeneratedTestCase[]
): Promise<DuelJudgeResult> => {
    const caseBlock = testCases
        .map((tc) => `- id: ${tc.id}${tc.hidden ? ' (hidden)' : ''}\n  input: ${JSON.stringify(tc.input)}\n  expected: ${JSON.stringify(tc.expectedOutput)}`)
        .join('\n');

    const prompt = `You are a strict, deterministic Python 3 judge for a competitive coding duel.

Problem: "${problemTitle}"
${statementMarkdown}

The player's submission (their solve(input_text) is called once per test case):
\`\`\`python
${code}
\`\`\`

Test cases:
${caseBlock}

JUDGING RULES:
1. Mentally execute the code EXACTLY as Python 3 would. Do not be charitable: off-by-one errors, wrong parsing, type errors, and unhandled edge cases must fail.
2. A case passes only if str(solve(input)) matches expected output after stripping trailing whitespace.
3. If the code would raise an exception on a case, that case fails (this counts toward "Runtime Error" if it happens on any case before producing output).
4. Verdict: "Accepted" only if ALL cases pass. "Runtime Error" if any case raises. "Time Limit Exceeded" if the approach is grossly inefficient for the stated constraints (e.g. exponential where linear is expected). Otherwise "Wrong Answer".
5. efficiencyScore (0-100): algorithmic quality and Python idiom. estimatedRuntimeMs: rough realistic estimate for the full suite (50-2000).
6. hiddenFailureReason: ONE sentence describing the category of hidden case that fails, WITHOUT revealing exact inputs or expected outputs. Omit if accepted.
7. Do NOT think out loud. Output the JSON object directly and nothing else. Keep notes terse.
8. Never mention AI, language models, or how judging is implemented in summary, notes, or hiddenFailureReason. Speak as "the judge".

Return ONLY JSON:
{
  "verdict": "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error",
  "caseResults": [{ "id": "tc-1", "passed": boolean, "actualOutput": "what the code actually returns (only for NON-hidden cases)", "note": "short note for failed non-hidden cases only" }],
  "summary": "2-3 sentence verdict explanation a student can learn from, without revealing hidden inputs",
  "hiddenFailureReason": "one sentence or omit",
  "efficiencyScore": number,
  "estimatedRuntimeMs": number
}`;

    const judgeAttempts: Array<() => Promise<string>> = [
        () => callAI([{ role: 'user', content: prompt }], true, { maxTokens: 10240, temperature: 0.1 }),
        () => callAI([{ role: 'user', content: prompt }], true, { maxTokens: 10240, temperature: 0 }),
        () => callGemini(prompt),
    ];

    let parsed: any = null;
    let lastError: unknown = null;
    for (const attempt of judgeAttempts) {
        try {
            parsed = parseJSONResponse(await attempt());
            break;
        } catch (error) {
            lastError = error;
            console.warn('Duel judging attempt failed:', error);
        }
    }
    if (!parsed) {
        throw lastError instanceof Error ? lastError : new Error('Judge unavailable');
    }

    const byId = new Map<string, any>(
        Array.isArray(parsed?.caseResults)
            ? parsed.caseResults.filter((r: any) => r && r.id).map((r: any) => [String(r.id), r])
            : []
    );

    const caseResults: DuelJudgeCaseResult[] = testCases.map((tc) => {
        const r = byId.get(tc.id);
        const passed = typeof r?.passed === 'boolean' ? r.passed : false;
        return {
            id: tc.id,
            passed,
            actualOutput: !tc.hidden && r?.actualOutput != null ? toSafeText(r.actualOutput) : undefined,
            note: !tc.hidden && r?.note ? toSafeText(r.note) : undefined,
        };
    });

    const passed = caseResults.filter((r) => r.passed).length;
    const total = testCases.length;
    const verdictRaw = String(parsed?.verdict || '');
    const verdict: DuelJudgeResult['verdict'] =
        passed === total
            ? 'Accepted'
            : (['Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'].includes(verdictRaw)
                ? (verdictRaw as DuelJudgeResult['verdict'])
                : 'Wrong Answer');

    return {
        verdict,
        passed,
        total,
        caseResults,
        summary: toSafeText(parsed?.summary, verdict === 'Accepted' ? 'All test cases passed.' : 'Some test cases failed.'),
        hiddenFailureReason: verdict === 'Accepted' ? undefined : (parsed?.hiddenFailureReason ? toSafeText(parsed.hiddenFailureReason) : undefined),
        efficiencyScore: Math.max(0, Math.min(100, Number(parsed?.efficiencyScore) || (verdict === 'Accepted' ? 85 : 50))),
        estimatedRuntimeMs: Math.max(20, Math.min(5000, Number(parsed?.estimatedRuntimeMs) || 250)),
    };
};
