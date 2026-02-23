# 002 — AI 情境萃取器 (AI Context Distillation)

> 在 M5 視覺層中，我們設計了「AI 報告與智能警示 (`007-tab-alerts.md`)」。然而，大型語言模型 (LLM) 具有 Token 數量限制，且無法直接閱讀 SQLite 內的關聯資料庫。因此，M2 分析引擎的第二大重任，就是擔任 **資料與 LLM 之間的中介層 (The Context Distiller)**。

## 1. 架構：特徵降維與文本合成 (`src/lib/ai-distiller.ts`)
本模組負責把數萬筆的 OHLCV、外資每日進出明細，濃縮成「人類可讀、且 LLM 好懂」的純文字 Context (Context Window Template)，作為呼叫 OpenAI 或 Gemini API 的 `System Prompt` 數據集。

### 1.1 資料截取策略 (Data Trimming)
絕不能把過去 5 年的價格丟給 AI。
- **時間維度**：只抓取最近 60 個交易日 (一季) 的收盤價與籌碼庫存。
- **技術信號極簡化**：不給 AI 所有 MA 值。只在 Context 寫：「日 K 棒目前處於 MA20 (月線) 之上，且 MACD 剛於昨日翻正」。
- **極值標記 (Outliers)**：系統自動掃描近一季數據，挑出「最大爆量日」、「外資最大賣超日」，直接餵給 AI 這些事件點。

### 1.2 Prompt Context 模板生成 (Context Template)
`distiller.generateContext(symbol: string): Promise<string>` 會輸出如下的高密度結構化文本：

```text
[Stock Profile]
Symbol: 2330
Name: 台積電
Sector: 半導體業
Current Price: 605, PE Ratio: 15.2 (處於過去五年 30% 偏低分位數)

[Technical Indicators (Last 5 Days)]
Trend: MA5(601) > MA20(590) -> 短多趨勢
MACD Histogram: 轉正連續 3 天
KD: K(82), D(75) -> 進入超買區

[Institutional Chips (Last 10 Days)]
Foreign Investors: 連續 4 日買超，總計 +15,000 張
Investment Trust: 中性偏空，總計 -2,000 張

[Revenue Momentum]
Last Month YoY: +12%
Last Quarter ROE: 8.5%
```

## 2. LLM 推論與快取 (Inference & Caching)
- **Token 節約與防爆**：上述 Context 控制在 500 tokens 左右。
- **Rate Limit 處理**：呼叫外部 OpenAI/Gemini API 時，若遇到 `429 Too Many Requests`，此層需負責 Exponential Backoff (指數退避重試)。
- **資料庫快取 (Result Caching)**：
  AI 的回應通常在當日盤後就不會再變。因此系統必須把 AI 回傳的 Markdown 文本，存入 SQLite 的 `ai_reports` table，並標記 `date`。同日只要有第二個使用者點開，直接從 DB 讀取，達成 **0 API 費用**與**毫秒級渲染**。

## 3. 輸出：JSON 與 Markdown 的雙生結構
為了配合 M5 的前端版面，API 要求 LLM 強制回傳 `JSON` 格式，而非隨意生成的文章。
```json
{
  "sentiment_score": 75,
  "summary_markdown": "### 籌碼面強勢\n外資連四買，配合本益比偏低...",
  "suggested_alert_condition": {
    "field": "price",
    "operator": "<",
    "value": 590,
    "reason": "跌破 MA20 支撐"
  }
}
```
M2 引擎解析後，將 `summary_markdown` 繪製至左側，將 `suggested_alert_condition` 轉譯為右側的「推薦行動開關」。
