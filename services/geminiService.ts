
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
        return import.meta.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL || '';
    } catch {
        try {
            // @ts-ignore
            return process.env.GEMINI_MODEL || '';
        } catch {
            return '';
        }
    }
};

const getCachedGeminiModel = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
        const model = localStorage.getItem('gemini_model_resolved_v2');
        const ts = Number(localStorage.getItem('gemini_model_resolved_v2_at') || '0');
        if (model && Date.now() - ts < 1000 * 60 * 60 * 24) return model; // 24h cache
        return null;
    } catch {
        return null;
    }
};

const setCachedGeminiModel = (model: string) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('gemini_model_resolved_v2', model);
        localStorage.setItem('gemini_model_resolved_v2_at', String(Date.now()));
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

    // Without a configured model, take the newest stable Flash the key can use. Names
    // are read from the live model list, so retired versions (1.5, 2.0) drop out on
    // their own and new ones are picked up without a code change.
    const version = (name: string) => {
        const m = name.toLowerCase().match(/^gemini-(\d+(?:\.\d+)?)-flash$/);
        return m ? parseFloat(m[1]) : null;
    };
    const flashes = normalized
        .filter(m => version(m) !== null)
        .sort((a, b) => (version(b) as number) - (version(a) as number));
    if (flashes.length) return flashes[0];
    const anyFlash = normalized.find(m => /flash/i.test(m) && !/(lite|image|tts|live|audio|thinking|exp|preview)/i.test(m));
    return anyFlash || normalized[0] || preferred || null;
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
    return chosen || preferred || 'gemini-2.5-flash';
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

const callGemini = async (prompt: string, options?: { json?: boolean }): Promise<string> => {
    if (!geminiKey) throw new Error("Gemini API key missing");
    // Most callers parse JSON; chat replies (the tutor) want plain text.
    const json = options?.json ?? true;
    const inFlightKey = `${json ? 'json' : 'text'}:${prompt}`;
    const existing = geminiInFlight.get(inFlightKey);
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
                            ...(json ? { responseMimeType: "application/json" } : {})
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

    geminiInFlight.set(inFlightKey, request);
    try {
        return await request;
    } finally {
        geminiInFlight.delete(inFlightKey);
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
    // The model's own knowledge stops months before today. Tell it the date, and that
    // the app guide and club data below are current, so it doesn't describe the hub
    // (or "what's new") from memory.
    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala',
    });
    const systemPrompt = `You are Kevin, a friendly, patient, and wise AI Tutor for the St. Joseph's SSS Naggalama ICT Club, inside the club's ICT Club Hub app.
        Your goal is to TEACH, not to do the work for the students.

        TODAY: ${today} (Uganda time).
        Your training data is older than today. For anything about the club or the Club Hub app (screens, features, challenges, events, people, what's new),
        use only the CURRENT INFORMATION below, which is live. Don't describe features or events from memory, and if something isn't in it, say you don't know
        rather than guessing. For general programming knowledge, your training is fine.

        DETECT LANGUAGE: Automatically identify if the student is asking about Python or JavaScript.

        CURRENT INFORMATION:
        ${clubContext}

        CRITICAL RULES:
        1. DO NOT write complete code solutions, including for club challenges. Provide hints or pseudo-code.
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

    try {
        const text = await callAI(chatMessages);
        return cleanResponse(text);
    } catch (error) {
        console.warn("Hugging Face tutor error, falling back to Gemini:", error);
        try {
            const fallbackPrompt = chatMessages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nassistant:';
            const text = await callGemini(fallbackPrompt, { json: false });
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

// Models often over-escape line breaks in JSON, so a multi-line test input arrives as one
// line with a literal backslash-n in it. With no real line break present, that's never what
// was meant.
const realLineBreaks = (input: string): string =>
    !input.includes('\n') && input.includes('\\n') ? input.replace(/(?:\\r)?\\n/g, '\n') : input;

// Everyday settings for generated challenges. One is picked at random per challenge,
// so the model doesn't settle on the same story every time.
const CHALLENGE_SETTINGS = [
    'the school canteen at break time', 'a boda boda stage', 'a fruit and vegetable stall at the market',
    'the inter-house football league', 'a netball tournament', 'a taxi (matatu) route into town',
    'mobile money sends and withdrawals', "a phone's battery and data bundle", 'end-of-term exam marks',
    'a coffee or matooke harvest on a family farm', "a duka (small shop)'s stock", 'the class timetable',
    "a music playlist for the school's music, dance and drama night", 'a class WhatsApp group', 'the school library',
    'a chapati stand', 'the dormitory laundry line', 'a borehole water queue', 'sports day races',
    'a school bus trip', 'a savings group (SACCO)', "a bakery's morning orders", 'a supermarket checkout',
];

export const generateAIChallenge = async (
    skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    concepts: string,
    language: string = 'python'
): Promise<{ title: string; description: string; starterCode?: string; referenceSolution?: string; inputs?: string[] }> => {
    // Print-style: the student writes an ordinary program that reads the input line by
    // line and prints the answer, like the seeded practice challenges.
    const isJs = language.toLowerCase().includes('javascript');
    const reading = isJs
        ? 'readline() (returns the next line as a string, or null when there are no more lines) and prints with console.log'
        : 'input() (one line per call) and prints with print()';
    const starterExample = isJs
        // Shown inside a JSON example, so the line breaks are written as \n escapes.
        ? 'const n = Number(readline());\\nconst prices = readline().split(\' \').map(Number);\\n\\n// Your code here: print the answer with console.log.\\n'
        : 'n = int(input())\\nprices = [int(x) for x in input().split()]\\n\\n# Your code here: print the answer.\\n';
    const setting = CHALLENGE_SETTINGS[Math.floor(Math.random() * CHALLENGE_SETTINGS.length)];
    const prompt = `Act as a creative coding tutor. Create a unique, scenario-based coding challenge for a student at the ${skillLevel} level.

    The challenge must focus on these concepts: ${concepts}
    Programming language: ${language}

    SCENARIO AND NAMES:
    - Set it in this real, everyday setting that secondary-school students in Uganda recognise: ${setting}.
      If the concepts truly don't fit it, pick another ordinary real-life setting instead.
    - NO made-up worlds: no fantasy kingdoms, dragons, wizards, magic, space empires, alien planets, robots on Mars or invented creatures.
    - Make the names playful: a punny or catchy title that fits the setting, and characters with ordinary Ugandan or English names.
      Invent your own; titles in the style of "Boda Boda Fare Frenzy" are the tone wanted, but don't reuse that one.
    - Keep the story short (2-4 sentences) and make the numbers in it believable (prices in UGX, real distances, real times).

    The challenge is auto-graded by test cases. The student writes an ORDINARY PROGRAM, with no solve() function and
    no function the judge calls: it reads the test input with ${reading}. Each test runs the whole program once with that
    test's input, and everything it prints is compared with the expected output line by line (trailing spaces ignored).
    So the program must print ONLY the answer: no prompts like "Enter a number:", no labels, no extra blank lines.

    FORMAT (Markdown inside "description"):
    - "Scenario" heading with a vivid story context.
    - "Task" heading with a clear, specific objective, saying exactly what the program reads and what it must print.
    - "Input Format" heading: what each line of the input holds (e.g. "Line 1: n, the number of riders. Line 2: n fares separated by spaces").
    - "Output Format" heading: exactly what to print, line by line.
    - "Requirements" heading with 3-5 concrete constraints.
    - "Example" heading with one sample input and its output, each in its own code block.

    Difficulty Context (must noticeably differ by level):
    - BEGINNER: Simple logic, basic loops, variables, standard data types.
    - INTERMEDIATE: Functions, classes, complex data structures, basic algorithms.
    - ADVANCED: Optimization, complex algorithms, system design, or advanced language features.

    Important: Do NOT reuse the same structure/constraints across levels; tailor complexity and constraints to the selected level.

    TEST RULES:
    - "starterCode": the lines that read the input into well-named variables, then a comment saying where to write the
      code and print the answer. No solution. For example: "${starterExample}"
    - "referenceSolution": a COMPLETE, correct ${language} PROGRAM that reads the input the same way and prints the answer.
      It is executed on every input to compute the expected outputs, so it must print nothing else and must not define or
      need a solve() function the judge calls.
    - "inputs": 12-15 DIFFERENT raw input strings (never fewer than 11). The first 2 are simple samples that are easy to check by hand.
      The rest are hidden tests that together cover: the smallest possible input, a single item, duplicates, ties, values at the
      edges of the allowed range, an unusual ordering (already sorted, reversed), and 2-3 larger inputs. Keep each input under
      300 characters. A multi-line input is ONE JSON string with real line breaks: write \\n inside the JSON string,
      never the double-escaped \\\\n. Do NOT include expected outputs.

    Return ONLY a JSON object:
    {
        "title": "A short, catchy title",
        "description": "The full challenge description in Markdown.",
        "starterCode": "...",
        "referenceSolution": "...",
        "inputs": ["...", "..."]
    }`;

    let parsed: any;
    try {
        const text = await callGemini(prompt); // Use Gemini for more creative writing
        parsed = parseJSONResponse(text);
    } catch (error) {
        console.warn("Gemini challenge error, falling back to Hugging Face:", error);
        const text = await callAI([{ role: "user", content: prompt }], true);
        parsed = parseJSONResponse(text);
    }
    return {
        title: toSafeText(parsed?.title),
        description: toSafeText(parsed?.description),
        starterCode: toSafeText(parsed?.starterCode) || undefined,
        referenceSolution: toSafeText(parsed?.referenceSolution) || undefined,
        // Duplicates would just repeat a test; keep up to 16 distinct inputs.
        inputs: Array.isArray(parsed?.inputs)
            ? [...new Set<string>(parsed.inputs.map((i: any) => realLineBreaks(toSafeText(i))))].slice(0, 16)
            : undefined,
    };
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

// --- 15-question mixed duel ("quiz duel") ---

export type DuelQuestionKind = 'quiz' | 'coding';

/** A quick quiz question: multiple-choice, true/false, or short-answer. */
export interface DuelQuizCard {
    id: string;
    kind: 'quiz';
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    question: string;
    options?: string[];
    correctAnswer: string;
    /** Extra answers accepted as correct for SHORT_ANSWER (normalized match). */
    acceptedAnswers?: string[];
    /** Per-question time budget in seconds. */
    seconds: number;
}

/** A short coding question graded deterministically in Pyodide (solve(input_text)). */
export interface DuelCodingCard {
    id: string;
    kind: 'coding';
    question: string;
    starterCode: string;
    testCases: DuelGeneratedTestCase[];
    seconds: number;
}

export type DuelQuizQuestion = DuelQuizCard | DuelCodingCard;

export interface DuelQuizSet {
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
    targetLevel: DuelSkillLevel;
    questions: DuelQuizQuestion[];
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

// --- 15-question mixed duel generation ---

const QUIZ_QUESTION_SECONDS = 20;
const CODING_QUESTION_SECONDS = 60;
const QUIZ_TARGET_COUNT = 12;
const QUIZ_CODING_COUNT = 8;

const normalizeQuizCard = (q: any, index: number): DuelQuizCard | null => {
    const type = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'].includes(q?.type) ? q.type : null;
    const question = toSafeText(q?.question).trim();
    const correctAnswer = toSafeText(q?.correctAnswer).trim();
    if (!type || !question || !correctAnswer) return null;

    const options = Array.isArray(q?.options)
        ? q.options.map((o: any) => toSafeText(o).trim()).filter(Boolean).slice(0, 4)
        : undefined;

    if (type === 'MULTIPLE_CHOICE' && (!options || options.length < 2 || !options.includes(correctAnswer))) return null;
    if (type === 'TRUE_FALSE') {
        const norm = correctAnswer.toLowerCase();
        if (norm !== 'true' && norm !== 'false') return null;
    }

    const acceptedAnswers = Array.isArray(q?.acceptedAnswers)
        ? q.acceptedAnswers.map((a: any) => toSafeText(a).trim()).filter(Boolean)
        : undefined;

    return {
        id: `quiz-${index + 1}`,
        kind: 'quiz',
        type,
        question,
        options: type === 'MULTIPLE_CHOICE' ? options : undefined,
        correctAnswer: type === 'TRUE_FALSE' ? (correctAnswer.toLowerCase() === 'true' ? 'True' : 'False') : correctAnswer,
        acceptedAnswers: acceptedAnswers && acceptedAnswers.length ? acceptedAnswers : undefined,
        seconds: QUIZ_QUESTION_SECONDS,
    };
};

// Derive each coding question's expected outputs by running the AI's reference
// solution in Pyodide, so a correct player solution can always pass.
const buildCodingCard = async (
    q: any,
    index: number,
    runRef: (code: string, inputs: string[]) => Promise<(string | null)[]>
): Promise<DuelCodingCard | null> => {
    const question = toSafeText(q?.question).trim();
    const reference = toSafeText(q?.referenceSolution).trim();
    const starterCode = toSafeText(q?.starterCode, 'def solve(input_text: str) -> str:\n    return ""\n');
    const inputs = Array.isArray(q?.inputs) ? q.inputs.map((i: any) => toSafeText(i)).slice(0, 6) : [];
    if (!question || !reference || inputs.length < 2) return null;

    let outputs: (string | null)[];
    try {
        outputs = await runRef(reference, inputs);
    } catch {
        return null;
    }

    const testCases: DuelGeneratedTestCase[] = [];
    inputs.forEach((input: string, i: number) => {
        if (outputs[i] != null) {
            testCases.push({
                id: `code${index + 1}-${testCases.length + 1}`,
                input,
                expectedOutput: outputs[i] as string,
                hidden: testCases.length >= 1, // first derived case is the visible sample
            });
        }
    });
    if (testCases.length < 2) return null;

    return { id: `code-${index + 1}`, kind: 'coding', question, starterCode, testCases, seconds: CODING_QUESTION_SECONDS };
};

// Coding-dominant set: mostly coding questions, with a quick quiz question woven in
// roughly every 3rd slot to vary the pace.
const interleaveQuestions = (quiz: DuelQuizQuestion[], coding: DuelQuizQuestion[]): DuelQuizQuestion[] => {
    const out: DuelQuizQuestion[] = [];
    let qi = 0;
    let ci = 0;
    const total = quiz.length + coding.length;
    for (let i = 0; i < total; i += 1) {
        if ((i + 1) % 3 === 0 && qi < quiz.length) out.push(quiz[qi++]);
        else if (ci < coding.length) out.push(coding[ci++]);
        else if (qi < quiz.length) out.push(quiz[qi++]);
    }
    return out;
};

export const generateDuelQuizSet = async (
    levels: Array<DuelSkillLevel | undefined>,
    total: number = QUIZ_TARGET_COUNT
): Promise<DuelQuizSet> => {
    const targetLevel = averageSkillLevel(levels);
    const codingCount = QUIZ_CODING_COUNT;
    const quizCount = total - codingCount;

    const prompt = `You are the question setter for a fast 1v1 quiz duel between two high-school coding club members.

Create a mixed question set at the ${targetLevel} level about Python programming and basic data structures & algorithms.

LEVEL RULES (follow strictly):
${DUEL_LEVEL_GUIDANCE[targetLevel]}

Produce:
- ${quizCount} quick quiz questions: a varied mix of MULTIPLE_CHOICE, TRUE_FALSE, and SHORT_ANSWER.
- ${codingCount} short coding questions, each solvable in well under a minute.

QUIZ RULES:
- Each question must be answerable in ~20 seconds.
- MULTIPLE_CHOICE: EXACTLY 4 options; correctAnswer MUST be exactly one of the options (copied verbatim).
- TRUE_FALSE: correctAnswer is exactly "True" or "False".
- SHORT_ANSWER: correctAnswer is ONE short token/term (a keyword, function name, or number). Add "acceptedAnswers" listing common equivalent spellings.

CODING RULES:
- The player writes solve(input_text: str) -> str. Keep each problem tiny.
- Provide "starterCode" (the signature plus a short hint comment) and a COMPLETE, correct "referenceSolution".
- Provide "inputs": 3-5 raw input strings (the FIRST is a simple sample). Do NOT provide expected outputs — they are computed by running your referenceSolution.

OUTPUT RULES:
- Output the JSON object directly and nothing else. No markdown fences, no commentary.
- Never mention AI, language models, or how the questions were created.

Return ONLY a JSON object:
{
  "title": "short catchy title",
  "difficulty": "Easy" | "Medium" | "Hard",
  "tags": ["2-4 topic tags"],
  "quizQuestions": [{ "type": "MULTIPLE_CHOICE"|"TRUE_FALSE"|"SHORT_ANSWER", "question": "...", "options": ["..."], "correctAnswer": "...", "acceptedAnswers": ["..."] }],
  "codingQuestions": [{ "question": "...", "starterCode": "...", "referenceSolution": "...", "inputs": ["...", "..."] }]
}`;

    const attempts: Array<() => Promise<string>> = [
        () => callAI([{ role: 'user', content: prompt }], true, { maxTokens: 8192, temperature: 0.7 }),
        () => callAI([{ role: 'user', content: prompt }], true, { maxTokens: 8192, temperature: 0.4 }),
        () => callGemini(prompt),
    ];

    const { runReference } = await import('./duelRunner');

    for (const attempt of attempts) {
        let parsed: any = null;
        try {
            parsed = parseJSONResponse(await attempt());
        } catch (error) {
            console.warn('Duel quiz generation attempt failed:', error);
            continue;
        }

        const quizCards = (Array.isArray(parsed?.quizQuestions) ? parsed.quizQuestions : [])
            .map((q: any, i: number) => normalizeQuizCard(q, i))
            .filter((q: DuelQuizCard | null): q is DuelQuizCard => !!q)
            .slice(0, quizCount);

        const codingRaw = Array.isArray(parsed?.codingQuestions) ? parsed.codingQuestions : [];
        const codingCards: DuelCodingCard[] = [];
        for (let i = 0; i < codingRaw.length && codingCards.length < codingCount; i += 1) {
            const card = await buildCodingCard(codingRaw[i], i, runReference);
            if (card) codingCards.push(card);
        }

        // Require a healthy set; otherwise try the next provider, then the bank.
        if (quizCards.length + codingCards.length >= 12) {
            const questions = interleaveQuestions(quizCards, codingCards).slice(0, total);
            return {
                title: toSafeText(parsed?.title, 'Code Duel: Rapid Round'),
                difficulty: ['Easy', 'Medium', 'Hard'].includes(parsed?.difficulty) ? parsed.difficulty : 'Medium',
                tags: Array.isArray(parsed?.tags) ? parsed.tags.map((t: any) => toSafeText(t)).slice(0, 4) : ['Python', 'Quiz'],
                targetLevel,
                questions,
            };
        }
        console.warn(`Duel quiz attempt yielded only ${quizCards.length + codingCards.length} usable questions; retrying.`);
    }

    console.warn('All AI duel quiz attempts failed. Using built-in quiz bank.');
    const { buildBankQuizSet } = await import('./duelQuizBank');
    return buildBankQuizSet(targetLevel);
};
