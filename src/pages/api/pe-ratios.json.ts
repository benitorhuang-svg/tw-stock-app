/**
 * API Route: 取得當日全部股票本益比、殖利率
 * GET /api/pe-ratios.json
 */
import type { APIRoute } from 'astro';
import { getAllPERatios, formatDateForAPI } from '../../lib/twse-api';

export const GET: APIRoute = async ({ url }) => {
    // 可用 ?date=YYYYMMDD 指定日期
    const dateParam = url.searchParams.get('date');
    const date = dateParam || formatDateForAPI();

    const data = await getAllPERatios(date);

    if (!data || data.length === 0) {
        return new Response(JSON.stringify({
            error: 'No data found',
            date,
            hint: '可能是假日或資料尚未更新'
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
        date,
        count: data.length,
        data
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600' // 1小時快取
        }
    });
};
