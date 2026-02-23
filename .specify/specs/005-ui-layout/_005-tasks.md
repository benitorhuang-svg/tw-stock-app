# 任務清單: 005-ui-layout — UI/UX 優化與修復

**輸入**: `_005-plan.md` + `_005-clarification.md`
**日期**: 2026-02-23

---

## 第一階段：安全修復 (P0)

- [x] T001 修復 DB Explorer XSS — `database.astro` innerHTML escape
  - 檔案: `src/pages/database.astro`
  - 新增 `escapeHtml()` 工具函式，所有 cell value 渲染經過 escape

---

## 第二階段：功能完整性 (P1)

- [x] T002 非功能性按鈕改為 disabled 提示 — `[symbol].astro`
  - 檔案: `src/pages/stocks/[symbol].astro`
  - 「⭐ 加入自選」與「🤖 AI 分析報告」加 `disabled` + tooltip "即將推出"

- [x] T003 Stock list 加 Load More 分頁
  - 檔案: `src/pages/stocks/index.astro`
  - 初始載入 50 筆，點擊 "載入更多" 每次增加 50 筆

- [x] T004 Tab 狀態保存到 URL Hash
  - 檔案: `src/components/organisms/TabBar.astro`
  - 從 `location.hash` 初始化 active tab，切換時更新 hash

---

## 第三階段：無障礙與體驗 (P2)

- [x] T005 全站 focus-visible 樣式
  - 檔案: `src/styles/global.css`
  - 加 `:focus-visible` ring style 到 button, a, input, select

- [x] T006 色彩對比提升 (WCAG AA)
  - 檔案: `src/styles/global.css`
  - `--color-text-muted` 亮度從 40% → 55%

- [x] T007 Dashboard 空狀態 Fallback
  - 檔案: `src/pages/index.astro`
  - 當 `totalStocks === 0` 時顯示 "暫無市場資料" 提示

- [x] T008 Mobile DB Explorer sidebar
  - 檔案: `src/pages/database.astro`
  - mobile 時 sidebar 加 toggle button，預設收合

---

## 第四階段：程式碼品質 (P3)

- [x] T009 Stock detail 查無股票提示
  - 檔案: `src/pages/stocks/[symbol].astro`
  - 當 price === 0 且非手動建的 fallback 時顯示 "查無此股票資料"

- [x] T010 TabBar 鍵盤導覽 (Arrow keys)
  - 檔案: `src/components/organisms/TabBar.astro`
  - 支援左右方向鍵切換 tab + `aria-selected`
