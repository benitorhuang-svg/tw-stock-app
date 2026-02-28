---
name: Fundamental Analysis Strategy Engine
description: 台股基本面量化選股與評分模型，著重於財報數據、獲利能力與價值評估。
---

# 基本面分析模型 (Fundamental Analysis Model)

本模型定義了基本面過濾與評分的邏輯。在進行程式化選股或資料轉化 (Transform) 時，請將這些規則撰寫為過濾器與計算函數。

## 1. 財報法醫過濾 (Forensic Filtering) - 剔除高風險標的
此階段為「絕對條件」，只要不符合，該股票即刻淘汰，不參與後續評分。

*   **獲利底線**：近四季 EPS 總和 > 0。
    *   *Pseudo-code*: `sum(EPS_Q1, EPS_Q2, EPS_Q3, EPS_Q4) > 0`
*   **現金流檢視**：近一季「營業現金流」為正數。
    *   *Pseudo-code*: `Operating_Cash_Flow_latest_Q > 0`
*   **負債風險**：負債比率 < 70%。
    *   *Pseudo-code*: `(Total_Liabilities / Total_Assets) * 100 < 70`
*   **流動性**：近 20 日平均成交金額 > 5,000 萬台幣。
    *   *Pseudo-code*: `SMA(Volume, 20) * Close_Price > 50000000`

---

## 2. 成長與價值評分模型 (Growth & Value Scoring)
符合上述過濾條件的股票，將進入此評分系統 (滿分 100 分)。系統將依據以下權重計算各股的基本面「健康度」與「爆發力」。

**A. 成長動能 (權重 50%)**
*   **營收強勁成長 (25%)**：
    *   *Formula*: `YoY = (Current_3M_Revenue - Last_Year_3M_Revenue) / Last_Year_3M_Revenue * 100`
    *   近 3 個月累計營收 年增率 (YoY) > 15%。 (給 25 分)
    *   若 YoY 介於 5%~15%。 (給 10 分)
*   **獲利三率三升 (25%)**：
    *   *Conditions*: `(EPS_latest_Q > EPS_prev_Q * 1.1) AND (EPS_latest_Q > EPS_same_Q_last_year * 1.1)`
    *   最新一季 EPS 季增率 (QoQ) > 10% 且 EPS 年增率 (YoY) > 10%。 (雙成長，給 25 分)

**B. 獲利品質 (權重 30%)**
*   **股東權益報酬率 (15%)**：
    *   *Formula*: `ROE_Annualized = (Net_Income_latest_Q / Shareholder_Equity) * 4 * 100`
    *   近一季 ROE (年化) > 15%。 (給 15 分)
*   **毛利率趨勢 (15%)**：
    *   *Condition*: `Gross_Margin_latest_Q > Gross_Margin_prev_Q`
    *   最新一季毛利率 > 前一季毛利率 (給 15 分)

**C. 價值評價 (權重 20%)**
*   **本益比位階 (10%)**：
    *   *Formula*: `PE_Ratio = Close_Price / sum(EPS_latest_4_Qs)`
    *   PE (本益比) < 15 倍。 (給 10 分)
*   **防禦性殖利率 (10%)**：
    *   *Formula*: `Avg_Dividend_Yield_3Y = average(yield_Y1, yield_Y2, yield_Y3)`
    *   近三年平均 現金殖利率 > 5%。 (給 10 分)

---

## 3. 開發實作規範 (給 AI / 工程師的指示)
*   **防呆機制**：資料缺失 (NaN/Null 或尚未公佈財報) 時，該項指標分數以 0 計算，不可拋出 Error 導致系統崩潰。
*   **模組化 (Pure Functions)**：實作 `calculateFundamentalScore(stockData)` 時，應保持功能單一純粹，回傳結構為 `{ totalScore: Number, details: { growth, quality, value }, warnings: [] }`。
*   **視覺化 (UI)**：對於總得分高度優良（例如總分 > 80）的標的，前端應透過 UI 以醒目的顏色（如深綠色）高亮標示。
