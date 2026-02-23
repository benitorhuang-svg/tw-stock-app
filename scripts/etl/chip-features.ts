/**
 * M1: Chip Features ETL
 */
export class ChipETL {
    /**
     * T011: 將三大法人買賣超資料轉換為籌碼集中度
     */
    public calculateConcentration(totalInstBuyArray: number[], totalVolumeArray: number[]) {
        if (totalInstBuyArray.length < 5) return new Array(totalInstBuyArray.length).fill(null);

        const results: (number | null)[] = [];

        for (let i = 0; i < totalInstBuyArray.length; i++) {
            if (i < 4) {
                results.push(null);
                continue;
            }

            // 計算 5 日累計買超 / 5 日累計成交量
            const fiveDayBuy = totalInstBuyArray.slice(i - 4, i + 1).reduce((a, b) => a + b, 0);
            const fiveDayVol = totalVolumeArray.slice(i - 4, i + 1).reduce((a, b) => a + b, 0);

            if (fiveDayVol === 0) {
                results.push(0);
            } else {
                results.push(Number(((fiveDayBuy / fiveDayVol) * 100).toFixed(2)));
            }
        }

        return results;
    }
}

export const chipETL = new ChipETL();
