/**
 * Stock Data Service (Optimized)
 *
 * Loads stock list from stocks.json and enriches with latest price data
 * from the pre-generated latest_prices.json snapshot.
 *
 * Performance: Reads 2 JSON files instead of 1077 CSVs
 */

import type { StockPriceRecord } from './priceService';
import { industries } from '../data/industries';

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
    revenueYoY?: number;
    eps?: number;
    grossMargin?: number;
    operatingMargin?: number;
    netMargin?: number;
    foreignStreak?: number;
    trustStreak?: number;
    dealerStreak?: number;
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
    pe: number;
    pb: number;
    yield: number;
    roe: number;
    eps: number;
    revenueYoY: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    foreignStreak: number;
    trustStreak: number;
    dealerStreak: number;
    sector: string;
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
    // 1. Manual Overrides for Major Stocks (Ensure accuracy for high-weight items)
    const overrides: Record<string, string> = {
        '2330': 'semiconductor', // TSMC
        '2454': 'semiconductor', // MediaTek
        '3034': 'semiconductor', // Novatek
        '2317': 'electronics', // Hon Hai
        '2308': 'electronics', // Delta
        '2382': 'electronics', // Quanta
        '2412': 'communication', // Chunghwa Telecom
        '3008': 'optoelectronics', // Largan
        '1301': 'plastic', // Formosa Plastic
        '2002': 'steel', // China Steel
        '2603': 'shipping', // Evergreen
        '2609': 'shipping', // Yang Ming
        '7722': 'finance', // LINEPAY (Digital finance)
        '7705': 'tourism', // Tri-Sans Food
        // 99xx Overrides (The big ones)
        '9910': 'sports-leisure', // Feng Tay (Shoes)
        '9914': 'sports-leisure', // Merida (Bicycle)
        '9921': 'sports-leisure', // Giant (Bicycle)
        '9938': 'sports-leisure', // Paiho (Shoes)
        '9802': 'sports-leisure', // Fulgent (Shoes)
        '9917': 'household', // SECOM (Security)
        '9925': 'household', // SKS (Security)
        '9911': 'household', // Sakura (Home)
        '9934': 'household', // Chen Lin (Home)
        '9942': 'household', // Maw Soon (Auto related but household)
        '9908': 'energy', // Great Taipei Gas
        '9918': 'energy', // Shin Hai Gas
        '9926': 'energy', // Shin Gas
        '9931': 'energy', // Hsin Kao Gas
        '9937': 'energy', // National Gas
        '9939': 'household', // Hon Chuan (Packaging)
        '9958': 'energy', // Century Iron (Offshore wind steel)
        '9930': 'steel', // CHC Resources
        '9940': 'construction', // Sinyi
        '9945': 'construction', // Ruentex
        '9946': 'construction', // San Far
    };

    if (overrides[symbol]) return overrides[symbol];

    const prefix = symbol.substring(0, 2);
    const num = parseInt(symbol);

    // 2. ETFs and Funds
    if (prefix === '00' || prefix === '01' || prefix === '03' || prefix === '04') return 'etf';

    // 3. Main Industry Sectors
    if (prefix === '11') return 'construction'; // Cement
    if (prefix === '12') return 'food';
    if (prefix === '13') return 'plastic';
    if (prefix === '14') return 'textile';
    if (prefix === '15' || prefix === '16') return 'electronics'; // Machinery/Cable
    if (prefix === '17') return 'chemical';
    if (prefix === '18') return 'construction'; // Glass/Ceramic
    if (prefix === '19') return 'paper';
    if (prefix === '20') return 'steel';
    if (prefix === '21') return 'rubber';
    if (prefix === '22') return 'auto';
    if (prefix === '23') return 'semiconductor';
    if (prefix === '24') return 'computer';
    if (prefix === '25') return 'construction';
    if (prefix === '26') return 'shipping';
    if (prefix === '27') return 'tourism';
    if (prefix === '28') return 'finance';
    if (prefix === '29') return 'trading';

    // 4. Technology & Special OTC Ranges
    if (prefix === '30') return 'electronics'; // Components
    if (prefix === '31') return 'communication';
    if (prefix === '32') return 'electronics';
    if (prefix === '33') return 'computer';
    if (prefix === '34') return 'optoelectronics';
    if (prefix === '35') return 'semiconductor';
    if (prefix === '36') return 'communication';
    if (prefix === '37') return 'other-tech'; // Distribution
    if (prefix === '38') return 'other-tech';
    if (prefix === '39') return 'other';

    if (prefix === '41') return 'biotech';
    if (prefix === '45') return 'electronics'; // Machinery
    if (prefix === '47') return 'chemical';
    if (prefix === '49') return 'semiconductor';

    if (prefix === '52') return 'semiconductor'; // IC Design
    if (prefix === '53') return 'electronics';
    if (prefix === '54') return 'semiconductor';
    if (prefix === '55') return 'construction'; // OTC Construction
    if (prefix === '56') return 'shipping'; // OTC Shipping
    if (prefix === '57') return 'tourism'; // OTC Tourism
    if (prefix === '58') return 'finance'; // OTC Bank
    if (prefix === '59') return 'trading'; // OTC Trading

    if (prefix === '60') return 'finance'; // Securities
    if (prefix === '61') return 'electronics';
    if (prefix === '62') return 'semiconductor';
    if (prefix === '64') return 'semiconductor';
    if (prefix === '65') return 'biotech';
    if (prefix === '66') return 'semiconductor';
    if (prefix === '67' || prefix === '68' || prefix === '69') return 'other-tech';

    if (prefix === '80') return 'semiconductor';
    if (prefix === '81') return 'electronics';
    if (prefix === '82') return 'other-tech';
    if (prefix === '83') return 'energy'; // Environment/Various
    if (prefix === '84') return 'biotech'; // Life Science
    if (prefix === '89') return 'trading';

    // Energy series (Specific 6xxx-7xxx stocks)
    if (prefix === '68' || prefix === '69' || prefix === '77') {
        const energyStocks = ['6806', '6869', '6873', '6994', '7740', '7786'];
        if (energyStocks.includes(symbol)) return 'energy';
    }

    // 5. 99xx Range (Comprehensive)
    if (prefix === '99') {
        if (num >= 9940 && num <= 9946) return 'construction';
        if (num === 9958 || num === 9930) return 'steel';
        if (num >= 9917 && num <= 9925) return 'household'; // Security/Bicycle/Home
        if (num === 9943) return 'tourism';
        if (num >= 9908 && num <= 9937) return 'energy'; // Gas Utilities
        return 'other';
    }

    // DR / KY and others
    if (prefix === '91') return 'other';

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
            pe: priceData?.pe || 0,
            pb: priceData?.pb || 0,
            yield: priceData?.yield || 0,
            roe: 0,
            eps: priceData?.eps || 0,
            revenueYoY: priceData?.revenueYoY || 0,
            grossMargin: priceData?.grossMargin || 0,
            operatingMargin: priceData?.operatingMargin || 0,
            netMargin: priceData?.netMargin || 0,
            foreignStreak: priceData?.foreignStreak || 0,
            trustStreak: priceData?.trustStreak || 0,
            dealerStreak: priceData?.dealerStreak || 0,
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
export async function getStocksPaginated(
    page: number = 1,
    pageSize: number = 50
): Promise<{
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
        totalPages: Math.ceil(allStocks.length / pageSize),
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
        .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
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
