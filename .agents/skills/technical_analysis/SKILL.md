---
name: technical_analysis
description: 台股技術面與籌碼面量化選股模型，著重於價格趨勢、動能指標與大戶資金流向。
---

# 技術面與籌碼面分析模型 (Technical & Chip Analysis Model)

本模型定義了捕捉股價趨勢與短期爆發力的邏輯。它沒有長期的公司信仰，全憑市場資金足跡說話。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| OHLCV 歷史 | `price_history` | `open`, `high`, `low`, `close`, `volume`, `turnover` | 每日 |
| 均線 MA5/20/60/120 | `daily_indicators` | `ma5`, `ma20`, `ma60`, `ma120` | 每日 (ETL) |
| RSI(14) | `daily_indicators` | `rsi14` | 每日 (ETL) |
| MACD (DIF/DEA/OSC) | `daily_indicators` | `macd_diff`, `macd_dea` | 每日 (ETL) |
| KD 指標 | `daily_indicators` | `kd_k`, `kd_d` | 每日 (ETL) |
| 三大法人買賣超 | `chips` | `foreign_inv`, `invest_trust`, `dealer` | 每日 |
| 法人 5 日集中度 | `chip_features` | `concentration_5d`, `total_inst_buy` | 每日 (ETL) |
| 個股技術快照 | `tech_features` | `ma5`, `ma20`, `rsi_14`, `macd_diff`, `kd_k` | 每日 (ETL) |
| 融資融券 | `margin_short` | `margin_bal`, `short_bal`, `margin_net`, `short_net` | 每日 |
| 主力分點 | `major_broker_chips` | `net_main_player_shares`, `concentration_ratio` | 每日 |
| 快照 (含技術+籌碼) | `latest_prices` | `ma5`, `ma20`, `ma60`, `rsi`, `foreign_inv`, `invest_trust` | 每日 |

### 快照層捷徑 — 一表搞定篩選
```sql
-- latest_prices 已匯整技術指標 + 法人籌碼，零 JOIN 篩選
SELECT symbol, close, change_pct, ma5, ma20, ma60, ma120, rsi,
       foreign_inv, invest_trust, dealer, volume, turnover, sector
FROM latest_prices
WHERE close > ma60               -- 趨勢: 站上季線
  AND close > ma20               -- 短多排列
  AND rsi BETWEEN 60 AND 80      -- RSI 強勢區
  AND foreign_inv > 0             -- 外資買超
ORDER BY foreign_inv DESC
LIMIT 50;
```

---

## 1. 趨勢與型態過濾 (Trend Filtering) - 確定大方向
此階段為「絕對條件」，用於判斷股票目前所處的位階。

*   **大趨勢保護**：今日收盤價 > 60 日均線 (季線)。
    ```sql
    SELECT p.symbol, p.close, d.ma60
    FROM price_history p
    JOIN daily_indicators d ON p.symbol = d.symbol AND p.date = d.date
    WHERE p.date = (SELECT MAX(date) FROM price_history)
      AND p.close > d.ma60;
    ```

*   **短期多頭排列**：收盤 > MA10 > MA20。
    ```sql
    -- 注意: 系統使用 MA5 (非 MA10)，適配如下:
    SELECT symbol FROM daily_indicators
    WHERE date = (SELECT MAX(date) FROM daily_indicators)
      AND ma5 > ma20;
    ```

*   **價格位階 (突破潛力)**：近 60 日最高價 / 昨收 < 1.15。
    ```sql
    SELECT symbol,
           MAX(high) AS high_60d,
           (SELECT close FROM price_history p2
            WHERE p2.symbol = price_history.symbol
            ORDER BY date DESC LIMIT 1) AS last_close,
           MAX(high) / (SELECT close FROM price_history p2
            WHERE p2.symbol = price_history.symbol
            ORDER BY date DESC LIMIT 1) AS ratio
    FROM price_history
    WHERE date >= date('now', '-90 days')
    GROUP BY symbol
    HAVING ratio < 1.15;
    ```

---

## 2. 動能與籌碼評分模型 (Momentum & Chips Scoring)
符合趨勢過濾條件的股票，進入以下評分系統 (滿分 100 分) 計算短線爆發力。

**A. 短期爆發動能 (技術指標，權重 40%)**

*   **MACD 翻紅發散 (20%)**：
    *   *Definition*:
        *   `DIF = EMA(Close, 12) - EMA(Close, 26)`
        *   `DEA = EMA(DIF, 9)` (即 `macd_dea`)
        *   `OSC = DIF - DEA` (即 `macd_diff`)
    ```sql
    -- MACD 柱狀線翻正且連續放大
    WITH recent AS (
      SELECT symbol, date, macd_diff,
             LAG(macd_diff) OVER (PARTITION BY symbol ORDER BY date) AS prev_osc,
             LAG(macd_diff, 2) OVER (PARTITION BY symbol ORDER BY date) AS prev2_osc
      FROM daily_indicators
      WHERE date >= date('now', '-10 days')
    )
    SELECT symbol FROM recent
    WHERE date = (SELECT MAX(date) FROM daily_indicators)
      AND macd_diff > 0
      AND macd_diff > prev_osc
      AND prev_osc > prev2_osc;  -- OSC 連三日放大 → 給 20 分
    ```

*   **RSI 強勢區間 (20%)**：
    ```sql
    SELECT symbol, rsi14,
           CASE WHEN rsi14 BETWEEN 60 AND 80 THEN 20
                WHEN rsi14 > 80 THEN 5    -- 過熱警示
                ELSE 0
           END AS rsi_score
    FROM daily_indicators
    WHERE date = (SELECT MAX(date) FROM daily_indicators);
    ```

**B. 籌碼流向 (台灣股市特有，權重 40%)**

*   **外資連買 (20%)**：
    ```sql
    -- 外資連續 3 日買超
    WITH streaks AS (
      SELECT symbol, date, foreign_inv,
             LAG(foreign_inv) OVER (PARTITION BY symbol ORDER BY date) AS prev,
             LAG(foreign_inv, 2) OVER (PARTITION BY symbol ORDER BY date) AS prev2
      FROM chips
      WHERE date >= date('now', '-7 days')
    )
    SELECT symbol FROM streaks
    WHERE date = (SELECT MAX(date) FROM chips)
      AND foreign_inv > 0 AND prev > 0 AND prev2 > 0;  -- 連 3 買 → 給 20 分
    ```
    *   **進階**: 使用 `/api/market/institutional-streak` API 直接取得已排序的外資連買天數排行。

*   **投信青睞 (20%)**：
    ```sql
    -- 近 5 日投信累計買超 > 1000 張
    SELECT symbol, SUM(invest_trust) AS trust_5d
    FROM chips
    WHERE date >= date('now', '-7 days')
    GROUP BY symbol
    HAVING trust_5d > 1000;  -- 給 20 分
    ```

**C. 爆量突破 (權重 20%)**

*   **成交量放大 (20%)**：
    ```sql
    WITH vol AS (
      SELECT symbol, date, volume,
             AVG(volume) OVER (
               PARTITION BY symbol
               ORDER BY date
               ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING
             ) AS avg_vol_5d
      FROM price_history
      WHERE date >= date('now', '-10 days')
    )
    SELECT symbol FROM vol
    WHERE date = (SELECT MAX(date) FROM price_history)
      AND volume > avg_vol_5d * 2;  -- 量能 > 5日均量 2 倍 → 給 20 分
    ```

---

## 3. 進階籌碼指標 (Extended Chip Intelligence)

系統額外提供以下深度籌碼數據，可作為加分/扣分條件：

| 指標 | 資料表 | 欄位 | 應用 |
|------|--------|------|------|
| 融資減+融券增 | `margin_short` | `margin_net < 0 AND short_net > 0` | 散戶看空 → 反向指標加分 +10 |
| 官股進場 | `government_chips` | `net_buy_shares > 0` | 政策底保護 → 信心加分 +5 |
| 主力集中 | `major_broker_chips` | `concentration_ratio > 10` | 主力鎖碼 → 加分 +10 |
| 董監加碼 | `director_holdings` | `insider_net_change > 0` | 內線信心 → 加分 +5 |
| 借券餘額暴增 | `security_lending` | `lending_balance 大增` | 空方壓力 → 扣分 -10 |

```sql
-- 綜合法人快照 (一次查詢所有籌碼面向)
SELECT s.symbol, s.foreign_inv, s.invest_trust, s.dealer,
       s.margin_bal, s.margin_net, s.short_bal, s.short_net,
       s.gov_net_buy, s.main_net_shares, s.main_concentration,
       s.director_ratio, s.pawn_ratio, s.insider_change,
       s.lending_balance, s.short_selling_balance
FROM institutional_snapshot s
WHERE s.symbol = '2330';
```

---

## 4. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 個股 K 線歷史 | `GET /api/prices/{symbol}` | 技術分析圖表 (含 OHLCV) |
| 個股估值歷史 | `GET /api/stock/valuation?symbol=2330` | PE/PB 位階判斷 |
| 法人連買排行 | `GET /api/market/institutional-streak` | 外資/投信連買天數 Top N |
| 最新行情 + 技術 | `GET /api/market/latest` | 含 MA/RSI/法人資料的漲跌排行 |
| AI 鑑識報告 | `GET /api/ai-report/{symbol}` | 含 chips 章節的技術面分析 |
| 即時報價串流 | `GET /api/sse/stream` | SSE 推送盤中 Tick 更新 |

---

## 5. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/etl/migrate-to-analysis-tables.mjs` | `daily_indicators` | 計算 MA5/20/60/120, RSI14, MACD, KD |
| `scripts/etl/generate-all-features.mjs` | `chip_features` | 5日法人集中度 |
| `scripts/etl/generate-all-features.mjs` | `tech_features` | 最新日技術指標快照 |
| `scripts/etl/generate-all-features.mjs` | `institutional_snapshot` | 8表合併法人快照 |
| `scripts/fetch-chips.mjs` | `chips` 原始表 | 從 TWSE T86 抓取每日三大法人 |

---

## 6. 已知資料缺口與補充建議

| 缺口 | 影響的評分項目 | 補充方案 |
|------|--------------|---------|
| ~~MA10 (10 日均線)~~ | ~~短期趨勢判定~~ | ✅ 已修復：`daily_indicators.ma10` 已由 ETL 計算（確認有真實資料） |
| 布林通道 (Bollinger Bands) | 波動率突破判定 | 可在 `daily_indicators` 新增 `bb_upper`, `bb_lower`, `bb_width` |
| 外資持股比例 | 外資影響力權重 | 建議從 TWSE 新增 `foreign_holding_ratio` 欄位至 `chips` 表 |
| OBV (On-Balance Volume) | 量價背離確認 | 可在 ETL 新增 OBV 累計運算 |
| 自營商避險 vs 自營 | 區分真正做多 vs 避險 | `dealer_details` 已有 `prop_buy`/`hedge_buy`，可整合至評分 |

---

## 7. 開發實作規範 (給 AI / 工程師的指示)
*   **歷史資料依賴**：技術指標需至少 N + Max(Period) 日歷史價格。`daily_indicators` 已由 ETL 預計算，前端不需自行運算。
*   **買進訊號判定**：動能與籌碼總得分 > 85 分 → 標記 `StrongBuySignal`。
*   **回測串接**：`/api/strategy/backtest` 已實作「外資連 3 買 → T+5 報酬」回測，可擴展至更多條件組合。
*   **快照優先**：篩選列表一律查 `latest_prices` (含 MA/RSI/法人); 個股深度頁才查 `daily_indicators` 取完整歷史序列。
