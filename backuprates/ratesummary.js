#!/usr/bin/env node
/**
 * SUMMARY-ONLY VERSION (MULTI-MASTER)
 *
 * Folder:
 *   C:\Users\san8577\PlaywrightRepos\javascript\Compare
 *
 * Expected (per master M###):
 *  - master:  M###*.xlsx
 *  - exports: start with same M### and contain currency token:
 *      USD: "usd" or "us"
 *      CAD: "cad"
 *      MXN: "mex" or "mxn"
 *    (case-insensitive token match; avoids "status" matching "us")
 *
 * Run:
 *   node compare-rates-summary.js
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const BASE_DIR = "C:/Users/san8577/PlaywrightRepos/javascript/Compare";

// ===================== TARIFF MAPPING =====================
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
  Object.entries(TARIFF_EQUIV_MASTER_TO_EXPORT).map(([m, e]) => [String(e).toUpperCase(), String(m).toUpperCase()])
);

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
    const up = t.toUpperCase();
    if (TARIFF_EQUIV_EXPORT_TO_MASTER[up]) return TARIFF_EQUIV_EXPORT_TO_MASTER[up];
    return up;
  }

  return t;
}

// -------------------- table loader --------------------

function loadTableMapFromWorkbook({
  filePath,
  preferredSheetName = null,
  stopAfterFirstTable = false,
  label,
  source, // "master" | "export"
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

// -------------------- comparison (summary) --------------------

function compareSummary(currency, masterPath, masterTabName, exportPath) {
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

  let missing = 0;
  let mismatches = 0;

  for (const [k, m] of masterMap.entries()) {
    const e = exportMap.get(k);
    if (!e) missing++;
    else if (m.price !== e.price) mismatches++;
  }

  let extra = 0;
  for (const k of exportMap.keys()) {
    if (!masterMap.has(k)) extra++;
  }

  return { currency, missing, extra, mismatches };
}

// -------------------- multi-master matching helpers --------------------

function getMasterTag(filename) {
  const m = String(filename).match(/^(M\d{1,})/i);
  return m ? m[1].toUpperCase() : null;
}

function hasToken(filenameLower, token) {
  // boundary match: separators around token => prevents "status" matching "us"
  const re = new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, "i");
  return re.test(filenameLower);
}

function findExportsForMaster(files, masterTag, tokens) {
  const mt = masterTag.toUpperCase();
  return files.filter((f) => {
    const lower = f.toLowerCase();

    // exports must start with same master tag
    if (!f.toUpperCase().startsWith(mt)) return false;

    // exports are .xls (html) usually; allow .xlsx exports too if needed
    if (!(lower.endsWith(".xls") || lower.endsWith(".xlsx"))) return false;

    // avoid picking the master xlsx as an export
    if (lower.endsWith(".xlsx") && /^m\d+/i.test(f) && !lower.includes("rates_table")) return false;

    return tokens.some((t) => hasToken(lower, t));
  });
}

function safeCompare(currency, masterPath, masterTabName, exportPath) {
  try {
    const r = compareSummary(currency, masterPath, masterTabName, exportPath);
    return { ...r, ok: true, error: "" };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { currency, missing: 0, extra: 0, mismatches: 0, ok: false, error: msg };
  }
}

// -------------------- printing --------------------

function printMasterHeader(masterTag, masterFile, usdFile, cadFile, mxnFile) {
  console.log("\n==============================================");
  console.log(`MASTER: ${masterTag}`);
  console.log("master:", masterFile);
  console.log("usd   :", usdFile || "(missing)");
  console.log("cad   :", cadFile || "(missing)");
  console.log("mxn   :", mxnFile || "(missing)");
  console.log("----------------------------------------------");
}

function printSummaryLine(r) {
  const status = r.ok ? "OK" : "ERROR";
  console.log(
    `${r.currency.padEnd(3)} | ${status.padEnd(5)} | Missing: ${String(r.missing).padStart(5)} | Extra: ${String(
      r.extra
    ).padStart(5)} | Mismatch: ${String(r.mismatches).padStart(5)}${r.ok ? "" : " | " + r.error}`
  );
}

// -------------------- main --------------------

function main() {
  console.log("=== SUMMARY-ONLY MULTI-MASTER RUNNING ===");
  console.log("SCRIPT:", __filename);
  console.log("Compare folder:", BASE_DIR);

  if (!fs.existsSync(BASE_DIR)) {
    console.error("Compare folder not found:", BASE_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(BASE_DIR);

  // masters are .xlsx that start with M###
  const masterFiles = files.filter((f) => /^m\d+/i.test(f) && f.toLowerCase().endsWith(".xlsx"));
  if (!masterFiles.length) {
    console.error("\nNo master .xlsx files found starting with M (example: M104...xlsx).");
    console.error("Files found:");
    files.forEach((f) => console.error("  - " + f));
    process.exit(1);
  }

  // sort masters by M number
  masterFiles.sort((a, b) => {
    const ta = getMasterTag(a) || "";
    const tb = getMasterTag(b) || "";
    const na = parseInt(ta.slice(1), 10);
    const nb = parseInt(tb.slice(1), 10);
    return (na || 0) - (nb || 0);
  });

  // grand totals across ALL masters
  const grand = {
    mastersProcessed: 0,
    mastersSkipped: 0,
    USD: { missing: 0, extra: 0, mismatches: 0, errors: 0 },
    CAD: { missing: 0, extra: 0, mismatches: 0, errors: 0 },
    MXN: { missing: 0, extra: 0, mismatches: 0, errors: 0 },
  };

  for (const masterFile of masterFiles) {
    const masterTag = getMasterTag(masterFile);
    if (!masterTag) continue;

    const usdMatches = findExportsForMaster(files, masterTag, ["usd", "us"]);
    const cadMatches = findExportsForMaster(files, masterTag, ["cad"]);
    const mxnMatches = findExportsForMaster(files, masterTag, ["mex", "mxn"]);

    const problems = [];
    if (usdMatches.length !== 1) problems.push(`USD expected 1, found ${usdMatches.length}`);
    if (cadMatches.length !== 1) problems.push(`CAD expected 1, found ${cadMatches.length}`);
    if (mxnMatches.length !== 1) problems.push(`MXN expected 1, found ${mxnMatches.length}`);

    const usdFile = usdMatches[0] || "";
    const cadFile = cadMatches[0] || "";
    const mxnFile = mxnMatches[0] || "";

    printMasterHeader(masterTag, masterFile, usdFile, cadFile, mxnFile);

    if (problems.length) {
      console.log("SKIPPED (exports not clean):");
      problems.forEach((p) => console.log("  - " + p));
      grand.mastersSkipped++;
      continue;
    }

    const masterPath = path.join(BASE_DIR, masterFile);
    const usdPath = path.join(BASE_DIR, usdFile);
    const cadPath = path.join(BASE_DIR, cadFile);
    const mxnPath = path.join(BASE_DIR, mxnFile);

    const rUSD = safeCompare("USD", masterPath, "USD", usdPath);
    const rCAD = safeCompare("CAD", masterPath, "CAD", cadPath);
    const rMXN = safeCompare("MXN", masterPath, "MXN", mxnPath);

    [rUSD, rCAD, rMXN].forEach(printSummaryLine);

    // roll up grand totals
    const roll = (cur, r) => {
      if (!r.ok) {
        grand[cur].errors += 1;
        return;
      }
      grand[cur].missing += r.missing;
      grand[cur].extra += r.extra;
      grand[cur].mismatches += r.mismatches;
    };
    roll("USD", rUSD);
    roll("CAD", rCAD);
    roll("MXN", rMXN);

    grand.mastersProcessed++;
  }

  console.log("\n==============================================");
  console.log("ALL-MASTERS SUMMARY");
  console.log("----------------------------------------------");
  console.log(`Masters processed: ${grand.mastersProcessed}`);
  console.log(`Masters skipped  : ${grand.mastersSkipped}`);
  console.log("----------------------------------------------");
  console.log(
    `USD | Missing: ${grand.USD.missing} | Extra: ${grand.USD.extra} | Mismatch: ${grand.USD.mismatches} | Errors: ${grand.USD.errors}`
  );
  console.log(
    `CAD | Missing: ${grand.CAD.missing} | Extra: ${grand.CAD.extra} | Mismatch: ${grand.CAD.mismatches} | Errors: ${grand.CAD.errors}`
  );
  console.log(
    `MXN | Missing: ${grand.MXN.missing} | Extra: ${grand.MXN.extra} | Mismatch: ${grand.MXN.mismatches} | Errors: ${grand.MXN.errors}`
  );
  console.log("==============================================\n");
}

main();
