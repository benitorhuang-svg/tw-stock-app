---
name: day_trading_momentum
description: 台股當沖與隔日沖特化之極短線動能模型，聚焦於資金流速與日內價格波動。
---

# 當沖與隔日沖極短線動能模型 (Day Trading Momentum Model)

極短線交易 (Tick-level 或 1分/5分K) 與波段交易邏輯完全不同。在此模型中，基本面 (公司賺不賺錢) 的權重為 `0`。一切只看「日內籌碼」、「大單敲進」以及「價格慣性」。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 / API | 關鍵欄位 | 更新頻率 |
|----------|-------------|----------|----------|
| 日收盤行情 (盤前篩選) | `latest_prices` | `close`, `change_pct`, `volume`, `turnover` | 每日 |
| 昨日成交量排行 | `latest_prices` | `volume DESC`, `turnover DESC` | 每日 |
| 漲停/強勢股篩選 | `latest_prices` | `change_pct > 8` | 每日 |
| 即時盤中報價 | `GET /api/sse/stream` | SSE 推送 `lastPrice`, `volume` | 盤中即時 |
| 三大法人 (隔日沖指標) | `chips` | `foreign_inv`, `invest_trust`, `dealer` | 每日 |
| 融資融券 (散戶指標) | `margin_short` | `margin_net`, `short_net` | 每日 |
| 主力分點 (大單追蹤) | `major_broker_chips` | `buy_top5_shares`, `net_main_player_shares` | 每日 |
| 自營商避險/自營 | `dealer_details` | `prop_buy`, `hedge_buy` | 每日 |

### 盤前篩選速查 SQL
```sql
-- 昨日強勢股: 漲幅 > 8% 且成交金額 Top 50
SELECT symbol, close, change_pct, turnover, volume
FROM latest_prices
WHERE change_pct > 8
ORDER BY turnover DESC
LIMIT 50;

-- 隔日沖候選: 外資 + 投信昨日大買
SELECT lp.symbol, lp.close, lp.change_pct, lp.turnover,
       lp.foreign_inv, lp.invest_trust
FROM latest_prices lp
WHERE lp.change_pct > 5
  AND (lp.foreign_inv > 500 OR lp.invest_trust > 200)
ORDER BY lp.turnover DESC
LIMIT 20;
```

---

## 1. 盤前篩選 (Pre-Market Scanner) - 尋找獵物
當沖客不應在盤中亂找股票，必須在早上 8:50 前列出 5~10 檔「高度關注名單」。

*   **昨日強勢股 (隔日沖籌碼池)**：
    *   *Condition*: 昨日收盤漲停 (或漲幅 > 8%) 且 成交總金額排名全市場前 50。
    *   **DB 實作**:
    ```sql
    SELECT lp.symbol, lp.close, lp.change_pct, lp.turnover,
           c.foreign_inv, c.invest_trust, c.dealer
    FROM latest_prices lp
    LEFT JOIN chips c ON lp.symbol = c.symbol AND c.date = lp.date
    WHERE lp.change_pct >= 8
    ORDER BY lp.turnover DESC
    LIMIT 50;
    ```

*   **跳空開高缺口 (Gap Up)**：
    *   *Formula*: `Gap_Ratio = (今日開盤價 - 昨日收盤價) / 昨日收盤價 * 100`
    *   *Condition*: `Gap_Ratio > 2%` 且伴隨第一分鐘成交爆出昨日全天均量的 10%。
    *   ⚠️ **需即時資料**：此條件需從 `/api/sse/stream` 取得盤中開盤價並與昨收比較。

## 2. 日內動能觸發條件 (Intraday Actionable Signals)

**A. 開盤驅動 (Opening Drive)**
*   聚焦 09:00 ~ 09:30 的爆發期。
*   *觸發條件 (做多)*：開盤第一根 5 分K 為實體紅K，且帶大量。第二根 5 分K 突破第一根高點時，瞬間買進。
*   **資料需求**：需 1分/5分 K 線資料 → 目前系統僅有日 K (`price_history`)。

**B. VWAP 均價線策略 (Volume-Weighted Average Price)**
當沖最重要的生命線，法人與日拋大戶的基準成本。
*   *Formula*: `VWAP = Cumulative(Price * Volume) / Cumulative(Volume)` (從當日開盤起算)
*   *做多訊號 (Bounce)*：股價急跌至 VWAP 附近且爆量收長下影線。
*   *做空訊號 (Breakdown)*：股價跌破 VWAP 且連續 15 分鐘被壓制。
*   **資料需求**：需逐筆 Tick 資料 → SSE 串流 `/api/sse/stream` 提供即時價量。

**C. 大單追跡 (Tick Order Flow) - 進階條件**
*   *Condition*: 連續出現 5 筆以上的「外盤成交」，且單筆張數 > 50 張。
*   **資料來源**: `major_broker_chips.buy_top5_shares` 可提供盤後主力大單統計。盤中大單追蹤需外部 WebSocket。

---

## 3. 隔日沖專項分析 (Overnight Scalping Intelligence)

台股特有的隔日沖生態，可利用以下數據進行量化：

```sql
-- 隔日沖大戶偵測: 前日大買 + 今日反手賣出
WITH prev_day AS (
  SELECT symbol, date, foreign_inv + invest_trust + dealer AS total_buy
  FROM chips
  WHERE date = (SELECT MAX(date) FROM chips WHERE date < (SELECT MAX(date) FROM chips))
),
today AS (
  SELECT symbol, date, foreign_inv + invest_trust + dealer AS total_buy
  FROM chips
  WHERE date = (SELECT MAX(date) FROM chips)
)
SELECT p.symbol, p.total_buy AS prev_buy, t.total_buy AS today_buy,
       t.total_buy - p.total_buy AS reversal
FROM prev_day p
JOIN today t ON p.symbol = t.symbol
WHERE p.total_buy > 1000 AND t.total_buy < -500  -- 前日大買今日大賣 = 隔日沖
ORDER BY reversal ASC
LIMIT 20;
```

### 自營商避險 vs 自營分辨
```sql
-- dealer_details 區分: prop_buy (自營) vs hedge_buy (避險)
-- prop_buy 大增 → 真正做多; hedge_buy 大增 → 權證避險 (假買超)
SELECT dd.symbol, dd.prop_buy, dd.hedge_buy,
       CASE WHEN dd.prop_buy > dd.hedge_buy THEN '真多'
            ELSE '避險為主'
       END AS signal_type
FROM dealer_details dd
WHERE dd.date = (SELECT MAX(date) FROM dealer_details)
  AND (dd.prop_buy > 500 OR dd.hedge_buy > 500)
ORDER BY dd.prop_buy DESC;
```

---

## 4. 當沖極速風控 (Tick-Level Risk Management)
當沖的風控時間單位是「秒」與「分鐘」。

*   **停損條件 1**：買進後，跌破前一根 5分/1分K 的低點，立刻停損。
*   **停損條件 2 (時間停損)**：買進後 15 分鐘不漲 (動能消失)，強制平倉。
*   **絕對底線**：當日虧損達到總資金的 1% → 當日不再交易 (避免 Revenge Trading)。

---

## 5. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 即時報價串流 | `GET /api/sse/stream` | 盤中 VWAP 計算、開盤驅動偵測 |
| 漲跌排行 | `GET /api/market/latest` | 盤前篩選: 強勢股 + 成交量排行 |
| K 線歷史 | `GET /api/prices/{symbol}` | 圖表疊加 (日K + 均線) |
| 法人籌碼 | `GET /api/market/institutional-streak` | 隔日沖大戶偵測 |

---

## 6. 已知資料缺口與補充建議

| 缺口 | 影響 | 優先級 | 補充方案 |
|------|------|--------|---------|
| 分鐘 K 線資料 (1min/5min) | 開盤驅動、日內趨勢不可回測 | 🔴 高 | 接入 WebSocket 即時報價源 (如富邦/元大 API)，或從 SSE 累積存入新表 `intraday_kline` |
| VWAP | 當沖最核心指標不可計算 | 🔴 高 | 需逐筆 Tick 資料; 暫可用 `turnover / volume` 從日資料近似 |
| 逐筆成交明細 (Tick) | 大單追蹤無法實現 | 🟡 中 | 需外部付費資料源 (如 XQ, 嘉實) |
| 當日沖銷標記 | 無法追蹤當沖比例 | 🟡 中 | 證交所公布「當日沖銷交易標的及成交量值」可抓取 |
| ~~權證連動~~ | ~~自營商避險真偽判斷~~ | ~~🟢 低~~ | ✅ 部分已有：`dealer_details` 含 `prop_buy`/`hedge_buy`，可區分自營真多 vs 避險 |

---

## 7. 開發實作規範 (給 AI / 工程師的指示)
*   **資料頻率 (Data Frequency)**：此模型若要程式實作，必須接取即時報價，而非每日盤後資料。目前 `/api/sse/stream` 已提供盤中 Tick 推送，可作為基礎。
*   **VWAP 近似值 (日頻)**：在沒有逐筆 Tick 的情況下，可用 `VWAP_approx = turnover / (volume * 1000)` 從日成交金額近似。
*   **圖表視覺化 (Charting)**：若開發 `IntradayChart` UI，必須包含 K 線、Tick 成交量以及 VWAP 均價線疊加。
*   **SSE 整合**：盤中監控應訂閱 `/api/sse/stream`，由 Web Worker 即時比對觸發條件，達標時透過 Notification API 推送警示。
