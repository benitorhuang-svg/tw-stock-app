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

    // Dynamically read the prices directory to get all available stocks
    if (!fs.existsSync(PRICES_DIR)) {
        console.error('❌ Prices directory not found');
        process.exit(1);
    }

    const files = fs.readdirSync(PRICES_DIR).filter(f => f.endsWith('.csv'));
    const priceIndex = {};
    files.forEach(file => {
        const symbol = file.split('_')[0];
        if (symbol) priceIndex[symbol] = file;
    });

    const symbols = Object.keys(priceIndex);

    console.log(`📊 Processing ${symbols.length} stocks...`);

    // Load real fundamental data
    const MONTHLY_STATS_FILE = path.join(__dirname, '../public/data/monthly_stats.json');
    const REVENUE_FILE = path.join(__dirname, '../public/data/revenue.json');
    const FINANCIALS_FILE = path.join(__dirname, '../public/data/financials.json');

    const statsMap = {};
    if (fs.existsSync(MONTHLY_STATS_FILE)) {
        const stats = JSON.parse(fs.readFileSync(MONTHLY_STATS_FILE, 'utf-8'));
        for (const s of stats) {
            statsMap[s.symbol] = s;
        }
        console.log(`  📈 Loaded ${stats.length} monthly stats (PE/PB/Yield)`);
    }

    const revenueMap = {};
    if (fs.existsSync(REVENUE_FILE)) {
        const rev = JSON.parse(fs.readFileSync(REVENUE_FILE, 'utf-8'));
        for (const r of rev) {
            revenueMap[r.symbol] = r;
        }
        console.log(`  💰 Loaded ${rev.length} revenue records`);
    }

    const financialsMap = {};
    if (fs.existsSync(FINANCIALS_FILE)) {
        const fin = JSON.parse(fs.readFileSync(FINANCIALS_FILE, 'utf-8'));
        for (const f of fin) {
            financialsMap[f.symbol] = f;
        }
        console.log(`  📊 Loaded ${fin.length} financial records`);
    }

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
                    const stat = statsMap[symbol];
                    const rev = revenueMap[symbol];
                    const fin = financialsMap[symbol];

                    latestPrices[symbol] = {
                        date: latestRecord.Date,
                        open: latestRecord.Open,
                        high: latestRecord.High,
                        low: latestRecord.Low,
                        close: latestRecord.Close,
                        volume: latestRecord.Volume,
                        change: latestRecord.Change,
                        changePct: latestRecord.ChangePct || 0,
                        pe: stat?.peRatio || 0,
                        pb: stat?.pbRatio || 0,
                        yield: stat?.dividendYield || 0,
                        revenueYoY: rev?.revenueYoY || 0,
                        eps: fin?.eps || 0,
                        grossMargin: fin?.grossMargin || 0,
                        operatingMargin: fin?.operatingMargin || 0,
                        netMargin: fin?.netMargin || 0,
                    };
                    processed++;
                }
            }
        } catch (e) {
            errors++;
        }

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
