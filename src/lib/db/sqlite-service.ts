import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * M1: Sqlite Service
 * 提供全站 (SSR / Scripts) 統一的唯讀查詢介面
 */

type SqlValue = string | number | boolean | null | Buffer;

export class SqliteService {
    private static instance: SqliteService;
    private db: InstanceType<typeof Database> | null;
    private dbPath: string | null;
    private cachedTables: Set<string>;
    private columnCache: Map<string, { name: string; type: string }[]> = new Map();
    private rowCountCache: Map<string, number> = new Map();
    private stmtCache: Map<string, ReturnType<InstanceType<typeof Database>['prepare']>> =
        new Map();

    private constructor() {
        this.dbPath = this.resolveHealthyDbPath();
        if (this.dbPath) {
            this.db = new Database(this.dbPath, { readonly: true, fileMustExist: true });
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('cache_size = -32000');
            this.db.pragma('mmap_size = 3145728000');
            this.db.pragma('temp_store = MEMORY');
            this.db.pragma('synchronous = OFF');
            this.cachedTables = new Set(this.loadTableNames());
        } else {
            this.db = null;
            this.cachedTables = new Set();
        }
    }

    private resolveHealthyDbPath(): string | null {
        const candidates = [path.resolve(process.cwd(), 'public', 'data', 'stocks.db')];

        for (const candidate of candidates) {
            if (!fs.existsSync(candidate)) continue;

            try {
                const probe = new Database(candidate, { readonly: true, fileMustExist: true });
                const integrityRes = probe.prepare('PRAGMA integrity_check').get() as {
                    integrity_check: string;
                };
                const integrity = integrityRes.integrity_check;
                probe.close();

                if (integrity === 'ok') {
                    return candidate;
                }
            } catch {
                continue;
            }
        }

        // No DB found — graceful degradation for static builds
        console.warn('[SqliteService] No SQLite database found — running in fallback mode');
        return null;
    }

    public static getInstance(): SqliteService {
        if (!SqliteService.instance) {
            SqliteService.instance = new SqliteService();
        }
        return SqliteService.instance;
    }

    /**
     * 基本查詢封裝
     */
    /**
     * Get or create a cached prepared statement
     */
    private getStmt(sql: string) {
        if (!this.db) throw new Error('DB not available');
        let stmt = this.stmtCache.get(sql);
        if (!stmt) {
            stmt = this.db.prepare(sql);
            this.stmtCache.set(sql, stmt);
        }
        return stmt;
    }

    public queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
        if (!this.db) return [];
        return this.getStmt(sql).all(...params) as T[];
    }

    public queryOne<T>(sql: string, params: SqlValue[] = []): T | undefined {
        if (!this.db) return undefined;
        return this.getStmt(sql).get(...params) as T;
    }

    /**
     * Get raw DB instance for advanced usages (like prepared statements in marketService)
     */
    public getRawDb(): InstanceType<typeof Database> {
        if (!this.db) throw new Error('DB not available');
        return this.db;
    }

    /**
     * T004: 獲取資料庫統計資訊
     */
    public getDbStats() {
        if (!this.dbPath || !this.db || !fs.existsSync(this.dbPath)) {
            return { sizeBytes: 0, sizeMB: '0.00', totalRecords: 0 };
        }
        const stats = fs.statSync(this.dbPath);
        const stockCount = (this.db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stocks'")
            .get() as { name: string } | undefined)
            ? (this.db.prepare('SELECT count(*) as count FROM stocks').get() as { count: number })
                  .count
            : 0;

        return {
            sizeBytes: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            totalRecords: stockCount,
        };
    }

    /**
     * Get list of all user tables
     */
    private loadTableNames(): string[] {
        if (!this.db) return [];
        const tables = this.db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            .all() as { name: string }[];
        return tables.map(t => t.name);
    }

    public getTables(): string[] {
        return Array.from(this.cachedTables);
    }

    /**
     * Validate table name against known tables to prevent injection
     */
    private validateTableName(table: string): string {
        if (!this.cachedTables.has(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }
        return table;
    }

    /**
     * Get column info for a table
     */
    public getTableColumns(table: string): { name: string; type: string }[] {
        const safe = this.validateTableName(table);
        if (this.columnCache.has(safe)) {
            return this.columnCache.get(safe)!;
        }

        const columns = this.db!.prepare(`PRAGMA table_info("${safe}")`).all() as {
            name: string;
            type: string;
        }[];
        const mapped = columns.map(c => ({ name: c.name, type: c.type }));
        this.columnCache.set(safe, mapped);
        return mapped;
    }

    /**
     * Get paginated table data as a flattened matrix (2D Array)
     * PERFORMANCE: Reduces JSON overhead by 40-60%
     */
    public getTableDataMatrix(
        table: string,
        options: { limit: number; offset: number; search?: string }
    ): SqlValue[][] {
        const safe = this.validateTableName(table);
        let sql = `SELECT * FROM "${safe}"`;
        const params: SqlValue[] = [];

        if (options.search) {
            const searchableColumns = this.getTableColumns(table).filter(
                col =>
                    !col.type.toUpperCase().includes('REAL') &&
                    !col.type.toUpperCase().includes('FLOAT')
            );
            if (searchableColumns.length > 0) {
                const whereClause = searchableColumns
                    .map(col => `"${col.name}" LIKE ?`)
                    .join(' OR ');
                sql += ` WHERE ${whereClause}`;
                const searchPattern = `%${options.search}%`;
                searchableColumns.forEach(() => params.push(searchPattern));
            }
        }

        sql += ` LIMIT ? OFFSET ?`;
        params.push(options.limit, options.offset);

        console.log(`[SQL] Executing: ${sql} with params:`, params);

        // better-sqlite3: raw() returns an array of values per row
        return (this.db!.prepare(sql) as any).raw(true).all(...params) as SqlValue[][];
    }

    /**
     * Get row count for a specific table with optional search
     */
    public getTableRowCount(table: string, search?: string): number {
        const safe = this.validateTableName(table);

        let sql = `SELECT count(*) as count FROM "${safe}"`;
        const params: SqlValue[] = [];

        if (search) {
            const searchableColumns = this.getTableColumns(table).filter(
                col =>
                    !col.type.toUpperCase().includes('REAL') &&
                    !col.type.toUpperCase().includes('FLOAT') &&
                    !col.type.toUpperCase().includes('DOUBLE')
            );

            if (searchableColumns.length > 0) {
                const whereClause = searchableColumns
                    .map(col => `"${col.name}" LIKE ?`)
                    .join(' OR ');
                sql += ` WHERE ${whereClause}`;
                const searchPattern = `%${search}%`;
                searchableColumns.forEach(() => params.push(searchPattern));
            }
        }

        const result = this.db!.prepare(sql).get(...params) as {
            count: number;
        };

        return result.count;
    }
}

// 導出單例
export const dbService = SqliteService.getInstance();
