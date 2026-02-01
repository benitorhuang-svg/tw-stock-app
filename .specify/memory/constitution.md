# TW Stock App Constitution

## Core Principles

### I. Local-First Architecture
所有核心功能必須在離線環境下正常運作。  
- 使用 SQLite (sql.js) + IndexedDB 作為本地資料儲存
- API 資料須快取至本地，支援離線存取
- PWA 必須能完整安裝並離線使用

### II. TypeScript Strict Mode
所有程式碼必須使用 TypeScript 並遵守嚴格模式。  
- 禁止使用 `any` 類型（除非有明確註解說明原因）
- 所有 API 回應與資料結構須定義完整型別
- 使用 ESLint + Prettier 確保程式碼品質

### III. Test-First Development
功能開發前須先建立測試案例。  
- 使用 Vitest 作為測試框架
- 新功能須先撰寫測試，再實作程式碼
- 技術指標與財務計算函式須達 90% 覆蓋率

### IV. Component Modularity
元件設計須遵循單一職責原則。  
- Astro 頁面負責路由與佈局
- `lib/` 模組負責業務邏輯
- `data/` 模組負責資料定義與轉換
- 元件之間透過明確介面溝通

### V. Accessibility & UX
使用者體驗與無障礙設計為核心要求。  
- 所有互動元素須有 ARIA 標籤
- 支援鍵盤導航與快捷鍵
- 提供載入骨架與錯誤邊界處理
- 支援深色/淺色主題切換

## Tech Stack Constraints

| 類別 | 技術 | 版本要求 |
|------|------|----------|
| Framework | Astro | ^5.x |
| Language | TypeScript | Strict Mode |
| Database | sql.js + IndexedDB | 最新穩定版 |
| Testing | Vitest | ^4.x |
| Linting | ESLint + Prettier | 最新穩定版 |

## Development Workflow

1. **Feature Branch**: 每個功能/修復使用獨立分支
2. **Test First**: 先撰寫失敗的測試案例
3. **Implementation**: 實作功能直到測試通過
4. **Review**: 確認 ESLint/Prettier 檢查通過
5. **Merge**: 合併至主分支

## Governance

- 此 Constitution 為專案開發的最高指導原則
- 任何違反原則的程式碼必須附帶明確理由與註解
- 原則修訂須記錄變更日誌並更新版本號

**Version**: 1.0.0 | **Ratified**: 2026-02-01 | **Last Amended**: 2026-02-01
