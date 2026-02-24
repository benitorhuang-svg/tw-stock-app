import type { APIRoute } from 'astro';
import { dbService } from '../../lib/db/sqlite-service';
import { getStrategy } from '../../data/strategies';

interface ScreenerBody {
    strategyId?: string;
    pe?: { min?: number; max?: number };
    pb?: { min?: number; max?: number };
    dividendYield?: { min?: number; max?: number };
    revenueYoY?: { min?: number; max?: number };
    page?: number;
    limit?: number;
}

const PRESET_FILTERS: Record<string, Omit<ScreenerBody, 'page' | 'limit' | 'strategyId'>> = {
    'low-pe': { pe: { max: 15 } },
    'low-pb': { pb: { max: 1.5 } },
    'high-dividend': { dividendYield: { min: 5 } },
    'revenue-growth': { revenueYoY: { min: 10 } },
    momentum: { pe: { max: 25 } },
    'smart-money': {},
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = (await request.json()) as ScreenerBody;
        const strategyId = body.strategyId;
        const strategy = strategyId ? getStrategy(strategyId) : undefined;

        const mergedFilters: ScreenerBody = {
            ...PRESET_FILTERS[strategyId || ''],
            ...body,
        };

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

        if (mergedFilters.pe?.min !== undefined) {
            fromAndWhereSql += ' AND lp.pe >= ?';
            params.push(mergedFilters.pe.min);
        }
        if (mergedFilters.pe?.max !== undefined) {
            fromAndWhereSql += ' AND lp.pe > 0 AND lp.pe <= ?';
            params.push(mergedFilters.pe.max);
        }
        if (mergedFilters.pb?.min !== undefined) {
            fromAndWhereSql += ' AND lp.pb >= ?';
            params.push(mergedFilters.pb.min);
        }
        if (mergedFilters.pb?.max !== undefined) {
            fromAndWhereSql += ' AND lp.pb > 0 AND lp.pb <= ?';
            params.push(mergedFilters.pb.max);
        }
        if (mergedFilters.dividendYield?.min !== undefined) {
            fromAndWhereSql += ' AND lp.yield >= ?';
            params.push(mergedFilters.dividendYield.min);
        }
        if (mergedFilters.dividendYield?.max !== undefined) {
            fromAndWhereSql += ' AND lp.yield <= ?';
            params.push(mergedFilters.dividendYield.max);
        }
        if (mergedFilters.revenueYoY?.min !== undefined) {
            fromAndWhereSql += ' AND lp.revenue_yoy >= ?';
            params.push(mergedFilters.revenueYoY.min);
        }
        if (mergedFilters.revenueYoY?.max !== undefined) {
            fromAndWhereSql += ' AND lp.revenue_yoy <= ?';
            params.push(mergedFilters.revenueYoY.max);
        }

        if (strategyId === 'volume-breakout' || strategyId === 'breakout') {
            fromAndWhereSql += ' AND lp.volume > (lp.ma20 * 1.5) AND lp.close > lp.ma20';
        }
        if (strategyId === 'foreign-buy') {
            fromAndWhereSql += ' AND COALESCE(ch.foreign_inv, 0) > 0';
        }
        if (strategyId === 'trust-buy') {
            fromAndWhereSql += ' AND COALESCE(ch.invest_trust, 0) > 0';
        }
        if (strategyId === 'smart-money') {
            fromAndWhereSql +=
                ' AND lp.change_pct < -2 AND (COALESCE(ch.foreign_inv, 0) + COALESCE(ch.invest_trust, 0)) > 0';
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
                COALESCE(ch.foreign_inv, 0) AS foreign_inv,
                COALESCE(ch.invest_trust, 0) AS invest_trust,
                COALESCE(ch.dealer, 0) AS dealer
            ${fromAndWhereSql}
            ORDER BY lp.volume DESC, lp.change_pct DESC
            LIMIT ? OFFSET ?
        `;

        const rows = dbService.queryAll<any>(rowsSql, [...params, limit, offset]);

        const results = rows.map((r: any) => {
            const matchedStrategies: string[] = [];
            if (strategy?.name) {
                matchedStrategies.push(strategy.name);
            } else {
                if ((mergedFilters.pe?.max ?? 0) > 0) matchedStrategies.push('低本益比');
                if ((mergedFilters.pb?.max ?? 0) > 0) matchedStrategies.push('低P/B');
                if ((mergedFilters.dividendYield?.min ?? 0) > 0) matchedStrategies.push('高殖利率');
                if ((mergedFilters.revenueYoY?.min ?? 0) > 0) matchedStrategies.push('營收成長');
            }
            if (matchedStrategies.length === 0) matchedStrategies.push('智能篩選');

            return {
                symbol: r.symbol,
                name: r.name || r.symbol,
                sector: r.sector,
                matchedStrategies,
                fundamentals: {
                    pe: r.pe || 0,
                    pb: r.pb || 0,
                    dividendYield: r.yield || 0,
                    revenueYoY: r.revenue_yoy || 0,
                    grossMargin: r.gross_margin || 0,
                    operatingMargin: r.operating_margin || 0,
                    netMargin: r.net_margin || 0,
                },
                price: r.close,
                changePercent: r.change_pct,
                volume: r.volume,
                chips: {
                    foreign: r.foreign_inv || 0,
                    trust: r.invest_trust || 0,
                    dealer: r.dealer || 0,
                },
            };
        });

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
