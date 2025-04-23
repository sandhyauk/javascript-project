const fs = require('fs');

// 🔧 Set your input file path
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL O5 Q4 CH6 ETQ0615- 2025-04-15';

// Regular expression to match COCA qualifier entries
const cocaQualifierRegex = /COCA.*?\n.*?Desc:\s+Coca-Cola Offer@TMON\.10MX\.\n.*?type:\s*Standard Admission/gi;

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error("❌ Error reading the file:", err);
        return;
    }

    data = data.replace(/\r\n/g, '\n'); // Normalize newlines

    // 🎯 Correct match group extraction using .match to avoid phantom match 5
    const matchGroups = data.match(/-{10,}\n\s*FIFA Club World Cup[\s\S]*?(?=\n-{10,}|$)/g) || [];

    // Extract O5 / Set Task Info section
    const osInfoMatch = data.match(/-+\nO\s*\/\s*OSINFO AND ENABLES\n-+\nO5 \/ Set Task Info([\s\S]*?)(?=\n[A-Z]{1,2} \/|$)/i);
    const taskInfoBlock = osInfoMatch ? osInfoMatch[1].trim() : '';

    // ✅ Check for COCA in Enab_mask or Dis_mask line
    const cocaLineFoundInSetTask = /(?:Enab_mask|Dis_mask).*Z:\s*COCA/.test(taskInfoBlock);

    let totalOccurrences = 0;
    let sectionsWithLessThan25 = 0;

    console.log(`✅ Found ${matchGroups.length} Match Groups\n`);

    matchGroups.forEach((matchText, matchIndex) => {
        const matchNum = matchIndex + 1;
        console.log(`🔷 Match Group ${matchNum}`);

        if (cocaLineFoundInSetTask) {
            console.log(`✅ Match ${matchNum}: Found expected COCA line in 'O5 / Set Task Info'`);
            console.log(`---------------------------------------------------------------------------\n${taskInfoBlock}\n`);
        } else {
            console.log(`❌ Match ${matchNum}: Expected COCA line NOT found in 'O5 / Set Task Info'`);
        }

        // 🔍 Extract corresponding Q / QUALIFIERS AND MASK section
        const qualifierRegex = new RegExp(`Q\\s*/\\s*QUALIFIERS AND MASK[\\s\\S]*?(?=Q\\s*/|$)`, 'gi');
        const allQualifierBlocks = [...data.matchAll(qualifierRegex)].map(m => m[0]);
        const qualifierBlock = allQualifierBlocks[matchIndex];

        if (!qualifierBlock) {
            console.log(`❌ No 'Q / QUALIFIERS AND MASK' found for Match ${matchNum}`);
            console.log("--------------------------------------------------\n");
            return;
        }

        const levelMatches = [...qualifierBlock.matchAll(/Qualifier masks level (\d+)/gi)];
        const levelParts = qualifierBlock.split(/Qualifier masks level \d+/gi);

        levelMatches.forEach((lvlMatch, levelIndex) => {
            const level = lvlMatch[1];
            const section = levelParts[levelIndex + 1] || '';
            const matches = [...section.matchAll(cocaQualifierRegex)];

            console.log(`🟢 Qualifier masks level ${level} - Match ${matchNum}`);

            if (matches.length === 0) {
                console.log(`❌ 0 occurrences of COCA in Match ${matchNum}, Level ${level}`);
            } else {
                console.log(`✅ ${matches.length} occurrences of COCA in Match ${matchNum}, Level ${level}`);
                matches.forEach((match, idx) => {
                    console.log(`📌 Entry ${idx + 1}:\n${match[0]}\n`);
                });
            }

            if (matches.length < 25) {
                console.log(`⚠️ Only ${matches.length} occurrences (Less than 25 required!)`);
                sectionsWithLessThan25++;
            }

            totalOccurrences += matches.length;
        });

        console.log("--------------------------------------------------\n");
    });

    // 🧾 Final summary
    console.log(`✅ Total occurrences of 'Desc: Coca-Cola Offer@TMON.10MX.' + 'Standard Admission': ${totalOccurrences}`);
    if (sectionsWithLessThan25 === 0) {
        console.log("✅ Every section contains at least 25 occurrences.");
    } else {
        console.log(`❌ Some sections have fewer than 25 occurrences.`);
    }

    if (cocaLineFoundInSetTask) {
        console.log(`✅ Final Summary: Line FOUND in 'O5 / Set Task Info'`);
    } else {
        console.log(`❌ Final Summary: Line NOT found in 'O5 / Set Task Info'`);
    }
});
