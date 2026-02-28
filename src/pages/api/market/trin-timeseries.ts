import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: /api/market/trin-timeseries
 * 
 * TRIN (Arms Index) = (Up Count / Down Count) / (Up Volume / Down Volume)
 */
export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const db = dbService.getRawDb();
        const rows = db.prepare(`
            SELECT date, trin
            FROM market_breadth_history
            WHERE trin IS NOT NULL
            ORDER BY date DESC
            LIMIT 150
        `).all() as any[];

        // Reverse to ascending order for chart rendering
        rows.reverse();

        return new Response(JSON.stringify(rows), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
};
