const fs = require('fs');

// Define the correct file path
const filePath = 'C:\\Users\\san8577\\TMFiles\\EVAL Q4 PHI ELF0616- 2025-03-12';

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // Split file content into sections based on "Qualifier masks level 2"
    const sections = data.split("Qualifier masks level 2");

    // Count the number of "Qualifier masks level 2" headers
    const headerCount = sections.length - 1;
    console.log(`✅ Found "Qualifier masks level 2" headers: ${headerCount}`);

    // Define the pattern to search for entries containing "Desc: Community Sales@TMON"
    const salesPattern = /Desc:\s+Community Sales@TMON/g;

    let totalSalesMatches = 0;
    let sectionSalesCounts = []; // Stores count per section

    // Loop through each section and count "Desc: Community Sales@TMON" occurrences
    sections.forEach((section, index) => {
        if (index === 0) return; // Skip the first entry as it is before the first "Qualifier masks level 2"

        const matches = section.match(salesPattern);
        const count = matches ? matches.length : 0;
        totalSalesMatches += count;
        sectionSalesCounts.push(count);

        console.log(`Section ${index}: ${count} occurrences of "Desc: Community Sales@TMON"`);
    });

    // Print the total occurrences across all sections
    console.log(`\n✅ Total occurrences of "Desc: Community Sales@TMON" across all sections: ${totalSalesMatches}`);

    // Verify if at least 25 instances exist **in each section**
    let allSectionsPass = sectionSalesCounts.every(count => count >= 25);

    if (allSectionsPass) {
        console.log("✅ Every 'Qualifier masks level 2' section contains at least 25 occurrences.");
    } else {
        console.log("❌ Some sections contain fewer than 25 occurrences.");
        sectionSalesCounts.forEach((count, index) => {
            if (count < 25) {
                console.log(`⚠️ Section ${index + 1} only has ${count} occurrences.`);
            }
        });
    }

    // Validate if the header count is 8
    if (headerCount === 8) {
        console.log("✅ Found exactly 8 'Qualifier masks level 2' headers.");
    } else {
        console.log(`❌ Expected 8 'Qualifier masks level 2' headers, but found ${headerCount}.`);
    }
});
