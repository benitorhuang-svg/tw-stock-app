import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: /api/market/history?date=2026-01-23
 * returns full market snapshot, distribution, and sector summaries.
 */
export const prerender = false;

interface StockRow {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    volume: number;
    _market?: string;
    sector?: string;
}

function getStmts() {
    const db = dbService.getRawDb();

    return {
        summary: db.prepare(`
            SELECT 
                up_count as up, down_count as down, flat_count as flat,
                total_stocks as total, 
                up_turnover as upVolume, down_turnover as downVolume
            FROM market_breadth_history
            WHERE date = ?
        `),
        availDates: db.prepare(
            'SELECT DISTINCT date FROM price_history ORDER BY date DESC LIMIT 60'
        ),
        gainers: db.prepare(`
            SELECT trim(ph.symbol) as symbol,
                   coalesce(s.name, trim(ph.symbol)) as name,
                   ph.close as price, ph.change_pct as changePercent, ph.volume,
                   coalesce(s.market, '') as _market,
                   coalesce(s.sector, '') as sector,
                   di.ma5, di.ma20, di.ma60, di.ma120
            FROM price_history ph
            LEFT JOIN stocks s ON trim(ph.symbol) = s.symbol
            LEFT JOIN daily_indicators di ON trim(ph.symbol) = di.symbol AND ph.date = di.date
            WHERE ph.date = ? AND ph.change_pct >= 0 AND ph.close > 0
            ORDER BY ph.change_pct DESC
            LIMIT 3000
        `),
        losers: db.prepare(`
            SELECT trim(ph.symbol) as symbol,
                   coalesce(s.name, trim(ph.symbol)) as name,
                   ph.close as price, ph.change_pct as changePercent, ph.volume,
                   coalesce(s.market, '') as _market,
                   coalesce(s.sector, '') as sector,
                   di.ma5, di.ma20, di.ma60, di.ma120
            FROM price_history ph
            LEFT JOIN stocks s ON trim(ph.symbol) = s.symbol
            LEFT JOIN daily_indicators di ON trim(ph.symbol) = di.symbol AND ph.date = di.date
            WHERE ph.date = ? AND ph.change_pct <= 0 AND ph.close > 0
            ORDER BY ph.change_pct ASC
            LIMIT 3000
        `),
        volumeLeaders: db.prepare(`
            SELECT trim(ph.symbol) as symbol,
                   coalesce(s.name, trim(ph.symbol)) as name,
                   ph.close as price, ph.change_pct as changePercent, ph.volume,
                   coalesce(s.market, '') as _market,
                   coalesce(s.sector, '') as sector,
                   di.ma5, di.ma20, di.ma60, di.ma120
            FROM price_history ph
            LEFT JOIN stocks s ON trim(ph.symbol) = s.symbol
            LEFT JOIN daily_indicators di ON trim(ph.symbol) = di.symbol AND ph.date = di.date
            WHERE ph.date = ? AND ph.close > 0
            ORDER BY ph.volume DESC
            LIMIT 3000
        `),
        distribution: db.prepare(`
            SELECT 
                count(CASE WHEN change_pct >= 9 THEN 1 END) as p9,
                count(CASE WHEN change_pct >= 6 AND change_pct < 9 THEN 1 END) as p6_9,
                count(CASE WHEN change_pct >= 3 AND change_pct < 6 THEN 1 END) as p3_6,
                count(CASE WHEN change_pct > 0 AND change_pct < 3 THEN 1 END) as p0_3,
                count(CASE WHEN change_pct = 0 THEN 1 END) as zero,
                count(CASE WHEN change_pct > -3 AND change_pct < 0 THEN 1 END) as m0_3,
                count(CASE WHEN change_pct > -6 AND change_pct <= -3 THEN 1 END) as m3_6,
                count(CASE WHEN change_pct > -9 AND change_pct <= -6 THEN 1 END) as m6_9,
                count(CASE WHEN change_pct <= -9 THEN 1 END) as m9
            FROM price_history
            WHERE date = ? AND close > 0
        `),
        sectorSummary: db.prepare(`
            SELECT 
                coalesce(s.sector, 'Other') as name,
                sum(ph.volume) as value,
                avg(ph.change_pct) as change,
                count(*) as count
            FROM price_history ph
            LEFT JOIN stocks s ON trim(ph.symbol) = s.symbol
            WHERE ph.date = ? AND ph.close > 0
            GROUP BY s.sector
        `),
        maBreadth: db.prepare(`
            SELECT ma5_breadth as aboveMA5, ma20_breadth as aboveMA20, ma60_breadth as aboveMA60, ma120_breadth as aboveMA120, total_stocks as total
            FROM market_breadth_history
            WHERE date = ?
        `),
    };
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
        const summary = s.summary.get(date) as any;

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

        const distribution = s.distribution.get(date) as any;
        const sectorSummary = s.sectorSummary.all(date) as any[];
        const maBreadth = s.maBreadth.get(date) as any;
        const ratio = summary.down > 0 ? summary.up / summary.down : 999;

        const gainers: StockRow[] = s.gainers.all(date) as StockRow[];
        const losers: StockRow[] = s.losers.all(date) as StockRow[];
        const volumeLeaders: StockRow[] = s.volumeLeaders.all(date) as StockRow[];

        const today = new Date().toISOString().slice(0, 10);
        const cacheControl =
            date === today ? 'private, no-cache' : 'private, max-age=300, must-revalidate';

        return new Response(
            JSON.stringify({
                date,
                summary: {
                    ...summary,
                    ratio: Number(ratio.toFixed(2)),
                    distribution,
                    sectors: sectorSummary,
                    maBreadth: maBreadth,
                },
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
