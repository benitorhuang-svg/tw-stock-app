/**
 * M2: Math Utilities for Risk Analysis
 */

export class MathUtils {
    /**
     * T001: 計算平均數
     */
    public static mean(data: number[]): number {
        return data.reduce((a, b) => a + b, 0) / data.length;
    }

    /**
     * T001: 計算標準差 (Standard Deviation)
     */
    public static standardDeviation(data: number[]): number {
        const m = this.mean(data);
        const variance = data.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (data.length - 1);
        return Math.sqrt(variance);
    }

    /**
     * T001: 皮爾森相關係數 (Pearson Correlation)
     */
    public static correlation(x: number[], y: number[]): number {
        const n = x.length;
        if (n !== y.length) throw new Error('Array lengths must match');

        const meanX = this.mean(x);
        const meanY = this.mean(y);

        let num = 0;
        let denX = 0;
        let denY = 0;

        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            num += dx * dy;
            denX += dx * dx;
            denY += dy * dy;
        }

        return num / Math.sqrt(denX * denY);
    }
}
