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
        if (cachedStreakResult && now - lastCacheUpdate < CACHE_DURATION) {
            return new Response(JSON.stringify(cachedStreakResult), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'HIT',
                },
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
            // Forensic Data
            total_shareholders: number;
            large_holder_1000_ratio: number;
            small_holder_under_10_ratio: number;
            gov_net_buy: number;
            gov_net_amount: number;
            main_net_shares: number;
            main_concentration: number;
            // Pro Forensic Data
            dir_ratio: number;
            dir_pawn: number;
            dir_change: number;
            lend_bal: number;
            short_bal: number;
            prop_buy: number;
            hedge_buy: number;
        }>(
            `
            WITH RankedChips AS (
                SELECT 
                    symbol,
                    foreign_inv,
                    invest_trust,
                    dealer,
                    date,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM chips
            ),
            LatestShareholders AS (
                SELECT symbol, total_shareholders, large_holder_1000_ratio, small_holder_under_10_ratio,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM shareholder_distribution
            ),
            LatestGov AS (
                SELECT symbol, net_buy_shares, net_buy_amount,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM government_chips
            ),
            LatestBroker AS (
                SELECT symbol, net_main_player_shares, concentration_ratio,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM major_broker_chips
            ),
            LatestDirector AS (
                SELECT symbol, director_holding_ratio, pawn_ratio, insider_net_change,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM director_holdings
            ),
            LatestLending AS (
                SELECT symbol, lending_balance, short_selling_balance,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM security_lending
            ),
            LatestDealer AS (
                SELECT symbol, prop_buy, hedge_buy,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM dealer_details
            )
            SELECT rc.symbol, s.name, rc.foreign_inv, rc.invest_trust, rc.dealer, rc.date,
                   lp.volume, lp.turnover, lp.change_pct,
                   ls.total_shareholders, ls.large_holder_1000_ratio, ls.small_holder_under_10_ratio,
                   lg.net_buy_shares as gov_net_buy, lg.net_buy_amount as gov_net_amount,
                   lb.net_main_player_shares as main_net_shares, lb.concentration_ratio as main_concentration,
                   ldir.director_holding_ratio as dir_ratio, ldir.pawn_ratio as dir_pawn, ldir.insider_net_change as dir_change,
                   ll.lending_balance as lend_bal, ll.short_selling_balance as short_bal,
                   ld.prop_buy, ld.hedge_buy
            FROM RankedChips rc
            JOIN stocks s ON rc.symbol = s.symbol
            LEFT JOIN latest_prices lp ON rc.symbol = lp.symbol
            LEFT JOIN LatestShareholders ls ON rc.symbol = ls.symbol AND ls.rn = 1
            LEFT JOIN LatestGov lg ON rc.symbol = lg.symbol AND lg.rn = 1
            LEFT JOIN LatestBroker lb ON rc.symbol = lb.symbol AND lb.rn = 1
            LEFT JOIN LatestDirector ldir ON rc.symbol = ldir.symbol AND ldir.rn = 1
            LEFT JOIN LatestLending ll ON rc.symbol = ll.symbol AND ll.rn = 1
            LEFT JOIN LatestDealer ld ON rc.symbol = ld.symbol AND ld.rn = 1
            WHERE rc.rn <= ?
            ORDER BY rc.symbol, rc.date DESC
        `,
            [CHIP_WINDOW]
        );

        if (allChips.length === 0) {
            return new Response(JSON.stringify({ foreign: [], invest: [], dealer: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
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
            if (
                Math.abs(foreignStreak) >= 2 ||
                Math.abs(investStreak) >= 2 ||
                Math.abs(dealerStreak) >= 2
            ) {
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
                    },
                    // Forensic Mapping
                    shareholderDist: latest.total_shareholders
                        ? {
                              total: latest.total_shareholders,
                              large1000: latest.large_holder_1000_ratio,
                              small10: latest.small_holder_under_10_ratio,
                          }
                        : undefined,
                    government: latest.gov_net_amount
                        ? {
                              netBuy: latest.gov_net_buy,
                              netAmount: latest.gov_net_amount,
                          }
                        : undefined,
                    brokerChip: latest.main_concentration
                        ? {
                              concentration: latest.main_concentration,
                              netNet: latest.main_net_shares,
                          }
                        : undefined,
                    director:
                        latest.dir_pawn !== null
                            ? {
                                  ratio: latest.dir_ratio,
                                  pawn: latest.dir_pawn,
                                  change: latest.dir_change,
                              }
                            : undefined,
                    lending:
                        latest.lend_bal !== null
                            ? {
                                  balance: latest.lend_bal,
                                  shorting: latest.short_bal,
                              }
                            : undefined,
                    dealerDet:
                        latest.prop_buy !== null
                            ? {
                                  prop: latest.prop_buy,
                                  hedge: latest.hedge_buy,
                              }
                            : undefined,
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

        // 4. Calculate Market Aggregates (Yesterday's total institutional flow)
        // Find latest date in chips
        const latestDateRow = dbService.queryOne<{ date: string }>(
            `SELECT date FROM chips ORDER BY date DESC LIMIT 1`
        );
        const latestDate = latestDateRow?.date;

        let marketSummary = {
            foreign: 0,
            invest: 0,
            dealer: 0,
            total: 0,
            govTotalAmount: 0,
            avgConcentration: 0,
        };

        if (latestDate) {
            const sumRow = dbService.queryOne<{ f: number; i: number; d: number }>(
                `
                SELECT SUM(foreign_inv) as f, SUM(invest_trust) as i, SUM(dealer) as d 
                FROM chips WHERE date = ?`,
                [latestDate]
            );

            // Forensic Aggregates
            const govSum = dbService.queryOne<{ amt: number }>(
                `
                SELECT SUM(net_buy_amount) as amt FROM government_chips WHERE date = ?`,
                [latestDate]
            );

            const concAvg = dbService.queryOne<{ avg: number }>(
                `
                SELECT AVG(large_holder_1000_ratio) as avg FROM shareholder_distribution WHERE date = ?`,
                [latestDate]
            );

            if (sumRow) {
                marketSummary = {
                    foreign: sumRow.f || 0,
                    invest: sumRow.i || 0,
                    dealer: sumRow.d || 0,
                    total: (sumRow.f || 0) + (sumRow.i || 0) + (sumRow.d || 0),
                    govTotalAmount: govSum?.amt || 0,
                    avgConcentration: concAvg?.avg || 0,
                };
            }
        }

        // 5. Calculate 20-day Trend for Charts
        const trendData = dbService
            .queryAll<{ date: string; f: number; i: number; d: number }>(
                `
            SELECT date, SUM(foreign_inv) as f, SUM(invest_trust) as i, SUM(dealer) as d 
            FROM chips 
            GROUP BY date 
            ORDER BY date DESC 
            LIMIT 20
        `
            )
            .reverse(); // Keep chronological order for chart

        const TOP_LIMIT = 50;

        // Forensic Alpha Lists (Top 20 per forensic signal)
        const forensicAlpha = {
            highConcentration: [...streakData]
                .filter(i => i.shareholderDist && i.shareholderDist.large1000 > 0)
                .sort(
                    (a, b) =>
                        (b.shareholderDist?.large1000 || 0) - (a.shareholderDist?.large1000 || 0)
                )
                .slice(0, 20),
            govSupport: [...streakData]
                .filter(i => i.government && i.government.netAmount > 0)
                .sort((a, b) => (b.government?.netAmount || 0) - (a.government?.netAmount || 0))
                .slice(0, 20),
            mainAccumulation: [...streakData]
                .filter(i => i.brokerChip && i.brokerChip.concentration > 0)
                .sort(
                    (a, b) =>
                        (b.brokerChip?.concentration || 0) - (a.brokerChip?.concentration || 0)
                )
                .slice(0, 20),
            insider: [...streakData]
                .filter(i => i.director && i.director.pawn > 0)
                .sort((a, b) => (b.director?.pawn || 0) - (a.director?.pawn || 0))
                .slice(0, 20),
            shorting: [...streakData]
                .filter(i => i.lending && i.lending.shorting > 0)
                .sort((a, b) => (b.lending?.shorting || 0) - (a.lending?.shorting || 0))
                .slice(0, 20),
        };

        const result = {
            marketSummary,
            date: latestDate,
            trend: trendData,
            forensicAlpha,
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
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[API Streak] Error:', err);
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
};
