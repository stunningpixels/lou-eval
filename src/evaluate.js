import {
  uniqueNamesGenerator,
  names,
  animals,
  countries,
} from 'unique-names-generator';

import levenshtein from 'js-levenshtein';

import { saveResults } from './save.js';

const COMPLETION_HEADROOM = 400;

const QUESTION =
  'List the 10 people with a pet fruit instead of a pet animal. Respond with a JSON list all the instances you find in the format: [{"name":"NAME OF PERSON","fruit":"NAME OF FRUIT"},...]. DO NOT INCLUDE ANY ANIMALS.';

const CODE_QUESTION =
  'Call every function that refers to a fruit.\n\nEg if the existing program contained:\n```javascript\nfunction Laslo() { return "Goat" };\nfunction Minnow() { return "Orange" }; \n```\n\nYou would write:\n```javascript\nMinnow()\n```\n';

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

const getPrompt = async (provider, max_tokens) => {
  let data = [];
  let tokenCount = 0;

  let characterCount = 0;
  const matches = [];
  const usedNames = [];

  while (characterCount < 10) {
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [fruits] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    if (usedNames.includes(randomName)) {
      continue;
    }

    usedNames.push(randomName);

    const sentence = `My name is ${randomName} and I am from ${randomCountry} and I have a pet ${randomAnimal}.`;

    let tokens = await provider.countTokens(sentence);

    tokenCount += tokens;
    data.push(sentence);
    matches.push({ name: randomName, fruit: randomAnimal });
    characterCount++;
  }

  while (tokenCount < max_tokens - 10) {
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [animals] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    if (usedNames.includes(randomName)) {
      continue;
    }

    const sentence = `My name is ${randomName} and I am from ${randomCountry} and I have a pet ${randomAnimal}.`;
    const tokens = await provider.countTokens(sentence);
    tokenCount += tokens;
    data.push(sentence);
  }

  const prompt = data
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .join(' ');
  return { prompt, matches };
};

const getCodePrompt = async (provider, max_tokens) => {
  let data = [];
  let tokenCount = 0;

  let characterCount = 0;
  const matches = [];
  const usedNames = [];

  while (characterCount < 10) {
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [fruits] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    if (usedNames.includes(randomName)) {
      continue;
    }

    usedNames.push(randomName);

    const sentence = `function ${randomName}() { return "${randomAnimal}" };`;

    let tokens = await provider.countTokens(sentence);

    tokenCount += tokens;
    data.push(sentence);
    matches.push({ name: randomName, fruit: randomAnimal });
    characterCount++;
  }

  while (tokenCount < max_tokens - 10) {
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [animals] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    if (usedNames.includes(randomName)) {
      continue;
    }

    const sentence = `function ${randomName}() { return "${randomAnimal}" };`;
    const tokens = await provider.countTokens(sentence);
    tokenCount += tokens;
    data.push(sentence);
  }

  const promptInner = data
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .join('\n');

  const prompt = `\`\`\`javascript\n${promptInner}\n\`\`\``;

  return { prompt, matches };
};

const compareMatchesJSONObj = (matches, found) => {
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

const compareMatchesCode = (matches, found) => {
  // Matches is a list of names, eg [ 'Ariadne', 'Ebba', 'Ruperta', 'Carmelina', 'Vicky', 'Celia', 'ann' ]
  let matchesCount = 0;
  let falsePositivesCount = 0;
  for (const match of matches) {
    // Fuzzy match name and fruit
    const foundMatch = found.find(
      (item) => levenshtein(item.toLowerCase(), match.name.toLowerCase()) < 3
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

const run = async (provider, max_tokens) => {
  const { prompt, matches } = provider.codePrompt
    ? await getCodePrompt(provider, max_tokens)
    : await getPrompt(provider, max_tokens);

  const systemPrompt = provider.codePrompt ? CODE_QUESTION : QUESTION;
  // let result = await provider.generateCompletion(`${prompt}\n\n${QUESTION}`);
  let result = await provider.generateCompletion(prompt, systemPrompt);

  let parsed;

  if (provider.codePrompt) {
    try {
      // Use regex to fund each function call using following brackets, so `test()` becomes `test`
      const regex = /([a-zA-Z]+)\(\)/g;
      parsed = [];
      let match;
      while ((match = regex.exec(result))) {
        parsed.push(match[1]);
      }
    } catch (e) {
      console.log(result);
      throw new Error('Failed to parse response', e);
    }
  } else {
    try {
      // Parse the JSON, ignoring the text before the JSON begins
      const json = result.substring(
        result.indexOf('['),
        result.lastIndexOf(']') + 1
      );
      const jsonNoNewlines = json.replace(/\n/g, '');
      console.log(jsonNoNewlines);
      parsed = JSON.parse(jsonNoNewlines);
      console.log(parsed);
    } catch (e) {
      console.log(result);
      throw new Error('Failed to parse response', e);
    }
  }

  const results = provider.codePrompt
    ? compareMatchesCode(matches, parsed)
    : compareMatchesJSONObj(matches, parsed);

  return results;
};

export default async (provider) => {
  const RUNS = process.env.RUNS || 10;
  let max_tokens = 1000;
  let results = [];

  while (max_tokens < provider.maxTokens) {
    const results_at_token = [];
    let successfulRuns = 0;
    let failedRuns = 0;

    while (successfulRuns < RUNS && failedRuns < RUNS) {
      try {
        const result = await run(provider, max_tokens);
        console.log(successfulRuns + 1, 'of', RUNS);
        results_at_token.push(result);
        console.log('Results', results_at_token);
        successfulRuns++;
      } catch (e) {
        failedRuns++;
        console.log(e);
      }
    }

    const matchesCount = results_at_token.reduce(
      (acc, curr) => acc + curr.matchesCount,
      0
    );
    const falsePositivesCount = results_at_token.reduce(
      (acc, curr) => acc + curr.falsePositivesCount,
      0
    );

    const averageMatches = matchesCount / RUNS;
    const averageFalsePositives = falsePositivesCount / RUNS;

    await saveResults(
      provider,
      max_tokens,
      averageMatches,
      averageFalsePositives,
      successfulRuns
    );

    console.log('Average matches', averageMatches);
    console.log('Average false positives', averageFalsePositives);
    results.push({
      max_tokens,
      matchesCount: averageMatches,
      falsePositivesCount: averageFalsePositives,
      successfulRuns,
    });
    console.log(results);
    if (max_tokens === provider.maxTokens - COMPLETION_HEADROOM) {
      break;
    } else if (max_tokens * 2 >= provider.maxTokens) {
      max_tokens = provider.maxTokens - COMPLETION_HEADROOM; // -600 so we don't exceed when including the completion tokens
    } else {
      max_tokens = max_tokens * 2;
    }
  }
};
