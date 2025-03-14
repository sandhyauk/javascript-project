const fs = require('fs');

// Define the correct file path
const filePath = 'C:\\Users\\san8577\\TMFiles\\EVAL Q4 PHI ELF0616- 2025-03-12';

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("❌ Error reading the file:", err);
        return;
    }

    // Split content into sections using "Qualifier masks level 2"
    const sections = data.split("Qualifier masks level 2");

    // Count the number of headers
    const headerCount = sections.length - 1;
    console.log(`✅ Found "Qualifier masks level 2" headers: ${headerCount}\n`);

    // Define pattern to search for "Desc: Community Sales@TMON"
    const salesPattern = /Desc:\s+Community Sales@TMON.*/g;

    let totalSalesMatches = 0;
    let allSectionsPass = true;

    // Loop through each section and print header + occurrences
    sections.forEach((section, index) => {
        if (index === 0) return; // Skip content before the first "Qualifier masks level 2"

        console.log(`🟢 **Qualifier masks level 2 - Section ${index}**`);

        const matches = section.match(salesPattern) || [];
        totalSalesMatches += matches.length;

        if (matches.length < 25) {
            console.log(`⚠️ Section ${index} only has ${matches.length} occurrences (Less than 25 required!)`);
            allSectionsPass = false;
        }

        // Print all occurrences in this section
        matches.forEach((entry, i) => {
            console.log(`${i + 1}. ${entry}`);
        });

        console.log("\n--------------------------------------------------\n");
    });

    // Summary
    console.log(`✅ Total occurrences of "Desc: Community Sales@TMON" across all sections: ${totalSalesMatches}`);

    if (allSectionsPass) {
        console.log("✅ Every 'Qualifier masks level 2' section contains at least 25 occurrences.");
    } else {
        console.log("❌ Some sections have fewer than 25 occurrences.");
    }

    // Validate the header count
    if (headerCount === 8) {
        console.log("✅ Found exactly 8 'Qualifier masks level 2' headers.");
    } else {
        console.log(`❌ Expected 8 'Qualifier masks level 2' headers, but found ${headerCount}.`);
    }
});
