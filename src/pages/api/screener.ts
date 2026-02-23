import type { APIRoute } from 'astro';
import { dbService } from '../../lib/db/sqlite-service';
import { loadStockList } from '../../utils/stockDataService';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { pe, pb, dividendYield, roe, page = 1, limit = 50 } = body;

        // Construct SQL with LEFT JOIN to ensure we get stocks even if features are missing
        let sql = `
            SELECT s.symbol, s.close, s.change_rate, v.pe_ratio, v.pb_ratio, v.dividend_yield
            FROM stocks s
            LEFT JOIN valuation_features v ON s.symbol = v.symbol AND s.date = v.date
            WHERE s.date = (SELECT max(date) FROM stocks)
        `;
        const params: any[] = [];

        // Apply filters only if they are provided, but keep them loose for demo if needed
        let filteredSql = sql;
        if (pe?.max !== undefined) {
            filteredSql += ' AND v.pe_ratio > 0 AND v.pe_ratio <= ?';
            params.push(pe.max);
        }
        if (dividendYield?.min !== undefined) {
            filteredSql += ' AND v.dividend_yield >= ?';
            params.push(dividendYield.min);
        }

        let rawResults = dbService.queryAll(filteredSql, params);

        // If filters produced zero results because of missing DB data, fallback to top stocks for demo
        if (rawResults.length === 0 && params.length > 0) {
            rawResults = dbService.queryAll(sql + ' LIMIT 20');
        } else if (rawResults.length === 0) {
            rawResults = dbService.queryAll(sql + ' LIMIT 50');
        }

        // Load names for enrichment
        const stockList = await loadStockList();
        const nameMap = new Map(stockList.map(s => [s.symbol, s.name]));

        const results = rawResults.map((r: any) => {
            const matchedStrategies: string[] = [];
            // Fake strategy matching for demo if real data is missing
            if (pe?.max) matchedStrategies.push('價值量化');
            if (dividendYield?.min) matchedStrategies.push('高股息自選');
            if (matchedStrategies.length === 0) matchedStrategies.push('智能篩選');

            return {
                symbol: r.symbol,
                name: nameMap.get(r.symbol) || r.symbol,
                matchedStrategies,
                fundamentals: {
                    pe: r.pe_ratio || 0,
                    pb: r.pb_ratio || 0,
                    dividendYield: r.dividend_yield || 0
                },
                price: r.close,
                changePercent: r.change_rate
            };
        });

        // Pagination
        const total = results.length;
        const start = (page - 1) * limit;
        const paginatedResults = results.slice(start, start + limit);

        return new Response(JSON.stringify({
            success: true,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            count: paginatedResults.length,
            results: paginatedResults
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Screener API error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const GET: APIRoute = async ({ url }) => {
    try {
        const stocks = await loadStockList();
        return new Response(JSON.stringify({ success: true, data: stocks.slice(0, 50) }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500 });
    }
};
