import { getDb, type StockSummary } from '../lib/db';

/**
 * Market Data Service using SQLite
 */

export function getMarketBreadth() {
    const db = getDb();
    try {
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN change > 0 THEN 1 ELSE 0 END) as up,
                SUM(CASE WHEN change < 0 THEN 1 ELSE 0 END) as down,
                SUM(CASE WHEN change = 0 THEN 1 ELSE 0 END) as flat
            FROM latest_prices
            WHERE price > 0
        `).get() as { total: number, up: number, down: number, flat: number };

        return {
            total: stats.total || 0,
            up: stats.up || 0,
            down: stats.down || 0,
            flat: stats.flat || 0,
            upRatio: stats.total ? (stats.up / stats.total) * 100 : 0,
            downRatio: stats.total ? (stats.down / stats.total) * 100 : 0
        };
    } catch (e) {
        return { total: 0, up: 0, down: 0, flat: 0, upRatio: 0, downRatio: 0 };
    }
}

export function getTopGainers(limit = 5): StockSummary[] {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT s.symbol, s.name, s.market, l.close as price, l.change, l.change_pct, l.volume, l.pe, l.pb, l.yield,
                   f.net_margin as roe, f.eps
            FROM latest_prices l
            JOIN stocks s ON s.symbol = l.symbol
            LEFT JOIN fundamentals f ON f.symbol = l.symbol
            WHERE l.price > 0
            ORDER BY l.change_pct DESC
            LIMIT ?
        `).all(limit) as StockSummary[];
    } catch (e) { return []; }
}

export function getTopLosers(limit = 5): StockSummary[] {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT s.symbol, s.name, s.market, l.close as price, l.change, l.change_pct, l.volume, l.pe, l.pb, l.yield,
                   f.net_margin as roe, f.eps
            FROM latest_prices l
            JOIN stocks s ON s.symbol = l.symbol
            LEFT JOIN fundamentals f ON f.symbol = l.symbol
            WHERE l.price > 0
            ORDER BY l.change_pct ASC
            LIMIT ?
        `).all(limit) as StockSummary[];
    } catch (e) { return []; }
}

export function getTopVolume(limit = 5): StockSummary[] {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT s.symbol, s.name, s.market, l.close as price, l.change, l.change_pct, l.volume, l.pe, l.pb, l.yield,
                   f.net_margin as roe, f.eps
            FROM latest_prices l
            JOIN stocks s ON s.symbol = l.symbol
            LEFT JOIN fundamentals f ON f.symbol = l.symbol
            WHERE l.price > 0
            ORDER BY l.volume DESC
            LIMIT ?
        `).all(limit) as StockSummary[];
    } catch (e) { return []; }
}

/**
 * Get top chips (Foreign Investment Buy)
 */
export function getTopChips(limit = 5) {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT s.symbol, s.name, c.foreign_inv, c.invest_trust, c.dealer, l.change_pct
            FROM chips c
            JOIN stocks s ON s.symbol = c.symbol
            LEFT JOIN latest_prices l ON l.symbol = c.symbol
            WHERE c.date = (SELECT MAX(date) FROM chips)
            ORDER BY c.foreign_inv DESC
            LIMIT ?
        `).all(limit);
    } catch (e) { return []; }
}

/**
 * Get sector performance (average change %)
 */
export function getSectorPerformance() {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT s.sector as id, AVG(l.change_pct) as avgChange, COUNT(*) as total
            FROM stocks s
            JOIN latest_prices l ON s.symbol = l.symbol
            WHERE l.price > 0 AND s.sector IS NOT NULL
            GROUP BY s.sector
            ORDER BY avgChange DESC
        `).all();
    } catch (e) { return []; }
}

/**
 * Get high growth stars (Revenue YoY > 20% & Positive Gross Margin)
 */
export function getGrowthStars(limit = 5) {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT s.symbol, s.name, f.revenue_yoy, f.gross_margin, l.close as price, l.change_pct
            FROM fundamentals f
            JOIN stocks s ON s.symbol = f.symbol
            JOIN latest_prices l ON l.symbol = f.symbol
            WHERE f.revenue_yoy > 20 AND f.gross_margin > 0
            ORDER BY f.revenue_yoy DESC
            LIMIT ?
        `).all(limit);
    } catch (e) { return []; }
}

/**
 * Advanced Stock Screening
 */
export interface ScreenFilters {
    pe?: number;
    pb?: number;
    dividendYield?: number;
    roe?: number;
    market?: string;
    sector?: string;
    revenueYoY?: number;
    goldenCross?: boolean;
    rsiOversold?: boolean;
    macdBullish?: boolean;
}

export function screenStocks(filters: ScreenFilters) {
    const db = getDb();
    const conditions: string[] = ['l.price > 0'];
    const params: any[] = [];

    if (filters.pe !== undefined && filters.pe > 0) {
        conditions.push('l.pe > 0 AND l.pe <= ?');
        params.push(filters.pe);
    }
    if (filters.pb !== undefined && filters.pb > 0) {
        conditions.push('l.pb > 0 AND l.pb <= ?');
        params.push(filters.pb);
    }
    if (filters.dividendYield !== undefined && filters.dividendYield > 0) {
        conditions.push('l.yield >= ?');
        params.push(filters.dividendYield);
    }
    if (filters.roe !== undefined && filters.roe > 0) {
        conditions.push('f.net_margin >= ?');
        params.push(filters.roe);
    }
    if (filters.revenueYoY !== undefined && filters.revenueYoY !== 0) {
        conditions.push('f.revenue_yoy >= ?');
        params.push(filters.revenueYoY);
    }

    // Technicals
    if (filters.goldenCross) {
        conditions.push('l.ma5 > l.ma20');
    }

    const query = `
        SELECT 
            s.symbol, s.name, s.market, s.sector,
            l.close as price, l.change, l.change_pct, l.volume,
            l.pe, l.pb, l.yield, l.ma5, l.ma20,
            f.revenue_yoy, f.gross_margin, f.net_margin as roe
        FROM stocks s
        JOIN latest_prices l ON s.symbol = l.symbol
        LEFT JOIN fundamentals f ON s.symbol = f.symbol
        WHERE ${conditions.join(' AND ')}
        ORDER BY l.volume DESC
        LIMIT 200
    `;

    try {
        return db.prepare(query).all(...params);
    } catch (e) {
        console.error('Screening Error:', e);
        return [];
    }
}
export function getStockDetails(symbol: string) {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT 
                s.symbol, s.name, s.market, s.sector,
                l.close as price, l.change, l.change_pct, l.volume,
                l.pe, l.pb, l.yield, l.ma5, l.ma20,
                f.revenue_yoy, f.gross_margin, f.operating_margin, f.net_margin, f.eps
            FROM stocks s
            JOIN latest_prices l ON s.symbol = l.symbol
            LEFT JOIN fundamentals f ON f.symbol = s.symbol
            WHERE s.symbol = ?
        `).get(symbol);
    } catch (e) {
        return null;
    }
}

export function getStockChips(symbol: string) {
    const db = getDb();
    try {
        return db.prepare(`
            SELECT date, foreign_inv, invest_trust, dealer
            FROM chips
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT 30
        `).all(symbol);
    } catch (e) {
        return [];
    }
}
