# 實作計畫: 005-ui-layout — UI/UX 優化與修復

**分支**: `005-ui-optimization` | **日期**: 2026-02-23 | **規格書**: `.specify/specs/005-ui-layout/`
**輸入**: 來自 `_005-clarification.md` 的問題清單 + 全站 UI 審查

## 摘要

針對目前 TWStock PRO 應用程式執行全面 UI/UX 修復與優化，涵蓋：
1. **安全修復** — DB Explorer XSS 漏洞
2. **功能補全** — 非功能性按鈕、分頁、Tab 狀態保存
3. **無障礙改善** — 鍵盤導覽、Focus 樣式、色彩對比
4. **使用者體驗** — 空狀態 UI、Error 回饋、Mobile 適配
5. **程式碼品質** — ErrorBoundary 整合、未使用元件清理

## 技術脈絡

**語言/版本**: TypeScript 5.9 + Astro 5.16  
**主要依賴**: Tailwind CSS v4, better-sqlite3, vanilla JS (無前端框架)  
**儲存**: SQLite (stocks.db) + JSON snapshots (public/data/)  
**測試**: vitest + happy-dom  
**目標平台**: 現代瀏覽器 (Chrome 90+, Safari 15+, Firefox 90+)  
**效能目標**: LCP < 2s, FID < 100ms, CLS < 0.1  
**約束條件**: 100% Astro components (無 React island), SSR-only mode

## 修復範圍與優先級

### P0+：資料接線與功能擴充（2026-02-23完成）
1. 真實財報 & 籌碼資料接線
2. 技術圖改用歷史價格 + MACD
3. Ctrl+K 搜尋、Toast 通知、CSV 匯出、PWA、效能偵測、即時報價


### P0: 安全 (必須立即修復)
1. **DB Explorer XSS** — `database.astro` 的 `innerHTML` 渲染未 escape 的 cell value

### P1: 功能完整性
2. **非功能性按鈕** — 「⭐ 加入自選」與「🤖 AI 分析報告」需有實際行為或改為 disabled 提示
3. **Stock list 分頁** — 移除 `.slice(0, 100)` 硬限，改用 Load More 或無限捲動
4. **Tab 狀態 URL Hash** — 從 URL hash 讀取/寫入 active tab，支援瀏覽器前進/後退

### P2: 無障礙與體驗
5. **鍵盤 Focus 樣式** — 所有互動元素加 `focus-visible` outline
6. **色彩對比提升** — `text-text-muted` HSL 40% → 55% 以通過 WCAG AA
7. **空狀態 Fallback** — Dashboard、Stock list 加空資料提示
8. **Mobile DB Explorer** — sidebar 改為 collapsible drawer

### P3: 程式碼品質
9. **ErrorBoundary 整合** — 在所有頁面 layout 內包裝
10. **未使用元件標記** — 加 `@deprecated` 註解或移除

## 專案結構

### 原始碼修改清單

```text
src/
├── pages/
│   ├── database.astro          # P0: XSS fix + P2: mobile sidebar
│   ├── index.astro             # P2: 空狀態 fallback
│   ├── stocks/
│   │   ├── index.astro         # P1: 分頁 / Load More
│   │   └── [symbol].astro      # P1: 按鈕行為 + Tab hash
├── layouts/
│   └── MainTerminal.astro      # P2: focus styles
├── styles/
│   └── global.css              # P2: 色彩對比 + focus-visible
└── components/
    └── organisms/
        └── TabBar.astro        # P1: hash-based tab switching
```
