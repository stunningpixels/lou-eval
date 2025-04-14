import OpenAI from "openai";

import BaseProvider from "./base.js";

export default class GoogleAiStudioProvider extends BaseProvider {
  static getModels() {
    return [{ name: "gemini-2.5-pro-preview-03-25", maxChars: 2000000 }];
  }

  async generateCompletion(haystack, systemPrompt) {
    const client = new OpenAI({
      apiKey: process.env.GOOGLE_AI_STUDIO_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    const completion = await client.chat.completions.create({
      model: this.modelName,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: haystack },
      ],
    });

    return completion.choices[0].message.content;
  }
}
