
const fs = require('fs');
const path = require('path');

const targetFile = 'fatore.HTML';
const outDir = 'client/public/assets';
const outName = 'barcode.jpg';

console.log(`Looking for ${targetFile} in ${process.cwd()}`);

if (!fs.existsSync(targetFile)) {
    console.error(`File ${targetFile} not found!`);
    process.exit(1);
}

try {
    const content = fs.readFileSync(targetFile, 'utf8');
    console.log(`Read ${content.length} bytes.`);

    // Regex for base64
    const regex = /src=["']data:image\/jpeg;base64,([^"']+)["']/;
    const match = content.match(regex);

    if (match && match[1]) {
        console.log(`Found base64 string (length: ${match[1].length})`);
        const buffer = Buffer.from(match[1], 'base64');

        if (!fs.existsSync(outDir)) {
            console.log(`Creating directory ${outDir}`);
            fs.mkdirSync(outDir, { recursive: true });
        }

        const outFile = path.join(outDir, outName);
        fs.writeFileSync(outFile, buffer);
        console.log(`Success! Saved to ${outFile}`);
    } else {
        console.error("Pattern not found in file.");
        // Debug: print a substring where it might be
        const idx = content.indexOf("data:image/jpeg;base64");
        if (idx !== -1) {
            console.log("Found substring at index " + idx);
            console.log("Snippet: " + content.substring(idx, idx + 50));
        }
    }
} catch (e) {
    console.error("Error:", e);
}
