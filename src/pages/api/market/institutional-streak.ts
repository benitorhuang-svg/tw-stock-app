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

        // 1. 使用 institutional_snapshot (預計算) + chips (近20天歷史) 兩步取代 7-table JOIN
        const CHIP_WINDOW = 20;

        // Step A: 從 chips 取近20天歷史 (用於計算連續買賣超天數)
        const chipHistory = dbService.queryAll<{
            symbol: string;
            foreign_inv: number;
            invest_trust: number;
            dealer: number;
            date: string;
        }>(
            `
            WITH RankedChips AS (
                SELECT symbol, foreign_inv, invest_trust, dealer, date,
                       ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM chips
            )
            SELECT symbol, foreign_inv, invest_trust, dealer, date
            FROM RankedChips WHERE rn <= ?
            ORDER BY symbol, date DESC
        `,
            [CHIP_WINDOW]
        );

        // Step B: 從 institutional_snapshot (ETL 預計算) 取所有法人快照
        const snapshots = dbService.queryAll<{
            symbol: string;
            name: string;
            date: string;
            volume: number;
            turnover: number;
            change_pct: number;
            foreign_inv: number;
            invest_trust: number;
            dealer: number;
            total_shareholders: number;
            large_holder_1000_ratio: number;
            small_holder_under_10_ratio: number;
            gov_net_buy: number;
            gov_net_amount: number;
            main_net_shares: number;
            main_concentration: number;
            dir_ratio: number;
            dir_pawn: number;
            dir_change: number;
            lend_bal: number;
            short_bal: number;
            prop_buy: number;
            hedge_buy: number;
        }>(
            `
            SELECT isnap.symbol, s.name, isnap.date,
                   lp.volume, lp.turnover, lp.change_pct,
                   isnap.foreign_inv, isnap.invest_trust, isnap.dealer,
                   isnap.total_shareholders, isnap.large_holder_1000_ratio, isnap.small_holder_under_10_ratio,
                   isnap.gov_net_buy, isnap.gov_net_amount,
                   isnap.main_net_shares, isnap.main_concentration,
                   isnap.director_ratio as dir_ratio, isnap.pawn_ratio as dir_pawn, isnap.insider_change as dir_change,
                   isnap.lending_balance as lend_bal, isnap.short_selling_balance as short_bal,
                   isnap.prop_buy, isnap.hedge_buy
            FROM institutional_snapshot isnap
            JOIN stocks s ON isnap.symbol = s.symbol
            LEFT JOIN latest_prices lp ON isnap.symbol = lp.symbol
        `
        );

        if (chipHistory.length === 0) {
            return new Response(JSON.stringify({ foreign: [], invest: [], dealer: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. 在記憶體中合併: chipHistory (streak計算) + snapshots (法人資料)
        const chipMap = new Map<string, typeof chipHistory>();
        for (const row of chipHistory) {
            if (!chipMap.has(row.symbol)) chipMap.set(row.symbol, []);
            chipMap.get(row.symbol)!.push(row);
        }

        const snapMap = new Map(snapshots.map(s => [s.symbol, s]));

        const streakData = [];

        for (const [symbol, chips] of chipMap.entries()) {
            const snap = snapMap.get(symbol);
            if (!snap) continue;

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
                    name: snap.name,
                    foreignStreak,
                    investStreak,
                    dealerStreak,
                    changePct: snap.change_pct || 0,
                    volume: snap.volume || 0,
                    turnover: snap.turnover || 0,
                    chipsIntensity: intensity,
                    latest: {
                        foreign: snap.foreign_inv,
                        invest: snap.invest_trust,
                        dealer: snap.dealer,
                    },
                    // Forensic Mapping (from pre-computed snapshot)
                    shareholderDist: snap.total_shareholders
                        ? {
                              total: snap.total_shareholders,
                              large1000: snap.large_holder_1000_ratio,
                              small10: snap.small_holder_under_10_ratio,
                          }
                        : undefined,
                    government: snap.gov_net_amount
                        ? {
                              netBuy: snap.gov_net_buy,
                              netAmount: snap.gov_net_amount,
                          }
                        : undefined,
                    brokerChip: snap.main_concentration
                        ? {
                              concentration: snap.main_concentration,
                              netNet: snap.main_net_shares,
                          }
                        : undefined,
                    director:
                        snap.dir_pawn !== null
                            ? {
                                  ratio: snap.dir_ratio,
                                  pawn: snap.dir_pawn,
                                  change: snap.dir_change,
                              }
                            : undefined,
                    lending:
                        snap.lend_bal !== null
                            ? {
                                  balance: snap.lend_bal,
                                  shorting: snap.short_bal,
                              }
                            : undefined,
                    dealerDet:
                        snap.prop_buy !== null
                            ? {
                                  prop: snap.prop_buy,
                                  hedge: snap.hedge_buy,
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

        // 4. 從 institutional_trend (預計算) 取市場匯總 + 20天趨勢
        const latestTrend = dbService.queryOne<{
            date: string;
            total_foreign: number;
            total_trust: number;
            total_dealer: number;
            total_net: number;
        }>(`SELECT date, total_foreign, total_trust, total_dealer, total_net
            FROM institutional_trend ORDER BY date DESC LIMIT 1`);

        const marketSummary = {
            foreign: latestTrend?.total_foreign || 0,
            invest: latestTrend?.total_trust || 0,
            dealer: latestTrend?.total_dealer || 0,
            total: latestTrend?.total_net || 0,
            govTotalAmount: 0,
            avgConcentration: 0,
        };

        const latestDate = latestTrend?.date;

        // Forensic aggregates (still from raw tables, but these are simple single-row queries)
        if (latestDate) {
            const govSum = dbService.queryOne<{ amt: number }>(
                `SELECT SUM(net_buy_amount) as amt FROM government_chips WHERE date = ?`,
                [latestDate]
            );
            const concAvg = dbService.queryOne<{ avg: number }>(
                `SELECT AVG(large_holder_1000_ratio) as avg FROM shareholder_distribution WHERE date = ?`,
                [latestDate]
            );
            marketSummary.govTotalAmount = govSum?.amt || 0;
            marketSummary.avgConcentration = concAvg?.avg || 0;
        }

        // 5. 從 institutional_trend (預計算) 讀取 20 天趨勢，免 GROUP BY
        const trendData = dbService
            .queryAll<{ date: string; f: number; i: number; d: number; avgChg: number }>(
                `
            SELECT date, total_foreign as f, total_trust as i, total_dealer as d,
                   avg_change_pct as avgChg
            FROM institutional_trend
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
