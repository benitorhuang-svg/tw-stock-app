# 001 — 風險分析與投資組合引擎 (Risk & Portfolio Analytics)

> 雖然個股的 `技術指標 (MACD/RSI)` 可以在資料建構階段就寫入 SQLite。但是「兩檔股票之間的相關性」、「加權過後的投資組合年化報酬與最大回撤」，這些問題**無法預先算好**，因為使用者可以無盡的組合各種股票權重。這才是 `M2: Analytics Engine` 真正必須發揮大數據運算威力的地方。

## 1. 核心數學模組職責 (`src/lib/risk-engine.ts`)

本模組提供純函式 (Pure Functions)，接收客戶端傳來的「股票清單」與相對應的「歷史價量陣列」，計算出高等統計常數。

### 1.1 投資組合核心風險與回報 (Portfolio Metrics)

- **整體年化報酬率 (Annualized Return, CAGR)**: 計算自訂籃子內的複合年均成長率。
- **整體年化波動率 (Annualized Volatility)**: 測量該投資組合每日報酬率樣本標準差 ($\sigma$) 乘以 $\sqrt{252}$。
- **夏普值 (Sharpe Ratio)**: 衡量承受每單位總風險所產生的額外報酬 (預設無風險利率 $R_f = 1.5\%$ 或透過央行即時 API 更新)。
- **最大回撤 (Maximum Drawdown, MaxDD)**: 計算使用者選定的股票組合，在歷史波段中的「從最高峰跌至最低谷的百分比」。

### 1.2 個股相對市場風險 (Relative Risk)

- **Beta 值 ($\beta$)**: 個股或投資組合 相對大盤指數 (如 TWSE `^TWII`) 的協方差 (Covariance)。此引擎必須能夠動態查詢大盤的歷史價格陣列來與個股對比。
- **皮爾森相關係數矩陣 (Pearson Correlation Matrix)**: 計算使用者選單中，每兩檔股票之間的關聯度 (介於 `-1` 到 `1`)。一旦發現過度集中的風險 (如兩檔電子股相關度達 `0.95`)，前端即能觸發紅燈警告。

## 2. 邊界處理 (Edge Cases)

| 情境                            | 引擎行為                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| 剛上市不到一年的股票            | 拒絕計算 CAGR (拋出 `InsufficientDataError` )，轉向計算日化報酬率 |
| 資料長度 < 2                    | `correlation` → 0, `beta` → 1, `sharpe` → 0, `maxDD` → 0          |
| 分母為 0 (如波動率全為相同價格) | 觸發 `ZeroVarianceWarning`，並回傳安全的缺省值 (如 $0$)           |

## 3. 效能優化 (Web Worker Offloading)

如果使用者在首頁選了高達 50 檔甚至 100 檔股票的追蹤清單來分析 Correlation Matrix：

- 演算法的複雜度為 $O(N^2 \times T)$ ($N$ = 股票數, $T$ = 時間序列)。
- 前端**不可**直接在 UI 執行緒跑這支檔案，必須實例化一個 Web Worker：
    ```ts
    const worker = new Worker(new URL('../lib/risk-engine-worker.ts', import.meta.url));
    worker.postMessage({ type: 'CALC_MATRIX', payload: matrixData });
    ```
