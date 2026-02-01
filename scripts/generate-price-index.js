
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'public/data/prices');
const outputFile = path.join(process.cwd(), 'public/data/price_index.json');

try {
    if (!fs.existsSync(dataDir)) {
        console.error('Directory not found:', dataDir);
        process.exit(1);
    }

    const files = fs.readdirSync(dataDir);
    const index = {};

    files.forEach(file => {
        if (file.endsWith('.csv')) {
            // Assume format "Symbol_Name.csv" -> extract "Symbol"
            // Example: "2330_台積電.csv" -> "2330"
            const parts = file.split('_');
            if (parts.length >= 1) {
                const symbol = parts[0];
                index[symbol] = file;
            }
        }
    });

    fs.writeFileSync(outputFile, JSON.stringify(index, null, 2));
    console.log(`Generated index for ${Object.keys(index).length} files at ${outputFile}`);

} catch (e) {
    console.error('Error generating index:', e);
}
