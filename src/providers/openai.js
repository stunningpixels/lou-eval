import { Configuration, OpenAIApi } from 'openai';

import { encode } from 'gpt-tokenizer';

import BaseProvider from './base.js';

export default class OpenAIProvider extends BaseProvider {
  static getModels() {
    return [
      { name: 'gpt-4-32k-0314', maxTokens: 32000 },
      { name: 'gpt-4-32k-0613', maxTokens: 32000 },
      { name: 'gpt-4-1106-preview', maxTokens: 128000 },
    ];
  }

  async countTokens(text) {
    const tokens = encode(text);
    return tokens.length;
  }

  async generateCompletion(text) {
    const config = new Configuration({
      apiKey: process.env.OPENAI_KEY,
    });

    const openai = new OpenAIApi(config);

    const completion = await openai.createChatCompletion({
      model: this.modelName,
      temperature: 0,
      max_tokens: 300,
      messages: [{ role: 'user', content: text }],
    });

    return completion.data.choices[0].message.content;
  }
}
