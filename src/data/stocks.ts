/**
 * 台灣股票資料
 * 範例資料 - 實際應用時可從 TWSE API 取得
 */

export interface StockData {
    symbol: string;       // 股票代號
    name: string;         // 股票名稱
    price: number;        // 現價
    change: number;       // 漲跌
    changePercent: number;// 漲跌幅 %
    volume: number;       // 成交量 (張)
    pe: number;           // 本益比
    pb: number;           // 股價淨值比
    yield: number;        // 殖利率 %
    roe: number;          // ROE %
    eps: number;          // EPS
}

export interface StockOHLC {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// 範例股票清單
export const stockList: StockData[] = [
    { symbol: "2330", name: "台積電", price: 580, change: 5, changePercent: 0.87, volume: 25000, pe: 18.5, pb: 5.2, yield: 2.1, roe: 28.5, eps: 31.36 },
    { symbol: "2317", name: "鴻海", price: 105, change: -1.5, changePercent: -1.41, volume: 45000, pe: 10.2, pb: 1.3, yield: 5.7, roe: 12.8, eps: 10.29 },
    { symbol: "2454", name: "聯發科", price: 980, change: 15, changePercent: 1.55, volume: 8000, pe: 14.8, pb: 3.8, yield: 3.2, roe: 25.6, eps: 66.22 },
    { symbol: "2881", name: "富邦金", price: 72, change: 0.5, changePercent: 0.70, volume: 32000, pe: 9.5, pb: 1.4, yield: 5.5, roe: 14.7, eps: 7.58 },
    { symbol: "2882", name: "國泰金", price: 48, change: -0.3, changePercent: -0.62, volume: 28000, pe: 11.2, pb: 1.1, yield: 4.8, roe: 9.8, eps: 4.29 },
    { symbol: "2412", name: "中華電", price: 122, change: 0.5, changePercent: 0.41, volume: 5000, pe: 23.8, pb: 2.1, yield: 4.1, roe: 8.8, eps: 5.13 },
    { symbol: "2308", name: "台達電", price: 320, change: 8, changePercent: 2.56, volume: 12000, pe: 22.5, pb: 4.5, yield: 2.8, roe: 20.1, eps: 14.22 },
    { symbol: "3008", name: "大立光", price: 2100, change: -30, changePercent: -1.41, volume: 800, pe: 15.2, pb: 3.2, yield: 3.5, roe: 21.1, eps: 138.16 },
];

// 範例 K線資料 (台積電 2330)
export const sampleOHLC: StockOHLC[] = [
    { date: "2026-01-02", open: 570, high: 578, low: 568, close: 575, volume: 22000 },
    { date: "2026-01-03", open: 575, high: 582, low: 573, close: 580, volume: 25000 },
    { date: "2026-01-06", open: 580, high: 588, low: 578, close: 585, volume: 28000 },
    { date: "2026-01-07", open: 585, high: 590, low: 580, close: 582, volume: 24000 },
    { date: "2026-01-08", open: 582, high: 586, low: 575, close: 578, volume: 26000 },
    { date: "2026-01-09", open: 578, high: 585, low: 576, close: 583, volume: 23000 },
    { date: "2026-01-10", open: 583, high: 592, low: 581, close: 590, volume: 30000 },
    { date: "2026-01-13", open: 590, high: 598, low: 588, close: 595, volume: 32000 },
    { date: "2026-01-14", open: 595, high: 600, low: 592, close: 598, volume: 28000 },
    { date: "2026-01-15", open: 598, high: 605, low: 595, close: 600, volume: 35000 },
    { date: "2026-01-16", open: 600, high: 608, low: 598, close: 605, volume: 31000 },
    { date: "2026-01-17", open: 605, high: 610, low: 600, close: 602, volume: 27000 },
    { date: "2026-01-20", open: 602, high: 608, low: 598, close: 605, volume: 25000 },
    { date: "2026-01-21", open: 605, high: 612, low: 603, close: 610, volume: 29000 },
    { date: "2026-01-22", open: 610, high: 615, low: 605, close: 608, volume: 26000 },
    { date: "2026-01-23", open: 608, high: 612, low: 600, close: 595, volume: 33000 },
    { date: "2026-01-24", open: 595, high: 598, low: 585, close: 580, volume: 38000 },
];

// 取得股票資料
export function getStock(symbol: string): StockData | undefined {
    return stockList.find(s => s.symbol === symbol);
}

// 格式化數字
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('zh-TW').format(num);
}

// 格式化漲跌
export function formatChange(change: number, changePercent: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change} (${sign}${changePercent.toFixed(2)}%)`;
}
