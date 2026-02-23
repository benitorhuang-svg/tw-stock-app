import type { APIRoute } from 'astro';
import { tickDaemon } from '../../../api/sse/daemon';

/**
 * M4: SSE Stream Route
 * 提供客戶端連結 text/event-stream 的端點
 */
export const prerender = false;

export const GET: APIRoute = ({ request }) => {
    // 啟動 Daemon (如果是第一次連線)
    tickDaemon.start();

    const stream = new ReadableStream({
        start(controller) {
            // 定義傳送函數
            const sendTick = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(new TextEncoder().encode(message));
            };

            // 訂閱事件
            tickDaemon.on('tick', sendTick);

            // 當連線切斷時清理
            request.signal.addEventListener('abort', () => {
                tickDaemon.off('tick', sendTick);
                controller.close();
                console.log('[SSE] Client disconnected.');
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
};
