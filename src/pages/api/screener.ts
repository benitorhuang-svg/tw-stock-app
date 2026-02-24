import type { APIRoute } from 'astro';
import { dbService } from '../../lib/db/sqlite-service';
import { getStrategy } from '../../data/strategies';

interface ScreenerBody {
    strategyId?: string;
    filters?: {
        pe?: number;
        pb?: number;
        yield?: number;
        rev?: number;
        margin?: number;
        eps?: number;
        foreign?: number;
        trust?: number;
    };
    page?: number;
    limit?: number;
}

const PRESET_FILTERS: Record<string, any> = {
    'low-pe': { filters: { pe: 15 } },
    'low-pb': { filters: { pb: 1.5 } },
    'high-dividend': { filters: { yield: 5 } },
    'revenue-growth': { filters: { rev: 10 } },
    'volume-breakout': { strategyId: 'volume-breakout' },
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = (await request.json()) as ScreenerBody;
        const strategy = body.strategyId ? getStrategy(body.strategyId) : undefined;
        const mergedFilters: ScreenerBody = {
            ...PRESET_FILTERS[body.strategyId || ''],
            ...body,
        };

        const f = mergedFilters.filters || {};
        const page = Math.max(1, Number(mergedFilters.page || 1));
        const limit = Math.min(200, Math.max(1, Number(mergedFilters.limit || 50)));
        const offset = (page - 1) * limit;

        let fromAndWhereSql = `
            FROM latest_prices lp
            JOIN stocks s ON s.symbol = lp.symbol
            LEFT JOIN chips ch ON ch.symbol = lp.symbol
                AND ch.date = (SELECT MAX(date) FROM chips)
            WHERE 1 = 1
        `;
        const params: any[] = [];

        // Quantitative Vectors
        if (f.pe !== undefined) {
            fromAndWhereSql += ' AND lp.pe > 0 AND lp.pe <= ?';
            params.push(f.pe);
        }
        if (f.pb !== undefined) {
            fromAndWhereSql += ' AND lp.pb > 0 AND lp.pb <= ?';
            params.push(f.pb);
        }
        if (f.yield !== undefined && f.yield > 0) {
            fromAndWhereSql += ' AND lp.yield >= ?';
            params.push(f.yield);
        }
        if (f.rev !== undefined && f.rev > -20) {
            fromAndWhereSql += ' AND lp.revenue_yoy >= ?';
            params.push(f.rev);
        }
        if (f.margin !== undefined && f.margin > -10) {
            fromAndWhereSql += ' AND lp.operating_margin >= ?';
            params.push(f.margin);
        }
        if (f.eps !== undefined && f.eps > -5) {
            fromAndWhereSql += ' AND lp.eps >= ?';
            params.push(f.eps);
        }

        // Institutional Domain Vectors
        if (f.foreign !== undefined && f.foreign > 0) {
            // This would ideally join a 'streaks' table or compute on the fly
            // For now, let's assume if streak > 0, we check if today's foreign_inv > 0
            fromAndWhereSql += ' AND COALESCE(ch.foreign_inv, 0) > 0';
        }
        if (f.trust !== undefined && f.trust > 0) {
            fromAndWhereSql += ' AND COALESCE(ch.invest_trust, 0) > 0';
        }

        // Preset Strategy Logic
        if (mergedFilters.strategyId === 'volume-breakout') {
            fromAndWhereSql += ' AND lp.volume > (lp.ma20 * 1.5) AND lp.close > lp.ma20';
        }

        const totalRow = dbService.queryOne<{ total: number }>(
            `SELECT COUNT(*) as total ${fromAndWhereSql}`,
            params
        );
        const total = totalRow?.total || 0;

        const rowsSql = `
            SELECT
                s.symbol,
                s.name,
                s.sector,
                lp.close,
                lp.change_pct,
                lp.volume,
                lp.pe,
                lp.pb,
                lp.yield,
                lp.revenue_yoy,
                lp.gross_margin,
                lp.operating_margin,
                lp.net_margin,
                lp.eps,
                COALESCE(ch.foreign_inv, 0) AS foreign_inv,
                COALESCE(ch.invest_trust, 0) AS invest_trust,
                COALESCE(ch.dealer, 0) AS dealer
            ${fromAndWhereSql}
            ORDER BY lp.volume DESC
            LIMIT ? OFFSET ?
        `;

        const rows = dbService.queryAll<any>(rowsSql, [...params, limit, offset]);

        const results = rows.map((r: any) => ({
            symbol: r.symbol,
            name: r.name || r.symbol,
            sector: r.sector,
            fundamentals: {
                pe: r.pe || 0,
                pb: r.pb || 0,
                dividendYield: r.yield || 0,
                revenueYoY: r.revenue_yoy || 0,
                grossMargin: r.gross_margin || 0,
                operatingMargin: r.operating_margin || 0,
                netMargin: r.net_margin || 0,
                eps: r.eps || 0,
            },
            price: r.close,
            changePercent: r.change_pct,
            volume: r.volume,
            chips: {
                foreign: r.foreign_inv || 0,
                trust: r.invest_trust || 0,
                dealer: r.dealer || 0,
            },
        }));

        return new Response(
            JSON.stringify({
                success: true,
                strategy: strategy ? { id: strategy.id, name: strategy.name } : null,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                count: results.length,
                results,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Screener API error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: String(error),
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};

export const GET: APIRoute = async ({ url }) => {
    try {
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || '50')));
        const rows = dbService.queryAll(
            `
            SELECT s.symbol, s.name, s.sector, lp.close, lp.change_pct, lp.volume, lp.pe, lp.pb, lp.yield
            FROM latest_prices lp
            JOIN stocks s ON s.symbol = lp.symbol
            ORDER BY lp.volume DESC
            LIMIT ?
            `,
            [limit]
        );

        return new Response(JSON.stringify({ success: true, data: rows }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: String(error) }), {
            status: 500,
        });
    }
};
