import { Configuration, OpenAIApi } from 'openai';

import { encode } from 'gpt-tokenizer';

import BaseProvider from './base.js';

export default class OpenAIProvider extends BaseProvider {
  static getModels() {
    return [
      { name: 'gpt-4-32k-0314', maxTokens: 32000 },
      { name: 'gpt-4-32k-0613', maxTokens: 32000 },
      { name: 'gpt-4-1106-preview', maxTokens: 128000 },
      { name: 'gpt-3.5-turbo-1106', maxTokens: 16000 },
      { name: 'gpt-3.5-turbo-16k-0613', maxTokens: 16000 },
    ];
  }

  async countTokens(text) {
    const tokens = encode(text);
    return tokens.length;
  }

  async generateCompletion(corpus, prompt) {
    const config = new Configuration({
      apiKey: process.env.OPENAI_KEY,
    });

    const openai = new OpenAIApi(config);

    const completion = await openai.createChatCompletion({
      model: this.modelName,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: corpus },
      ],
    });

    return completion.data.choices[0].message.content;
  }
}
