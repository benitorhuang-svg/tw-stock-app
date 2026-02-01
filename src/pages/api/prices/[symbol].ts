// TEMPORARILY DISABLED - Dynamic API routes require server adapter
// This will be restored in Phase 2 when we set up proper server configuration
// For now, clients fetch data using priceService with local cache/files
// 
// TODO Phase 2: Re-enable by:
// 1. Install: npm install @astrojs/node
// 2. Update astro.config.mjs: output: 'hybrid' + adapter: node()
// 3. Uncomment the code below

/*
import type { APIRoute } from 'astro';
import { fetchStockPrices } from '../../../utils/priceService';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const { symbol } = params;

    if (!symbol) {
        return new Response(JSON.stringify({ error: 'Symbol required' }), { status: 400 });
    }

    try {
        const prices = await fetchStockPrices(symbol);

        if (!prices || prices.length === 0) {
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(prices), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
*/
