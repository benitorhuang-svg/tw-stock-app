import type { APIRoute } from 'astro';
import { spawn } from 'child_process';

export const POST: APIRoute = async () => {
    const encoder = new TextEncoder();

    // Create a streaming response
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('>> 初始化同步程序...\n'));
            controller.enqueue(encoder.encode('>> [1/3] 取得上市櫃股票最新清單...\n'));

            // Step 1: Fetch Stock List
            const listChild = spawn('node', ['scripts/fetch-stock-list.mjs'], {
                cwd: process.cwd(),
            });

            listChild.stdout.on('data', data => controller.enqueue(data));
            listChild.stderr.on('data', data => controller.enqueue(data));

            listChild.on('close', listCode => {
                if (listCode !== 0) {
                    controller.enqueue(
                        encoder.encode(
                            `\n\n[ERROR] fetch-stock-list exited with code ${listCode}\n`
                        )
                    );
                    controller.close();
                    return;
                }

                controller.enqueue(encoder.encode('\n>> [2/3] 下載歷史行情資料...\n'));

                // Step 2: Fetch Yahoo
                const child = spawn('node', ['scripts/fetch-yahoo.mjs'], { cwd: process.cwd() });

                child.stdout.on('data', data => controller.enqueue(data));
                child.stderr.on('data', data => controller.enqueue(data));

                child.on('close', code => {
                    if (code !== 0) {
                        controller.enqueue(
                            encoder.encode(`\n\n[ERROR] fetch-yahoo exited with code ${code}\n`)
                        );
                        controller.close();
                        return;
                    }

                    controller.enqueue(
                        encoder.encode(`\n\n>> [3/3] 啟動快照建置程序 (Build Price Snapshot)...\n`)
                    );

                    // Run step 3
                    const snap = spawn('node', ['scripts/build-price-snapshot.js'], {
                        cwd: process.cwd(),
                    });
                    snap.stdout.on('data', data => controller.enqueue(data));
                    snap.stderr.on('data', data => controller.enqueue(data));

                    snap.on('close', snapCode => {
                        if (snapCode !== 0) {
                            controller.enqueue(
                                encoder.encode(
                                    `\n\n[ERROR] build-price-snapshot exited with code ${snapCode}\n`
                                )
                            );
                            controller.close();
                            return;
                        }

                        // Run step 4
                        controller.enqueue(
                            encoder.encode(`\n\n>> [4/4] 重建本機 SQLite 資料庫 (Build SQLite DB)...\n`)
                        );
                        const dbBuild = spawn('node', ['scripts/build-sqlite-db.js'], {
                            cwd: process.cwd(),
                        });
                        dbBuild.stdout.on('data', data => controller.enqueue(data));
                        dbBuild.stderr.on('data', data => controller.enqueue(data));

                        dbBuild.on('close', dbCode => {
                            if (dbCode !== 0) {
                                controller.enqueue(
                                    encoder.encode(
                                        `\n\n[ERROR] build-sqlite-db exited with code ${dbCode}\n`
                                    )
                                );
                            } else {
                                controller.enqueue(
                                    encoder.encode(
                                        `\n\n[DONE] 資料庫同步全面完成！請關閉視窗以重新載入。\n`
                                    )
                                );
                            }
                            controller.close();
                        });
                    });
                });

                listChild.on('error', err => {
                    controller.enqueue(encoder.encode(`\n[FATAL ERROR] ${err.message}\n`));
                    controller.close();
                });

                child.on('error', err => {
                    controller.enqueue(encoder.encode(`\n[FATAL ERROR] ${err.message}\n`));
                    controller.close();
                });
            });
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
