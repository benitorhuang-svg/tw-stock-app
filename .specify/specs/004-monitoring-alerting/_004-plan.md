# Implementation Plan: 004-monitoring-alerting

**Branch**: `004-monitoring-alerting` | **Date**: 2026-02-23 | **Spec**: [001-realtime-engine.md](./001-realtime-engine.md), [002-alert-emitter.md](./002-alert-emitter.md)

## Summary

本階段 (`M4: Realtime Daemon & Events`) 建立「盤中五秒實時輪詢與推播機制」。為防止大量 Client 用戶癱瘓 TWSE 官方 API (IP Banning)，後端 Node.js 只負責單一通道的 Fetch/Polling。取得資料後，藉由 Server-Sent Events (SSE) 高效向千百位 Client 廣播最新 Tick。Client 的 Web Worker 若發現價格觸發了「O(1) 雜湊對映」中的用戶「警示條件」，將由 Event Emitter 發出全域通知，實現零延遲、高並發的智能警示。

## Technical Context

**Language/Version**: TypeScript / Node.js (Daemon) / Client-side JS (`EventSource`)
**Primary Dependencies**: Node原生 `http` 實作 SSE, `zustand` (前端響應式狀態), Web Worker (警示比對)
**Storage**: Client-level Memory (`user_alerts` 自訂條件) & 瀏覽器 Notification API
**Testing**: Vitest (`test/m4-realtime.test.ts` 驗證 SSE 退避重連、Hash Map $O(1)$ 查找與推播斷線恢復機制)
**Target Platform**: Node.js Backend 守護進程 (SSR) + Browser Client (`EventSource`)
**Project Type**: Pub/Sub 廣播與本地訂閱推播系統
**Performance Goals**: N 個條件比對時間不可超過 10 毫秒 (避免卡死主畫面的 K 線刷新)。必須透過 `map[symbol]` 取代 `filter()` 陣列掃描。
**Constraints**: SSE 需實作 Retry Connection (EventSource 內建)；斷線期間若有遺漏高低點，連線上時需觸發 "Sync" 端點補齊。
**Scale/Scope**: 盤中 (09:00~13:30) 每 5 秒推播一次大盤 + 關注個股行情；支援同一使用者上百條的條件監控。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Main Thread Protection**: ✅ 將警示規則 Hash 掃描放入 Web Worker，保護 60 FPS UX。
- **Atomic Design**: ✅ 錯誤通知、警示吐司 (Toast) 皆有對應元件與骨架。
- **Performance Standards**: ✅ 伺服器由主動 `5s Polling` 取代前端盲目轟炸 TWSE IP。

## Project Structure

### Documentation (this feature)

```text
.specify/specs/004-monitoring-alerting/
├── 001-realtime-engine.md
├── 002-alert-emitter.md
├── 004-clarification.md
└── 004-plan.md             # 本檔案
```

### Source Code

```text
src/pages/api/sse/              # M4: 後端推播服務
├── stream.ts                   # Astro API 端點: 處理 SSE Client Connection
└── daemon.ts                   # Node.js 單例輪詢 TWSE 的背景程序

src/lib/monitoring/             # M4: 前端本地訂閱服務
├── worker/                     # (A) 即時計算 Worker
│   ├── rule-matcher.worker.ts  # 將 Tick 與 Hash Map 警示條件 O(1) 比對
│   └── rules-hashmap.ts        # 負責將 user_alerts 展開為 { '2330': [...] }
├── realtime-client.ts          # EventSource 的生命週期與重連管理
└── event-bus.ts                # App 層級的 Pub/Sub (供 Toast 註冊監聽)
```

**Structure Decision**: 所有的資料單向流動：`TWSE -> daemon.ts ( polling singleton ) -> stream.ts ( SSE Broadcaster ) -> realtime-client.ts -> rule-matcher.worker.ts -> event-bus.ts -> UI Toasts`。完全分離運算與渲染。
