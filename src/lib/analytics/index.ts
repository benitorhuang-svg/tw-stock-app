/**
 * M2: Analytics Engine Interface
 */
export class AnalyticsEngine {
    private worker: Worker | null = null;

    /**
     * T004: 執行非同步相關性分析 (透過 Worker)
     */
    public async analyzeCorrelation(
        stocksData: { symbol: string; prices: number[] }[]
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('Web Worker only available in browser context'));
                return;
            }

            // 動態加載 Worker (支援 Vite/Astro 語法)
            const RiskWorker = new Worker(
                new URL('./worker/risk-engine.worker.ts', import.meta.url),
                { type: 'module' }
            );

            RiskWorker.onmessage = e => {
                if (e.data.error) reject(new Error(e.data.error));
                else resolve(e.data);
                RiskWorker.terminate();
            };

            RiskWorker.onerror = err => {
                reject(err);
                RiskWorker.terminate();
            };

            RiskWorker.postMessage({ stocksData });
        });
    }
}

export const analyticsEngine = new AnalyticsEngine();
