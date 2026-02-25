import type { APIRoute } from 'astro';
export const prerender = false;
import { spawn } from 'child_process';

export const POST: APIRoute = async () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

            const runScript = (script: string, args: string[] = []) => {
                return new Promise<number>((resolve) => {
                    const child = spawn('node', [script, ...args], { cwd: process.cwd() });
                    child.stdout.on('data', data => controller.enqueue(data));
                    child.stderr.on('data', data => controller.enqueue(data));
                    child.on('close', resolve);
                });
            };

            const startProcess = async () => {
                try {
                    enqueue('>> [1/4] 正在解析並更新上市櫃股票最新代碼清單...\n');
                    const listCode = await runScript('scripts/fetch-stock-list.mjs');
                    if (listCode !== 0) {
                        enqueue(`\n\n[失敗] 股票清單下載異常，代碼: ${listCode}\n`);
                        controller.close();
                        return;
                    }

                    enqueue('\n>> [2/4] 正在執行多維度行情同步 (歷史行情、法人籌碼、季度財報、每月營收)...\n');

                    // Reverting to sequential execution to satisfy the requirement of "single line progress bar"
                    // Parallel execution interferes with \r (carriage return) carriage control.
                    await runScript('scripts/fetch-yahoo.mjs');
                    await runScript('scripts/fetch-chips.mjs');
                    await runScript('scripts/fetch-monthly-stats.mjs');
                    await runScript('scripts/fetch-financials.mjs');
                    await runScript('scripts/fetch-revenue.mjs');

                    enqueue('\n>> [3/4] 正在匯總異質資料並建置全系統高速快照系統 (Snapshot)...\n');
                    const snapCode = await runScript('scripts/build-price-snapshot.js');
                    if (snapCode !== 0) {
                        enqueue(`\n\n[警告] 快照建置程序未正常結束，代碼: ${snapCode}\n`);
                    }

                    enqueue('\n>> [4/4] 正在優化離線 SQLite 資料庫結構並重構全域索引系統...\n');
                    const dbCode = await runScript('scripts/build-sqlite-db.js');
                    if (dbCode === 0) {
                        enqueue('\n\n[完成] 全系統數據同步全面完成！系統目前運作於極速離線模式。\n');
                    } else {
                        enqueue(`\n\n[錯誤] 資料庫系統建置失敗，代碼: ${dbCode}\n`);
                    }
                } catch (err) {
                    enqueue(`\n\n[致命錯誤] 系統更新程序中斷: ${(err as Error).message}\n`);
                } finally {
                    controller.close();
                }
            };

            startProcess();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
};
