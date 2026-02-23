/**
 * M2: AI Prompt Builder
 */
export class PromptBuilder {
    /**
     * T006: 根據股票特徵構建 AI 提詞
     */
    public buildStockAnalysisPrompt(symbol: string, data: any): string {
        const { tech, chip, pricing } = data;

        return `
            你是一位專業的台股分析師。請針對股票代號 ${symbol} 進行深度技術面與籌碼面診斷。
            
            [技術面數據]
            - 收盤價: ${pricing.close}
            - MA5: ${tech.ma5}, MA20: ${tech.ma20}, MA60: ${tech.ma60}
            - MACD: ${tech.macd_diff}, RSI: ${tech.rsi14}
            
            [籌碼面數據]
            - 外資買賣超: ${chip.foreign_buy}
            - 投信買賣超: ${chip.trust_buy}
            - 近5日籌碼集中度: ${chip.concentration_5d}%
            
            任務：
            1. 給出目前的趨勢判斷 (多頭/空頭/盤整)。
            2. 識別關鍵支撐與壓力位。
            3. 評估法人動向。
            4. 給出 300 字內的核心總結，並用 Traditional Chinese (zh-TW) 回答。
        `.trim();
    }
}

export const promptBuilder = new PromptBuilder();
