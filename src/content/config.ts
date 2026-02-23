import { defineCollection, z } from 'astro:content';

const stocks = defineCollection({
    type: 'data',
    schema: z.array(
        z.object({
            symbol: z.string(),
            name: z.string(),
            market: z.string(),
            industry: z.string().optional(),
        })
    ),
});

const strategies = defineCollection({
    type: 'data',
    schema: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            category: z.enum(['fundamental', 'technical', 'sentiment']),
            description: z.string(),
            conditions: z.array(z.string()),
            icon: z.string(),
        })
    ),
});

export const collections = {
    stocks: stocks,
    strategies: strategies,
};
