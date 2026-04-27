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

function isExcelish(name) {
  return /\.(xlsx|xlsm|xls)$/i.test(name) || !path.extname(name);
}

function findMaster(files) {
  // Any file containing M### and NOT containing Rates_table
  const candidates = files.filter((f) =>
    isExcelish(f.name) &&
    /\bM\d{3}\b/i.test(f.name) &&
    !/rates[_\s-]*table/i.test(f.name)
  );

  if (!candidates.length) return null;

  // pick newest
  candidates.sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  return candidates[0];
}

function findRate(files, n) {
  const re = new RegExp(`rates\\s*[_\\-\\s]*table\\s*\\(\\s*${n}\\s*\\)`, "i");
  return files.find((f) => isExcelish(f.name) && re.test(f.name)) || null;
}

function ensureXlsxName(originalName, mNum) {
  const ext = path.extname(originalName).toLowerCase();
  const base = ext ? path.parse(originalName).name : originalName;

  const finalBase = /\bM\d{3}\b/i.test(base) ? base : `${mNum} ${base}`.trim();
  return `${finalBase}.xlsx`;
}

function ensureXlsName(originalName) {
  // keep base name; force .xls
  const ext = path.extname(originalName);
  const base = ext ? path.parse(originalName).name : originalName;
  return `${base}.xls`;
}

function moveFile(srcPath, destPath) {
  // rename = move on same drive; if it fails (rare), fallback to copy+delete
  try {
    fs.renameSync(srcPath, destPath);
  } catch (e) {
    fs.copyFileSync(srcPath, destPath);
    fs.unlinkSync(srcPath);
  }
}

function main() {
  const files = listFiles(SOURCE_DIR);

  const master = findMaster(files);
  if (!master) {
    console.error(`❌ No master file found in: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const mNum = extractMNumber(master.name);
  if (!mNum) {
    console.error(`❌ Could not extract M### from master: ${master.name}`);
    process.exit(1);
  }

  const r1 = findRate(files, 1);
  const r2 = findRate(files, 2);
  const r3 = findRate(files, 3);

  if (!r1 || !r2 || !r3) {
    console.error(`❌ Missing required Rates_table files in: ${SOURCE_DIR}`);
    if (!r1) console.error(" - Rates_table (1)");
    if (!r2) console.error(" - Rates_table (2)");
    if (!r3) console.error(" - Rates_table (3)");
    process.exit(1);
  }

  // MASTER stays .xlsx in Compare
  const masterOutName = ensureXlsxName(master.name, mNum);
  const outMaster = path.join(DEST_DIR, masterOutName);

  // RATES: do NOT open/resave; just rename/move as-is
  // (We keep their content unchanged; we only control destination filename.)
  const outUsd = path.join(DEST_DIR, `${mNum} Rates_table usd${path.extname(r1.name) || ".xls"}`);
  const outCad = path.join(DEST_DIR, `${mNum} Rates_table cad${path.extname(r2.name) || ".xls"}`);
  const outMex = path.join(DEST_DIR, `${mNum} Rates_table mex${path.extname(r3.name) || ".xls"}`);

  console.log("Using files:");
  console.log(`MASTER: ${master.name} -> ${path.basename(outMaster)} (xlsx)`);
  console.log(`USD   : ${r1.name} -> ${path.basename(outUsd)} (no resave)`);
  console.log(`CAD   : ${r2.name} -> ${path.basename(outCad)} (no resave)`);
  console.log(`MEX   : ${r3.name} -> ${path.basename(outMex)} (no resave)`);
  console.log("");

  // Move files out of convert folder (so originals are removed automatically)
  moveFile(master.full, outMaster);
  moveFile(r1.full, outUsd);
  moveFile(r2.full, outCad);
  moveFile(r3.full, outMex);

  console.log("✅ Done.");
  console.log("✅ Master moved to Compare as .xlsx (no resave).");
  console.log("✅ Rate tables moved/renamed to Compare (no resave).");
  console.log("🗑️ Nothing left behind in convert (moved).");
}

main();
