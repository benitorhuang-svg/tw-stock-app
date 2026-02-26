import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: Detailed Broker Trade Activity
 * Simulation/Mock of individual broker data derived from market trends.
 */
export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) return new Response(JSON.stringify({ error: 'Symbol required' }), { status: 400 });

    try {
        // Fetch top level aggregate from DB
        const major = dbService.queryOne<any>(
            `
            SELECT net_main_player_shares, concentration_ratio, buy_top5_shares, sell_top5_shares
            FROM major_broker_chips
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT 1
        `,
            [symbol]
        );

        const net = major?.net_main_player_shares || 0;

        // Mocking individual brokers for visualization purposes
        // In a real system, this would come from a dedicated 'broker_trades' table
        const brokers = [
            { id: '1470', name: '摩根大通', type: 'Foreign', net: Math.round(net * 0.45) },
            { id: '9200', name: '凱基台北', type: 'Local_Main', net: Math.round(net * 0.25) },
            { id: '8880', name: '國泰', type: 'Local_Main', net: Math.round(net * -0.15) },
            { id: '1590', name: '花旗環球', type: 'Foreign', net: Math.round(net * 0.1) },
            { id: '9600', name: '富邦', type: 'Local', net: Math.round(net * 0.05) },
            { id: '1020', name: '合庫', type: 'Government', net: Math.round(net * -0.05) },
            { id: '1260', name: '宏遠', type: 'Local', net: Math.round(net * -0.2) },
        ].sort((a, b) => b.net - a.net);

        return new Response(
            JSON.stringify({
                symbol,
                concentration: major?.concentration_ratio || 0,
                brokers,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
};
