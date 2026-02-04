const fs = require('fs');
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL S3 -RE ATL EZD0616-- 2025-05-20';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error("❌ Error reading the file:", err);
    return;
  }

  // Normalize newlines and remove lines with "promocode"
  const filteredLines = data.replace(/\r\n/g, '\n')
                            .split('\n')
                            .filter(line => !line.toLowerCase().includes('promocode'));

  const filteredData = filteredLines.join('\n');

  // Split the file into blocks by each match based on the match header pattern
  const matchBlocks = filteredData.split(/(?=TicketMaster Event Vital Analysis Log \()/g);

  matchBlocks.forEach((block, index) => {
    // Look for the PLevels section inside the match block
    const plevelsMatch = block.match(/PLevels[\s\S]+?-{10,}/);
    if (plevelsMatch) {
      const plevelsText = plevelsMatch[0];
      const numberPattern = /\d+(?:-\d+)?/g;
      const numberMatches = plevelsText.match(numberPattern) || [];

      const allNumbers = [];
      numberMatches.forEach(item => {
        if (item.includes('-')) {
          const [start, end] = item.split('-').map(Number);
          for (let i = start; i <= end; i++) {
            allNumbers.push(i);
          }
        } else {
          allNumbers.push(Number(item));
        }
      });

      const highest = Math.max(...allNumbers);
      console.log(`✅ Match ${index + 1}: Highest PLevels number is ${highest}`);
    } else {
      console.log(`⚠️ Match ${index + 1}: No PLevels section found.`);
    }
  });
});
