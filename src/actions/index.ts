import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { screenStocks } from '../utils/marketService';

export const server = {
    screenStocks: defineAction({
        input: z.object({
            pe: z.number().optional(),
            pb: z.number().optional(),
            dividendYield: z.number().optional(),
            roe: z.number().optional(),
            goldenCross: z.boolean().optional(),
            rsiOversold: z.boolean().optional(),
            macdBullish: z.boolean().optional(),
        }),
        handler: async (input) => {
            const results = screenStocks(input);

            return results.map((r: any) => {
                const matchedStrategies: string[] = [];
                if (input.pe && r.pe > 0 && r.pe <= input.pe) matchedStrategies.push('低本益比');
                if (input.pb && r.pb > 0 && r.pb <= input.pb) matchedStrategies.push('低P/B');
                if (input.dividendYield && r.yield >= input.dividendYield) matchedStrategies.push('高殖利率');
                if (input.roe && r.roe >= input.roe) matchedStrategies.push('高ROE');
                if (input.goldenCross && r.ma5 > r.ma20) matchedStrategies.push('黃金交叉');

                return {
                    symbol: r.symbol,
                    name: r.name,
                    matchedStrategies,
                    price: r.price,
                    change: r.change,
                    changePercent: r.change_pct,
                    pe: r.pe,
                    pb: r.pb,
                    dividendYield: r.yield,
                    roe: r.roe
                };
            });
        }
    })
}
