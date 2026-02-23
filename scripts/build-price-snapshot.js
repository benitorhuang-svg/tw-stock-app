/**
 * Build Script: Generate Latest Prices Snapshot
 *
 * Reads all CSV files from public/data/prices/ and generates
 * a single JSON file with the latest price for each stock.
 *
 * Run: node scripts/build-price-snapshot.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRICES_DIR = path.join(__dirname, '../public/data/prices');
const OUTPUT_FILE = path.join(__dirname, '../public/data/latest_prices.json');
const INDEX_FILE = path.join(__dirname, '../public/data/price_index.json');

function parseCSV(csvText) {
    if (!csvText) return null;
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',');
    const lastLine = lines[lines.length - 1];
    const values = lastLine.split(',');

    const record = {};
    headers.forEach((h, i) => {
        const val = values[i];
        if (h === 'Date') record[h] = val;
        else record[h] = parseFloat(val) || 0;
    });

    return record;
}

async function buildPriceSnapshot() {
    console.log('🚀 Building price snapshot...');

    // Read price index
    if (!fs.existsSync(INDEX_FILE)) {
        console.error('❌ price_index.json not found');
        process.exit(1);
    }

    const priceIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    const symbols = Object.keys(priceIndex);

    console.log(`📊 Processing ${symbols.length} stocks...`);

    const latestPrices = {};
    let processed = 0;
    let errors = 0;

    for (const symbol of symbols) {
        const filename = priceIndex[symbol];
        const filePath = path.join(PRICES_DIR, filename);

        try {
            if (fs.existsSync(filePath)) {
                const csvText = fs.readFileSync(filePath, 'utf-8');
                const latestRecord = parseCSV(csvText);

                if (latestRecord) {
                    // Generate realistic dummy data for demonstration
                    // In a real app, this would come from a financial API or fundamental data CSV
                    const pe = parseFloat((Math.random() * 20 + 10).toFixed(2));
                    const pb = parseFloat((Math.random() * 3 + 0.5).toFixed(2));
                    const dy = parseFloat((Math.random() * 5 + 1).toFixed(2));

                    latestPrices[symbol] = {
                        date: latestRecord.Date,
                        open: latestRecord.Open,
                        high: latestRecord.High,
                        low: latestRecord.Low,
                        close: latestRecord.Close,
                        volume: latestRecord.Volume,
                        change: latestRecord.Change,
                        changePct: latestRecord.ChangePct || 0,
                        pe: pe,
                        pb: pb,
                        yield: dy,
                    };
                    processed++;
                }
            }
        } catch (e) {
            errors++;
        }

        // Progress indicator
        if (processed % 100 === 0) {
            process.stdout.write(`\r  Processed: ${processed}/${symbols.length}`);
        }
    }

    console.log(`\n✅ Processed ${processed} stocks (${errors} errors)`);

    // Write output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(latestPrices, null, 2));

    const fileSizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);
    console.log(`📦 Output: ${OUTPUT_FILE} (${fileSizeKB} KB)`);
    console.log('🎉 Done!');
}

buildPriceSnapshot().catch(console.error);
