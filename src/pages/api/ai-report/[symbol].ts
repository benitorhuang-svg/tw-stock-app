import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';
import { getLatestInstitutional, getConsecutiveDays } from '../../../data/institutional';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const { symbol = '' } = params;

    // 1. Fetch Real Data Context
    let pe = 0;
    try {
        const row = dbService.queryOne('SELECT pe FROM valuation_history WHERE symbol = ? ORDER BY date DESC LIMIT 1', [symbol]) as { pe: number } | undefined;
        pe = row?.pe || 0;
    } catch { }

    const institutional = getLatestInstitutional(symbol);
    const foreignStreak = getConsecutiveDays(symbol, 'foreign');
    const investStreak = getConsecutiveDays(symbol, 'invest');

    // 2. Logic Engines
    const isUndervalued = pe > 0 && pe < 15;
    const isInstitutionalStrong = (foreignStreak + investStreak) > 2;
    const totalTrend = (isInstitutionalStrong ? 1 : 0) + (isUndervalued ? 1 : 0);

    // 3. Generate Forensic Sections
    const reportSections = [
        {
            title: '📊 價值評估系統 (Fundamentals)',
            content: pe > 0
                ? `${symbol} 目前本益比為 ${pe.toFixed(1)}x。${isUndervalued ? '處於歷史低水位，價值修復空間大。' : '估值處於常態區間，需關注盈餘動能是否匹配價格。'}`
                : '基本面數據同步中，建議參照同業平均估值。'
        },
        {
            title: '🏦 法人足跡 (Chips Forensic)',
            content: `【外資】${foreignStreak > 0 ? `連續買超 ${foreignStreak} 日` : foreignStreak < 0 ? `連續調節 ${Math.abs(foreignStreak)} 日` : '中立觀望'}。
                      【投信】${investStreak > 0 ? `連續佈局 ${investStreak} 日` : investStreak < 0 ? `連續賣出 ${Math.abs(investStreak)} 日` : '持股持平'}。
                      主動型資金${isInstitutionalStrong ? '正在集結，籌碼集中度提升。' : '趨於分散，散戶接盤風險增加。'}`
        },
        {
            title: '📉 策略決策矩陣 (Strategy)',
            content: totalTrend >= 1
                ? '模型綜合評定為【偏多攻擊】。適合在 MA10 支撐位佈局，停損設為回測季線支撐。'
                : '模型評定為【防守觀察】。市場量能偏低，籌碼尚未形成合力，建議等待帶量突破後再進場佈局。'
        },
        {
            title: '⚠️ 核心監控指標',
            content: `重點監測 ${symbol} 近期 ${Math.abs(foreignStreak)} 日籌碼流向。若法人集體回補，則具備挑戰前高的技術動能。`
        }
    ];

    const suggestedAlerts = [
        {
            icon: '⚡',
            insight: isInstitutionalStrong ? '法人進場訊號確立' : '短線乖離率偏高',
            rule: `當 ${symbol} 連續買超超過 5 日`,
            action: '即時通知終端'
        },
        {
            icon: '🎯',
            insight: '關鍵價位攻防',
            rule: `當 ${symbol} 突破前波高點`,
            action: '啟動波段監控'
        }
    ];

    return new Response(JSON.stringify({ reportSections, suggestedAlerts }), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        },
    });
};
