import Anthropic from '@anthropic-ai/sdk';

import { encode } from 'gpt-tokenizer';
import { Configuration, OpenAIApi } from 'openai';
import { countTokens as countAnthropicTokens } from '@anthropic-ai/tokenizer';
import dotenv from 'dotenv';

import {
  uniqueNamesGenerator,
  names,
  animals,
  countries,
} from 'unique-names-generator';

import levenshtein from 'js-levenshtein';

dotenv.config();

const { OPENAI_KEY, ANTHROPIC_KEY } = process.env;

const fruits = [
  'apple',
  'banana',
  'cherry',
  'date',
  'elderberry',
  'fig',
  'grape',
  'honeydew',
  'jackfruit',
  'kiwi',
  'lemon',
  'mango',
  'nectarine',
  'orange',
  'papaya',
  'quince',
  'raspberry',
  'strawberry',
  'tangerine',
];

const openAiConfig = new Configuration({
  apiKey: OPENAI_KEY,
});
const openai = new OpenAIApi(openAiConfig);

const anthropicConfig = new Anthropic({
  apiKey: ANTHROPIC_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});

const countOAITokens = (text) => {
  const tokens = encode(text);
  return tokens.length;
};

async function anthropicSingleCompletion(prompt) {
  // Time how long it takes to get completion
  const start = Date.now();
  const completion = await anthropicConfig.completions.create({
    model: 'claude-2',
    max_tokens_to_sample: 2000,
    temperature: 0,
    prompt: `${Anthropic.HUMAN_PROMPT} ${prompt} ${Anthropic.AI_PROMPT}`,
  });
  const end = Date.now();
  // time in seconds
  const time = (end - start) / 1000;
  return {
    time: time,
    completion: completion.completion,
  };
}

async function OAISingleCompletion(model, prompt) {
  try {
    // Time how long it takes to get completion
    const start = Date.now();
    const completion = await openai.createChatCompletion({
      model,
      temperature: 0,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const end = Date.now();
    // time in seconds
    const time = (end - start) / 1000;
    return {
      time: time,
      completion: completion.data.choices[0].message.content,
    };
  } catch (e) {
    console.log(e);
    return false;
  }
}

const compareMatches = (matches, found) => {
  let matchesCount = 0;
  let falsePositivesCount = 0;

  for (const match of matches) {
    // Fuzzy match name and fruit
    const foundMatch = found.find(
      (item) =>
        levenshtein(item.name.toLowerCase(), match.name.toLowerCase()) < 3 &&
        levenshtein(item.fruit.toLowerCase(), match.fruit.toLowerCase()) < 3
    );
    if (foundMatch) {
      matchesCount++;
    }
  }

  falsePositivesCount = found.length - matchesCount;

  return {
    matchesCount,
    falsePositivesCount,
  };
};

const getPrompt = async (MODEL) => {
  const countTokens =
    MODEL.provider === 'OAI' ? countOAITokens : countAnthropicTokens;
  let data = [];
  let tokenCount = 0;

  let characterCount = 0;
  const matches = [];
  const usedNames = [];
  while (characterCount < CHARACTERS_TO_INCLUDE) {
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [fruits] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    if (usedNames.includes(randomName)) {
      continue;
    }

    usedNames.push(randomName);

    const sentence = `My name is ${randomName} and I am from ${randomCountry} and I have a pet ${randomAnimal}.`;

    let tokens = countTokens(sentence);

    tokenCount += tokens;
    data.push(sentence);
    matches.push({ name: randomName, fruit: randomAnimal });
    characterCount++;
  }

  console.log('characters');

  while (tokenCount < MAX_TOKENS - 10) {
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [animals] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    if (usedNames.includes(randomName)) {
      continue;
    }

    const sentence = `My name is ${randomName} and I am from ${randomCountry} and I have a pet ${randomAnimal}.`;
    const tokens = countTokens(sentence);
    tokenCount += tokens;
    data.push(sentence);
  }

  console.log('non-characters', tokenCount);

  const prompt = data
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .join(' ');
  return { prompt, matches };
};

const run = async (MODEL) => {
  const { prompt, matches } = await getPrompt(MODEL);
  let result = null;
  if (MODEL.provider === 'OAI') {
    result = await OAISingleCompletion(
      MODEL.modelName,
      `${prompt}\n\nWho has a pet fruit instead of a pet animal? Respond with a JSON list all the instances you find in the format: [{"name":"NAME OF PERSON","fruit":"NAME OF FRUIT"},...]. DO NOT INCLUDE ANY ANIMALS.`
    );
  } else if (MODEL.provider === 'ANTHROPIC') {
    result = await anthropicSingleCompletion(
      `${prompt}\n\nWho has a pet fruit instead of a pet animal? Respond with a JSON list all the instances you find in the format: [{"name":"NAME OF PERSON","fruit":"NAME OF FRUIT"},...]. DO NOT INCLUDE ANY ANIMALS.`
    );
  }

  // Parse the JSON, ignoring the text before the JSON begins
  const json = result.completion.substring(
    result.completion.indexOf('['),
    result.completion.lastIndexOf(']') + 1
  );
  const parsed = JSON.parse(json);

  console.log(parsed);

  const results = compareMatches(matches, parsed);

  return results;
};

const SAMPLES = 10;
const CHARACTERS_TO_INCLUDE = 10;
const MAX_TOKENS = 4000;

const MODELS = {
  gpt40314: {
    provider: 'OAI',
    modelName: 'gpt-4-32k-0314',
  },
  gpt40613: {
    provider: 'OAI',
    modelName: 'gpt-4-32k-0613',
  },
  gpt4turbo: {
    provider: 'OAI',
    modelName: 'gpt-4-1106-preview',
  },
  claude2: {
    provider: 'ANTHROPIC',
    modelName: 'claude-2',
  },
};

const main = async () => {
  const results = [];
  let successfulRuns = 0;
  let failedRuns = 0;
  while (successfulRuns < SAMPLES && failedRuns < 20) {
    try {
      const result = await run(MODELS.gpt40314);
      console.log(successfulRuns + 1, SAMPLES);
      results.push(result);
      console.log('Results', results);
      successfulRuns++;
    } catch (e) {
      failedRuns++;
      console.log(e);
    }
  }

  console.log('Results', results);

  const matchesCount = results.reduce(
    (acc, curr) => acc + curr.matchesCount,
    0
  );
  const falsePositivesCount = results.reduce(
    (acc, curr) => acc + curr.falsePositivesCount,
    0
  );

  console.log('Average matches', matchesCount / SAMPLES);
  console.log('Average false positives', falsePositivesCount / SAMPLES);
};

main();
