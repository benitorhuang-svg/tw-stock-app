import { z } from 'zod';

/**
 * M3: Security Guard & Schema
 * 透過 Zod 強制約束前端傳入的 JSON 查詢結構，徹底杜絕 SQL Injection
 */

// 定義合法的欄位白名單
export const ValidFields = z.enum([
    'symbol',
    'date',
    'close',
    'pe_ratio',
    'dividend_yield',
    'ma5',
    'ma20',
    'kd_k',
    'kd_d',
    'foreign_buy',
    'concentration_5d',
]);

// 定義運算元
export const Operator = z.enum(['>', '<', '>=', '<=', '=', '!=', 'LIKE']);

// 定義篩選條件
export const FilterConditionSchema = z.object({
    field: ValidFields,
    operator: Operator,
    value: z.union([z.string(), z.number()]),
});

// 定義完整 Query AST
export const ScreenerQuerySchema = z.object({
    conditions: z.array(FilterConditionSchema),
    limit: z.number().default(100),
    orderBy: ValidFields.optional(),
    orderDir: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type ScreenerQuery = z.infer<typeof ScreenerQuerySchema>;

export class SecurityGuard {
    /**
     * T002: 驗證 JSON 結構並丟出錯誤
     */
    public validate(query: any): ScreenerQuery {
        return ScreenerQuerySchema.parse(query);
    }
}

export const securityGuard = new SecurityGuard();
