import type { APIRoute } from 'astro';
export const prerender = false;
import { spawn } from 'child_process';

// ═══ 背景執行：全域狀態 ═══
let isRunning = false;
let currentStep = 0;
let globalLog = '';
let clients: Set<{ enqueue: (data: string) => void; close: () => void }> = new Set();
const MAX_LOG_CHARS = 200_000;

/** 結構化訊息廣播 — 所有客戶端收到同一行 */
const send = (line: string) => {
    const msg = line + '\n';
    globalLog += msg;
    if (globalLog.length > MAX_LOG_CHARS) {
        globalLog = globalLog.slice(globalLog.length - MAX_LOG_CHARS);
    }
    for (const client of clients) {
        client.enqueue(msg);
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

            const safeEnqueue = (data: string) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(data));
                } catch {
                    isClosed = true;
                    clients.delete(session);
                }
            };

            const safeClose = () => {
                if (isClosed) return;
                isClosed = true;
                try { controller.close(); } catch {}
            };

            const session = { enqueue: safeEnqueue, close: safeClose };
            clients.add(session);

            request.signal.addEventListener(
                'abort',
                () => {
                    isClosed = true;
                    clients.delete(session);
                },
                { once: true }
            );

            // ═══ 工具函式 ═══
            const fmt = (ms: number) => {
                if (ms < 1000) return `${ms}ms`;
                if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
                return `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
            };

            /** 靜默執行腳本（輸出不廣播） */
            const runSilent = (script: string, args: string[] = []) => {
                return new Promise<number>(resolve => {
                    const child = spawn('node', [script, ...args], { cwd: process.cwd() });
                    child.stdout.resume();
                    child.stderr.resume();
                    child.on('close', code => resolve(code || 0));
                });
            };

            /** 執行腳本並回呼 stdout 內容（用於擷取進度） */
            const runTracked = (script: string, onData: (text: string) => void) => {
                return new Promise<number>(resolve => {
                    const dec = new TextDecoder();
                    const child = spawn('node', [script], { cwd: process.cwd() });
                    child.stdout.on('data', d => onData(dec.decode(d, { stream: true })));
                    child.stderr.resume();
                    child.on('close', code => resolve(code || 0));
                });
            };

            // ═══ 伺服端 ETA 計算 ═══
            const STEP_EST = [0, 5, 420, 15, 45, 180, 1];
            const stepStart: number[] = [];

            const calcEta = (step: number, frac?: number): number => {
                const elapsed = (Date.now() - (stepStart[step] || Date.now())) / 1000;
                let remain = frac !== undefined && frac > 0.01
                    ? (elapsed / frac) * (1 - frac)
                    : Math.max(0, STEP_EST[step] - elapsed);
                for (let i = step + 1; i <= 6; i++) remain += STEP_EST[i];
                return Math.round(remain);
            };

            // ═══ 六階段更新流程 ═══
            const startProcess = async () => {
                const t0 = Date.now();
                const durations: { name: string; ms: number; ok: boolean }[] = [];
                let warnings = 0;

                const timed = async (name: string, fn: () => Promise<void>) => {
                    const s = Date.now();
                    let ok = true;
                    try {
                        await fn();
                    } catch (e) {
                        ok = false;
                        throw e;
                    } finally {
                        durations.push({ name, ms: Date.now() - s, ok });
                    }
                };

                try {
                    // ── Step 1：清單更新 ──
                    currentStep = 1;
                    stepStart[1] = Date.now();
                    send('STEP:1');
                    send('SUB:上市櫃股票代碼更新|run');
                    send(`ETA:${calcEta(1)}`);

                    await timed('清單更新', async () => {
                        const c = await runSilent('scripts/fetch-stock-list.mjs');
                        if (c !== 0) throw new Error('股票清單下載失敗');
                    });
                    send(`SUB:上市櫃股票代碼更新|ok|${fmt(durations.at(-1)!.ms)}`);

                    // ── Step 2：數據同步（全部並行） ──
                    currentStep = 2;
                    stepStart[2] = Date.now();
                    send('STEP:2');

                    const wave = [
                        { script: 'scripts/fetch-yahoo.mjs', label: '歷史行情 (Yahoo Finance)', tracked: true },
                        { script: 'scripts/fetch-chips.mjs', label: '三大法人 (TWSE+TPEx)' },
                        { script: 'scripts/fetch-monthly-stats.mjs', label: '月度統計 (PE/PB/Yield)' },
                        { script: 'scripts/fetch-financials.mjs', label: '季度財報 (TWSE+TPEx)' },
                        { script: 'scripts/fetch-revenue.mjs', label: '月營收' },
                        { script: 'scripts/fetch-valuation-history.mjs', label: '估值歷史' },
                        { script: 'scripts/crawlers/twse-chips.mjs', label: '每日法人' },
                        { script: 'scripts/crawlers/tdcc-shareholders.mjs', label: '股權分散 (TDCC)' },
                        { script: 'scripts/crawlers/twse-margin.mjs', label: '融資融券' },
                        { script: 'scripts/fetch-forensic.mjs', label: '鑑識數據 (4表)' },
                        { script: 'scripts/fetch-dividends.mjs', label: '除權除息' },
                        { script: 'scripts/fetch-market-index.mjs', label: '大盤指數 (TAIEX)' },
                    ];

                    let done = 0;
                    let yahooPct = 0;
                    let lastSend = 0;
                    const total = wave.length;

                    // 宣告所有子任務
                    for (const { label } of wave) {
                        send(`SUB:${label}|wait`);
                    }

                    const emitProgress = (force = false) => {
                        const now = Date.now();
                        if (!force && now - lastSend < 2000) return;
                        lastSend = now;
                        const frac = yahooPct > 0 ? yahooPct / 100 : done / total;
                        send(`ETA:${calcEta(2, frac)}`);
                    };

                    send(`ETA:${calcEta(2)}`);

                    await timed('數據同步', async () => {
                        await Promise.all(
                            wave.map(async ({ script, label, tracked }) => {
                                send(`SUB:${label}|run`);
                                const taskStart = Date.now();
                                let code: number;
                                if (tracked) {
                                    code = await runTracked(script, text => {
                                        const m = text.match(/(\d+)%\s+\[(\d+)\/(\d+)\]/);
                                        if (m) {
                                            yahooPct = parseInt(m[1]);
                                            send(`SUB:${label}|run|${m[1]}%`);
                                            emitProgress();
                                        }
                                    });
                                } else {
                                    code = await runSilent(script);
                                }
                                const elapsed = fmt(Date.now() - taskStart);
                                done++;
                                if (code !== 0) {
                                    warnings++;
                                    send(`SUB:${label}|warn|${elapsed}`);
                                } else {
                                    send(`SUB:${label}|ok|${elapsed}`);
                                }
                                emitProgress(true);
                                return code;
                            })
                        );
                    });
                    send(`LOG:數據同步 — ${done}/${total} 完成 (${fmt(durations.at(-1)!.ms)})`);

                    // ── Step 3：快照建置 ──
                    currentStep = 3;
                    stepStart[3] = Date.now();
                    send('STEP:3');
                    send('SUB:行情快照匯總 (latest_prices.json)|run');
                    send(`ETA:${calcEta(3)}`);

                    await timed('快照建置', async () => {
                        const c = await runSilent('scripts/build-price-snapshot.js');
                        if (c !== 0) {
                            warnings++;
                        }
                    });
                    send(`SUB:行情快照匯總 (latest_prices.json)|${durations.at(-1)!.ok ? 'ok' : 'warn'}|${fmt(durations.at(-1)!.ms)}`);

                    // ── Step 4：索引優化 ──
                    currentStep = 4;
                    stepStart[4] = Date.now();
                    send('STEP:4');
                    send('SUB:SQLite 資料庫重建 (27表)|run');
                    send('SUB:鑑識資料匯入|wait');
                    send(`ETA:${calcEta(4)}`);

                    await timed('資料庫重建', async () => {
                        const c = await runSilent('scripts/build-sqlite-db.js');
                        if (c !== 0) throw new Error('資料庫建置失敗');
                    });
                    send(`SUB:SQLite 資料庫重建 (27表)|ok|${fmt(durations.at(-1)!.ms)}`);

                    send('SUB:鑑識資料匯入|run');
                    await timed('鑑識匯入', async () => {
                        const c = await runSilent('scripts/import-forensic.mjs');
                        if (c !== 0) {
                            warnings++;
                        }
                    });
                    send(`SUB:鑑識資料匯入|${durations.at(-1)!.ok ? 'ok' : 'warn'}|${fmt(durations.at(-1)!.ms)}`);

                    // ── Step 5：延伸運算 ──
                    currentStep = 5;
                    stepStart[5] = Date.now();
                    send('STEP:5');
                    send('SUB:特徵工程 (籌碼·技術·估值·法人·產業)|run');
                    send('SUB:每日指標+大盤廣度 (MA/RSI/KD/ADL)|wait');
                    send(`ETA:${calcEta(5)}`);

                    await timed('特徵工程', async () => {
                        const c = await runSilent('scripts/etl/generate-all-features.mjs');
                        if (c !== 0) warnings++;
                    });
                    send(`SUB:特徵工程 (籌碼·技術·估值·法人·產業)|${durations.at(-1)!.ok ? 'ok' : 'warn'}|${fmt(durations.at(-1)!.ms)}`);

                    send('SUB:每日指標+大盤廣度 (MA/RSI/KD/ADL)|run');
                    send(`ETA:${calcEta(5, 0.4)}`);

                    await timed('技術指標', async () => {
                        const c = await runSilent(
                            'scripts/etl/migrate-to-analysis-tables.mjs'
                        );
                        if (c !== 0) warnings++;
                    });
                    send(`SUB:每日指標+大盤廣度 (MA/RSI/KD/ADL)|${durations.at(-1)!.ok ? 'ok' : 'warn'}|${fmt(durations.at(-1)!.ms)}`);

                    // ── Step 6：同步完成 ──
                    currentStep = 6;
                    stepStart[6] = Date.now();
                    send('STEP:6');
                    send('ETA:0');

                    const totalMs = Date.now() - t0;
                    const report = durations
                        .map(d => `${d.ok ? '✅' : '⚠️'} ${d.name} ${fmt(d.ms)}`)
                        .join(' | ');
                    send(`DONE:${totalMs}`);
                    send(
                        `LOG:同步完成 ✅ 總耗時 ${fmt(totalMs)}${warnings > 0 ? ` (${warnings} 項警告)` : ''}`
                    );
                    send(`REPORT:${report}`);
                } catch (err) {
                    const totalMs = Date.now() - t0;
                    send(
                        `ERROR:更新程序中斷 — ${(err as Error).message} (已執行 ${fmt(totalMs)})`
                    );
                } finally {
                    closeAllClients();
                }
            };

            if (isRunning) {
                safeEnqueue(globalLog);
            } else {
                isRunning = true;
                globalLog = '';
                currentStep = 0;
                startProcess();
            }
        },
        cancel() {},
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
};
