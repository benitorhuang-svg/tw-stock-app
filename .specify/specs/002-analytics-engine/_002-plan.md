# Implementation Plan: 002-analytics-engine

**Branch**: `002-analytics-engine` | **Date**: 2026-02-23 | **Spec**: [001-risk-and-portfolio.md](./001-risk-and-portfolio.md), [002-ai-context-distillation.md](./002-ai-context-distillation.md)

## Summary

本階段 (`M2: Analytics & AI Distillation`) 負責所有「運行時的高階財務數學計算」以及「生成式 AI 摘要」。包含利用 Web Worker 獨立執行皮爾森矩陣 (Pearson Correlation) 以評估投資組合的風險分散度，以及擷取特徵矩陣送往 LLM (GPT-4o/Gemini) 取回總結，並實作 100% 機率命中之 SQLite 快取機制，實現 $0 費用、$0 毫秒的終端體驗。

## Technical Context

**Language/Version**: TypeScript / Node.js (Server) / Browser Web Worker  
**Primary Dependencies**: `@google/generative-ai`, `openai`, `mathjs` (用於矩陣運算)  
**Storage**: SQLite (`ai_reports` 資料表) 負責快取 AI 產出  
**Testing**: Vitest (`test/m2-analytics.test.ts` 測試矩陣運算精準度)  
**Target Platform**: Backend (AI/SQLite Cache) + Browser Web Worker (Risk Engine)  
**Project Type**: AI 整合與高效能計算服務 (HPC)  
**Performance Goals**: 投資組合之風險矩陣計算必須在 Web Worker 內完成 (< 300ms)；AI 推論有 Cache 須為瞬間 (< 10ms)，無 Cache 需提供 Streaming Event。  
**Constraints**: AI Context Window 不得超過 8K Tokens；投資組合至多支援 100 檔股票。  
**Scale/Scope**: 全台 1700 檔標的，歷史回測期間需涵蓋最近 1 年。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Main Thread Protection**: ✅ 將重度迴圈移至 Web Worker，符合 Performance Standards (確保 FPS ≥ 55)。
- **Local-First Architecture**: ✅ 強制將 AI 昂貴的回應透過 `sqlite-service` 存入地端。
- **TypeScript Strict Mode**: ✅ Risk Engine 所有的 Input/Output 皆具備嚴格型別定義。

## Project Structure

### Documentation (this feature)

```text
.specify/specs/002-analytics-engine/
├── 001-risk-and-portfolio.md
├── 002-ai-context-distillation.md
├── 002-clarification.md
└── 002-plan.md             # 本檔案
```

### Source Code

```text
src/lib/analytics/              # M2: 核心分析引擎
├── worker/                     # (A) 高階運算 Worker
│   ├── risk-engine.worker.ts   # 獨立於主執行緒的風險計算 (皮爾森/Beta)
│   └── math-utils.ts           # 輕量級向量運算工具
├── ai/                         # (B) AI 與 Prompt 引擎
│   ├── prompt-builder.ts       # ETL 資料轉換為 LLM Context
│   ├── llm-client.ts           # 封裝外部 API (OpenAI/Gemini)
│   └── cache-manager.ts        # SQLite AI 報告快取邏輯
└── index.ts                    # 對外統一 API (Adapter)
```

**Structure Decision**: 為了避免阻塞主執行緒，`risk-engine.worker.ts` 將以 Web Worker 獨立編譯；AI 的提詞編譯 (`prompt-builder.ts`) 與快取管理 (`cache-manager.ts`) 將綁定在 Node.js SSR 端，避免將 API Keys 洩漏至前端。
