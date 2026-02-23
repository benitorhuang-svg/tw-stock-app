import { securityGuard } from './sql/security-guard';
import { queryBuilder } from './sql/query-builder';
import { dbService } from '../db/sqlite-service';

/**
 * M3: Screener Executor (Adapter)
 */
export class ScreenerExecutor {
    /**
     * T008: 執行篩選流程：驗證 -> 編譯 -> 執行
     */
    public execute(rawQuery: any) {
        try {
            // 1. 安全驗證
            const validatedQuery = securityGuard.validate(rawQuery);

            // 2. 編譯 SQL
            const { sql, params } = queryBuilder.compile(validatedQuery);

            // 3. 向 DB 請求資料
            return dbService.queryAll(sql, params);
        } catch (err: any) {
            console.error('[ScreenerExecutor] Execution Failed:', err.message);
            throw err;
        }
    }
}

export const screenerExecutor = new ScreenerExecutor();
