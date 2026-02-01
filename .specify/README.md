# Spec-Driven Development (SDD)

本專案採用 SDD 開發流程，所有功能需先經過規範 → 計畫 → 任務 → 實作。

## 快速開始

```bash
# 執行測試
npm test

# 覆蓋率報告
npm run test:coverage
```

## 目錄結構

```
.specify/
├── memory/
│   └── constitution.md   # 核心原則
├── specs/
│   ├── baseline-spec.md  # 現況基線
│   ├── improvement-spec.md # 改進計畫
│   └── tasks.md          # 執行任務
├── scripts/              # 自動化腳本
└── templates/            # 規範模板
```

## 核心原則

1. **Local-First** - sql.js + IndexedDB
2. **TypeScript Strict** - 嚴格模式
3. **Test-First** - lib/ 覆蓋率 ≥ 80%
4. **Component Modularity** - 單一職責
5. **Accessibility** - WCAG 2.1 AA

## 測試狀態

| 模組 | 測試數 |
|------|--------|
| analysis | 13 |
| indicators | 9 |
| database | 11 |
| stock-service | 17 |
| cache | 13 |
| **總計** | **63** |

## 工作流程

1. 建立/更新 spec 於 `.specify/specs/`
2. 建立 implementation plan
3. 生成 tasks
4. 實作並驗證
