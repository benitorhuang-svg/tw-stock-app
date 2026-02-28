import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: /api/market/latest
 * Returns latest-date market snapshot (gainers, losers, summary, distribution).
 * Used by DashboardController for client-side initial load.
 */
export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const db = dbService.getRawDb();

        const selectCols = `s.symbol, s.name, s.market, s.sector, lp.close as price, lp.change_pct as changePercent, lp.volume, lp.ma5, lp.ma20, lp.ma60, lp.ma120`;

        const gainers = db
            .prepare(
                `SELECT ${selectCols} FROM latest_prices lp JOIN stocks s ON s.symbol = lp.symbol WHERE lp.change_pct > 0 AND lp.close > 0 ORDER BY lp.change_pct DESC LIMIT 500`
            )
            .all();

        const losers = db
            .prepare(
                `SELECT ${selectCols} FROM latest_prices lp JOIN stocks s ON s.symbol = lp.symbol WHERE lp.change_pct <= 0 AND lp.close > 0 ORDER BY lp.change_pct ASC LIMIT 500`
            )
            .all();

        return new Response(JSON.stringify({ gainers, losers }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
