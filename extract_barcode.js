
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'fatore.HTML');
const content = fs.readFileSync(htmlPath, 'utf8');

// Regex to find the barcode base64 string
// It looks like: <img src="data:image/jpeg;base64,... "
const match = content.match(/src="data:image\/jpeg;base64,([^"]+)"/);

if (match && match[1]) {
    const base64Data = match[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Create assets dir if not exists
    const assetsDir = path.join(__dirname, 'client/public/assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    const outputPath = path.join(assetsDir, 'barcode.jpg');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Successfully saved barcode to ${outputPath}`);
} else {
    console.error('Could not find base64 barcode in fatore.HTML');
}
