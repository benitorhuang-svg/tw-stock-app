import type { APIRoute } from 'astro';
import { tickDaemon } from '../../../api/sse/daemon';
import type { TwseStockSnapshot } from '../../../types/stock';

/**
 * M4: SSE Stream Route
 * 提供客戶端連結 text/event-stream 的端點
 */
export const prerender = false;

const encoder = new TextEncoder(); // Reuse single instance

export const GET: APIRoute = ({ request }) => {
    // 啟動 Daemon (如果是第一次連線)
    tickDaemon.start();

    const stream = new ReadableStream({
        start(controller) {
            let isClosed = false;

            // 定義傳送函數
            const sendTick = (data: TwseStockSnapshot[]) => {
                if (isClosed) return;
                try {
                    const message = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(message));
                } catch (err: any) {
                    // 通常是連線已關閉但監聽器尚未移除
                    isClosed = true;
                    tickDaemon.off('tick', sendTick);
                }
            };

            // 訂閱事件
            tickDaemon.on('tick', sendTick);

            // 當連線切斷時清理
            request.signal.addEventListener('abort', () => {
                if (isClosed) return;
                isClosed = true;
                tickDaemon.off('tick', sendTick);
                try {
                    controller.close();
                } catch (err) { }
                console.log('[SSE] Client disconnected (abort).');
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
