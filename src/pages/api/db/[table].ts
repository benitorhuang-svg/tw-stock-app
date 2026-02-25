import type { APIRoute } from 'astro';
export const prerender = false;
import { dbService } from '../../../lib/db/sqlite-service';

export const GET: APIRoute = async ({ params, url }) => {
    const table = params.table;
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';

    if (!table) {
        return new Response(JSON.stringify({ error: 'Table name is required' }), { status: 400 });
    }

    try {
        const rows = dbService.getTableData(table, { limit, offset, search });
        const count = dbService.getTableRowCount(table, search);
        const columns = dbService.getTableColumns(table);

        return new Response(
            JSON.stringify({
                tableName: table,
                columns,
                rows,
                total: count,
                limit,
                offset,
                search,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        const message = (error as Error).message;
        if (message.startsWith('Invalid table name:')) {
            return new Response(
                JSON.stringify({
                    error: message,
                    availableTables: dbService.getTables(),
                }),
                {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};
