#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

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

function convertToXls(srcPath, outPath) {
  const wb = XLSX.readFile(srcPath, { cellDates: true, raw: false });
  XLSX.writeFile(wb, outPath, { bookType: "biff8", compression: false });
}

function copyFile(srcPath, outPath) {
  fs.copyFileSync(srcPath, outPath);
}

function safeDelete(p) {
  try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
}

function ensureXlsxName(originalName, mNum) {
  // If it already ends with .xlsx keep it.
  // If it ends with .xlsm or .xls or has no extension, force .xlsx
  const ext = path.extname(originalName).toLowerCase();
  const base = ext ? path.parse(originalName).name : originalName;

  // Use original base name but ensure it includes the M### (just in case)
  const finalBase = /\bM\d{3}\b/i.test(base) ? base : `${mNum} ${base}`.trim();
  return `${finalBase}.xlsx`;
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

  // ✅ MASTER stays as .xlsx
  const masterOutName = ensureXlsxName(master.name, mNum);
  const outMaster = path.join(DEST_DIR, masterOutName);

  // ✅ Rates become .xls
  const outUsd = path.join(DEST_DIR, `${mNum} Rates_table usd.xls`);
  const outCad = path.join(DEST_DIR, `${mNum} Rates_table cad.xls`);
  const outMex = path.join(DEST_DIR, `${mNum} Rates_table mex.xls`);

  console.log("Using files:");
  console.log(`MASTER: ${master.name} -> ${path.basename(outMaster)} (xlsx)`);
  console.log(`USD   : ${r1.name} -> ${path.basename(outUsd)} (xls)`);
  console.log(`CAD   : ${r2.name} -> ${path.basename(outCad)} (xls)`);
  console.log(`MEX   : ${r3.name} -> ${path.basename(outMex)} (xls)`);
  console.log("");

  // 1) Copy master as-is (keep xlsx)
  copyFile(master.full, outMaster);

  // 2) Convert rates to .xls (97-2003)
  convertToXls(r1.full, outUsd);
  convertToXls(r2.full, outCad);
  convertToXls(r3.full, outMex);

  // 3) Remove originals from convert folder
  safeDelete(master.full);
  safeDelete(r1.full);
  safeDelete(r2.full);
  safeDelete(r3.full);

  console.log("✅ Done.");
  console.log("✅ Master kept as .xlsx in Compare.");
  console.log("✅ Rates saved as .xls in Compare.");
  console.log("🗑️ Originals removed from convert.");
}

main();
