---
name: market_breadth_analysis
description: 台股大盤與整體市場寬度情緒評估模型，用以判斷系統性風險與絕佳買點。
---

# 市場寬度分析模型 (Market Breadth Analysis Model)

市場寬度（Market Breadth）主要用來衡量「大盤上漲/下跌的真實健康度」。有時指數在上漲（如靠台積電拉抬），但實際上多數股票在跌，這就是「長線空頭前的虛漲」。本模型作為所有交易策略的**「總開關與大閘門」**。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| 漲跌家數 | `market_breadth_history` | `up_count`, `down_count`, `flat_count` | 每日 (ETL) |
| TRIN 指標 | `market_breadth_history` | `trin` | 每日 (ETL) |
| MA 寬度 (站上均線 %) | `market_breadth_history` | `ma5_breadth`, `ma20_breadth`, `ma60_breadth`, `ma120_breadth` | 每日 (ETL) |
| 漲跌成交量 | `market_breadth_history` | `up_volume`, `down_volume`, `up_turnover`, `down_turnover` | 每日 (ETL) |
| 全市場股數 | `market_breadth_history` | `total_stocks` | 每日 |
| 法人市場趨勢 | `institutional_trend` | `total_foreign`, `total_trust`, `total_dealer`, `total_net` | 每日 |
| 產業板塊強弱 | `sector_daily` | `avg_change_pct`, `up_count`, `down_count`, `total_turnover` | 每日 |
| 個股均線位置 | `daily_indicators` | `ma5`, `ma20`, `ma60`, `ma120` | 每日 (ETL) |
| 個股價格 | `price_history` | `close`, `volume` | 每日 |

---

## 1. 核心指標量化邏輯 (Mathematical Definition)

**A. 均線寬度指標 (Moving Average Breadth)** — ✅ 已由 ETL 預計算
計算全市場（上市+上櫃，約 2,275 檔股票）中，股價站上特定均線的「比例」。

*   *Formula*: `Breadth_20MA_Ratio = (收盤價 > 20MA 的股票檔數) / (總檔數) * 100`
*   *Formula*: `Breadth_60MA_Ratio = (收盤價 > 60MA 的股票檔數) / (總檔數) * 100`

```sql
-- 直接從聚合層讀取 (ETL 已預計算，零運算成本)
SELECT date, ma20_breadth, ma60_breadth, ma120_breadth, total_stocks
FROM market_breadth_history
ORDER BY date DESC
LIMIT 150;
```

**B. 騰落指標 (Advance-Decline Line, ADL)** — ⚠️ 需從原始數據累計
*   *Formula*: `Net_Advances_today = up_count - down_count`
*   *Formula*: `ADL_today = ADL_yesterday + Net_Advances_today`

```sql
-- ADL 需要以 Window Function 累計
SELECT date,
       up_count - down_count AS net_advances,
       SUM(up_count - down_count) OVER (ORDER BY date) AS adl
FROM market_breadth_history
ORDER BY date DESC
LIMIT 150;
```

**C. TRIN 指標 (Arms Index)** — ✅ 已由 ETL 預計算
```sql
-- TRIN = (Up Count / Down Count) / (Up Volume / Down Volume)
-- TRIN < 1.0 → 多方力道較強; TRIN > 1.0 → 空方力道較強
SELECT date, trin,
       CASE WHEN trin < 0.8 THEN '極度多頭'
            WHEN trin < 1.0 THEN '多頭'
            WHEN trin < 1.2 THEN '空頭'
            ELSE '極度空頭'
       END AS trin_regime
FROM market_breadth_history
ORDER BY date DESC
LIMIT 30;
```

**D. 法人資金流向 (Institutional Money Flow)** — ✅ `institutional_trend` 表
```sql
-- 法人趨勢：全市場三大法人每日匯總
SELECT date, total_foreign, total_trust, total_dealer, total_net,
       buy_count, sell_count,
       avg_change_pct
FROM institutional_trend
ORDER BY date DESC
LIMIT 60;
```

**E. 產業板塊相對強弱 (Sector Rotation)** — ✅ `sector_daily` 表
```sql
-- 今日各產業表現排行
SELECT sector, avg_change_pct, up_count, down_count,
       total_turnover, top_gainer_symbol, top_gainer_pct,
       avg_pe, avg_pb, avg_yield
FROM sector_daily
WHERE date = (SELECT MAX(date) FROM sector_daily)
ORDER BY avg_change_pct DESC;
```

---

## 2. 系統狀態判定規則 (Regime Identification)

透過上述指標，將市場狀態分為四個燈號：

*   🟢 **綠燈 (健康多頭)**：
    ```sql
    SELECT date, 'GREEN' AS regime FROM market_breadth_history
    WHERE ma20_breadth > 50
      AND date = (SELECT MAX(date) FROM market_breadth_history);
    -- 搭配 ADL 確認: ADL > SMA(ADL, 20) (需額外計算)
    ```
    *Action*：火力全開，買進訊號全數放行，允許滿倉操作。

*   🟡 **黃燈 (過熱或拉回)**：
    ```sql
    SELECT date, 'YELLOW' AS regime FROM market_breadth_history
    WHERE ma20_breadth > 85
      AND date = (SELECT MAX(date) FROM market_breadth_history);
    ```
    *Action*：停止買進新的多單，收緊停利條件。

*   🔴 **紅燈 (系統性空頭)**：
    ```sql
    SELECT date, 'RED' AS regime FROM market_breadth_history
    WHERE ma60_breadth < 30
      AND date = (SELECT MAX(date) FROM market_breadth_history);
    ```
    *Action*：大閘門鎖死。所有買進訊號宣告無效，持股降至 30% 以下。

*   🔵 **藍燈 (絕望極度超賣 - 黃金買點)**：
    ```sql
    SELECT date, 'BLUE' AS regime FROM market_breadth_history
    WHERE ma20_breadth < 10
      AND date = (SELECT MAX(date) FROM market_breadth_history);
    ```
    *Action*：準備抄底模式，等出現首根帶量紅K進場。

### 綜合燈號判定函數
```typescript
function determineMarketRegime(breadth: {
  ma20_breadth: number;
  ma60_breadth: number;
  trin: number;
}): 'GREEN' | 'YELLOW' | 'RED' | 'BLUE' {
  if (breadth.ma20_breadth < 10) return 'BLUE';   // 極度超賣
  if (breadth.ma60_breadth < 30) return 'RED';     // 系統性空頭
  if (breadth.ma20_breadth > 85) return 'YELLOW';  // 過熱
  if (breadth.ma20_breadth > 50) return 'GREEN';   // 健康多頭
  return 'YELLOW'; // 其他情況偏謹慎
}
```

---

## 3. API 端點對照

| 功能 | API 路由 | 回傳格式 | 快取 |
|------|---------|---------|------|
| 寬度時間序列 | `GET /api/market/breadth-timeseries` | `[{date, up, down, flat, trin, ma5_breadth, ...}]` | 3600s |
| TRIN 時間序列 | `GET /api/market/trin-timeseries` | `[{date, trin}]` | 3600s |
| 月曆漲跌比 | `GET /api/market/monthly-ratios?year=2026&month=3` | `{date: {up, down, total}}` | 3600s |
| 法人連買排行 | `GET /api/market/institutional-streak` | `[{symbol, foreign_streak, invest_streak, ...}]` | 3600s |
| 最新漲跌排行 | `GET /api/market/latest` | `{gainers: [], losers: []}` | 60s |

---

## 4. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/etl/migrate-to-analysis-tables.mjs` | `market_breadth_history` | 每日計算 TRIN、MA Breadth %、漲跌分佈 |
| `scripts/etl/migrate-to-analysis-tables.mjs` | `daily_indicators` | 計算每檔 MA/RSI/MACD/KD (breadth 的基底) |
| `scripts/etl/generate-all-features.mjs` | `institutional_trend`, `sector_daily` | 聚合法人趨勢與產業板塊統計 |

---

## 5. 已知資料缺口與補充建議

| 缺口 | 影響 | 狀態 |
|------|------|------|
| ~~ADL (騰落線) 未預計算~~ | ~~需前端或 API 層即時累計~~ | ✅ 已修復：`market_breadth_history.adl` 欄位由 ETL 自動累計 |
| ~~加權指數收盤價未入庫~~ | ~~無法判斷「指數跌破季線」~~ | ✅ 已修復：`market_index` 表存放 TAIEX 5年歷史 OHLCV (Yahoo ^TWII) |
| 融資融券全市場匯總 | 散戶信心指標缺失 | 建議在 `market_breadth_history` 新增 `total_margin_net`, `total_short_net` 欄位 |
| 新高新低家數 (New High/Low) | 市況確認指標 | 建議新增 `new_52w_high_count`, `new_52w_low_count` 欄位 |

---

## 6. 開發實作規範 (給 AI / 工程師的指示)
*   **資料緩存 (Caching)**：`market_breadth_history` 已由 ETL 盤後計算，前端透過 `/api/market/breadth-timeseries` 即可取得 150 日時間序列，回應 < 50ms。
*   **UI 呈現**：在 Dashboard 最頂層（Sidebar 最上方），呈現市場寬度燈號與溫度計（0-100%）。DashboardController 已有此設計。
*   **零 JOIN 原則**：前端查詢一律走聚合層 (`market_breadth_history`) 或快照層 (`latest_prices`)，禁止在 API 中對 `price_history` 做全表 GROUP BY。
