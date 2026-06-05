const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const auditFolder = "C:\\Users\\san8577\\Downloads\\AuditLogs";
const currencyOrder = { USD: 1, CAD: 2, MXN: 3 };

function safe(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getValue(text, label) {
  const regex = new RegExp("^•?\\s*" + label + "\\s*:\\s*(.*)$", "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function getSummaryNumber(lines, label) {
  const line = lines.find(l => l.toLowerCase().includes(label.toLowerCase()));
  if (!line) return 0;

  const match = line.match(/:\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function readAuditFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const entries = [];

  let summary = {
    matches: 0,
    success: 0,
    failed: 0,
    total: 0,
    currencies: ""
  };

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const lines = rows
      .map(row => row.filter(Boolean).join(" ").trim())
      .filter(Boolean);

    summary.matches = getSummaryNumber(lines, "# of Matches Processed");
    summary.total = getSummaryNumber(lines, "Total Price Updates Attempted");
    summary.success = getSummaryNumber(lines, "Successful Updates");
    summary.failed = getSummaryNumber(lines, "Failed Updates");

    const currencyLine = lines.find(l =>
      l.toLowerCase().includes("currencies")
    );

    if (currencyLine) {
      summary.currencies = currencyLine.replace(/^•?\s*Currencies\s*:\s*/i, "");
    }

    let current = null;

    for (const text of lines) {
      if (/SUCCESSFULLY UPDATED PRICE/i.test(text)) {
        if (current) entries.push(current);

        current = {
          sourceFile: path.basename(filePath),
          sheet: sheetName,
          matchId: "",
          tariff: "",
          seatCategory: "",
          currency: "",
          attemptedPrice: "",
          status: "Success",
          error: "",
          timestamp: "",
          requestId: "",
          raw: [text]
        };

        continue;
      }

      if (/ERROR UPDATING PRICE/i.test(text)) {
        if (current) entries.push(current);

        current = {
          sourceFile: path.basename(filePath),
          sheet: sheetName,
          matchId: "",
          tariff: "",
          seatCategory: "",
          currency: "",
          attemptedPrice: "",
          status: "Failed",
          error: "",
          timestamp: "",
          requestId: "",
          raw: [text]
        };

        continue;
      }

      if (/^•?\s*Match ID\s*:/i.test(text)) {
        if (!current) {
          current = {
            sourceFile: path.basename(filePath),
            sheet: sheetName,
            matchId: "",
            tariff: "",
            seatCategory: "",
            currency: "",
            attemptedPrice: "",
            status: "",
            error: "",
            timestamp: "",
            requestId: "",
            raw: []
          };
        }

        current.matchId = getValue(text, "Match ID");
      }

      if (!current) continue;

      current.raw.push(text);

      if (/^•?\s*Tariff\s*:/i.test(text)) current.tariff = getValue(text, "Tariff");
      else if (/^•?\s*Seat Category\s*:/i.test(text)) current.seatCategory = getValue(text, "Seat Category");
      else if (/^•?\s*Currency\s*:/i.test(text)) current.currency = getValue(text, "Currency").toUpperCase();
      else if (/^•?\s*Attempted Price\s*:/i.test(text)) current.attemptedPrice = getValue(text, "Attempted Price");
      else if (/^•?\s*Status\s*:/i.test(text)) current.status = getValue(text, "Status");
      else if (/^Error\s*:/i.test(text)) current.error = getValue(text, "Error");
      else if (/^Timestamp\s*:/i.test(text)) current.timestamp = getValue(text, "Timestamp");
      else if (/^Request ID\s*:/i.test(text)) current.requestId = getValue(text, "Request ID");
    }

    if (current) entries.push(current);
  });

  return { entries, summary };
}

function buildHtml(filePath, entries, summary) {
  entries.sort((a, b) => {
    return (
      a.matchId.localeCompare(b.matchId, undefined, { numeric: true }) ||
      (currencyOrder[a.currency] || 99) - (currencyOrder[b.currency] || 99) ||
      a.tariff.localeCompare(b.tariff) ||
      a.seatCategory.localeCompare(b.seatCategory)
    );
  });

  const matches = [...new Set(entries.map(e => e.matchId).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const groupedHtml = matches.map(matchId => {
    const matchEntries = entries.filter(e => e.matchId === matchId);

    const currenciesHtml = ["USD", "CAD", "MXN"].map(currency => {
      const group = matchEntries.filter(e => e.currency === currency);
      if (group.length === 0) return "";

      const rows = group.map(e => `
        <tr class="${safe(e.status).toLowerCase()}">
          <td>${safe(e.sourceFile)}</td>
          <td>${safe(e.sheet)}</td>
          <td>${safe(e.matchId)}</td>
          <td>${safe(e.tariff)}</td>
          <td>${safe(e.seatCategory)}</td>
          <td>${safe(e.currency)}</td>
          <td>${safe(e.attemptedPrice)}</td>
          <td>${safe(e.status)}</td>
          <td>${safe(e.error)}</td>
          <td>${safe(e.timestamp)}</td>
          <td>${safe(e.requestId)}</td>
          <td>
            <details>
              <summary>Show</summary>
              <pre>${safe(e.raw.join("\n"))}</pre>
            </details>
          </td>
        </tr>
      `).join("");

      return `
        <tr class="currency-header">
          <td colspan="12">${currency} Upload Results for ${safe(matchId)} (${group.length})</td>
        </tr>
        ${rows}
      `;
    }).join("");

    return `
      <tr class="match-header">
        <td colspan="12">Audit Log Result: ${safe(matchId)}</td>
      </tr>
      ${currenciesHtml}
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
<title>${safe(path.basename(filePath))}</title>
<style>
body { font-family: Arial, sans-serif; margin: 24px; background: #f5f5f5; }
.card { display: inline-block; background: white; padding: 15px; margin: 8px; border-radius: 8px; box-shadow: 0 1px 4px #ccc; }
table { border-collapse: collapse; width: 100%; background: white; font-size: 13px; }
th { background: #222; color: white; position: sticky; top: 0; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
.match-header td { background: #000; color: white; font-weight: bold; font-size: 18px; }
.currency-header td { background: #333; color: white; font-weight: bold; font-size: 15px; }
tr.failed { background: #ffe1e1; }
tr.success { background: #e4ffe4; }
pre { background: #111; color: white; padding: 12px; white-space: pre-wrap; min-width: 350px; }
summary { cursor: pointer; color: #0047ab; font-weight: bold; }
input { padding: 8px; width: 400px; margin: 15px 0; }
</style>
</head>

<body>

<h1>Audit Log Breakup Report</h1>
<h3>${safe(path.basename(filePath))}</h3>

<div class="card">Matches: <b>${summary.matches || matches.length}</b></div>
<div class="card">Upload Blocks: <b>${summary.total || entries.length}</b></div>
<div class="card">Success: <b>${summary.success}</b></div>
<div class="card">Failed: <b>${summary.failed}</b></div>
<div class="card">Currencies: <b>${safe(summary.currencies)}</b></div>

<br>

<input id="search" placeholder="Search match, tariff, category, error..." onkeyup="filterTable()">

<table id="auditTable">
<thead>
<tr>
<th>Audit File</th>
<th>Sheet</th>
<th>Match ID</th>
<th>Tariff</th>
<th>Seat Category</th>
<th>Currency</th>
<th>Attempted Price</th>
<th>Status</th>
<th>Error</th>
<th>Timestamp</th>
<th>Request ID</th>
<th>Raw Block</th>
</tr>
</thead>
<tbody>
${groupedHtml}
</tbody>
</table>

<script>
function filterTable() {
  const value = document.getElementById("search").value.toLowerCase();
  const rows = document.querySelectorAll("#auditTable tbody tr");

  rows.forEach(row => {
    if (row.classList.contains("match-header") || row.classList.contains("currency-header")) {
      row.style.display = "";
      return;
    }

    row.style.display = row.innerText.toLowerCase().includes(value) ? "" : "none";
  });
}
</script>

</body>
</html>`;
}

const files = fs
  .readdirSync(auditFolder)
  .filter(file => file.toLowerCase().endsWith(".xlsx"))
  .map(file => path.join(auditFolder, file));

for (const file of files) {
  const result = readAuditFile(file);
  const html = buildHtml(file, result.entries, result.summary);

  const baseName = path.basename(file, path.extname(file));
  const outputFile = path.join(auditFolder, `${baseName}.html`);

  fs.writeFileSync(outputFile, html, "utf8");

  console.log("Created:");
  console.log(outputFile);
}