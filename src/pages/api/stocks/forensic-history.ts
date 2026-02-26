import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: Forensic History for Specific Stock
 * Returns daily chips, weekly shareholders, monthly directors, and security lending.
 */
export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        return new Response(JSON.stringify({ error: 'Symbol is required' }), { status: 400 });
    }

    try {
        // Fetch last 120 trading days for a good chart range
        const limit = 120;

        // 1. Daily Data: Price, Chips, Lending, Dealer
        const daily = dbService.queryAll<any>(
            `
            SELECT 
                ph.date, ph.close, ph.change_pct, ph.volume,
                c.foreign_inv, c.invest_trust, c.dealer,
                sl.lending_balance, sl.short_selling_balance,
                dd.prop_buy, dd.hedge_buy,
                gc.net_buy_shares as gov_net
            FROM price_history ph
            LEFT JOIN chips c ON ph.symbol = c.symbol AND ph.date = c.date
            LEFT JOIN security_lending sl ON ph.symbol = sl.symbol AND ph.date = sl.date
            LEFT JOIN dealer_details dd ON ph.symbol = dd.symbol AND ph.date = dd.date
            LEFT JOIN government_chips gc ON ph.symbol = gc.symbol AND ph.date = gc.date
            WHERE ph.symbol = ?
            ORDER BY ph.date DESC
            LIMIT ?
        `,
            [symbol, limit]
        );

        // 2. Weekly Data: Shareholder Distribution
        const weekly = dbService.queryAll<any>(
            `
            SELECT date, large_holder_1000_ratio, total_shareholders, small_holder_under_10_ratio
            FROM shareholder_distribution
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT 24
        `,
            [symbol]
        );

        // 3. Insider Risk: Director Holdings
        const monthly = dbService.queryAll<any>(
            `
            SELECT date, pawn_ratio, director_holding_ratio, insider_net_change
            FROM director_holdings
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT 12
        `,
            [symbol]
        );

        // 4. Automated Forensic Indicators (Chip RSI & Momentum)
        const reversedDaily = daily.reverse();
        const processedDaily = reversedDaily.map((d: any, idx: number) => {
            const window = 5;
            let chipRsi = 50;
            if (idx >= window) {
                let ups = 0,
                    downs = 0;
                for (let i = 0; i < window; i++) {
                    const net =
                        (reversedDaily[idx - i].foreign_inv || 0) +
                        (reversedDaily[idx - i].invest_trust || 0);
                    if (net > 0) ups += net;
                    else downs += Math.abs(net);
                }
                chipRsi = ups + downs === 0 ? 50 : (ups / (ups + downs)) * 100;
            }

            return {
                ...d,
                chip_rsi: chipRsi,
                power_index:
                    (Math.abs((d.foreign_inv || 0) + (d.invest_trust || 0)) * d.close) / 1000000,
            };
        });

        return new Response(
            JSON.stringify({
                symbol,
                history: {
                    daily: processedDaily,
                    weekly: weekly.reverse(),
                    monthly: monthly.reverse(),
                },
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=3600',
                },
            }
        );
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
};
