# 001 — 資料存取層 (Data Access Layer)

> 模組 3：在資料庫引擎的原始 SQL 能力之上，提供多層快取、環境感知、離線降級的資料讀取策略。

## 職責定義

本層負責**決定「從哪裡拿資料」以及「如何快取」**：
1. 多層快取策略（Memory → IndexedDB → File → API）
2. Server / Client 環境自動偵測與路徑選擇
3. 離線降級與 fallback 機制
4. 請求去重（避免同一資源被重複 fetch）

本層不包含業務語義（「什麼是投資組合」），只提供「如何高效取得資料」的能力。

## 模組清單

| 模組 | 大小 | 角色 | 測試 |
|------|------|------|------|
| `src/utils/priceService.ts` | 5KB | 價格資料多層讀取策略 | ❌ |
| `src/utils/stockDataService.ts` | 13KB | SSR 股票資料服務（JSON-based） | ❌ |
| `src/lib/cache.ts` | 3KB | 通用快取工具 | ✅ |
| `src/lib/cache-manager.ts` | 14KB | 進階快取管理（IndexedDB 整合） | ✅ |
| `src/lib/request-cache.ts` | 2KB | API 請求去重 | ❌ |
| `src/lib/data-loader.ts` | 3KB | 通用資料載入器 | ❌ |
| `src/lib/data-sync.ts` | 6KB | 資料同步邏輯 | ✅ (基礎) |

## 快取層級架構

```
請求進入
  │
  ▼
Tier 1: Memory Cache (Map 結構, TTL=5min)
  │ ← queryCache in stock-service.ts
  │ ← withRequestCache() 請求去重
  │
  ├── Hit → 直接回傳（0ms）
  │
  ▼
Tier 2: IndexedDB Cache (cache-manager.ts, TTL=24hr)
  │ ← getCache<T>(key) / setCache<T>(key, data, ttl)
  │
  ├── Hit → 回傳 + 可選背景刷新
  │
  ▼
Tier 3: Local File / SQLite Query
  │
  ├── Server → fs.readFileSync (同步讀檔)
  │             或 better-sqlite3 query
  │
  └── Client → fetch('/data/...') (HTTP 靜態檔)
               或 sql.js query
  │
  ▼
Tier 4: API Fallback (最後手段)
  │ ← fetch('/api/prices/{symbol}')
  │ ← twse-api.ts 即時查詢
  │
  └── 結果寫回 Tier 2 快取
```

## 核心模組詳解

### priceService.ts — 價格資料多層讀取

```typescript
export async function fetchStockPrices(symbol: string): Promise<StockPriceRecord[]> {
    const isServer = typeof window === 'undefined';

    // Tier 1: Client-side 記憶體 / IndexedDB 快取
    if (!isServer) {
        const cached = await getCache<StockPriceRecord[]>(`stock:prices:${symbol}`);
        if (cached?.length > 0) return cached;  // Cache Hit
    }

    // Tier 2-3: 讀取本地檔案
    if (isServer) {
        // Server: 透過 price_index.json 找到 CSV 檔名 → fs.readFileSync
        const fileMap = JSON.parse(fs.readFileSync('price_index.json'));
        const csvText = fs.readFileSync(`prices/${fileMap[symbol]}`);
    } else {
        // Client: fetch price_index.json (有 request-cache 去重)
        //       → fetch CSV 檔案
        const fileMap = await withRequestCache('price-index', () => fetch('/data/price_index.json').then(r => r.json()));
        const csvText = await fetch(`/data/prices/${fileMap[symbol]}`).then(r => r.text());
    }

    const prices = parseCSV(csvText);

    // 寫回 Tier 2 快取（24hr TTL）
    if (!isServer && prices.length > 0) {
        await setCache('stock:prices:' + symbol, prices, 24 * 60 * 60 * 1000);
    }

    return prices;

    // Tier 4: 如果以上全部失敗 → API fallback
    // fetch('/api/prices/{symbol}')
}
```

### stockDataService.ts — SSR 股票資料服務

```typescript
// JSON-based 路徑（不走 SQLite，直接讀 JSON 檔案）
// 主要用於 SSR 首頁渲染

export async function loadAllStocksWithPrices(): Promise<StockFullData[]> {
    const stockList = await loadStockList();           // stocks.json
    const latestPrices = await loadLatestPrices();     // latest_prices.json

    for (const stock of stockList) {
        const price = latestPrices[stock.symbol];
        const sector = getSectorBySymbol(stock.symbol);  // 產業分類
        results.push({ ...stock, ...price, sector });
    }
}
```

**產業分類邏輯** (`getSectorBySymbol`):
- 依股票代號前兩碼判斷產業（23xx→半導體、28xx→金融...）
- 主要個股有人工 override（2330→semiconductor, 2317→electronics...）
- 分類結果：semiconductor, electronics, finance, shipping, food, biotech 等 20+ 種

**提供的查詢函式**：
| 函式 | 說明 | 快取 |
|------|------|------|
| `getStocksWithPrices()` | 全部股票 + 最新價格 | 有（in-memory 單例） |
| `getStocksPaginated(page, size)` | 分頁查詢 | 依賴上面的快取 |
| `searchStocks(query, limit)` | symbol/name 模糊搜尋 | 依賴上面的快取 |
| `getTopGainers(limit)` | 漲幅排行 | 依賴上面的快取 |
| `getTopLosers(limit)` | 跌幅排行 | 依賴上面的快取 |
| `getTopStocksByVolume(limit)` | 成交量排行 | 依賴上面的快取 |
| `getStockBySymbol(symbol)` | 單一股票查詢 | 依賴上面的快取 |

### cache-manager.ts — 進階快取管理

- 支援 Memory + IndexedDB 雙層快取
- TTL 過期自動清理
- `getCache<T>(key)` / `setCache<T>(key, data, ttl)` 泛型 API

### request-cache.ts — 請求去重

```typescript
// 避免並發請求重複 fetch 同一資源
export function withRequestCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 如果已有進行中的請求 → 回傳同一 Promise
    // 否則 → 執行 fetcher 並快取 Promise
}
```

## 型別定義

```typescript
// priceService.ts
interface StockPriceRecord {
    Date: string; Open: number; High: number; Low: number;
    Close: number; Volume: number; Turnover: number;
    Change: number; ChangePct: number;
}

// stockDataService.ts
interface StockFullData extends StockBasicInfo {
    price: number; change: number; changePercent: number;
    volume: number; high: number; low: number; open: number;
    pe: number; pb: number; yield: number;
    roe: number; eps: number; sector: string;
}
```

## 待辦任務

- [ ] **T4-01**: 為 `request-cache.ts` 新增測試（hit/miss、TTL 過期）
- [ ] **T4-02**: 為 `data-loader.ts` 新增測試
- [ ] **T4-03**: 為 `utils/priceService.ts` 新增測試（mock fs + fetch）
- [ ] **T4-04**: 為 `utils/stockDataService.ts` 新增測試
- [ ] **T4-05**: 統一 `StockPriceRecord`（Pascal Case）與 `DailyPrice`（camel Case）型別命名
- [ ] **T4-06**: 實作 Stale-While-Revalidate 策略（先回傳過期快取，背景刷新）
