import { twseApi } from '../../../scripts/fetchers/twse-api';
import { EventEmitter } from 'events';

/**
 * M4: Realtime Tick Daemon
 * 全站唯一的即時行情輪詢中心 (Singleton)
 */
export class TickDaemon extends EventEmitter {
    private static instance: TickDaemon;
    private isRunning = false;
    private lastData: any[] = [];

    private constructor() {
        super();
    }

    public static getInstance() {
        if (!TickDaemon.instance) TickDaemon.instance = new TickDaemon();
        return TickDaemon.instance;
    }

    /**
     * T001: 啟動背景輪詢
     */
    public async start(intervalMs: number = 5000) {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[TickDaemon] Started with ${intervalMs}ms interval.`);

        while (this.isRunning) {
            try {
                // T001: 呼叫 M1 下的 TwseApi 抓取最新快照
                const rawData = await twseApi.fetchStockList();
                this.lastData = rawData;

                // T004: 廣播 Tick 事件給所有訂閱者 (SSE Clients)
                try {
                    this.emit('tick', rawData);
                } catch (emitErr: any) {
                    console.warn(
                        '[TickDaemon] Listener execution error (handled):',
                        emitErr.message
                    );
                }
            } catch (err) {
                console.error('[TickDaemon] Data fetch error:', err);
                // 失敗時等待一段時間再試
                await new Promise(res => setTimeout(res, 10000));
            }
            await new Promise(res => setTimeout(res, intervalMs));
        }
    }

    public stop() {
        this.isRunning = false;
    }

    public getLastTick() {
        return this.lastData;
    }
}

export const tickDaemon = TickDaemon.getInstance();
