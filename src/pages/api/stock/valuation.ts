import type { APIRoute } from 'astro';
export const prerender = false;
import Database from 'better-sqlite3';
import path from 'path';

export const GET: APIRoute = async ({ url }) => {
    const symbol = url.searchParams.get('symbol');
    // const type = url.searchParams.get('type') || 'pe'; // pe, pb, yield
    const limit = parseInt(url.searchParams.get('limit') || '250'); // Approx 1 year of trading days

    if (!symbol) {
        return new Response(JSON.stringify({ error: 'Symbol required' }), { status: 400 });
    }

    try {
        const dbPath = path.join(process.cwd(), 'public/data/stocks.db');
        const db = new Database(dbPath, { readonly: true });

        const history = db
            .prepare(
                `
            SELECT date, pe, pb, dividend_yield as yield
            FROM valuation_history
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT ?
        `
            )
            .all(symbol, limit);

        db.close();

        return new Response(JSON.stringify(history.reverse()), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Valuation API error:', error);
        return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }
};
