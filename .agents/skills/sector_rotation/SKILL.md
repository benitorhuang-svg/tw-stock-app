---
name: sector_rotation
description: 台股產業輪動分析模型，追蹤資金在不同產業板塊間的流動，捕捉領漲/落後產業轉換時機。
---

# 產業輪動分析模型 (Sector Rotation Model)

台股的漲跌從來不是「全面齊漲齊跌」，而是資金在不同產業板塊間輪動。當半導體族群漲到過熱時，資金會流出轉往金融、傳產或生技。掌握輪動節奏，等於掌握「下一個主流」。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| 產業每日統計 | `sector_daily` | `sector`, `avg_change_pct`, `total_turnover`, `up_count`, `down_count` | 每日 (ETL) |
| 產業估值 | `sector_daily` | `avg_pe`, `avg_pb`, `avg_yield` | 每日 (ETL) |
| 產業龍頭表現 | `sector_daily` | `top_gainer_symbol`, `top_gainer_pct` | 每日 (ETL) |
| 個股產業歸屬 | `stocks` / `latest_prices` | `sector` | 靜態 (週更) |
| 產業內個股排行 | `latest_prices` | `sector`, `change_pct`, `volume`, `foreign_inv` | 每日 |
| 法人產業偏好 | `chips` + `latest_prices` | `foreign_inv`, `invest_trust` 依 `sector` 分群 | 每日 |
| 市場寬度 (對照) | `market_breadth_history` | `ma20_breadth` | 每日 |

---

## 1. 產業動能排行 (Sector Momentum Ranking)

### 1A. 短天期動能 (1~5 日)

```sql
-- 近 5 日各產業平均漲跌幅排行
SELECT sector,
       AVG(avg_change_pct) AS momentum_5d,
       SUM(total_turnover) AS turnover_5d,
       AVG(up_count * 1.0 / NULLIF(up_count + down_count, 0)) * 100 AS breadth_pct
FROM sector_daily
WHERE date >= (SELECT date FROM sector_daily GROUP BY date ORDER BY date DESC LIMIT 1 OFFSET 4)
GROUP BY sector
ORDER BY momentum_5d DESC;
```

### 1B. 中天期動能 (20 日)

```sql
-- 近 20 日各產業累計動能 (月度趨勢)
SELECT sector,
       AVG(avg_change_pct) AS momentum_20d,
       SUM(total_turnover) AS turnover_20d
FROM sector_daily
WHERE date >= date('now', '-30 days')
GROUP BY sector
ORDER BY momentum_20d DESC;
```

### 1C. 產業相對強弱分數 (Relative Strength)

```sql
-- 產業相對大盤的超額報酬
WITH market_avg AS (
  SELECT date, AVG(avg_change_pct) AS market_return
  FROM sector_daily
  GROUP BY date
)
SELECT sd.sector,
       AVG(sd.avg_change_pct - ma.market_return) AS excess_return_20d
FROM sector_daily sd
JOIN market_avg ma ON sd.date = ma.date
WHERE sd.date >= date('now', '-30 days')
GROUP BY sd.sector
ORDER BY excess_return_20d DESC;
```

---

## 2. 輪動偵測邏輯 (Rotation Detection)

### 2A. 領漲 → 落後轉換偵測

```sql
-- 比較近 5 日 vs 前 20 日的產業排名變化
WITH recent AS (
  SELECT sector, AVG(avg_change_pct) AS recent_5d
  FROM sector_daily
  WHERE date >= date('now', '-7 days')
  GROUP BY sector
),
longer AS (
  SELECT sector, AVG(avg_change_pct) AS prev_20d
  FROM sector_daily
  WHERE date BETWEEN date('now', '-30 days') AND date('now', '-7 days')
  GROUP BY sector
)
SELECT r.sector,
       r.recent_5d,
       l.prev_20d,
       r.recent_5d - l.prev_20d AS momentum_shift,
       CASE WHEN r.recent_5d > 0 AND l.prev_20d < 0 THEN '🔄 翻多轉強'
            WHEN r.recent_5d < 0 AND l.prev_20d > 0 THEN '⚠️ 翻空轉弱'
            WHEN r.recent_5d > l.prev_20d THEN '📈 加速上攻'
            ELSE '📉 動能衰退'
       END AS rotation_signal
FROM recent r
JOIN longer l ON r.sector = l.sector
ORDER BY momentum_shift DESC;
```

### 2B. 資金流向偵測 (法人產業偏好)

```sql
-- 法人資金今日流入哪些產業
SELECT lp.sector,
       SUM(lp.foreign_inv) AS sector_foreign_net,
       SUM(lp.invest_trust) AS sector_trust_net,
       SUM(lp.dealer) AS sector_dealer_net,
       COUNT(*) AS stock_count
FROM latest_prices lp
WHERE lp.sector IS NOT NULL
GROUP BY lp.sector
ORDER BY sector_foreign_net DESC;
```

---

## 3. 產業估值比較 (Sector Valuation)

```sql
-- 各產業最新估值水位
SELECT sector, avg_pe, avg_pb, avg_yield, stock_count,
       CASE WHEN avg_pe < 12 AND avg_yield > 5 THEN '📗 低估'
            WHEN avg_pe > 25 AND avg_yield < 2 THEN '📕 高估'
            ELSE '📘 合理'
       END AS valuation_zone
FROM sector_daily
WHERE date = (SELECT MAX(date) FROM sector_daily)
ORDER BY avg_pe ASC;
```

### 產業估值歷史趨勢

```sql
-- 追蹤特定產業的 PE/PB 走勢 (判斷產業循環位置)
SELECT date, avg_pe, avg_pb, avg_yield
FROM sector_daily
WHERE sector = '半導體業'
ORDER BY date DESC
LIMIT 120;  -- 約半年
```

---

## 4. 輪動策略規則 (Trading Rules)

| 信號 | 條件 | 動作 |
|------|------|------|
| 產業翻多 | 5日動能 > 0 且 前20日動能 < 0 | 從該產業龍頭中篩選技術面達標的個股 |
| 資金集中 | 外資 + 投信該產業淨買超 > 全市場前 3 名 | 加碼該產業觀察池中的標的 |
| 產業過熱 | 5日動能 > 3% 且 avg_pe > 行業歷史 80 百分位 | 停止新買進，開始尋找下一個輪動目標 |
| 產業崩跌 | 5日動能 < -5% 且 breadth < 20% | 不抄底 (刀口舔血); 等 breadth > 40% 再觀察 |
| 低估反轉 | avg_pe < 行業歷史 20 百分位 且 外資連買 ≥ 3 日 | 逢低布局候選 (搭配 `fundamental_analysis` 篩選) |

---

## 5. 與其他模型整合

```
market_breadth_analysis  →  判定大盤環境 (紅/綠/黃/藍燈)
         ↓
sector_rotation          →  在綠燈下找出「當前主流產業」
         ↓
fundamental_analysis     →  從主流產業中篩出體質好的個股
         ↓
technical_analysis       →  從好股票中找出「今天可以買」的進場時機
         ↓
risk_management          →  算出買幾張、停損設在哪
```

---

## 6. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 最新漲跌 (含 sector) | `GET /api/market/latest` | 依產業分群統計 |
| 歷史市場寬度 | `GET /api/market/breadth-timeseries` | 搭配產業輪動確認趨勢 |
| 法人連買排行 | `GET /api/market/institutional-streak` | 判斷法人資金偏好 |
| 個股 K 線 | `GET /api/prices/{symbol}` | 產業龍頭技術圖 |

---

## 7. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/etl/generate-all-features.mjs` | `sector_daily` | 每日聚合各產業: 漲跌家數、平均漲幅、成交量、估值 |
| `scripts/fetch-stock-list.mjs` | `stocks.sector` | 產業分類基底 (從 TWSE 抓取) |

---

## 8. 已知資料缺口與補充建議

| 缺口 | 影響 | 補充方案 |
|------|------|---------|
| 產業分類過粗 | TWSE 官方分類約 30 類（依交易所調整），部分混雜 | 可建立自訂 `sub_sector` 映射表 (如「AI 伺服器」、「車用電子」) |
| 產業指數不存在 | 無法畫產業指數 K 線圖 | 可在 ETL 計算加權平均價格指數，存入新表 `sector_index_history` |
| 產業間資金流量 | 只有「淨買超」無法看出流入/流出對比 | 需追蹤每日 turnover 的時間序列變化率 |
| 全球產業連動 | 缺少費半指數 (SOX)、MSCI 等國際參考 | 可從 Yahoo Finance 抓取 SOX/SOXX 每日收盤作為半導體外部參照 |
