import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

export const GET: APIRoute = async () => {
    try {
        const tables = dbService.getTables().filter(t => t !== 'dividends');

        // Disable search cache basically by creating a new instantiation query or just returning the values
        const stats = tables.map(t => {
            try {
                return {
                    name: t,
                    rows: dbService.getTableRowCount(t),
                };
            } catch {
                return { name: t, rows: 0 };
            }
        });

        return new Response(JSON.stringify(stats), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
