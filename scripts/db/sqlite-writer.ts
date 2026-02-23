import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * M1: SQLite Writer
 * 負責將爬蟲與 ETL 運算後的資料高效寫入 stocks.db
 */
export class SqliteWriter {
    public db: InstanceType<typeof Database>;

    constructor(dbPath: string = 'stocks.db') {
        const fullPath = path.resolve(process.cwd(), dbPath);

        // 確保目錄存在
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(fullPath);

        // T002: 執行 WAL 模式優化寫入效能，防止讀寫鎖死
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        console.log(`[SqliteWriter] Database connected at: ${fullPath}`);
    }

    /**
     * 初始化資料表結構
     */
    public initSchema(schemaPath: string = 'scripts/db/schema.sql') {
        const schema = fs.readFileSync(path.resolve(process.cwd(), schemaPath), 'utf8');
        this.db.exec(schema);
        console.log('[SqliteWriter] Schema initialized.');
    }

    /**
     * T003: 高速 Batch Insert 機制
     * 使用 Transaction 確保數千筆資料在單次磁碟寫入中完成
     */
    public batchInsert(tableName: string, dataArray: any[]) {
        if (dataArray.length === 0) return;

        const columns = Object.keys(dataArray[0]);
        const placeholders = columns.map(() => '?').join(',');
        const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

        const stmt = this.db.prepare(sql);

        // 開啟交易
        const transaction = this.db.transaction((items: any[]) => {
            for (const item of items) {
                const values = columns.map(col => item[col]);
                stmt.run(...values);
            }
        });

        transaction(dataArray);
        console.log(`[SqliteWriter] Batch inserted ${dataArray.length} rows into ${tableName}`);
    }

    public close() {
        this.db.close();
    }
}
