import Replicate from 'replicate';

import mistralTokenizer from 'mistral-tokenizer-js';

import BaseProvider from './base.js';

export default class MistralProvider extends BaseProvider {
  static getModels() {
    return [{ name: 'mixtral-8x7b-instruct-v0.1', maxTokens: 32000 }];
  }

  async countTokens(text) {
    const tokens = mistralTokenizer.encode(text).length;
    return tokens;
  }

  async generateCompletion(text) {
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const prompt = `<s>[INST] ${text} [/INST]</s>\n`;

    const output = await replicate.run(
      'mistralai/mixtral-8x7b-instruct-v0.1:2b56576fcfbe32fa0526897d8385dd3fb3d36ba6fd0dbe033c72886b81ade93e',
      {
        input: {
          prompt,
          temperature: 0,
          max_new_tokens: 300,
        },
      }
    );

    const response = output.join('');

    return response;
  }
}
