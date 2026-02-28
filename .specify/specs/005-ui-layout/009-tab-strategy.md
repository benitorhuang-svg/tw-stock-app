# 009 — 策略回測分頁 (Strategy Backtest Tab)

> 作為專業量化分析終端，本分頁將負責提供使用者「視覺化」的策略模擬與最佳化環境，結合 M2 提供的 `backtest-engine` 與 Worker 效能剝離機制。

## 1. 職責與定位 (Position & Role)

本頁面位於 `/strategy` 路由下，為「戰略與回測」專屬的視窗：

- **互動參數**：承接選股器概念，利用 `StrategyFilterMatrix.svelte` 動態滑桿。
- **即時回饋**：滑動參數不需按「送出」，`StrategyMonitor` 右側的熱力圖與資產曲線馬上跟著波動重繪。
- **洞察下鑽**：點擊歷史明細時，能直接查看當下 K 線與買賣標記點。

## 2. 佈局結構 (Layout Structure)

本分頁與其他分析頁面相同，具備高密集的 Terminal UI 質感：

```html
<MainTerminal>
    <div class="flex">
        <!-- 左欄：參數調整與總結數據 -->
        <StrategySidebar>
            <StrategyFilterMatrix vertical />
            <SimulationRunStatus />
        </StrategySidebar>

        <!-- 右欄主視窗：回測視覺化與明細 -->
        <StrategyMonitor>
            <!-- Section 1: 核心指標 (Sharpe, MaxDD, WinRate, PF) -->
            <CoreMetricsBanner />

            <!-- Section 2: 資金曲線 (Equity Curve) -->
            <EquityCurveChart />

            <!-- Section 3: 績效熱力圖 (BacktestHeatmap) -->
            <BacktestHeatmap />

            <!-- Section 4: 可展開的歷史交易明細 -->
            <TradeHistoryAccordion />
        </StrategyMonitor>
    </div>
</MainTerminal>
```

## 3. 核心組件規格 (Key Components)

### 3.1 `StrategyMonitor.svelte` (動態樞紐)

這不再只是靜態皮囊。它負責發送參數給 `backtest.worker.ts`，並收取結果陣列。此組件掌管著 Loading 狀態，以及何時該重繪下方所有圖表。

### 3.2 `EquityCurveChart.svelte`

- 起始資金預設為 100 萬。
- X 軸為時間 (日期)，Y 軸為當下總資產。
- 曲線下方面積需帶有漸層光暈，若結算為正值，以綠色 (`bullish`) 光暈渲染；若結算為負，以紅色 (`bearish`) 光暈渲染。

### 3.3 `BacktestHeatmap.astro / .svelte`

把舊有的假資料 `generateMockData` 完全根除。

- 接收 `Trades` 陣列產出，根據進場日期分裝到 Year / Month 桶子。
- 顏色邏輯不變，維持現有亮眼且層次分明的深淺玻璃色塊。

### 3.4 買賣點圖表 (`ForensicTrendChart`)

- 歷史交易列表點開時，要秀出帶有箭頭的 K 線圖。
- 在 Entry Price 的日期與價格標註 **✨ Buy (Green Arrow)**。
- 在 Exit Price 的日期與價格標註 **🔥 Sell (Red Arrow)**。

## 4. 動線與微動效 (UX & Motion)

- **無縫刷新 (Seamless Recalc)**：當參數改變而重算導致 UI 更新時，不應整塊白屏。原本的熱力圖要壓淡 (`opacity-50`) 並加上掃描光束 (`animate-pulse`)，直到 Worker 算完把新資料注入，才用 300ms 大草原般地將數字翻過來 (Framer Motion 或 Svelte Transition)。
- **Sticky Sidebar**：使用者在看落落長的歷史訂單時，左側指標列與滑桿必須固定在頁面最前端。
