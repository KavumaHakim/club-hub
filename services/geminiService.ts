import { GoogleGenAI } from "@google/genai";

// Per SDK guidelines, the API key is expected to be available in process.env.API_KEY.
// The client is initialized here, and it's assumed the key is present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateActivityIdeas = async (query: string): Promise<{ ideas: { idea: string, description: string }[], sources: any[] }> => {
  try {
    const prompt = `Generate 5 fun and engaging activity ideas for an ICT club based on the topic: "${query}". Format the response as a valid JSON object with a single key "ideas", which is an array of objects. Each object in the array should have two string properties: "idea" (the title of the activity) and "description" (a short, one-sentence description of the activity).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // The response text should be a valid JSON string based on the schema.
    const result = JSON.parse(response.text);

    return {
        ideas: result.ideas || [],
        // Ensure we only return web sources, as per grounding chunk structure
        sources: sources.filter(s => s.web), 
    };
  } catch (error) {
    console.error("Error generating activity ideas with search:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to generate ideas from AI. The response was not in the expected format.");
    }
    throw new Error("Failed to generate ideas from AI. Please try again.");
  }
};


export const executeCode = async (code: string): Promise<string> => {
  try {
    const prompt = `
Please act as a Python code interpreter. Execute the following Python code and return ONLY the raw, standard output. 
Do not provide any explanations, annotations, or introductory text like "Here is the output:".
If the code runs successfully but produces no output, return an empty response.
If the code produces an error, return ONLY the Python error traceback.

Code to execute:
\`\`\`python
${code}
\`\`\`
`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error executing code via Gemini:", error);
    throw new Error("Failed to execute code using the AI. Please try again.");
  }
};