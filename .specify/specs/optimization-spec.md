# Optimization Specification: Stock Screener Phase 3

## Overview

選股篩選器優化規格，包含效能、功能、UX 與程式碼品質改進。

---

## Requirements

### Performance (P)

| ID | 功能 | 說明 | 優先級 |
|----|------|------|--------|
| P-01 | 結果快取 | `localStorage` 快取 API 結果 | 高 |
| P-02 | 分頁載入 | 結果 > 50 筆時分頁 | 中 |

### Features (F)

| ID | 功能 | 說明 | 優先級 |
|----|------|------|--------|
| F-01 | 預設策略範本 | 一鍵套用常用組合 | 高 |
| F-02 | 排序功能 | 點擊表頭排序 | 中 |
| F-03 | 儲存篩選條件 | 記住使用者設定 | 中 |
| F-04 | 股票連結 | 點擊跳轉個股頁 | 中 |

### Code Quality (Q)

| ID | 功能 | 說明 | 優先級 |
|----|------|------|--------|
| Q-01 | csv-export 測試 | 加入單元測試 | 高 |
| Q-02 | 型別統一 | ScreenerResult 型別 | 中 |

---

## Implementation Priority

1. **Q-01** csv-export.test.ts
2. **F-01** 預設策略範本
3. **F-02** 排序功能
4. **F-04** 股票連結
5. **P-01** 結果快取
6. **F-03** 儲存篩選條件

---

## Success Criteria

- 所有新增功能有對應測試
- 測試覆蓋率維持 > 80%
- UI 互動流暢無延遲
