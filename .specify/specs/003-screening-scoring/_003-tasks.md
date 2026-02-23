# 任務清單: 003-screening-scoring (M3 安全篩選編譯器)

**分支**: `003-screening-scoring`
**輸入**: 來自 `.specify/specs/003-screening-scoring/` 的設計文件

---

## 第一階段: JSON to SQL 編譯器 (Security Guard & Compiler)

**目標**: 實現全市場的高效篩選，同時防止 SQL 注入攻擊。

- [x] **T021** 在 `src/lib/screener/sql/security-guard.ts` 使用 Zod 定義 Schema 白名單。
- [x] **T022** 在 `src/lib/screener/sql/query-builder.ts` 實作多表 `JOIN` 的 SQL 編譯邏輯 (包含 `stocks`, `tech`, `chip`)。
- [x] **T023** 確保所有查詢皆使用 Parameterized SQL。

## 第二階段: 預設策略與快取 (Presets & Performance)

**目標**: 提供一鍵選股的便捷體驗。

- [x] **T024** 在 `src/lib/screener/strategies/presets.ts` 設定「高殖利率價值投資」、「均線多頭排列」等經典策略。
- [x] **T025** 驗證篩選引擎在大於 1000 檔標的中，檢索速度是否符合 100ms 內的標準。

---

_最後更新: 2026-02-23_
