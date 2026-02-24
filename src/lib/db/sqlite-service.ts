import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * M1: Sqlite Service
 * 提供全站 (SSR / Scripts) 統一的唯讀查詢介面
 */
export class SqliteService {
    private static instance: SqliteService;
    private db: InstanceType<typeof Database>;
    private dbPath: string;
    private cachedTables: Set<string>;
    private columnCache: Map<string, { name: string, type: string }[]> = new Map();
    private rowCountCache: Map<string, number> = new Map();

    private constructor() {
        this.dbPath = this.resolveHealthyDbPath();
        this.db = new Database(this.dbPath, { readonly: true, fileMustExist: true });
        this.db.pragma('cache_size = -32000'); // 32MB cache
        this.db.pragma('mmap_size = 3145728000'); // Memory-map up to ~3GB
        this.cachedTables = new Set(this.loadTableNames());
    }

    private resolveHealthyDbPath(): string {
        const candidates = [
            path.resolve(process.cwd(), 'public', 'data', 'stocks.db'),
        ];

        for (const candidate of candidates) {
            if (!fs.existsSync(candidate)) continue;

            try {
                const probe = new Database(candidate, { readonly: true, fileMustExist: true });
                const integrity = (probe.prepare('PRAGMA integrity_check') as any).pluck(true).get() as string;
                probe.close();

                if (integrity === 'ok') {
                    return candidate;
                }
            } catch {
                continue;
            }
        }

        throw new Error(
            'No healthy SQLite database found (checked stocks.db and public/data/stocks.db)'
        );
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
    public queryAll<T>(sql: string, params: any[] = []): T[] {
        return this.db.prepare(sql).all(...params) as T[];
    }

    public queryOne<T>(sql: string, params: any[] = []): T | undefined {
        return this.db.prepare(sql).get(...params) as T;
    }

    /**
     * Get raw DB instance for advanced usages (like prepared statements in marketService)
     */
    public getRawDb(): InstanceType<typeof Database> {
        return this.db;
    }

    /**
     * T004: 獲取資料庫統計資訊
     */
    public getDbStats() {
        if (!fs.existsSync(this.dbPath)) {
            return { sizeBytes: 0, sizeMB: '0.00', totalRecords: 0 };
        }
        const stats = fs.statSync(this.dbPath);
        const stockCount = this.db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stocks'")
            .get()
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

        const columns = this.db.prepare(`PRAGMA table_info("${safe}")`).all() as {
            name: string;
            type: string;
        }[];
        const mapped = columns.map(c => ({ name: c.name, type: c.type }));
        this.columnCache.set(safe, mapped);
        return mapped;
    }

    /**
     * Get paginated table data with optional search
     */
    public getTableData(
        table: string,
        options: { limit: number; offset: number; search?: string }
    ): any[] {
        const safe = this.validateTableName(table);
        let sql = `SELECT * FROM "${safe}"`;
        const params: any[] = [];

        if (options.search) {
            // Optimize search to only text or integer columns, skip pure floats which kill performance
            const searchableColumns = this.getTableColumns(table).filter(
                col => !col.type.toUpperCase().includes('REAL') && !col.type.toUpperCase().includes('FLOAT') && !col.type.toUpperCase().includes('DOUBLE')
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

        return this.db.prepare(sql).all(...params);
    }

    /**
     * Get row count for a specific table with optional search
     */
    public getTableRowCount(table: string, search?: string): number {
        const safe = this.validateTableName(table);

        // Use cache for pure row count without search
        if (!search && this.rowCountCache.has(safe)) {
            return this.rowCountCache.get(safe)!;
        }

        let sql = `SELECT count(*) as count FROM "${safe}"`;
        const params: any[] = [];

        if (search) {
            const searchableColumns = this.getTableColumns(table).filter(
                col => !col.type.toUpperCase().includes('REAL') && !col.type.toUpperCase().includes('FLOAT') && !col.type.toUpperCase().includes('DOUBLE')
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

        const result = this.db.prepare(sql).get(...params) as {
            count: number;
        };

        // Cache the total count
        if (!search) {
            this.rowCountCache.set(safe, result.count);
        }

        return result.count;
    }
}

// 導出單例
export const dbService = SqliteService.getInstance();
