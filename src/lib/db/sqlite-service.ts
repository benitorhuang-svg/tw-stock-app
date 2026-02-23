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

    private constructor() {
        const dbPath = path.resolve(process.cwd(), 'stocks.db');
        this.db = new Database(dbPath, { readonly: true, fileMustExist: false });
        // 同樣維持 WAL 以利並發讀取
        this.db.pragma('journal_mode = WAL');
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
        const dbPath = path.resolve(process.cwd(), 'stocks.db');
        if (!fs.existsSync(dbPath)) {
            return { sizeBytes: 0, sizeMB: '0.00', totalRecords: 0 };
        }
        const stats = fs.statSync(dbPath);
        const stockCount = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stocks'").get()
            ? (this.db.prepare('SELECT count(*) as count FROM stocks').get() as { count: number }).count
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
    public getTables(): string[] {
        const tables = this.db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            .all() as { name: string }[];
        return tables.map(t => t.name);
    }

    /**
     * Get column info for a table
     */
    public getTableColumns(table: string): { name: string; type: string }[] {
        const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as {
            name: string;
            type: string;
        }[];
        return columns.map(c => ({ name: c.name, type: c.type }));
    }

    /**
     * Get paginated table data
     */
    public getTableData(table: string, options: { limit: number; offset: number }): any[] {
        const sql = `SELECT * FROM ${table} LIMIT ? OFFSET ?`;
        return this.db.prepare(sql).all(options.limit, options.offset);
    }

    /**
     * Get row count for a specific table
     */
    public getTableRowCount(table: string): number {
        const result = this.db.prepare(`SELECT count(*) as count FROM ${table}`).get() as {
            count: number;
        };
        return result.count;
    }
}

// 導出單例
export const dbService = SqliteService.getInstance();
