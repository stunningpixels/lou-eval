import OpenAI from "openai";

import BaseProvider from "./base.js";

export default class OpenAIProvider extends BaseProvider {
  static getModels() {
    return [
      { name: "gpt-4.1-2025-04-14", maxChars: 10000000 },
      { name: "gpt-4o-2024-11-20", maxChars: 10000000 },
    ];
  }

  async generateCompletion(haystack, systemPrompt) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
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
