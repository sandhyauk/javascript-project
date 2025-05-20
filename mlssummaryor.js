const fs = require('fs');
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL O5 Q4 FL2C ECB0624- 2025-04-30';

// ✅ Team codes to check
const teamCodes = [
  "RBHJEV", "RJTPHR", "ZBJLQT", "9T1OV5", "HZDTO3", "5DFNIG", "QTEVJD", "TJW0DY",
  "TK2JRD", "D8TCMI", "ICMWTP", "4UPOEA", "C3EQCR", "H3FF7V", "A2R6BC", "M9FTDH",
  "FPDL9P", "XJWFL7", "CIPPT8", "ZANJMF", "ZQUD9X", "GHTLWW", "0LU6PD", "GVRQB0", "WZ4RNC"
];

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error("❌ Error reading the file:", err);
    return;
  }

  data = data.replace(/\r\n/g, '\n'); // Normalize newlines

  // 🧼 Trim content before the first match block
  const startIndex = data.indexOf("O5 / Set Task Info");
  if (startIndex === -1) {
    console.log("⚠️ No match section found.");
    return;
  }

  const trimmedData = data.slice(startIndex);

  // 🧩 Split using O5 block markers
  const matchBlocks = trimmedData.split(/(?=O5 \/ Set Task Info)/g);

  matchBlocks.forEach((block, index) => {
    const foundCodes = teamCodes.filter(code => new RegExp(`\\b${code}\\b`).test(block));
    const missingCount = teamCodes.length - foundCodes.length;

    const summary = missingCount === 0
      ? `match ${index + 1} all codes found, codes missing - 0`
      : `match ${index + 1} ${foundCodes.length} codes found, codes missing - ${missingCount}`;

    console.log(summary);
    console.log('codes found [');
    foundCodes.forEach((code, i) => {
      const comma = i < foundCodes.length - 1 ? ',' : '';
      console.log(`  "${code}"${comma}`);
    });
    console.log(']\n');
  });
});
