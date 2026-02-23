# 任務清單: 001-data-ingestion (M1 數據擷取與 ETL 管道)

**分支**: `001-data-ingestion`
**輸入**: 來自 `.specify/specs/001-data-ingestion/` 的設計文件
**前提條件**: `_001-plan.md` (已完成), `_001-clarification.md` (已完成)

---

## 第一階段: 基礎建設 (Database Schema & SQLite Infrastructure)

**目標**: 建立穩固的資料地基，確保資料寫入效能與型別安全。

- [x] **T001** 在 `scripts/db/schema.sql` 定義 `stocks`, `tech_features`, `chip_features`, `valuation_features` 等資料表。
- [x] **T002** 在 `scripts/db/sqlite-writer.ts` 實作 `SqliteWriter` 類別，支援 `batchInsert` 與 `WAL` 模式。
- [x] **T003** 在 `src/lib/db/sqlite-service.ts` 實作全站單例 (Singleton) 讀取服務。
- [x] **T004** 實作 `getDbStats()` 函式，用於驗證資料庫檔案大小與紀錄總數。

## 第二階段: 數據爬蟲與頻率控制 (Crawler & Rate Limiting)

**目標**: 建立不會被台交所 (TWSE) 封鎖 (Ban IP) 的可靠爬取管道。

- [x] **T005** 在 `scripts/fetchers/rate-limiter.ts` 實作「Queue Scheduler」，確保符合每秒 API 限制並具備退避重試機制。
- [x] **T006** 在 `scripts/fetchers/twse-api.ts` 實作 `fetchStockList()`，獲取全市場今日快照。
- [x] **T007** 在 `scripts/fetchers/yahoo-api.ts` 實作 Yahoo Finance 歷史資料爬蟲，作為長期 K 線的主要來源。
- [x] **T008** 在 `scripts/fetchers/mops-api.ts` 實作基本面數據 (MOPS) 爬取介面。

## 第三階段: 特徵工程與自動化流程 (ETL & Feature Engineering)

**目標**: 將原始數據運算為進階特徵並裝填至 SQLite。

- [x] **T009** 在 `scripts/etl/technical-features.ts` 實作廣義技術指標計算 (MA, MACD, RSI)。
- [x] **T010** 在 `scripts/etl/chip-features.ts` 實作籌碼集中度計算邏輯。
- [x] **T011** 在 `scripts/etl/build-sqlite-db.ts` 實作 Orchestrator (編排器)，串接「爬取 -> 運算 -> 寫入」完整流程。
- [x] **T012** 在 `package.json` 加入 `npm run build-db` 指令，實現一鍵自動更新資料庫。

---

_最後更新: 2026-02-23_
