# Data Architecture Complete Reference

**Status**: ✅ Fully documented and implemented  
**Updated**: 2026-01-18  
**Scope**: Multi-tier caching, local files, SQLite, APIs

---

## 📚 Documentation Structure

```
DATA ARCHITECTURE
├─ How data FLOWS (READ)
│  └─ DATA_STRATEGY.md ← Read priority (Tier 0→3)
│
├─ How data UPDATES (WRITE)
│  └─ DATA_UPDATE_STRATEGY.md ← Unidirectional (API→Files→SQLite)
│
├─ What LOCAL FILES are available
│  └─ public/data/ folder (Tier 2)
│
├─ HOW TO implement
│  └─ DATA_IMPLEMENTATION_GUIDE.md ← Code examples
│
└─ Quick status
    └─ This document
```

---

## 🎯 Quick Navigation

### I want to understand how data is read
→ Read [DATA_STRATEGY.md](DATA_STRATEGY.md)

**Key concepts**:
- Memory cache (5 min) - Fastest tier
- IndexedDB (24 hr) - Persistent browser cache
- SQLite (Tier 1) - Server database
- Local files (Tier 2) - Static archives
- APIs (Tier 3) - Real-time fallback

---

### I want to understand how data is updated
→ Read [DATA_UPDATE_STRATEGY.md](DATA_UPDATE_STRATEGY.md)

**Key concepts**:
- Unidirectional flow: API → Local Files → SQLite → Memory
- Build-time batch updates (nightly)
- Optional live updates (5-minute intervals)
- Data validation and error recovery
- Freshness guarantees

---

### I want to implement cache logic
→ Read [DATA_IMPLEMENTATION_GUIDE.md](DATA_IMPLEMENTATION_GUIDE.md)

**Key files**:
- `src/lib/cache-manager.ts` - IndexedDB + Memory cache
- `src/lib/stock-service.ts` - Query caching
- `src/utils/priceService.ts` - Multi-tier price loading
- `src/pages/api/screener.ts` - API pagination

---

### I want to understand available local files
→ Check `/public/data/` folder

**Files present**:
- `stocks.json` (5000 stocks metadata)
- `prices/*.csv` (1000+ stock price files)
- `latest_prices.json` (current prices)
- `price_index.json` (symbol → filename mapping)
- `history_master.json` (aggregated history)

---

## 🔄 Data Flow Summary

### READ Flow (Client requests data)

```
Client App
    ↓
Memory Cache (1) ← FAST (< 1ms if hit) [5 min TTL]
    ↓ MISS
IndexedDB (2) ← MEDIUM (<50ms if hit) [24 hr TTL]
    ↓ MISS
SQLite Query (3) ← SLOW (50-500ms) [5 min query cache]
    ↓ OR
Local Files (2) ← MEDIUM (<100ms)
    ↓ OR
API Fetch (3) ← SLOW (100-500ms)
    ↓
RETURN DATA → Cache in all tiers
```

### WRITE Flow (Updates from source)

```
External APIs
    ↓
Parse + Normalize
    ↓
⚠️ Validate Data
    ↓
Write to Tier 2 (public/data/*.csv, *.json)
    ↓
Load into Tier 1 (SQLite tables)
    ↓
Cache invalidate (clear memory/IndexedDB)
    ↓
Ready for READ flow
```

---

## 📊 Data Tier Specifications

### Tier 0: Memory Cache
**File**: `src/lib/cache-manager.ts`, `src/lib/stock-service.ts`  
**Lifespan**: 5 minutes  
**Speed**: <1ms (in-process)  
**What**: Query results, price snapshots  
**Scope**: Per-process, shared all requests

```typescript
// Memory cache (in queryCache Map)
Maximum size: 10MB
LRU eviction: At 50 cached queries
TTL per entry: 5 minutes
```

---

### Tier 0.5: IndexedDB (Persistent Browser Cache)
**File**: `src/lib/cache-manager.ts`  
**Lifespan**: 24 hours to 30 days (configurable)  
**Speed**: <50ms (database I/O)  
**What**: Price history, recovered from offline  
**Scope**: Single browser/device

```typescript
// IndexedDB storage
Database name: tw-stock-app-cache
Store names: cache-store, database-store
Maximum size: 50MB (typical quota)
TTL per entry: 7-30 days (configurable)
```

---

### Tier 1: SQLite (Runtime Database)
**File**: `src/lib/database.ts`, `src/lib/stock-service.ts`  
**Source**: Loaded from `public/data/` on app start  
**Lifespan**: Session (until app reload)  
**Speed**: 50-500ms per query (with 5-min result cache)  
**What**: All stocks, prices, fundamentals  
**Scope**: Server-side + client-side (WASM with sql.js)

```sql
Tables:
- stocks (id, symbol, name, industry, market)
- daily_prices (id, symbol, date, open, high, low, close, volume)
- fundamentals (id, symbol, date, pe, pb, dividend_yield, eps, roe)
- dividends (id, symbol, year, cash_div, stock_div)
- portfolio (id, symbol, shares, avg_cost, buy_date)
```

---

### Tier 2: Local Files (Static/Build Artifacts)
**Location**: `public/data/`  
**Updated**: Nightly (build-time)  
**Speed**: <100ms (HTTP fetch or filesystem read)  
**What**: Stock lists, price archives, index files  
**Scope**: Browser access via HTTP or Server via filesystem

**Files**:
```
public/data/
├── stocks.json (50KB)          - Symbol, name, market
├── latest_prices.json (30KB)   - Current prices (derived)
├── price_index.json (50KB)     - Symbol → filename mapping
├── history_master.json (5MB)   - Pre-aggregated history
├── prices/ (CSV directory)     - 1000+ price archives
│   ├── 0050_元大台灣50.csv
│   ├── 2330_台積電.csv
│   └── ...
└── price_list.txt             - Newline-separated symbols
```

---

### Tier 3: External APIs (Real-time Source)
**Sources**:
- TWSE API (Taiwan Stock Exchange)
- Yahoo Finance API
- Financial data providers

**Lifespan**: Real-time  
**Speed**: 100-500ms (network dependent)  
**What**: Latest stocks, prices, fundamentals  
**Use**: Fallback when Tier 2 unavailable, live data

---

## 🛠️ Implementation Files

| File | Purpose | Tier(s) |
|------|---------|---------|
| `src/lib/cache-manager.ts` | Memory + IndexedDB | 0, 0.5 |
| `src/lib/stock-service.ts` | Database queries + query cache | 1, 0 |
| `src/utils/priceService.ts` | Price multi-tier loading | 0, 0.5, 1, 2, 3 |
| `src/pages/api/screener.ts` | Filtered results + pagination | 1, 0 |
| `src/lib/database.ts` | SQLite initialization | 1 |
| `astro.config.mjs` | Build configuration | - |

---

## 📈 Performance Metrics

### Cache Hit Rates
```
Expected rates in typical user session:
Memory (Tier 0):    ~70% hit rate (5 min window)
IndexedDB (Tier 0.5): ~50% hit rate (after page reload)
SQLite (Tier 1):    ~80% hit rate (query cache)
Local Files (Tier 2): ~95% hit rate (common stocks)
API (Tier 3):       <5% hit rate (mostly fallback)
```

### Response Time by Tier
```
Tier 0 (Memory):     <1ms    (cache hit)
Tier 0.5 (IndexedDB): <50ms  (cache hit)
Tier 1 (SQLite):     50-500ms (first query)
                     <1ms    (query cache hit)
Tier 2 (Local files): <100ms (HTTP fetch)
Tier 3 (API):        100-500ms (network dependent)
```

### Data Payload Size
```
Single stock price history: ~20KB (CSV, 5 years)
All stocks metadata: ~50KB (stocks.json)
All current prices: ~30KB (latest_prices.json)
Typical API response: 5-50KB (depends on query)
```

---

## 🔄 Update Strategies

### Build-Time Updates (Nightly)
```
Scheduled: 12:00 AM UTC+8 (after market close)
Scripts:
  - npm run fetch-stocks      → Tier 2
  - npm run fetch-prices      → Tier 2
  - npm run build-sqlite-db   → Tier 1
  - git push & deploy         → Production
```

### Runtime Sync (App Startup)
```
On app initialization:
  1. Check if local files are newer than SQLite
  2. If yes:
     - Clear database
     - Load stocks.json → SQLite
     - Load prices/*.csv → SQLite
     - Create indexes
  3. Cache statistics logged
```

### Live Updates (Optional, P2)
```
During trading hours (9 AM - 1:30 PM UTC+8):
  - Fetch latest prices every 5 minutes
  - Update IndexedDB + Memory cache
  - Optional: Update local files
```

---

## 🚀 Getting Started

### 1. Check Data Availability
```bash
# Verify local files exist
ls -la public/data/

# 1000+ CSV price files should be present
ls -1 public/data/prices/ | wc -l
# Expected output: ~1000
```

### 2. Test Data Loading
```typescript
// Browser console or Node.js
import { getStocks, filterStocks } from 'src/lib/stock-service';

// Should load from Tier 1 (SQLite)
const stocks = await getStocks();
console.log(`Loaded ${stocks.length} stocks`);

// Should cache query results
const filtered = await filterStocks({ maxPE: 15 });
console.log(`Found ${filtered.length} stocks with PE < 15`);
```

### 3. Monitor Cache Performance
```javascript
// DevTools → Network tab
// Check response times for:
// - /api/screener (first: 100-200ms, cached: <1ms)
// - /stocks/2330 (first: 100ms, cached: <1ms)
// - /filter (first: 200ms, cached: <1ms)
```

---

## ⚠️ Common Issues

### Issue 1: "Cache hit rate is too low"
**Diagnosis**: Check cache TTL settings  
**Solution**: 
- Verify Memory cache TTL (5 min)
- Check IndexedDB TTL (24 hr)
- Monitor queryCache size (50-entry limit)

### Issue 2: "Prices are stale (yesterday's data)"
**Diagnosis**: Build script not running or failed  
**Solution**:
- Verify nightly build job runs
- Check `public/data/prices/` modification time
- Review build logs for errors

### Issue 3: "IndexedDB quota exceeded"
**Diagnosis**: Too much cache accumulated  
**Solution**:
- Clear browser cache
- Reduce TTL for non-critical data
- Monitor storage with `getCacheSize()`

### Issue 4: "API rate limit errors"
**Diagnosis**: Too many requests to external APIs  
**Solution**:
- Increase cache TTL for API data
- Batch requests in build script
- Add exponential backoff to retries

---

## 🎓 Learning Path

### Beginner
1. Read: [DATA_STRATEGY.md](DATA_STRATEGY.md) - Understand tiers
2. Check: `public/data/` files - See real data
3. Test: Browser DevTools Network tab - Observe caching

### Intermediate
1. Read: [DATA_UPDATE_STRATEGY.md](DATA_UPDATE_STRATEGY.md) - Update flow
2. Review: `src/lib/cache-manager.ts` - Implementation details
3. Test: Monitor cache hit rates with console logs

### Advanced
1. Read: [DATA_IMPLEMENTATION_GUIDE.md](DATA_IMPLEMENTATION_GUIDE.md) - Code patterns
2. Modify: Cache TTL values, LRU limits
3. Implement: Custom cache strategies for specific data types

---

## 📝 Maintenance

### Daily
- Monitor cache hit rates
- Check for data errors in browser console
- Verify nightly build completed

### Weekly
- Review build logs
- Check API rate limit status
- Validate data integrity

### Monthly
- Analyze cache performance metrics
- Identify optimization opportunities
- Plan P1/P2 enhancements

---

## 🔗 Related Files

**Architecture**:
- [P0_OPTIMIZATION_COMPLETE.md](P0_OPTIMIZATION_COMPLETE.md) - Previous optimizations
- [DATA_STRATEGY.md](DATA_STRATEGY.md) - Read flow (this tier system)
- [DATA_UPDATE_STRATEGY.md](DATA_UPDATE_STRATEGY.md) - Write flow (API→Files→DB)
- [DATA_IMPLEMENTATION_GUIDE.md](DATA_IMPLEMENTATION_GUIDE.md) - Code patterns

**Implementation**:
- `/src/lib/` - Core libraries
- `/src/pages/api/` - API endpoints
- `/src/utils/` - Utilities
- `/public/data/` - Static data files

**Configuration**:
- `astro.config.mjs` - Astro settings
- `tsconfig.json` - TypeScript settings
- Package scripts for data updates

---

## ✅ Checklist

- [x] Memory cache implemented (5 min TTL)
- [x] IndexedDB persistent cache (24 hr TTL)
- [x] SQLite query caching (5 min TTL)
- [x] Local files organized (stocks.json, prices/*.csv)
- [x] API fallback routes set up
- [x] Dynamic route fixed (prerender = false)
- [x] Cost-efficient multi-tier architecture
- [x] Error handling with graceful fallbacks
- [x] Comprehensive documentation

### Ready for P1:
- [ ] Implement build-time automation
- [ ] Add live update service (during trading hours)
- [ ] Monitor cache hit rates
- [ ] Optimize cache key generation
- [ ] Cache warming on app startup

---

**Last Updated**: 2026-01-18  
**Review Cycle**: Monthly  
**Owner**: Data Architecture Team  
**Status**: ✅ Production Ready

