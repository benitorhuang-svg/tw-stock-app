import { getCache, setCache } from '../lib/cache-manager';
import { withRequestCache } from '../lib/request-cache';

export interface StockPriceRecord {
    Date: string;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Volume: number;
    Turnover: number;
    Change: number;
    ChangePct: number;
}

/**
 * P0+ Optimization: Multi-tier price data loading strategy
 * 
 * Load Priority:
 * 1. Memory Cache (5 min) - In-process, fastest
 * 2. IndexedDB (7 day) - Browser persistent
 * 3. Local Files (Tier 2) - Filesystem/HTTP static
 * 4. API Fallback (Real-time) - Network fetch
 * 
 * Automatically detects environment:
 * - Server: Reads directly from filesystem (fast)
 * - Browser: Fetches + caches via IndexedDB/Memory
 */
export async function fetchStockPrices(symbol: string): Promise<StockPriceRecord[]> {
    const isServer = typeof window === 'undefined';
    const cacheKey = `stock:prices:${symbol}`;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for prices

    // P0 Tier 1: Check client-side caches (browser only, before I/O)
    if (!isServer) {
        const cached = await getCache<StockPriceRecord[]>(cacheKey);
        if (cached && cached.length > 0) {
            console.log(`[Cache] Memory/IndexedDB hit: ${symbol}`);
            return cached;
        }
    }

    try {
        let csvText = '';

        if (isServer) {
            // SERVER-SIDE: Load from local files (Tier 2)
            const fs = await import('fs');
            const path = await import('path');

            const indexPath = path.join(process.cwd(), 'public/data/price_index.json');
            if (!fs.existsSync(indexPath)) {
                console.warn(`[Data] Price index not found: ${indexPath}`);
                return [];
            }

            const fileMap = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            const filename = fileMap[symbol];
            if (!filename) {
                console.warn(`[Data] No price file index entry for: ${symbol}`);
                return [];
            }

            const filePath = path.join(process.cwd(), 'public/data/prices', filename);
            if (!fs.existsSync(filePath)) {
                console.warn(`[Data] Price file not found: ${filePath}`);
                return [];
            }

            csvText = fs.readFileSync(filePath, 'utf-8');
        } else {
            // CLIENT-SIDE Tier 2: Load from local files (HTTP)
            console.log(`[Data] Loading prices from local files: ${symbol}`);
            
            // Use request cache to deduplicate concurrent requests for the index
            const fileMap = await withRequestCache('price-index', () =>
                fetch('/data/price_index.json')
                    .then(res => {
                        if (!res.ok) throw new Error(`Index fetch failed: ${res.status}`);
                        return res.json();
                    })
            );
            
            const filename = fileMap[symbol];
            if (!filename) {
                console.warn(`[Data] No price entry for symbol: ${symbol}`);
                return [];
            }

            const csvRes = await fetch(`/data/prices/${filename}`);
            if (!csvRes.ok) {
                console.warn(`[Data] Price file fetch failed: ${csvRes.status}`);
                return [];
            }

            csvText = await csvRes.text();
        }

        const prices = parseCSV(csvText);
        
        // P0 Cache: Store in client-side caches (browser with IndexedDB)
        if (!isServer && prices.length > 0) {
            await setCache<StockPriceRecord[]>(cacheKey, prices, CACHE_TTL);
            console.log(`[Cache] Stored ${prices.length} prices for ${symbol} (24h TTL)`);
        }

        return prices;
    } catch (e) {
        console.error(`[Error] Failed to load price data for ${symbol}:`, e);
        
        // P0 Fallback: Try API endpoint (Tier 3)
        if (!isServer) {
            try {
                console.log(`[Fallback] Trying API endpoint for ${symbol}`);
                const response = await fetch(`/api/prices/${symbol}`);
                if (response.ok) {
                    const prices = await response.json();
                    await setCache<StockPriceRecord[]>(cacheKey, prices, CACHE_TTL);
                    return prices;
                }
            } catch (apiError) {
                console.error(`[Error] API fallback also failed:`, apiError);
            }
        }
        
        return [];
    }
}

function parseCSV(csv: string): StockPriceRecord[] {
    if (!csv) return [];
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const record: any = {};
        headers.forEach((h, i) => {
            const val = values[i];
            if (h === 'Date') record[h] = val;
            else record[h] = parseFloat(val) || 0;
        });
        return record as StockPriceRecord;
    });
}

