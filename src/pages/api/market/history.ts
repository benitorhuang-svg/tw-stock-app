import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: /api/market/history?date=2026-01-23
 *
 * Atomic Data Service: Returns full market snapshot for a specific date.
 * Used by the CyberCalendar (Temporal Registry) to synchronize all dashboard widgets.
 *
 * Optimizations:
 * - All queries use cached prepared statements (module-scope singleton)
 * - Cache-Control headers for browser caching
 */
export const prerender = false;

interface StockRow {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    volume: number;
}

// ═══ Cached Prepared Statements (module scope, reused across requests) ═══
let stmts: {
    summary: ReturnType<ReturnType<typeof dbService.getRawDb>['prepare']>;
    availDates: ReturnType<ReturnType<typeof dbService.getRawDb>['prepare']>;
    gainers: ReturnType<ReturnType<typeof dbService.getRawDb>['prepare']>;
    losers: ReturnType<ReturnType<typeof dbService.getRawDb>['prepare']>;
    volumeLeaders: ReturnType<ReturnType<typeof dbService.getRawDb>['prepare']>;
} | null = null;

function getStmts() {
    if (!stmts) {
        const db = dbService.getRawDb();
        stmts = {
            summary: db.prepare(`
                SELECT 
                    count(CASE WHEN change_pct > 0 THEN 1 END) as up,
                    count(CASE WHEN change_pct < 0 THEN 1 END) as down,
                    count(CASE WHEN change_pct = 0 THEN 1 END) as flat,
                    count(*) as total,
                    coalesce(sum(volume), 0) as totalVolume,
                    coalesce(avg(change_pct), 0) as avgChange
                FROM price_history
                WHERE date = ? AND close > 0
            `),
            availDates: db.prepare(
                'SELECT DISTINCT date FROM price_history ORDER BY date DESC LIMIT 20'
            ),
            gainers: db.prepare(`
                SELECT ph.symbol, coalesce(s.name, ph.symbol) as name, 
                       ph.close as price, ph.change_pct as changePercent, ph.volume
                FROM price_history ph
                LEFT JOIN stocks s ON ph.symbol = s.symbol
                WHERE ph.date = ? AND ph.change_pct > 0 AND ph.close > 0
                ORDER BY ph.change_pct DESC
                LIMIT 10
            `),
            losers: db.prepare(`
                SELECT ph.symbol, coalesce(s.name, ph.symbol) as name,
                       ph.close as price, ph.change_pct as changePercent, ph.volume
                FROM price_history ph
                LEFT JOIN stocks s ON ph.symbol = s.symbol
                WHERE ph.date = ? AND ph.change_pct < 0 AND ph.close > 0
                ORDER BY ph.change_pct ASC
                LIMIT 10
            `),
            volumeLeaders: db.prepare(`
                SELECT ph.symbol, coalesce(s.name, ph.symbol) as name,
                       ph.close as price, ph.change_pct as changePercent, ph.volume
                FROM price_history ph
                LEFT JOIN stocks s ON ph.symbol = s.symbol
                WHERE ph.date = ? AND ph.close > 0
                ORDER BY ph.volume DESC
                LIMIT 4
            `),
        };
    }
    return stmts;
}

export const GET: APIRoute = async ({ url }) => {
    const date = url.searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const s = getStmts();

        const summary = s.summary.get(date) as {
            up: number;
            down: number;
            flat: number;
            total: number;
            totalVolume: number;
            avgChange: number;
        };

        if (!summary || summary.total === 0) {
            return new Response(
                JSON.stringify({
                    error: 'No data found for this date.',
                    date,
                    availableDates: s.availDates.all().map((d: any) => d.date),
                }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const ratio = summary.down > 0 ? summary.up / summary.down : 999;

        const gainers: StockRow[] = s.gainers.all(date) as StockRow[];
        const losers: StockRow[] = s.losers.all(date) as StockRow[];
        const volumeLeaders: StockRow[] = s.volumeLeaders.all(date) as StockRow[];

        // Determine caching strategy
        const today = new Date().toISOString().slice(0, 10);
        const cacheControl =
            date === today
                ? 'public, max-age=60' // Today: cache 1 min
                : 'public, max-age=86400'; // Past dates: cache 24h (immutable)

        return new Response(
            JSON.stringify({
                date,
                summary: { ...summary, ratio: Number(ratio.toFixed(2)) },
                gainers,
                losers,
                volumeLeaders,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': cacheControl,
                },
            }
        );
    } catch (error) {
        console.error('[Market History API Error]', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
