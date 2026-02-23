/**
 * 本地優先篩選服務
 * 優先使用本地 sql.js 資料庫進行篩選
 */

import { getDatabase } from './database';
import { filterStocks, getStocks, type Stock, type Fundamental } from './stock-service';
import type { ScreenerCriteria, ScreenerResult } from './screener';

// 快取 TTL (毫秒)
const CACHE_TTL = 10 * 60 * 1000; // 10 分鐘

interface CacheEntry {
    data: ScreenerResult[];
    timestamp: number;
    criteriaKey: string;
}

let resultsCache: CacheEntry | null = null;

/**
 * 本地優先篩選
 * 1. 先查本地資料庫
 * 2. 如果本地無資料，才嘗試 API
 */
export async function screenStocksLocal(criteria: ScreenerCriteria): Promise<ScreenerResult[]> {
    const criteriaKey = JSON.stringify(criteria);

    // 檢查快取
    if (
        resultsCache &&
        resultsCache.criteriaKey === criteriaKey &&
        Date.now() - resultsCache.timestamp < CACHE_TTL
    ) {
        console.log('[Screener] Using cached results');
        return resultsCache.data;
    }

    try {
        // 嘗試本地資料庫查詢
        const db = await getDatabase();
        if (db) {
            console.log('[Screener] Querying local database');
            const results = await queryLocalDatabase(criteria);
            if (results.length > 0) {
                resultsCache = { data: results, timestamp: Date.now(), criteriaKey };
                return results;
            }
        }
    } catch (error) {
        console.warn('[Screener] Local DB query failed:', error);
    }

    // 本地無資料時嘗試 API
    try {
        console.log('[Screener] Falling back to API');
        const response = await fetch('/api/screener', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(criteria),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.results) {
                resultsCache = { data: data.results, timestamp: Date.now(), criteriaKey };
                return data.results;
            }
        }
    } catch (error) {
        console.warn('[Screener] API fallback failed:', error);
    }

    return [];
}

/**
 * 查詢本地資料庫
 */
async function queryLocalDatabase(criteria: ScreenerCriteria): Promise<ScreenerResult[]> {
    // 轉換為 filterStocks 格式
    const conditions: {
        minPE?: number;
        maxPE?: number;
        minYield?: number;
        minROE?: number;
    } = {};

    if (criteria.pe?.max) conditions.maxPE = criteria.pe.max;
    if (criteria.dividendYield?.min) conditions.minYield = criteria.dividendYield.min;
    if (criteria.roe?.min) conditions.minROE = criteria.roe.min;

    const rawResults = await filterStocks(conditions);

    // 轉換為 ScreenerResult 格式
    return rawResults
        .map(r => {
            const matchedStrategies: string[] = [];

            if (criteria.pe?.max && r.pe && r.pe > 0 && r.pe <= criteria.pe.max) {
                matchedStrategies.push('低本益比');
            }
            if (criteria.pb?.max && r.pb && r.pb <= criteria.pb.max) {
                matchedStrategies.push('低P/B');
            }
            if (
                criteria.dividendYield?.min &&
                r.dividend_yield &&
                r.dividend_yield >= criteria.dividendYield.min
            ) {
                matchedStrategies.push('高殖利率');
            }
            if (criteria.roe?.min && r.roe && r.roe >= criteria.roe.min) {
                matchedStrategies.push('高ROE');
            }

            return {
                symbol: r.symbol,
                name: r.name,
                matchedStrategies,
                fundamentals: {
                    symbol: r.symbol,
                    pe: r.pe,
                    pb: r.pb,
                    dividendYield: r.dividend_yield,
                    roe: r.roe,
                },
            } as ScreenerResult;
        })
        .filter(r => r.matchedStrategies.length > 0);
}

/**
 * 取得本地股票總數
 */
export async function getLocalStockCount(): Promise<number> {
    try {
        const stocks = await getStocks();
        return stocks.length;
    } catch {
        return 0;
    }
}

/**
 * 清除快取
 */
export function clearScreenerCache(): void {
    resultsCache = null;
}
