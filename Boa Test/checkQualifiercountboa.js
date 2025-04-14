const fs = require('fs');

// Define the correct file path
const filePath = 'C:\\Users\\san8577\\TMFiles\\EVAL Q4 CH6 ETQ0615- 2025-04-02';

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // Normalize line endings
    data = data.replace(/\r\n/g, '\n');

    // Split into sections by "Qualifier masks level 0"
    const sections = data.split("Qualifier masks level 0");
    const headerCount = sections.length - 1;
    console.log(`Found "Qualifier masks level 0" headers: ${headerCount}`);

    // Pattern to match:
    // - Desc: Bank of America@TMON.10MX.
    // - Followed by any lines that eventually contain "type:Standard Admission"
    const matchPattern = /Desc:\s*Bank of America@TMON\.10MX\..*?\n.*?type:\s*Standard Admission/gi;

    let totalMatches = 0;

    sections.forEach((section, index) => {
        const matches = section.match(matchPattern);
        if (matches) {
            totalMatches += matches.length;

            // Print matched entries
            matches.forEach((m, i) => {
                console.log(`Match ${i + 1} in section ${index}:\n${m.trim()}\n`);
            });
        }
    });

    console.log(`Total qualifying entries found: ${totalMatches}`);

    if (totalMatches >= 25) {
        console.log("✅ At least 25 qualifying entries found.");
    } else {
        console.log(`❌ Less than 25 found. Total: ${totalMatches}`);
    }

    if (headerCount === 8) {
        console.log("✅ Found exactly 8 'Qualifier masks level 0' headers.");
    } else {
        console.log(`❌ Expected 8 headers but found ${headerCount}.`);
    }
});
