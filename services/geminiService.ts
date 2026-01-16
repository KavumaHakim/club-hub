
// Robustly retrieve API Key, prioritizing HF_TOKEN
const getApiKey = (): string => {
  let key = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_HF_TOKEN || import.meta.env.HF_TOKEN || import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
    }
  } catch (e) {}

  if (key) return key;

  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      key = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN || process.env.VITE_API_KEY || process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
    }
  } catch (e) {}

  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
    console.warn("AI API Key is missing. AI features will be disabled. Ensure VITE_HF_TOKEN is set.");
}

// New model and endpoint as requested
const MODEL_NAME = "openai/gpt-oss-20b";
const API_ENDPOINT = `https://router.huggingface.co/v1/chat/completions`;

// Helper to clean regular text responses
const cleanResponse = (text: string): string => {
    if (!text) return "";
    return text.trim();
};

// Helper to parse JSON from AI response, handling potential markdown wrapping
const parseJSONResponse = (text: string) => {
    const cleaned = text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON from AI:", cleaned);
        // Fallback for when AI wraps JSON in other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
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
const callAI = async (messages: any[]): Promise<string> => {
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
                temperature: 0.7,
                max_tokens: 4096,
                stream: false,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Hugging Face API Error Response:", errorText);
            if (response.status === 503) {
                throw new Error("Model is loading (503). Please try again in a few seconds.");
            }
            throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
        console.error("AI Call Failed:", error);
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
      const text = await callAI([
          { role: "system", content: "You are a helpful assistant that outputs strict JSON." }, 
          { role: "user", content: prompt }
      ]);
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
            { role: "system", content: "You are the helpful AI Assistant for the ICT Club. You help members with coding questions, project ideas, and club logistics. Be concise and clear, encouraging, and tech-savvy." },
            ...chatMessages,
            { role: "user", content: message }
        ];

        const rawText = await callAI(messages);
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
        Your goal is to TEACH, not to do the work for the students. Keep your explanations concise and easy to understand.
        
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

        const rawText = await callAI(messages);
        return cleanResponse(rawText);
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    const prompt = `
      You are a friendly but rigorous Code Mentor. Review this code submission for: "${challengeTitle}".
      
      Student Code:
      \`\`\`
      ${code}
      \`\`\`
      
      Provide a structured review in Markdown:
      **🧐 Analysis**: Does it solve the problem? Logic check.
      **🚀 Style & Efficiency**: Comments on naming, complexity, and language-specific best practices.
      **💡 Better Approach**: A short, optimized code snippet example.
      **🌟 Verdict**: A closing motivating sentence.
    `;

    try {
        const text = await callAI([{ role: "user", content: prompt }]);
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
        const text = await callAI([
            { role: "system", content: "You output strict JSON only. Do not include markdown formatting or other text." }, 
            { role: "user", content: prompt }
        ]);
        
        const parsed = parseJSONResponse(text);
        return parsed.milestones;
    } catch (error) {
        console.error("Roadmap Error:", error);
        throw error;
    }
};

export const generateDocumentSummary = async (file: File): Promise<string> => {
    let fileContent = "";
    try {
        fileContent = await fileToText(file);
    } catch (e) {
        throw new Error("Could not read file. Please ensure it is a text-based file (code, txt, md).");
    }

    if (fileContent.length > 20000) fileContent = fileContent.substring(0, 20000) + "...[Truncated]";

    const prompt = `Summarize the following document content in a concise, engaging paragraph (2-4 sentences) for a resource library:\n\n${fileContent}`;

    try {
        const text = await callAI([{ role: "user", content: prompt }]);
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
        const text = await callAI([
            { role: "system", content: "You output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);

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
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);
        
        return parseJSONResponse(text);
    } catch (error) {
        console.error("Grading Error:", error);
        return { correct: true, feedback: "Good effort! (Auto-passed due to connection error)" };
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    // Detect language
    const isPython = /import\s+|def\s+|print\s*\(/.test(code);
    const language = isPython ? 'Python' : 'JavaScript';

    const prompt = `
        Grade this ${language} code submission for task: "${taskDescription}".
        Code:
        \`\`\`${language.toLowerCase()}
        ${code}
        \`\`\`
        
        Criteria: Correctness, Style, Efficiency.
        Return JSON:
        { "grade": number (1-5), "feedback": "Short constructive paragraph tailored to ${language} best practices." }
    `;

    try {
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);

        return parseJSONResponse(text);
    } catch (error) {
        console.error("Auto-grading Error:", error);
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string, language: string = 'python'): Promise<string> => {
    const prompt = `
        You are a ${language === 'python' ? 'Python' : 'JavaScript'} code mentor. Analyze this code and identify ONE specific improvement (logic, readability, or ${language}-specific best practices).
        Student Code:
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Provide:
        1. Short explanation of the improvement (referencing ${language} concepts).
        2. A code snippet inside \`\`\`${language} ... \`\`\` showing the improvement.
        Keep it encouraging and helpful.
    `;

    try {
        const text = await callAI([{ role: "user", content: prompt }]);
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
        Generate an interesting Python tip.
        You can use built-in features OR popular third-party modules (like pandas, numpy, requests, itertools, collections, etc.).
        If using a module, ensure imports are included.
        
        Return VALID JSON:
        { 
            "title": "Short Title", 
            "explanation": "2-3 sentences why it's useful.", 
            "codeSnippet": "Executable python example" 
        }
    `;

    try {
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);

        return parseJSONResponse(text) as PythonTip;
    } catch (error: any) {
        console.error("Tip Error:", error);
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
