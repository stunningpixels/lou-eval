import puppeteer from "puppeteer";
import prompts from "prompts";
import util from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let width = 1000;
let height = 500;

const screenshot = async (options = {}, path = "chart.png") => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({
    width: width,
    height: height,
    deviceScaleFactor: 4,
  });

  page
    .on("console", (message) =>
      console.log(
        `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`
      )
    )
    .on("pageerror", ({ message }) => console.log(message))
    .on("response", (response) =>
      console.log(`${response.status()} ${response.url()}`)
    )
    .on("requestfailed", (request) =>
      console.log(`${request.failure().errorText} ${request.url()}`)
    );

  // load billboard.js assets fro CDN
  await page.addStyleTag({
    url: "https://cdn.jsdelivr.net/npm/billboard.js/dist/theme/modern.min.css",
  });
  await page.addScriptTag({
    url: "https://cdn.jsdelivr.net/npm/billboard.js/dist/billboard.pkgd.min.js",
  });

  await page.evaluate(`
    bb.generate(${JSON.stringify(options)});
  `);

  const content = await page.$(".bb > svg");

  await page.evaluate(`const chart = document.getElementsByTagName('svg')[0];
  const gridLines = chart.querySelector('.bb-grid-lines');
  const chartElement = chart.querySelector('.bb-chart');
  gridLines.after(chartElement);`);

  // Add css class
  await page.addStyleTag({
    content: `
        body {
          background-color: #FFF;
        }

        svg {
          margin: 20px;
        }

        .bb .bb-button, .bb text {
          font-weight: bold;
        }
      `,
  });

  await content.screenshot({
    path,
    omitBackground: true,
  });

  await page.close();
  await browser.close();
};

const generateChart = async (rows) => {
  // Generate grid lines every 4000 chars, until the maxChars
  const gridLines = [];
  for (let i = 4000; i <= rows[rows.length - 1][0]; i += 4000) {
    gridLines.push({ value: i });
  }

  // from 1 to 10
  const yLines = [];
  for (let i = 1; i <= 10; i++) {
    yLines.push({ value: i });
  }

  const timestamp = new Date().toISOString();

  await screenshot(
    {
      transition: {
        duration: 0,
      },
      axis: {
        x: {
          tick: {
            rotate: 90,
            culling: false,
          },
          label: {
            text: "Chars",
            position: "outer-center",
          },
          padding: { left: 200 },
        },
        y: {
          min: 1,
          max: 10,
          label: {
            text: "Matches",
            position: "outer-middle",
          },
        },
      },
      grid: {
        x: {
          lines: gridLines,
        },
        y: {
          lines: yLines,
        },
      },
      data: {
        x: "chars",
        rows,
        type: "line",
      },
      size: { height: height, width: width },
      padding: {
        top: 50,
        right: 50,
        bottom: 100,
        left: 50,
      },
      bindto: "#chart",
      line: {
        connectNull: true,
      },
      legend: {
        padding: 50,
        position: "inset",
        inset: {
          anchor: "bottom-left",
          y: 80,
        },
      },
    },
    path.join(__dirname, `../charts/${timestamp}.png`)
  );
};

const listAvailableModels = async () => {
  // Check the data directory for CSV files
  const dataPath = path.join(__dirname, `../data`);
  const files = await fs.readdir(dataPath);

  // Get the CSV files
  const csvFiles = files.filter((file) => file.endsWith(".csv"));

  // Get the model names
  const modelNames = csvFiles.map((file) => ({
    model: file.replace(".csv", ""),
    path: path.join(dataPath, file),
  }));
  return modelNames;
};

const main = async () => {
  const modelNames = await listAvailableModels();

  // Ask user which models they would like to chart
  const { value: modelChoices } = await prompts({
    type: "multiselect",
    name: "value",
    message: "Pick models to chart",
    choices: modelNames.map((model) => ({
      title: model.model,
      value: model.model,
    })),
  });

  // If the user presses 'esc'
  if (!modelChoices) return;

  // Get the selected models
  const models = modelNames.filter((model) =>
    modelChoices.includes(model.model)
  );

  // Generate function
  const generateData = async (model) => {
    const data = await fs.readFile(model.path, "utf-8");
    const rows = data.split("\n").map((row) => row.split(","));
    rows.shift(); // Remove the header
    const formattedRows = rows
      .filter((row) => row[0] !== "" && row[1] !== "")
      .map((row) => ({
        maxChars: row[0],
        matches: row[1],
        timestamp: row[4],
      }));

    // Take latest for each maxChars
    const uniqueRows = [];
    for (const row of formattedRows) {
      const found = uniqueRows.find(
        (uniqueRow) => uniqueRow.maxChars === row.maxChars
      );
      if (found) {
        if (new Date(found.timestamp) < new Date(row.timestamp)) {
          found.matches = row.matches;
          found.timestamp = row.timestamp;
        }
      } else {
        uniqueRows.push(row);
      }
    }

    // Sort by maxChars
    uniqueRows.sort((a, b) => a.maxChars - b.maxChars);

    return { model: model.model, results: uniqueRows };
  };

  // Generate the data
  const modelData = await Promise.all(models.map(generateData));

  const rows = [];

  for (let model in modelData) {
    for (let row of modelData[model].results) {
      const adjustedMaxChars =
        row.maxChars % 1000
          ? row.maxChars - (row.maxChars % 1000) + 1000
          : row.maxChars;

      row.maxChars = parseInt(adjustedMaxChars);

      const maxCharsFound = rows.find((row1) => row.maxChars === row1.maxChars);

      const maxChars = row.maxChars;
      const matches = row.matches;

      if (maxCharsFound) {
        maxCharsFound[modelData[model].model] = matches;
      } else {
        const newRow = { maxChars };
        newRow[modelData[model].model] = matches;
        rows.push(newRow);
      }
    }
  }

  const finalRows = [["chars", ...modelData.map((model) => model.model)]];

  for (const row of rows) {
    const newRow = [row.maxChars];
    for (const model of modelData) {
      newRow.push(row[model.model]);
    }
    finalRows.push(newRow);
  }

  // User chooses maximum maxChars to generate chart

  // Prompt user to select maximum
  const { value: maxCharsChoice } = await prompts({
    type: "select",
    name: "value",
    message: "Pick the maximum token size for the x axis",
    choices: [
      { title: "Skip", value: null },
      ...rows.map((row) => ({
        title: `<=${row.maxChars}`,
        value: row.maxChars,
      })),
    ],
  });

  // Filter rows
  if (maxCharsChoice) {
    finalRows.splice(
      finalRows.findIndex((row) => row[0] === maxCharsChoice) + 1
    );
  }

  console.log(finalRows);

  await generateChart(finalRows);
};

main();
