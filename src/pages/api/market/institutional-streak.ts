import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService } from '../../../lib/db/sqlite-service';

// ─── Server-Side Memory Cache ──────────────────────
let cachedStreakResult: any = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour cache - institutional data updates slowly

/**
 * API: 獲取三大法人連續買賣超排名
 * GET /api/market/institutional-streak
 */
export const GET: APIRoute = async () => {
    try {
        const now = Date.now();
        if (cachedStreakResult && (now - lastCacheUpdate < CACHE_DURATION)) {
            return new Response(JSON.stringify(cachedStreakResult), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'HIT'
                }
            });
        }

        // 1. 使用 Window Function 一次性獲取所有股票最近 20 天的籌碼資料
        // 這避免了 N+1 查詢問題，顯著提升效能
        const CHIP_WINDOW = 20;

        // 建立一個子查詢，為每隻股票的籌碼資料編號 (row_number)
        // 然後只取出前 20 筆
        const allChips = dbService.queryAll<{
            symbol: string;
            name: string;
            foreign_inv: number;
            invest_trust: number;
            dealer: number;
            date: string;
            volume: number;
            turnover: number;
            change_pct: number;
        }>(`
            WITH RankedChips AS (
                SELECT 
                    symbol,
                    foreign_inv,
                    invest_trust,
                    dealer,
                    date,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM chips
            )
            SELECT rc.symbol, s.name, rc.foreign_inv, rc.invest_trust, rc.dealer, rc.date,
                   lp.volume, lp.turnover, lp.change_pct
            FROM RankedChips rc
            JOIN stocks s ON rc.symbol = s.symbol
            LEFT JOIN latest_prices lp ON rc.symbol = lp.symbol
            WHERE rc.rn <= ?
            ORDER BY rc.symbol, rc.date DESC
        `, [CHIP_WINDOW]);

        if (allChips.length === 0) {
            return new Response(JSON.stringify({ foreign: [], invest: [], dealer: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. 在記憶體中進行分組處理
        const groupedData = new Map<string, typeof allChips>();
        for (const row of allChips) {
            if (!groupedData.has(row.symbol)) {
                groupedData.set(row.symbol, []);
            }
            groupedData.get(row.symbol)!.push(row);
        }

        const streakData = [];

        for (const [symbol, chips] of groupedData.entries()) {
            const latest = chips[0];
            const name = latest.name;

            // Calculate streaks only if latest value is non-zero
            const foreignStreak = calculateStreak(chips, 'foreign_inv');
            const investStreak = calculateStreak(chips, 'invest_trust');
            const dealerStreak = calculateStreak(chips, 'dealer');

            // Threshold Check: Keep only entities with active streaks
            if (Math.abs(foreignStreak) >= 2 || Math.abs(investStreak) >= 2 || Math.abs(dealerStreak) >= 2) {
                // Inline Intensity calculation (last 5 days)
                let intensity = 0;
                const iLen = Math.min(chips.length, 5);
                for (let i = 0; i < iLen; i++) {
                    intensity += chips[i].foreign_inv + chips[i].invest_trust + chips[i].dealer;
                }

                streakData.push({
                    symbol,
                    name,
                    foreignStreak,
                    investStreak,
                    dealerStreak,
                    changePct: latest.change_pct || 0,
                    volume: latest.volume || 0,
                    turnover: latest.turnover || 0,
                    chipsIntensity: intensity,
                    latest: {
                        foreign: latest.foreign_inv,
                        invest: latest.invest_trust,
                        dealer: latest.dealer,
                    }
                });
            }
        }

        function calculateStreak(rows: any[], key: string) {
            const firstVal = rows[0][key];
            if (firstVal === 0) return 0;
            const isBuying = firstVal > 0;
            let streak = 0;
            for (const row of rows) {
                const val = row[key];
                if (isBuying ? val > 0 : val < 0) streak++;
                else break;
            }
            return isBuying ? streak : -streak;
        }

        // 3. 在服務端進行排序和分組，減輕前端負擔
        const TOP_LIMIT = 30; // 減少渲染數量
        const result = {
            foreign: streakData
                .filter(i => Math.abs(i.foreignStreak) >= 2)
                .sort((a, b) => Math.abs(b.foreignStreak) - Math.abs(a.foreignStreak))
                .slice(0, TOP_LIMIT),
            invest: streakData
                .filter(i => Math.abs(i.investStreak) >= 2)
                .sort((a, b) => Math.abs(b.investStreak) - Math.abs(a.investStreak))
                .slice(0, TOP_LIMIT),
            dealer: streakData
                .filter(i => Math.abs(i.dealerStreak) >= 2)
                .sort((a, b) => Math.abs(b.dealerStreak) - Math.abs(a.dealerStreak))
                .slice(0, TOP_LIMIT),
        };

        // 更新快取
        cachedStreakResult = result;
        lastCacheUpdate = Date.now();

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[API Streak] Error:', err);
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
};
