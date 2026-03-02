---
name: TW-Stock Quant Master Index
description: 台股量化交易系統的核心策略總覽與元件關係說明（含 11 大分析模型 × 27 資料表映射）。
---

# TW-Stock Quant Strategy Master Index (量化策略總覽)

本文件是所有策略模型（Skills）的最高指導原則，定義了各個分析模型在交易系統中的角色、順序與搭配方式。在開發與使用 TW-Stock 平台時，應將此架構視為核心商業邏輯。

---

## 策略模型總覽 (All Models at a Glance)

| # | 模型資料夾 | 中文名稱 | 主要用途 | 核心資料表 |
|---|----------|---------|---------|-----------|
| 1 | `market_breadth_analysis` | 市場寬度與情緒 | 大盤多空判定 (紅綠燈) | `market_breadth_history`, `institutional_trend` |
| 2 | `fundamental_analysis` | 基本面法醫 | 長線觀察池篩選 | `fundamentals`, `monthly_revenue`, `dividends` |
| 3 | `valuation_river` | 估值河流圖 | PE/PB/殖利率歷史位階 | `valuation_history`, `latest_prices` |
| 4 | `sector_rotation` | 產業輪動分析 | 強弱勢產業判定 | `sector_daily` |
| 5 | `technical_analysis` | 技術動能與籌碼 | 短線進場時機 | `daily_indicators`, `chips`, `chip_features` |
| 6 | `institutional_forensic` | 法人鑑識深度 | 三大法人行為解碼 | `institutional_snapshot`, 8 張籌碼表 |
| 7 | `day_trading_momentum` | 當沖/隔日沖動能 | 極短線交易訊號 | `latest_prices`, SSE stream |
| 8 | `risk_management` | 風險控管與部位 | 資金配置與停損 | `price_history`, `daily_indicators` || 9 | `backtest_engine` | 策略回測引擎 | 歷史驗證與績效統計 | `price_history`, `daily_indicators`, `chips` |
| 10 | `data_quality` | 資料品質管理 | 多源比對、缺值偵測 | 所有原始層資料表 |
| 11 | `alert_notification` | 警示與推播通知 | 即時 / 盤後條件觸發 | `latest_prices`, SSE stream, Web Worker |
| 12 | `transformer_strategy` | Transformer 選股模型 | 深度學習多因子選股 + 交易記憶 | `trade_journal`, `trade_patterns`, `ml_models` |
---

## 系統架構與策略生命週期 (Strategy Lifecycle)

一套完整的量化交易系統不是單一條件，而是一條「漏斗式」的流水線（Pipeline）。我們的 **12 大策略模型**依序扮演以下角色：

### Phase 1. 系統性環境判定大閘門 (Environment Check)
*   **使用模型**：`market_breadth_analysis` (市場寬度與情緒評估)
*   **用途**：決定「現在是不是適合投資的氣候」。
*   **機制**：如果市場正在雪崩（例如：超過 80% 股票跌破季線），系統將發出警報，所有個股買進訊號將被自動忽略或降低權重，這層保護可以避免逆勢操作。

### Phase 2. 產業輪動掃描 (Sector Rotation Scan)
*   **使用模型**：`sector_rotation` (產業輪動分析)
*   **用途**：判定「哪些產業正在轉強/轉弱」。
*   **機制**：每日盤後計算各產業 1/5/20 日動量排名，標記「領漲」與「補跌」產業，將選股範圍聚焦在強勢產業群中。

### Phase 3. 建立長期觀察名單 (Watchlist Generation)
*   **使用模型**：`fundamental_analysis` (基本面法醫與價值模型) + `valuation_river` (估值河流圖)
*   **用途**：從台股 2,275 檔中（上市 TSE 1,288 + 上櫃 OTC 987），尋找「就算不幸套牢，長期也能靠配息或基本面回本」的體質優良公司。
*   **機制**：每月（營收公布）或每季（財報公布）執行一次，汰弱留強，產出包含 50~100 檔股票的「長線觀察池（Pool）」。河流圖模型疊加估值位階判斷，優先納入處於歷史低估區（PE/PB < P25）的個股。

### Phase 4. 法人籌碼鑑識 (Institutional Forensic)
*   **使用模型**：`institutional_forensic` (法人鑑識深度分析)
*   **用途**：解碼三大法人的「真正意圖」。
*   **機制**：整合外資、投信、自營商、融資券、借券、主力券商、官股、自營明細等 8 張籌碼表，計算 Forensic Score (0~100)，用於區分「法人真買」與「法人避險/放空」。

### Phase 5. 短線買進觸發器 (Entry Trigger)
*   **使用模型**：`technical_analysis` (技術動能與籌碼模型) / `day_trading_momentum` (當沖動能模型)
*   **用途**：決定「今天或明天開盤要不要買」。
*   **機制**：每天盤後針對「長期觀察名單」進行計算。一旦某檔好股票出現「外資大買、突破月線、MACD 翻紅」的訊號，系統即觸發強烈的 `BuySignal`。

### Phase 6. 資金控管與出場防護網 (Exit & Sizing)
*   **使用模型**：`risk_management` (風險控管與部位計算)
*   **用途**：決定「要買多少張」以及「什麼時候認錯賣出」。
*   **機制**：在任何買進交易執行前，必須經過此模型計算「最大可承受虧損」。買入後，若觸發移動停損條件，無論基本面多好，由程式自動執行無情平倉。

---

## 模型整合實作指引 (Implementation Guide)

在專案（如 `StrategyFilterMatrix.svelte` 或 `BacktestHeatmap`）中實作時，這八個模組應該彼此協作，傳遞資料：

### 資料流 (Data Flow Pipeline)

```
Market Data (TWSE/Yahoo/MOPS)
  │
  ▼
┌─────────────────────────────────┐
│  Phase 1: Breadth Filter        │ ← market_breadth_analysis
│  (大盤紅綠燈: 🟢🟡🔴)           │
└──────────┬──────────────────────┘
           │ 通過: 🟢/🟡
           ▼
┌─────────────────────────────────┐
│  Phase 2: Sector Scanner        │ ← sector_rotation
│  (強勢產業 Top N)               │
└──────────┬──────────────────────┘
           │ 聚焦: 強勢產業群
           ▼
┌─────────────────────────────────┐
│  Phase 3: Fundamental + Value   │ ← fundamental_analysis + valuation_river
│  (觀察池: 50~100 檔)            │
└──────────┬──────────────────────┘
           │ 過濾: 基本面合格 + 估值合理
           ▼
┌─────────────────────────────────┐
│  Phase 4: Forensic Intelligence │ ← institutional_forensic
│  (法人意圖解碼)                  │
└──────────┬──────────────────────┘
           │ 加分: 法人真買信號
           ▼
┌─────────────────────────────────┐
│  Phase 5: Entry Trigger         │ ← technical_analysis / day_trading_momentum
│  (今日觸發清單: 5~10 檔)        │
└──────────┬──────────────────────┘
           │ 確認: 技術面轉強
           ▼
┌─────────────────────────────────┐
│  Phase 6: Risk Manager          │ ← risk_management
│  (部位 + 停損 → 執行)            │
└─────────────────────────────────┘
```

### 橫向支援模組 (Cross-Cutting Concerns)

除了 Phase 1~6 的線性流水線，以下三個模組橫跨所有階段：

| 模組 | 角色 | 觸發時機 |
|------|------|---------|
| `backtest_engine` | 歷史驗證 — 在策略上線前，必須通過回測驗證 | 策略開發/調參階段 |
| `data_quality` | 資料基礎設施 — 確保所有模型的輸入資料正確無誤 | 每日 ETL 後 / DB 啟動時 |
| `alert_notification` | 即時推播 — 將各 Phase 的信號推送給使用者 | 盤中 (SSE) / 盤後 (批次) |

### 儀表板設計建議

前端 UI 應該反映這種層次：
- **最上方**：市場寬度燈號 (Market Condition) — Phase 1
- **左側欄**：產業動量排名 (Sector Rotation) — Phase 2
- **左中**：基本面觀察池 + 估值位階 (Watchlist) — Phase 3
- **中央**：法人鑑識分數 (Forensic Score) — Phase 4
- **右中**：今日技術面觸發名單 (Actionable Tickets) — Phase 5
- **右下**：可用資金與建議部位 (Position Sizing) — Phase 6

---

## 資料庫架構快覽 (Database Architecture)

所有模型共用 `stocks.db` (SQLite, better-sqlite3)，分為四層，共計 **27 表**：

| 層級 | 資料表 | 說明 |
|------|--------|------|
| **Raw (原始層)** | `stocks`, `price_history`, `chips`, `margin_short`, `shareholder_distribution`, `government_chips`, `major_broker_chips`, `director_holdings`, `security_lending`, `dealer_details`, `valuation_history`, `fundamentals`, `monthly_revenue`, `dividends` | 從 TWSE/MOPS/Yahoo/TDCC 抓取的原始數據 (14 表) |
| **Computed (運算層)** | `daily_indicators`, `chip_features`, `tech_features`, `valuation_features`, `market_index` | ETL 計算的技術指標與特徵值 + TAIEX 指數 (5 表) |
| **Aggregated (聚合層)** | `market_breadth_history`, `institutional_trend`, `sector_daily` | 跨個股聚合的市場級指標 (3 表) |
| **Snapshot (快照層)** | `latest_prices`, `institutional_snapshot`, `ai_reports`, `screener_scores`, `backtest_results` | API 快速查詢用的最新快照 (5 表) |

### 外部資料來源

| 來源 | 資料 | 寫入表 | 取得腳本 |
|------|------|--------|----------|
| TWSE OpenAPI | 每日報價、三大法人 | `chips` | `scripts/fetch-chips.mjs` |
| TWSE OpenAPI | 信用交易 (融資融券) | `margin_short` | `scripts/crawlers/twse-margin.mjs` |
| TWSE/TPEx OpenAPI | 融資融券餘額 (TWT93U + margin_bal) | `security_lending` | `scripts/fetch-forensic.mjs` |
| *(無公開 API)* | 八大官股券商 | `government_chips` | — |
| MOPS 公開資訊觀測站 | 季報 (EPS/三率) | `fundamentals` | `scripts/fetch-financials.mjs` |
| MOPS 公開資訊觀測站 | 月營收 YoY | `monthly_revenue` | `scripts/fetch-revenue.mjs` |
| MOPS 公開資訊觀測站 | PE/PB/殖利率歷史 | `valuation_history` | `scripts/fetch-valuation-history.mjs` |
| Yahoo Finance | 歷史股價 (OHLCV) | `price_history` | `scripts/fetch-yahoo.mjs` |
| TDCC 集保中心 | 股權分散 (每週) | `shareholder_distribution` | `scripts/crawlers/tdcc-shareholders.mjs` |
| chips + price_history | 法人集中度（衍算） | `major_broker_chips` | `scripts/import-forensic.mjs` ✅ |
| TWSE/TPEx | 董監持股與質押 (每月) | `director_holdings` | `scripts/fetch-forensic.mjs` ❌ 被反爬蟲封鎖 |
| TWSE/TPEx OpenAPI | 自營商避險/自營明細 (TWT43U + 3itrade_hedge) | `dealer_details` | `scripts/fetch-forensic.mjs` ✅ |
| TWSE BFI82U | 三大法人每日買賣金額（市場彙總） | `government_chips` | `scripts/fetch-forensic.mjs` ✅ |
| TWSE TWT49U + TPEx exDailyQ | 除權除息歷史 (6年) | `dividends` | `scripts/fetch-dividends.mjs` ✅ |
| Yahoo Finance (^TWII) | TAIEX 大盤指數 5年 OHLCV | `market_index` | `scripts/fetch-market-index.mjs` ✅ |

---

## ETL 流水線 (ETL Pipeline)

```
fetch-stock-list.mjs → stocks 基本資料
fetch-yahoo.mjs → price_history (歷史股價)
fetch-chips.mjs → chips (三大法人)
crawlers/twse-margin.mjs → margin_short (融資融券)
crawlers/twse-chips.mjs → chips 補充 (每日法人)
crawlers/tdcc-shareholders.mjs → shareholder_distribution (股權分散)
fetch-financials.mjs → fundamentals (季報)
fetch-revenue.mjs → monthly_revenue (月營收)
fetch-valuation-history.mjs → valuation_history (PE/PB/Yield)
fetch-dividends.mjs → dividends (除權除息 6 年)
fetch-market-index.mjs → market_index (TAIEX 大盤指數 5 年)
fetch-forensic.mjs → dealer_details, security_lending, director_holdings, government_chips
    │
    ▼
build-sqlite-db.js → 27 表重建 + JSON 匯入 (含 market_index)
import-forensic.mjs → 鑑識資料匯入 + dividends + government_chips + major_broker_chips(衍算)
    │
    ▼
etl/chip-features.ts → chip_features (法人集中度)
generate-all-features.mjs → tech_features, valuation_features, institutional_snapshot
    │
    ▼
migrate-to-analysis-tables.mjs → daily_indicators (MA5/10/20/60/120, ATR14, RSI, MACD, KD),
                                   market_breadth_history (含 ADL), institutional_trend,
                                   sector_daily, latest_prices
```

---

## 資料完備度狀態 (Data Completeness Status)

> 最近更新：2026-03-01 | 台股清單：2,275 檔（上市 1,288 + 上櫃 987）

### 各 Skill 資料完備度

| Skill | 完備度 | 說明 |
|-------|--------|------|
| `market_breadth_analysis` | ✅ 完整 | `market_breadth_history` 由 ETL 生成 |
| `fundamental_analysis` | ✅ 95% | 負債比率已加入 `fundamentals.debt_ratio`；僅缺 operating_cash_flow（需 MOPS t187ap17） |
| `valuation_river` | ✅ 完整 | 估值歷史為月頻率（25 日快照） |
| `sector_rotation` | ✅ 完整 | `sector_daily` 由 ETL 每日聚合 |
| `technical_analysis` | ✅ 完整 | MA5/10/20/60/120 + ATR14 + RSI + MACD + KD |
| `institutional_forensic` | ⚠️ 90% | `dealer_details` ✅ 真實資料；`government_chips` ✅ 市場彙總 (BFI82U)；`major_broker_chips` ✅ 衍算自 chips；`director_holdings` ❌ API 被反爬蟲封鎖 |
| `day_trading_momentum` | ⚠️ 50% | 缺盤中分K線（intraday_kline），僅支援盤後分析 |
| `risk_management` | ✅ 完整 | ATR14 已加入 `daily_indicators` |
| `backtest_engine` | ✅ 完整 | 所有歷史數據可用 |
| `data_quality` | ✅ 完整 | `db-health-check.mjs` 可手動執行 |
| `alert_notification` | ✅ 完整 | SSE + Web Worker 架構就緒 |

### 資料表完備度明細

| 資料表 | 現況 | 筆數 | 說明 |
|--------|------|------|------|
| `dividends` | ✅ 真實資料 | 7,912 | TWSE TWT49U + TPEx exDailyQ，2021~2026 六年除權除息 |
| `dealer_details` | ✅ 真實資料 | 1,609 | TWSE TWT43U + TPEx 3itrade_hedge |
| `government_chips` | ✅ 市場彙總 | 5 | TWSE BFI82U 三大法人每日買賣金額（5 類別） |
| `major_broker_chips` | ✅ 衍算資料 | 2,545 | 從 chips + price_history 衍算法人集中度 |
| `director_holdings` | ❌ 被封鎖 | 0 | TWSE t36sb03 / TPEx directors 皆返回 HTML（Cloudflare 反爬蟲） |
| `backtest_results` | ⏸ 待觸發 | 0 | 使用者執行回測時寫入 |
| `screener_scores` | ⏸ 待觸發 | 0 | 選股評分功能執行時寫入 |
| `market_index` | ✅ 真實資料 | 1,213 | Yahoo Finance ^TWII TAIEX 5年歷史 OHLCV (2021~2026) |

### 重要資料格式與注意事項

| 事項 | 說明 |
|------|------|
| ~~**日期格式混合**~~ | ~~`chips`、`institutional_trend`、`institutional_snapshot` 存在新舊兩種日期格式~~ | ✅ 已修復：`build-sqlite-db.js` 已加入 `normalizeDate()` 統一為 `YYYY-MM-DD` |
| **民國年曆 (ROC)** | `fundamentals.year` 使用民國年 (如 `114` = 西元 2025)。SQL 中比較年份需轉換：`year + 1911`。 |
| ~~**latest_prices 僅含 TSE**~~ | ~~目前 `latest_prices` 僅匯入上市股 (1,289 檔)，缺上櫃 OTC (987 檔)~~ | ✅ 已修復：`fetch-yahoo.mjs` 已支援 `.TWO` 後綴拉取 OTC 行情 |
| **chips 單位不一致** | 部分 `chips` 記錄的單位為「股」而非「張」(1 張 = 1000 股)，需依資料來源確認。 |
