/**
 * Stock Data Service (Optimized)
 * 
 * Loads stock list from stocks.json and enriches with latest price data
 * from the pre-generated latest_prices.json snapshot.
 * 
 * Performance: Reads 2 JSON files instead of 1077 CSVs
 */

import type { StockPriceRecord } from './priceService';
import { industries, stockIndustryMap } from '../data/industries';

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
    sector: string; // New enriched field
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
 * Helper: Sector Classification by Symbol Prefix
 * Taiwan stock symbols inherently encode sector information:
 * - 00xx: ETF/基金
 * - 11xx: 水泥 (Cement)
 * - 12xx: 食品 (Food)
 * - 13xx: 塑膠 (Plastic)
 * - 14xx: 紡織 (Textile)
 * - 15xx-16xx: 電機機械 (Machinery)
 * - 17xx: 造紙 (Paper)
 * - 18xx: 營建 (Construction)
 * - 20xx: 鋼鐵 (Steel)
 * - 21xx: 橡膠 (Rubber)
 * - 22xx: 汽車 (Auto)
 * - 23xx: 電子 (Electronics - Semiconductor)
 * - 24xx: 電子 (Electronics - Semiconductor)
 * - 25xx: 電子 (Electronics - Components)
 * - 26xx: 航運 (Shipping)
 * - 27xx: 觀光 (Tourism)
 * - 28xx: 金融 (Finance)
 * - 29xx: 貿易百貨 (Trading)
 * - 30xx-34xx: 電子 (Electronics various)
 * - 35xx-39xx: 電子 (Electronics various)
 * - 4xxx: 上櫃電子/生技
 * - 5xxx: 上櫃
 * - 6xxx: 上櫃電子/生技
 * - 8xxx: 金融/其他
 * - 9xxx: 存託憑證
 */
function getSectorBySymbol(symbol: string): string {
    // Check manual override first
    if (stockIndustryMap[symbol]) return stockIndustryMap[symbol];

    const prefix = symbol.substring(0, 2);
    const prefix3 = symbol.substring(0, 3);
    const prefix4 = symbol.length >= 4 ? parseInt(symbol.substring(0, 4)) : 0;

    // ETF (00xx)
    if (prefix === '00') return 'etf';

    // Traditional Industries by Prefix
    if (prefix === '11') return 'construction'; // 水泥 -> mapped to construction
    if (prefix === '12') return 'food';
    if (prefix === '13') return 'plastic';
    if (prefix === '14') return 'textile';
    if (prefix === '15' || prefix === '16') return 'electronics'; // 電機機械
    if (prefix === '17') return 'other'; // 造紙
    if (prefix === '18') return 'construction';
    if (prefix === '20') return 'steel';
    if (prefix === '21') return 'other'; // 橡膠
    if (prefix === '22') return 'other'; // 汽車

    // Electronics (23xx-39xx core electronics)
    if (prefix === '23' || prefix === '24') return 'semiconductor';
    if (prefix === '25') return 'electronics';
    if (prefix === '26') return 'shipping';
    if (prefix === '27') return 'tourism';
    if (prefix === '28') return 'finance';
    if (prefix === '29') return 'trading';

    // 30xx-39xx: Various Electronics
    if (prefix === '30' || prefix === '31') return 'optoelectronics'; // 面板、光電
    if (prefix === '32' || prefix === '33') return 'electronics';
    if (prefix === '34' || prefix === '35') return 'semiconductor';
    if (prefix === '36' || prefix === '37') return 'communication';
    if (prefix === '38' || prefix === '39') return 'electronics';

    // OTC (4xxx, 5xxx, 6xxx)
    if (prefix === '40' || prefix === '41' || prefix === '42' || prefix === '43') return 'biotech';
    if (prefix === '44' || prefix === '45' || prefix === '46' || prefix === '47') return 'electronics';
    if (prefix === '48' || prefix === '49') return 'other';
    if (prefix === '50' || prefix === '51' || prefix === '52') return 'construction';
    if (prefix === '53' || prefix === '54' || prefix === '55') return 'trading';
    if (prefix === '56' || prefix === '57' || prefix === '58') return 'other';
    if (prefix === '59') return 'other';

    // 6xxx OTC Electronics/Biotech
    if (prefix === '60' || prefix === '61' || prefix === '62') return 'biotech';
    if (prefix === '63' || prefix === '64' || prefix === '65') return 'electronics';
    if (prefix === '66' || prefix === '67') return 'semiconductor';
    if (prefix === '68' || prefix === '69') return 'electronics';

    // 8xxx
    if (prefix === '80' || prefix === '81' || prefix === '82') return 'other';
    if (prefix === '83' || prefix === '84') return 'finance';
    if (prefix === '85' || prefix === '86' || prefix === '87' || prefix === '88' || prefix === '89') return 'other';

    // 9xxx (存託憑證)
    if (prefix.startsWith('9')) return 'other';

    // Fallback
    return 'other';
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
        const sectorId = getSectorBySymbol(stock.symbol);

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
            sector: sectorId,
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
