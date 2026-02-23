import { SqliteWriter } from '../db/sqlite-writer';
import { twseApi } from '../fetchers/twse-api';
import { yahooApi } from '../fetchers/yahoo-api';
import { technicalETL } from './technical-features';
import { chipETL } from './chip-features';

/**
 * M1: The Master ETL Orchestrator
 * This script handles the full Data Pipeline.
 */
async function main() {
    const writer = new SqliteWriter();

    try {
        // 1. Initialize DB Schema
        console.log('--- Phase 1: Initializing Schema ---');
        writer.initSchema();

        // 2. Fetch Market Snapshot
        console.log('--- Phase 2: Fetching All Market Snapshot ---');
        const stockList = await twseApi.fetchStockList();

        // Map TWSE fields to DB format
        const today = new Date().toISOString().split('T')[0];
        const formattedStocks = stockList
            .map((s: any) => {
                const open = parseFloat(s.OpeningPrice);
                const high = parseFloat(s.HighestPrice);
                const low = parseFloat(s.LowestPrice);
                const close = parseFloat(s.ClosingPrice);
                const volume = parseInt(s.TradeVolume);
                const change = parseFloat(s.Change);

                const prevClose = close - change;
                const changeRate = prevClose !== 0 ? (change / prevClose) * 100 : 0;

                return {
                    symbol: s.Code,
                    date: today,
                    open: isNaN(open) ? close : open,
                    high: isNaN(high) ? close : high,
                    low: isNaN(low) ? close : low,
                    close: close,
                    volume: isNaN(volume) ? 0 : volume,
                    change_rate: Number(changeRate.toFixed(2)),
                };
            })
            .filter((s: any) => s.symbol && !isNaN(s.close));

        // 3. Batch Insert basic stock data
        writer.batchInsert('stocks', formattedStocks);

        // 4. Engineering Features for a subset of stocks
        console.log('--- Phase 3: Engineering Features for top 20 stocks ---');
        const testSymbols = formattedStocks.slice(0, 20).map((s: any) => s.symbol);

        for (const symbol of testSymbols) {
            // Priority: Yahoo Finance (more stable and provides longer history)
            let history = await yahooApi.fetchHistoricalData(symbol);

            // Fallback: TWSE (if Yahoo fails)
            if (!history || history.length === 0) {
                history = await twseApi.fetchHistoricalData(symbol);
            }

            if (!history || history.length === 0) {
                console.warn(`[ETL] No history found for ${symbol}, skipping.`);
                continue;
            }

            const closes = history.map((h: any) => h.close || parseFloat(h[6] || h.收盤價));

            // Calculate technical indicators
            const ma5 = technicalETL.calculateMA(closes, 5);
            const ma20 = technicalETL.calculateMA(closes, 20);

            // Write to tech_features table
            const techData = [
                {
                    symbol,
                    date: today,
                    ma5: ma5[ma5.length - 1],
                    ma20: ma20[ma20.length - 1],
                },
            ];

            writer.batchInsert('tech_features', techData);
        }

        console.log('--- M1 Pipeline Successfully Completed ---');
    } catch (error) {
        console.error('!!! ETL Pipeline Failed:', error);
    } finally {
        writer.close();
    }
}

main();
