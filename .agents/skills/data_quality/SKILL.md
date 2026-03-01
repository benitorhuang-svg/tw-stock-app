---
name: data_quality
description: 台股多源數據品質管理模型，定義資料驗證、缺值偵測、跨源比對與修復策略。
---

# 資料品質管理模型 (Data Quality & Reconciliation Model)

量化系統的產出品質取決於輸入資料的正確性。本模型定義從 TWSE / MOPS / Yahoo / TDCC 等多源數據的品質規範、衝突解決規則與自動修復機制。

> *「Garbage In, Garbage Out」— 一筆錯誤的收盤價，可能讓 ATR 失真 → 停損計算錯誤 → 實際虧損放大。*

---

## 資料庫對照表 (Database Mapping)

| 品質檢查面向 | 資料表 | 檢查內容 | 頻率 |
|-------------|--------|---------|------|
| 股票清單完整性 | `stocks` | 是否涵蓋所有上市櫃 | 每週 |
| 價格合理性 | `price_history` | OHLCV 邏輯檢查、漲跌幅限制 | 每日 |
| 法人資料一致性 | `chips` | 三大法人加總 vs 個股合計 | 每日 |
| 融資券邏輯 | `margin_short` | 餘額 ≥ 0、增減合理 | 每日 |
| 財報時間點 | `fundamentals` | 季度完整、EPS 範圍 | 每季 |
| 營收連續性 | `monthly_revenue` | 無斷月、YoY 可算 | 每月 |
| 估值合理性 | `valuation_history` | PE > 0、PB > 0 | 每月 |
| 快照一致性 | `latest_prices` | 快照日期 = 最新交易日 | 每日 |
| 日期格式一致性 | `chips`, `institutional_trend`, `institutional_snapshot` | 新舊格式混合 (`20260226` vs `2026-02-26`) | 每日 |
| 年度格式 | `fundamentals` | `year` 使用民國年 (ROC)，114 = 2025 | 每季 |

---

## 1. 資料完整性檢查 (Completeness Check)

### 1A. 股票清單 vs 實際資料

```sql
-- 有 stocks 記錄但無 price_history 的「幽靈股」
SELECT s.symbol, s.name, s.market
FROM stocks s
LEFT JOIN price_history ph ON s.symbol = ph.symbol
WHERE ph.symbol IS NULL;

-- 有 price_history 但無 stocks 記錄的「孤兒交易」
SELECT DISTINCT ph.symbol
FROM price_history ph
LEFT JOIN stocks s ON ph.symbol = s.symbol
WHERE s.symbol IS NULL;
```

### 1B. 時間序列斷裂偵測

```sql
-- 偵測 price_history 中超過 5 個交易日的斷裂 (排除假日)
WITH gaps AS (
  SELECT symbol, date,
         LAG(date) OVER (PARTITION BY symbol ORDER BY date) AS prev_date,
         julianday(date) - julianday(LAG(date) OVER (PARTITION BY symbol ORDER BY date)) AS gap_days
  FROM price_history
)
SELECT symbol, prev_date, date, gap_days
FROM gaps
WHERE gap_days > 7  -- > 7 天自然日 ≈ > 5 交易日
ORDER BY gap_days DESC
LIMIT 50;
```

### 1C. ETL 層資料同步檢查

```sql
-- daily_indicators 是否跟上 price_history 最新日期
SELECT 'price_history' AS layer, MAX(date) AS latest FROM price_history
UNION ALL
SELECT 'daily_indicators', MAX(date) FROM daily_indicators
UNION ALL
SELECT 'chips', MAX(date) FROM chips
UNION ALL
SELECT 'latest_prices', MAX(date) FROM latest_prices
UNION ALL
SELECT 'market_breadth', MAX(date) FROM market_breadth_history
UNION ALL
SELECT 'institutional_trend', MAX(date) FROM institutional_trend;
-- 所有層的最新日期應相同 (或差距 ≤ 1 日)
```

---

## 2. 資料合理性驗證 (Validity Check)

### 2A. 價格 OHLCV 邏輯規則

```sql
-- 違反 OHLCV 邏輯的異常記錄
SELECT symbol, date, open, high, low, close
FROM price_history
WHERE high < low                        -- 最高 < 最低 (不可能)
   OR high < open OR high < close       -- 最高應 ≥ 開/收
   OR low > open OR low > close         -- 最低應 ≤ 開/收
   OR close <= 0 OR volume < 0          -- 非正值
   OR change_pct > 11 OR change_pct < -11; -- 台股漲跌幅限制 ±10% (含例外)
```

### 2B. 日期格式一致性檢查

```sql
-- 偵測 chips 表中新舊日期格式混合 (20260226 vs 2026-02-26)
SELECT
  (SELECT COUNT(*) FROM chips WHERE date LIKE '____-__-__') AS iso_format_count,
  (SELECT COUNT(*) FROM chips WHERE date NOT LIKE '____-__-__') AS compact_format_count;
-- 若兩者都 > 0 → 日期格式不一致，需正規化

-- 同樣檢查 institutional_trend 與 institutional_snapshot
SELECT 'institutional_trend' AS tbl,
  SUM(CASE WHEN date LIKE '____-__-__' THEN 1 ELSE 0 END) AS iso,
  SUM(CASE WHEN date NOT LIKE '____-__-__' THEN 1 ELSE 0 END) AS compact
FROM institutional_trend
UNION ALL
SELECT 'institutional_snapshot',
  SUM(CASE WHEN date LIKE '____-__-__' THEN 1 ELSE 0 END),
  SUM(CASE WHEN date NOT LIKE '____-__-__' THEN 1 ELSE 0 END)
FROM institutional_snapshot;
```

### 2C. 法人資料交叉驗證

```sql
-- chips 三大法人合計 vs institutional_trend 全市場匯總
WITH daily_sum AS (
  SELECT date, SUM(foreign_inv) AS sum_foreign,
         SUM(invest_trust) AS sum_trust,
         SUM(dealer) AS sum_dealer
  FROM chips
  WHERE date = (SELECT MAX(date) FROM chips)
  GROUP BY date
)
SELECT ds.date,
       ds.sum_foreign, it.total_foreign,
       ABS(ds.sum_foreign - it.total_foreign) AS foreign_diff,
       ds.sum_trust, it.total_trust,
       ABS(ds.sum_trust - it.total_trust) AS trust_diff
FROM daily_sum ds
JOIN institutional_trend it ON ds.date = it.date;
-- diff 應趨近 0; 若差距 > 10% 則觸發警報
```

### 2C. 融資券邏輯驗證

```sql
-- 融資/融券餘額不得為負
SELECT symbol, date, margin_bal, short_bal
FROM margin_short
WHERE margin_bal < 0 OR short_bal < 0;

-- 融資增減 vs 餘額變動一致性
WITH ordered AS (
  SELECT symbol, date, margin_bal, margin_net,
         LAG(margin_bal) OVER (PARTITION BY symbol ORDER BY date) AS prev_bal
  FROM margin_short
)
SELECT symbol, date, prev_bal, margin_net, margin_bal,
       margin_bal - prev_bal AS actual_change
FROM ordered
WHERE prev_bal IS NOT NULL
  AND ABS((margin_bal - prev_bal) - margin_net) > 1; -- 容差 1 張
```

---

## 3. 多源資料衝突解決 (Cross-Source Reconciliation)

### 優先級規則

| 資料類型 | 主要來源 (優先) | 備援來源 | 衝突處理 |
|----------|---------------|---------|---------|
| 每日收盤價 | TWSE OpenAPI | Yahoo Finance | 以 TWSE 為準 (官方交易所) |
| 歷史股價 (> 1 年) | Yahoo Finance | 無 | Yahoo 是唯一長期來源 |
| 三大法人 | TWSE T86 報表 | 無 | 唯一來源 |
| 月營收 | MOPS t187ap05 | 無 | 唯一來源 |
| PE / PB / 殖利率 | TWSE BWIBBU_ALL | Yahoo Finance summary | 以 TWSE 為準 |
| 股價淨值比 (PB) | TWSE BWIBBU_ALL | `close / (eps_ttm / roe)` 反推 | 計算值僅作參考 |

### 自動修復規則

```typescript
// 收盤價衝突: TWSE vs Yahoo
function reconcilePrice(twse: number | null, yahoo: number | null): number | null {
  if (twse != null && yahoo != null) {
    const diff = Math.abs(twse - yahoo) / twse;
    if (diff > 0.02) {
      console.warn(`Price conflict: TWSE=${twse}, Yahoo=${yahoo}, diff=${(diff*100).toFixed(1)}%`);
      return twse; // 以 TWSE 官方為準
    }
  }
  return twse ?? yahoo ?? null; // TWSE 優先, Yahoo 備援
}
```

---

## 4. 資料缺值處理策略 (Missing Data Strategy)

| 缺值類型 | 處理方式 | 範例 |
|----------|---------|------|
| price_history 單日缺漏 | 標記 gap，不插值 | 停牌/停止交易日不應有記錄 |
| chips 某股票缺日 | 以 0 填入 (法人未交易) | `foreign_inv = 0` |
| fundamentals 季度延遲 | 使用前一季數據（標記 `stale`） | Q4 財報 3 月才公布 |
| monthly_revenue 延遲 | 等待，不以 0 填入 | 營收通常 10 日內公布 |
| valuation_history 斷月 | 線性內插 (PE/PB) | 月頻資料偶有缺失 |
| daily_indicators 缺值 | ETL 跳過該日 (warmup 期) | MA120 需 120 日熱身 |

### NULL 安全查詢原則

```sql
-- 所有涉及除法的查詢都必須用 NULLIF 防除零
SELECT symbol,
       ROUND(pe / NULLIF(pb, 0), 2) AS pe_pb_ratio,
       ROUND(short_bal * 100.0 / NULLIF(margin_bal, 0), 1) AS short_margin_ratio
FROM latest_prices
WHERE pe IS NOT NULL AND pe > 0;
```

---

## 5. 健康檢查排程 (Health Check Schedule)

| 時機 | 檢查項目 | 動作 |
|------|---------|------|
| 每日盤後 ETL 完成後 | 1A 完整性 + 2A 價格邏輯 + 1C 同步檢查 | 寫入異常日誌；異常 > 10 檔則停止下游 ETL |
| 每週六 | 1B 時間斷裂 + stocks 清單比對 | 自動補抓缺失資料 |
| 每月 10 日後 | 營收完整性 (上月全部到齊) | 標記未到齊的股票 |
| 每季財報季 | fundamentals 新增筆數 vs 預期 | 統計新增率，低於 80% 則警報 |
| DB 啟動時 | `PRAGMA integrity_check` | WAL/SHM 完整性；失敗則切換至備援 DB |

### 健康檢查 SQL 腳本

```sql
-- 快速健康總覽
SELECT
  (SELECT COUNT(*) FROM stocks) AS total_stocks,
  (SELECT COUNT(DISTINCT symbol) FROM price_history) AS stocks_with_prices,
  (SELECT MAX(date) FROM price_history) AS latest_price_date,
  (SELECT MAX(date) FROM chips) AS latest_chips_date,
  (SELECT MAX(date) FROM daily_indicators) AS latest_indicators_date,
  (SELECT COUNT(*) FROM latest_prices WHERE date = (SELECT MAX(date) FROM price_history)) AS snapshot_count;
```

---

## 6. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| DB 統計概覽 | `GET /api/db/stats` | 各表筆數、最新日期、完整度 |
| 健康檢查 | `GET /api/db/health` | 跑全套驗證規則，回傳異常列表 |

---

## 7. ETL 依賴

| ETL 腳本 | 品質關聯 | 說明 |
|----------|---------|------|
| `scripts/db-health-check.mjs` | 資料庫完整性 | PRAGMA 檢查 + 表筆數統計 |
| `scripts/fetch-stock-list.mjs` | 1A 完整性 | 更新 stocks 表，偵測新上市/下市 |
| 所有 `fetch-*.mjs` | 原始層品質 | 建議在每個 fetcher 加入寫入後驗證 |
| `scripts/etl/migrate-to-analysis-tables.mjs` | 1C 同步 | 確保聚合/快照層與原始層同步 |

---

## 8. 已知資料缺口與補充建議

| 缺口 | 影響 | 補充方案 |
|------|------|---------|
| 無資料異常日誌表 | 品質問題無法追蹤 | 建議新增 `data_quality_log` 表: `{check_type, date, symbol, issue, severity}` |
| 下市股票偵測 | 生存者偏差 (影響回測) | `stocks` 加 `delisted_date` 欄位 |
| WAL/SHM 殘留 | DB malformed 風險 | 啟動時自動清理 stale WAL；已記錄於 user memory |
| 資料源可用性監控 | TWSE/MOPS 偶爾維護 | fetcher 加入 HTTP 狀態碼檢查 + 重試 + 降級通知 |
| ~~日期格式不一致~~ | ~~`chips` / `institutional_*` 混合新舊格式~~ | ✅ 已修復：`build-sqlite-db.js` 重建時 `normalizeDate()` 統一為 `YYYY-MM-DD`；`generate-all-features.mjs` 在 ETL 啟動時亦會正規化 chips 殘留 compact 日期 |
| ~~latest_prices 缺 OTC~~ | ~~上櫃股 987 檔未納入快照~~ | ✅ 已修復：`fetch-yahoo.mjs` 支援 `.TWO` 後綴拉取 OTC，`fetch-chips.mjs` 亦已擴展 TPEx |

---

## 9. 開發實作規範 (給 AI / 工程師的指示)

*   **防禦性查詢**：所有涉及除法、聚合的 SQL 必須使用 `NULLIF`, `COALESCE`, `HAVING COUNT(*) > 0` 防護。
*   **ETL 驗證鉤子**：每個 fetcher 寫入 DB 後，應立即執行最小驗證 (筆數 > 0, 日期合理)。
*   **WAL 處理**：開啟 DB 時檢查 `.db-wal` / `.db-shm` 時間戳；若與 `.db` 不一致超過 24 小時，視為 stale 並刪除後重開。
*   **PRAGMA 檢查**：啟動時執行 `PRAGMA integrity_check`，失敗則 fallback 至 `public/data/stocks.db`。
*   **冪等性**：所有 ETL 操作應為冪等 (使用 `INSERT OR REPLACE`)，重跑不產生副作用。
