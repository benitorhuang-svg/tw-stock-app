---
name: risk_management
description: 台股部位控管與停損停利模型，確保生存與利潤極大化。
---

# 風險控管與部位模型 (Risk Management Model)

「會買股票只是徒弟，會賣才是師傅。」任何量化系統，如果沒有風險控管，遇到一次黑天鵝就會讓長年利潤歸零。本模型控制整個系統的「買進數量」與「賣出時機」。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| OHLCV (計算 ATR) | `price_history` | `high`, `low`, `close` | 每日 |
| ATR(14) | `daily_indicators` | `atr14` | 每日 (ETL) |
| 均線 (停利基準) | `daily_indicators` | `ma5`, `ma10`, `ma20`, `ma60` | 每日 (ETL) |
| RSI (超買判斷) | `daily_indicators` | `rsi14` | 每日 (ETL) |
| 回測績效 | `/api/strategy/backtest` | `entry_price`, `exit_price`, `return_pct` | API |
| 法人動向 (避險) | `chips` | `foreign_inv`, `invest_trust` | 每日 |
| 融券餘額 (軋空風險) | `margin_short` | `short_bal`, `short_net` | 每日 |
| 借券賣出 | `security_lending` | `short_selling_balance` | 每日 |

### ATR 計算 (已納入 ETL 預計算)

ATR (Average True Range) 是本模型核心，已在 `daily_indicators` 表中新增 `atr14` 欄位，由 ETL 自動計算：

```sql
-- 直接從運算層讀取 ATR
SELECT symbol, date, atr14
FROM daily_indicators
WHERE date = (SELECT MAX(date) FROM daily_indicators)
  AND atr14 IS NOT NULL;
```

**ETL 計算邏輯** (`scripts/etl/technical-features.ts`):
```
True Range = MAX(High - Low, |High - Prev_Close|, |Low - Prev_Close|)
ATR(14) = SMA(True Range, 14)
```

若 ETL 尚未部署 ATR，可用以下 SQL 作為暫時 Fallback：

```sql
-- ATR(14) 計算: 需 price_history 的 high/low/close
WITH tr AS (
  SELECT symbol, date,
         MAX(high - low,
             ABS(high - LAG(close) OVER (PARTITION BY symbol ORDER BY date)),
             ABS(low - LAG(close) OVER (PARTITION BY symbol ORDER BY date))
         ) AS true_range
  FROM price_history
  WHERE date >= date('now', '-30 days')
)
SELECT symbol,
       AVG(true_range) AS atr_14
FROM tr
WHERE date >= date('now', '-20 days')
GROUP BY symbol;
```

---

## 1. 資金控管與部位計算 (Position Sizing)

量化交易絕對不憑感覺「這檔買 3 張、那檔買 5 張」，一切依據資金池波動率計算。

**核心原則：單筆交易最大虧損，不得超過總資金的 `2%` (2% Rule)**

*   **Step 1. 給定條件：**
    *   `Total_Capital` (總資金): 例如 1,000,000 元
    *   `Max_Risk_Per_Trade` = 1,000,000 * 0.02 = 20,000 元
*   **Step 2. 決定停損價 (Stop Loss Price)：**
    *   *技術型停損*：進場價 `Entry = 100` 元，防守 20日均線 `Stop_Loss = 90` 元。
    ```sql
    -- 取得最新 MA20 作為停損參考
    SELECT symbol, close, ma20,
           close - ma20 AS risk_per_share
    FROM (
      SELECT di.symbol, ph.close, di.ma20
      FROM daily_indicators di
      JOIN price_history ph ON di.symbol = ph.symbol AND di.date = ph.date
      WHERE di.date = (SELECT MAX(date) FROM daily_indicators)
    );
    ```
    *   *每股風險 (Risk_Per_Share)* = `Entry - Stop_Loss` = 10 元。
*   **Step 3. 算出精確購買股數：**
    *   *Formula*: `Position_Size_Shares = Max_Risk_Per_Trade / Risk_Per_Share`
    *   `20,000 / 10 = 2,000 股 (也就是 2 張)`

### 部位計算 TypeScript 實作

```typescript
interface PositionCalcInput {
  totalCapital: number;      // 總資金
  entryPrice: number;        // 進場價
  stopLossPrice: number;     // 停損價 (可用 MA20)
  maxRiskPct?: number;       // 最大風險比例 (預設 0.02)
}

function calculatePositionSize(input: PositionCalcInput) {
  const maxRisk = input.totalCapital * (input.maxRiskPct ?? 0.02);
  const riskPerShare = input.entryPrice - input.stopLossPrice;
  if (riskPerShare <= 0) return { shares: 0, lots: 0, investAmount: 0, warning: '停損價高於進場價' };
  const shares = Math.floor(maxRisk / riskPerShare);
  const lots = Math.floor(shares / 1000);  // 台股 1 張 = 1000 股
  return {
    shares,
    lots,
    investAmount: lots * 1000 * input.entryPrice,
    maxLoss: maxRisk,
    riskPerShare,
  };
}
```

---

## 2. 動態出場機制 (Dynamic Exit Mechanisms)

**A. 初始停損 (Hard Stop Loss)**
*   *Condition*: 跌破買進時設定的原始防守價位。
*   *Action*: 無條件市價停損。

**B. 移動停利 (Trailing Stop) — 讓利潤奔跑**

*   **ATR 移動停利法**：
    *   *Formula*: `Trailing_Stop = Highest_Close_Since_Entry - (2 * ATR_14)`
    ```sql
    -- 計算進場後的最高收盤價與 ATR 停利線
    WITH entry AS (SELECT '2330' AS symbol, '2026-02-01' AS entry_date),
    post_entry AS (
      SELECT ph.symbol, ph.date, ph.close, ph.high, ph.low,
             MAX(ph.close) OVER (ORDER BY ph.date) AS highest_close
      FROM price_history ph, entry e
      WHERE ph.symbol = e.symbol AND ph.date >= e.entry_date
    )
    SELECT symbol, date, close, highest_close,
           highest_close - 2 * (
             SELECT AVG(
               MAX(p2.high - p2.low,
                   ABS(p2.high - LAG(p2.close) OVER (ORDER BY p2.date)),
                   ABS(p2.low - LAG(p2.close) OVER (ORDER BY p2.date)))
             ) FROM price_history p2
             WHERE p2.symbol = post_entry.symbol
               AND p2.date BETWEEN date(post_entry.date, '-20 days') AND post_entry.date
           ) AS trailing_stop
    FROM post_entry;
    ```

*   **均線移動停利法 (適合波段操作)**：
    ```sql
    -- 收盤跌破 MA10 (系統用 MA5 替代) → 出場
    SELECT symbol, close, ma5
    FROM daily_indicators di
    JOIN price_history ph ON di.symbol = ph.symbol AND di.date = ph.date
    WHERE di.date = (SELECT MAX(date) FROM daily_indicators)
      AND ph.close < di.ma5;  -- 跌破 MA5 → 全數停利
    ```

**C. 時間停損 (Time Stop)**
*   *Condition*: 進場後超過 10 個交易日，股價漲幅不到 3%。
    ```sql
    -- 檢查進場後 10 日的表現
    WITH entry AS (
      SELECT '2330' AS symbol, 100.0 AS entry_price, '2026-02-10' AS entry_date
    )
    SELECT ph.symbol, ph.close,
           (ph.close - e.entry_price) / e.entry_price * 100 AS return_pct,
           julianday(ph.date) - julianday(e.entry_date) AS holding_days
    FROM price_history ph, entry e
    WHERE ph.symbol = e.symbol
      AND ph.date > e.entry_date
    ORDER BY ph.date
    LIMIT 10;
    -- 若第 10 筆的 return_pct < 3% → 時間停損出場
    ```

---

## 3. 風險情境矩陣 (Risk Scenario Matrix)

| 情境 | 觸發條件 | 動作 | 資料來源 |
|------|---------|------|---------|
| 個股跌破停損 | `close < stop_loss_price` | 無條件平倉 | `price_history` |
| 均線翻空 | `close < ma20` 連 2 日 | 減碼 50% | `daily_indicators` |
| RSI 極度過熱 | `rsi14 > 85` | 停止加碼 | `daily_indicators` |
| 系統性空頭 | `ma60_breadth < 30` | 總持股降至 30% | `market_breadth_history` |
| 外資大逃殺 | `foreign_inv < -500 張` 連 3 日 | 強制減碼 | `chips` |
| 融券暴增 | `short_bal` 週增 > 50% | 警戒 (可能軋空或續跌) | `margin_short` |
| 時間停損 | 持有 > 10 日，漲幅 < 3% | 平倉釋放資金 | `price_history` |

---

## 4. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 回測績效 | `GET /api/strategy/backtest` | 含停損出場的歷史回測結果 |
| K 線歷史 | `GET /api/prices/{symbol}` | ATR 計算所需 OHLCV |
| 法人籌碼 | `GET /api/market/institutional-streak` | 連買/連賣天數 (風險信號) |
| 即時報價 | `GET /api/sse/stream` | 盤中停損監控 |

---

## 5. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/etl/migrate-to-analysis-tables.mjs` | `daily_indicators` (MA/RSI) | 停利停損的均線與超買超賣基準 |
| `scripts/fetch-chips.mjs` | `chips` 表 | 法人動態 → 風險信號 |
| `scripts/etl/generate-all-features.mjs` | `market_breadth_history` | 大盤系統性風險判斷 |

---

## 6. 已知資料缺口與補充建議

| 缺口 | 影響 | 狀態 |
|------|------|------|
| ~~MA10 (10 日均線)~~ | ~~波段停利基準~~ | ✅ 已修復：`daily_indicators.ma10` 已由 ETL 計算（確認有真實資料） |
| 虛擬部位管理 (Portfolio Table) | 無法追蹤持倉與 P/L | 建議新增 `virtual_portfolio` 表: `{symbol, entry_date, entry_price, shares, stop_loss, status}` |
| ~~加權指數日 K~~ | ~~大盤停損 (跌破季線)~~ | ✅ 已修復：`market_index` 表已含 TAIEX 5年歷史 OHLCV (Yahoo ^TWII, 1213 筆) |

---

## 7. 開發實作規範 (給 AI / 工程師的指示)
*   **介面整合 (UI)**：在 `StrategyMonitor` 頁面加入「風險計算機」面板，輸入總資金、進場價，自動帶出建議買進張數。
*   **回測邏輯 (Backtesting)**：`/api/strategy/backtest` 已包含進出場價格，可在前端計算逐筆 P/L 與最大回撤 (Max Drawdown)。
*   **停損嚴格性**：歷史回測成績必須包含自動停損出場，禁止「買進放著不管」的無限凹單回測。
*   **ATR 優先**：有 ATR 時優先使用 ATR 停利 (動態適應波動率)，無 ATR 時退化為均線停利。
