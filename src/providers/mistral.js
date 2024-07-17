import MistralClient from '@mistralai/mistralai';

import mistralTokenizer from 'mistral-tokenizer-js';

import BaseProvider from './base.js';

export default class MistralProvider extends BaseProvider {
  codePrompt = true;
  static getModels() {
    return [
      { name: 'codestral-mamba-latest', maxTokens: 32000 },
      { name: 'codestral-latest', maxTokens: 256000 },
    ];
  }

  async countTokens(text) {
    const tokens = mistralTokenizer.encode(text).length;
    return tokens;
  }

  async generateCompletion(userPrompt, systemPrompt) {
    const client = new MistralClient(process.env.MISTRAL_KEY);

    const chatResponse = await client.chat({
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      maxTokens: 500,
    });

    return chatResponse.choices[0].message.content;
  }
}
