import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService } from '../../../lib/db/sqlite-service';

/**
 * API: 獲取三大法人連續買賣超排名
 * GET /api/market/institutional-streak
 */
export const GET: APIRoute = async () => {
    try {
        // 1. 獲取所有具備籌碼資料的股票
        const stocks = dbService.queryAll<{ symbol: string; name: string }>(
            'SELECT symbol, name FROM stocks'
        );

        // 2. 準備查詢最近 20 天的籌碼資料
        const streakData = [];
        const CHIP_WINDOW = 20;

        for (const stock of stocks) {
            const chips = dbService.queryAll<{
                foreign_inv: number;
                invest_trust: number;
                dealer: number;
                date: string;
            }>(
                'SELECT foreign_inv, invest_trust, dealer, date FROM chips WHERE symbol = ? ORDER BY date DESC LIMIT ?',
                [stock.symbol, CHIP_WINDOW]
            );

            if (chips.length === 0) continue;

            const calculateStreak = (key: 'foreign_inv' | 'invest_trust' | 'dealer') => {
                let streak = 0;
                const firstVal = chips[0][key];
                if (firstVal === 0) return 0;

                const isBuying = firstVal > 0;

                for (const day of chips) {
                    const val = day[key];
                    if (isBuying && val > 0) streak++;
                    else if (!isBuying && val < 0) streak--;
                    else break;
                }
                return streak;
            };

            const foreignStreak = calculateStreak('foreign_inv');
            const investStreak = calculateStreak('invest_trust');
            const dealerStreak = calculateStreak('dealer');

            // 只有當其中一項有 2 天以上的連續買/賣時才加入
            if (Math.abs(foreignStreak) >= 2 || Math.abs(investStreak) >= 2 || Math.abs(dealerStreak) >= 2) {
                streakData.push({
                    symbol: stock.symbol,
                    name: stock.name,
                    foreignStreak,
                    investStreak,
                    dealerStreak,
                    latest: {
                        foreign: chips[0].foreign_inv,
                        invest: chips[0].invest_trust,
                        dealer: chips[0].dealer,
                    }
                });
            }
        }

        return new Response(JSON.stringify(streakData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
};
