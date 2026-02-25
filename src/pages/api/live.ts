import type { APIRoute } from 'astro';
import type { TwseStockSnapshot } from '../../types/stock';

const TWSE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';

// Server-side Memory Cache
let cachedData: TwseStockSnapshot[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 15000; // 15 seconds cache to prevent IP BAN

export const GET: APIRoute = async () => {
    const now = Date.now();

    // Return cached data if within 15 seconds
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION_MS) {
        return new Response(JSON.stringify({
            status: 'success',
            cached: true,
            lastFetch: new Date(lastFetchTime).toISOString(),
            data: cachedData
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=15',
            }
        });
    }

    try {
        console.log(`[API] Fetching fresh live data from TWSE...`);
        const response = await fetch(TWSE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            // Reduce timeout slightly so backend doesn't hang indefinitely
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`TWSE Fetch failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Update cache
        cachedData = data;
        lastFetchTime = Date.now();

        return new Response(JSON.stringify({
            status: 'success',
            cached: false,
            lastFetch: new Date(lastFetchTime).toISOString(),
            data: cachedData
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=15',
            }
        });
    } catch (error) {
        console.error(`[API] Error fetching live data:`, error);

        // If we have stale cache, return it as a fallback instead of failing completely
        if (cachedData) {
            return new Response(JSON.stringify({
                status: 'error_using_stale_cache',
                cached: true,
                lastFetch: new Date(lastFetchTime).toISOString(),
                data: cachedData,
                message: (error as Error).message
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }

        return new Response(JSON.stringify({
            status: 'error',
            message: (error as Error).message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
};
