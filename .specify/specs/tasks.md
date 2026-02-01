# Tasks: Test Coverage Phase 1

## Overview

基於 [improvement-spec.md](./improvement-spec.md) 和 [implementation_plan.md](./implementation_plan.md)，
以下是可執行的任務清單。

---

## Sprint 1: Core Data Layer (P1)

### Task 1.1: database.test.ts
- **File**: `src/lib/database.test.ts` [NEW]
- **Description**: 為 database.ts 建立完整測試套件
- **Sub-tasks**:
  - [ ] Mock sql.js 和 IndexedDB
  - [ ] 測試 initDatabase()
  - [ ] 測試股票資料 CRUD
  - [ ] 測試自選股 CRUD
  - [ ] 測試投資組合 CRUD
  - [ ] 測試錯誤處理
- **Acceptance**: `npm test -- src/lib/database.test.ts` 通過

### Task 1.2: stock-service.test.ts
- **File**: `src/lib/stock-service.test.ts` [NEW]
- **Description**: 為 stock-service.ts 建立測試
- **Sub-tasks**:
  - [ ] Mock database 模組
  - [ ] 測試取得股票列表
  - [ ] 測試搜尋股票
  - [ ] 測試篩選股票
  - [ ] 測試自選股操作
- **Acceptance**: `npm test -- src/lib/stock-service.test.ts` 通過

### Task 1.3: cache.test.ts
- **File**: `src/lib/cache.test.ts` [NEW]
- **Description**: 為 cache.ts 建立測試
- **Sub-tasks**:
  - [ ] 測試快取 set/get
  - [ ] 測試 TTL 過期邏輯
  - [ ] 測試快取清除
- **Acceptance**: `npm test -- src/lib/cache.test.ts` 通過

---

## Sprint 2: External Integration (P2)

### Task 2.1: twse-api.test.ts
- **File**: `src/lib/twse-api.test.ts` [NEW]
- **Description**: 為 twse-api.ts 建立測試，使用 fetch mock
- **Sub-tasks**:
  - [ ] Mock fetch API
  - [ ] 測試成功回應解析
  - [ ] 測試錯誤處理 (timeout, 404, 500)
  - [ ] 測試資料轉換
- **Acceptance**: `npm test -- src/lib/twse-api.test.ts` 通過

### Task 2.2: 擴充 indicators.test.ts
- **File**: `src/lib/indicators.test.ts` [MODIFY]
- **Description**: 增加邊界值測試案例
- **Sub-tasks**:
  - [ ] 空陣列輸入測試
  - [ ] 單一值輸入測試
  - [ ] 極大/極小值測試
- **Acceptance**: 邊界測試通過

### Task 2.3: 擴充 analysis.test.ts
- **File**: `src/lib/analysis.test.ts` [MODIFY]
- **Description**: 增加邊界值測試案例
- **Sub-tasks**:
  - [ ] 負報酬率測試
  - [ ] 單一資料點測試
  - [ ] 零波動率測試
- **Acceptance**: 邊界測試通過

---

## Sprint 3: Performance & UI Optimization (High Priority)

### Task 3.1: Global Mouse Spotlight Optimization
- **File**: `src/layouts/Layout.astro` [MODIFY]
- **Description**: 優化鼠標追蹤效能
- **Sub-tasks**:
  - [ ] 移除 `mousemove` 中的 `querySelectorAll`
  - [ ] 改用 CSS Variables 在 `:root` 或 `body` 層級
  - [ ] 使用 `requestAnimationFrame` 限制更新頻率
- **Acceptance**: 滑動鼠標時 CPU 使用率顯著下降

### Task 3.2: Redundant Script Cleanup
- **File**: All components with scripts [MODIFY]
- **Description**: 修復 SPA 事件疊加問題
- **Sub-tasks**:
  - [ ] 為 `initPage`, `initScreener` 等加入 `data-initialized` 檢查
  - [ ] 統一使用 `document.addEventListener('astro:page-load', ...)`
  - [ ] 移除重複的 `DOMContentLoaded` 監聽
- **Acceptance**: 切換頁面後事件監聽器數量保持穩定

### Task 3.3: Sidebar & Layout Persistence
- **File**: `src/layouts/Layout.astro` [MODIFY]
- **Description**: 優化側邊欄效能與佈局
- **Sub-tasks**:
  - [ ] 為 `#sidebar` 加入 `transition:persist`
  - [ ] 修正 `100vh` 在行動裝置上的佈局跳動 (使用 `dvh` 或 `svh`)
  - [ ] 降低非活動面板的 `backdrop-filter` 級別
- **Acceptance**: 導覽時側邊欄不閃爍且互動流暢

---

## Verification

**效能檢查：**
- [ ] Lighthouse 效能分數 ≥ 90
- [ ] Chrome DevTools > Performance > Main Thread 無紅色阻塞區

**成功標準：**
- [ ] 所有測試通過
- [ ] 頁面切換無卡頓
- [ ] 滑鼠特效流暢
- [ ] 無 TypeScript 錯誤
