# 003 — 儲存引擎 (Storage Engines)

> Layer 3：提供雙引擎 SQLite 存取能力，根據執行環境自動選擇 Server 或 Client 引擎。

## 職責定義

本層負責**低階資料庫連線管理與資料持久化**：
1. Server-side：用 `better-sqlite3` 直接開啟 `stocks.db`（同步、高效能）
2. Client-side：用 `sql.js` (WASM) 載入資料庫至記憶體，搭配 IndexedDB 持久化
3. 自動判斷執行環境 (`typeof window === 'undefined'`) 並選擇對應引擎

本層不包含業務邏輯，只提供「開啟資料庫」、「執行 SQL」、「儲存/載入」的原始能力。

## 模組清單

| 模組 | 大小 | 角色 | 測試 |
|------|------|------|------|
| `src/utils/db.ts` | 1KB | Server 端連線管理（單例） | ❌ |
| `src/lib/database.ts` | 10KB | Client 端 sql.js + IndexedDB 管理 | ✅ |
| `src/lib/sqlite-service.ts` | 17KB | 統一查詢界面（自動切換引擎） | ✅ |

## Server-side 引擎 — `utils/db.ts`

```typescript
import Database from 'better-sqlite3';

let db: Database | null = null;

export function getDb() {
    if (db) return db;
    db = new Database('public/data/stocks.db', { readonly: true });
    db.pragma('journal_mode = WAL');
    return db;
}

export function queryStocks(sql: string, params: any[] = []) {
    return getDb().prepare(sql).all(params);  // 同步查詢
}
```

**特性**：
- 單例模式，整個 Server 生命週期只開啟一次
- `readonly: true` — 防止意外寫入
- WAL 模式 — 支持讀寫並行
- **同步 API** — 直接 `.all()` 回傳結果，無需 await

## Client-side 引擎 — `database.ts`

### IndexedDB 持久化

```
IndexedDB 結構:
├── Database Name: 'tw-stock-db'
├── Object Store: 'sqlitedb'
└── Key: 預設 (auto)
    └── Value: Uint8Array (整個 SQLite DB 的二進位資料)
```

### 初始化流程

```
getDatabase()
    │
    ├── db 已存在？ → 直接回傳
    │
    ├── SQL 引擎未載入？
    │   └── initSQL() → initSqlJs({ locateFile: ... })
    │       └── 從 CDN 載入 sql-wasm.wasm
    │
    ├── 嘗試從 IndexedDB 載入 DB
    │   └── loadFromIndexedDB() → Uint8Array | null
    │
    ├── 有快取？
    │   └── new SQL.Database(cached) → db
    │
    └── 無快取？
        └── new SQL.Database() → 空 DB
        └── createSchema(db) → 建立 7 張表
```

### Schema 表格（Client 專用）

```sql
stocks          — 股票基本資料
daily_prices    — 每日行情
price_history   — 歷史行情
fundamentals    — 基本面（PE/PB/Yield/EPS/ROE/現金流/PEG）
chips           — 籌碼面（三大法人、籌碼集中度）
dividends       — 股利歷史
portfolio       — 投資組合 ← Client 專用
transactions    — 交易紀錄 ← Client 專用
watchlist       — 自選股   ← Client 專用
```

### 自動備份機制

```typescript
// 每 30 秒自動儲存到 IndexedDB
setInterval(() => { if (db) saveDatabase(); }, 30000);

// 頁面關閉前備份到 localStorage（緊急備份）
window.addEventListener('beforeunload', () => {
    const data = db.export();
    const base64 = btoa(String.fromCharCode(...data));
    localStorage.setItem('tw-stock-db-backup', base64);
});
```

### 提供的原始操作

| 函式 | 說明 |
|------|------|
| `getDatabase()` | 取得 Database 實例（含初始化） |
| `query<T>(sql, params)` | 執行 SELECT，回傳型別安全結果 |
| `execute(sql, params)` | 執行 INSERT/UPDATE/DELETE，回傳影響行數 |
| `batchInsert(table, columns, rows)` | 批次插入（transaction 包裝） |
| `saveDatabase()` | 匯出 DB → 存入 IndexedDB |
| `exportDatabase()` | 匯出為 Blob（供使用者下載） |
| `importDatabase(file)` | 從使用者上傳的檔案匯入 |
| `clearDatabase()` | 清空整個 IndexedDB |

## 統一查詢界面 — `sqlite-service.ts`

```typescript
function isServer(): boolean {
    return typeof window === 'undefined';
}

async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (isServer()) {
        // better-sqlite3 同步查詢
        const db = getServerDb();
        return db.prepare(sql).all(...params) as T[];
    } else {
        // sql.js 非同步查詢
        const db = await getClientDb();
        const stmt = db.prepare(sql);
        // ... 綁定參數、提取結果
    }
}
```

**Client 端 DB 下載流程**：
```
getClientDb()
    ├── 先檢查 IndexedDB 快取 → loadDbFromIndexedDB()
    ├── 有快取 → new SQL.Database(cachedData)
    └── 無快取 → fetch('/data/stocks.db')
                → 存入 IndexedDB → saveDbToIndexedDB(buffer)
                → new SQL.Database(new Uint8Array(buffer))
```

## Local-First 策略

```
資料存取優先順序:
1. IndexedDB 快取    ← 最快（已下載的 .db 檔）
2. Server API        ← 次快（SSR 或 fetch）
3. LocalStorage 備份 ← 緊急（beforeunload 備份）
4. 內嵌靜態資料      ← 最後手段
```

## 效能數據

| 操作 | Server (better-sqlite3) | Client (sql.js) |
|------|-------------------------|-----------------|
| 全部股票 + 最新價格 | < 10ms | < 50ms |
| 單一股票搜尋 | < 5ms | < 20ms |
| 條件篩選 | < 20ms | < 100ms |
| 歷史價格 (365天) | < 5ms | < 30ms |

## 待辦任務

- [ ] **T3-01**: IndexedDB 容量監控 — 偵測剩餘空間，超過 200MB 時自動清理舊資料
- [ ] **T3-02**: sql.js WASM 載入失敗的 fallback — 改用 JSON API 降級
- [ ] **T3-03**: DB 版本號檢查 — Client 快取的 .db 與 Server 版本不同時自動重新下載
- [ ] **T3-04**: `utils/db.ts` 加入測試（mock better-sqlite3）
