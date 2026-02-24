import type { APIRoute } from 'astro';
import { getStocksWithPrices } from '../../../utils/stockDataService';

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const stocks = await getStocksWithPrices();

        return new Response(JSON.stringify(stocks), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
