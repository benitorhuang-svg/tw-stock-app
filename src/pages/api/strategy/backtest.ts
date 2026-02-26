import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService } from '../../../lib/db/sqlite-service';

export const GET: APIRoute = async () => {
    try {
        // Simple backtest: "Foreign Streak of 3 days -> 5-day return"
        // We pick the most recent streaks detected in history

        const results = dbService.queryAll<{
            symbol: string,
            name: string,
            streak_date: string,
            entry_price: number,
            exit_price: number,
            return_pct: number
        }>(`
            WITH DailySignals AS (
                SELECT 
                    symbol, 
                    date,
                    close,
                    LEAD(close, 5) OVER (PARTITION BY symbol ORDER BY date) as future_close,
                    foreign_inv > 0 AND 
                    LAG(foreign_inv, 1) OVER (PARTITION BY symbol ORDER BY date) > 0 AND
                    LAG(foreign_inv, 2) OVER (PARTITION BY symbol ORDER BY date) > 0 as is_streak_3
                FROM chips
                JOIN price_history USING (symbol, date)
            )
            SELECT 
                ds.symbol,
                s.name,
                ds.date as streak_date,
                ds.close as entry_price,
                ds.future_close as exit_price,
                ((ds.future_close - ds.close) / ds.close) * 100 as return_pct
            FROM DailySignals ds
            JOIN stocks s ON ds.symbol = s.symbol
            WHERE ds.is_streak_3 = 1 AND ds.future_close IS NOT NULL
            ORDER BY ds.date DESC
            LIMIT 100
        `);

        if (results.length === 0) {
            return new Response(JSON.stringify({ status: 'success', stats: { winRate: 0, avgReturn: 0, samples: 0 }, data: [] }));
        }

        // Aggregate stats
        const winRate = results.filter((r) => r.return_pct > 0).length / results.length;
        const avgReturn = results.reduce((sum: number, r) => sum + r.return_pct, 0) / results.length;

        return new Response(JSON.stringify({
            status: 'success',
            stats: {
                samples: results.length,
                winRate,
                avgReturn
            },
            data: results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
};
