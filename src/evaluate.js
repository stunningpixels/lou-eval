import {
  uniqueNamesGenerator,
  names,
  animals,
  countries,
} from "unique-names-generator";

import levenshtein from "js-levenshtein";

import { saveResults } from "./save.js";

const QUESTION =
  'List the 10 people with a pet fruit instead of a pet animal. Respond with a JSON list all the instances you find in the format: [{"name":"NAME OF PERSON","fruit":"NAME OF FRUIT"},...]. DO NOT INCLUDE ANY ANIMALS.';

const fruits = [
  "apple",
  "banana",
  "cherry",
  "date",
  "elderberry",
  "fig",
  "grape",
  "honeydew",
  "jackfruit",
  "kiwi",
  "lemon",
  "mango",
  "nectarine",
  "orange",
  "papaya",
  "quince",
  "raspberry",
  "strawberry",
  "tangerine",
];

const promptTemplate = (randomName, randomAnimal, randomCountry) => {
  return `My name is ${randomName} and I am from ${randomCountry} and I have a pet ${randomAnimal}. `;
};

const getPrompt = (maxChars) => {
  // Count the number of characters in the prompt
  let charCount = 0;

  // Matches for the LLM to find
  const matches = [];
  // All data, including the confusing properties
  const haystack = [];
  // Names we've already used
  const usedNames = [];

  // Get the initial 10 matches for the LLM to find
  for (let i = 0; i < 10; i++) {
    // Generate confusing properties
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [fruits] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    // Make sure we avoid duplication
    if (usedNames.includes(randomName)) {
      continue;
    }
    usedNames.push(randomName);

    // Sentence to find the information within
    const sentence = promptTemplate(randomName, randomAnimal, randomCountry);

    // Add sentence to the haystack, matches (so we can verify later), and track charCount
    haystack.push(sentence);
    matches.push({ name: randomName, fruit: randomAnimal });
    charCount += sentence.length;
  }

  // Fill the remainder of the maxChars with noise
  while (charCount < maxChars - 10) {
    // Generate confusing properties
    const randomName = uniqueNamesGenerator({ dictionaries: [names] });
    const randomAnimal = uniqueNamesGenerator({ dictionaries: [animals] });
    const randomCountry = uniqueNamesGenerator({ dictionaries: [countries] });

    // Make sure we avoid any matching names
    if (usedNames.includes(randomName)) {
      continue;
    }

    // Sentence to find the information within
    const sentence = promptTemplate(randomName, randomAnimal, randomCountry);

    // Add sentence to the haystack and track charCount
    haystack.push(sentence);
    charCount += sentence.length;
  }

  // Jumble everything up and join up the prompt
  const prompt = haystack
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .join("");
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

const run = async (provider, maxChars) => {
  const { prompt, matches } = getPrompt(maxChars);

  const systemPrompt = QUESTION;
  let result = await provider.generateCompletion(prompt, systemPrompt);

  let parsed;

  try {
    // Parse the JSON, ignoring the text before the JSON begins
    const json = result.substring(
      result.indexOf("["),
      result.lastIndexOf("]") + 1
    );
    const jsonNoNewlines = json.replace(/\n/g, "");
    console.log(jsonNoNewlines);
    parsed = JSON.parse(jsonNoNewlines);
    console.log(parsed);
  } catch (e) {
    console.log(result);
    console.error("Error stack:", e.stack);
    throw new Error("Failed to parse response", e);
  }

  const results = compareMatchesJSONObj(matches, parsed);

  return results;
};

const RUNS = process.env.RUNS || 10;
const MAX_FAILED_RUNS = process.env.MAX_FAILED_RUNS || 3;

export default async (provider) => {
  let currentChars = 1000;
  let results = [];
  let failedRuns = 0;

  while (currentChars <= provider.maxChars && failedRuns < MAX_FAILED_RUNS) {
    const results_at_char = [];
    let successfulRuns = 0;

    let first_try = true;
    while (successfulRuns < RUNS && failedRuns < MAX_FAILED_RUNS) {
      try {
        const result = await run(provider, currentChars);
        console.log(successfulRuns + 1, "of", RUNS);
        results_at_char.push(result);
        console.log("Results", results_at_char);
        successfulRuns++;
        failedRuns = 0;
      } catch (e) {
        failedRuns++;
        if (first_try) {
          // Probably too many tokens, reduce by 25%
          console.log(
            "Reducing max chars by 25%",
            currentChars,
            currentChars * 0.75
          );
          currentChars = currentChars * 0.75;
        }
        console.log(e);
      }
      first_try = false;
    }

    const matchesCount = results_at_char.reduce(
      (acc, curr) => acc + curr.matchesCount,
      0
    );
    const falsePositivesCount = results_at_char.reduce(
      (acc, curr) => acc + curr.falsePositivesCount,
      0
    );

    const averageMatches = matchesCount / RUNS;
    const averageFalsePositives = falsePositivesCount / RUNS;

    await saveResults(
      provider,
      currentChars,
      averageMatches,
      averageFalsePositives,
      successfulRuns
    );

    console.log("Average matches", averageMatches);
    console.log("Average false positives", averageFalsePositives);
    results.push({
      currentChars,
      matchesCount: averageMatches,
      falsePositivesCount: averageFalsePositives,
      successfulRuns,
    });
    console.log(results);
    currentChars = currentChars * 2;
  }
};
