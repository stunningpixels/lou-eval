import { countTokens } from '@anthropic-ai/tokenizer';

import BaseProvider from './base.js';

export default class AnthropicProvider extends BaseProvider {
  static getModels() {
    return [{ name: 'claude-2', maxTokens: 100000 }];
  }

  async countTokens(text) {
    return countTokens(text);
  }

  generateCompletion(str) {}
}
