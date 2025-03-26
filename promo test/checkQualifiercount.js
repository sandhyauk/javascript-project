const fs = require('fs');

// Define the correct file path
const filePath = 'C:\\Users\\san8577\\TMFiles\\EVAL Q4 FLO EDS0614- 2025-03-14';

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // Split file content into sections based on "Qualifier masks level 2"
    const sections = data.split("Qualifier masks level 2");

    // Count the number of "Qualifier masks level 2" headers
    const headerCount = sections.length - 1;
    console.log(`Found "Qualifier masks level 2" headers: ${headerCount}`);

    // Define the pattern to search for entries containing "Desc: Community Sales@TMON"
    const salesPattern = /Desc:\s+Community Sales@TMON/g;

    let totalSalesMatches = 0;

    // Loop through each section and count "Desc: Community Sales@TMON" occurrences
    sections.forEach(section => {
        const matches = section.match(salesPattern);
        if (matches) {
            totalSalesMatches += matches.length;
        }
    });

    // Print the results
    console.log(`Occurrences of "Desc: Community Sales@TMON" under "Qualifier masks level 2" headers: ${totalSalesMatches}`);

    // Verify if at least 25 instances exist
    if (totalSalesMatches >= 25) {
        console.log("✅ At least 25 occurrences of 'Desc: Community Sales@TMON' found.");
    } else {
        console.log(`❌ Less than 25 occurrences found. Total found: ${totalSalesMatches}`);
    }

    // Validate if header count is 8
    if (headerCount === 8) {
        console.log("✅ Found exactly 8 'Qualifier masks level 2' headers.");
    } else {
        console.log(`❌ Expected 8 'Qualifier masks level 2' headers, but found ${headerCount}.`);
    }
});
