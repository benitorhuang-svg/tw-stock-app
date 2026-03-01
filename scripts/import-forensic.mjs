/**
 * import-forensic.mjs — Pro Forensic Data Importer
 * Imports all forensic datasets into SQLite.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'public', 'data', 'stocks.db');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data', 'chips');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');
db.pragma('foreign_keys = OFF');

async function main() {
    console.log(`🚀 正在匯入多源鑑識資料至 ${DB_PATH}...`);

    // 自動偵測最新可用的鑑識資料日期（chips 目錄中最新的 JSON 檔）
    const probeDir = path.join(DATA_DIR, 'dealer_details');
    let dateStr;
    if (fs.existsSync(probeDir)) {
        const files = fs.readdirSync(probeDir)
            .filter(f => /^\d{8}\.json$/.test(f))
            .sort()
            .reverse();
        if (files.length > 0) dateStr = files[0].replace('.json', '');
    }
    if (!dateStr) dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dbDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    console.log(`📅 偵測到最新資料日期: ${dbDate}`);


    const importers = [
        {
            name: 'Shareholder Distribution (TDCC 真實資料)',
            path: path.join(
                ROOT_DIR,
                'public',
                'data',
                'forensic',
                'shareholder_distribution.json'
            ),
            sql: `INSERT OR REPLACE INTO shareholder_distribution (symbol, date, total_shareholders, large_holder_400_ratio, large_holder_1000_ratio) VALUES (?, ?, ?, ?, ?)`,
            mapper: i => [
                i.symbol,
                i.date,
                i.total_shareholders,
                i.large_holder_400_ratio,
                i.large_holder_1000_ratio,
            ],
            isArray: true,
        },
        {
            name: 'Margin Short (TWSE 真實資料)',
            path: path.join(ROOT_DIR, 'public', 'data', 'forensic', 'margin_short.json'),
            sql: `INSERT OR REPLACE INTO margin_short (symbol, date, margin_bal, margin_net, short_bal, short_net) VALUES (?, ?, ?, ?, ?, ?)`,
            mapper: i => [i.symbol, i.date, i.margin_bal, i.margin_net, i.short_bal, i.short_net],
            isArray: true,
        },
        {
            name: 'Security Lending (TWSE/TPEx 真實資料)',
            path: path.join(DATA_DIR, 'lending', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO security_lending (symbol, date, lending_balance, short_selling_balance, short_selling_limit) VALUES (?, ?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.lending_balance, i.shorting_balance, i.limit],
        },
        {
            name: 'Director Holdings (TWSE/TPEx)',
            path: path.join(DATA_DIR, 'director', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO director_holdings (symbol, date, director_holding_ratio, pawn_ratio, insider_net_change) VALUES (?, ?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.ratio, i.pawn, i.change],
        },
        {
            name: 'Dealer Details (TWSE TWT43U + TPEx 真實資料)',
            path: path.join(DATA_DIR, 'dealer_details', `${dateStr}.json`),
            sql: `INSERT OR REPLACE INTO dealer_details (symbol, date, prop_buy, hedge_buy) VALUES (?, ?, ?, ?)`,
            mapper: i => [i.symbol, dbDate, i.prop, i.hedge],
        },
    ];

    for (const importer of importers) {
        if (fs.existsSync(importer.path)) {
            console.log(`📊 正在匯入 ${importer.name}（${dbDate}）...`);
            const data = JSON.parse(fs.readFileSync(importer.path, 'utf8'));
            const stmt = db.prepare(importer.sql);
            const batch = db.transaction(items => {
                const targetArray = importer.isArray
                    ? items
                    : Array.isArray(items)
                      ? items
                      : [items];
                for (const item of targetArray) {
                    try {
                        const args = importer.mapper(item);
                        stmt.run(...args);
                    } catch (e) {}
                }
            });
            batch(data);
            console.log(`✅ 已處理 ${Array.isArray(data) ? data.length : 1} 筆紀錄。`);
        } else {
            console.warn(`⚠️ 已跳過 ${importer.name}：檔案不存在。`);
        }
    }

    // ── 匯入三大法人市場彙總 → government_chips ──
    const govPath = path.join(DATA_DIR, 'government', `${dateStr}.json`);
    if (fs.existsSync(govPath)) {
        console.log(`📊 正在匯入 Government Chips — 三大法人市場彙總（${dbDate}）...`);
        const govData = JSON.parse(fs.readFileSync(govPath, 'utf8'));
        const govStmt = db.prepare(
            `INSERT OR REPLACE INTO government_chips (symbol, date, net_buy_shares, net_buy_amount) VALUES (?, ?, ?, ?)`
        );
        const govBatch = db.transaction(items => {
            for (const g of items) {
                // symbol = institution category, net_buy_shares = 0 (API only provides amounts), net_buy_amount = actual TWD
                govStmt.run(g.category, dbDate, 0, g.net_amount);
            }
        });
        govBatch(govData);
        console.log(`✅ 已匯入 ${govData.length} 筆法人市場彙總。`);
    } else {
        console.warn('⚠️ 已跳過 Government Chips：檔案不存在。');
    }

    // ── 匯入除權除息 → dividends ──
    const divPath = path.join(ROOT_DIR, 'public', 'data', 'dividends.json');
    if (fs.existsSync(divPath)) {
        console.log(`📊 正在匯入 Dividends — 除權除息歷史...`);
        const divData = JSON.parse(fs.readFileSync(divPath, 'utf8'));
        const divStmt = db.prepare(
            `INSERT OR REPLACE INTO dividends (symbol, year, ex_dividend_date, dividend) VALUES (?, ?, ?, ?)`
        );
        const divBatch = db.transaction(items => {
            for (const d of items) {
                divStmt.run(d.symbol, d.year, d.ex_dividend_date, d.dividend);
            }
        });
        divBatch(divData);
        console.log(`✅ 已匯入 ${divData.length} 筆除權除息紀錄。`);
    } else {
        console.warn('⚠️ 已跳過 Dividends：檔案不存在。');
    }

    // ── 衍算主力法人集中度 → major_broker_chips ──
    console.log(`📊 正在衍算 Major Broker Chips — 法人集中度...`);
    try {
        // 從 chips + price_history 衍算法人集中度
        const chipsRows = db.prepare(`
            SELECT c.symbol, c.date, c.foreign_inv, c.invest_trust, c.dealer, p.volume
            FROM chips c
            JOIN price_history p ON c.symbol = p.symbol AND c.date = p.date
            WHERE p.volume > 0
        `).all();

        const brokerStmt = db.prepare(`
            INSERT OR REPLACE INTO major_broker_chips (symbol, date, buy_top5_shares, sell_top5_shares, net_main_player_shares, concentration_ratio)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const brokerBatch = db.transaction(rows => {
            for (const r of rows) {
                const vals = [r.foreign_inv || 0, r.invest_trust || 0, r.dealer || 0];
                const buyTotal = vals.filter(v => v > 0).reduce((a, b) => a + b, 0);
                const sellTotal = Math.abs(vals.filter(v => v < 0).reduce((a, b) => a + b, 0));
                const net = vals.reduce((a, b) => a + b, 0);
                const concentration = r.volume > 0 ? Math.abs(net) / r.volume : 0;
                brokerStmt.run(r.symbol, r.date, buyTotal, sellTotal, net, Math.round(concentration * 10000) / 10000);
            }
        });
        brokerBatch(chipsRows);
        console.log(`✅ 已衍算 ${chipsRows.length} 筆法人集中度。`);
    } catch (e) {
        console.warn(`⚠️ 衍算 Major Broker Chips 失敗：${e.message}`);
    }

    db.close();
    console.log('\n✨ 所有鑑識資料集已同步完成。');
}

main().catch(err => {
    console.error('❌ 匯入失敗：', err.message);
    process.exit(1);
});
