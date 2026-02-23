import { twseRateLimiter } from './rate-limiter';

/**
 * M1: MOPS (公開資訊觀測站) API 封裝
 */
export class MopsApi {
    private baseUrl = 'https://openapi.twse.com.tw/v1'; // 許多 MOPS 整合在 OpenAPI 中

    /**
     * T008: 獲取個股基本面/財報簡表
     */
    public async fetchFinancials(symbol: string): Promise<any> {
        return twseRateLimiter.schedule(async () => {
            console.log(`[MopsApi] Fetching financials for ${symbol}...`);
            // 範例端點：獲取綜合損益表重要項目
            const response = await fetch(`${this.baseUrl}/mops/t187ap05_L`); // 此端點通常為上市公司專區
            if (!response.ok) return null;
            const data = await response.json();
            // 過濾出目標股票的資料
            return data.find((item: any) => item.Symbol === symbol || item.公司代碼 === symbol);
        });
    }
}

export const mopsApi = new MopsApi();
