# Data Update Strategy: API → Local Files → SQLite

**Date**: 2026-01-18  
**Focus**: Unidirectional data flow for updates  
**Goal**: Keep all tiers in sync with authoritative source (APIs)

---

## Update Flow Architecture

```
AUTHORITATIVE SOURCE
        ↓
    API Fetch
        ↓
    ┌─────────────────────────────┐
    │  Tier 3: External APIs      │ (Real-time, authoritative)
    │  ├─ TWSE API (Taiwan)       │
    │  ├─ Yahoo Finance           │
    │  └─ Financial Data Provider │
    └──────────┬──────────────────┘
               │
        [Parse & Normalize]
               │
               ↓
    ┌─────────────────────────────┐
    │  Tier 2: Local Files        │ (Build artifacts, static)
    │  ├─ public/data/stocks.json │
    │  ├─ public/data/prices/*.csv│
    │  └─ public/data/*.json      │
    └──────────┬──────────────────┘
               │
        [Convert to SQL]
               │
               ↓
    ┌─────────────────────────────┐
    │  Tier 1: SQLite Database    │ (Runtime cache)
    │  ├─ stocks table            │
    │  ├─ daily_prices table      │
    │  └─ fundamentals table      │
    └─────────────────────────────┘
               │
               ↓
        [Query Cache]
               │
               ↓
    ┌─────────────────────────────┐
    │  Tier 0: Memory/IndexedDB   │ (Runtime cache)
    │  ├─ Query results (5 min)   │
    │  ├─ Price history (24 hr)   │
    │  └─ User data (session)     │
    └─────────────────────────────┘
               │
               ↓
           USER APP
```

### Direction: Write Flow Only (No reverse updates)
```
API ──→ Local Files ──→ SQLite ──→ Memory Cache
 │         (Tier 2)      (Tier 1)   (Tier 0)
 │
 └─ Never updates API from local data
 └─ Never updates API from SQLite
 └─ Never updates API from cache
```

---

## Update Strategies by Data Type

### 1. Stock Metadata (Stocks.json)

**Source**: TWSE API + Internal database  
**Tier 2 File**: `public/data/stocks.json`  
**Tier 1 Table**: `stocks` table

**Update Schedule**:
```
├─ Real-time: Only if new stocks listed (rare)
├─ Batch: Weekly via build script
└─ Manual: When company names change
```

**Flow**:
```typescript
// Step 1: Fetch from API (TWSE)
async function updateStockMetadata() {
    const api = await fetch('https://www.twse.com.tw/api/...');
    const stocks = await api.json(); // Latest stock list
    
    // Step 2: Merge with existing + add calculated fields
    const enriched = stocks.map(stock => ({
        symbol: stock.code,
        name: stock.name,
        market: stock.market || 'TSE',
        industry: stock.industry,
        listed_date: stock.listedDate,
        isin: stock.isin
    }));
    
    // Step 3: Write to Tier 2 (local file)
    fs.writeFileSync(
        'public/data/stocks.json',
        JSON.stringify(enriched, null, 2)
    );
    
    // Step 4: Load into Tier 1 (SQLite)
    await loadStocksIntoDatabase(enriched);
}
```

**Freshness Guarantee**:
- Local files: Updated weekly
- SQLite: Updated during app startup
- Memory cache: 5-minute TTL

---

### 2. Daily Stock Prices (prices/*.csv)

**Source**: Yahoo Finance API or TWSE  
**Tier 2 Files**: `public/data/prices/[symbol].csv` (CSV format)  
**Tier 1 Table**: `daily_prices` table

**Update Schedule**:
```
├─ Real-time (Live mode): Every 5 minutes during trading hours
├─ End-of-day: Daily at 1:30 PM UTC+8 (after market close)
└─ Historical: Monthly full refresh (5-year archive)
```

**Flow**:
```typescript
// Step 1: Fetch from API (Yahoo Finance)
async function updateStockPrices(symbol: string) {
    const yahooApi = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/...';
    const response = await fetch(yahooApi);
    const apiData = await response.json();
    
    // Parse: Convert API format → Standard OHLCV
    const prices = parseYahooData(apiData);
    
    // Step 2: Load existing data from Tier 2 (local file)
    const csv = fs.readFileSync(`public/data/prices/${symbol}_*.csv`, 'utf-8');
    const existing = parseCSV(csv);
    
    // Step 3: Merge (de-duplicate dates)
    const merged = mergeByDate(existing, prices);
    
    // Step 4: Write to Tier 2 (local file, CSV)
    const csvText = convertToCSV(merged);
    fs.writeFileSync(
        `public/data/prices/${symbol}_${name}.csv`,
        csvText
    );
    
    // Step 5: Load into Tier 1 (SQLite)
    await insertIntoDatabase('daily_prices', merged);
}
```

**CSV Format Storage** (Tier 2):
```
Date,Open,High,Low,Close,Volume,Turnover,Change,ChangePct
2024-12-31,580.0,585.0,578.0,583.0,25000.0,14575000000,3.0,0.5
2024-12-30,576.0,582.0,575.0,580.0,22000.0,12760000000,-1.0,-0.17
```

**Freshness Guarantee**:
- Local files: Updated daily (EOD)
- SQLite: Kept in sync
- Memory cache: 5-minute TTL (during live trading)

---

### 3. Fundamentals & Metrics (pe, pb, yield, roe, eps)

**Source**: Financial data providers (TWSE, Yahoo Finance)  
**Tier 2 File**: `public/data/fundamentals.json` (aggregated)  
**Tier 1 Table**: `fundamentals` table

**Update Schedule**:
```
├─ Quarterly: After earnings announcements
├─ Daily: Only price-derived metrics (yield, pe, pb)
└─ Batch: Monthly full refresh
```

**Flow**:
```typescript
// Step 1: Fetch fundamentals data
async function updateFundamentals(symbol: string) {
    // Get latest close price
    const latestPrice = await getLatestPrice(symbol);
    
    // Fetch fundamentals (quarterly)
    const financial = await fetchFromFinancialAPI(symbol);
    
    // Calculate derived metrics
    const fundamentals = {
        symbol,
        date: today(),
        pe: financial.eps > 0 ? latestPrice / financial.eps : null,
        pb: financial.bookValue ? latestPrice / financial.bookValue : null,
        dividend_yield: financial.dividend ? financial.dividend / latestPrice : null,
        eps: financial.eps,
        roe: financial.roe,
        debt_ratio: financial.debt / financial.assets
    };
    
    // Step 2: Write to Tier 2 (JSON)
    const all = await loadJSON('public/data/fundamentals.json');
    all[symbol] = fundamentals;
    fs.writeFileSync(
        'public/data/fundamentals.json',
        JSON.stringify(all, null, 2)
    );
    
    // Step 3: Load into Tier 1 (SQLite)
    await database.execute(
        'INSERT OR REPLACE INTO fundamentals VALUES (?,?,?,?,?,?,?,?)',
        [symbol, fundamentals.date, fundamentals.pe, ...]
    );
}
```

**Freshness Guarantee**:
- Local files: Updated daily (price-derived), quarterly (fundamentals)
- SQLite: Kept in sync
- Memory cache: 7-day TTL

---

### 4. Current Stock Prices (latest_prices.json)

**Source**: Derived from daily prices (latest row)  
**Tier 2 File**: `public/data/latest_prices.json`  
**Tier 1 Table**: Latest view of `daily_prices` table

**Update Schedule**:
```
├─ Live: Every 5 minutes during trading hours
├─ End-of-day: Daily at market close
└─ Snapshot: Updated with each price update
```

**Flow**:
```typescript
// Step 1: Get latest prices from all prices/*.csv files
async function updateLatestPrices() {
    const symbols = getSymbolList(); // From stocks.json
    const latest = {};
    
    for (const symbol of symbols) {
        const csv = fs.readFileSync(`public/data/prices/${symbol}_*.csv`);
        const rows = parseCSV(csv);
        const lastRow = rows[rows.length - 1]; // Most recent
        
        latest[symbol] = {
            date: lastRow.Date,
            price: lastRow.Close,
            change: lastRow.Change,
            changePct: lastRow.ChangePct,
            volume: lastRow.Volume
        };
    }
    
    // Step 2: Write to Tier 2 (JSON)
    fs.writeFileSync(
        'public/data/latest_prices.json',
        JSON.stringify(latest, null, 2)
    );
    // Note: SQLite already has this via latest row of daily_prices
}
```

---

## Data Synchronization Pipeline

### Build-Time Updates (Nightly)

```bash
# scripts/update-build-data.sh (runs every night at 12:00 AM UTC+8)

npm run fetch-stocks      # → public/data/stocks.json
npm run fetch-prices      # → public/data/prices/*.csv
npm run fetch-fundamentals # → public/data/fundamentals.json
npm run build-latest      # → public/data/latest_prices.json
npm run build-index       # → public/data/price_index.json
npm run build-db          # → public/stocks.db (SQLite)
npm run deploy            # Deploy updated files
```

### Runtime Updates (App Startup)

```typescript
// src/lib/database.ts - on app initialization
export async function initializeDatabase() {
    // Check local file timestamps
    const localMtime = fs.statSync('public/data/stocks.json').mtime;
    const dbMtime = getLastUpdateTime(); // From SQLite
    
    if (localMtime > dbMtime) {
        console.log('[Database] Local files newer, reloading...');
        
        // Step 1: Clear old data
        await database.execute('DELETE FROM stocks');
        await database.execute('DELETE FROM daily_prices');
        
        // Step 2: Load from Tier 2
        const stocks = JSON.parse(
            fs.readFileSync('public/data/stocks.json')
        );
        const prices = loadAllPricesFromCSV();
        
        // Step 3: Insert into SQLite
        await database.transaction(async () => {
            for (const stock of stocks) {
                await insertStock(stock);
            }
            for (const price of prices) {
                await insertPrice(price);
            }
        });
        
        console.log('[Database] Sync complete');
    }
}
```

### Live Updates (Optional, Per-Request)

```typescript
// For live trading data (5-minute refresh during market hours)
export async function fetchLivePrice(symbol: string) {
    // Check if data is stale (>5 min old)
    const lastUpdate = await getLastUpdateTime(symbol);
    if (Date.now() - lastUpdate < 5 * 60 * 1000) {
        // Still fresh, return cached
        return getCachedPrice(symbol);
    }
    
    // Fetch fresh data from API
    const price = await fetchFromAPI(symbol);
    
    // Update Tier 2 + Tier 1
    await updateSinglePrice(symbol, price);
    
    // Update cache
    await setCache(`price:${symbol}`, price);
    
    return price;
}
```

---

## Data Validation & Integrity

### Pre-Write Validation

```typescript
function validatePrice(price: any): boolean {
    return (
        price.Date && /^\d{4}-\d{2}-\d{2}$/.test(price.Date) &&
        price.Close > 0 &&
        price.Open > 0 &&
        price.High >= price.Open &&
        price.High >= price.Close &&
        price.Low <= price.Open &&
        price.Low <= price.Close &&
        price.Volume >= 0 &&
        !isNaN(price.ChangePct)
    );
}

function validateStock(stock: any): boolean {
    return (
        stock.symbol && stock.symbol.match(/^\d{4}$/) &&
        stock.name && stock.name.length > 0 &&
        ['TSE', 'OTC'].includes(stock.market)
    );
}
```

### Consistency Checks

```typescript
// After update, verify integrity
async function validateDatabaseIntegrity() {
    const stocks = await database.query('SELECT COUNT(*) FROM stocks');
    const prices = await database.query('SELECT COUNT(*) FROM daily_prices');
    
    if (stocks[0].count === 0) {
        throw new Error('Database corrupted: no stocks loaded');
    }
    
    if (prices[0].count === 0) {
        throw new Error('Database corrupted: no prices loaded');
    }
    
    // Check for orphaned prices (symbol not in stocks)
    const orphaned = await database.query(`
        SELECT DISTINCT symbol FROM daily_prices
        WHERE symbol NOT IN (SELECT symbol FROM stocks)
    `);
    
    if (orphaned.length > 0) {
        console.warn('[Integrity] Orphaned prices found:', orphaned);
    }
}
```

---

## Error Handling & Rollback

### API Fetch Failure

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, { timeout: 30000 });
            if (response.ok) return await response.json();
        } catch (error) {
            lastError = error;
            const delay = Math.pow(2, i) * 1000; // Exponential backoff
            console.log(`[API] Retry ${i + 1}/${maxRetries} in ${delay}ms`);
            await sleep(delay);
        }
    }
    
    // All retries failed
    console.error('[API] Fetch failed after retries:', lastError);
    
    // Fallback: Use existing Tier 2 data
    console.log('[Fallback] Using cached local files');
    return null; // Caller should handle
}
```

### Partial Update Recovery

```typescript
// If update fails mid-transaction, rollback automatically
async function safeUpdateDatabase(newData: any) {
    const backup = await database.backup(); // Snapshot current state
    
    try {
        // Attempt update in transaction
        await database.transaction(async () => {
            await database.execute('DELETE FROM daily_prices');
            for (const price of newData) {
                await insertPrice(price);
            }
        });
        
        console.log('[Update] Success');
        // Transaction auto-commits on success
    } catch (error) {
        console.error('[Update] Failed, rolling back');
        await database.restore(backup);
        throw error;
    }
}
```

---

## Freshness Guarantees

### Data Age vs Update Frequency

| Data Type | Update Frequency | Max Age | Tier 2 Format |
|-----------|------------------|---------|---------------|
| Stocks metadata | Weekly | 7 days | JSON |
| Daily prices | Daily (EOD) | 1 day | CSV |
| Fundamentals | Quarterly | 90 days | JSON |
| Latest prices | Daily (EOD) | 1 day | JSON |
| Price index | Weekly | 7 days | JSON |

### User-Facing Freshness Guarantees

```typescript
async function getSourceAge(symbol: string): Promise<{
    data: any;
    ageMinutes: number;
    sourceLocation: 'memory' | 'indexeddb' | 'local' | 'api';
}> {
    // Check each tier for data and its age
    
    // Tier 0: Memory (fastest)
    const memory = getFromMemory(`price:${symbol}`);
    if (memory) {
        return {
            data: memory.data,
            ageMinutes: (Date.now() - memory.timestamp) / 60000,
            sourceLocation: 'memory'
        };
    }
    
    // Tier 0.5: IndexedDB
    const indexeddb = await getCache(`price:${symbol}`);
    if (indexeddb) {
        return {
            data: indexeddb.data,
            ageMinutes: (Date.now() - indexeddb.timestamp) / 60000,
            sourceLocation: 'indexeddb'
        };
    }
    
    // Tier 2: Local files
    const local = await loadFromLocalFile(symbol);
    if (local) {
        const localAge = Date.now() - fileLastModified(`prices/${symbol}.csv`);
        return {
            data: local,
            ageMinutes: localAge / 60000,
            sourceLocation: 'local'
        };
    }
    
    // Tier 3: API (if available)
    const api = await fetchFromAPI(symbol);
    return {
        data: api,
        ageMinutes: 0,
        sourceLocation: 'api'
    };
}
```

---

## Implementation Timeline

### Phase 1: Manual Update (Current)
```bash
# Manual commands to update data
npm run fetch-stocks
npm run fetch-prices --since=2024-01-01
npm run build-db

# Commit to repo
git add public/data/
git commit -m "data: update prices 2024-01-18"
```

### Phase 2: Scheduled Updates (P1)
```bash
# Add cron job or GitHub Actions
# Daily at 12:00 AM UTC+8 (market close + 30 min)

0 0 0 * * * cd /app && npm run update-all-data
```

### Phase 3: Live Updates (P2)
```typescript
// Real-time prices during trading hours (9:00 AM - 1:30 PM UTC+8)
// Update every 5 minutes via API
// Persist to SQLite + local files

export const liveUpdateConfig = {
    enabled: true,
    trading_hours: { start: 9, end: 13 },
    update_interval: 5 * 60 * 1000, // 5 minutes
    data_sources: ['TWSE', 'Yahoo']
};
```

---

## Monitoring & Alerts

### Data Freshness Dashboard

```typescript
async function getDataQualityMetrics() {
    return {
        stocks: {
            count: await database.query('SELECT COUNT(*) FROM stocks')[0].count,
            lastUpdate: await getLastUpdateTime('stocks'),
            status: isDifferenceWithinThreshold(...) ? 'OK' : 'STALE'
        },
        prices: {
            avgAge: await calculateAverageAge(),
            missingData: await findMissingPrices(),
            outliers: await detectOutlierPrices(),
            status: hasIssues ? 'WARNING' : 'OK'
        },
        cache: {
            hitRate: calculateHitRate(),
            memoryUsage: getMemoryCacheSize(),
            indexeddbSize: await getIndexedDBSize()
        }
    };
}
```

### Update Logs

```
[2024-01-18 00:00:01] [INFO] Starting nightly data update
[2024-01-18 00:00:15] [INFO] Fetching 5000 stocks from TWSE
[2024-01-18 00:05:22] [INFO] Stocks updated: 5000 records
[2024-01-18 00:05:23] [INFO] Fetching prices for 5000 symbols
[2024-01-18 00:45:18] [INFO] Prices updated: 1,250,000 records (250 years of data × 5000 stocks)
[2024-01-18 00:45:19] [INFO] Building SQLite database
[2024-01-18 00:50:45] [INFO] Database built: 5000 stocks + 1.25M prices
[2024-01-18 00:51:00] [INFO] Building indexes and aggregates
[2024-01-18 00:55:30] [INFO] Validation complete: All checks passed ✓
[2024-01-18 00:56:00] [INFO] Deploying updated files
[2024-01-18 00:57:15] [INFO] Nightly update complete (57 minutes elapsed)
```

---

## File Organization

### Current Structure
```
public/data/
├── README.md
├── DATA_SPEC.md
├── stocks.json (5.5KB, 5000 stocks)
├── latest_prices.json (??? KB)
├── price_index.json (50KB, mapping)
├── history_master.json (5MB, aggregated)
└── prices/ (CSV archives)
    ├── 0050_元大台灣50.csv
    ├── 2330_台積電.csv
    └── ... (1000+ files)
```

### Target After Updates
```
public/data/
├── stocks.json        ← From API (TWSE)
├── latest_prices.json ← Derived from prices/*.csv
├── fundamentals.json  ← From financial API
├── price_index.json   ← Auto-generated index
├── price_list.txt     ← Symbol list for scripts
├── prices/            ← CSV archives (daily update)
│   ├── [symbol]_[name].csv
│   └── (1000+ files, 5-year history)
└── [History files]    ← Backup archive
    ├── history_master.json
    └── prices_backup_2024.tar.gz
```

---

## Scripts & Automation

### update-all-data.sh
```bash
#!/bin/bash
set -e

echo "[Data] Starting update cycle..."

# 1. Fetch latest stocks
npm run fetch-stocks --market=TSE --market=OTC

# 2. Fetch prices for all stocks
npm run fetch-prices --concurrent=10 --since=last-update

# 3. Build aggregate files
npm run build-latest-prices
npm run build-index
npm run build-fundamentals

# 4. Validate data
npm run validate-data

# 5. Build SQLite database
npm run build-sqlite-db

# 6. Deploy
git add public/data/
git commit -m "data: update $(date +%Y-%m-%d)"
git push origin main

echo "[Data] Update complete ✓"
```

---

## Summary: API → Local Files → SQLite

| Step | Source | Action | Target | Format |
|------|--------|--------|--------|--------|
| 1 | Externals (TWSE, Yahoo) | Fetch raw data | API buffer | JSON/XML |
| 2 | API | Parse + normalize | Validation | Objects |
| 3 | Validated | Write to disk | `public/data/*` | CSV/JSON |
| 4 | Local files | Read into memory | Tier 1 | SQL rows |
| 5 | Database | Cache results | Memory/IndexedDB | JS objects |
| 6 | User app | Query + filter | Frontend | React props |

**Key Points**:
- ✅ Unidirectional flow (no reverse updates)
- ✅ Build-time batch + optional live updates
- ✅ Multiple fallback layers for reliability
- ✅ Local files serve as database snapshots
- ✅ SQLite used for complex queries only

