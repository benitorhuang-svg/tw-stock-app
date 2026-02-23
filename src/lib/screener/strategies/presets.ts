import type { ScreenerQuery } from '../sql/security-guard';

/**
 * M3: Preset Strategies
 * 儲存高品質的內建篩選條件 AST
 */
export const PRESET_STRATEGIES: Record<string, ScreenerQuery> = {
    'cheap-growth': {
        conditions: [
            { field: 'pe_ratio', operator: '<', value: 15 },
            { field: 'dividend_yield', operator: '>', value: 4 },
            { field: 'ma20', operator: '>', value: 0 }, // 確保有 MA20 資料
        ],
        limit: 50,
        orderBy: 'dividend_yield',
        orderDir: 'DESC',
    },
    'kd-oversold': {
        conditions: [
            { field: 'kd_k', operator: '<', value: 20 },
            { field: 'kd_d', operator: '<', value: 25 },
        ],
        limit: 50,
        orderBy: 'kd_k',
        orderDir: 'ASC',
    },
    'institutional-follow': {
        conditions: [
            { field: 'concentration_5d', operator: '>', value: 5 },
            { field: 'foreign_buy', operator: '>', value: 0 },
        ],
        limit: 50,
        orderBy: 'concentration_5d',
        orderDir: 'DESC',
    },
};
