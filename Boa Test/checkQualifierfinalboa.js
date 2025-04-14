const fs = require('fs');

// Define the correct file path
//const filePath = 'C:\\Users\\san8577\\TMFiles\\EVAL Q4 CH6 ETQ0615- 2025-04-02';  
const filePath = 'C:\\Users\\san8577\\TMFiles\\EVAL Q4 SCS ENS0620- 2025-04-02'; 


fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("❌ Error reading the file:", err);
        return;
    }

    // Normalize line endings
    data = data.replace(/\r\n/g, '\n');

    // Split by main "Q / QUALIFIERS AND MASK" blocks
    const mainBlocks = data.split(/Q\s*\/\s*QUALIFIERS AND MASK/gi).slice(1); // skip preamble
    let totalMatches = 0;
    let allSectionsPass = true;

    // Match full BOFA entry with the TMON Desc and Standard Admission type
    const bofaPattern = /BOFA.*?\n.*?Desc:\s+Bank of America@TMON\.10MX\.\n.*?type:\s*Standard Admission.*?(?=\n\n|\n[A-Z]{4}\s|\n$)/gsi;

    console.log(`✅ Found ${mainBlocks.length} 'Q / QUALIFIERS AND MASK' match groups\n`);

    mainBlocks.forEach((block, i) => {
        const matchIndex = i + 1;
        console.log(`🔷 Match Group ${matchIndex} (Q / QUALIFIERS AND MASK)\n`);

        // Match all "Qualifier masks level X" within this block (0, 1, 2, 3, etc.)
        const levelHeaders = [...block.matchAll(/Qualifier masks level (\d+)/gi)];

        if (levelHeaders.length === 0) {
            console.log(`❌ No 'Qualifier masks level' entries found in Match ${matchIndex}`);
            console.log("--------------------------------------------------\n");
            return;
        }

        // Split the block by each header so we can isolate content per level
        const parts = block.split(/Qualifier masks level \d+/gi);

        levelHeaders.forEach((headerMatch, j) => {
            const level = headerMatch[1]; // actual level number
            const section = parts[j + 1] || '';

            console.log(`🟢 Qualifier masks level ${level} - Match ${matchIndex}`);

            const matches = section.match(bofaPattern) || [];

            if (matches.length === 0) {
                console.log(`❌ 0 occurrences of BOFA in Match ${matchIndex}, Level ${level}`);
            }

            totalMatches += matches.length;

            if (matches.length < 25) {
                console.log(`⚠️ Only ${matches.length} occurrences (Less than 25 required!)`);
                allSectionsPass = false;
            }

            matches.forEach((entry, idx) => {
                console.log(`${idx + 1}.\n${entry.trim()}\n`);
            });

            console.log("--------------------------------------------------\n");
        });
    });

    // ✅ Summary
    console.log(`✅ Total occurrences of 'Desc: Bank of America@TMON.10MX.' + 'Standard Admission': ${totalMatches}`);

    if (allSectionsPass) {
        console.log("✅ Every section contains at least 25 occurrences.");
    } else {
        console.log("❌ Some sections have fewer than 25 occurrences.");
    }
});
