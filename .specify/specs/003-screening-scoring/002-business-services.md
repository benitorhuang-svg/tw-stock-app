# 002 — 業務服務層 (Business Services)

> 模組 3：在資料存取層之上，封裝所有**業務語義**的 CRUD 操作。

## 職責定義

本層負責**定義「業務是什麼」**：
1. 股票基本資料 CRUD（getStocks, saveStock, searchStocks）
2. 每日行情查詢（getDailyPrices, getLatestPrice）
3. 基本面資料（getFundamentals, getLatestFundamental）
4. 股利歷史（getDividends）
5. 投資組合管理（getPortfolio, addToPortfolio, getPortfolioSummary）
6. 交易紀錄（getTransactions, addTransaction）
7. 資料匯出入（export, import, CSV, offline HTML）
8. 使用者帳戶管理（備份、還原、設定）

本層不做分析計算（那是 Layer 6），也不做 UI 渲染（那是 Layer 7）。

## 模組清單

| 模組 | 大小 | 角色 | 測試 |
|------|------|------|------|
| `src/lib/stock-service.ts` | 11KB | 核心業務服務（全部 CRUD） | ✅ |
| `src/lib/export.ts` | 6KB | 資料匯出服務 | ❌ |
| `src/lib/csv-export.ts` | 2KB | CSV 匯出工具 | ✅ |
| `src/lib/offline-export.ts` | 15KB | 離線 HTML 匯出 | ❌ |
| `src/lib/data-import.ts` | 7KB | 資料匯入服務 | ❌ |
| `src/lib/user-account.ts` | 6KB | 使用者帳戶管理 | ❌ |
| `src/lib/pwa.ts` | 5KB | PWA / Service Worker 管理 | ❌ |

## 核心模組：stock-service.ts

### 型別定義

```typescript
interface Stock       { symbol: string; name: string; industry?: string; market?: string; }
interface DailyPrice  { symbol: string; date: string; open: number; high: number; low: number; close: number; volume: number; turnover?: number; }
interface Fundamental { symbol: string; date: string; pe?: number; pb?: number; dividend_yield?: number; eps?: number; roe?: number; }
interface Dividend    { symbol: string; year: number; cash_dividend: number; stock_dividend: number; total_dividend: number; }
interface PortfolioItem { id?: number; symbol: string; shares: number; avg_cost: number; buy_date?: string; notes?: string; }
interface Transaction { id?: number; symbol: string; type: 'buy' | 'sell'; shares: number; price: number; fee?: number; tax?: number; date: string; notes?: string; }
```

### 功能分區

#### 股票基本資料
| 函式 | SQL | 說明 |
|------|-----|------|
| `getStocks()` | `SELECT * FROM stocks` | 取得全部股票 |
| `getStock(symbol)` | `SELECT * FROM stocks WHERE symbol = ?` | 查詢單一股票 |
| `saveStock(stock)` | `INSERT OR REPLACE INTO stocks ...` | 新增/更新股票 |
| `saveStocks(stocks[])` | `batchInsert('stocks', ...)` | 批次新增 |

#### 每日行情
| 函式 | SQL | 說明 |
|------|-----|------|
| `getDailyPrices(symbol, limit=60)` | `SELECT ... ORDER BY date DESC LIMIT ?` | 最近 60 日行情 |
| `getLatestPrice(symbol)` | `SELECT ... ORDER BY date DESC LIMIT 1` | 最新一筆價格 |
| `saveDailyPrices(prices[])` | `batchInsert('daily_prices', ...)` | 批次儲存行情 |

#### 基本面資料
| 函式 | SQL | 說明 |
|------|-----|------|
| `getFundamentals(symbol)` | `SELECT ... ORDER BY date DESC` | 基本面歷史 |
| `getLatestFundamental(symbol)` | `SELECT ... ORDER BY date DESC LIMIT 1` | 最新基本面 |
| `saveFundamentals(data[])` | `batchInsert('fundamentals', ...)` | 批次儲存 |

#### 投資組合（Client 專用）
| 函式 | SQL | 說明 |
|------|-----|------|
| `getPortfolio()` | `SELECT * FROM portfolio` | 取得持股 |
| `addToPortfolio(item)` | `INSERT INTO portfolio ...` | 新增持股，回傳 ID |
| `updatePortfolioItem(id, item)` | `UPDATE portfolio SET ... WHERE id = ?` | 更新（動態欄位） |
| `removeFromPortfolio(id)` | `DELETE FROM portfolio WHERE id = ?` | 移除持股 |
| `getPortfolioSummary()` | 複雜 JOIN 查詢 | 計算總成本、總市值、未實現損益 |

**`getPortfolioSummary()` 計算邏輯**:
```
totalCost  = Σ (shares × avg_cost)
totalValue = Σ (shares × latest_close)   ← JOIN daily_prices 取最新收盤
unrealizedPL = totalValue - totalCost
每檔損益 = (latest_close - avg_cost) × shares
損益% = (latest_close - avg_cost) / avg_cost × 100
```

#### 交易紀錄
| 函式 | SQL | 說明 |
|------|-----|------|
| `getTransactions(symbol?)` | `SELECT ... ORDER BY date DESC` | 交易歷史（可按股票篩選） |
| `addTransaction(tx)` | `INSERT INTO transactions ...` | 新增交易，回傳 ID |

#### 搜尋與篩選
| 函式 | SQL | 說明 |
|------|-----|------|
| `searchStocks(keyword)` | `WHERE symbol LIKE ? OR name LIKE ?` | 模糊搜尋 |
| `filterStocks(conditions)` | 動態 WHERE 子句 | 條件篩選（含 queryCache） |

### 篩選器快取

```typescript
// Memory cache for filterStocks results
const queryCache = new Map<string, { data: any[]; timestamp: number }>();
const QUERY_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

function getCacheKey(conditions: any): string {
    return JSON.stringify(conditions);  // 條件序列化為 key
}
```

## 匯出服務

### csv-export.ts
- BOM UTF-8 中文編碼
- 正確處理逗號、引號的 CSV 跳脫

### export.ts
- JSON 備份匯出（portfolio + watchlist + settings）
- 檔案下載觸發（Blob URL + `<a>` click）

### offline-export.ts (15KB)
- 最大的匯出模組
- 生成獨立 HTML 檔案，內嵌所有 CSS/JS/Data
- 離線可開啟的完整分析報告

### data-import.ts
- CSV / JSON 匯入與資料驗證
- 大量資料分批寫入

### user-account.ts
- 備份匯出：收集 portfolio, watchlist, settings → JSON
- 備份匯入：驗證 JSON 結構 → 寫入 DB
- 設定管理：localStorage 存取

## PWA 管理 — pwa.ts

| 功能 | 說明 |
|------|------|
| Service Worker 註冊 | `navigator.serviceWorker.register('/sw.js')` |
| 更新通知 | 偵測新版本並提示使用者 |
| 安裝提示 | `beforeinstallprompt` 事件處理 |
| 離線狀態偵測 | `navigator.onLine` 監聽 |

## 待辦任務

- [ ] **T5-01**: 為 `export.ts` 新增測試（JSON 備份、Blob 生成、特殊字元處理）
- [ ] **T5-02**: 為 `user-account.ts` 新增測試（備份匯出入、損壞 JSON 處理）
- [ ] **T5-03**: 為 `offline-export.ts` 新增測試（HTML 生成、資料內嵌）
- [ ] **T5-04**: 為 `data-import.ts` 新增測試（CSV 解析、驗證、大量匯入）
- [ ] **T5-05**: 為 `pwa.ts` 新增測試（mock navigator.serviceWorker）
- [ ] **T5-06**: 統一 `stock-service.ts` 中的 `any` 型別為具體型別
- [ ] **T5-07**: 為所有公開函式補充 JSDoc 文件
