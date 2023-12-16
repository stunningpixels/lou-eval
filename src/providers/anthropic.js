import Anthropic from '@anthropic-ai/sdk';
import { countTokens } from '@anthropic-ai/tokenizer';

import BaseProvider from './base.js';

export default class AnthropicProvider extends BaseProvider {
  static getModels() {
    return [
      { name: 'claude-2.0', maxTokens: 100000 },
      { name: 'claude-2.1', maxTokens: 200000 },
      { name: 'claude-instant-1.2', maxTokens: 100000 },
    ];
  }

  async countTokens(text) {
    return countTokens(text);
  }

  async generateCompletion(text) {
    const anthropicConfig = new Anthropic({
      apiKey: process.env.ANTHROPIC_KEY,
    });

    const completion = await anthropicConfig.completions.create({
      model: this.modelName,
      max_tokens_to_sample: 300,
      temperature: 0,
      prompt: `${Anthropic.HUMAN_PROMPT} ${text} ${Anthropic.AI_PROMPT}`,
    });

    return completion.completion;
  }
}
