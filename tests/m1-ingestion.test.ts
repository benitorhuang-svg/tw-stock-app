import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SqliteWriter } from '../scripts/db/sqlite-writer';
import { dbService } from '../src/lib/db/sqlite-service';
import fs from 'fs';
import path from 'path';

describe('M1: Data Ingestion Integration Test', () => {
    const TEST_DB = 'test_stocks.db';
    let writer: SqliteWriter;

    beforeAll(() => {
        // 使用測試資料庫，不汙染正式環境
        writer = new SqliteWriter(TEST_DB);
        writer.initSchema();
    });

    afterAll(() => {
        writer.close();
        if (fs.existsSync(TEST_DB)) {
            // fs.unlinkSync(TEST_DB);
        }
    });

    it('should insert and retrieve stock data at high speed', () => {
        const dummyData = Array.from({ length: 1000 }).map((_, i) => ({
            symbol: `TEST${i}`,
            date: '2026-02-23',
            open: 100,
            high: 110,
            low: 90,
            close: 105,
            volume: 1000,
            change_rate: 5,
        }));

        const start = Date.now();
        writer.batchInsert('stocks', dummyData);
        const end = Date.now();

        console.log(`[Test] Inserted 1000 rows in ${end - start}ms`);

        // 驗證寫入成功 (透過另一個 Service 實例讀取)
        // 註：這裏需要手動指向測試路徑，或讓 Service 支援路徑注入
        const countSql = 'SELECT count(*) as count FROM stocks WHERE symbol LIKE "TEST%"';
        const res = writer.db.prepare(countSql).get() as { count: number };

        expect(res.count).toBe(1000);
        expect(end - start).toBeLessThan(500); // 應該極快
    });
});
