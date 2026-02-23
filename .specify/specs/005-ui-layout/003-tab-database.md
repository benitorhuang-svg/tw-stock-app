# 003 — 數據觀測與完整性分頁 (Data Explorer Page)

## 1. 頁面定位與觀測本質
「數據觀測 (Data Explorer)」是一個為進階使用者、工程師與量化投資人設計的底層檢查站。借鑒 `phpMyAdmin` 與 `DataGrip` 的設計，這不是一個花俏的圖表，而是一個「極度緊湊 (Compact) 的真理探測器」。其核心任務是讓使用者驗證底層 SQLite 資料庫的完整性（Null 檢查、最後更新日期、型別是否正確）。只有當數據被確認為健康，後續的分析圖表才有意義。

## 2. 雙欄佈局設計與狀態管理 (Layout & States)
**整體架構：`div.flex.h-full` (Split Window: `w-64` Sidebar + flex-1 Main Content)**

- **左側邊欄：資料表導覽樹 (Tree Navigator, width: `256px`)**：
  - **視覺系統**：深灰色背景 `bg-slate-900`，右側帶有極細的一條光暈邊界 `border-r border-slate-800`。
  - **資料表清單 (Table List)**：`ul` 垂直排列。包含：`daily_quotes`, `institutional_investors`, `market_breadth` 等。
  - **微互動 (Micro-interaction)**：
    - 未選取：`text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors`
    - 已選取 (Active)：背景轉為深藍微光 `bg-blue-900/30 text-blue-400 border-l-[3px] border-blue-500`。
  - **資料數 (Rows Badge)**：表名右側的微型徽章 `span.text-[10px].bg-slate-800.rounded-full`。若資料為 0 顯示紅色。
- **右側主工作區：檢視器 (Data Viewer, `flex-1 flex col`)**：
  - **頂部操作列 (Toolbar, `h-14`)**：顯示大寫的表名。右側包含分頁 `Limit: 50 | 100` 下拉選單與搜尋框。
  - **高密度表格核心 (Data Grid, `flex-1 overflow-auto`)**：
    - 表頭 (Thead)：固定於頂部 `sticky top-0 bg-slate-900/90 backdrop-blur`。採用 `text-xs uppercase tracking-wider`，並會在名稱下方顯示型別 (如 `int`, `real`, `text`)。
    - 表格主體 (Tbody)：採用極小的 padding (`px-3 py-1.5`) 以增加可視行數。斑馬紋 `even:bg-slate-800/20`。
    - **健康度高亮 (Validation UI)**：若遇見異常 Null，儲存格背景會自動轉為 `bg-red-950/50 border border-red-500/50 text-red-500` 來做視覺警告。

## 3. 狀態加載與 API 設計 (API & Data Fetching)
- **Table Data API**：透過 `GET /api/db/:tableName?limit=100&offset=0` 取得內容與總筆數。
- **Loading State (載入過場)**：
  - 右側表格使用 10 行交替的骨架屏行 (Skeleton Rows `animate-pulse h-6 bg-slate-800/80 my-2`)。
  - 左側邊欄點擊後，觸發極短暫但明確的頂部進度條 (NProgress: `h-[2px] bg-blue-500 absolute top-0 left-0 animate-[shimmer_1s_infinite]`)。
- **Error Handling (錯誤攔截)**：
  - 若 SQLite 資料庫因正在爬蟲而被 locked，介面進入 Error Boundary，置中顯示一個巨型的紅框訊息：「Database is currently locked by a background worker. 🔄 [Retry]」。

## 4. 核心元件與 Props (Component Architecture)
- **`DatabaseLayout.astro`** (Page wrapper)
- **`TableTreeSidebar.tsx`**
  - Props: `tables: DBTableInfo[], activeTable: string, onSelect: (table: string) => void`
  - 狀態管理：維持在一個 client-side React 組件，避免刷新整個 Astro 頁面，實作 SPA 等級的換表體驗。
- **`DataTableGrid.tsx`**
  - Props: `columns: DBColumnDef[], rows: any[], isLoading: boolean`
  - 需要實作水平滾動 (`overflow-x-auto`) 與首欄 (如 ID 或是 Date) `sticky left-0` 的固定視窗。
- **`HealthIndicatorBadge.tsx`**
  - 即時分析回傳的前 100 筆資料，如果最新一筆的時間戳章早於 `Date.now() - 48h`，則亮出「Data Outdated 🟠」的警告標籤。
