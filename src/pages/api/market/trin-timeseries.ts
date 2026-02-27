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
            SELECT * FROM (
                SELECT 
                    date,
                    count(CASE WHEN change_pct > 0 THEN 1 END) as up_count,
                    count(CASE WHEN change_pct < 0 THEN 1 END) as down_count,
                    sum(CASE WHEN change_pct > 0 THEN volume ELSE 0 END) as up_vol,
                    sum(CASE WHEN change_pct < 0 THEN volume ELSE 0 END) as down_vol
                FROM price_history
                WHERE close > 0
                GROUP BY date
                ORDER BY date DESC
                LIMIT 150
            ) sub
            ORDER BY date ASC
        `).all() as any[];

        const results = rows.map(r => {
            const upRatio = r.down_count > 0 ? r.up_count / r.down_count : 1;
            const volRatio = r.down_vol > 0 ? r.up_vol / r.down_vol : 1;
            // Handle edge cases and division by zero
            let trin = 1;
            if (volRatio > 0) {
                trin = upRatio / volRatio;
            }
            // Clamp value to avoid extremes ruining the chart
            trin = Math.min(Math.max(trin, 0.2), 5);

            return {
                date: r.date,
                trin: parseFloat(trin.toFixed(3))
            };
        });

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
