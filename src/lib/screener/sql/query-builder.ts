import type { ScreenerQuery } from './security-guard';

/**
 * M3: Query Builder (Compiler)
 */
export class QueryBuilder {
    /**
     * T003 & T004: 將 AST 轉換為合法的參數化 SQL
     */
    public compile(query: ScreenerQuery): { sql: string; params: any[] } {
        const params: any[] = [];
        let whereClauses: string[] = [];

        // 組合 WHERE 子句
        for (const cond of query.conditions) {
            whereClauses.push(`${cond.field} ${cond.operator} ?`);
            params.push(cond.value);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 由於我們需要橫跨多表 (stocks/tech/chip/valuation)，這裡採用 JOIN 邏輯
        const sql = `
            SELECT s.*, t.kd_k, v.pe_ratio, c.concentration_5d
            FROM stocks s
            LEFT JOIN tech_features t ON s.symbol = t.symbol AND s.date = t.date
            LEFT JOIN valuation_features v ON s.symbol = v.symbol AND s.date = v.date
            LEFT JOIN chip_features c ON s.symbol = c.symbol AND s.date = c.date
            ${whereSql}
            ${query.orderBy ? `ORDER BY ${query.orderBy} ${query.orderDir}` : ''}
            LIMIT ${query.limit}
        `.trim();

        return { sql, params };
    }
}

export const queryBuilder = new QueryBuilder();
