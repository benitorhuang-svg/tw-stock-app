/**
 * fetch-forensic.mjs - Mock Forensic Data Generator
 * Generates realistic data for all forensic tables (Distribution, Gov, Brokers, Lending, Directors, Dealers).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', 'public', 'data', 'chips');

async function main() {
    console.log('\n🔍 Initializing Professional Forensic Data Scan...');

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    console.log(`🚀 Generating Forensic snapshots for ${dateStr}...`);

    // Ensure Directories
    const dirs = ['distribution', 'government', 'brokers', 'lending', 'director', 'dealer_details'];
    dirs.forEach(d => {
        const p = path.join(BASE_DIR, d);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const totalStocks = 1288;
    const data = {
        distribution: [],
        government: [],
        brokers: [],
        lending: [],
        director: [],
        dealer_details: [],
    };

    for (let i = 0; i < totalStocks; i++) {
        const symbol = (2330 + i).toString(); // Start with some real symbols then increment

        data.distribution.push({
            symbol,
            total_shareholders: Math.floor(Math.random() * 50000) + 1000,
            large_holder_400_ratio: Math.random() * 40 + 20,
            large_holder_1000_ratio: Math.random() * 30 + 10,
            small_holder_under_10_ratio: Math.random() * 20 + 5,
            avg_shares_per_holder: Math.random() * 5 + 0.5,
        });

        data.government.push({
            symbol,
            net_buy_shares: Math.floor(Math.random() * 2000) - 1000,
            net_buy_amount: Math.floor(Math.random() * 100000) - 50000,
        });

        data.brokers.push({
            symbol,
            buy_top5_shares: Math.floor(Math.random() * 5000),
            sell_top5_shares: Math.floor(Math.random() * 5000),
            net_main_player_shares: Math.floor(Math.random() * 2000) - 1000,
            concentration_ratio: Math.random() * 15 - 5,
        });

        data.lending.push({
            symbol,
            lending_balance: Math.floor(Math.random() * 10000),
            shorting_balance: Math.floor(Math.random() * 5000),
            limit: Math.floor(Math.random() * 20000),
        });

        data.director.push({
            symbol,
            ratio: Math.random() * 40 + 5,
            pawn: Math.random() * 15,
            change: Math.floor(Math.random() * 500) - 200,
        });

        data.dealer_details.push({
            symbol,
            prop: Math.floor(Math.random() * 1000) - 500,
            hedge: Math.floor(Math.random() * 1000) - 500,
        });
    }

    // Save files
    Object.keys(data).forEach(k => {
        fs.writeFileSync(
            path.join(BASE_DIR, k, `${dateStr}.json`),
            JSON.stringify(data[k], null, 2)
        );
    });

    console.log('\n✅ Forensic scan complete.');
    Object.keys(data).forEach(k => console.log(`📁 ${k}: ${data[k].length} records`));
}

main();
