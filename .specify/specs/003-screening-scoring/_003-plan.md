# Implementation Plan: 003-screening-scoring

**Branch**: `003-screening-scoring` | **Date**: 2026-02-23 | **Spec**: [001-query-builder.md](./001-query-builder.md), [002-preset-strategies.md](./002-preset-strategies.md)

## Summary

本階段 (`M3: Query Builder & Screening`) 負責完全取代傳統前端 JS Map/Filter 的低效遍歷。它建立一套高度安全的「JSON to SQL Compiler」，幫助篩選器面板透過 Parameterized SQL (參數化查詢) 發送至 M1 所建構的 `stocks.db` 副本中，達成 O(1)/O(\log N) 等級的全市場瞬間檢索。同時實作了能迅速存取熱門策略的預編譯 Materialized Views。

## Technical Context

**Language/Version**: TypeScript / Browser (sql.js WASM) + Server (better-sqlite3)
**Primary Dependencies**: `zod` (結構與白名單驗證), `sql-template-tags` (安全封裝)
**Storage**: 本地唯讀 `stocks.db` (IndexedDB / Server)
**Testing**: Vitest (`test/m3-sql-compiler.test.ts` 驗證 SQL Injection 防護與 WHERE 邏輯)
**Target Platform**: Isomorphic (可在前端與 SSR 環境兩棲執行)
**Project Type**: Database abstraction & Query DSL (Domain Specific Language)
**Performance Goals**: 能夠將五大複合條件 (例如: EPS > 2 且 KD黃金交叉 且 殖利率 > 5%) 在 50ms 內編譯為安全的 SQL 並檢索回 200 筆內的精選股票標的。
**Constraints**: 絕對防護任何 `DROP TABLE`、`UPDATE`、以及不被允許的隱碼攻擊欄位。
**Scale/Scope**: 1700 檔股票，每檔 100 種指標與特徵，全市場秒級海選。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **SQL O(1) 原則**: ✅ 徹底落實。從 $1700 \times M$ 的效能瓶頸轉移至 B-Tree Indexing。
- **TypeScript Strict Mode**: ✅ Zod 與 AST 結合確保執行期與編譯期的 100% 型別安全。
- **Local-First Architecture**: ✅ 篩選器即使斷線也能在 Client-side 繼續 0 delay 運行。

## Project Structure

### Documentation (this feature)

```text
.specify/specs/003-screening-scoring/
├── 001-query-builder.md
├── 002-preset-strategies.md
├── 003-clarification.md
└── 003-plan.md             # 本檔案
```

### Source Code

```text
src/lib/screener/               # M3: 篩選與策略引擎
├── sql/                        # (A) JSON-to-SQL 編譯器
│   ├── ast-compiler.ts         # 將篩選條件轉換為 SQL AST
│   ├── query-builder.ts        # 產生 Parameterized 最終語法
│   └── security-guard.ts       # Zod 白名單驗證模組
├── strategies/                 # (B) 預設策略庫
│   ├── presets.ts              # 能噴發先鋒、價值投資等預設 JSON 結構
│   └── materialized-views.ts   # 針對高頻策略的快取存取層
└── executor.ts                 # 對 SQL Service 的統一介面
```

**Structure Decision**: Compiler (編譯器) 必須將 `AST` 解析與最終字串組合解耦。`security-guard` 藉由 `zod` 白名單作為第一道防護網，確保非結構化攻擊無法進入解析引擎。這是 M3 的最核心命脈。
