---
name: backtest_engine
description: 台股策略回測框架，定義歷史驗證、績效統計與交易明細規範，確保所有策略發佈前經過嚴格數據檢驗。
---

# 策略回測引擎 (Strategy Backtesting Engine)

任何量化策略在真金白銀投入前，必須經過歷史回測驗證。本模型定義回測的資料需求、計算邏輯、績效指標與反欺騙規則，確保回測結果具備統計可信度。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| 歷史 OHLCV | `price_history` | `open`, `high`, `low`, `close`, `volume`, `turnover` | 每日 |
| 技術指標 | `daily_indicators` | `ma5`, `ma10`, `ma20`, `ma60`, `ma120`, `rsi14`, `macd_diff`, `kd_k`, `atr14` | 每日 (ETL) |
| 三大法人 | `chips` | `foreign_inv`, `invest_trust`, `dealer` | 每日 |
| 籌碼特徵 | `chip_features` | `concentration_5d`, `total_inst_buy` | 每日 (ETL) |
| 融資融券 | `margin_short` | `margin_bal`, `margin_net`, `short_bal`, `short_net` | 每日 |
| 市場寬度 | `market_breadth_history` | `ma20_breadth`, `ma60_breadth`, `trin` | 每日 (ETL) |
| 回測結果存檔 | `backtest_results` | `strategy_name`, `win_rate`, `sharpe_ratio`, `trades` (JSON) | 每次回測 |

---

## 1. 回測引擎架構 (Backtest Architecture)

### 事件驅動模型 (Event-Driven)

```
歷史資料 (price_history + daily_indicators + chips)
  │
  ▼  逐日迭代 (Bar-by-Bar)
┌─────────────────────────────────┐
│  Signal Generator               │ ← 策略條件判定 (買進/賣出信號)
│  • technical_analysis 規則      │
│  • fundamental_analysis 過濾    │
│  • market_breadth 環境閘門      │
└──────────┬──────────────────────┘
           │ Signal: BUY / SELL / HOLD
           ▼
┌─────────────────────────────────┐
│  Position Manager               │ ← risk_management 規則
│  • 2% Rule 部位計算             │
│  • ATR 停損線設定               │
│  • 移動停利更新                 │
└──────────┬──────────────────────┘
           │ Order: {symbol, shares, price, stop_loss}
           ▼
┌─────────────────────────────────┐
│  Trade Executor (模擬)          │
│  • 隔日開盤價成交               │
│  • 滑價假設: 0.1%              │
│  • 手續費: 0.1425% × 2 + 證交稅 0.3% │
└──────────┬──────────────────────┘
           │ Trades: [{entry, exit, return}]
           ▼
┌─────────────────────────────────┐
│  Performance Analyzer           │
│  • 勝率、報酬、MDD、Sharpe     │
│  • 逐月/逐年拆解               │
└─────────────────────────────────┘
```

---

## 2. 回測資料查詢 (Data Access Patterns)

### 2A. 載入策略所需完整歷史

```sql
-- 取得指定期間的完整回測資料 (技術面 + 籌碼面)
SELECT ph.symbol, ph.date, ph.open, ph.high, ph.low, ph.close, ph.volume, ph.turnover,
       di.ma5, di.ma10, di.ma20, di.ma60, di.ma120, di.rsi14, di.atr14,
       di.macd_diff, di.macd_dea, di.kd_k, di.kd_d,
       c.foreign_inv, c.invest_trust, c.dealer
FROM price_history ph
LEFT JOIN daily_indicators di ON ph.symbol = di.symbol AND ph.date = di.date
LEFT JOIN chips c ON ph.symbol = c.symbol AND c.date = ph.date
WHERE ph.symbol = ?
  AND ph.date BETWEEN ? AND ?
ORDER BY ph.date ASC;
```

### 2B. 大盤環境閘門 (回測期間)

```sql
-- 回測期間的每日市場狀態 (Phase 1 閘門)
SELECT date, ma20_breadth, ma60_breadth, trin,
       CASE WHEN ma20_breadth < 10 THEN 'BLUE'
            WHEN ma60_breadth < 30 THEN 'RED'
            WHEN ma20_breadth > 85 THEN 'YELLOW'
            WHEN ma20_breadth > 50 THEN 'GREEN'
            ELSE 'YELLOW'
       END AS regime
FROM market_breadth_history
WHERE date BETWEEN ? AND ?
ORDER BY date ASC;
```

---

## 3. 績效指標計算 (Performance Metrics)

### 3A. 核心指標公式

| 指標 | 公式 | 門檻 |
|------|------|------|
| **勝率 (Win Rate)** | `wins / total_trades × 100` | > 45% |
| **平均報酬 (Avg Return)** | `SUM(return_pct) / total_trades` | > 2% |
| **累計報酬 (Total Return)** | `∏(1 + return_i) - 1` | > 年化 15% |
| **最大回撤 (Max Drawdown)** | `MAX(peak - trough) / peak × 100` | < 20% |
| **夏普比率 (Sharpe Ratio)** | `(avg_return - risk_free) / std(returns)` | > 1.0 |
| **獲利因子 (Profit Factor)** | `total_profit / total_loss` | > 1.5 |
| **平均持有天數** | `AVG(exit_date - entry_date)` | 參考 |

### 3B. TypeScript 實作

```typescript
interface BacktestTrade {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  returnPct: number;
  exitReason: 'stop_loss' | 'trailing_stop' | 'time_stop' | 'signal_exit' | 'regime_exit';
}

interface BacktestResult {
  strategyName: string;
  params: Record<string, unknown>;
  period: { start: string; end: string };
  trades: BacktestTrade[];
  metrics: {
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    profitFactor: number;
    avgHoldingDays: number;
  };
}

function calculateMetrics(trades: BacktestTrade[]): BacktestResult['metrics'] {
  const wins = trades.filter(t => t.returnPct > 0);
  const losses = trades.filter(t => t.returnPct <= 0);
  const returns = trades.map(t => t.returnPct);

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length
  );

  return {
    totalTrades: trades.length,
    winRate: (wins.length / trades.length) * 100,
    avgReturn,
    totalReturn: returns.reduce((cum, r) => cum * (1 + r / 100), 1) * 100 - 100,
    maxDrawdown: calculateMaxDrawdown(returns),
    sharpeRatio: stdReturn > 0 ? (avgReturn - 0.02) / stdReturn : 0, // 假設無風險利率 2%/252 日
    profitFactor: losses.length > 0
      ? Math.abs(wins.reduce((s, t) => s + t.returnPct, 0)) /
        Math.abs(losses.reduce((s, t) => s + t.returnPct, 0))
      : Infinity,
    avgHoldingDays: trades.reduce((s, t) => {
      const days = (new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / 86400000;
      return s + days;
    }, 0) / trades.length,
  };
}

function calculateMaxDrawdown(returns: number[]): number {
  let peak = 0, maxDD = 0, equity = 100;
  for (const r of returns) {
    equity *= (1 + r / 100);
    peak = Math.max(peak, equity);
    const dd = (peak - equity) / peak * 100;
    maxDD = Math.max(maxDD, dd);
  }
  return maxDD;
}
```

---

## 4. 回測反欺騙規則 (Anti-Cheating Rules)

回測最大的陷阱是「過度擬合歷史資料」。以下嚴格規範必須遵守：

| 規則 | 說明 |
|------|------|
| **前視偏差禁止 (No Lookahead Bias)** | 策略在 T 日只能使用 T-1 日（含）以前的資料。T 日的 `close` 不可用於T日的買進決策。 |
| **滑價與手續費 (Slippage + Fee)** | 買進以「隔日開盤價 × 1.001」成交；賣出以「隔日開盤價 × 0.999」成交。手續費含稅共扣 0.585%。 |
| **生存者偏差 (Survivorship Bias)** | 回測標的池必須包含已下市/下櫃的股票。使用回測期間的 `stocks` 快照而非現在的。 |
| **停損必執行 (Mandatory Stop-Loss)** | 所有回測必須包含 `risk_management` 的停損邏輯。禁止「買進放著不管」的無限凹單回測。 |
| **樣本外驗證 (Out-of-Sample)** | 至少保留最近 6 個月資料作為 Out-of-Sample 測試，不得用於策略參數調整。 |
| **最低交易次數** | 回測結果 < 30 筆交易者不具統計意義，必須標記 `⚠️ LOW_SAMPLE`。 |
| **大盤閘門回測** | 必須同時記錄回測期間的 `market_breadth` 環境。純空頭期的績效應獨立統計。 |

---

## 5. 回測結果存檔

### 寫入 backtest_results 表

```sql
INSERT INTO backtest_results (
  strategy_name, run_date, params,
  total_trades, win_rate, avg_return, total_return,
  max_drawdown, sharpe_ratio, profit_factor, avg_holding_days,
  trades
) VALUES (
  'foreign_3buy_ma60',
  date('now'),
  '{"entry": "foreign_inv > 0 連 3 日 AND close > ma60", "exit": "close < ma20 OR atr_stop"}',
  156, 52.6, 3.2, 87.4,
  -12.3, 1.45, 1.82, 8.3,
  '[{"symbol":"2330","entry_date":"2025-03-15",...}]'
);
```

### 查詢歷史回測結果

```sql
-- 各策略最佳績效排行
SELECT strategy_name, run_date, total_trades,
       win_rate, sharpe_ratio, max_drawdown, total_return
FROM backtest_results
WHERE total_trades >= 30        -- 排除低樣本
ORDER BY sharpe_ratio DESC;
```

---

## 6. 預置策略模板 (Strategy Templates)

系統提供以下可直接回測的策略模板：

| 策略名稱 | 進場條件 | 出場條件 | 適用模型 |
|----------|---------|---------|---------|
| `foreign_3buy_t5` | 外資連買 ≥ 3 日 + 站上 MA60 | T+5 後賣出或停損 | technical_analysis |
| `trust_accumulate` | 投信 10 日累計買超 > 500 張 + PE < P50 | 投信轉賣超 3 日 | institutional_forensic + valuation_river |
| `breadth_oversold` | ma20_breadth < 10 (BLUE 燈) + 出現帶量紅K | ma20_breadth > 60 or 停損 | market_breadth_analysis |
| `sector_rotation_momentum` | 產業 5 日動能翻正 + 外資流入 | 產業動能轉負或 20 日後 | sector_rotation |
| `value_mean_reversion` | PE < P10 + 殖利率 > P90 + EPS TTM > 0 | PE 回到 P50 或停損 | fundamental_analysis + valuation_river |

---

## 7. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 執行回測 | `POST /api/strategy/backtest` | 送入策略參數，回傳績效與交易明細 |
| 回測紀錄 | `GET /api/strategy/backtest/history` | 歷史回測結果列表 |
| K 線歷史 | `GET /api/prices/{symbol}` | 圖表疊加回測進出場標記 |
| 大盤環境 | `GET /api/market/breadth-timeseries` | 回測期間的市場狀態 |

---

## 8. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/etl/technical-features.ts` | `daily_indicators` (含 `atr14`) | 技術指標 — 回測的核心資料基底 |
| `scripts/fetch-yahoo.mjs` | `price_history` | 歷史 OHLCV — 至少需 2 年資料 |
| `scripts/fetch-chips.mjs` | `chips` 原始表 | 法人籌碼 — 籌碼策略的判斷依據 |
| `scripts/etl/migrate-to-analysis-tables.mjs` | `market_breadth_history` | 大盤閘門 — 回測的環境標註 |

---

## 9. 已知資料缺口與補充建議

| 缺口 | 影響 | 狀態 |
|------|------|------|
| 已下市股票 | 生存者偏差 | 建議 `stocks` 表新增 `delisted_date` 欄位，fetch-stock-list 加入下市偵測 |
| 分鐘 K 資料 | 無法回測日內策略 | 需接入即時報價源後可累積 `intraday_kline` 表 |
| ~~基準指數 (TAIEX)~~ | ~~無法計算 Alpha / Beta~~ | ✅ 已修復：`market_index` 表已含 TAIEX 歷史 OHLCV (Yahoo ^TWII；筆數隨每日更新增長) |
| 多策略組合回測 | 目前僅支援單一策略 | 日後擴展 `backtest_results.params` 支援組合參數 |

---

## 10. 開發實作規範 (給 AI / 工程師的指示)

*   **逐日迭代**：回測核心以 `for...of` 遍歷每日 bar，禁止使用 `future_data[i+1]`。
*   **成本模型**：台股買賣手續費 0.1425% (證券商) + 賣出證交稅 0.3%，以 `cost = entry * 0.001425 + exit * 0.004425` 概算。
*   **JSON trades**：`backtest_results.trades` 以 JSON 文字存入 SQLite，前端解析後渲染為表格與圖表。
*   **圖表可視化**：回測頁應包含 ① 資金曲線 (Equity Curve) ② 月績效熱力圖 ③ K 線上的進出場標記。
*   **快取策略**：相同參數的回測結果存入 `backtest_results`，避免重複運算。
