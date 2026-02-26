import { query, execute, batchInsert } from './database';
import type {
    Stock,
    DailyPrice,
    Fundamental,
    Dividend,
    PortfolioItem,
    Transaction,
} from '../types/database';
import type { SqlValue } from './database';

export interface PortfolioSummaryItem extends PortfolioItem {
    currentPrice: number;
    cost: number;
    value: number;
    pl: number;
    plPercent: string;
    stock_name?: string;
}

export interface FilteredStock extends Stock {
    pe: number | null;
    pb: number | null;
    dividend_yield: number | null;
    eps: number | null;
    roe: number | null;
}

// P0 Optimization: Query result caching for filterStocks
const queryCache = new Map<string, { data: FilteredStock[]; timestamp: number }>();
const QUERY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(conditions: Record<string, number | undefined>): string {
    return JSON.stringify(conditions);
}

function getCachedResult(key: string): FilteredStock[] | null {
    const cached = queryCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > QUERY_CACHE_TTL) {
        queryCache.delete(key);
        return null;
    }
    return cached.data;
}

function setCacheResult(key: string, data: FilteredStock[]): void {
    queryCache.set(key, { data, timestamp: Date.now() });
    // Cleanup: remove oldest if >50 cached queries
    if (queryCache.size > 50) {
        const oldest = Array.from(queryCache.entries()).sort(
            (a, b) => a[1].timestamp - b[1].timestamp
        )[0];
        if (oldest) queryCache.delete(oldest[0]);
    }
}

// ================== 股票基本資料 ==================

export async function getStocks(): Promise<Stock[]> {
    return query<Stock>('SELECT * FROM stocks ORDER BY symbol');
}

export async function getStock(symbol: string): Promise<Stock | null> {
    const result = await query<Stock>('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
    return result[0] || null;
}

export async function saveStock(stock: Stock): Promise<void> {
    await execute(
        `INSERT OR REPLACE INTO stocks (symbol, name, industry, market, updated_at) 
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [stock.symbol, stock.name, stock.industry || null, stock.market || 'TSE']
    );
}

export async function saveStocks(stocks: Stock[]): Promise<void> {
    await batchInsert(
        'stocks',
        ['symbol', 'name', 'industry', 'market'],
        stocks.map(s => [s.symbol, s.name, s.industry || null, s.market || 'TSE'])
    );
}

// ================== 每日行情 ==================

export async function getDailyPrices(symbol: string, limit: number = 60): Promise<DailyPrice[]> {
    return query<DailyPrice>(
        `SELECT * FROM daily_prices 
         WHERE symbol = ? 
         ORDER BY date DESC 
         LIMIT ?`,
        [symbol, limit]
    );
}

export async function getLatestPrice(symbol: string): Promise<DailyPrice | null> {
    const result = await query<DailyPrice>(
        `SELECT * FROM daily_prices 
         WHERE symbol = ? 
         ORDER BY date DESC 
         LIMIT 1`,
        [symbol]
    );
    return result[0] || null;
}

export async function saveDailyPrices(prices: DailyPrice[]): Promise<void> {
    await batchInsert(
        'daily_prices',
        ['symbol', 'date', 'open', 'high', 'low', 'close', 'volume', 'turnover'],
        prices.map(p => [
            p.symbol,
            p.date,
            p.open,
            p.high,
            p.low,
            p.close,
            p.volume,
            p.turnover || 0,
        ])
    );
}

// ================== 基本面資料 ==================

export async function getFundamentals(symbol: string): Promise<Fundamental[]> {
    return query<Fundamental>(
        `SELECT * FROM fundamentals 
         WHERE symbol = ? 
         ORDER BY date DESC`,
        [symbol]
    );
}

export async function getLatestFundamental(symbol: string): Promise<Fundamental | null> {
    const result = await query<Fundamental>(
        `SELECT * FROM fundamentals 
         WHERE symbol = ? 
         ORDER BY date DESC 
         LIMIT 1`,
        [symbol]
    );
    return result[0] || null;
}

export async function saveFundamentals(data: Fundamental[]): Promise<void> {
    await batchInsert(
        'fundamentals',
        ['symbol', 'date', 'pe', 'pb', 'dividend_yield', 'eps', 'roe'],
        data.map(f => [
            f.symbol,
            f.date,
            f.pe || null,
            f.pb || null,
            f.dividend_yield || null,
            f.eps || null,
            f.roe || null,
        ])
    );
}

// ================== 股利歷史 ==================

export async function getDividends(symbol: string): Promise<Dividend[]> {
    return query<Dividend>(
        `SELECT * FROM dividends 
         WHERE symbol = ? 
         ORDER BY year DESC`,
        [symbol]
    );
}

export async function saveDividends(dividends: Dividend[]): Promise<void> {
    await batchInsert(
        'dividends',
        ['symbol', 'year', 'cash_dividend', 'stock_dividend', 'total_dividend'],
        dividends.map(d => [d.symbol, d.year, d.cash_dividend, d.stock_dividend, d.total_dividend])
    );
}

// ================== 投資組合 ==================

export async function getPortfolio(): Promise<PortfolioItem[]> {
    return query<PortfolioItem>(
        `SELECT p.*, s.name as stock_name
         FROM portfolio p
         LEFT JOIN stocks s ON p.symbol = s.symbol
         ORDER BY p.created_at DESC`
    );
}

export async function addToPortfolio(item: PortfolioItem): Promise<number> {
    return execute(
        `INSERT INTO portfolio (symbol, shares, avg_cost, buy_date, notes) 
         VALUES (?, ?, ?, ?, ?)`,
        [item.symbol, item.shares, item.avg_cost, item.buy_date || null, item.notes || null]
    );
}

export async function updatePortfolioItem(id: number, item: Partial<PortfolioItem>): Promise<void> {
    const sets: string[] = [];
    const params: SqlValue[] = [];

    if (item.shares !== undefined) {
        sets.push('shares = ?');
        params.push(item.shares);
    }
    if (item.avg_cost !== undefined) {
        sets.push('avg_cost = ?');
        params.push(item.avg_cost);
    }
    if (item.notes !== undefined) {
        sets.push('notes = ?');
        params.push(item.notes);
    }

    if (sets.length === 0) return;

    params.push(id);
    await execute(`UPDATE portfolio SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function removeFromPortfolio(id: number): Promise<void> {
    await execute('DELETE FROM portfolio WHERE id = ?', [id]);
}

// ================== 交易紀錄 ==================

export async function getTransactions(symbol?: string): Promise<Transaction[]> {
    if (symbol) {
        return query<Transaction>(
            `SELECT * FROM transactions WHERE symbol = ? ORDER BY date DESC`,
            [symbol]
        );
    }
    return query<Transaction>('SELECT * FROM transactions ORDER BY date DESC');
}

export async function addTransaction(tx: Transaction): Promise<number> {
    return execute(
        `INSERT INTO transactions (symbol, type, shares, price, fee, tax, date, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tx.symbol,
            tx.type,
            tx.shares,
            tx.price,
            tx.fee || 0,
            tx.tax || 0,
            tx.date,
            tx.notes || null,
        ]
    );
}

// ================== 統計查詢 ==================

export async function getPortfolioSummary(): Promise<{
    totalCost: number;
    totalValue: number;
    unrealizedPL: number;
    items: PortfolioSummaryItem[];
}> {
    const portfolio = await getPortfolio();
    let totalCost = 0;
    let totalValue = 0;
    const items = [];

    for (const item of portfolio) {
        const latestPrice = await getLatestPrice(item.symbol);
        const currentPrice = latestPrice?.close || item.avg_cost;
        const cost = item.shares * item.avg_cost;
        const value = item.shares * currentPrice;

        totalCost += cost;
        totalValue += value;

        items.push({
            ...item,
            currentPrice,
            cost,
            value,
            pl: value - cost,
            plPercent: (((value - cost) / cost) * 100).toFixed(2),
        });
    }

    return {
        totalCost,
        totalValue,
        unrealizedPL: totalValue - totalCost,
        items,
    };
}

// ================== 搜尋與篩選 ==================

export async function searchStocks(keyword: string): Promise<Stock[]> {
    return query<Stock>(
        `SELECT * FROM stocks 
         WHERE symbol LIKE ? OR name LIKE ? 
         ORDER BY symbol 
         LIMIT 20`,
        [`%${keyword}%`, `%${keyword}%`]
    );
}

export async function filterStocks(conditions: {
    minPE?: number;
    maxPE?: number;
    minYield?: number;
    maxYield?: number;
    minROE?: number;
}): Promise<FilteredStock[]> {
    // P0 Optimization: Check cache first (5 minute TTL)
    const cacheKey = getCacheKey(conditions);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }

    let sql = `
        SELECT s.*, f.pe, f.pb, f.dividend_yield, f.eps, f.roe
        FROM stocks s
        LEFT JOIN (
            SELECT symbol, pe, pb, dividend_yield, eps, roe,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
            FROM fundamentals
        ) f ON s.symbol = f.symbol AND f.rn = 1
        WHERE 1=1
    `;
    const params: SqlValue[] = [];

    if (conditions.minPE !== undefined) {
        sql += ' AND f.pe >= ?';
        params.push(conditions.minPE);
    }
    if (conditions.maxPE !== undefined) {
        sql += ' AND f.pe <= ?';
        params.push(conditions.maxPE);
    }
    if (conditions.minYield !== undefined) {
        sql += ' AND f.dividend_yield >= ?';
        params.push(conditions.minYield);
    }
    if (conditions.maxYield !== undefined) {
        sql += ' AND f.dividend_yield <= ?';
        params.push(conditions.maxYield);
    }
    if (conditions.minROE !== undefined) {
        sql += ' AND f.roe >= ?';
        params.push(conditions.minROE);
    }

    sql += ' ORDER BY s.symbol';

    const results = await query<FilteredStock>(sql, params);

    // P0 Optimization: Cache the results for 5 minutes
    setCacheResult(cacheKey, results);

    return results;
}
