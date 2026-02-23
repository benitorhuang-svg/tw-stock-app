import { twseRateLimiter } from './rate-limiter';

/**
 * Yahoo Finance API Fetcher
 * Used as a fallback or source for long-term historical data.
 */
export class YahooApi {
    /**
     * Fetch historical K-line data from Yahoo Finance
     */
    public async fetchHistoricalData(symbol: string, years: number = 2): Promise<any[]> {
        // Yahoo uses .TW for TWSE and .TWO for OTC
        // For simplicity, we try .TW first
        const twSymbol = `${symbol}.TW`;
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - years * 365 * 24 * 60 * 60;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${twSymbol}?period1=${startDate}&period2=${endDate}&interval=1d&events=history`;

        return twseRateLimiter.schedule(async () => {
            console.log(`[YahooApi] Fetching history for ${symbol}...`);
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    },
                });

                if (!response.ok) {
                    // Try .TWO if .TW fails (OTC stocks)
                    return this.fetchHistoricalDataOTC(symbol, startDate, endDate);
                }

                const data = await response.json();
                return this.parseYahooData(data);
            } catch (error) {
                console.error(`[YahooApi] Error fetching ${symbol}:`, error);
                return [];
            }
        });
    }

    private async fetchHistoricalDataOTC(
        symbol: string,
        startDate: number,
        endDate: number
    ): Promise<any[]> {
        const twSymbol = `${symbol}.TWO`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${twSymbol}?period1=${startDate}&period2=${endDate}&interval=1d&events=history`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return this.parseYahooData(data);
        } catch {
            return [];
        }
    }

    private parseYahooData(data: any): any[] {
        const result = data?.chart?.result?.[0];
        if (!result) return [];

        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];

        const rows = [];
        for (let i = 0; i < timestamps.length; i++) {
            const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
            const close = quote.close?.[i];
            if (close == null) continue;

            rows.push({
                date,
                open: quote.open?.[i],
                high: quote.high?.[i],
                low: quote.low?.[i],
                close: close,
                adjClose: adjClose[i],
                volume: quote.volume?.[i],
            });
        }
        return rows;
    }
}

export const yahooApi = new YahooApi();
