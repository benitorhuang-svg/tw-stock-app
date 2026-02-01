/**
 * Data Optimization Script
 * 
 * Consolidates individual stock history CSVs into a single optimized JSON file
 * to minimize disk I/O on Windows.
 * 
 * Run: node scripts/optimize-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICES_DIR = path.join(__dirname, '..', 'public', 'data', 'prices');
const INDEX_FILE = path.join(__dirname, '..', 'public', 'data', 'price_index.json');
const MASTER_FILE = path.join(__dirname, '..', 'public', 'data', 'history_master.json');

const MAX_HISTORY_DAYS = 120; // Keep 120 days for quick view

function parseCSV(csvText) {
    if (!csvText) return [];
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');

    // Process only last N days
    const targetLines = lines.slice(-MAX_HISTORY_DAYS);

    return targetLines.map(line => {
        const values = line.split(',');
        const record = {};
        headers.forEach((h, i) => {
            const val = values[i];
            if (h === 'Date') record[h] = val;
            else record[h] = parseFloat(val) || 0;
        });
        return record;
    });
}

async function optimize() {
    console.log('🚀 Optimizing Data for Windows Performance...');

    if (!fs.existsSync(INDEX_FILE)) {
        console.error('❌ price_index.json found');
        return;
    }

    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    const symbols = Object.keys(index);
    const masterData = {};

    console.log(`📦 Consolidating ${symbols.length} files...`);

    let count = 0;
    for (const symbol of symbols) {
        const filename = index[symbol];
        const filePath = path.join(PRICES_DIR, filename);

        if (fs.existsSync(filePath)) {
            const csv = fs.readFileSync(filePath, 'utf-8');
            masterData[symbol] = parseCSV(csv);
            count++;
        }

        if (count % 100 === 0) {
            process.stdout.write(`\r  Optimized: ${count}/${symbols.length}`);
        }
    }

    console.log(`\n✅ Successfully merged ${count} stocks.`);

    // Write condensed JSON
    console.log('💾 Saving master file (history_master.json)...');
    fs.writeFileSync(MASTER_FILE, JSON.stringify(masterData));

    const sizeMB = (fs.statSync(MASTER_FILE).size / (1024 * 1024)).toFixed(2);
    console.log(`✨ Done! Master file size: ${sizeMB} MB`);
}

optimize().catch(console.error);
