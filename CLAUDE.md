# TW-stock Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-02

## Active Technologies

- TypeScript / Node.js (Server) / Browser Web Worker + `@google/generative-ai`, `openai`, `mathjs` (用於矩陣運算) (002-analytics-engine)
- SQLite (`ai_reports` 資料表) 負責快取 AI 產出 (002-analytics-engine)
- TypeScript / Browser (sql.js WASM) + Server (better-sqlite3) + `zod` (結構與白名單驗證), `sql-template-tags` (安全封裝) (003-screening-scoring)
- 本地唯讀 `stocks.db` (IndexedDB / Server) (003-screening-scoring)
- TypeScript / Node.js (Daemon) / Client-side JS (`EventSource`) + Node原生 `http` 實作 SSE, `zustand` (前端響應式狀態), Web Worker (警示比對) (004-monitoring-alerting)
- Client-level Memory (`user_alerts` 自訂條件) & 瀏覽器 Notification API (004-monitoring-alerting)
- Astro 5.0+ / React / TailwindCSS (如果使用者決議套用)\~ / CSS Vanilla + `ChartGPU` ( WebGL 渲染), `astro:transitions`, `framer-motion` (微動效) (005-ui-layout)
- N/A (純展示端) (005-ui-layout)

- TypeScript / Node.js 20+ + `better-sqlite3`, `технические индикаторы (technicalindicators或其他算法庫)`, `node-fetch` 或 `undici` (001-data-ingestion)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript / Node.js 20+: Follow standard conventions

## Recent Changes

- 005-ui-layout: Added Astro 5.0+ / React / TailwindCSS (如果使用者決議套用)\~ / CSS Vanilla + `ChartGPU` ( WebGL 渲染), `astro:transitions`, `framer-motion` (微動效)
- 004-monitoring-alerting: Added TypeScript / Node.js (Daemon) / Client-side JS (`EventSource`) + Node原生 `http` 實作 SSE, `zustand` (前端響應式狀態), Web Worker (警示比對)
- 003-screening-scoring: Added TypeScript / Browser (sql.js WASM) + Server (better-sqlite3) + `zod` (結構與白名單驗證), `sql-template-tags` (安全封裝)

<!-- MANUAL ADDITIONS START -->

- 002-analytics-engine: Added 策略回測引擎 (Strategy Backtesting Engine)
- 005-ui-layout: Added 策略回測分頁 (Strategy Backtest Tab)
- 006-ml-transformer: Added Transformer 選股策略模型 + TradeMemory 三層記憶系統 (L1/L2/L3)
    <!-- MANUAL ADDITIONS END -->
