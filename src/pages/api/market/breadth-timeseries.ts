import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: /api/market/breadth-timeseries?days=30
 *
 * Returns daily market breadth data (Up/Down counts) for the last N days.
 */
export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const db = dbService.getRawDb();
        const rows = db
            .prepare(
                `
                SELECT 
                    date,
                    up_count as up,
                    down_count as down,
                    flat_count as flat,
                    up_turnover as upTurnover,
                    down_turnover as downTurnover,
                    up_volume as upVolume,
                    down_volume as downVolume,
                    trin,
                    ma5_breadth,
                    ma20_breadth,
                    ma60_breadth,
                    ma120_breadth
                FROM market_breadth_history
                ORDER BY date DESC
                LIMIT 150
        `
            )
            .all() as any[];

        // Keep ASC order for charts
        const results = rows.reverse();

        return new Response(JSON.stringify(results), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
};
