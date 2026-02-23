# 001 — O(1) 效能之選股條件引擎 (Query Builder)

> 本模組 (`003: Screening / Query Builder`) 是本量化終端機的核心靈魂。它負責將使用者在前端 `StockScreener.astro` 組件中勾選的 **「人話 (JSON 條件樹)」**，優美且安全地編譯成 **「SQLite 指令 (SQL Query)」**，徹底發揮關聯式資料庫的跨表查詢威力。

## 1. 架構：JSON 到 SQL 的編譯器 (`src/lib/query-builder.ts`)
我們揚棄了在 TypeScript 中對幾千個股票物件跑 `Array.filter` 的做法。這個模組要實作一個強大的 `Criteria Compiler`。前端只需傳入一個條件陣列。

### 1.1 條件定義檔 (Screener Criteria Schema)
前端的狀態管理 (如 Zustand 或 URL 參數) 會組合出如下的 JSON 格式：
```typescript
interface StrategyStep {
  domain: 'technical' | 'fundamental' | 'chips' | 'price'; // 面向 (決定 JOIN 哪張表)
  field: string;          // 欄位名 (e.g. 'macd_hist', 'foreign_net', 'pe_ratio')
  operator: '>' | '<' | '>=' | '<=' | '=' | 'BETWEEN' | 'CROSSOVER';
  value: number | [number, number] | string;
}

interface StrategyQuery {
  matchMode: 'AND' | 'OR';
  steps: StrategyStep[];
}
```

### 1.2 編譯器職責 (Compiler Responsibilities)
`queryBuilder.compile(query)` 必須將上方的 JSON 轉譯出對應的 **SQL 子句** 以及 **防範 SQL 注入的陣列參數 (Prepared Statement bindings)**。

- 若 `domain === 'technical'`：引擎自動確保語法有包含 `JOIN tech_features t ON s.symbol = t.symbol`。
- 若 `domain === 'chips'`：引擎自動包含 `JOIN chip_features c ON s.symbol = c.symbol`。
- **動態組裝**：自動組合 `WHERE t.macd_hist > ? AND c.foreign_net > ?`，並且輸出陣列 `[0, 500]` 以供 `sqlite3.all()` 執行。

## 2. 邊緣與強大情境 (Edge Scenarios)

### 2.1 交叉運算 (Cross-Table Correlation)
- 當使用者勾選**「爆量長紅」**，Query 編譯器能將其轉譯為 `WHERE (t.close - t.open)/t.open > 0.05 AND t.volume > t.ma20_volume * 2`。這是直接讓資料庫引擎幫我們完成這筆複雜度的 $O(N)$ 運算。

### 2.2 特殊運算符: CROSSOVER (黃金交叉)
- 這是一個極強的應用。當設定 `CROSSOVER` 時，編譯器必須產生 `WHERE t.ma5 > t.ma20 AND t_prev.ma5 <= t_prev.ma20`。（註：這需要在 M1 的特徵工程階段將 `ma5_prev` 計算入 SQLite，或是透過 SQL 視窗函式 `LAG()` 取得上一期數字，端看您的 `001-data-ingestion` 實作方式）。

## 3. 防禦性工程 (Defensive Engineering)
任何 SQL Query Builder 首重安全。
- 絕不使用文字拼接來組合 SQL (`... WHERE ${field} > ${value}`)。
- 強制使用 `sqlite3` driver 的 `?` 佔位符。
- 對於傳入的 `field` 與 `domain`，必須先與一個白名單 (Whitelist Schema) 進行嚴格的型別核驗 (Zod Schema Validation)，只要遇到不在白名單的查核欄位，直接拋出 `400 Invalid Field` 拒絕執行 SQL，防止惡意注入破壞本地架構。
