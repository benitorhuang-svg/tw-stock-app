/**
 * M1: Rate Limiter
 * 專為證交所 (TWSE) 設計的頻率限制器。
 * TWSE API 限制非常嚴格 (約 5秒 3次)，若過快會被封鎖 IP。
 */
export class RateLimiter {
    private queue: (() => Promise<any>)[] = [];
    private processing = false;
    private minInterval: number;

    constructor(minIntervalMs: number = 2000) {
        this.minInterval = minIntervalMs;
    }

    /**
     * 將 Request 放入排隊佇列
     */
    public async schedule<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });

            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    private async processQueue() {
        this.processing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                await task();
                // 執行完畢後強制等待，確保間隔
                await new Promise(res => setTimeout(res, this.minInterval));
            }
        }

        this.processing = false;
    }
}

// 導出一個預設的限制器 (2秒一次，確保安全)
export const twseRateLimiter = new RateLimiter(2000);
