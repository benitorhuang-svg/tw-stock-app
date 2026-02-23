import { dbService } from '../../db/sqlite-service';
import { SqliteWriter } from '../../../../scripts/db/sqlite-writer';

/**
 * M2: AI Report Cache Manager
 */
export class AiCacheManager {
    /**
     * T008: 檢查當日是否有快取報告
     */
    public getCachedReport(symbol: string, date: string): string | null {
        const sql = 'SELECT report FROM ai_reports WHERE symbol = ? AND date = ?';
        const result = dbService.queryOne<{ report: string }>(sql, [symbol, date]);
        return result?.report || null;
    }

    /**
     * T008: 將新產生的報告寫入快取
     */
    public async saveReport(symbol: string, date: string, report: string) {
        // 這裏需要寫入權限，所以需實例化 Writer (或透過後端 API)
        const writer = new SqliteWriter();
        try {
            writer.batchInsert('ai_reports', [{ symbol, date, report }]);
        } finally {
            writer.close();
        }
    }
}

export const aiCacheManager = new AiCacheManager();
