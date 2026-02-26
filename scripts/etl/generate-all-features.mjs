/**
 * generate-all-features.mjs — AI & Forensic Feature Extraction
 * Calculates technical and forensic features from raw price & chip data.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { SMA, RSI, MACD, Stochastic } from 'technicalindicators';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'stocks.db');

const db = new Database(DB_PATH);

async function generate() {
    console.log('🧪 Starting Forensic Feature Extraction (M1 ETL)...');

    // 1. Reset / Ensure Feature Tables Exist (Lean approach)
    db.exec(`
        DROP TABLE IF EXISTS chip_features;
        DROP TABLE IF EXISTS valuation_features;
        DROP TABLE IF EXISTS tech_features;

        CREATE TABLE chip_features (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            foreign_buy INTEGER,
            trust_buy INTEGER,
            dealer_buy INTEGER,
            total_inst_buy INTEGER,
            concentration_5d REAL,
            PRIMARY KEY (symbol, date)
        );

        CREATE TABLE IF NOT EXISTS valuation_features (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            pe_ratio REAL,
            pb_ratio REAL,
            dividend_yield REAL,
            PRIMARY KEY (symbol, date)
        );

        CREATE TABLE IF NOT EXISTS tech_features (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            ma5 REAL,
            ma20 REAL,
            rsi_14 REAL,
            macd_diff REAL,
            macd_dea REAL,
            kd_k REAL,
            kd_d REAL,
            PRIMARY KEY (symbol, date)
        );
    `);

    // 2. Fetch Symbols
    const symbols = db.prepare('SELECT symbol FROM stocks').all();
    console.log(`📊 Processing features for ${symbols.length} stocks...`);

    // 3. Populate Valuation Features (Copy from latest_prices)
    db.exec(`
        INSERT OR REPLACE INTO valuation_features (symbol, date, pe_ratio, pb_ratio, dividend_yield)
        SELECT symbol, date, ROUND(pe, 2) as pe_ratio, ROUND(pb, 2) as pb_ratio, ROUND(yield, 2) as dividend_yield
        FROM latest_prices;
    `);
    console.log('   ✅ Valuation features synced.');

    // 4. Calculate Chip Concentration (Simplified 5-day sum)
    const insertChipFeature = db.prepare(`
        INSERT OR REPLACE INTO chip_features (symbol, date, foreign_buy, trust_buy, dealer_buy, total_inst_buy, concentration_5d)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const calcChipTx = db.transaction(() => {
        let count = 0;
        for (const { symbol } of symbols) {
            const history = db
                .prepare(
                    `
                SELECT c.date, c.foreign_inv, c.invest_trust, c.dealer, ph.volume
                FROM chips c
                JOIN price_history ph ON c.symbol = ph.symbol AND c.date = ph.date
                WHERE c.symbol = ?
                ORDER BY c.date DESC
                LIMIT 5
            `
                )
                .all(symbol);

            if (history.length === 0) continue;
            count++;

            const latest = history[0];
            const netFlow = history.reduce(
                (sum, h) => sum + (h.foreign_inv || 0) + (h.invest_trust || 0) + (h.dealer || 0),
                0
            );
            const totalVol = history.reduce((sum, h) => sum + (h.volume || 0), 1); // Avoid div by zero
            const concentration = (netFlow / totalVol) * 100;

            insertChipFeature.run(
                symbol,
                latest.date,
                latest.foreign_inv,
                latest.invest_trust,
                latest.dealer,
                latest.foreign_inv + latest.invest_trust + latest.dealer,
                Number(concentration.toFixed(2))
            );
        }
        console.log(`      (Processed ${count} stocks with chip history)`);
    });

    calcChipTx();
    console.log('   ✅ Chip concentration (5D) calculated.');

    // 5. Tech Features (RSI, MACD, KD, MA)
    const insertTechFeature = db.prepare(`
        INSERT OR REPLACE INTO tech_features (symbol, date, ma5, ma20, rsi_14, macd_diff, macd_dea, kd_k, kd_d)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const calcTechTx = db.transaction(() => {
        let count = 0;
        const round2 = num => (num != null ? Math.round(num * 100) / 100 : null);

        for (const { symbol } of symbols) {
            const history = db
                .prepare(
                    'SELECT date, close, high, low FROM price_history WHERE symbol = ? ORDER BY date ASC'
                )
                .all(symbol);

            if (history.length === 0) continue;

            const latestDate = history[history.length - 1].date;
            const closes = history.map(h => h.close);
            const highs = history.map(h => h.high);
            const lows = history.map(h => h.low);

            const ma5 = SMA.calculate({ period: 5, values: closes });
            const ma20 = SMA.calculate({ period: 20, values: closes });
            const rsi = RSI.calculate({ period: 14, values: closes });

            const macdVars = MACD.calculate({
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false,
            });

            const kd = Stochastic.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 9,
                signalPeriod: 3,
            });

            insertTechFeature.run(
                symbol,
                latestDate,
                ma5.length > 0 ? round2(ma5[ma5.length - 1]) : null,
                ma20.length > 0 ? round2(ma20[ma20.length - 1]) : null,
                rsi.length > 0 ? round2(rsi[rsi.length - 1]) : null,
                macdVars.length > 0 ? round2(macdVars[macdVars.length - 1].histogram) : null,
                macdVars.length > 0 ? round2(macdVars[macdVars.length - 1].signal) : null,
                kd.length > 0 ? round2(kd[kd.length - 1].k) : null,
                kd.length > 0 ? round2(kd[kd.length - 1].d) : null
            );
            count++;
        }
        console.log(`      (Processed ${count} stocks with tech features)`);
    });

    calcTechTx();
    console.log('   ✅ Technical features updated.');

    // 6. Mock AI Report (Sample 2330)
    db.prepare(
        `
        INSERT OR REPLACE INTO ai_reports (symbol, date, report)
        VALUES ('2330', (SELECT date FROM latest_prices WHERE symbol='2330'), 
        '【Forensic Insight】TSMC (2330) displays robust institutional accumulation (+5.2% over 5D). Chip concentration is in the top decile. Bullish RSI divergence noted on daily timeframe.')
    `
    ).run();
    console.log('   ✅ Sample AI Insight generated.');

    console.log('\n✨ All features successfully extracted into Forensic DB.');
}

generate()
    .then(() => db.close())
    .catch(console.error);
