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
        const rows = db.prepare(`
            SELECT 
                date,
                count(CASE WHEN change_pct > 0 THEN 1 END) as up,
                count(CASE WHEN change_pct < 0 THEN 1 END) as down,
                count(CASE WHEN change_pct = 0 THEN 1 END) as flat
            FROM price_history
            WHERE close > 0
            GROUP BY date
            ORDER BY date ASC
        `).all() as Array<{ date: string; up: number; down: number; flat: number; }>;

        return new Response(JSON.stringify(rows), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
};
