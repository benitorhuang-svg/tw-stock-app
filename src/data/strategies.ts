import type { Strategy } from '../types/stock';

export const strategies: Strategy[] = [
    // 基本面策略
    {
        id: 'low-pe',
        name: '低本益比',
        category: 'fundamental',
        description: '篩選本益比低於 15 的低估值股票',
        conditions: ['P/E < 15', 'P/E > 0'],
        icon: '💰',
        sql: 'SELECT count(*) as count FROM latest_prices WHERE pe < 15 AND pe > 0',
    },
    {
        id: 'low-pb',
        name: '低股價淨值比',
        category: 'fundamental',
        description: '篩選股價低於淨值的潛力股',
        conditions: ['P/B < 1.5'],
        icon: '📊',
        sql: 'SELECT count(*) as count FROM latest_prices WHERE pb < 1.5 AND pb > 0',
    },
    {
        id: 'high-dividend',
        name: '高股息殖利率',
        category: 'fundamental',
        description: '篩選配息穩定且殖利率高的存股標的',
        conditions: ['殖利率 > 5%'],
        icon: '💵',
        sql: 'SELECT count(*) as count FROM latest_prices WHERE yield > 5',
    },
    {
        id: 'high-roe',
        name: '高 ROE',
        category: 'fundamental',
        description: '篩選股東權益報酬率優異的績優股',
        conditions: ['ROE > 15%', '連續3年ROE > 10%', '負債比 < 50%'],
        icon: '🏆',
    },
    {
        id: 'revenue-growth',
        name: '營收成長股',
        category: 'fundamental',
        description: '篩選營收持續成長的成長股',
        conditions: ['月營收年增 > 10%', '連續3月正成長', '累計營收年增 > 5%'],
        icon: '📈',
    },
    {
        id: 'high-margin',
        name: '高毛利率',
        category: 'fundamental',
        description: '篩選產品競爭力強、獲利能力佳的公司',
        conditions: ['毛利率 > 20%', '營益率 > 10%', '近4季毛利率穩定'],
        icon: '🎯',
    },
    {
        id: 'positive-fcf',
        name: '正自由現金流',
        category: 'fundamental',
        description: '篩選現金流穩健的優質企業',
        conditions: ['自由現金流 > 0', '連續3年正值', '營業現金流 > 淨利'],
        icon: '💎',
    },
    {
        id: 'low-debt',
        name: '低負債高現金',
        category: 'fundamental',
        description: '篩選財務結構穩健、抗風險能力強的公司',
        conditions: ['負債比 < 40%', '流動比 > 150%', '現金佔總資產 > 10%'],
        icon: '🛡️',
    },

    // 技術面策略
    {
        id: 'golden-cross',
        name: '黃金交叉',
        category: 'technical',
        description: 'MA5 上穿 MA20，多頭訊號',
        conditions: ['MA5 > MA20', '前一日 MA5 < MA20'],
        icon: '✨',
    },
    {
        id: 'rsi-oversold',
        name: 'RSI 超賣反彈',
        category: 'technical',
        description: 'RSI 從超賣區回升，可能反彈',
        conditions: ['RSI < 30', 'RSI 由低向上'],
        icon: '🔄',
    },
    {
        id: 'volume-breakout',
        name: '量價齊揚',
        category: 'technical',
        description: '價漲量增，多頭確認',
        conditions: ['收盤 > 開盤', '成交量 > 5日均量 × 1.5'],
        icon: '🚀',
    },
    {
        id: 'breakout',
        name: '突破整理',
        category: 'technical',
        description: '股價突破近期盤整區間',
        conditions: ['收盤 > 20日最高價', '成交量放大'],
        icon: '💥',
    },

    // 籌碼面策略
    {
        id: 'foreign-buy',
        name: '外資連買',
        category: 'sentiment',
        description: '外資連續買超，法人認同',
        conditions: ['外資連續5日買超', '買超張數遞增'],
        icon: '🌍',
    },
    {
        id: 'trust-buy',
        name: '投信認養',
        category: 'sentiment',
        description: '投信持續加碼，中長期看好',
        conditions: ['投信連續10日買超', '持股比例上升'],
        icon: '🏛️',
    },
];

// 取得策略
export function getStrategy(id: string): Strategy | undefined {
    return strategies.find(s => s.id === id);
}

// 依類別取得策略
export function getStrategiesByCategory(category: Strategy['category']): Strategy[] {
    return strategies.filter(s => s.category === category);
}
