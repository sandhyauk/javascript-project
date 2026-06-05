#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const SOURCE_DIR =
  "C:/Users/san8577/PlaywrightRepos/javascript/Compare/Negative check";

function getMasterFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(f => /\bM\d{3}\b/i.test(f) && /\.(xlsx|xlsm)$/i.test(f))
    .map(f => path.join(dir, f));
}

function colLetter(colNumber) {
  let letter = "";
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    colNumber = Math.floor((colNumber - mod) / 26);
  }
  return letter;
}

function extractTopPricingTable(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ""
  });

  let tariffHeaderRowIndex = -1;
  let categoryHeaderRowIndex = -1;
  let tariffColIndex = -1;
  let firstPriceColIndex = -1;

  for (let r = 0; r < rows.length; r++) {
    const rowText = rows[r].join(" ").toLowerCase();

    if (
      rowText.includes("tariff") &&
      rowText.includes("seat categories")
    ) {
      tariffHeaderRowIndex = r;

      tariffColIndex = rows[r].findIndex(cell =>
        String(cell).toLowerCase().includes("tariff")
      );

      categoryHeaderRowIndex = r + 1;

      firstPriceColIndex = rows[categoryHeaderRowIndex].findIndex(cell =>
        /^cat\s*1$/i.test(String(cell).trim())
      );

      break;
    }
  }

  if (
    tariffHeaderRowIndex === -1 ||
    categoryHeaderRowIndex === -1 ||
    tariffColIndex === -1 ||
    firstPriceColIndex === -1
  ) {
    return [];
  }

  const categoryHeaders = rows[categoryHeaderRowIndex];

  const topTable = [];

  for (let r = categoryHeaderRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];

    const tariff = String(row[tariffColIndex] || "").trim();

    if (!tariff) {
      break;
    }

    for (let c = firstPriceColIndex; c < row.length; c++) {
      const category = String(categoryHeaders[c] || "").trim();
      const rawValue = row[c];

      if (!category) continue;

      topTable.push({
        excelRow: r + 1,
        excelCol: c + 1,
        cell: `${colLetter(c + 1)}${r + 1}`,
        tariff,
        category,
        value: rawValue
      });
    }
  }

  return topTable;
}

function checkNegativeValues(topTable, sheetName, fileName) {
  const issues = [];

  topTable.forEach(item => {
    if (item.value === "" || item.value === null || item.value === undefined) {
      return;
    }

    const numericValue = Number(item.value);

    if (!isNaN(numericValue) && numericValue < 0) {
      issues.push({
        file: fileName,
        sheet: sheetName,
        cell: item.cell,
        row: item.excelRow,
        col: item.excelCol,
        tariff: item.tariff,
        category: item.category,
        value: numericValue
      });
    }
  });

  return issues;
}

function run() {
  const masters = getMasterFiles(SOURCE_DIR);

  if (masters.length === 0) {
    console.log("❌ No master files found");
    return;
  }

  let allIssues = [];

  masters.forEach(file => {
    const workbook = xlsx.readFile(file);

    workbook.SheetNames.forEach(sheetName => {
      if (!/usd|cad|mxn|mex/i.test(sheetName)) return;

      const sheet = workbook.Sheets[sheetName];
      const topTable = extractTopPricingTable(sheet);

      const issues = checkNegativeValues(
        topTable,
        sheetName,
        path.basename(file)
      );

      allIssues = allIssues.concat(issues);
    });
  });

  if (allIssues.length === 0) {
    console.log("\n✅ No negative values found in top pricing tables\n");
  } else {
    console.log("\n❌ NEGATIVE VALUES FOUND IN TOP PRICING TABLE:\n");

    allIssues.forEach(i => {
      console.log(
        `${i.file} | ${i.sheet} | ${i.cell} | Tariff: ${i.tariff} | Category: ${i.category} | Value: ${i.value}`
      );
    });

    console.log(`\nTotal issues: ${allIssues.length}`);
    process.exit(1);
  }
}

run();