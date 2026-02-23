# 004 — 技術面整合分頁 (Technical Analysis Tab)

## 1. 頁面定位與圖表哲學
廢除傳統金融網站將指標切為破碎頁籤的弊病。本分頁的設計哲學是：「**一張無邊際的主力畫布 (Infinite Canvas)**」。讓使用者能在同一個時間軸 (X-Axis) 上，利用疊層 (Overlay) 與垂直副圖 (Sub-charts) 將所有技術訊號整合。這是對齊 TradingView 專業版 `Advanced Charting` 的最高級 UX。

## 2. 視覺佈局與 Z 層級堆疊 (Z-Axis UI)
**背景與空間**：一個沒有任何留白的黑色方盒 (`bg-[#050914] w-full h-[calc(100dvh-72px)]`)，徹底沉浸在紅綠 K 棒之中。

- **浮動圖表控制列 (Floating Toolbar, `z-40 absolute top-4 left-4`)**：
  - 用半透明玻璃磨砂藥丸形狀 (`rounded-full bg-slate-800/70 backdrop-blur-md px-4 py-2 border border-slate-600/50`) 容納切換按鈕。
  - 時間極距 Dropdown：`15M | 60M | 1D | 1W | 1M`。
  - 指標 Checkbox (Overlays)：`均線 (MAs)`, `波浪繪製 (Elliott Wave)`, `撐壓線 (S/R Lines)`。
- **核心主圖表 (Main Chart Canvas, 占比 100% 寬, 可拖曳高度比例)**：
  - K線 (Candlesticks)：使用高飽和紅 (`#ef4444`) 與綠 (`#22c55e`)。邊線清晰。
  - **成交量 (Volume Overlay)**：與 K線共用同一個視窗，貼齊底部，最高不超過畫面高度的 25%。顏色採用極低透明度 (如 `opacity-20`) 以免遮擋 K 棒。
  - **波浪理論 (Wave Drawing)**：當啟用時，K線圖的高低折返點之間，繪製帶有閃爍節點 (`animate-pulse`) 的白色連接線，清楚標註 `W1 ~ W5` 及 `A-B-C` 浪，並展開半透明的費波那契 (Fibonacci) 回撤帶狀區塊。
- **副指標圖表群 (Sub-indicator Stack, 自下而上堆疊)**：
  - 與主圖共用相同的 X 軸，並以非常細的水平發光線 (`border-t border-slate-700/50`) 作為分隔。
  - 可以透過右上角的管理面板新增：**MACD**, **KDJ**, **RSI**。
  - 每個副圖表的左側具有十字星拖曳手柄 (`cursor-ns-resize`)，使用者能動態調整各圖表的上下比例 (Flex-grow proportions)。

## 3. 資料來源與狀態同步 (Data Synchronization)
- **Time Sync (時間軸鎖定)**：跨組件同步 (Cross-chart correlation)。當在主 K 線圖上使用滑鼠滾輪縮放 (Zoom) 或者拖曳平移 (Pan) 歷史範圍時，所有的副圖標 (MACD、KD) 必須透過 Chart API 發送 `visibleRangeChanged` 事件，在 `16ms (60FPS)` 內同步對齊 X 軸。
- **Crosshair (全局十字線)**：游標懸停在任何圖表，均出現一條貫穿主副圖表的白色虛線，同時在所有資料卡片 (Legend) 上呈現「該分鐘/該日」的絕對極精確數值。

## 4. 核心元件與 Props (Component Architecture)
- **`AdvancedChartEnginer.tsx` (Organism)**
  - 強制依賴 `lightweight-charts` 或 `echarts`。在此元件層級實例化。
  - Props: `symbol: string, seriesData: OHLCV[], indicators: ActiveIndicator[]`
- **`OverlayControls.tsx` (Molecule)**
  - 觸發 `dispatch({ type: 'TOGGLE_WAVE_THEORY' })` 到全局圖表狀態管理系統 (Zustand 或 Nano Stores)。
- **`IndicatorPane.tsx` (Sub-component of Engine)**
  - 動態接收 `IndicatorType` 屬性，繪製如 `MACD` 中的 DIF 與 Histogram（零軸正上顯示 `bg-red-500`，零下顯示 `bg-green-500`）。
- **載入狀態 (Loading)**：
  - 由於圖表繪製吃重，若 `seriesData.length === 0`，全螢幕置中顯示打字機特效的 "Initializing Charting Engine..."。
