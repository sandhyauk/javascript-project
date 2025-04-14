const fs = require('fs');
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL O5 Q4 ATL EZD0616- 2025-04-03';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error("❌ Error reading the file:", err);
        return;
    }

    data = data.replace(/\r\n/g, '\n');

    // Extract O5 / Set Task Info under OSINFO AND ENABLES
    const osinfoMatch = data.match(/-+\nO\s*\/\s*OSINFO AND ENABLES\n-+\nO5 \/ Set Task Info([\s\S]*?)(?=\n[A-Z]{1,2} \/|$)/i);
    const setTaskInfo = osinfoMatch ? osinfoMatch[1].trim() : '';
    const bofaOsinfoLine = "BOFA         0       1            I       I          N-TYPE             0    1:NOQUAL  2:BOFA  3:NOHOLD  4:NOADA  5:NOVAR  6:NOUNRES  7:DYN000";

    // Normalize all lines to trim trailing spaces for accurate matching
    const setTaskLines = setTaskInfo.split('\n').map(line => line.trimEnd());
    const bofaLineFoundInSetTask = setTaskLines.includes(bofaOsinfoLine.trimEnd());

    // Process Q / QUALIFIERS AND MASK
    const mainBlocks = data.split(/Q\s*\/\s*QUALIFIERS AND MASK/gi).slice(1);
    let totalMatches = 0;
    let allSectionsPass = true;

    const bofaPattern = /BOFA.*?\n.*?Desc:\s+Bank of America@TMON\.10MX\.\n.*?type:\s*Standard Admission.*?(?=\n\n|\n[A-Z]{4}\s|\n$)/gsi;

    console.log(`✅ Found ${mainBlocks.length} 'Q / QUALIFIERS AND MASK' match groups\n`);

    mainBlocks.forEach((block, i) => {
        const matchIndex = i + 1;
        console.log(`🔷 Match Group ${matchIndex} (Q / QUALIFIERS AND MASK)\n`);

        const levelHeaders = [...block.matchAll(/Qualifier masks level (\d+)/gi)];

        if (levelHeaders.length === 0) {
            console.log(`❌ No 'Qualifier masks level' entries found in Match ${matchIndex}`);
            console.log("--------------------------------------------------\n");
            return;
        }

        const parts = block.split(/Qualifier masks level \d+/gi);

        levelHeaders.forEach((headerMatch, j) => {
            const level = headerMatch[1];
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

        // Print BOFA line check and full O5 Set Task Info section per match
        if (bofaLineFoundInSetTask) {
            console.log(`✅ Match ${matchIndex}: Found expected BOFA line in 'O5 / Set Task Info'`);
        } else {
            console.log(`❌ Match ${matchIndex}: Expected BOFA line NOT found in 'O5 / Set Task Info'`);
        }

        console.log(`📄 Match ${matchIndex}: Content under 'O5 / Set Task Info':`);
        console.log("-------------------------------------------------------------------------------");
        console.log(setTaskInfo || '❌ No content found under O5 / Set Task Info');
        console.log("-------------------------------------------------------------------------------\n");

        console.log("==================================================\n");
    });

    // Final summary
    console.log(`✅ Total occurrences of 'Desc: Bank of America@TMON.10MX.' + 'Standard Admission': ${totalMatches}`);

    if (allSectionsPass) {
        console.log("✅ Every section contains at least 25 occurrences.");
    } else {
        console.log("❌ Some sections have fewer than 25 occurrences.");
    }

    if (bofaLineFoundInSetTask) {
        console.log(`✅ Final Summary: Line FOUND in 'O5 / Set Task Info': "${bofaOsinfoLine}"`);
    } else {
        console.log(`❌ Final Summary: Line NOT found in 'O5 / Set Task Info'`);
    }
});
