/**
 * scheduler.mjs — Forensic Data Orchestrator
 * Coordinates all crawlers to sync market data after close.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRAWLER_DIR = path.join(__dirname, 'crawlers');

const tasks = [
    { name: 'TWSE_Institutional', script: 'twse-chips.mjs' },
    { name: 'TDCC_Shareholders', script: 'tdcc-shareholders.mjs' },
    { name: 'TWSE_Margin', script: 'twse-margin.mjs' },
];

async function runAll() {
    console.log(`\n📅 [${new Date().toLocaleString()}] Starting Forensic Data Sync...`);

    for (const task of tasks) {
        try {
            console.log(`\n🚀 Executing ${task.name}...`);
            const scriptPath = path.join(CRAWLER_DIR, task.script);
            execSync(`node ${scriptPath}`, { stdio: 'inherit' });
        } catch (err) {
            console.error(`❌ Task ${task.name} failed: ${err.message}`);
        }
    }

    console.log('\n✨ All synchronization tasks completed.');
}

runAll();
