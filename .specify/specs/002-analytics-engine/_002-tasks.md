# 任務清單: 002-analytics-engine (M2 分析引擎與 AI 摘要)

**分支**: `002-analytics-engine`
**輸入**: 來自 `.specify/specs/002-analytics-engine/` 的設計文件
**前提條件**: `_001-tasks.md` (已完成)

---

## 第一階段: 高效能風險計算 (Web Worker Risk Engine)

**目標**: 將重度矩陣運算移出主執行緒，維持 UI 的流暢度。

- [x] **T013** 在 `src/lib/analytics/worker/math-utils.ts` 實作皮爾森相關係數 (Pearson Correlation) 演算法。
- [x] **T014** 建立 `src/lib/analytics/worker/risk-engine.worker.ts`，處理投資組合的分散度與 Beta 計算。
- [x] **T015** 在 `src/lib/analytics/index.ts` 實作前端調用 Worker 的非同步介面。

## 第二階段: AI 智慧摘要與脈絡蒸餾 (AI Integration)

**目標**: 自動產生市場專業分析報告。

- [x] **T016** 在 `src/lib/analytics/ai/prompt-builder.ts` 實作特徵轉換邏輯，將 SQLite 數據轉化為 AI 友善的 Context。
- [x] **T017** 在 `src/lib/analytics/ai/llm-client.ts` 串接 Gemini / GPT-4 API。
- [x] **T018** 實作 `Streaming` 模式，讓 AI 報告能以打字機效果呈現。

## 第三階段: 毫秒級快取機制 (Caching Layer)

**目標**: 降低 AI 消耗成本並提升回訪速度。

- [x] **T019** 在 `src/lib/analytics/ai/cache-manager.ts` 實作基於 SQL 的快取檢索邏輯。
- [x] **T020** 確保 `ai_reports` 表能精準根據 `symbol` 與 `date` 進行 Hit/Miss 判斷。

---

_最後更新: 2026-02-23_
