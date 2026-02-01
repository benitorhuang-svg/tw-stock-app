/**
 * Stock Data Service (Optimized)
 * 
 * Loads stock list from stocks.json and enriches with latest price data
 * from the pre-generated latest_prices.json snapshot.
 * 
 * Performance: Reads 2 JSON files instead of 1077 CSVs
 */

import type { StockPriceRecord } from './priceService';

export interface StockBasicInfo {
    symbol: string;
    name: string;
    market: string;
}

export interface LatestPriceData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePct: number;
    pe?: number;
    pb?: number;
    yield?: number;
}

export interface StockFullData extends StockBasicInfo {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    date?: string;
    // These fields require additional data sources (set to placeholder values)
    pe: number;
    pb: number;
    yield: number;
    roe: number;
    eps: number;
}

/**
 * Load all stocks from stocks.json
 */
export async function loadStockList(): Promise<StockBasicInfo[]> {
    const fs = await import('fs');
    const path = await import('path');

    const stocksPath = path.join(process.cwd(), 'public/data/stocks.json');
    if (!fs.existsSync(stocksPath)) {
        console.error('stocks.json not found');
        return [];
    }

    const data = fs.readFileSync(stocksPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Load latest prices snapshot (OPTIMIZED - single JSON read)
 */
export async function loadLatestPrices(): Promise<Record<string, LatestPriceData>> {
    const fs = await import('fs');
    const path = await import('path');

    const snapshotPath = path.join(process.cwd(), 'public/data/latest_prices.json');
    if (!fs.existsSync(snapshotPath)) {
        console.warn('latest_prices.json not found - run: node scripts/build-price-snapshot.js');
        return {};
    }

    const data = fs.readFileSync(snapshotPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Load all stocks with their latest price data (OPTIMIZED)
 * Now reads from pre-generated snapshot instead of 1077 CSV files
 */
export async function loadAllStocksWithPrices(): Promise<StockFullData[]> {
    const stockList = await loadStockList();
    const latestPrices = await loadLatestPrices();

    const results: StockFullData[] = [];

    for (const stock of stockList) {
        const priceData = latestPrices[stock.symbol];

        results.push({
            symbol: stock.symbol,
            name: stock.name,
            market: stock.market,
            price: priceData?.close || 0,
            change: priceData?.change || 0,
            changePercent: priceData?.changePct || 0,
            volume: priceData?.volume || 0,
            high: priceData?.high || 0,
            low: priceData?.low || 0,
            open: priceData?.open || 0,
            date: priceData?.date,
            // Enhanced data from snapshot
            pe: priceData?.pe || 0,
            pb: priceData?.pb || 0,
            yield: priceData?.yield || 0,
            roe: 0,
            eps: 0,
        });
    }

    return results;
}

/**
 * Get stocks with prices (cached for performance)
 */
let cachedStocks: StockFullData[] | null = null;

export async function getStocksWithPrices(): Promise<StockFullData[]> {
    if (cachedStocks) return cachedStocks;
    cachedStocks = await loadAllStocksWithPrices();
    return cachedStocks;
}

/**
 * Get paginated stocks
 */
export async function getStocksPaginated(page: number = 1, pageSize: number = 50): Promise<{
    stocks: StockFullData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}> {
    const allStocks = await getStocksWithPrices();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
        stocks: allStocks.slice(start, end),
        total: allStocks.length,
        page,
        pageSize,
        totalPages: Math.ceil(allStocks.length / pageSize)
    };
}

/**
 * Search stocks by symbol or name
 */
export async function searchStocks(query: string, limit: number = 50): Promise<StockFullData[]> {
    const stocks = await getStocksWithPrices();
    const q = query.toLowerCase().trim();

    if (!q) return stocks.slice(0, limit);

    return stocks
        .filter(s =>
            s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
        )
        .slice(0, limit);
}

/**
 * Get top N stocks by volume
 */
export async function getTopStocksByVolume(limit: number = 10): Promise<StockFullData[]> {
    const stocks = await getStocksWithPrices();
    return stocks
        .filter(s => s.volume > 0)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit);
}

/**
 * Get top gainers
 */
export async function getTopGainers(limit: number = 10): Promise<StockFullData[]> {
    const stocks = await getStocksWithPrices();
    return stocks
        .filter(s => s.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, limit);
}

/**
 * Get top losers
 */
export async function getTopLosers(limit: number = 10): Promise<StockFullData[]> {
    const stocks = await getStocksWithPrices();
    return stocks
        .filter(s => s.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, limit);
}

/**
 * Get stock by symbol
 */
export async function getStockBySymbol(symbol: string): Promise<StockFullData | null> {
    const stocks = await getStocksWithPrices();
    return stocks.find(s => s.symbol === symbol) || null;
}
