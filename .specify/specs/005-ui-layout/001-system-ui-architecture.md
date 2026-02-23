# 001 — 全站佈局架構與重構守則 (System UI Architecture & Premium Policy)

> 本文件整合了全站的「宏觀佈局模型」、「頁面動線 (Site Map)」、「狀態管理策略」與「破壞性重構守則」。旨在確保「高級金融終端 (Premium Financial Terminal)」的跨裝置體驗一致性、極致的 UX 設計與強健的軟體工程架構。

## 一、宏觀佈局模型與視窗層級 (Macro Layout & Z-Index)

系統採用「**類應用程式 (Application-like)**」佈局，滿版螢幕設計，杜絕傳統網頁的全頁滾動，帶來沉浸式體驗。
- **全局尺寸約束**：`width: 100vw; height: 100dvh; overflow: hidden; bg-slate-950 text-slate-50`
- **局部滾動 (Local Scroll)**：僅在特定的資料面板/過濾清單內實作自定義滾動條 (`scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent`)。
- **桌面端 (>1024px)**：`頂部導航 (Top Navigation) + 主工作區 (Main Workspace)`。頂部包含 Logo、主頁籤與全域搜尋 (`Ctrl+K` 綁定 `GlobalCommandPalette`)。
- **行動端 (<768px)**：保留極簡頂部，加入響應式底部分頁導航 (Bottom Navigation Bar, 高度 `h-16`)。支援原生的滑動手勢 (Swipe Gestures)。

**微互動與視窗層級 (Z-Index Hierarchy)**：
- `z-50`：全域彈窗 (Modals, Dialogs)、指令盤 (Ctrl+K)、Toast 通知系統。
- `z-40`：浮動篩選面板 (Floating Filters)、絕對定位的下拉選單 (Dropdowns)。
- `z-30`：頂部全域導航列 (Top Nav) 與Sticky Table Headers (`backdrop-blur-md`)。
- `z-20`：主工作區的玻璃擬態卡片 (Glassmorphism Cards)。
- `z-10`：背景裝飾 (像是模糊的漸層發光球體 `bg-blue-500/10 blur-[100px]`)。

---

## 二、高級視覺化設計系統 (Premium Design Tokens)

所有重構的元件嚴格遵守以下 Tailwind CSS 規範：

- **Glassmorphism (玻璃擬態背景)**：
  - 預設卡片：`bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/50`
  - 聚焦卡片 (Hover)：`hover:bg-slate-800/80 hover:border-white/10 transition-all duration-300`
- **Typography (字體系統)**：
  - 數值/報價 (Monospace 數字)：`font-mono tracking-tight font-semibold`
  - 標題 (Sans Serif)：`font-sans font-medium text-slate-100`
  - 輔助說明：`text-sm text-slate-400`
- **Color Semantics (語意色彩)**：
  - 看多/漲/正面 (Bullish)：`text-red-500` / 背景 `bg-red-500/10 border-red-500/20` (符合台股紅漲慣例)
  - 看空/跌/負面 (Bearish)：`text-green-500` / 背景 `bg-green-500/10 border-green-500/20` (符合台股綠跌慣例)
  - 警示/異常 (Warning)：`text-yellow-500`
  - AI 生成內容 (GenAI)：`bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent`

---

## 三、狀態管理與轉場策略 (State Management & Transitions)

- **跨分頁狀態共享 (Nano Stores)**：由於系統建立在 Astro 上，不同 Tab 切換與元件之間的狀態交流必須使用 `@nanostores/react`。例如：當前選擇的「時間範圍 (Timeframe)」或「連線狀態」統一存在 Store 中。
- **Data Fetching States (資料加載)**：
  - *Loading*：統一使用閃爍的骨架屏 (Skeleton Screens: `animate-pulse bg-slate-800 rounded`)，禁用傳統的旋轉 Loading Icon。
  - *Empty/Error*：提供精緻的 Empty State 組件，包含模糊的背景圖與動作按鈕（如：重新整理、檢查網路連線）。
- **Page Transitions (頁面轉場)**：啟用 Astro 的 `View Transitions API`。在 Tab 切換時加入輕微的淡入與位移：`animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out`。

---

## 四、UI 重構與淘汰守則 (Clean-Slate Policy)

為確保專案程式碼無負債，我們實行「**破壞性重構 (Clean-Slate Rebuild)**」：
1. **完全刪除授權**：若舊有版面不符合上列的佈局與設計系統，開發者 (包含 Agent) 被授權直接刪除舊 DOM 結構與相關 CSS，無須猶豫。
2. **規格外即刪除**：畫面上若出現任何未記錄在 `.specify/specs/` 系列文件內的冗餘按鈕或區塊（如無效的「更多」按鈕、隨意疊加的文字），無條件刪除，以保畫面高級緊湊感。
3. **從底層刻劃**：絕不在爛 Code 上面加上 `!important` 覆寫。遇到不良結構，先砍掉原來的 `<div>` 叢林，再用乾淨的 Tailwind Flex/Grid 重寫。
