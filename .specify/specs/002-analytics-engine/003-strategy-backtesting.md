# 003 — 策略回測引擎 (Strategy Backtesting Engine)

> 本模組建立在 `M3: Query Builder` 篩選結果之上，負責將歷史清單與買賣點條件餵入引擎，產出動態且具備專業水準的量化回測報表。

## 1. 核心職責與架構翻轉

本升級將原本純展示用途的 `StrategyMonitor` 提升為真實的運算引擊：

| 傳統作法 (已淘汰)                 | 全新 backtest-engine.ts 架構 (The Next Level)          |
| --------------------------------- | ------------------------------------------------------ |
| 僅能查看單支股票的靜態 K 線。     | 針對整個清單進行 T+N 日或進出場條件的歷史回測。        |
| 使用 Mock Data 展示勝率與熱力圖。 | 動態計算真實夏普值、最大回撤、勝率與盈虧比。           |
| 在主執行緒迴圈計算所有策略結果。  | 將巨量運算剝離至 Web Worker，保持 UI 渲染 60FPS。      |
| 單純呈現最終總報酬。              | 繪製動態資金曲線 (Equity Curve)，並標記 K 線買賣點號。 |

## 2. 動態指標引擎 (Dynamic Metrics Engine)

`src/lib/backtest-engine.ts` 必須負責接收從資料庫撈出的交易明細陣列，並計算以下進階指標：

- **夏普值 (Sharpe Ratio)**: 衡量每承擔一單位風險的超額報酬。
- **最大回撤 (Max Drawdown)**: 策略歷史最高點跌至最低點的最大幅度。
- **盈虧比 (Profit Factor)**: 總獲利金額 / 總虧損金額。
- **動態熱力地圖資料**: 產出以年、月為維度的真實報酬矩陣。

## 3. 參數最佳化與無縫互動 (Parameter Optimization)

允許使用者自定義並動態重算的參數：

- **持有時間 (Holding Period)**: 例如 `T + 5`、`T + 20`。
- **停利停損條件 (Stop Loss / Take Profit)**: 例如 `+5% 停利`、`-3% 停損`。
- **滑桿即時連動**: 全程無縫銜接 `StrategyFilterMatrix.svelte`，調整參數時，本地化引擎即刻透過響應式狀態重算，**無須 Reload**。

## 4. 效能優化：Web Worker 剝離 (Performance Offloading)

為了防止瀏覽器卡頓，重磅的回測計算必須置於 Worker 內：

- **`backtest.worker.ts`**:
    - 接收原始交易清單與使用者自訂條件。
    - 在背景迴圈比對出每一筆進出場點與獲利率。
    - 統整並回傳 `Stats` (勝率、報酬) 與 `Trades` (明細)。
- 確保無論分析 1 檔還是 500 檔股票的 20 年數據，整體介面切換依舊暢快。

## 5. 視覺化層級整合 (Visualization)

- **資產曲線 (Equity Curve)**: 替 `StrategyMonitor` 新增資金流向圖。
- **買賣點標記**: 在目前的 `ForensicTrendChart` 中，利用 ChartGPU 或其他方案，將歷史買賣點 (Buy/Sell Arrows) 精確覆蓋於 K 線上，達到「視覺除錯」的專業效果。
