---
name: fundamental_analysis
description: 台股基本面量化選股與評分模型，著重於財報數據、獲利能力與價值評估。
---

# 基本面分析模型 (Fundamental Analysis Model)

本模型定義了基本面過濾與評分的邏輯。在進行程式化選股或資料轉化 (Transform) 時，請將這些規則撰寫為過濾器與計算函數。

---

## 資料庫對照表 (Database Mapping)

本模型所需數據來自以下 `stocks.db` 資料表：

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| EPS (每股盈餘) | `fundamentals` | `eps`, `year`, `quarter` | 季度 |
| 毛利率 / 營業利益率 / 淨利率 | `fundamentals` | `gross_margin`, `operating_margin`, `net_margin` | 季度 |
| 營收 YoY | `monthly_revenue` | `revenue`, `last_year_revenue`, `revenue_yoy`, `cumulative_yoy` | 月度 |
| 本益比 / 股價淨值比 / 殖利率 | `valuation_history` | `pe`, `pb`, `dividend_yield` | 月度 (25 日) |
| 股利歷史 | `dividends` | `dividend`, `ex_dividend_date`, `year` | 季度 |
| 負債比率 | `fundamentals` | `debt_ratio` | 季度 |
| 最新快照 (含 PE/PB/Yield) | `latest_prices` | `pe`, `pb`, `yield`, `eps`, `gross_margin`, `revenue_yoy`, `debt_ratio` | 每日 |

### 快照層捷徑

`latest_prices` 表已將基本面數據預計算匯入，適合高頻篩選：
```sql
SELECT symbol, close, pe, pb, yield, eps, gross_margin, revenue_yoy
FROM latest_prices
WHERE pe > 0 AND pe < 15 AND yield > 5
ORDER BY yield DESC;
```

---

## 1. 財報法醫過濾 (Forensic Filtering) - 剔除高風險標的
此階段為「絕對條件」，只要不符合，該股票即刻淘汰，不參與後續評分。

*   **獲利底線**：近四季 EPS 總和 > 0。
    ```sql
    -- 從 fundamentals 表取得近四季 EPS
    -- 注意: year 使用民國年曆 (ROC)，如 114 = 西元 2025、115 = 西元 2026
    SELECT symbol, SUM(eps) AS eps_ttm
    FROM (
      SELECT symbol, eps FROM fundamentals
      ORDER BY year DESC, quarter DESC
      LIMIT 4
    )
    GROUP BY symbol
    HAVING eps_ttm > 0;
    ```

*   **現金流檢視**：近一季「營業現金流」為正數。
    *   ⚠️ **資料缺口**：`fundamentals` 表目前未包含 `operating_cash_flow` 欄位。
    *   **補充方案**：需從 MOPS API `t187ap14` (資產負債表) 或 `t187ap17` (現金流量表) 額外抓取。
    *   *Fallback*：暫以「營業利益率 > 0」替代 → `operating_margin > 0`

*   **負債風險**：負債比率 < 70%。
    ```sql
    -- 從 fundamentals 表直接查詢 debt_ratio (已有欄位)
    -- 注意: fundamentals.year 使用民國年 (ROC)，如 114 = 西元 2025
    SELECT symbol FROM fundamentals
    WHERE year = (SELECT MAX(year) FROM fundamentals)
      AND quarter = (SELECT MAX(quarter) FROM fundamentals WHERE year = (SELECT MAX(year) FROM fundamentals))
      AND debt_ratio < 70;
    -- 或從快照層直接篩選:
    SELECT symbol FROM latest_prices WHERE debt_ratio < 70;
    ```

*   **流動性**：近 20 日平均成交金額 > 5,000 萬台幣。
    ```sql
    SELECT symbol, AVG(turnover) AS avg_turnover_20d
    FROM price_history
    WHERE date >= date('now', '-30 days')
    GROUP BY symbol
    HAVING avg_turnover_20d > 50000000;
    ```

---

## 2. 成長與價值評分模型 (Growth & Value Scoring)
符合上述過濾條件的股票，將進入此評分系統 (滿分 100 分)。

**A. 成長動能 (權重 50%)**

*   **營收強勁成長 (25%)**：
    ```sql
    -- 近 3 個月累計營收 YoY
    SELECT symbol,
           SUM(revenue) AS recent_3m,
           SUM(last_year_revenue) AS lastyear_3m,
           (SUM(revenue) - SUM(last_year_revenue)) * 100.0
             / NULLIF(SUM(last_year_revenue), 0) AS yoy_pct
    FROM monthly_revenue
    WHERE month >= strftime('%Y-%m', 'now', '-3 months')
    GROUP BY symbol
    HAVING yoy_pct > 15;  -- 給 25 分; 5~15% 給 10 分
    ```

*   **獲利三率三升 (25%)**：
    ```sql
    -- 最新一季 vs 前一季 & 去年同期
    WITH ranked AS (
      SELECT symbol, eps, year, quarter,
             LAG(eps) OVER (PARTITION BY symbol ORDER BY year, quarter) AS prev_eps,
             LAG(eps, 4) OVER (PARTITION BY symbol ORDER BY year, quarter) AS yoy_eps
      FROM fundamentals
    )
    SELECT symbol FROM ranked
    WHERE eps > prev_eps * 1.1     -- QoQ > 10%
      AND eps > yoy_eps * 1.1      -- YoY > 10%
    ORDER BY year DESC, quarter DESC;
    ```

**B. 獲利品質 (權重 30%)**

*   **股東權益報酬率 ROE (15%)**：
    *   ⚠️ **資料缺口**：`fundamentals` 表目前無 `net_income` 與 `shareholder_equity` 欄位。
    *   **補充方案**：需從 MOPS API `t187ap14` 新增 `total_equity` 欄位，或使用近似公式：
    ```
    ROE_approx = eps * 4 / (每股淨值)    -- 每股淨值 ≈ close / pb
    ROE_approx = eps * 4 * pb / close
    ```
    *   近一季 ROE (年化) > 15% → 給 15 分

*   **毛利率趨勢 (15%)**：
    ```sql
    WITH ranked AS (
      SELECT symbol, gross_margin,
             LAG(gross_margin) OVER (PARTITION BY symbol ORDER BY year, quarter) AS prev_gm
      FROM fundamentals
    )
    SELECT symbol FROM ranked
    WHERE gross_margin > prev_gm;  -- 毛利率季增 → 給 15 分
    ```

**C. 價值評價 (權重 20%)**

*   **本益比位階 (10%)**：
    ```sql
    SELECT symbol, pe FROM latest_prices
    WHERE pe > 0 AND pe < 15;  -- 給 10 分
    ```

*   **防禦性殖利率 (10%)**：
    ```sql
    -- 近三年平均殖利率
    SELECT symbol, AVG(dividend_yield) AS avg_yield_3y
    FROM valuation_history
    WHERE date >= date('now', '-3 years')
    GROUP BY symbol
    HAVING avg_yield_3y > 5.0;  -- 給 10 分
    ```

---

## 3. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 最新基本面快照 | `GET /api/market/latest` | 取得含 PE/PB/Yield 的漲跌排行 |
| 個股估值歷史 | `GET /api/stock/valuation?symbol=2330` | PE/PB/Yield 河流圖 (250日) |
| AI 基本面報告 | `GET /api/ai-report/{symbol}` | 含 fundamentals 章節的鑑識報告 |
| 營收數據 | `public/data/revenue.json` | 月營收 YoY 比較 |
| 財報數據 | `public/data/financials.json` | 季度 EPS、毛利率、負債比 |

---

## 4. ETL 依賴

| ETL 腳本 | 產出 | 說明 |
|----------|------|------|
| `scripts/fetch-financials.mjs` | `public/data/financials.json` | 從 MOPS t187ap06/14/17 抓取 EPS、三率、負債比 |
| `scripts/fetch-revenue.mjs` | `public/data/revenue.json` | 從 MOPS t187ap05 抓取月營收 |
| `scripts/fetch-valuation-history.mjs` | `public/data/valuation/{date}.json` | 從 TWSE BWIBBU_ALL 抓取 PE/PB/Yield |
| `scripts/etl/generate-all-features.mjs` | `valuation_features` 表 | 將最新估值寫入運算層 |
| `scripts/etl/migrate-to-analysis-tables.mjs` | `latest_prices` 表 (含基本面欄位) | 匯總至快照層 |

---

## 5. 已知資料缺口與補充建議

| 缺口 | 影響的評分項目 | 補充方案 |
|------|--------------|---------|
| ~~負債比率 (Debt Ratio)~~ | ~~財報法醫: 負債檢視~~ | ✅ 已修復：`fundamentals.debt_ratio` + `latest_prices.debt_ratio` 已由 ETL 寫入 |
| 營業現金流 (Operating Cash Flow) | 財報法醫: 現金流檢視 | 從 MOPS `t187ap17` 新增現金流量表抓取 |
| 股東權益 (Shareholder Equity) | 獲利品質: ROE 計算 | 從 MOPS `t187ap14` 新增總權益欄位 |
| 每股淨值 (Book Value Per Share) | ROE 近似計算 | 可從 `close / pb` 反推，或直接新增欄位 |
| ~~董監持股異動~~ | ~~高階內線信號~~ | ✅ 已有：`director_holdings` 表含 `insider_net_change`，可直接整合至評分 |

---

## 6. 開發實作規範 (給 AI / 工程師的指示)
*   **防呆機制**：資料缺失 (NaN/Null 或尚未公佈財報) 時，該項指標分數以 0 計算，不可拋出 Error 導致系統崩潰。
*   **模組化 (Pure Functions)**：實作 `calculateFundamentalScore(stockData)` 時，應保持功能單一純粹，回傳結構為 `{ totalScore: Number, details: { growth, quality, value }, warnings: [] }`。
*   **視覺化 (UI)**：對於總得分高度優良（例如總分 > 80）的標的，前端應透過 UI 以醒目的顏色（如深綠色）高亮標示。
*   **快照優先**：在前端展示列表/篩選時，優先查詢 `latest_prices` 快照表 (零 JOIN)，僅在深度分析頁面才查原始層。
