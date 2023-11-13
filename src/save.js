import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveResults = async (
  provider,
  maxTokens,
  matches,
  falsePositives,
  successfulRuns
) => {
  /*
    Check if file exist for this model in the data directory, if not create them
  */

  const resultsPath = path.join(__dirname, `../data/${provider.modelName}.csv`);
  const timestamp = new Date().toISOString();
  const results = `${maxTokens},${matches},${falsePositives},${successfulRuns},${timestamp}\n`;

  await fs
    .access(resultsPath)
    .then(() => {
      fs.appendFile(resultsPath, results);
    })
    .catch(() => {
      const header = `maxTokens,matches,falsePositives,runs,timestamp\n`;
      fs.writeFile(resultsPath, `${header}${results}`);
    });
};
