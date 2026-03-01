/**
 * migrate-to-analysis-tables.mjs
 *
 * 三層分離 ETL：
 * 1. 運算層：從 price_history 計算每日個股的 MA5/10/20/60/120, ATR14, RSI14, MACD, KD → daily_indicators
 * 2. 聚合層：依日期聚合大盤指標 (Breadth, Volume, TRIN, MA Breadth) → market_breadth_history
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { SMA, RSI, MACD, Stochastic, ATR } from 'technicalindicators';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'stocks.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');

async function run() {
    console.log('🚀 開始三層分離 ETL 運算計畫...');

    const stocks = db.prepare('SELECT symbol FROM stocks').all();
    const allDates = db
        .prepare('SELECT DISTINCT date FROM price_history ORDER BY date ASC')
        .all()
        .map(d => d.date);

    console.log(`📊 共有 ${stocks.length} 檔股票，${allDates.length} 個交易日。`);

    // 清空舊數據
    db.exec('DELETE FROM daily_indicators; DELETE FROM market_breadth_history;');

    const insertIndicator = db.prepare(`
        INSERT INTO daily_indicators (symbol, date, ma5, ma10, ma20, ma60, ma120, atr14, rsi14, macd_diff, macd_dea, kd_k, kd_d)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // ─── 第一階段：個股技術指標運算 ───
    console.log('⏳ 第一階段：計算個股技術指標 (MA / RSI / MACD / KD)...');

    const stockTx = db.transaction(() => {
        let processed = 0;
        for (const { symbol } of stocks) {
            const history = db
                .prepare(
                    'SELECT date, open, high, low, close, volume, turnover FROM price_history WHERE symbol = ? ORDER BY date ASC'
                )
                .all(symbol);
            if (history.length < 2) continue;

            const closes = history.map(h => h.close);
            const highs = history.map(h => h.high);
            const lows = history.map(h => h.low);

            // MA
            const ma5 = SMA.calculate({ period: 5, values: closes });
            const ma10 = SMA.calculate({ period: 10, values: closes });
            const ma20 = SMA.calculate({ period: 20, values: closes });
            const ma60 = SMA.calculate({ period: 60, values: closes });
            const ma120 = SMA.calculate({ period: 120, values: closes });

            // ATR-14 (Average True Range)
            const atr14 = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });

            // RSI-14
            const rsi14 = RSI.calculate({ period: 14, values: closes });

            // MACD (12, 26, 9)
            const macdResult = MACD.calculate({
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false,
            });

            // KD (Stochastic 9, 3, 3)
            const kdResult = Stochastic.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 9,
                signalPeriod: 3,
            });

            // Pad arrays to match history length
            const pad = (arr, offset) => new Array(offset).fill(null).concat(arr);
            const ma5Full = pad(ma5, 4);
            const ma10Full = pad(ma10, 9);
            const ma20Full = pad(ma20, 19);
            const ma60Full = pad(ma60, 59);
            const ma120Full = pad(ma120, 119);
            const atr14Full = pad(atr14, 14);
            const rsi14Full = pad(rsi14, 14);
            const macdOffset = history.length - macdResult.length;
            const macdFull = pad(macdResult, macdOffset);
            const kdOffset = history.length - kdResult.length;
            const kdFull = pad(kdResult, kdOffset);

            for (let i = 0; i < history.length; i++) {
                const m = macdFull[i];
                const k = kdFull[i];
                insertIndicator.run(
                    symbol,
                    history[i].date,
                    ma5Full[i] != null ? Number(ma5Full[i].toFixed(2)) : null,
                    ma10Full[i] != null ? Number(ma10Full[i].toFixed(2)) : null,
                    ma20Full[i] != null ? Number(ma20Full[i].toFixed(2)) : null,
                    ma60Full[i] != null ? Number(ma60Full[i].toFixed(2)) : null,
                    ma120Full[i] != null ? Number(ma120Full[i].toFixed(2)) : null,
                    atr14Full[i] != null ? Number(atr14Full[i].toFixed(2)) : null,
                    rsi14Full[i] != null ? Number(rsi14Full[i].toFixed(2)) : null,
                    m?.histogram != null ? Number(m.histogram.toFixed(4)) : null,
                    m?.signal != null ? Number(m.signal.toFixed(4)) : null,
                    k?.k != null ? Number(k.k.toFixed(2)) : null,
                    k?.d != null ? Number(k.d.toFixed(2)) : null
                );
            }

            processed++;
            if (processed % 100 === 0) {
                process.stdout.write(`\r   處理進度: ${processed} / ${stocks.length} 檔股票...`);
            }
        }
        console.log(`\n   ✅ 個股指標寫入完成 (${processed} 檔)。`);
    });

    stockTx();

    // ─── 第二階段：聚合大盤每日指標 ───
    console.log('⏳ 第二階段：聚合大盤每日廣度指標...');

    const insertBreadth = db.prepare(`
        INSERT INTO market_breadth_history (
            date, up_count, down_count, flat_count, 
            up_turnover, down_turnover,
            up_volume, down_volume,
            trin, ma5_breadth, ma20_breadth, ma60_breadth, ma120_breadth,
            adl, total_stocks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const breadthTx = db.transaction(() => {
        let processed = 0;
        let adl = 0;  // Cumulative Advance-Decline Line
        for (const date of allDates) {
            const dayData = db
                .prepare(
                    `
                SELECT 
                    ph.change_pct, 
                    ph.turnover, 
                    ph.close, 
                    ph.volume,
                    di.ma5,
                    di.ma20,
                    di.ma60,
                    di.ma120
                FROM price_history ph
                LEFT JOIN daily_indicators di ON ph.symbol = di.symbol AND ph.date = di.date
                WHERE ph.date = ? AND ph.close > 0
            `
                )
                .all(date);

            let up = 0,
                down = 0,
                flat = 0;
            let upT = 0,
                downT = 0;
            let upV = 0,
                downV = 0;
            let above5 = 0,
                above20 = 0,
                above60 = 0,
                above120 = 0;
            let count5 = 0,
                count20 = 0,
                count60 = 0,
                count120 = 0;

            for (const s of dayData) {
                if (s.change_pct > 0) {
                    up++;
                    upT += s.turnover || s.close * s.volume;
                    upV += s.volume || 0;
                } else if (s.change_pct < 0) {
                    down++;
                    downT += s.turnover || s.close * s.volume;
                    downV += s.volume || 0;
                } else {
                    flat++;
                }

                if (s.ma5 > 0) {
                    count5++;
                    if (s.close > s.ma5) above5++;
                }
                if (s.ma20 > 0) {
                    count20++;
                    if (s.close > s.ma20) above20++;
                }
                if (s.ma60 > 0) {
                    count60++;
                    if (s.close > s.ma60) above60++;
                }
                if (s.ma120 > 0) {
                    count120++;
                    if (s.close > s.ma120) above120++;
                }
            }

            const issuesRatio = (up || 0.1) / (down || 0.1);
            const turnRatio = (upT || 0.1) / (downT || 0.1);
            const trin = Math.min(Math.max(issuesRatio / turnRatio, 0.1), 8);

            adl += (up - down);  // ADL = cumulative sum of (advances - declines)

            insertBreadth.run(
                date,
                up,
                down,
                flat,
                upT,
                downT,
                upV,
                downV,
                Number(trin.toFixed(3)),
                count5 > 0 ? Number(((above5 / count5) * 100).toFixed(2)) : 0,
                count20 > 0 ? Number(((above20 / count20) * 100).toFixed(2)) : 0,
                count60 > 0 ? Number(((above60 / count60) * 100).toFixed(2)) : 0,
                count120 > 0 ? Number(((above120 / count120) * 100).toFixed(2)) : 0,
                adl,
                dayData.length
            );

            processed++;
            if (processed % 10 === 0) {
                process.stdout.write(`\r   大盤聚合進度: ${processed} / ${allDates.length} 天...`);
            }
        }
        console.log(`\n   ✅ 大盤指標聚合完成 (${processed} 天)。`);
    });

    breadthTx();

    console.log('✨ ETL 完成！運算層 + 聚合層數據已就緒。');
}

run()
    .then(() => db.close())
    .catch(console.error);
