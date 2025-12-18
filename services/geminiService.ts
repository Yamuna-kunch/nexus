
import { GoogleGenAI } from "@google/genai";

/**
 * Generates a response from a model based on a system instruction and user message.
 * Follows @google/genai guidelines for initialization and text extraction.
 */
export const testAgentPrompt = async (
  modelName: string,
  systemInstruction: string,
  userMessage: string,
  temperature: number
): Promise<string> => {
  // Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        temperature: temperature,
      },
    });

    // Use the .text property directly (not as a method).
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Error generating response: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
};

/**
 * Continues a chat session with the provided history.
 * Fixed the TypeScript error: history parts are now typed as an array instead of a tuple.
 */
export const chatWithAgent = async (
  modelName: string,
  systemInstruction: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  newMessage: string,
  temperature: number
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Create a chat session with the provided history
    const chat = ai.chats.create({
      model: modelName,
      history: history,
      config: {
        systemInstruction: systemInstruction,
        temperature: temperature,
      },
    });

    const result = await chat.sendMessage({ message: newMessage });
    // Use the .text property directly.
    return result.text || "...";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I am having trouble processing that request.";
  }
};

/**
 * Suggests an optimized prompt using gemini-3-flash-preview for text tasks.
 */
export const suggestOptimizedPrompt = async (currentPrompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      // Use gemini-3-flash-preview for basic text tasks like prompt optimization.
      model: 'gemini-3-flash-preview',
      contents: `Optimize the following system prompt for an AI voice agent to be more conversational, concise, and persuasive. 
      
      Current Prompt: "${currentPrompt}"
      
      Output only the optimized prompt text.`,
    });
    return response.text || currentPrompt;
  } catch (error) {
    console.error("Gemini Optimization Error:", error);
    return "Could not optimize prompt at this time.";
  }
};
