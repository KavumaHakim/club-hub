
// Robustly retrieve API Key
const getApiKey = (): string => {
  let key = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
    }
  } catch (e) {}

  if (key) return key;

  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      key = process.env.VITE_API_KEY || process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
    }
  } catch (e) {}

  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
    console.warn("AI API Key is missing. Features will be disabled. Ensure VITE_API_KEY is set.");
}

// DeepSeek R1 model on HF Inference API
const MODEL_NAME = "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";
// Direct model endpoint is often more reliable for CORS than the generic v1 router
const API_ENDPOINT = `https://api-inference.huggingface.co/models/${MODEL_NAME}/v1/chat/completions`;

// Helper: DeepSeek R1 often includes <think> tags. We need to strip them to get the clean response.
const cleanResponse = (text: string): string => {
    if (!text) return "";
    // Remove <think>...</think> blocks
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    // Remove markdown code blocks if present (often used for JSON outputs)
    cleaned = cleaned.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    return cleaned.trim();
};

// Helper: Parse JSON from AI response, handling potential markdown wrapping
const parseJSONResponse = (text: string) => {
    const cleaned = cleanResponse(text);
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON from AI:", cleaned);
        // Fallback: try to find JSON object if it's surrounded by other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch(e2) {}
        }
        throw new Error("AI returned invalid JSON format.");
    }
};

// --- Helper to convert File to Text ---
const fileToText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};

// --- Core API Call Helper ---
const callDeepSeek = async (messages: any[], jsonMode = false): Promise<string> => {
    if (!apiKey) throw new Error("AI Service Unavailable: API Key not configured.");

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                temperature: 0.6,
                max_tokens: 4000,
                stream: false,
                // Some HF endpoints support response_format for JSON, but it's hit or miss.
                // We rely on the system prompt for JSON structure.
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 503) {
                throw new Error("Model is loading (503). Please try again in a few seconds.");
            }
            throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
        console.error("DeepSeek Call Failed:", error);
        throw new Error("Connection error.");
    }
};

export interface ActivityIdea {
  title: string;
  description: string;
  location: string;
}

export const generateClubActivityIdea = async (): Promise<ActivityIdea> => {
  const prompt = `
    You are an enthusiastic and creative patron for a high school ICT Club. 
    Generate ONE detailed and exciting activity idea for the club.
    It should be feasible for a school setting, educational, and engaging.
    
    Return a VALID JSON object with:
    - title: A catchy name for the event.
    - description: A short, persuasive description of what will happen (2-3 sentences).
    - location: A suggested typical school location.
    
    Example output format:
    { "title": "...", "description": "...", "location": "..." }
  `;

  try {
      const text = await callDeepSeek([
          { role: "system", content: "You are a helpful assistant that outputs strict JSON." }, 
          { role: "user", content: prompt }
      ], true);
      return parseJSONResponse(text) as ActivityIdea;
  } catch (error) {
      console.error("Activity Gen Error:", error);
      throw error;
  }
};

export const getAIChatResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) => {
    if (!apiKey) return "I'm sorry, I can't chat right now because my AI configuration is missing.";

    try {
        // Convert format
        const chatMessages = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0]?.text || ""
        }));

        const messages: any[] = [
            { role: "system", content: "You are the helpful AI Assistant for the ICT Club. You help members with coding questions, project ideas, and club logistics. Be concise, encouraging, and tech-savvy." },
            ...chatMessages,
            { role: "user", content: message }
        ];

        const rawText = await callDeepSeek(messages);
        return cleanResponse(rawText);
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
    if (!apiKey) return "I'm offline right now (API Key Missing).";

    try {
        const chatMessages = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0]?.text || ""
        }));

        const systemPrompt = `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
        Your goal is to TEACH, not to do the work for the students.
        
        REAL-TIME CLUB INFORMATION:
        ${clubContext}
        
        CRITICAL RULES:
        1. DO NOT write complete code solutions for homework. Provide hints, pseudo-code, or explain concepts.
        2. Fix syntax errors in *their* code if asked, but explain the fix.
        3. Be encouraging and use emojis.
        4. If asked about club activities, use the provided context.
        `;

        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...chatMessages,
            { role: "user", content: message }
        ];

        const rawText = await callDeepSeek(messages);
        return cleanResponse(rawText);
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    const prompt = `
      You are a friendly but rigorous Code Mentor. Review this Python submission for: "${challengeTitle}".
      
      Student Code:
      \`\`\`python
      ${code}
      \`\`\`
      
      Provide a structured review in Markdown:
      **🧐 Analysis**: Does it solve the problem? Logic check.
      **🚀 Style & Efficiency**: Comments on naming, complexity, pythonic style.
      **💡 Better Approach**: A short, optimized code snippet example.
      **🌟 Verdict**: A closing motivating sentence.
    `;

    try {
        const text = await callDeepSeek([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        console.error("Analysis Error:", error);
        throw error;
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, suggestedTopics?: string) => {
    const prompt = `
        Create a comprehensive learning roadmap with at least 10 milestones for "${topic}" suitable for a "${skillLevel}" student.
        
        If provided, incorporate: "${suggestedTopics || 'Not provided'}".
        
        Return a VALID JSON object with a "milestones" array.
        Each item must have:
        - title: Step name.
        - description: Concise learning goal.
        - duration: e.g. "3 days".
        - resources: Array of 3-5 items with { type: "VIDEO"|"ARTICLE"|"DOCS"|"PRACTICE", title: "...", url: "valid-looking url" }.
        
        JSON Format Example:
        { "milestones": [ { "title": "...", "description": "...", "duration": "...", "resources": [...] } ] }
    `;

    try {
        const text = await callDeepSeek([
            { role: "system", content: "You output strict JSON only. Do not include markdown formatting or <think> tags in the final output." }, 
            { role: "user", content: prompt }
        ], true);
        
        const parsed = parseJSONResponse(text);
        return parsed.milestones;
    } catch (error) {
        console.error("Roadmap Error:", error);
        throw error;
    }
};

export const generateDocumentSummary = async (file: File): Promise<string> => {
    // DeepSeek R1 via HF Inference is text-only. We try to read the file as text.
    let fileContent = "";
    try {
        fileContent = await fileToText(file);
    } catch (e) {
        throw new Error("Could not read file. Please ensure it is a text-based file (code, txt, md).");
    }

    // Truncate if too long (simple safety check)
    if (fileContent.length > 20000) fileContent = fileContent.substring(0, 20000) + "...[Truncated]";

    const prompt = `Summarize the following document content in a concise, engaging paragraph (2-4 sentences) for a resource library:\n\n${fileContent}`;

    try {
        const text = await callDeepSeek([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        console.error("Summary Error:", error);
        throw error;
    }
};

export type QuizQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
    id: number;
    type: QuizQuestionType;
    question: string;
    options?: string[]; 
    correctAnswer: string; 
}

export const generateMilestoneQuiz = async (milestoneTitle: string, milestoneDescription: string): Promise<QuizQuestion[]> => {
    const prompt = `
        Generate a 10-question quiz on: ${milestoneTitle} - ${milestoneDescription}.
        Mix MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER.
        
        Return VALID JSON with a 'questions' array.
        Each question:
        - type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER"
        - question: text
        - options: string array (for MC/TF)
        - correctAnswer: string
        
        Example JSON:
        { "questions": [ { "type": "TRUE_FALSE", "question": "...", "options": ["True", "False"], "correctAnswer": "True" } ] }
    `;

    try {
        const text = await callDeepSeek([
            { role: "system", content: "You output strict JSON only." }, 
            { role: "user", content: prompt }
        ], true);

        const parsed = parseJSONResponse(text);
        return parsed.questions.map((q: any, index: number) => ({...q, id: index}));
    } catch (error) {
        console.error("Quiz Error:", error);
        throw error;
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, context: string): Promise<{ correct: boolean, feedback: string }> => {
    const prompt = `
        Grade this student answer.
        Question: "${question}"
        Context/Correct Answer: "${context}"
        Student Answer: "${userAnswer}"
        
        Return JSON:
        { "correct": boolean, "feedback": "1 sentence explanation" }
    `;

    try {
        const text = await callDeepSeek([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ], true);
        
        return parseJSONResponse(text);
    } catch (error) {
        console.error("Grading Error:", error);
        return { correct: true, feedback: "Good effort! (Auto-passed due to connection error)" };
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    const prompt = `
        Grade this Python code submission for task: "${taskDescription}".
        Code:
        \`\`\`python
        ${code}
        \`\`\`
        
        Criteria: Correctness, Style, Efficiency.
        Return JSON:
        { "grade": number (1-5), "feedback": "Short constructive paragraph." }
    `;

    try {
        const text = await callDeepSeek([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ], true);

        return parseJSONResponse(text);
    } catch (error) {
        console.error("Auto-grading Error:", error);
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string): Promise<string> => {
    const prompt = `
        You are a Python code mentor. Analyze this code and identify ONE specific improvement (logic or pythonic style).
        Student Code:
        \`\`\`python
        ${code}
        \`\`\`
        
        Provide:
        1. Short explanation.
        2. A code snippet inside \`\`\`python ... \`\`\` showing the improvement.
        Keep it encouraging.
    `;

    try {
        const text = await callDeepSeek([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        console.error("Hint Error:", error);
        throw error;
    }
};

export interface PythonTip {
    title: string;
    explanation: string;
    codeSnippet: string;
}

export const generatePythonTip = async (): Promise<PythonTip> => {
    const prompt = `
        Generate an intermediate Python tip using built-in features (no imports).
        Focus on: List/Dict comprehensions, slicing, unpacking, f-strings, etc.
        
        Return VALID JSON:
        { 
            "title": "Short Title", 
            "explanation": "2-3 sentences why it's useful.", 
            "codeSnippet": "Executable python example" 
        }
    `;

    try {
        const text = await callDeepSeek([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ], true);

        return parseJSONResponse(text) as PythonTip;
    } catch (error) {
        console.error("Tip Error:", error);
        // Provide a fallback but also re-throw the original error for better debugging
        if (error instanceof Error && error.message === "Connection error.") {
             return {
                title: "Pythonic Swapping",
                explanation: "Did you know you can swap variables in Python without a temporary variable? It's readable and efficient!",
                codeSnippet: "a = 5\nb = 10\n\n# The Pythonic Way\na, b = b, a\n\nprint(f'a: {a}, b: {b}')"
            };
        }
        throw error;
    }
};
