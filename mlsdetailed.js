const fs = require('fs');
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL O5 Q4 FL2I EOCS0617- 2025-04-24';
const outputPath = 'C:\\Users\\san8577\\TMFiles\\match_codes_report_FL2I.txt';

const teamCodes = [
  "ATLUTD", "AUSTIN", "CHARLO", "CHICAG", "FCCINC", "COLORA", "COLUMB", "DCUNIT", "FCDALL", "HOUSTO",
  "SPORTI", "LAGALA", "LOSANG", "INTERM", "MINNES", "CFMONT", "NASHVI", "NEWENG", "NYREDB", "NYCITY",
  "ORLAND", "PHILAD", "PORTLA", "REALSA", "SANDIE", "SANJOS", "SEATTL", "STLOUI", "TORONT", "VANCOU"
];

fs.readFile(path, 'utf8', (err, rawData) => {
  if (err) return console.error("❌ File read error:", err);

  const data = rawData.replace(/\r\n/g, '\n'); // Normalize endings

  // Split the file into blocks separated by dashed lines
  const allBlocks = data.split(/-+\n/);

  let matchNumber = 1;
  let output = '';
  let currentGroup = [];
  let currentFound = new Set();
  const foundEntries = new Map();

  const flushMatchGroup = () => {
    if (currentGroup.length === 0) return;

    const codesArray = Array.from(currentFound);
    const missing = teamCodes.filter(code => !currentFound.has(code));

    output += `📘 Match ${matchNumber}:\n`;
    if (codesArray.length === 30) {
      output += `✅ All 30 codes found. Missing (0)\n\n`;
    } else {
      output += `✅ Present (${codesArray.length}): ${codesArray.join(', ')}\n`;
      output += `❌ Missing (${missing.length}): ${missing.join(', ')}\n\n`;
    }

    codesArray.forEach(code => {
      output += foundEntries.get(code) + '\n\n';
    });

    output += '-'.repeat(80) + '\n\n';

    // Reset for next group
    matchNumber++;
    currentGroup = [];
    currentFound.clear();
    foundEntries.clear();
  };

  for (let block of allBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    for (let code of teamCodes) {
      if (trimmed.includes(code) && !currentFound.has(code)) {
        const pattern = new RegExp(
          `${code}\\s+0\\s+0\\s+P\\S*\\s+P\\S*\\s+M-TYPE\\s+0[^]*?2:${code}[^]*?Desc:[^\\n]*\\nDiscount Number \\(9 - SOLD type:Promotional Discount - % OFF\\)`,
          'i'
        );

        const match = trimmed.match(pattern);
        if (match) {
          currentFound.add(code);
          foundEntries.set(code, match[0].trim());
        }
      }
    }

    currentGroup.push(trimmed);

    // If we hit 30 codes found, flush this group as a complete match
    if (currentFound.size === 30) {
      flushMatchGroup();
    }
  }

  // Flush any remaining group that didn’t reach 30 codes
  flushMatchGroup();

  fs.writeFileSync(outputPath, output.trim(), 'utf8');
  console.log(`✅ Output written to: ${outputPath}`);
});
