const fs = require('fs');

// 📂 Set your input file path
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL O5 Q4 LA2 ERB0615- 2025-04-15';

// 📌 Patterns to look for COCA block and O5 section
const cocaQualifierPattern = /COCA[^\n]*\nDesc:\s+Coca-Cola Offer@TMON\.10MX\.\nDiscount Number[^\n]*/gi;
const taskInfoSectionPattern = /-+\nO\s*\/\s*OSINFO AND ENABLES\n-+\n(O5 \/ Set Task Info[\s\S]*?)(?=\n[A-Z]{1,2} \/|$)/i;

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error("❌ Error reading the file:", err);
        return;
    }

    data = data.replace(/\r\n/g, '\n'); // Normalize line endings

    // 🎯 Match groups by FIFA Club World Cup
  
    const matchGroups = data.match(/-{10,}\n\s*FIFA Club World Cup[\s\S]*?(?=\n-{10,}|$)/g) || [];

    // 🧾 Extract O5 / Set Task Info section
    const taskInfoMatch = data.match(taskInfoSectionPattern);
    const taskInfoBlock = taskInfoMatch ? taskInfoMatch[1].trim() : '';
    const cocaLineInTaskInfo = /(?:Enab_mask|Dis_mask).*Z:\s*COCA/.test(taskInfoBlock);

    let totalOccurrences = 0;
    let sectionsWithLessThan25 = 0;

    // 💾 Store full COCA O5 section
    const displayedTaskInfo = cocaLineInTaskInfo ? `---------------------------------------------------------------------------\n${taskInfoBlock}\n` : '';

    // 💾 Extract 3-line COCA entries
    const extractFullCocaQualifiers = (text) => {
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length - 2; i++) {
            if (/^COCA\s+/.test(lines[i]) &&
                /^Desc:\s+Coca-Cola Offer@TMON\.10MX\./.test(lines[i + 1]) &&
                /^Discount Number/.test(lines[i + 2])) {
                results.push([lines[i], lines[i + 1], lines[i + 2]].join('\n'));
            }
        }
        return results;
    };

    console.log(`✅ Found ${matchGroups.length} Match Groups\n`);

    matchGroups.forEach((_, matchIndex) => {
        const matchNum = matchIndex + 1;
        console.log(`🔷 Match Group ${matchNum}`);

        if (cocaLineInTaskInfo) {
            console.log(`✅ Match ${matchNum}: Found expected COCA line in 'O5 / Set Task Info'`);
            console.log(displayedTaskInfo);
        } else {
            console.log(`❌ Match ${matchNum}: Expected COCA line NOT found in 'O5 / Set Task Info'`);
        }

        // 🔍 Extract qualifier blocks
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
            const entries = extractFullCocaQualifiers(section);

            console.log(`🟢 Qualifier masks level ${level} - Match ${matchNum}`);

            if (entries.length === 0) {
                console.log(`❌ 0 occurrences of COCA in Match ${matchNum}, Level ${level}`);
            } else {
                console.log(`✅ ${entries.length} occurrences of COCA in Match ${matchNum}, Level ${level}`);
                entries.forEach((entry, idx) => {
                    console.log(`📌 Entry ${idx + 1}:\n${entry}\n`);
                });
            }

            if (entries.length < 25) {
                console.log(`⚠️ Only ${entries.length} occurrences (Less than 25 required!)`);
                sectionsWithLessThan25++;
            }

            totalOccurrences += entries.length;
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

    if (cocaLineInTaskInfo) {
        console.log(`✅ Final Summary: Line FOUND in 'O5 / Set Task Info'`);
    } else {
        console.log(`❌ Final Summary: Line NOT found in 'O5 / Set Task Info'`);
    }
});
