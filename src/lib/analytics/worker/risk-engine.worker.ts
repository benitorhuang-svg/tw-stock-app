import { MathUtils } from '../math-utils';

/**
 * M2: Risk Engine Web Worker
 * 負責在背景線程計算 $O(N^2)$ 的相關性矩陣，防止卡住 UI。
 */
self.onmessage = (e: MessageEvent) => {
    const { stocksData } = e.data; // 格式: { symbol: string, prices: number[] }[]

    if (!stocksData || stocksData.length === 0) {
        self.postMessage({ error: 'No data provided' });
        return;
    }

    try {
        const matrix: Record<string, Record<string, number>> = {};
        const symbols = stocksData.map((s: { symbol: string; prices: number[] }) => s.symbol);

        // 計算相關性矩陣
        for (let i = 0; i < symbols.length; i++) {
            const symA = symbols[i];
            matrix[symA] = {};

            for (let j = 0; j < symbols.length; j++) {
                const symB = symbols[j];

                if (i === j) {
                    matrix[symA][symB] = 1;
                } else {
                    const corr = MathUtils.correlation(stocksData[i].prices, stocksData[j].prices);
                    matrix[symA][symB] = Number(corr.toFixed(4));
                }
            }
        }

        self.postMessage({ matrix, symbols });
    } catch (err: unknown) {
        self.postMessage({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
};
