/**
 * Core engine for DatabaseRefreshArea data synchronization
 */
export function initDatabaseRefreshTerminal() {
    const startBtn = document.getElementById('start-refresh-btn') as HTMLButtonElement | null;
    const refreshArea = document.getElementById('refresh-area');
    const refreshTerminal = document.getElementById('refresh-terminal');

    if (!startBtn || !refreshArea || !refreshTerminal) return;

    const startRefresh = async (skipConfirm = false, initialStep = 0) => {
        if (!skipConfirm && !confirm('即將執行資料庫資料更新，確認啟動同步？')) return;

        startBtn.disabled = true;

        if (!skipConfirm) {
            refreshTerminal.textContent = '>> 正在建立連線...\n';
        } else {
            refreshTerminal.textContent = '>> 背景更新進行中，正在重新連線...\n';
        }

        const timeToSec = (str: string) => {
            const parts = str.split(':');
            if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            return 0;
        };

        const etaEl = document.getElementById('refresh-eta');
        const etaContainer = document.getElementById('refresh-eta-container');
        let etaSeconds = 600;
        let etaTimerId: ReturnType<typeof setInterval> | null = null;

        const renderETA = () => {
            if (!etaEl) return;
            const m = Math.floor(etaSeconds / 60);
            const s = etaSeconds % 60;
            etaEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        etaTimerId = setInterval(() => {
            if (etaSeconds > 0) {
                etaSeconds--;
                renderETA();
            }
        }, 1000);

        const calibrateETA = (newSeconds: number) => {
            if (Math.abs(etaSeconds - newSeconds) > 15) {
                etaSeconds = newSeconds;
                renderETA();
            }
        };

        const forceETA = (newSeconds: number) => {
            etaSeconds = newSeconds;
            renderETA();
        };

        if (etaContainer) {
            etaContainer.classList.remove('opacity-0', 'translate-x-3', 'no-display');
        }
        renderETA();

        // Track triggered stages globally for memory within this run
        let triggeredStages = new Set<number>();

        const updateStage = (step: number) => {
            const line = document.getElementById('stage-progress-line');
            if (line) line.style.width = `${(step - 1) * 20}%`;

            document.querySelectorAll('.stage-item').forEach(el => {
                const s = parseInt((el as HTMLElement).dataset.step || '0');
                const icon = el.querySelector('.stage-icon');
                const label = el.querySelector('.stage-label');

                if (s < step) {
                    icon?.classList.remove(
                        'grayscale',
                        'opacity-40',
                        'border-border/50',
                        'bg-surface'
                    );
                    icon?.classList.add('border-accent/40', 'bg-accent/10', 'text-accent');
                    label?.classList.remove('text-white/40');
                    label?.classList.add('text-accent');
                } else if (s === step) {
                    icon?.classList.remove(
                        'grayscale',
                        'opacity-40',
                        'border-border/50',
                        'bg-surface'
                    );
                    icon?.classList.add('border-accent', 'bg-accent/20');
                    label?.classList.remove('text-white/40');
                    label?.classList.add('text-white', 'font-black');
                } else {
                    icon?.classList.add(
                        'grayscale',
                        'opacity-40',
                        'border-border/50',
                        'bg-surface'
                    );
                    icon?.classList.remove('border-accent', 'bg-accent/20', 'text-accent');
                    label?.classList.add('text-white/40');
                    label?.classList.remove('text-white', 'font-black', 'text-accent');
                }
            });
        };
        // 若為背景重連且有 currentStep，直接跳到該階段
        updateStage(initialStep > 0 ? initialStep : 1);

        try {
            const res = await fetch('/api/db/refresh', { method: 'POST' });
            if (!res.body) throw new Error('伺服器未返回可讀取的串流(ReadableStream)。');

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let currentText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // Process \r (carriage return) by replacing the current line
                const crIdx = chunk.lastIndexOf('\r');
                if (crIdx !== -1) {
                    // Only process the last \r for efficiency
                    const lastNewline = currentText.lastIndexOf('\n');
                    currentText = lastNewline !== -1 ? currentText.slice(0, lastNewline + 1) : '';
                    currentText += chunk.slice(crIdx + 1);
                } else {
                    currentText += chunk;
                }
                refreshTerminal.textContent = currentText;
                refreshTerminal.scrollTop = refreshTerminal.scrollHeight;

                if (currentText.includes('預計剩餘:')) {
                    const lines = currentText.split('\n');
                    const lastLine = lines[lines.length - 1];
                    const match = lastLine.match(/預計剩餘: ([^\|\n]+)/);
                    if (match) {
                        const yahooSec = timeToSec(match[1].trim());
                        calibrateETA(yahooSec + 90);
                    }
                }

                const checkStage = (marker: string, step: number, eta?: number) => {
                    if (!triggeredStages.has(step) && currentText.includes(marker)) {
                        triggeredStages.add(step);
                        updateStage(step);
                        if (eta !== undefined && skipConfirm) forceETA(eta);
                    }
                };
                checkStage('[1/6]', 1);
                checkStage('[2/6]', 2);
                checkStage('[3/6]', 3, 90);
                checkStage('[4/6]', 4, 60);
                checkStage('[5/6]', 5, 30);
                checkStage('[完成]', 6, 0);
            }
        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            refreshTerminal.textContent += `\n[中斷] 發生未預期的錯誤: ${msg}\n`;
        } finally {
            if (etaTimerId) clearInterval(etaTimerId);
            startBtn.disabled = false;

            // Try to sync table counts
            try {
                const statsRes = await fetch('/api/db/stats');
                if (statsRes.ok) {
                    const stats = await statsRes.json();
                    stats.forEach((stat: any) => {
                        const span = document.querySelector(
                            `span[data-table-count="${stat.name}"]`
                        );
                        if (span) {
                            span.textContent =
                                stat.rows > 1000 ? (stat.rows / 1000).toFixed(1) + 'K' : stat.rows;
                        }
                    });
                    refreshTerminal.textContent += `\n✅ 側邊欄計數已同步更新`;
                }
            } catch (err) {
                console.error('Failed to update sidebar stats:', err);
            }

            startBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                執行更新
            `;
            refreshTerminal.scrollTop = refreshTerminal.scrollHeight;
        }
    };

    if (!startBtn.dataset.bound) {
        startBtn.dataset.bound = 'true';
        startBtn.addEventListener('click', () => startRefresh(false));

        // Check if there is already a background refresh running and resume UI updates
        fetch('/api/db/refresh', { method: 'GET' })
            .then(res => res.json())
            .then(data => {
                if (data.isRunning) {
                    // 顯示更新面板 & 傳遞目前進度階段
                    if (refreshArea) {
                        refreshArea.classList.remove('hidden');
                        refreshArea.classList.add('flex');
                    }
                    startRefresh(true, data.currentStep || 1);
                }
            })
            .catch(err => console.error('背景更新狀態檢查失敗', err));
    }
}

document.addEventListener('astro:page-load', () => {
    initDatabaseRefreshTerminal();
});
