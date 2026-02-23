/**
 * 法人買賣超資料（模擬）
 */

export interface InstitutionalData {
    date: string;
    symbol: string;
    foreignBuy: number; // 外資買
    foreignSell: number; // 外資賣
    foreignNet: number; // 外資淨買超
    investBuy: number; // 投信買
    investSell: number; // 投信賣
    investNet: number; // 投信淨買超
    dealerBuy: number; // 自營商買
    dealerSell: number; // 自營商賣
    dealerNet: number; // 自營商淨買超
    totalNet: number; // 三大法人合計
}

// 模擬法人資料
export const mockInstitutionalData: Record<string, InstitutionalData[]> = {
    '2330': [
        {
            date: '2025/01/24',
            symbol: '2330',
            foreignBuy: 15000,
            foreignSell: 8000,
            foreignNet: 7000,
            investBuy: 2000,
            investSell: 500,
            investNet: 1500,
            dealerBuy: 1000,
            dealerSell: 800,
            dealerNet: 200,
            totalNet: 8700,
        },
        {
            date: '2025/01/23',
            symbol: '2330',
            foreignBuy: 12000,
            foreignSell: 14000,
            foreignNet: -2000,
            investBuy: 1500,
            investSell: 1000,
            investNet: 500,
            dealerBuy: 600,
            dealerSell: 900,
            dealerNet: -300,
            totalNet: -1800,
        },
        {
            date: '2025/01/22',
            symbol: '2330',
            foreignBuy: 18000,
            foreignSell: 10000,
            foreignNet: 8000,
            investBuy: 3000,
            investSell: 800,
            investNet: 2200,
            dealerBuy: 1200,
            dealerSell: 500,
            dealerNet: 700,
            totalNet: 10900,
        },
        {
            date: '2025/01/21',
            symbol: '2330',
            foreignBuy: 9000,
            foreignSell: 11000,
            foreignNet: -2000,
            investBuy: 800,
            investSell: 1200,
            investNet: -400,
            dealerBuy: 400,
            dealerSell: 600,
            dealerNet: -200,
            totalNet: -2600,
        },
        {
            date: '2025/01/20',
            symbol: '2330',
            foreignBuy: 16000,
            foreignSell: 9000,
            foreignNet: 7000,
            investBuy: 2500,
            investSell: 700,
            investNet: 1800,
            dealerBuy: 900,
            dealerSell: 400,
            dealerNet: 500,
            totalNet: 9300,
        },
    ],
    '2317': [
        {
            date: '2025/01/24',
            symbol: '2317',
            foreignBuy: 8000,
            foreignSell: 12000,
            foreignNet: -4000,
            investBuy: 500,
            investSell: 1500,
            investNet: -1000,
            dealerBuy: 300,
            dealerSell: 800,
            dealerNet: -500,
            totalNet: -5500,
        },
        {
            date: '2025/01/23',
            symbol: '2317',
            foreignBuy: 10000,
            foreignSell: 8000,
            foreignNet: 2000,
            investBuy: 1000,
            investSell: 600,
            investNet: 400,
            dealerBuy: 500,
            dealerSell: 400,
            dealerNet: 100,
            totalNet: 2500,
        },
        {
            date: '2025/01/22',
            symbol: '2317',
            foreignBuy: 6000,
            foreignSell: 9000,
            foreignNet: -3000,
            investBuy: 300,
            investSell: 800,
            investNet: -500,
            dealerBuy: 200,
            dealerSell: 500,
            dealerNet: -300,
            totalNet: -3800,
        },
    ],
};

export function getInstitutionalData(symbol: string): InstitutionalData[] {
    return mockInstitutionalData[symbol] || [];
}

export function getLatestInstitutional(symbol: string): InstitutionalData | null {
    const data = mockInstitutionalData[symbol];
    return data?.[0] || null;
}

// 計算連續買超/賣超天數
export function getConsecutiveDays(
    symbol: string,
    type: 'foreign' | 'invest' | 'dealer' | 'total'
): number {
    const data = getInstitutionalData(symbol);
    if (data.length === 0) return 0;

    const getNet = (d: InstitutionalData) => {
        switch (type) {
            case 'foreign':
                return d.foreignNet;
            case 'invest':
                return d.investNet;
            case 'dealer':
                return d.dealerNet;
            case 'total':
                return d.totalNet;
        }
    };

    const firstNet = getNet(data[0]);
    if (firstNet === 0) return 0;

    const isPositive = firstNet > 0;
    let count = 0;

    for (const d of data) {
        const net = getNet(d);
        if ((isPositive && net > 0) || (!isPositive && net < 0)) {
            count++;
        } else {
            break;
        }
    }

    return isPositive ? count : -count;
}
