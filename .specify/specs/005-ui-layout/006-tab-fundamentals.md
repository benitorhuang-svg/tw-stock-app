# 006 — 基本面與估值分頁 (Fundamentals & Valuation Tab)

## 1. 頁面定位與真實防護網
這是給長期價值投資者 (Value Investors) 的避風港。本頁的價值不在於短線進出，而是將冰冷、遲滯的季報或月營收，利用嚴密的演算法轉換為**立體的安全氣囊 (Valuation River Chart)**與**動能光譜 (Momentum Heatmap)**。

## 2. 視覺佈局與雙視界 (Dual-Horizon Layout)
**背景與空間**：維持 Cyber-Premium 的深色調，本頁面強調**區塊式拼圖**，利用 `Grid` 緊湊呈現四種截然不同的資料面貌。

- **上半局：河流估值系統 (Valuation River Horizon, 佔比 `h-1/2`)**：
  - 左側為控制器 (`w-48`)，切換 **P/E (本益比)** 與 **P/B (股價淨值比)**，並選擇年限 `1Y | 3Y | 5Y`。
  - **極致波浪系統 (River Chart Overlay)**：
    - 這裡不是單純的柱狀圖。背景由五條連續平滑的通道區間 (Bands) 組成：
      - `深紅 (昂貴/泡沫區)` > `淺紅` > `灰色 (均衡區)` > `淺綠` > `深綠 (便宜/超跌區)`。
    - 通道的寬度與斜率依據過去每季更新的 EPS/淨值 動態曲變。
    - 白色發光的「歷史股價」如同一條金槍魚游梭在多層的流域中。若股價衝破紅線，圖表甚至能在該區塊產生微紅暈警告。
- **左下局：營收動能發電機 (Revenue Momentum, 佔比 `col-span-1`)**：
  - 放棄死板的表格。排出一列緊密的微型直條圖 (`Sparkbars`) 代表過去 12 個月的營收。
  - 每根直條圖背後，會疊加一條「年增率 (YoY)`」的紫色折線。
  - 當連續 3 個月 YoY 攀升時，在圖表右上角壓印一個帶有發亮動效的 `Accelerating 🚀` 標籤。
- **右下局：財務體檢雷達 (Financial Health Matrix, 佔比 `col-span-1`)**：
  - **三率走勢 (The Triple Margins Line)**：一張小巧精緻的折線圖，同步呈現 毛利率、營業利益率、純益率 的季變化。若三線同時上揚 (三率三升)，背景點亮綠色光暈。
  - **健康度矩陣徽章 (Badges)**：用極簡的膠囊型徽章 (`rounded-full px-3 py-1`) 列出：ROE, 流動比, 負債比。數值處於危險範圍 (例如 ROE < 8%) 呈現 `border-yellow-500 text-yellow-500`。

## 3. 數學演算與前端渲染效能 (Math & Render)
- **Valuation River 數學推演**：前端不負責撈取 10 年 EPS 慢慢算。這部分必須由後端 API 直接回傳 `UpperBand`, `MidBand`, `LowerBand` 的每日 Series Data 陣列，前端只負責處理疊加區域顏色 (`fill` / `areaStyle`)，確保圖表維持 `60FPS` 以上的算繪速度。
- **Tooltips 與對齊 (Alignment)**：河流圖上的 Tooltip 必須極為智慧。當指到 2023-08-01 時，Tooltips 會同時顯示：「當日收盤價: 150，剛好落在 12 倍 P/E (綠色水域)，當季 EPS: 12.5」。把原本要在財報中自己翻找的數學直接算給用戶看。

## 4. 組件實體與 Props 規範
- **`ValuationRiverChart.tsx` (Organism)**
  - Props: `type: 'pe' | 'pb', priceSeries: [], bandSeries: { bandLevel: number, values: [] }[]`
  - 使用 ECharts 的 `stack` 或 `area` 功能，並加上 `opacity: 0.1 ~ 0.3` 實作深淺不同的流域色階。
- **`RevenueMomentumSpark.tsx` (Molecule)**
  - 輕量化元件，純粹用來檢測「營收轉折點」。
- **`MarginTrendLine.tsx` (Molecule)**
  - 同時傳入毛利/營利/純益三條線，著重於線條的交纏狀態 (Crossover)。
