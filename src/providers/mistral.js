import MistralClient from '@mistralai/mistralai';

import mistralTokenizer from 'mistral-tokenizer-js';

import BaseProvider from './base.js';

export default class MistralProvider extends BaseProvider {
  static getModels() {
    return [
      { name: 'mistral-medium', maxTokens: 32000 },
      { name: 'mistral-small', maxTokens: 32000 },
      { name: 'mistral-tiny', maxTokens: 32000 },
    ];
  }

  async countTokens(text) {
    const tokens = mistralTokenizer.encode(text).length;
    return tokens;
  }

  async generateCompletion(corpus, prompt) {
    const client = new MistralClient(process.env.MISTRAL_KEY);

    const chatResponse = await client.chat({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: corpus },
      ],
      temperature: 0,
      maxTokens: 300,
    });

    return chatResponse.choices[0].message.content;
  }
}
