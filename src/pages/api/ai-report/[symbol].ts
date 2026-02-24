import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const { symbol } = params;
    // simulate an AI-generated report server-side
    // for now simply echo back some canned sections based on symbol
    const isBullish = Math.random() > 0.5;
    const price = 100;

    const reportSections = [
        {
            title: '📊 基本面亮點',
            content: `${symbol} 近期營收${isBullish ? '成長' : '波動'}，毛利率${isBullish ? '穩定' : '下滑'}。`,
        },
        {
            title: '🏦 籌碼動能追蹤',
            content: `外資${isBullish ? '買超' : '賣超'}，投信${isBullish ? '加碼' : '觀望'}。`,
        },
        {
            title: '📈 技術型態掃描',
            content: `價格${isBullish ? '站上' : '跌破'} MA20，KD ${isBullish ? '黃金交叉' : '死亡交叉'}。`,
        },
        {
            title: '⚠️ 風險提示',
            content: `若${isBullish ? '量能不足' : '跌破支撐'}，需注意停損。`,
        },
    ];

    const suggestedAlerts = [
        {
            icon: '📍',
            insight: `股價${isBullish ? '趨勢向上' : '趨勢向下'}，警戒中。`,
            rule: `當 ${symbol} ${isBullish ? '突破' : '跌破'} ${price} 元`,
            action: '推播',
        },
    ];

    return new Response(JSON.stringify({ reportSections, suggestedAlerts }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
