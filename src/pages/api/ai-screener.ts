import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService, openWritableDb } from '../../lib/db/sqlite-service';

/**
 * AI Screener — Multi-factor scoring engine with DB persistence
 *
 * POST /api/ai-screener  → Compute scores from latest_prices, persist to screener_scores, return results
 * GET  /api/ai-screener  → Read persisted scores (falls back to real-time if table empty)
 *
 * Scoring model:
 *   technical_score  = f(RSI, MA crossover, change_pct)
 *   chip_score       = f(foreign_inv, invest_trust, dealer)
 *   fundamental_score= f(PE, PB, yield, EPS, revenue_yoy)
 *   total_score      = 40% tech + 30% chip + 30% fund
 */

/** Shared SQL CTE that computes all scores from latest_prices */
const SCORING_CTE = `
    WITH scored AS (
        SELECT
            lp.symbol,
            s.name,
            COALESCE(s.sector, lp.sector) AS sector,
            lp.date,
            lp.close,
            lp.change_pct,
            lp.volume,
            COALESCE(lp.pe, 0) AS pe,
            COALESCE(lp.pb, 0) AS pb,
            COALESCE(lp.yield, 0) AS yield_pct,
            COALESCE(lp.foreign_inv, 0) AS foreign_inv,
            COALESCE(lp.invest_trust, 0) AS invest_trust,

            -- Technical Score (0~100)
            ROUND(
                CASE
                    WHEN COALESCE(lp.rsi, 50) < 30 THEN 80 + (30 - COALESCE(lp.rsi, 50))
                    WHEN COALESCE(lp.rsi, 50) BETWEEN 30 AND 50 THEN 60 + (50 - COALESCE(lp.rsi, 50))
                    WHEN COALESCE(lp.rsi, 50) BETWEEN 50 AND 70 THEN 50 - (COALESCE(lp.rsi, 50) - 50) * 0.5
                    ELSE MAX(10, 40 - (COALESCE(lp.rsi, 50) - 70))
                END
                + CASE WHEN lp.close > COALESCE(lp.ma20, lp.close) AND COALESCE(lp.ma20, 0) > COALESCE(lp.ma60, 0) THEN 15
                       WHEN lp.close > COALESCE(lp.ma20, lp.close) THEN 8
                       WHEN lp.close < COALESCE(lp.ma20, lp.close) AND COALESCE(lp.ma20, 0) < COALESCE(lp.ma60, 0) THEN -10
                       ELSE 0 END
                + CASE WHEN lp.change_pct > 3 THEN 10
                       WHEN lp.change_pct > 0 THEN 5
                       WHEN lp.change_pct < -3 THEN -10
                       ELSE -3 END
            , 1) AS technical_score,

            -- Chip Score (0~100)
            ROUND(
                50
                + CASE WHEN COALESCE(lp.foreign_inv, 0) > 1000 THEN 20
                       WHEN COALESCE(lp.foreign_inv, 0) > 0 THEN 10
                       WHEN COALESCE(lp.foreign_inv, 0) < -1000 THEN -20
                       WHEN COALESCE(lp.foreign_inv, 0) < 0 THEN -10
                       ELSE 0 END
                + CASE WHEN COALESCE(lp.invest_trust, 0) > 500 THEN 15
                       WHEN COALESCE(lp.invest_trust, 0) > 0 THEN 8
                       WHEN COALESCE(lp.invest_trust, 0) < -500 THEN -15
                       WHEN COALESCE(lp.invest_trust, 0) < 0 THEN -5
                       ELSE 0 END
                + CASE WHEN COALESCE(lp.dealer, 0) > 200 THEN 10
                       WHEN COALESCE(lp.dealer, 0) > 0 THEN 5
                       WHEN COALESCE(lp.dealer, 0) < -200 THEN -10
                       ELSE 0 END
            , 1) AS chip_score,

            -- Fundamental Score (0~100)
            ROUND(
                50
                + CASE WHEN COALESCE(lp.pe, 0) > 0 AND lp.pe < 12 THEN 20
                       WHEN COALESCE(lp.pe, 0) > 0 AND lp.pe < 20 THEN 10
                       WHEN COALESCE(lp.pe, 0) > 40 THEN -15
                       ELSE 0 END
                + CASE WHEN COALESCE(lp.pb, 0) > 0 AND lp.pb < 1.5 THEN 15
                       WHEN COALESCE(lp.pb, 0) > 0 AND lp.pb < 3 THEN 5
                       WHEN COALESCE(lp.pb, 0) > 5 THEN -10
                       ELSE 0 END
                + CASE WHEN COALESCE(lp.yield, 0) > 5 THEN 15
                       WHEN COALESCE(lp.yield, 0) > 3 THEN 8
                       ELSE 0 END
                + CASE WHEN COALESCE(lp.eps, 0) > 3 THEN 10
                       WHEN COALESCE(lp.eps, 0) > 0 THEN 5
                       WHEN COALESCE(lp.eps, 0) < 0 THEN -10
                       ELSE 0 END
                + CASE WHEN COALESCE(lp.revenue_yoy, 0) > 20 THEN 10
                       WHEN COALESCE(lp.revenue_yoy, 0) > 0 THEN 5
                       WHEN COALESCE(lp.revenue_yoy, 0) < -10 THEN -10
                       ELSE 0 END
            , 1) AS fundamental_score
        FROM latest_prices lp
        JOIN stocks s ON lp.symbol = s.symbol
        WHERE lp.close > 0 AND lp.volume > 0
    ),
    ranked AS (
        SELECT *,
            ROUND(
                MIN(100, MAX(0, technical_score)) * 0.4
                + MIN(100, MAX(0, chip_score)) * 0.3
                + MIN(100, MAX(0, fundamental_score)) * 0.3
            , 1) AS total_score
        FROM scored
    ),
    signaled AS (
        SELECT *,
            CASE
                WHEN total_score >= 75 THEN 'STRONG_BUY'
                WHEN total_score >= 60 THEN 'BUY'
                WHEN total_score <= 25 THEN 'STRONG_SELL'
                WHEN total_score <= 40 THEN 'SELL'
                ELSE 'HOLD'
            END AS signal
        FROM ranked
    )`;

interface ScoredRow {
    symbol: string;
    name: string;
    sector: string | null;
    date: string;
    technical_score: number;
    chip_score: number;
    fundamental_score: number;
    total_score: number;
    signal: string;
    close: number;
    change_pct: number;
    volume: number;
    pe: number;
    pb: number;
    yield_pct: number;
    foreign_inv: number;
    invest_trust: number;
}

/**
 * POST — Compute scores, persist to screener_scores, return results
 */
export const POST: APIRoute = async ({ url }) => {
    try {
        const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
        const signal = url.searchParams.get('signal');

        // Step 1: Compute scores
        const selectSql = `${SCORING_CTE}
            SELECT * FROM signaled
            WHERE total_score >= 55 OR total_score <= 35
            ORDER BY total_score DESC`;

        const allScored = dbService.queryAll<ScoredRow>(selectSql);

        // Step 2: Persist to screener_scores via writable connection
        let persisted = 0;
        const wdb = openWritableDb();
        if (wdb) {
            try {
                // Ensure table exists
                wdb.exec(`
                    CREATE TABLE IF NOT EXISTS screener_scores (
                        symbol TEXT NOT NULL,
                        date TEXT NOT NULL,
                        fundamental_score REAL DEFAULT 0,
                        valuation_score REAL DEFAULT 0,
                        technical_score REAL DEFAULT 0,
                        chip_score REAL DEFAULT 0,
                        forensic_score REAL DEFAULT 0,
                        total_score REAL DEFAULT 0,
                        signal TEXT,
                        PRIMARY KEY (symbol, date)
                    )
                `);

                const today = new Date().toISOString().slice(0, 10);
                const insert = wdb.prepare(`
                    INSERT OR REPLACE INTO screener_scores
                    (symbol, date, fundamental_score, technical_score, chip_score, total_score, signal)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                const tx = wdb.transaction((rows: unknown) => {
                    for (const r of rows as ScoredRow[]) {
                        insert.run(
                            r.symbol, today,
                            r.fundamental_score, r.technical_score, r.chip_score,
                            r.total_score, r.signal,
                        );
                        persisted++;
                    }
                });
                tx(allScored);
            } finally {
                wdb.close();
            }
        }

        // Step 3: Return filtered results
        let results = allScored;
        if (signal) {
            results = results.filter(r => r.signal === signal);
        }
        results = results.slice(0, limit);

        return new Response(
            JSON.stringify({
                results,
                total: allScored.length,
                persisted,
                limit,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (err: any) {
        console.error('[AI-Screener POST]', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

/**
 * GET — Read persisted scores; if empty, compute in real-time
 */
export const GET: APIRoute = async ({ url }) => {
    try {
        const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
        const signal = url.searchParams.get('signal');

        // Try reading persisted scores first
        let rows: ScoredRow[] = [];
        let total = 0;
        try {
            const conditions = ['ss.total_score > 0'];
            const params: (string | number)[] = [];
            if (signal) {
                conditions.push('ss.signal = ?');
                params.push(signal);
            }
            const where = `WHERE ${conditions.join(' AND ')}`;

            const persistedSql = `
                SELECT
                    ss.symbol, s.name,
                    COALESCE(s.sector, '') AS sector,
                    ss.date,
                    ss.technical_score,
                    ss.chip_score,
                    COALESCE(ss.fundamental_score, 0) AS fundamental_score,
                    ss.total_score,
                    ss.signal,
                    COALESCE(lp.close, 0) AS close,
                    COALESCE(lp.change_pct, 0) AS change_pct,
                    COALESCE(lp.volume, 0) AS volume,
                    COALESCE(lp.pe, 0) AS pe,
                    COALESCE(lp.pb, 0) AS pb,
                    COALESCE(lp.yield, 0) AS yield_pct,
                    COALESCE(lp.foreign_inv, 0) AS foreign_inv,
                    COALESCE(lp.invest_trust, 0) AS invest_trust
                FROM screener_scores ss
                JOIN stocks s ON ss.symbol = s.symbol
                LEFT JOIN latest_prices lp ON ss.symbol = lp.symbol
                ${where}
                ORDER BY ss.total_score DESC
                LIMIT ?
            `;
            params.push(limit);

            rows = dbService.queryAll<ScoredRow>(persistedSql, params);

            const cntParams: (string | number)[] = [];
            if (signal) cntParams.push(signal);
            const countSql = `SELECT COUNT(*) as cnt FROM screener_scores ss ${where}`;
            const countRow = dbService.queryOne<{ cnt: number }>(countSql, cntParams);
            total = countRow?.cnt ?? 0;
        } catch {
            // Table doesn't exist or other error — fall through to real-time
        }

        // Fallback: compute in real-time if no persisted data
        if (rows.length === 0) {
            const rtSql = `${SCORING_CTE}
                SELECT * FROM signaled
                ${signal ? "WHERE signal = ?" : "WHERE total_score >= 55 OR total_score <= 35"}
                ORDER BY total_score DESC
                LIMIT ?
            `;
            const params: (string | number)[] = [];
            if (signal) params.push(signal);
            params.push(limit);

            rows = dbService.queryAll<ScoredRow>(rtSql, params);
            total = rows.length;
        }

        return new Response(
            JSON.stringify({ results: rows, total, limit }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (err: any) {
        console.error('[AI-Screener GET]', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
