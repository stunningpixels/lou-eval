import {
  uniqueNamesGenerator,
  names,
  animals,
  countries,
} from 'unique-names-generator';

import levenshtein from 'js-levenshtein';

const QUESTION =
  'Who has a pet fruit instead of a pet animal? Respond with a JSON list all the instances you find in the format: [{"name":"NAME OF PERSON","fruit":"NAME OF FRUIT"},...]. DO NOT INCLUDE ANY ANIMALS.';

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

const run = async (provider, max_tokens) => {
  const { prompt, matches } = await getPrompt(provider, max_tokens);
  let result = await provider.generateCompletion(`${prompt}\n\n${QUESTION}`);

  // Parse the JSON, ignoring the text before the JSON begins
  const json = result.substring(
    result.indexOf('['),
    result.lastIndexOf(']') + 1
  );
  const parsed = JSON.parse(json);

  console.log(parsed);

  const results = compareMatches(matches, parsed);

  return results;
};

export default async (provider) => {
  const RUNS = process.env.RUNS || 10;
  const max_tokens = 1000;

  const results = [];
  let successfulRuns = 0;
  let failedRuns = 0;

  while (successfulRuns < RUNS && failedRuns < RUNS) {
    try {
      const result = await run(provider, max_tokens);
      console.log(successfulRuns + 1, RUNS);
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

  console.log('Average matches', matchesCount / RUNS);
  console.log('Average false positives', falsePositivesCount / RUNS);
};
