/**
 * 歷史資料載入器
 * 從 public/data/ 載入 CSV 資料
 */

export interface HistoricalPrice {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * 載入股票歷史價格
 */
export async function loadStockPrices(symbol: string): Promise<HistoricalPrice[]> {
    try {
        const response = await fetch(`/data/prices/${symbol}.csv`);
        if (!response.ok) {
            console.warn(`[DataLoader] ${symbol}.csv not found`);
            return [];
        }

        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error(`[DataLoader] Failed to load ${symbol}:`, error);
        return [];
    }
}

/**
 * 解析 CSV 為價格陣列
 */
function parseCSV(text: string): HistoricalPrice[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // 跳過標題行
    const dataLines = lines.slice(1);

    return dataLines
        .map(line => {
            const [date, open, high, low, close, volume] = line.split(',');
            return {
                date: date.trim(),
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseInt(volume) || 0,
            };
        })
        .filter(p => !isNaN(p.close));
}

/**
 * 取得可用的股票清單（從已下載的 CSV）
 */
export async function getAvailableStocks(): Promise<string[]> {
    try {
        const response = await fetch('/data/stocks.json');
        if (!response.ok) return [];

        const stocks = await response.json();
        return stocks.map((s: any) => s.symbol);
    } catch {
        return [];
    }
}

/**
 * 取得最近 N 天的價格
 */
export async function getRecentPrices(
    symbol: string,
    days: number = 60
): Promise<HistoricalPrice[]> {
    const allPrices = await loadStockPrices(symbol);
    return allPrices.slice(-days);
}

/**
 * 取得指定日期範圍的價格
 */
export async function getPricesInRange(
    symbol: string,
    startDate: string,
    endDate: string
): Promise<HistoricalPrice[]> {
    const allPrices = await loadStockPrices(symbol);

    return allPrices.filter(p => {
        return p.date >= startDate && p.date <= endDate;
    });
}

/**
 * 計算期間報酬率
 */
export async function calculateReturn(symbol: string, days: number): Promise<number | null> {
    const prices = await getRecentPrices(symbol, days);

    if (prices.length < 2) return null;

    const oldPrice = prices[0].close;
    const newPrice = prices[prices.length - 1].close;

    return ((newPrice - oldPrice) / oldPrice) * 100;
}
