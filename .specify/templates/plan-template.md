# 實作計畫: [FEATURE]

**分支**: `[###-feature-name]` | **日期**: [DATE] | **規格書**: [link]
**輸入**: 來自 `/specs/[###-feature-name]/spec.md` 的功能規劃

**備註**: 此模板由 `/speckit.plan` 指令填充。執行流程請見 `.specify/templates/plan-template.md`。

## 摘要

[從功能規格擷取：核心需求 + 來自研究的技術方案]

## 技術脈絡

<!--
  需要採取行動: 請將本節內容替換為專案的技術細節。
  此處結構僅供建議，用以引導迭代過程。
-->

**語言/版本**: [例如：Python 3.11, Swift 5.9, Rust 1.75 或 待釐清]  
**主要依賴**: [例如：FastAPI, UIKit, LLVM 或 待釐清]  
**儲存**: [如適用，例如：PostgreSQL, CoreData, 檔案 或 不適用]  
**測試**: [例如：pytest, XCTest, cargo test 或 待釐清]  
**目標平台**: [例如：Linux server, iOS 15+, WASM 或 待釐清]
**專案類型**: [例如：library/cli/web-service/mobile-app/compiler/desktop-app 或 待釐清]  
**效能目標**: [領域特定，例如：1000 req/s, 10k lines/sec, 60 fps 或 待釐清]  
**約束條件**: [領域特定，例如：<200ms p95, <100MB memory, 具備離線能力 或 待釐清]  
**規模/範圍**: [領域特定，例如：1萬用戶, 100萬行程式碼, 50個畫面 或 待釐清]

## 憲法核查 (Constitution Check)

_門檻：必須在 Phase 0 研究前通過。在 Phase 1 設計後重新檢查。_

[根據憲法文件確定的核查點]

## 專案結構

### 文件 (本功能相關)

```text
specs/[###-feature]/
├── _[prefix]-clarification.md # Phase 0 產出 (/speckit.clarify 指令輸出)
├── _[prefix]-plan.md          # 本檔案 (/speckit.plan 指令輸出)
├── _[prefix]-research.md      # Phase 0 產出 (/speckit.plan 指令)
├── _[prefix]-data-model.md    # Phase 1 產出 (/speckit.plan 指令)
├── _[prefix]-quickstart.md    # Phase 1 產出 (/speckit.plan 指令)
├── contracts/                 # Phase 1 產出 (/speckit.plan 指令)
└── _[prefix]-tasks.md         # Phase 2 產出 (/speckit.tasks 指令 - 非 /speckit.plan 建立)
```

### 原始碼 (儲存庫根目錄)

<!--
  需要採取行動: 請將下方的佔位符目錄樹替換為本功能的具體佈局。
  刪除未使用的選項，並用實際路徑擴展所選結構 (例如：apps/admin, packages/something)。
  交付的計畫不得包含選項標籤。
-->

```text
# [如未使用請刪除] 選項 1: 單一專案 (預設)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
├── unit/

# [如未使用請刪除] 選項 2: Web 應用程式 (偵測到 "frontend" + "backend" 時)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [如未使用請刪除] 選項 3: 行動裝置 + API (偵測到 "iOS/Android" 時)
api/
└── [與上述 backend 相同]

ios/ 或 android/
└── [平台特定結構：功能模組, UI 流程, 平台測試]
```

**結構決策**: [記錄所選結構並引用上方擷取的實際目錄]

## 複雜度追蹤

> **僅在憲法核查有違規且必須說明正當理由時填寫**

| 違規項目                | 必要原因   | 拒絕較簡單替代方案的原因     |
| ----------------------- | ---------- | ---------------------------- |
| [例如：第4個專案]       | [當前需求] | [為什麼3個專案不足夠]        |
| [例如：Repository 模式] | [特定問題] | [為什麼直接存取資料庫不足夠] |
