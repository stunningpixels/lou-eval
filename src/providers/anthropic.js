import Anthropic from "@anthropic-ai/sdk";

import BaseProvider from "./base.js";

export default class AnthropicProvider extends BaseProvider {
  static getModels() {
    return [
      { name: "claude-3-7-sonnet-20250219", maxChars: 10000000 },
      { name: "claude-3-5-sonnet-20241022", maxChars: 10000000 },
    ];
  }

  async generateCompletion(corpus, prompt) {
    const anthropicConfig = new Anthropic({
      apiKey: process.env.ANTHROPIC_KEY,
    });

    const message = await anthropicConfig.messages.create({
      model: this.modelName,
      max_tokens: 300,
      temperature: 0,
      system: prompt,
      messages: [{ role: "user", content: corpus }],
      thinking: {
        type: "disabled",
      },
    });

    return message.content[0].text;
  }
}
