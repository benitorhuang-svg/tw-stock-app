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

