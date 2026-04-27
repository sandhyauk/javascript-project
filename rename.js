#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SOURCE_DIR = "C:/Users/san8577/PlaywrightRepos/javascript/Compare/convert";
const DEST_DIR   = "C:/Users/san8577/PlaywrightRepos/javascript/Compare";

function listFiles(dir) {
  return fs.readdirSync(dir)
    .map((name) => ({ name, full: path.join(dir, name) }))
    .filter((f) => fs.statSync(f.full).isFile());
}

function extractMNumber(filename) {
  const m = filename.match(/\b(M\d{3})\b/i);
  return m ? m[1].toUpperCase() : null;
}

function mNumberValue(mNum) {
  return Number(mNum.replace("M", ""));
}

function isExcelish(name) {
  return /\.(xlsx|xlsm|xls)$/i.test(name) || !path.extname(name);
}

function extractRateTableNumber(filename) {
  const m = filename.match(/rates\s*[_\-\s]*table\s*\(\s*(\d+)\s*\)/i);
  return m ? Number(m[1]) : null;
}

function findMasters(files) {
  return files
    .filter((f) =>
      isExcelish(f.name) &&
      /\bM\d{3}\b/i.test(f.name) &&
      !/rates[_\s-]*table/i.test(f.name)
    )
    .map((f) => ({
      ...f,
      mNum: extractMNumber(f.name)
    }))
    .filter((f) => f.mNum)
    .sort((a, b) => mNumberValue(a.mNum) - mNumberValue(b.mNum));
}

function findRateTables(files) {
  return files
    .map((f) => ({
      ...f,
      rateNum: extractRateTableNumber(f.name)
    }))
    .filter((f) => isExcelish(f.name) && f.rateNum !== null)
    .sort((a, b) => a.rateNum - b.rateNum);
}

function ensureXlsxName(originalName, mNum) {
  const ext = path.extname(originalName).toLowerCase();
  const base = ext ? path.parse(originalName).name : originalName;

  const finalBase = /\bM\d{3}\b/i.test(base) ? base : `${mNum} ${base}`.trim();
  return `${finalBase}.xlsx`;
}

function moveFile(srcPath, destPath) {
  if (fs.existsSync(destPath)) {
    throw new Error(`Destination file already exists: ${destPath}`);
  }

  try {
    fs.renameSync(srcPath, destPath);
  } catch (e) {
    fs.copyFileSync(srcPath, destPath);
    fs.unlinkSync(srcPath);
  }
}

function main() {
  const files = listFiles(SOURCE_DIR);

  const masters = findMasters(files);
  const rateTables = findRateTables(files);

  if (!masters.length) {
    console.error(`❌ No master files found in: ${SOURCE_DIR}`);
    process.exit(1);
  }

  if (!rateTables.length) {
    console.error(`❌ No Rates_table files found in: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const expectedRateCount = masters.length * 3;

  if (rateTables.length < expectedRateCount) {
    console.error("❌ Not enough Rates_table files.");
    console.error(`Masters found: ${masters.length}`);
    console.error(`Rate tables expected: ${expectedRateCount}`);
    console.error(`Rate tables found: ${rateTables.length}`);
    process.exit(1);
  }

  if (rateTables.length > expectedRateCount) {
    console.error("❌ Too many Rates_table files.");
    console.error(`Masters found: ${masters.length}`);
    console.error(`Rate tables expected: ${expectedRateCount}`);
    console.error(`Rate tables found: ${rateTables.length}`);
    process.exit(1);
  }

  console.log("Masters sorted:");
  masters.forEach((m) => console.log(` - ${m.mNum}: ${m.name}`));

  console.log("");
  console.log("Rate tables sorted:");
  rateTables.forEach((r) => console.log(` - Rates_table (${r.rateNum}): ${r.name}`));

  console.log("");
  console.log("Mapping:");

  const moves = [];

  masters.forEach((master, index) => {
    const mNum = master.mNum;

    const usd = rateTables[index * 3];
    const cad = rateTables[index * 3 + 1];
    const mex = rateTables[index * 3 + 2];

    const masterOutName = ensureXlsxName(master.name, mNum);

    const outMaster = path.join(DEST_DIR, masterOutName);
    const outUsd = path.join(DEST_DIR, `${mNum} Rates_table usd${path.extname(usd.name) || ".xls"}`);
    const outCad = path.join(DEST_DIR, `${mNum} Rates_table cad${path.extname(cad.name) || ".xls"}`);
    const outMex = path.join(DEST_DIR, `${mNum} Rates_table mex${path.extname(mex.name) || ".xls"}`);

    console.log("");
    console.log(`${mNum}`);
    console.log(`MASTER: ${master.name} -> ${path.basename(outMaster)}`);
    console.log(`USD   : ${usd.name} -> ${path.basename(outUsd)}`);
    console.log(`CAD   : ${cad.name} -> ${path.basename(outCad)}`);
    console.log(`MEX   : ${mex.name} -> ${path.basename(outMex)}`);

    moves.push({ from: master.full, to: outMaster });
    moves.push({ from: usd.full, to: outUsd });
    moves.push({ from: cad.full, to: outCad });
    moves.push({ from: mex.full, to: outMex });
  });

  console.log("");
  console.log("Moving files...");

  for (const move of moves) {
    moveFile(move.from, move.to);
  }

  console.log("");
  console.log("✅ Done.");
  console.log("✅ Masters moved to Compare as .xlsx name.");
  console.log("✅ Rate tables moved/renamed by sorted M number.");
  console.log("✅ Every 3 rate tables mapped to one master.");
}

main();