import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: /api/market/monthly-ratios?year=2026&month=1
 * 
 * Returns breadth ratio (up/down) for each trading day in the specified month.
 * Used by CyberCalendar to color-code each date based on actual market sentiment.
 * 
 * Optimizations:
 * - Prepared statement for reuse across requests
 * - BETWEEN range query instead of LIKE (index-friendly)
 * - Cache-Control header for browser caching of historical months
 */
export const prerender = false;

// Cached prepared statement (singleton module scope)
let stmtMonthlyRatios: ReturnType<ReturnType<typeof dbService.getRawDb>['prepare']> | null = null;

function getStatement() {
    if (!stmtMonthlyRatios) {
        stmtMonthlyRatios = dbService.getRawDb().prepare(`
            SELECT 
                date,
                count(CASE WHEN change_pct > 0 THEN 1 END) as up,
                count(CASE WHEN change_pct < 0 THEN 1 END) as down,
                count(*) as total
            FROM price_history
            WHERE date BETWEEN ? AND ? AND close > 0
            GROUP BY date
            ORDER BY date
        `);
    }
    return stmtMonthlyRatios;
}

export const GET: APIRoute = async ({ url }) => {
    const year = parseInt(url.searchParams.get('year') || '0');
    const month = parseInt(url.searchParams.get('month') || '0');

    if (!year || !month || month < 1 || month > 12) {
        return new Response(
            JSON.stringify({ error: 'Invalid year/month. Use ?year=2026&month=1' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;
        const endDate = `${year}-${monthStr}-31`;

        const rows = getStatement().all(startDate, endDate) as Array<{
            date: string; up: number; down: number; total: number;
        }>;

        const ratios: Record<number, number> = {};
        for (const row of rows) {
            const day = parseInt(row.date.split('-')[2]);
            ratios[day] = row.down > 0 ? +(row.up / row.down).toFixed(2) : 999;
        }

        // Historical months are immutable — cache them aggressively
        const now = new Date();
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
        const cacheControl = isCurrentMonth
            ? 'public, max-age=300'       // Current month: cache 5 min
            : 'public, max-age=86400';    // Past months: cache 24h

        return new Response(
            JSON.stringify({ year, month, ratios, tradingDays: rows.length }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': cacheControl
                }
            }
        );
    } catch (error) {
        console.error('[Monthly Ratios API Error]', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
