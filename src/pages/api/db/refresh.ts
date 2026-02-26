import type { APIRoute } from 'astro';
export const prerender = false;
import { spawn } from 'child_process';

// Global state for background data refresh
let isRunning = false;
let globalLog = ''; // Single string buffer instead of array of fragments
let clients: Set<{ enqueue: (data: Uint8Array | string) => void; close: () => void }> = new Set();
const MAX_LOG_CHARS = 200_000; // ~200KB text limit
const sharedDecoder = new TextDecoder();

const broadcast = (data: Uint8Array | string) => {
    const text = typeof data === 'string' ? data : sharedDecoder.decode(data, { stream: true });
    globalLog += text;
    // Trim from the beginning if too large
    if (globalLog.length > MAX_LOG_CHARS) {
        globalLog = globalLog.slice(globalLog.length - MAX_LOG_CHARS);
    }
    for (const client of clients) {
        client.enqueue(data);
    }
};

const closeAllClients = () => {
    isRunning = false;
    for (const client of clients) {
        try {
            client.close();
        } catch (e) {}
    }
    clients.clear();
};

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify({ isRunning }), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const POST: APIRoute = async ({ request }) => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let isClosed = false;

            const safeEnqueue = (data: Uint8Array | string) => {
                if (isClosed) return;
                try {
                    if (typeof data === 'string') {
                        controller.enqueue(encoder.encode(data));
                    } else {
                        controller.enqueue(data);
                    }
                } catch (e) {
                    isClosed = true;
                    clients.delete(clientSession);
                }
            };

            const safeClose = () => {
                if (isClosed) return;
                isClosed = true;
                try {
                    controller.close();
                } catch (e) {}
            };

            const clientSession = { enqueue: safeEnqueue, close: safeClose };
            clients.add(clientSession);

            request.signal.addEventListener(
                'abort',
                () => {
                    isClosed = true;
                    clients.delete(clientSession);
                },
                { once: true }
            );

            const runScript = (script: string, args: string[] = []) => {
                return new Promise<number>(resolve => {
                    const child = spawn('node', [script, ...args], { cwd: process.cwd() });
                    child.stdout.on('data', data => broadcast(data));
                    child.stderr.on('data', data => broadcast(data));
                    child.on('close', code => {
                        resolve(code || 0);
                    });
                });
            };

            const startProcess = async () => {
                try {
                    broadcast('>> [1/4] 正在解析並更新上市櫃股票最新代碼清單...\n');
                    const listCode = await runScript('scripts/fetch-stock-list.mjs');
                    if (listCode !== 0) {
                        broadcast(`\n\n[失敗] 股票清單下載異常，代碼: ${listCode}\n`);
                        return;
                    }

                    broadcast(
                        '\n>> [2/4] 正在執行多維度行情同步 (歷史行情、法人籌碼、季度財報、每月營收)...\n'
                    );

                    await runScript('scripts/fetch-yahoo.mjs');
                    await runScript('scripts/fetch-chips.mjs');
                    await runScript('scripts/fetch-monthly-stats.mjs');
                    await runScript('scripts/fetch-financials.mjs');
                    await runScript('scripts/fetch-revenue.mjs');

                    broadcast(
                        '\n>> [2.5/4] 正在同步深層鑑識數據 (法人細項、股權分散、官股動態、融資融券)...\n'
                    );
                    await runScript('scripts/crawlers/twse-chips.mjs');
                    await runScript('scripts/crawlers/tdcc-shareholders.mjs');
                    await runScript('scripts/crawlers/twse-margin.mjs');

                    broadcast(
                        '\n>> [3/4] 正在匯總異質資料並建置全系統高速快照系統 (Snapshot)...\n'
                    );
                    const snapCode = await runScript('scripts/build-price-snapshot.js');
                    if (snapCode !== 0) {
                        broadcast(`\n\n[警告] 快照建置程序未正常結束，代碼: ${snapCode}\n`);
                    }

                    broadcast('\n>> [4/4] 正在優化離線 SQLite 資料庫結構並重構全域索引系統...\n');
                    const dbCode = await runScript('scripts/build-sqlite-db.js');
                    if (dbCode === 0) {
                        broadcast('\n>> [最後步驟] 正在提取並運算關鍵籌碼特徵與量化技術指標...\n');
                        await runScript('scripts/etl/generate-all-features.mjs');
                        broadcast(
                            '\n\n[完成] 全系統數據同步全面完成！系統目前運作於極速離線模式。\n'
                        );
                    } else {
                        broadcast(`\n\n[錯誤] 資料庫系統建置失敗，代碼: ${dbCode}\n`);
                    }
                } catch (err) {
                    broadcast(`\n\n[致命錯誤] 系統更新程序中斷: ${(err as Error).message}\n`);
                } finally {
                    closeAllClients();
                }
            };

            if (isRunning) {
                safeEnqueue(globalLog);
                // Keep the connection opened to receive continuous updates, do not return!
            } else {
                isRunning = true;
                globalLog = '';
                startProcess();
            }
        },
        cancel() {
            // Client aborted the stream visually
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
};
