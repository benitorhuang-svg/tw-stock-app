import type { APIRoute } from 'astro';
import { dbService } from '../../../lib/db/sqlite-service';

export const GET: APIRoute = async () => {
    try {
        const tables = dbService.getTables();
        return new Response(JSON.stringify({ tables }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};
