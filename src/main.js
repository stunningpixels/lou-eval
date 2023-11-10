import dotenv from 'dotenv';
import prompts from 'prompts';
import path from 'path';
import { fileURLToPath } from 'url';

import OpenAIProvider from './providers/openai.js';
import AnthropicProvider from './providers/anthropic.js';

import evaluate from './evaluate.js';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const providers = [OpenAIProvider, AnthropicProvider];

const main = async () => {
  // List the models in each provider
  const models = providers
    .map((provider) =>
      provider.getModels().map((model) => ({ provider, model: model.name }))
    )
    .flat();

  // Prompt user to select a model to eval
  const { value: modelChoiceName } = await prompts({
    type: 'select',
    name: 'value',
    message: 'Pick a model',
    choices: models.map((model) => ({
      title: model.model,
      value: model.model,
    })),
  });

  // If the user presses 'esc'
  if (!modelChoiceName) return;

  // Get the selected model and provider
  const modelChoice = models.find((model) => model.model === modelChoiceName);

  const provider = new modelChoice.provider(modelChoice.model);
  await evaluate(provider);
};

main();
