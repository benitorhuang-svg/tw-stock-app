# 005 — 籌碼面進出走勢分頁 (Institutional Chips Tab)

## 1. 頁面定位與價值邏輯

台股的精髓在於高度透明的籌碼動向。本分頁的任務只有一個：**讓股價與大資金進出產生視覺上的強烈「背離感」**。使用者無需去核對外資買了幾張，而是要一眼看出「股價在下跌的紅K棒中，但三大法人的綠色買超柱狀體卻在連續長高」這種偷偷吸籌碼的買點。

## 2. 視覺佈局與雙軸顯示 (Dual-Axis Layout)

**背景與風格**：全站一致深暗色，針對此分頁強調極高的顏色對比度。三大法人有專屬的語意色。

**佈局架構 (Grid `gap-6` 滿版)**：

- **頂層：籌碼動能儀表板 (Institutional Momentum Cards, `grid-cols-4`)**
    - 分別為：外資 (Foreign), 投信 (Investment Trust), 自營商 (Dealer), 融資券 (Margin/Short)。
    - 卡片設計為 **Glassmorphism 帶狀條 (Pill Shape)** 而非龐大方塊，高度降低 `h-16`。
    - 不只顯示昨日買賣超張數，還利用迷你折線 (Sparkline) 標示出「近 5 日累積淨變化曲線」，快速定調大戶偏多還是偏空。
- **核心：超大型複合背離圖 (Combo Divergence Chart, `h-[400px]`)**
    - **雙 Y 軸 (Dual Y-Axis)**設計：
        - 左側 (Left Y)：收盤價位 (`Line Series`)，顏色採用極亮的黃金/電光藍色。
        - 右側 (Right Y)：買賣超總張數 (`Stacked Bar Series`)。
    - **長條圖堆疊 (Stacked Bars)**：
        - 每日的三法人買賣超將採用**堆疊長條圖 (Stacked Column)**。
        - **正值區塊 (零軸之上，紅色漸層)**：代表買超。外資放最底層 (暗紅)、投信第二層 (赤紅)、自營最上層 (亮紅)。
        - **負值區塊 (零軸之下，綠色漸層)**：代表賣超。
    - **視覺印證 (Visual Correlation)**：當股價線與柱狀體走向相反時（例如線往下彎，但紅色柱體很大），使用者一眼就能看出背離。
- **底端：籌碼集中度/散戶大戶版圖 (Ownership Pie Charts, `flex row`)**
    - 左側：400張以上大戶持股比率 歷史趨勢折線。
    - 右側：最新的千張大股東 vs 50張以下散戶分佈圓環圖。

## 3. 狀態與微動效 (Status & Micro-Animations)

- **Hover Crosshair (高度互動)**：
    - 這是一個資料極度密集的圖。當 Hover 到複合圖表的任何一根柱子時，彈出的 Tooltip 必須是**黑底白邊框的高級選單**，列出當日的：(1) 收盤價, (2) 外資淨買超, (3) 投信連買天數, (4) 自營商淨額。四個數據絕對對齊，數字使用 Monospace。
- **Loading & Transitions**：
    - API 取得資料前，畫面展示三個橫向波動的骨架屏波段 (Sine wave skeleton loader)。
    - 從別的分頁切換進來時，折線會透過「繪圖動畫 (`stroke-dashoffset` 或 ECharts animation)」從左向右展開，柱狀圖則從零軸長出。

## 4. 核心元件與 Props (Component Architecture)

- **`ComboDivergenceChart.tsx` (Organism)**
    - Props: `dates: string[], prices: number[], foreign: number[], trust: number[], dealer: number[]`
    - 核心繪圖邏輯：這是極少數無法單純靠原生 CSS 完成，必須倚重大量 ECharts 或 Highcharts 設定檔來混合 Line/StackBar/DualAxis 的元件。
- **`ChipMomentumCard.tsx` (Molecule)**
    - Props: `entityName: '外資' | '投信', currentNet: number, trendLine: number[]`
    - 若 `currentNet > 0`，發光外框 `shadow-[0_0_10px_rgba(239,68,68,0.3)]`，反之亦然。
