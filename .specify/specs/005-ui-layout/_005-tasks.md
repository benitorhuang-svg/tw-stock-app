# 任務清單: 005-ui-layout (M5 終端介面與極速體驗)

**分支**: `005-ui-layout`
**輸入**: 來自 `.specify/specs/005-ui-layout/` 的設計文件

---

## 第一階段: 核心佈局與設計系統 (Layout & Styles)

**目標**: 建立 Cyber-Premium 玻璃擬態視覺規範。

- [x] **T031** 在 `src/styles/` 定義 Design Tokens (顏色、間距、Blur 效果)。
- [x] **T032** 建立 `src/layouts/MainTerminal.astro` 全局外殼。
- [x] **T033** 配置 `astro:transitions` 實現無縫頁面切換。

## 第二階段: 原子化組件實作 (Atoms to Organisms)

**目標**: 打造高效能、高質感的資料展示元件。

- [x] **T034** 實作 `src/components/organisms/MarketBreadth.astro` 大盤儀表。
- [x] **T035** 實作 `src/components/organisms/MoversPanel.astro` 強勢/弱勢股排行。
- [x] **T036** 實作 `src/components/organisms/StockCard.astro` 個股資訊卡。
- [x] **T037** 加入骨架屏 (`Skeleton`) 防止資料載入時的 Layout Shift。

## 第三階段: 功能分頁與數據串接 (Pages & Integration)

**目標**: 完全串聯 M1~M4 資料流入介面。

- [x] **T038** 完成 `src/pages/index.astro` 總覽看板。
- [x] **T039** 實作 `src/pages/stock/[symbol].astro` 帶有 5 大技術頁籤的個股診斷頁。
- [x] **T040** 完成 `src/pages/screener.astro` 選股器互動介面。

---

_最後更新: 2026-02-23_
