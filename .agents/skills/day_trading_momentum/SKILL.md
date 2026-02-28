---
name: Day Trading & High Frequency Momentum Engine
description: 台股當沖與隔日沖特化之極短線動能模型，聚焦於資金流速與日內價格波動。
---

# 當沖與隔日沖極短線動能模型 (Day Trading Momentum Model)

極短線交易 (Tick-level 或 1分/5分K) 與波段交易邏輯完全不同。在此模型中，基本面 (公司賺不賺錢) 的權重為 `0`。一切只看「日內籌碼」、「大單敲進」以及「價格慣性」。

## 1. 盤前篩選 (Pre-Market Scanner) - 尋找獵物
當沖客不應在盤中亂找股票，必須在早上 8:50 前列出 5~10 檔「高度關注名單」。

*   **昨日強勢股 (隔日沖籌碼池)**：
    *   *Condition*: 昨日收盤漲停 (或漲幅 > 8%) 且 成交總金額排名全市場前 50。
*   **跳空開高缺口 (Gap Up)**：
    *   *Formula*: `Gap_Ratio = (今日開盤價 - 昨日收盤價) / 昨日收盤價 * 100`
    *   *Condition*: 早上 9:00 開盤瞬間，`Gap_Ratio > 2%` 且伴隨第一分鐘成交爆出昨日全天均量的 `10%`。此類股票最容易出現開盤 30 分鐘內的強烈趨勢。

## 2. 日內動能觸發條件 (Intraday Actionable Signals)

**A. 開盤驅動 (Opening Drive)**
*   聚焦 09:00 ~ 09:30 的爆發期。
*   *觸發條件 (做多)*：開盤第一根 5 分K 為實體紅K，且帶大量。第二根 5 分K 突破第一根高點時，瞬間買進。

**B. VWAP 均價線策略 (Volume-Weighted Average Price)**
當沖最重要的生命線，法人與日拋大戶的基準成本。
*   *Formula*: `VWAP = Cumulative(Price * Volume) / Cumulative(Volume)` (從當日開盤起算)
*   *做多訊號 (Bounce)*：股價急跌至 VWAP 附近且爆量收長下影線 (抵抗力道出現)，視為極佳短線買點。
*   *做空訊號 (Breakdown)*：股價跌破 VWAP，且之後 15 分鐘連續被 VWAP 壓制，可反手做空 (做當沖空單)。

**C. 大單追跡 (Tick Order Flow) - 進階條件**
*   *Condition*: 連續出現 5 筆以上的「外盤成交 (即買不計價直接敲賣價)」，且單筆張數 > 50 張。(俗稱的大單點點火) -> 總分直接 +50 分。

## 3. 當沖極速風控 (Tick-Level Risk Management)
當沖的風控時間單位是「秒」與「分鐘」。

*   **停損條件 1**：買進後，跌破前一根 5分/1分K 的低點，立刻停損。
*   **停損條件 2 (時間停損)**：買進後 15 分鐘不漲 (動能消失，不如預期)，強制平倉。
*   **絕對底線**：當日虧損達到總資金的 1% 時（例如準備 100 萬，賠掉 1 萬），當日軟體強制鎖定（俗稱拔網路線），不再允許任何新交易，避免上頭（Revenge Trading）。

## 4. 開發實作規範 (給 AI / 工程師的指示)
*   **資料頻率 (Data Frequency)**：此模型若要寫成程式實作，必須接取證交所或第三方的 WebSockets 即時報價 (Real-time Ticks)，而非每日盤後的資料 API。
*   **圖表視覺化 (Charting)**：若要開發 `IntradayChart` UI，必須包含 K線、Tick 成交量以及 每日重新計算的 VWAP 均價線疊加。
