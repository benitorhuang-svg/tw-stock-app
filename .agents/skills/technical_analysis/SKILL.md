---
name: Technical Analysis Strategy Engine
description: 台股技術面與籌碼面量化選股模型，著重於價格趨勢、動能指標與大戶資金流向。
---

# 技術面與籌碼面分析模型 (Technical & Chip Analysis Model)

本模型定義了捕捉股價趨勢與短期爆發力的邏輯。它沒有長期的公司信仰，全憑市場資金足跡說話。

## 1. 趨勢與型態過濾 (Trend Filtering) - 確定大方向
此階段為「絕對條件」，用於判斷股票目前所處的位階。

*   **大趨勢保護**：今日收盤價 > 60 日均線 (季線)。
    *   *Pseudo-code*: `Close_Price > SMA(Close_Price, 60)`
*   **短期多頭排列**：今日收盤價 > 10 日均線 且 10 日均線 > 20 日均線。
    *   *Pseudo-code*: `Close_Price > SMA(Close_Price, 10) AND SMA(Close_Price, 10) > SMA(Close_Price, 20)`
*   **價格位階 (突破潛力)**：近 60 日最高價 / 昨日收盤價 < 1.15。
    *   *Pseudo-code*: `Highest(High_Price, 60) / Close_Price_yesterday < 1.15`

---

## 2. 動能與籌碼評分模型 (Momentum & Chips Scoring)
符合趨勢過濾條件的股票，進入以下評分系統 (滿分 100 分) 計算短線爆發力。

**A. 短期爆發動能 (技術指標，權重 40%)**
*   **MACD 翻紅發散 (20%)**：
    *   *Definition*: 
        *   `EMA_12 = EMA(Close_Price, 12)`
        *   `EMA_26 = EMA(Close_Price, 26)`
        *   `DIF = EMA_12 - EMA_26`
        *   `MACD_9 = EMA(DIF, 9)`
        *   `OSC = DIF - MACD_9`
    *   *Condition*: `DIF > MACD_9 AND OSC_today > OSC_yesterday AND OSC_yesterday > OSC_day_before_yesterday AND OSC_today > 0`
    *   符合條件給 20 分。
*   **RSI 強勢區間 (20%)**：
    *   *Definition*: `RSI_14` (14日相對強弱指標)
    *   *Condition*: `60 <= RSI_14 <= 80` (給 20 分)。若 `RSI_14 > 80` (給 5 分，過熱警示)。

**B. 籌碼流向 (台灣股市特有，權重 40%)**
*   **外資連買 (20%)**：
    *   *Condition*: `Foreign_Buy_Net_today > 0 AND Foreign_Buy_Net_yesterday > 0 AND Foreign_Buy_Net_day_before > 0`
    *   符合條件給 20 分。
*   **投信青睞 (20%)**：
    *   *Condition*: `sum(Investment_Trust_Buy_Net_latest_5_days) > 1000 * 1000` (單位：股)
    *   符合條件給 20 分。

**C. 爆量突破 (權重 20%)**
*   **成交量放大 (20%)**：
    *   *Condition*: `Volume_today > SMA(Volume, 5) * 2`
    *   符合條件給 20 分。

---

## 3. 開發實作規範 (給 AI / 工程師的指示)
*   **歷史資料依賴**：遇到技術指標需要使用歷史資料計算 (如 MACD, RSI, 均線)，請確保擁有至少 N+Max(Period) 日的歷史價格陣列。
*   **買進訊號判定**：當動能與籌碼總得分 > 85 分時，將此事件標記為 `StrongBuySignal`。
*   **回測串接 (Backtesting)**：在實作 `BacktestHeatmap` 進行回測展示時，將上述的高分狀態設定為「進場條件 (Entry Condition)」。
