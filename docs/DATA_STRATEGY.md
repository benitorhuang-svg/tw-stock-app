# Data Loading Strategy - Optimized Architecture

**Status**: P0 Optimization Phase  
**Date**: 2026-01-18  
**Objective**: Unified data loading with SQLite → Local Files → API fallback

**Note**: This document describes the **READ flow** (how to fetch data).  
For the **WRITE flow** (how to update data), see [DATA_UPDATE_STRATEGY.md](DATA_UPDATE_STRATEGY.md).

---

## Architecture Overview

```
READ FLOW (Data Retrieval - Tier Priority)
┌──────────────────────────────────────────────┐
│          APPLICATION (User Requests)         │
└───────────────────┬──────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │  Tier 0: Memory Cache            │ (Fastest, 5 min TTL)
    │  ├─ Query results                │
    │  ├─ Price snapshots              │
    │  └─ User preferences             │
    └────────────┬────────────────────┘
                 │ MISS
                 ↓
    ┌───────────────────────────────────┐
    │ Tier 0.5: IndexedDB (Persistent) │ (<50ms, 7-30 day TTL)
    │ ├─ Price history                 │
    │ ├─ Cache recovery                │
    │ └─ Offline data                  │
    └────────────┬────────────────────┘
                 │ MISS
                 ↓
    ┌───────────────────────────────────┐
    │  Tier 1: SQLite (Database)       │ (50-500ms)
    │  ├─ stocks table                 │
    │  ├─ daily_prices table           │
    │  └─ fundamentals table           │
    └────────────┬────────────────────┘
                 │ OR
                 ↓
    ┌───────────────────────────────────┐
    │ Tier 2: Local Files (Static)     │ (<100ms)
    │ ├─ public/data/stocks.json       │
    │ ├─ public/data/prices/*.csv      │
    │ └─ public/data/latest_prices.json│
    └────────────┬────────────────────┘
                 │ OR
                 ↓
    ┌───────────────────────────────────┐
    │  Tier 3: API URLs (Real-time)    │ (100-500ms)
    │  ├─ TWSE API                     │
    │  ├─ Yahoo Finance                │
    │  └─ Financial providers          │
    └───────────────────────────────────┘

WRITE FLOW (Data Updates - Unidirectional)
See: DATA_UPDATE_STRATEGY.md
           ↓
API ──→ Local Files ──→ SQLite ──→ Memory Cache
           ↓            ↓           ↓
      (Tier 3)     (Tier 2)    (Tier 1)    (Tier 0)
```

---

## Data Loading Decision Tree

### 1. Stock Metadata (Static, rarely changes)
```
Request: getStock(symbol) / getStocks()
┌─ Cached in Memory? (5 min TTL)
│  └─ YES → Return immediately
│
└─ NO → Load from SQLite
   ├─ Success? → Cache in Memory + Return
   └─ Fail → Fallback to public/data/stocks.json
```

**Implementation**: [stock-service.ts](src/lib/stock-service.ts)

### 2. Daily Prices (Frequently updated, historical)
```
Request: getDailyPrices(symbol, limit=60)
┌─ Check Memory Cache (5 min TTL)
│  └─ YES → Return
│
└─ NO → Check Local File Cache (IndexedDB)
   ├─ YES → Return
   │
   └─ NO → Load from SQLite
      ├─ Success? → Cache in Memory + IndexedDB → Return
      └─ Fail → Try public/data/prices/[symbol].json
         └─ Success? → Cache + Return
            └─ Fail → Fetch from API
               └─ Cache all tiers → Return
```

**Implementation**: [priceService.ts](src/utils/priceService.ts), [cache-manager.ts](src/lib/cache-manager.ts)

### 3. Fundamentals (Quarterly, less frequently)
```
Request: getFundamentals(symbol)
┌─ Check Memory Cache (7 day TTL)
│  └─ YES → Return
│
└─ NO → Load from SQLite (latest snapshot)
   ├─ Success? → Cache Memory (7d) + IndexedDB (30d) → Return
   └─ Fail → Fetch from API
      └─ Cache all tiers → Return
```

### 4. Screener Results (Complex filtering, heavily cached)
```
Request: filterStocks(conditions)
┌─ Check Query Cache (identical conditions, 5 min TTL)
│  └─ YES → Return cached results
│
└─ NO → Execute SQLite query
   ├─ Paginate results (50 items/page)
   ├─ Cache full result set (5 min TTL, 50-entry limit)
   └─ Return paginated subset
```

**Implementation**: [screener.ts](src/pages/api/screener.ts), [stock-service.ts](src/lib/stock-service.ts)

---

## Tier Specifications

### Tier 1: SQLite (Database)

**When to use**:
- ✅ Complex queries (filtering, aggregation)
- ✅ Transactions (portfolio updates, trades)
- ✅ Real-time data consistency needed
- ✅ Large datasets (5000+ stocks)

**Characteristics**:
- Location: `/stocks.db` (client-side with sql.js)
- Speed: 50-500ms per query
- Persistence: Across sessions (IndexedDB storage)
- Scope: Server-side + Client-side (WASM)

**Tables**:
```sql
stocks (id, symbol, name, industry, market)
daily_prices (id, symbol, date, open, high, low, close, volume)
fundamentals (id, symbol, date, pe, pb, dividend_yield, eps, roe)
dividends (id, symbol, year, cash_div, stock_div)
portfolio (id, symbol, shares, avg_cost, buy_date)
```

**Query Examples**:
```typescript
// Complex filter with JOIN
SELECT s.*, f.pe, f.pb FROM stocks s
LEFT JOIN fundamentals f ON s.symbol = f.symbol
WHERE f.pe < 15 AND f.dividend_yield > 5
ORDER BY s.symbol

// Historical data (sorted by date)
SELECT * FROM daily_prices 
WHERE symbol = '2330' 
ORDER BY date DESC LIMIT 60

// Aggregation (technical analysis)
SELECT symbol, 
       AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) as MA10,
       COUNT(*) OVER (PARTITION BY symbol) as total_records
FROM daily_prices
```

**Cache Strategy** (Tier 1 → Memory):
- Query result cached for 5 minutes
- LRU eviction at 50 cached queries
- File: [stock-service.ts](src/lib/stock-service.ts) - `queryCache` Map

---

### Tier 2: Local Files (Static/Build-time)

**When to use**:
- ✅ Reference data (stock list, metadata)
- ✅ Build-time preparation (static generation)
- ✅ Network unavailability (offline access)
- ✅ Fast initial page load

**Characteristics**:
- Location: `public/data/` directory
- Speed: <5ms (filesystem access in dev, pre-cached in browser)
- Persistence: Downloaded with PWA
- Scope: Browser access via fetch()

**Files Structure**:
```
public/data/
├─ stocks.json              // All stocks: {symbol, name, industry, market}
├─ latest_prices.json      // Current prices: {symbol: price}
├─ history_master.json     // Full price history (pre-aggregated)
├─ price_index.json        // Symbol → available date range mappings
├─ README.md               // Data spec and schema
└─ prices/                 // Per-stock archives
   ├─ 2330.json
   ├─ 2412.json
   └─ [symbol].json
```

**File Sizes**:
- `stocks.json`: ~50KB (5000 records)
- `latest_prices.json`: ~30KB (5000 current prices)
- `history_master.json`: ~5MB (compressed, multiple years)
- `prices/[symbol].json`: ~10-50KB per stock (60-120 trading days)

**Load Strategy**:
```typescript
// Option A: Static import (small files)
import stocks from '../../public/data/stocks.json';

// Option B: Fetch (large files, lazy)
const response = await fetch('/data/prices/2330.json');
const prices = await response.json();

// Option C: IndexedDB cache (large files, persistent)
const cached = await getCache('symbol:2330:prices');
if (!cached) {
    const data = await fetch('/data/prices/2330.json').then(r => r.json());
    await setCache('symbol:2330:prices', data, 7 * 24 * 60 * 60 * 1000); // 7 days
}
```

**Build Process**:
- Scripts update `public/data/` files nightly
- Uses fetched data from APIs (TWSE, Yahoo)
- Aggregates into optimized JSON structures
- Compresses for browser download

---

### Tier 3: API URLs (External sources)

**When to use**:
- ✅ Real-time data required
- ✅ Update frequency > build cycle (nightly)
- ✅ Fallback when local sources unavailable
- ✅ Premium/specialized data

**Characteristics**:
- Location: External URLs
- Speed: 500ms-2s (network + parsing)
- Persistence: Application-level caching
- Scope: Backend only (CORS, API keys)

**Data Sources**:
```
TWSE (Taiwan Stock Exchange)
├─ URL: https://www.twse.com.tw/...
├─ Endpoint: Stock list, daily prices, company info
├─ Frequency: Daily EOD
└─ Cache: Server-side (in screener.ts)

Yahoo Finance
├─ URL: https://query1.finance.yahoo.com/...
├─ Endpoint: Historical data, fundamentals
├─ Frequency: Daily
└─ Cache: File-based (nightly batch)

Internal APIs
├─ /api/screener - Filtered stock list (paginated)
├─ /api/prices/[symbol] - Stock prices (with fallback)
└─ Server-side cache: 5 min TTL
```

**Rate Limiting**:
- Respect API limits: 100 requests/min typical
- Implement exponential backoff on 429 (Too Many Requests)
- Cache aggressively to reduce API calls
- Batch requests when possible

---

## Cache Layer Consolidation

### Memory Cache (Fastest)
```typescript
// File: src/lib/cache-manager.ts, src/lib/stock-service.ts
const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_SIZE = 10 * 1024 * 1024; // 10MB
const MEMORY_TTL = 5 * 60 * 1000; // 5 minutes

// Usage
const result = getFromMemory(key); // <1ms hit
if (!result) {
    const data = await fetch(...);
    setToMemory(key, data, MEMORY_TTL);
}
```

**Lifetime**: Request → 5 minutes  
**Speed**: <1ms  
**Scope**: Per-process (all requests share)

### IndexedDB (Persistent)
```typescript
// File: src/lib/cache-manager.ts
const config = {
    dbName: 'tw-stock-app-cache',
    storeName: 'cache-store',
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
};

await setCache(key, data, ttl, config);
const cached = await getCache(key, config);
```

**Lifetime**: Page load → 7 days  
**Speed**: <50ms  
**Scope**: Single browser/device

### HTTP Cache-Control (Browser)
```typescript
// File: src/pages/api/prices/[symbol].ts
return new Response(json, {
    headers: {
        'Cache-Control': 'public, max-age=3600' // 1 hour browser cache
    }
});
```

**Lifetime**: Network request → 1 hour  
**Speed**: <5ms (from browser cache)  
**Scope**: Single browser

---

## Data Consistency Rules

### Tier Priority (Fallback Chain)
```
Request for Data
├─ Is it available in Memory? (5 min fresh)
│  └─ YES → Use it (fast path)
│
├─ Is it available in IndexedDB? (7 day fresh)
│  └─ YES → Use it, update Memory
│
├─ Is it available in Local Files? (build-time fresh)
│  └─ YES → Use it, cache both tiers
│
└─ Fetch from API (always fresh)
   └─ Cache all tiers
      └─ Return data
```

### Update Strategy
```
Build Time (Nightly):
├─ Fetch latest data from APIs
├─ Aggregate into local files (public/data/*)
├─ Deploy updated files
└─ Browser downloads on next page load

Runtime (Per Request):
├─ Check all cache tiers first
├─ 90% of requests hit cache
└─ 10% miss → Fetch from API
   └─ Should not happen during build window
```

### Stale Data Handling
```
Valid Cache:
├─ Memory (0-5 min): Fresh ✅
├─ IndexedDB (0-7 day): Fresh ✅
├─ Local Files: Fresh ✅ (updated nightly)
└─ API: Always fresh ✅

Stale Cache:
├─ Memory (>5 min): Expired ❌ → request new
├─ IndexedDB (>7 day): Expired ❌ → request new
└─ Handle gracefully with previous value or loading state
```

---

## Implementation Checklist

### ✅ P0 Complete
- [x] Memory cache for queries (stock-service.ts)
- [x] IndexedDB persistent cache (cache-manager.ts)
- [x] API pagination & server-side cache (screener.ts)
- [x] Dynamic route fix (`prerender = false`)
- [x] Local file fallback structure ready

### 🟡 P1 Readiness
- [ ] Optimize local file loading (lazy fetch)
- [ ] Implement file-based cache strategy
- [ ] Add API error handling with fallback
- [ ] Build cache warm-up on app start
- [ ] Monitor cache hit rates

### 🔲 P2 Enhancement
- [ ] GraphQL API for complex queries
- [ ] Advanced filtering optimization
- [ ] Predictive cache warming
- [ ] A/B testing on cache strategies
- [ ] Offline-first mode improvements

---

## Performance Targets

| Operation | Before | Target | Status |
|-----------|--------|--------|--------|
| Stock list load | 500ms | <50ms | ✅ Cached |
| Price fetch | 200ms | <1ms | ✅ Memory cache |
| Filter query | 500ms | <10ms | ✅ Query cache |
| Screener pagination | N/A | <100ms | ✅ API cache |
| Local file access | N/A | <5ms | ✅ Build-time |

---

## API Endpoints Data Source Reference

| Endpoint | Data Tier | Cache | TTL | Status |
|----------|-----------|-------|-----|--------|
| `/api/screener` | SQLite + Memory | Query result cache | 5 min | ✅ |
| `/api/prices/[symbol]` | Local file fallback | HTTP header | 1 hour | ✅ |
| `/stocks/[symbol]` | SQLite + Local | Memory | 5 min | ✅ |
| `/filter` | API → Cache | Multi-tier | 5 min → 7 day | ✅ |

---

## Usage Examples

### Load Stock Data (Automatic Tier Selection)
```typescript
import { getStock, getStocks, filterStocks } from '../../lib/stock-service';

// Metadata (from Tier 1: SQLite, fallback to Tier 2: Local files)
const stock = await getStock('2330');

// Complex filter (Tier 1: SQLite with query cache)
const results = await filterStocks({
    maxPE: 15,
    minYield: 5,
    page: 1,
    limit: 50
});
```

### Load Price Data (Priority: Memory → IndexedDB → Local → API)
```typescript
import { fetchStockPrices } from '../../utils/priceService';
import { getCache, setCache } from '../../lib/cache-manager';

const prices = await fetchStockPrices('2330'); // Auto-cascades through tiers
```

### Manual Cache Management
```typescript
import { getCache, setCache, clearCache } from '../../lib/cache-manager';

// Store custom data
await setCache('my-analysis', { data: [...] }, 60 * 60 * 1000); // 1 hour

// Retrieve
const cached = await getCache('my-analysis');

// Clear expired
await cleanExpiredCache();
```

---

## Troubleshooting

**Issue**: Cache hit rate low (<50%)
- Solution: Verify TTL settings match usage patterns
- Check: Memory cache size not exceeded
- Action: Extend IndexedDB TTL for slower-changing data

**Issue**: Stale data shown
- Solution: Reduce cache TTL for critical data
- Check: Build process updates local files
- Action: Add cache busting on app version update

**Issue**: API rate limit errors
- Solution: Increase cache TTL, reduce API calls
- Check: Build process batches API requests
- Action: Implement request queuing during build

---

## References

- [Cache Manager](src/lib/cache-manager.ts) - IndexedDB implementation
- [Stock Service](src/lib/stock-service.ts) - Query caching
- [Screener API](src/pages/api/screener.ts) - Pagination + caching
- [Price Service](src/utils/priceService.ts) - Price data loading
- [Data Specification](public/data/README.md) - File formats
- **[DATA_UPDATE_STRATEGY.md](DATA_UPDATE_STRATEGY.md)** - How data flows FROM API → Local Files → SQLite

