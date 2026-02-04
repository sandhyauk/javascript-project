#!/usr/bin/env node
/**
 * MULTI-MASTER AUTO-FOLDER VERSION + TARIFF MAPPING + CSV OUTPUT + HTML-EXPORT SUPPORT
 * + FIXED PRICE PARSING + MULTI-ROW SEAT HEADER SUPPORT
 *
 * Run from:
 *   C:\Users\san8577\PlaywrightRepos\javascript
 *
 * Reads files from Compare folder:
 *   C:\Users\san8577\PlaywrightRepos\javascript\Compare
 *
 * Expected (NEW):
 *  - Multiple master .xlsx starting with M### (e.g., M001..., M104...)
 *  - For each master M###, 3 exports .xls starting with same M### and containing:
 *      - us
 *      - cad
 *      - mex
 *
 * Output:
 *   Compare\M001.csv, Compare\M104.csv, ... (one CSV per master)
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const BASE_DIR = "C:/Users/san8577/PlaywrightRepos/javascript/Compare";

// ===================== TARIFF MAPPING =====================
// MASTER_TARIFF : EXPORT_TARIFF
// Used to normalize EXPORT tariffs back to MASTER tariffs.
// (We build reverse map below.)
const TARIFF_EQUIV_MASTER_TO_EXPORT = {
  // ---------- USD/CAD mappings ----------
  GSCWCH1: "GSFCWCH1",
  GSCWCH1C: "GSFCWC1C",
  GSCWCH2: "GSFCWCH2",
  GSCWCH2C: "GSFCWC2C",
  GSCWCH3: "GSFCWCH3",
  GSCWCH3C: "GSFCWC3C",
  GSCWCH4: "GSFCWCH4",
  GSCWCH4C: "GSFCWC4C",

  // ---------- MXN (Mexico export) weird variants ----------
  // Export uses GSFMWCH* / GSFMWC*C, normalize to master GSMWCH*
  GSMWCH1: "GSFMWCH1",
  GSMWCH1C: "GSFMWC1C",
  GSMWCH2: "GSFMWCH2",
  GSMWCH2C: "GSFMWC2C",
  GSMWCH3: "GSFMWCH3",
  GSMWCH3C: "GSFMWC3C",
  GSMWCH4: "GSFMWCH4",
  GSMWCH4C: "GSFMWC4C",
};

const TARIFF_EQUIV_EXPORT_TO_MASTER = Object.fromEntries(
  Object.entries(TARIFF_EQUIV_MASTER_TO_EXPORT).map(([m, e]) => [e, m])
);
// =========================================================

// -------------------- HTML helpers --------------------

function isProbablyHtmlFile(filePath) {
  try {
    const head = fs.readFileSync(filePath, "utf8").slice(0, 2500).toLowerCase();
    return head.includes("<table") || head.includes("<html") || head.includes("<tr") || head.includes("<td");
  } catch {
    return false;
  }
}

function decodeHtmlEntities(s) {
  if (!s) return "";
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u00A0/g, " ");
}

function stripHtmlTags(s) {
  return (s || "").replace(/<[^>]*>/g, "");
}

function getAttrInt(tag, attrName, defaultValue = 1) {
  const re = new RegExp(`${attrName}\\s*=\\s*["']?(\\d+)["']?`, "i");
  const m = String(tag || "").match(re);
  if (!m) return defaultValue;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

/**
 * Parse ONE <table> into AoA. Handles basic colspan/rowspan.
 */
function htmlSingleTableToAoA(tableHtml) {
  const rows = [];
  let spanMap = [];

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRe.exec(tableHtml))) {
    const trInner = trMatch[1];
    const row = [];
    let col = 0;

    function fillSpans() {
      while (spanMap[col] && spanMap[col].remaining > 0) {
        row[col] = spanMap[col].text;
        spanMap[col].remaining -= 1;
        if (spanMap[col].remaining <= 0) spanMap[col] = null;
        col += 1;
      }
    }

    fillSpans();

    const tdRe = /<(td|th)([^>]*)>([\s\S]*?)<\/(td|th)>/gi;
    let tdMatch;

    while ((tdMatch = tdRe.exec(trInner))) {
      const attrs = tdMatch[2] || "";
      const cellHtml = tdMatch[3] || "";

      fillSpans();

      const text = decodeHtmlEntities(stripHtmlTags(cellHtml)).trim();
      const cellText = text === "" ? null : text;

      const colspan = getAttrInt(attrs, "colspan", 1);
      const rowspan = getAttrInt(attrs, "rowspan", 1);

      row[col] = cellText;

      if (rowspan > 1) spanMap[col] = { text: cellText, remaining: rowspan - 1 };

      for (let k = 1; k < colspan; k++) {
        row[col + k] = null;
        if (rowspan > 1) spanMap[col + k] = { text: null, remaining: rowspan - 1 };
      }

      col += colspan;
    }

    fillSpans();
    rows.push(row.map((c) => (c === undefined ? null : c)));
  }

  return rows;
}

/**
 * Parse ALL tables from HTML into pseudo workbook with multiple sheets.
 */
function htmlTablesToPseudoWorkbook(html) {
  const tables = [];
  const tableRe = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let m;
  while ((m = tableRe.exec(html))) tables.push(m[0]);

  const SheetNames = [];
  const __aoaBySheet = {};

  tables.forEach((t, idx) => {
    const name = `Table${idx + 1}`;
    SheetNames.push(name);
    __aoaBySheet[name] = htmlSingleTableToAoA(t);
  });

  return { __isHtml: true, SheetNames, __aoaBySheet };
}

function readWorkbookSmart(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  if (isProbablyHtmlFile(filePath)) {
    const html = fs.readFileSync(filePath, "utf8");
    return htmlTablesToPseudoWorkbook(html);
  }

  return XLSX.readFile(filePath, { cellText: true, cellNF: true, cellDates: false });
}

function sheetToAoA(wb, sheetName, { raw = true } = {}) {
  if (wb && wb.__isHtml) {
    return (wb.__aoaBySheet && wb.__aoaBySheet[sheetName]) || [];
  }
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw });
}

// -------------------- normalization --------------------

function norm(x) {
  return (x ?? "").toString().trim();
}
function normLower(x) {
  return norm(x).toLowerCase();
}
function keyText(x) {
  return norm(x).toUpperCase().replace(/\s+/g, " ").trim();
}
function seatKey(x) {
  return keyText(x).replace(/\s+/g, "").replace(/-+/g, "-");
}

// -------------------- price parsing (FIXED) --------------------
function parsePrice(x) {
  if (x === null || x === undefined) return null;

  // ✅ Keep numeric values as-is
  if (typeof x === "number") return x;

  const txt = String(x).replace(/\u00A0/g, " ").trim();
  if (!txt) return null;

  const tokens = txt.match(/-?\d[\d\s,]*[.,]?\d*/g);
  if (!tokens || tokens.length === 0) return null;

  function tokenToNumber(raw) {
    let s = raw.trim().replace(/\s+/g, "");
    const hasDot = s.includes(".");
    const hasComma = s.includes(",");

    if (hasComma && !hasDot && /,\d{2}$/.test(s)) {
      s = s.replace(",", ".");
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(/,/g, "");
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function score(raw) {
    const r = raw.trim().replace(/\s+/g, "");
    if (/\.\d{2}$/.test(r) || /,\d{2}$/.test(r)) return 3;
    if (/[.,]\d+$/.test(r)) return 2;
    return 1;
  }

  const candidates = tokens
    .map((t) => ({ raw: t, n: tokenToNumber(t), s: score(t) }))
    .filter((c) => c.n !== null);

  if (!candidates.length) return null;

  const maxScore = Math.max(...candidates.map((c) => c.s));
  return candidates.filter((c) => c.s === maxScore).pop().n;
}

function rowIsEmpty(row) {
  return (row || []).every((c) => norm(c) === "");
}

// -------------------- header detection --------------------

function looksLikeAudCell(t) {
  t = (t || "").toLowerCase();
  return t.includes("aud cat") || t.includes("audience") || (t.includes("aud") && t.includes("cat"));
}

function looksLikeTariffCell(t) {
  t = (t || "").toLowerCase();
  return t.includes("tariff") || t.includes("rate") || t.includes("price level") || t.includes("price") || t.includes("level");
}

function findHeaderInAoA(aoa) {
  for (let r = 0; r < Math.min(aoa.length, 200); r++) {
    const cells = (aoa[r] || []).map((c) => normLower(c));
    if (cells.some(looksLikeAudCell) && cells.some(looksLikeTariffCell)) return r;
  }
  return -1;
}

function findSheetWithHeader(wb, fileLabel, { raw = true } = {}) {
  for (const sheetName of wb.SheetNames) {
    const aoa = sheetToAoA(wb, sheetName, { raw });
    const h = findHeaderInAoA(aoa);
    if (h !== -1) return { sheetName, headerRow: h };
  }

  console.error(`\n[${fileLabel}] No header found. Sheets were:`);
  wb.SheetNames.forEach((s) => console.error("  - " + s));
  return null;
}

// -------------------- seat header collection (multi-row) --------------------

function looksLikeSeatLabel(v) {
  const s = seatKey(v);
  if (!s) return false;

  if (/^CAT\d(H)?$/.test(s)) return true;
  if (/^PSUPP[A-D]$/.test(s)) return true;
  if (/^(WH|WHAP)(-\d)?$/.test(s)) return true;
  if (/^(ES|AM)(-\d)?$/.test(s)) return true;
  if (/^(TECH|YP)$/.test(s)) return true;

  return false;
}

function collectSeatCols(aoa, headerRowIndex, audCol, tarCol, scanRows = 5) {
  const seatColsMap = new Map();

  for (let rr = headerRowIndex + 1; rr <= headerRowIndex + scanRows; rr++) {
    const row = aoa[rr] || [];
    for (let c = 0; c < row.length; c++) {
      if (c === audCol || c === tarCol) continue;
      const val = row[c];
      if (!looksLikeSeatLabel(val)) continue;
      seatColsMap.set(c, seatKey(val));
    }
  }

  return [...seatColsMap.entries()].sort((a, b) => a[0] - b[0]);
}

// -------------------- master stop condition (first table only) --------------------

function looksLikeNewSectionRow(row) {
  const joined = (row || []).map((c) => normLower(c)).join(" | ");
  if (joined.includes("match")) return true;
  if (joined.includes("venue")) return true;
  if (joined.includes("country")) return true;
  if (joined.includes("all amounts")) return true;

  const cells = (row || []).map((c) => normLower(c));
  if (cells.some(looksLikeAudCell) && cells.some(looksLikeTariffCell)) return true;

  return false;
}

// -------------------- tariff normalization --------------------

function normalizeTariffForKey(tariffRaw, { source }) {
  const t = keyText(tariffRaw);
  if (!t) return "";

  if (source === "export") {
    if (TARIFF_EQUIV_EXPORT_TO_MASTER[t]) return TARIFF_EQUIV_EXPORT_TO_MASTER[t];
    return t;
  }

  return t;
}

// -------------------- table loader --------------------

function loadTableMapFromWorkbook({
  filePath,
  preferredSheetName = null,
  stopAfterFirstTable = false,
  label,
  source,
}) {
  const wb = readWorkbookSmart(filePath);

  let sheetName = preferredSheetName;
  if (!sheetName) {
    const rawModeForHeader = source === "export" ? false : true;
    const pick = findSheetWithHeader(wb, label, { raw: rawModeForHeader });
    if (!pick) throw new Error(`Header not found in any sheet for: ${filePath}`);
    sheetName = pick.sheetName;
  }

  const rawMode = source === "export" ? false : true;
  const aoa = sheetToAoA(wb, sheetName, { raw: rawMode });

  const h = findHeaderInAoA(aoa);
  if (h === -1) throw new Error(`Header not found in ${filePath} (sheet: ${sheetName})`);

  const headerRow = aoa[h] || [];

  const audCol = headerRow.findIndex((c) => looksLikeAudCell(normLower(c)));
  const tarCol = headerRow.findIndex((c) => looksLikeTariffCell(normLower(c)));
  if (audCol === -1 || tarCol === -1) {
    throw new Error(`Could not locate Aud/Tariff columns in ${filePath} (sheet: ${sheetName})`);
  }

  const seatCols = collectSeatCols(aoa, h, audCol, tarCol, 5);
  if (!seatCols.length) {
    throw new Error(`No seat columns found in ${filePath} (sheet: ${sheetName}).`);
  }

  let currentAud = "";
  const map = new Map();

  let seenData = 0;
  let blankStreak = 0;

  for (let r = h + 2; r < aoa.length; r++) {
    const row = aoa[r] || [];

    if (stopAfterFirstTable && seenData > 0 && looksLikeNewSectionRow(row)) break;

    if (rowIsEmpty(row)) {
      blankStreak++;
      if (stopAfterFirstTable && seenData > 0 && blankStreak >= 3) break;
      continue;
    } else {
      blankStreak = 0;
    }

    const audRaw = norm(row[audCol]);
    if (audRaw) currentAud = audRaw;

    const tariffRaw = norm(row[tarCol]);
    if (!tariffRaw) continue;

    const aud = keyText(currentAud);
    const tariff = normalizeTariffForKey(tariffRaw, { source });

    let any = false;
    for (const [col, sKey] of seatCols) {
      const p = parsePrice(row[col]);
      if (p === null) continue;

      any = true;
      const k = `${aud}||${tariff}||${sKey}`;
      map.set(k, { aud, tariff, seat: sKey, price: p });
    }

    if (any) seenData++;
  }

  return map;
}

// -------------------- comparison --------------------

function compare(currency, masterPath, masterTabName, exportPath) {
  const masterMap = loadTableMapFromWorkbook({
    filePath: masterPath,
    preferredSheetName: masterTabName,
    stopAfterFirstTable: true,
    label: `MASTER:${currency}`,
    source: "master",
  });

  const exportMap = loadTableMapFromWorkbook({
    filePath: exportPath,
    preferredSheetName: null,
    stopAfterFirstTable: false,
    label: `EXPORT:${currency}`,
    source: "export",
  });

  const mism = [];
  const miss = [];
  const extra = [];

  for (const [k, m] of masterMap.entries()) {
    const e = exportMap.get(k);
    if (!e) miss.push(m);
    else if (m.price !== e.price) mism.push({ ...m, exportPrice: e.price });
  }

  for (const [k, e] of exportMap.entries()) {
    if (!masterMap.has(k)) extra.push(e);
  }

  return { currency, mism, miss, extra };
}

// -------------------- report --------------------

function printCurrencyReport(r) {
  console.log(`\nCURRENCY: ${r.currency}`);
  console.log("--------------------------------------------------");
  console.log(`Missing in EXPORT (present in MASTER, not in export): ${r.miss.length}`);
  console.log(`Extra in EXPORT (present in export, not in MASTER): ${r.extra.length}`);
  console.log(`Value mismatches: ${r.mism.length}`);

  const showList = (title, arr, formatter) => {
    console.log(`\n${title}:`);
    if (!arr.length) return console.log("  (none)");
    arr.forEach((x) => console.log(`  ${formatter(x)}`));
  };

  showList("MISSING IN EXPORT", r.miss, (x) => `${x.aud} | ${x.tariff} | ${x.seat} => MASTER=${x.price}`);
  showList("EXTRA IN EXPORT", r.extra, (x) => `${x.aud} | ${x.tariff} | ${x.seat} => EXPORT=${x.price}`);
  showList(
    "VALUE MISMATCHES",
    r.mism,
    (x) => `${x.aud} | ${x.tariff} | ${x.seat} => MASTER=${x.price} | EXPORT=${x.exportPrice}`
  );

  console.log("\n==================================================");
}

// -------------------- CSV OUTPUT --------------------

function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(results, csvPath) {
  const rows = [["Currency", "Type", "AudCat", "Tariff", "Seat", "MasterPrice", "ExportPrice"]];

  for (const r of results) {
    for (const x of r.miss) rows.push([r.currency, "MISSING_IN_EXPORT", x.aud, x.tariff, x.seat, x.price, ""]);
    for (const x of r.extra) rows.push([r.currency, "EXTRA_IN_EXPORT", x.aud, x.tariff, x.seat, "", x.price]);
    for (const x of r.mism) rows.push([r.currency, "VALUE_MISMATCH", x.aud, x.tariff, x.seat, x.price, x.exportPrice]);
  }

  fs.writeFileSync(csvPath, rows.map((r) => r.map(csvEscape).join(",")).join("\n"), "utf8");
}

// -------------------- main (MULTI-MASTER LOOP) --------------------

function main() {
  // signature so you can confirm you're running the right script
  console.log("=== MULTI MASTER VERSION RUNNING ===");
  console.log("Compare folder:", BASE_DIR);

  if (!fs.existsSync(BASE_DIR)) {
    console.error("Compare folder not found:", BASE_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(BASE_DIR);

  const masterFiles = files.filter((f) => /^m\d+/i.test(f) && f.toLowerCase().endsWith(".xlsx"));

  console.log("Masters found:", masterFiles.length);
  masterFiles.forEach((f) => console.log("  -", f));

  if (!masterFiles.length) {
    console.error("\nNo master .xlsx files found starting with 'M' (e.g., M104...xlsx) in:", BASE_DIR);
    process.exit(1);
  }

  function getMasterTag(filename) {
    const m = filename.match(/^(M\d+)/i);
    return m ? m[1].toUpperCase() : null;
  }

  function findExports(masterTag, token) {
    return files.filter(
      (f) =>
        f.toLowerCase().endsWith(".xls") &&
        f.toUpperCase().startsWith(masterTag) &&
        f.toLowerCase().includes(token)
    );
  }

  masterFiles.sort((a, b) => {
    const ta = getMasterTag(a) || "";
    const tb = getMasterTag(b) || "";
    const na = parseInt(ta.slice(1), 10);
    const nb = parseInt(tb.slice(1), 10);
    return (na || 0) - (nb || 0);
  });

  let processed = 0;
  let skipped = 0;

  for (const masterFile of masterFiles) {
    const masterTag = getMasterTag(masterFile);
    if (!masterTag) continue;

    const usdMatches = findExports(masterTag, "us");
    const cadMatches = findExports(masterTag, "cad");
    const mexMatches = findExports(masterTag, "mex");

    const problems = [];
    if (usdMatches.length !== 1) problems.push(`USD(us) expected 1, found ${usdMatches.length}`);
    if (cadMatches.length !== 1) problems.push(`CAD(cad) expected 1, found ${cadMatches.length}`);
    if (mexMatches.length !== 1) problems.push(`MXN(mex) expected 1, found ${mexMatches.length}`);

    if (problems.length) {
      console.error("\n----------------------------------------------");
      console.error(`Skipping ${masterTag} because exports are not clean:`);
      problems.forEach((p) => console.error("  - " + p));
      if (usdMatches.length) usdMatches.forEach((f) => console.error("  USD match: " + f));
      if (cadMatches.length) cadMatches.forEach((f) => console.error("  CAD match: " + f));
      if (mexMatches.length) mexMatches.forEach((f) => console.error("  MXN match: " + f));
      skipped++;
      continue;
    }

    const usdFile = usdMatches[0];
    const cadFile = cadMatches[0];
    const mxnFile = mexMatches[0];

    const masterPath = path.join(BASE_DIR, masterFile);
    const usdPath = path.join(BASE_DIR, usdFile);
    const cadPath = path.join(BASE_DIR, cadFile);
    const mxnPath = path.join(BASE_DIR, mxnFile);

    const outputCsv = path.join(BASE_DIR, `${masterTag}.csv`);

    console.log("\n==============================================");
    console.log("MASTER TAG:", masterTag);
    console.log("MASTER:", masterFile);
    console.log("USD  :", usdFile);
    console.log("CAD  :", cadFile);
    console.log("MXN  :", mxnFile);

    const results = [
      compare("USD", masterPath, "USD", usdPath),
      compare("CAD", masterPath, "CAD", cadPath),
      compare("MXN", masterPath, "MXN", mxnPath),
    ];

    results.forEach((r) => printCurrencyReport(r));
    writeCsv(results, outputCsv);

    console.log(`\nCSV written to: ${outputCsv}`);
    processed++;
  }

  console.log("\n==============================================");
  console.log(`Done. Processed: ${processed}, Skipped: ${skipped}`);
}

main();
