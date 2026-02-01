/**
 * 台灣股票清單
 * 用於批次下載歷史資料
 */

// 上市股票（TSE）- 熱門股
export const tseStocks = [
    // 半導體
    { symbol: '2330', name: '台積電', industry: 'semiconductor' },
    { symbol: '2454', name: '聯發科', industry: 'semiconductor' },
    { symbol: '3034', name: '聯詠', industry: 'semiconductor' },
    { symbol: '2379', name: '瑞昱', industry: 'semiconductor' },
    { symbol: '3711', name: '日月光投控', industry: 'semiconductor' },
    { symbol: '2303', name: '聯電', industry: 'semiconductor' },

    // 電子
    { symbol: '2317', name: '鴻海', industry: 'electronics' },
    { symbol: '2308', name: '台達電', industry: 'electronics' },
    { symbol: '2382', name: '廣達', industry: 'electronics' },
    { symbol: '2357', name: '華碩', industry: 'electronics' },
    { symbol: '2395', name: '研華', industry: 'electronics' },
    { symbol: '3231', name: '緯創', industry: 'electronics' },
    { symbol: '2324', name: '仁寶', industry: 'electronics' },
    { symbol: '2353', name: '宏碁', industry: 'electronics' },

    // 金融
    { symbol: '2881', name: '富邦金', industry: 'finance' },
    { symbol: '2882', name: '國泰金', industry: 'finance' },
    { symbol: '2884', name: '玉山金', industry: 'finance' },
    { symbol: '2886', name: '兆豐金', industry: 'finance' },
    { symbol: '2891', name: '中信金', industry: 'finance' },
    { symbol: '2892', name: '第一金', industry: 'finance' },
    { symbol: '2880', name: '華南金', industry: 'finance' },
    { symbol: '2883', name: '開發金', industry: 'finance' },
    { symbol: '2885', name: '元大金', industry: 'finance' },
    { symbol: '2887', name: '台新金', industry: 'finance' },
    { symbol: '2890', name: '永豐金', industry: 'finance' },

    // 傳產
    { symbol: '1301', name: '台塑', industry: 'plastic' },
    { symbol: '1303', name: '南亞', industry: 'plastic' },
    { symbol: '1326', name: '台化', industry: 'plastic' },
    { symbol: '2002', name: '中鋼', industry: 'steel' },
    { symbol: '1402', name: '遠東新', industry: 'textile' },

    // 航運
    { symbol: '2603', name: '長榮', industry: 'shipping' },
    { symbol: '2609', name: '陽明', industry: 'shipping' },
    { symbol: '2615', name: '萬海', industry: 'shipping' },

    // 電信
    { symbol: '2412', name: '中華電', industry: 'telecom' },
    { symbol: '3045', name: '台灣大', industry: 'telecom' },
    { symbol: '4904', name: '遠傳', industry: 'telecom' },

    // 食品
    { symbol: '1216', name: '統一', industry: 'food' },
    { symbol: '2912', name: '統一超', industry: 'food' },

    // 其他熱門
    { symbol: '2301', name: '光寶科', industry: 'electronics' },
    { symbol: '2327', name: '國巨', industry: 'electronics' },
    { symbol: '2345', name: '智邦', industry: 'communication' },
    { symbol: '2377', name: '微星', industry: 'electronics' },
    { symbol: '2383', name: '台光電', industry: 'optoelectronics' },
    { symbol: '2408', name: '南亞科', industry: 'semiconductor' },
    { symbol: '2474', name: '可成', industry: 'electronics' },
    { symbol: '3008', name: '大立光', industry: 'optoelectronics' },
    { symbol: '3017', name: '奇鋐', industry: 'electronics' },
    { symbol: '3037', name: '欣興', industry: 'electronics' },
    { symbol: '3443', name: '創意', industry: 'semiconductor' },
    { symbol: '3661', name: '世芯-KY', industry: 'semiconductor' },
    { symbol: '4938', name: '和碩', industry: 'electronics' },
    { symbol: '5347', name: '世界', industry: 'semiconductor' },
    { symbol: '6505', name: '台塑化', industry: 'plastic' },
    { symbol: '6669', name: '緯穎', industry: 'electronics' },
];

// 完整股票清單（可從證交所下載）
// 這裡先提供常用的 50 檔

export const allStocks = tseStocks;

// 匯出 JSON 格式
export function getStocksJSON(): string {
    return JSON.stringify(allStocks, null, 2);
}
