---
name: Market Breadth Analysis Engine
description: 台股大盤與整體市場寬度情緒評估模型，用以判斷系統性風險與絕佳買點。
---

# 市場寬度分析模型 (Market Breadth Analysis Model)

市場寬度（Market Breadth）主要用來衡量「大盤上漲/下跌的真實健康度」。有時指數在上漲（如靠台積電拉抬），但實際上多數股票在跌，這就是「長線空頭前的虛漲」。本模型作為所有交易策略的**「總開關與大閘門」**。

## 1. 核心指標量化邏輯 (Mathematical Definition)

**A. 均線寬度指標 (Moving Average Breadth)**
計算全市場（上市+上櫃，約 1700 檔股票）中，股價站上特定均線的「比例」。
*   *Formula*: `Breadth_20MA_Ratio = (收盤價 > 20MA 的股票檔數) / (總檔數) * 100`
*   *Formula*: `Breadth_60MA_Ratio = (收盤價 > 60MA 的股票檔數) / (總檔數) * 100`

**B. 騰落指標 (Advance-Decline Line, ADL)**
衡量每天上漲家數與下跌家數的長期累積動能。
*   *Formula*: `Net_Advances_today = 每日上漲家數 - 每日下跌家數`
*   *Formula*: `ADL_today = ADL_yesterday + Net_Advances_today`

## 2. 系統狀態判定規則 (Regime Identification)

透過上述指標，將市場狀態分為四個燈號，限制或開放下方的交易系統：

*   🟢 **綠燈 (健康多頭)**：
    *   *Condition*: `Breadth_20MA_Ratio > 50%` AND `ADL > SMA(ADL, 20)`
    *   *Action (動作)*：火力全開，買進訊號全數放行，允許滿倉操作。
*   🟡 **黃燈 (過熱或拉回)**：
    *   *Condition (過熱)*: `Breadth_20MA_Ratio > 85%` (大部分股票已經大漲)
    *   *Action*：停止買進新的多單，手頭持股收緊停利條件（如跌破 10日線就賣出）。
*   🔴 **紅燈 (系統性空頭)**：
    *   *Condition*: `Breadth_60MA_Ratio < 30%` 且 `指數跌破季線`
    *   *Action*：強制大閘門鎖死。所有均線與技術面買進訊號宣告無效 (False Breakout 機率極高)。將持股比例強制降至 30% 以下，保留現金。
*   🔵 **藍燈 (絕望極度超賣 - 黃金買點)**：
    *   *Condition*: `Breadth_20MA_Ratio < 10%` (九成的股票都在季線/月線之下，市場極度恐慌)
    *   *Action*：準備切換為「抄底模式」，一旦出現 RSI 背離或第一根帶量紅K，即可進場搶反彈。

## 3. 開發實作規範 (給 AI / 工程師的指示)
*   **資料緩存 (Caching)**：市場寬度運算需要取得 1700 檔股票的即時/盤後資料求和計算，非常消耗效能。請在後端 API (如 `/api/screener`) 或資料庫實作 CronJob 每日盤後計算一次並存於 Redis 或 DB，前端僅透過簡單 API 取得此 0-100 的狀態分數即可。
*   **UI 呈現**：在 Dashboard 最頂層（如 Sidebar 最上方或 Header），呈現市場寬度燈號與溫度計（0-100%）。
