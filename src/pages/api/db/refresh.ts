import type { APIRoute } from 'astro';
export const prerender = false;
import { spawn } from 'child_process';

// ═══ 背景執行：全域狀態 ═══
// 即使所有客戶端斷線，更新依然繼續。
// 任何客戶端 POST 連入時，若 isRunning === true 會先收到 globalLog 再持續推送。
let isRunning = false;
let currentStep = 0; // 0 = idle, 1..6 = step#
let globalLog = '';
let clients: Set<{ enqueue: (data: Uint8Array | string) => void; close: () => void }> = new Set();
const MAX_LOG_CHARS = 200_000;
const sharedDecoder = new TextDecoder();

const broadcast = (data: Uint8Array | string) => {
    const text = typeof data === 'string' ? data : sharedDecoder.decode(data, { stream: true });
    globalLog += text;
    if (globalLog.length > MAX_LOG_CHARS) {
        globalLog = globalLog.slice(globalLog.length - MAX_LOG_CHARS);
    }
    for (const client of clients) {
        client.enqueue(data);
    }
};

const closeAllClients = () => {
    isRunning = false;
    currentStep = 0;
    for (const client of clients) {
        try { client.close(); } catch {}
    }
    clients.clear();
};

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify({ isRunning, currentStep }), {
        headers: { 'Content-Type': 'application/json' },
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
                    controller.enqueue(typeof data === 'string' ? encoder.encode(data) : data);
                } catch {
                    isClosed = true;
                    clients.delete(clientSession);
                }
            };

            const safeClose = () => {
                if (isClosed) return;
                isClosed = true;
                try { controller.close(); } catch {}
            };

            const clientSession = { enqueue: safeEnqueue, close: safeClose };
            clients.add(clientSession);

            request.signal.addEventListener('abort', () => {
                isClosed = true;
                clients.delete(clientSession);
            }, { once: true });

            const runScript = (script: string, args: string[] = []) => {
                return new Promise<number>(resolve => {
                    const child = spawn('node', [script, ...args], { cwd: process.cwd() });
                    child.stdout.on('data', data => broadcast(data));
                    child.stderr.on('data', data => broadcast(data));
                    child.on('close', code => resolve(code || 0));
                });
            };

            /** 並行執行多支腳本，全部完成後回傳 */
            const runParallel = (scripts: string[]) => {
                return Promise.all(scripts.map(s => runScript(s)));
            };

            // ═══ 六階段更新流程 ═══
            const startProcess = async () => {
                try {
                    // ── 第 1 階段：清單更新 ──
                    currentStep = 1;
                    broadcast('>> [1/6] 【清單更新】正在解析並更新上市櫃股票最新代碼清單...\n');
                    const listCode = await runScript('scripts/fetch-stock-list.mjs');
                    if (listCode !== 0) {
                        broadcast(`\n[失敗] 股票清單下載異常（結束碼: ${listCode}）\n`);
                        return;
                    }

                    // ── 第 2 階段：數據與鑑識同步（非同步並行） ──
                    currentStep = 2;
                    broadcast(
                        '\n>> [2/6] 【數據同步】正在並行抓取多維度行情資料（歷史行情、法人籌碼、月營收、季度財報）...\n'
                    );

                    // 第一波：主要資料源（並行）
                    await runParallel([
                        'scripts/fetch-yahoo.mjs',
                        'scripts/fetch-chips.mjs',
                        'scripts/fetch-monthly-stats.mjs',
                        'scripts/fetch-financials.mjs',
                        'scripts/fetch-revenue.mjs',
                    ]);

                    broadcast(
                        '\n>> └─ 正在同步深層鑑識數據（法人細項、股權分散、融資融券）...\n'
                    );

                    // 第二波：爬蟲類（並行）
                    await runParallel([
                        'scripts/crawlers/twse-chips.mjs',
                        'scripts/crawlers/tdcc-shareholders.mjs',
                        'scripts/crawlers/twse-margin.mjs',
                    ]);

                    // ── 第 3 階段：快照建置 ──
                    currentStep = 3;
                    broadcast(
                        '\n>> [3/6] 【快照建置】正在匯總異質資料並建置全系統高速快照...\n'
                    );
                    const snapCode = await runScript('scripts/build-price-snapshot.js');
                    if (snapCode !== 0) {
                        broadcast(`\n[警告] 快照建置未正常結束（結束碼: ${snapCode}）\n`);
                    }

                    // ── 第 4 階段：索引優化 & 資料庫重建 ──
                    currentStep = 4;
                    broadcast(
                        '\n>> [4/6] 【索引優化】正在優化 SQLite 資料庫結構並重建全域索引...\n'
                    );
                    const dbCode = await runScript('scripts/build-sqlite-db.js');
                    if (dbCode !== 0) {
                        broadcast(`\n[錯誤] 資料庫建置失敗（結束碼: ${dbCode}）\n`);
                        return;
                    }

                    broadcast('\n>> └─ 正在匯入深層鑑識資料...\n');
                    await runScript('scripts/import-forensic.mjs');

                    // ── 第 5 階段：延伸資料表運算 (ETL) ──
                    currentStep = 5;
                    broadcast(
                        '\n>> [5/6] 【延伸資料運算】正在提取技術指標、籌碼特徵、法人快照、產業彙總...\n'
                    );
                    const etlCode = await runScript('scripts/etl/generate-all-features.mjs');
                    if (etlCode !== 0) {
                        broadcast(`\n[警告] 延伸資料運算未正常結束（結束碼: ${etlCode}）\n`);
                    } else {
                        broadcast('>> └─ 已完成：tech_features / chip_features / valuation_features\n');
                        broadcast('>> └─ 已完成：institutional_snapshot / institutional_trend / sector_daily\n');
                        broadcast('>> └─ 已完成：latest_prices 回填法人籌碼與產業分類\n');
                    }

                    // ── 第 6 階段：同步完成 ──
                    currentStep = 6;
                    broadcast(
                        '\n\n[完成] 【同步完成】全系統數據同步完畢！四層架構已就緒。\n'
                    );
                    broadcast('>> 原始層 → 運算層 → 聚合層 → 快照層　全數更新完成。\n');
                    broadcast('>> 各分頁可即時讀取快照/聚合層資料，零延遲回應。\n');
                } catch (err) {
                    broadcast(`\n\n[致命錯誤] 系統更新程序中斷：${(err as Error).message}\n`);
                } finally {
                    closeAllClients();
                }
            };

            if (isRunning) {
                // 背景已在執行 → 回送目前累積的紀錄，並持續推送新訊息
                safeEnqueue(globalLog);
            } else {
                isRunning = true;
                globalLog = '';
                currentStep = 0;
                startProcess();
            }
        },
        cancel() {
            // 客戶端斷線（例如切換頁面），不中斷背景程序
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
