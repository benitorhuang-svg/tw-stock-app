/**
 * M4: Realtime Client
 * 負責維護 SSE 連線生命週期
 */
export class RealtimeClient {
    private eventSource: EventSource | null = null;
    private worker: Worker;

    constructor() {
        // T006: 初始化 Worker
        this.worker = new Worker(new URL('./worker/rule-matcher.worker.ts', import.meta.url), {
            type: 'module',
        });

        this.worker.onmessage = e => {
            if (e.data.type === 'ALERTS') {
                this.dispatchAlerts(e.data.payload);
            }
        };
    }

    /**
     * T008: 建立 SSE 連線
     */
    public connect() {
        if (this.eventSource) return;

        this.eventSource = new EventSource('/api/sse/stream');

        this.eventSource.onmessage = e => {
            const ticks = JSON.parse(e.data);
            // 轉發給 Worker 進行 O(1) 比對
            this.worker.postMessage({ type: 'TICK', payload: ticks });
        };

        this.eventSource.onerror = () => {
            console.error('[RealtimeClient] SSE Error, retrying...');
            this.disconnect();
            setTimeout(() => this.connect(), 5000); // T009: 重連
        };
    }

    public updateRules(rules: any[]) {
        this.worker.postMessage({ type: 'UPDATE_RULES', payload: rules });
    }

    private dispatchAlerts(hits: any[]) {
        // T011: 透過 EventBus 或 CustomEvents 發送通知
        const event = new CustomEvent('stock-alert', { detail: hits });
        window.dispatchEvent(event);
    }

    public disconnect() {
        this.eventSource?.close();
        this.eventSource = null;
    }
}

export const realtimeClient = new RealtimeClient();
