# Local Data Priority Specification

## Goal

優先使用本地資料庫，減少 API 依賴，提升離線使用體驗。

---

## Current Flow

```
UI → API → Database → Response
        ↓ (失敗時)
    Fallback Data
```

## Target Flow

```
UI → Local Database (IndexedDB/sql.js) → Response
        ↓ (缺少資料時)
    API → Update Local DB → Response
```

---

## Requirements

| ID | 功能 | 說明 |
|----|------|------|
| L-01 | 本地優先 | 直接查詢 sql.js 資料庫 |
| L-02 | 背景同步 | 定期從 API 更新本地資料 |
| L-03 | 快取策略 | 標記資料時效性 |

---

## Files to Modify

| 檔案 | 動作 | 說明 |
|------|------|------|
| `StockScreener.astro` | MODIFY | 優先呼叫本地 DB |
| `stock-service.ts` | USE | 使用現有 filterStocks |
