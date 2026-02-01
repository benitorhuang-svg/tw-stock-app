# Performance & UI Interaction Specification

**Created**: 2026-02-01  
**Status**: Draft  
**Priority**: High  
**Depends On**: [baseline-spec.md](./baseline-spec.md)

## Overview

本專案在實作了複雜的玻璃擬態 (Glassmorphism) 與終端機美學後，出現了明顯的性能衰退與 UI 互動卡頓。
本規範定義性能優化目標與 UI 互動改進計畫，以確保在維持高規格視覺效果的同時，擁有流暢的點擊與導覽體驗。

## Problem Statements

### P-01: Mouse Move Overload (鼠標跟隨效能瓶頸)
- **現象**: 滑動鼠標時，CPU 使用率激增，介面出現微小卡頓。
- **原因**: `Layout.astro` 中的 `mousemove` 監聽器頻繁執行 `querySelectorAll('.glow-effect')`，導致大量 DOM 查詢與樣式重繪。

### P-02: Component Re-init Loop (組件重複初始化)
- **現象**: 使用 SPA 導覽時，頁面反應越來越慢，且部分按鈕點擊多次才反應。
- **原因**: 每個組件在 `astro:page-load` 時重新掛載事件，但未檢查是否已存在，導致事件監聽器堆疊 (Event Listener Stacking)。

### P-03: Heavy Backdrop Blur (背景模糊過重)
- **現象**: 在較舊裝置或高解析度螢幕上，捲動與動畫掉幀。
- **原因**: 過度使用 `backdrop-filter: blur(24px)`，且玻璃面板層級過多，增加 GPU 渲染負擔。

### P-04: Layout Jump & Interaction Blocks (版面跳動與點擊阻擋)
- **現象**: 點擊側邊欄或搜尋列無反應。
- **原因**: 佈局變數缺失導致寬度計算錯誤，或隱形遮罩層 (Overlay) 擋住點擊區域。

## Success Criteria

- **SC-001**: **Lighthouse Performance Score ≥ 90**。
- **SC-002**: 滑鼠移動時，Main Thread 占用率降低 50% 以上。
- **SC-003**: 頁面切換時間 (SPA Navigation) < 300ms。
- **SC-004**: 所有互動元素 (Buttons, Links) 響應延遲 < 100ms。
- **SC-005**: 解決事件監聽器堆疊問題。

## Optimization Requirements

### R-01: Throttled Event Handling
- 必須使用 `requestAnimationFrame` 或 Throttle 技術限制 `mousemove` 事件處理頻率。
- 嚴禁在 `mousemove` 回調中執行 `querySelectorAll`。

### R-02: Safe Initialization (Idempotent)
- 所有 JS 初始化函式須具備冪等性 (Idempotency)，確保重複執行不影響效能。
- 採用單一全域事件委派 (Event Delegation) 減少監聽器數量。

### R-03: Persistent Sidebar
- 側邊欄應使用 `transition:persist`，避免在導覽時重新渲染。

### R-04: GPU & Rendering Refinement
- 針對 `glow-effect` 使用 `will-change: transform`。
- 在移動端或低效能模式下，自動降低 `backdrop-filter` 強度。

## Component specific fixes

- **Heatmap**: 減少同步渲染的節點數量，或使用 Canvas 渲染大量股票區塊。
- **StockScreener**: 優化搜尋過濾邏輯，避免在大數據集下阻塞主線程。
