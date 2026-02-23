# 任務清單: 004-monitoring-alerting (M4 實時推播與 Worker 監控)

**分支**: `004-monitoring-alerting`
**輸入**: 來自 `.specify/specs/004-monitoring-alerting/` 的設計文件

---

## 第一階段: SSE 實時傳輸伺服器 (SSE Daemon)

**目標**: 建立穩定、省頻寬的實時價格廣播系統。

- [x] **T026** 在 `src/api/sse/daemon.ts` 實作單例輪詢計畫，收集全市場 Tick。
- [x] **T027** 在 `src/pages/api/sse/stream.ts` 建立 Astro SSE API 端點。
- [x] **T028** 在 `src/lib/monitoring/realtime-client.ts` 實作斷線重連機制。

## 第二階段: 本地警示監聽 (Local Alert Logic)

**目標**: 在本地進行大規模條件比對，不增加伺服器負擔。

- [x] **T029** 在 `src/lib/monitoring/worker/rule-matcher.worker.ts` 實作 Hash Map $O(1)$ 價格比對演算法。
- [x] **T030** 串接瀏覽器 Notification API，在觸發條件時彈出提示。

---

_最後更新: 2026-02-23_
