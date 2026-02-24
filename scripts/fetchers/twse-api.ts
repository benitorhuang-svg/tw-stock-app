import { twseRateLimiter } from './rate-limiter';
import fs from 'fs';

/**
 * M1: TWSE API 封裝
 */
export class TwseApi {
    private baseUrl = 'https://openapi.twse.com.tw/v1';

    /**
     * T006: 爬取全市場股票當日快照 (STOCK_DAY_ALL)
     */
    public async fetchStockList(): Promise<any[]> {
        return twseRateLimiter.schedule(async () => {
            // console.log('[TwseApi] Fetching all stocks daily snapshot...'); // 隱藏此行以避免終端機洗版
            const response = await fetch(`${this.baseUrl}/exchangeReport/STOCK_DAY_ALL`, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            // ...
            if (!response.ok) throw new Error(`TWSE API Error: ${response.statusText}`);
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (err) {
                console.error(
                    '[TwseApi] JSON Parse Error. Raw response (first 200 chars):',
                    text.substring(0, 200)
                );
                throw err;
            }
        });
    }

    /**
     * T007: 獲取指定股票歷史 K 線
     * 註：OpenAPI 可能只提供短期，長期需使用另一個端點或存檔累積
     */
    public async fetchHistoricalData(symbol: string): Promise<any[]> {
        return twseRateLimiter.schedule(async () => {
            console.log(`[TwseApi] Fetching history for ${symbol}...`);
            // 此處為範例端點，實際生產環境可能需根據年月日迴圈抓取
            const response = await fetch(`${this.baseUrl}/stock_day/STOCK_DAY?stockNo=${symbol}`);
            if (!response.ok) return [];
            return response.json();
        });
    }
}

export const twseApi = new TwseApi();
