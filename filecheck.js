#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

// 👉 UPDATE THIS PATH if needed
const SOURCE_DIR = "C:/Users/san8577/PlaywrightRepos/javascript/Compare";

// -------- Helper: find master files --------
function getMasterFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => /\bM\d{3}\b/i.test(f) && /\.(xlsx|xlsm)$/i.test(f))
    .map(f => path.join(dir, f));
}

// -------- Helper: extract top table --------
function extractTopTable(sheet) {
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const table = [];
  let started = false;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // detect header row (tariff / category)
    const rowStr = row.join(" ").toLowerCase();

    if (!started && (rowStr.includes("tariff") || rowStr.includes("aud"))) {
      started = true;
      continue;
    }

    if (started) {
      // stop at empty or footer
      if (!row || row.every(cell => cell === "")) break;

      table.push(row);
    }
  }

  return table;
}

// -------- Helper: check negatives --------
function checkNegativeValues(table, sheetName, fileName) {
  const issues = [];

  table.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const val = parseFloat(cell);

      if (!isNaN(val) && val < 0) {
        issues.push({
          file: fileName,
          sheet: sheetName,
          row: rowIndex + 1,
          col: colIndex + 1,
          value: val
        });
      }
    });
  });

  return issues;
}

// -------- MAIN --------
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
      // Only check USD / CAD / MEX sheets (adjust if needed)
      if (!/usd|cad|mex/i.test(sheetName)) return;

      const sheet = workbook.Sheets[sheetName];
      const table = extractTopTable(sheet);

      const issues = checkNegativeValues(table, sheetName, path.basename(file));
      allIssues = allIssues.concat(issues);
    });
  });

  // -------- OUTPUT --------
  if (allIssues.length === 0) {
    console.log("\n✅ No negative values found in any master file\n");
  } else {
    console.log("\n❌ NEGATIVE VALUES FOUND:\n");

    allIssues.forEach(i => {
      console.log(
        `${i.file} | ${i.sheet} | Row ${i.row} Col ${i.col} => ${i.value}`
      );
    });

    console.log(`\nTotal issues: ${allIssues.length}`);

    // 👉 HARD STOP (recommended)
    process.exit(1);
  }
}

run();