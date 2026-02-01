import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { filterStocks } from '../lib/stock-service';

export const server = {
    screenStocks: defineAction({
        input: z.object({
            pe: z.object({ max: z.number().optional() }).optional(),
            pb: z.object({ max: z.number().optional() }).optional(),
            dividendYield: z.object({ min: z.number().optional() }).optional(),
            roe: z.object({ min: z.number().optional() }).optional(),
        }),
        handler: async (input) => {
            const { pe, pb, dividendYield, roe } = input;

            const conditions: any = {};
            if (pe?.max !== undefined) conditions.maxPE = pe.max;
            if (dividendYield?.min !== undefined) conditions.minYield = dividendYield.min;
            if (roe?.min !== undefined) conditions.minROE = roe.min;

            const results = await filterStocks(conditions);

            return results.map(r => {
                const matchedStrategies: string[] = [];
                if (pe?.max && r.pe && r.pe > 0 && r.pe <= pe.max) matchedStrategies.push('低本益比');
                if (pb?.max && r.pb && r.pb <= pb.max) matchedStrategies.push('低P/B');
                if (dividendYield?.min && r.dividend_yield && r.dividend_yield >= dividendYield.min) matchedStrategies.push('高殖利率');
                if (roe?.min && r.roe && r.roe >= roe.min) matchedStrategies.push('高ROE');

                return {
                    symbol: r.symbol,
                    name: r.name,
                    matchedStrategies,
                    price: r.price,
                    changePercent: r.change_percent,
                    pe: r.pe,
                    pb: r.pb,
                    dividendYield: r.dividend_yield,
                    roe: r.roe
                };
            }).filter(r => r.matchedStrategies.length > 0);
        }
    })
}
