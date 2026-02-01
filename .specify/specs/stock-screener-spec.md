# Feature Specification: Stock Selection Strategies

**Created**: 2026-02-01  
**Status**: Draft  
**Priority**: High

## Overview

實作 18 種選股策略，涵蓋基本面、技術面、籌碼面三大類，讓使用者快速篩選符合條件的股票。

## User Scenarios

### US-1: 基本面篩選 (P1)

身為長期投資者，我需要依據本益比、殖利率、ROE 等指標篩選優質股票。

**Acceptance Scenarios:**
1. Given 股票列表, When 設定 P/E < 15 且 ROE > 10%, Then 顯示符合條件股票
2. Given 篩選結果, When 點擊股票, Then 顯示該股票詳細資料

### US-2: 技術面篩選 (P1)

身為波段交易者，我需要找出黃金交叉、RSI 超賣反彈等技術訊號。

**Acceptance Scenarios:**
1. Given 股票歷史資料, When 計算 MA5 與 MA20, Then 標記黃金交叉股票
2. Given RSI < 30, When RSI 回升至 35, Then 標記為超賣反彈

### US-3: 組合策略 (P2)

身為進階使用者，我需要組合多種條件建立自訂策略。

**Acceptance Scenarios:**
1. Given 多個篩選條件, When 組合執行, Then 顯示同時符合所有條件的股票

---

## Requirements

### Phase 1: 核心篩選器

| ID | 策略 | 類型 | 條件 |
|----|------|------|------|
| F001 | 低本益比 | 基本面 | P/E < 15 且 > 0 |
| F002 | 低股價淨值比 | 基本面 | P/B < 1.5 |
| F003 | 高殖利率 | 基本面 | Yield > 5% |
| F004 | 高 ROE | 基本面 | ROE > 15% |
| T001 | 黃金交叉 | 技術面 | MA5 上穿 MA20 |
| T002 | RSI 超賣反彈 | 技術面 | RSI < 30 後回升 |
| T003 | MACD 翻多 | 技術面 | DIF 上穿 MACD |

### Phase 2: 進階篩選

| ID | 策略 | 類型 |
|----|------|------|
| F005 | 營收成長 | 基本面 |
| F006 | 毛利率穩定 | 基本面 |
| F007 | 自由現金流正 | 基本面 |
| F008 | 低負債高現金 | 基本面 |
| T004 | 量價齊揚 | 技術面 |
| T005 | 突破整理 | 技術面 |
| T006 | 布林突破 | 技術面 |

---

## Key Entities

```typescript
interface ScreenerCriteria {
  pe?: { min?: number; max?: number };
  pb?: { min?: number; max?: number };
  dividendYield?: { min?: number };
  roe?: { min?: number };
  // 技術面
  goldenCross?: boolean;
  rsiOversold?: boolean;
  macdBullish?: boolean;
}

interface ScreenerResult {
  symbol: string;
  name: string;
  matchedStrategies: string[];
  score: number;
}
```

---

## Success Criteria

- **SC-01**: 可篩選 1,000+ 股票於 < 2 秒
- **SC-02**: Phase 1 策略 100% 測試覆蓋
- **SC-03**: UI 顯示篩選條件與結果數量

---

## Phase 2: Database Integration & Export

### Requirements

| ID | 功能 | 說明 |
|----|------|------|
| DB-01 | API 端點 | POST `/api/screener` 執行資料庫篩選 |
| DB-02 | 基本面查詢 | 整合 `filterStocks()` 函式 |
| EX-01 | CSV 匯出 | 支援 BOM 中文編碼 |
| EX-02 | 檔名格式 | `選股結果_YYYY-MM-DD.csv` |

### Files to Create/Modify

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/lib/csv-export.ts` | NEW | CSV 匯出工具 |
| `src/pages/api/screener.ts` | NEW | 篩選 API 端點 |
| `src/components/StockScreener.astro` | MODIFY | 整合 API 呼叫 |
