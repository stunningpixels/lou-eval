import { GoogleGenAI } from "@google/genai";

import BaseProvider from "./base.js";

export default class GoogleAiStudioProvider extends BaseProvider {
  static getModels() {
    return [{ name: "gemini-2.5-pro-preview-03-25", maxChars: 2000000 }];
  }

  async generateCompletion(haystack, systemPrompt) {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: haystack,
      config: {
        temperature: 0,
        maxOutputTokens: 2000,
        systemInstruction: systemPrompt,
      },
    });

    return response.text;
  }
}
