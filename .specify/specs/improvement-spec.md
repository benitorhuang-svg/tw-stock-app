# Improvement Specification: Test Coverage & Code Quality

**Created**: 2026-02-01  
**Status**: Draft  
**Priority**: High  
**Depends On**: [baseline-spec.md](./baseline-spec.md)

## Overview

基於基線規範識別的改進需求，本規範定義測試覆蓋率提升與程式碼品質改進計畫。

## User Scenarios & Testing

### User Story 1 - 技術指標計算可靠性 (Priority: P1)

身為開發者，我需要確保所有技術指標計算函式都有完整的單元測試，以避免計算錯誤影響使用者決策。

**Why this priority**: 技術指標（MA, RSI, MACD, KD, Bollinger）是核心功能，計算錯誤會直接影響投資決策。

**Independent Test**: 可透過執行 `npm test -- src/lib/indicators.test.ts` 獨立驗證。

**Acceptance Scenarios**:
1. **Given** indicators.ts 中的 SMA 函式, **When** 輸入 [10,20,30,40,50] 計算 3 日均線, **Then** 輸出 [30, 40]
2. **Given** RSI 函式, **When** 輸入上漲/下跌序列, **Then** 輸出在 0-100 範圍內的正確值

---

### User Story 2 - 資料庫操作穩定性 (Priority: P1)

身為開發者，我需要確保 SQLite 資料庫操作（CRUD）都經過測試，以避免資料遺失或損壞。

**Why this priority**: database.ts 是資料持久化的核心，目前無任何測試。

**Independent Test**: 可透過模擬 sql.js 環境執行測試。

**Acceptance Scenarios**:
1. **Given** 空的資料庫, **When** 初始化 schema, **Then** 所有表格正確建立
2. **Given** 現有資料, **When** 執行 CRUD 操作, **Then** 資料正確保存與讀取

---

### User Story 3 - API 錯誤處理 (Priority: P2)

身為使用者，我需要在 TWSE API 失敗時看到清楚的錯誤訊息，而非空白頁面。

**Why this priority**: twse-api.ts 是外部依賴，需要處理網路錯誤、逾時等情境。

**Acceptance Scenarios**:
1. **Given** TWSE API 回應 timeout, **When** 請求即時報價, **Then** 顯示「連線逾時」錯誤訊息
2. **Given** TWSE API 回應 404, **When** 查詢股票, **Then** 顯示「查無此股票」訊息

---

### User Story 4 - 風險分析計算正確性 (Priority: P2)

身為開發者，我需要確保 Beta、夏普比率、波動率等風險指標計算正確。

**Why this priority**: analysis.ts 已有部分測試，需擴充覆蓋邊界情境。

**Acceptance Scenarios**:
1. **Given** 負報酬率序列, **When** 計算夏普比率, **Then** 正確處理負值情境
2. **Given** 單一資料點, **When** 計算波動率, **Then** 回傳 0 或拋出明確錯誤

---

## Requirements

### Functional Requirements

- **FR-001**: 所有 `lib/*.ts` 模組必須有對應的 `*.test.ts` 測試檔
- **FR-002**: 測試覆蓋率必須達到 80% 以上
- **FR-003**: 技術指標函式必須有邊界值測試（空陣列、單一值、極端值）
- **FR-004**: 資料庫操作必須包含錯誤處理測試
- **FR-005**: 外部 API 呼叫必須使用 mock 測試

### Key Entities

- **TestSuite**: 每個 lib 模組對應的測試套件
- **Coverage**: Vitest 覆蓋率報告（v8 provider）
- **Mock**: API 模擬（TWSE, IndexedDB）

## Success Criteria

- **SC-001**: `npm run test:coverage` 顯示 lib/ 覆蓋率 ≥ 80%
- **SC-002**: 所有 18 個 lib 模組都有測試檔案
- **SC-003**: 關鍵模組（database, stock-service, twse-api）覆蓋率 ≥ 90%
- **SC-004**: 測試套件執行時間 < 30 秒

## Implementation Priority

| Priority | Module | Current | Target |
|----------|--------|---------|--------|
| P1 | `database.ts` | 0% | 90% |
| P1 | `stock-service.ts` | 0% | 90% |
| P1 | `indicators.ts` | ✅ 有測試 | 擴充邊界 |
| P2 | `twse-api.ts` | 0% | 80% |
| P2 | `analysis.ts` | ✅ 有測試 | 擴充邊界 |
| P2 | `cache.ts` | 0% | 80% |
| P3 | `export.ts` | 0% | 70% |
| P3 | `user-account.ts` | 0% | 70% |
| P3 | Others | 0% | 60% |
