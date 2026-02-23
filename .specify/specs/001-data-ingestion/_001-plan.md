# Implementation Plan: 001-data-ingestion

**Branch**: `001-data-ingestion` | **Date**: 2026-02-23 | **Spec**: [001-data-sources.md](./001-data-sources.md), [002-data-build.md](./002-data-build.md)

## Summary

本階段 (`M1: Data Ingestion & Build`) 負責將外部金融數據（TWSE、MOPS 等）抓取至在地端，並透過 ETL (Extract, Transform, Load) 腳本寫入 SQLite，同時**預先計算所有常態技術指標與籌碼特徵**，徹底取代傳統在前端用 TypeScript 迴圈計算指標的低效做法。最終產出一顆高密度索引的 `stocks.db`，以支撐後續 M3 的 $O(1)$ 查詢與 M5 的瞬間圖表渲染。

## Technical Context

**Language/Version**: TypeScript / Node.js 20+  
**Primary Dependencies**: `better-sqlite3`, `технические индикаторы (technicalindicators或其他算法庫)`, `node-fetch` 或 `undici`  
**Storage**: SQLite (`stocks.db`) + 原始備份 CSV  
**Testing**: Vitest (`test/m1-ingestion.test.ts`)  
**Target Platform**: 本地 Node.js 腳本 (由 npm run build-db 驅動)  
**Project Type**: ETL 數據處理管道 (Data Pipeline)  
**Performance Goals**: 1700 檔股票的特徵計算與寫入必須在 1~2 分鐘內完成，產生可轉拋的 `stocks.db` (< 200MB)。  
**Constraints**: TWSE API Rate Limiting (嚴格遵循 5秒/3次 等限制)，必須實作 Queue 與 Exponential Backoff；寫入資料庫時需啟動 WAL 模式防鎖卡。  
**Scale/Scope**: 近 5 年每日交易紀錄（約 1500 個交易日 $\times$ 1700 檔 = 250 萬筆基礎 K 線），再加上對應的指標、籌碼與基本面衍生表。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Local-First Architecture**: ✅ 完全符合。資料全面下放至 SQLite。
- **TypeScript Strict Mode**: ✅ 所有資料型態、TWSE HTTP 預期 JSON Response 皆有 Interface 規範。
- **SQL O(1) 原則**: ✅ 嚴格遵守，不在前端重新運算 `MACD` 或 `SMA`。

## Project Structure

### Documentation (this feature)

```text
.specify/specs/001-data-ingestion/
├── 001-data-sources.md     # M1 Spec 1
├── 002-data-build.md       # M1 Spec 2
├── 000-clarification.md    # 架構盲區釐清
└── plan.md                 # 本實作計畫
```

### Source Code

```text
scripts/
├── fetchers/                   # (A) 原始爬蟲模組
│   ├── twse-api.ts             # TWSE API 封裝 (含 Rate Limit & Retry)
│   ├── mops-api.ts             # 公開資訊觀測站 API
│   └── rate-limiter.ts         # 指數退避機制
├── etl/                        # (B) 轉換與特徵工程模組
│   ├── build-sqlite-db.ts      # 流程主程式
│   ├── technical-features.ts   # 技術指標運算 (呼叫算法庫)
│   └── chip-features.ts        # 籌碼運算
└── db/                         # (C) 資料庫介面
    ├── schema.sql              # Table 結構與索引宣告
    └── sqlite-writer.ts        # 負責 better-sqlite3 高效 Batch Insert 與 WAL 設定

src/lib/db/                     # 共用讀取服務
└── sqlite-service.ts           # Service 層，供 Server 端/前端讀取 `stocks.db`
```

**Structure Decision**: 本地 ETL 腳本與 App 的前端介面分離，安置於最高層級的 `scripts/`，並由 `package.json` 的專屬指令叫用。`src/lib/db/` 則提供系統在運作時唯讀 (Read-only) 的 Query Builder 介面。
