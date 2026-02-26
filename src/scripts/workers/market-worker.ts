/**
 * market-worker.ts — Off-main-thread data processing
 */

import type { TwseStockSnapshot } from '../../types/stock';
import type { ProcessedStock, MarketBreadth } from '../../types/market';

self.onmessage = (e: MessageEvent) => {
    const { data, indicatorMap } = e.data;
    const snapshots = data as TwseStockSnapshot[];

    let u = 0,
        d = 0,
        f = 0;
    const processed: ProcessedStock[] = new Array(snapshots.length);

    for (let i = 0; i < snapshots.length; i++) {
        const s = snapshots[i];
        const close = parseFloat(s.ClosingPrice || '0');
        const chg = parseFloat(s.Change || '0');
        const prev = close > 0 ? close - chg : 0;
        const vol_raw = parseFloat(s.TradeVolume || '0');

        const indicators = indicatorMap[s.Code] || {};

        processed[i] = {
            code: s.Code,
            name: s.Name,
            price: close,
            change: chg,
            changePct: prev > 0 ? (chg / prev) * 100 : 0,
            vol: Math.round(vol_raw / 1000),
            open: parseFloat(s.OpeningPrice || '0'),
            high: parseFloat(s.HighestPrice || '0'),
            low: parseFloat(s.LowestPrice || '0'),
            ma5: indicators.ma5 || 0,
            ma20: indicators.ma20 || 0,
            rsi: indicators.rsi || 0,
            avgVol: indicators.volume || 0,
            isStarred: false, // Updated by store/UI
        };

        if (chg > 0) u++;
        else if (chg < 0) d++;
        else f++;
    }

    const breadth: MarketBreadth = {
        up: u,
        down: d,
        flat: f,
        total: u + d + f,
    };

    self.postMessage({ processed, breadth });
};
