import { dbService } from '../lib/db/sqlite-service';

/**
 * Market Data Service using M1 SQLite Schema
 */

export interface StockSummary {
    symbol: string;
    name: string;
    price: number;
    change_rate: number;
    volume: number;
    date: string;
}

export function getMarketBreadth() {
    const db = dbService.getRawDb();
    try {
        const latestDateRes = db.prepare('SELECT MAX(date) as date FROM stocks').get() as {
            date: string;
        };
        const latestDate = latestDateRes.date;

        const stats = db
            .prepare(
                `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN change_rate > 0 THEN 1 ELSE 0 END) as up,
                SUM(CASE WHEN change_rate < 0 THEN 1 ELSE 0 END) as down,
                SUM(CASE WHEN change_rate = 0 THEN 1 ELSE 0 END) as flat
            FROM stocks
            WHERE date = ?
        `
            )
            .get(latestDate) as { total: number; up: number; down: number; flat: number };

        return {
            total: stats.total || 0,
            up: stats.up || 0,
            down: stats.down || 0,
            flat: stats.flat || 0,
            upRatio: stats.total ? (stats.up / stats.total) * 100 : 0,
            downRatio: stats.total ? (stats.down / stats.total) * 100 : 0,
        };
    } catch (e) {
        return { total: 0, up: 0, down: 0, flat: 0, upRatio: 0, downRatio: 0 };
    }
}

export function getTopGainers(limit = 5): StockSummary[] {
    const db = dbService.getRawDb();
    try {
        const latestDateRes = db.prepare('SELECT MAX(date) as date FROM stocks').get() as {
            date: string;
        };
        const latestDate = latestDateRes.date;

        return db
            .prepare(
                `
            SELECT symbol, close as price, change_rate, volume, date
            FROM stocks
            WHERE date = ?
            ORDER BY change_rate DESC
            LIMIT ?
        `
            )
            .all(latestDate, limit) as any[];
    } catch (e) {
        return [];
    }
}

export function getTopVolume(limit = 5): StockSummary[] {
    const db = dbService.getRawDb();
    try {
        const latestDateRes = db.prepare('SELECT MAX(date) as date FROM stocks').get() as {
            date: string;
        };
        return db
            .prepare(
                `
            SELECT symbol, close as price, change_rate, volume, date
            FROM stocks
            WHERE date = ?
            ORDER BY volume DESC
            LIMIT ?
        `
            )
            .all(latestDateRes.date, limit) as any[];
    } catch (e) {
        return [];
    }
}

export function getTopLosers(limit = 5): StockSummary[] {
    const db = dbService.getRawDb();
    try {
        const latestDateRes = db.prepare('SELECT MAX(date) as date FROM stocks').get() as {
            date: string;
        };
        return db
            .prepare(
                `
            SELECT symbol, close as price, change_rate, volume, date
            FROM stocks
            WHERE date = ?
            ORDER BY change_rate ASC
            LIMIT ?
        `
            )
            .all(latestDateRes.date, limit) as any[];
    } catch (e) {
        return [];
    }
}

export function getTopChips(limit = 5) {
    const db = dbService.getRawDb();
    try {
        return db
            .prepare(
                `
            SELECT symbol, foreign_buy, trust_buy, concentration_5d, date
            FROM chip_features
            ORDER BY concentration_5d DESC
            LIMIT ?
        `
            )
            .all(limit);
    } catch (e) {
        return [];
    }
}

export function getGrowthStars(limit = 5) {
    // Currently valuation_features stores yield, in full app we'd join more
    const db = dbService.getRawDb();
    try {
        return db
            .prepare(
                `
            SELECT s.symbol, s.close as price, v.dividend_yield, s.change_rate
            FROM stocks s
            JOIN valuation_features v ON s.symbol = v.symbol AND s.date = v.date
            ORDER BY v.dividend_yield DESC
            LIMIT ?
        `
            )
            .all(limit);
    } catch (e) {
        return [];
    }
}

export interface ScreenFilters {
    pe?: number;
    pb?: number;
    dividendYield?: number;
    roe?: number;
    goldenCross?: boolean;
    rsiOversold?: boolean;
    macdBullish?: boolean;
}

export function screenStocks(filters: ScreenFilters) {
    const db = dbService.getRawDb();
    try {
        const latestDateRes = db.prepare('SELECT MAX(date) as date FROM stocks').get() as {
            date: string;
        };
        if (!latestDateRes) return [];
        const latestDate = latestDateRes.date;

        const conditions: string[] = ['s.date = ?'];
        const params: any[] = [latestDate];

        if (filters.pe) {
            conditions.push('v.pe_ratio > 0 AND v.pe_ratio <= ?');
            params.push(filters.pe);
        }
        if (filters.pb) {
            conditions.push('v.pb_ratio > 0 AND v.pb_ratio <= ?');
            params.push(filters.pb);
        }
        if (filters.dividendYield) {
            conditions.push('v.dividend_yield >= ?');
            params.push(filters.dividendYield);
        }
        if (filters.goldenCross) {
            conditions.push('t.ma5 > t.ma20');
        }

        const query = `
            SELECT s.symbol, s.close as price, s.change_rate as change_pct, s.volume,
                   v.pe_ratio as pe, v.pb_ratio as pb, v.dividend_yield as yield,
                   t.ma5, t.ma20
            FROM stocks s
            LEFT JOIN valuation_features v ON s.symbol = v.symbol AND s.date = v.date
            LEFT JOIN tech_features t ON s.symbol = t.symbol AND s.date = t.date
            WHERE ${conditions.join(' AND ')}
            ORDER BY s.volume DESC
            LIMIT 100
        `;

        return db.prepare(query).all(...params);
    } catch (e) {
        console.error('[MarketService] Screening Error:', e);
        return [];
    }
}

export function getStockDetails(symbol: string) {
    const db = dbService.getRawDb();
    try {
        const latestDateRes = db
            .prepare('SELECT MAX(date) as date FROM stocks WHERE symbol = ?')
            .get(symbol) as { date: string };
        if (!latestDateRes) return null;

        return db
            .prepare(
                `
            SELECT s.*, s.change_rate as change_pct, 
                   v.pe_ratio as pe, v.pb_ratio as pb, v.dividend_yield as yield,
                   t.ma5, t.ma20, t.macd_diff, t.macd_dea
            FROM stocks s
            LEFT JOIN valuation_features v ON s.symbol = v.symbol AND s.date = v.date
            LEFT JOIN tech_features t ON s.symbol = t.symbol AND s.date = t.date
            WHERE s.symbol = ? AND s.date = ?
        `
            )
            .get(symbol, latestDateRes.date);
    } catch (e) {
        return null;
    }
}

export function getStockChips(symbol: string) {
    const db = dbService.getRawDb();
    try {
        return db
            .prepare(
                `
            SELECT date, foreign_buy, trust_buy, dealer_buy
            FROM chip_features
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT 30
        `
            )
            .all(symbol);
    } catch (e) {
        return [];
    }
}

export function getSectorPerformance() {
    // Schema doesn't have sector yet, returning mock or empty for now
    return [];
}
