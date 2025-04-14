const fs = require('fs');

// 📂 Set your input file path
const path = 'C:\\Users\\san8577\\TMFiles\\EVAL O5 Q4 ATL EZD0616- 2025-04-03';

// 📌 Patterns to look for
const bofaQualifierPattern = /BOFA[^\n]*\nDesc:\s+Bank of America@TMON\.10MX\.\nDiscount Number[^\n]*/gi;
const taskInfoSectionPattern = /-+\nO\s*\/\s*OSINFO AND ENABLES\n-+\n(O5 \/ Set Task Info[\s\S]*?)(?=\n[A-Z]{1,2} \/|$)/i;

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error("❌ Error reading the file:", err);
        return;
    }

    data = data.replace(/\r\n/g, '\n'); // Normalize line endings

    // 🎯 Match groups
    const matchGroups = data.split(/-{10,}\n\s*FIFA Club World Cup.*?(?=\n-{10,}|$)/gs).filter(Boolean);

    // 🧾 Extract O5 / Set Task Info section
    const taskInfoMatch = data.match(taskInfoSectionPattern);
    const taskInfoBlock = taskInfoMatch ? taskInfoMatch[1].trim() : '';
    const bofaLineInTaskInfo = /(?:Enab_mask|Dis_mask).*Z:\s*BOFA/.test(taskInfoBlock);

    let totalOccurrences = 0;
    let sectionsWithLessThan25 = 0;

    // 💾 Store full BOFA O5 section
    const displayedTaskInfo = bofaLineInTaskInfo ? `---------------------------------------------------------------------------\n${taskInfoBlock}\n` : '';

    // 💾 Store each full BOFA qualifier entry (3-line match)
    const extractFullBofaQualifiers = (text) => {
        const lines = text.split('\n');
        const results = [];

        for (let i = 0; i < lines.length - 2; i++) {
            if (/^BOFA\s+/.test(lines[i]) &&
                /^Desc:\s+Bank of America@TMON\.10MX\./.test(lines[i + 1]) &&
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

        if (bofaLineInTaskInfo) {
            console.log(`✅ Match ${matchNum}: Found expected BOFA line in 'O5 / Set Task Info'`);
            console.log(displayedTaskInfo);
        } else {
            console.log(`❌ Match ${matchNum}: Expected BOFA line NOT found in 'O5 / Set Task Info'`);
        }

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
            const entries = extractFullBofaQualifiers(section);

            console.log(`🟢 Qualifier masks level ${level} - Match ${matchNum}`);

            if (entries.length === 0) {
                console.log(`❌ 0 occurrences of BOFA in Match ${matchNum}, Level ${level}`);
            } else {
                console.log(`✅ ${entries.length} occurrences of BOFA in Match ${matchNum}, Level ${level}`);
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

    // ✅ Final summary
    console.log(`✅ Total occurrences of 'Desc: Bank of America@TMON.10MX.' + 'Standard Admission': ${totalOccurrences}`);
    if (sectionsWithLessThan25 === 0) {
        console.log("✅ Every section contains at least 25 occurrences.");
    } else {
        console.log(`❌ Some sections have fewer than 25 occurrences.`);
    }

    if (bofaLineInTaskInfo) {
        console.log(`✅ Final Summary: Line FOUND in 'O5 / Set Task Info'`);
    } else {
        console.log(`❌ Final Summary: Line NOT found in 'O5 / Set Task Info'`);
    }
});
