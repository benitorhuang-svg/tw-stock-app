/**
 * Core engine for RefreshTerminal data synchronization
 */
export function initRefreshTerminal() {
    const refreshBtn = document.getElementById('refresh-data-btn') as HTMLButtonElement | null;
    const mobileRefreshBtn = document.getElementById(
        'mobile-refresh-data-btn'
    ) as HTMLButtonElement | null;
    const refreshOverlay = document.getElementById('refresh-overlay');
    const refreshTerminal = document.getElementById('refresh-terminal');
    const closeRefresh = document.getElementById('close-refresh');

    if (!refreshOverlay || !refreshTerminal || !closeRefresh) return;

    const startRefresh = async () => {
        if (!confirm('即將執行資料庫資料更新，將顯示終端機即時進度畫面，是否繼續？')) return;

        if (refreshBtn) refreshBtn.disabled = true;
        if (mobileRefreshBtn) mobileRefreshBtn.disabled = true;
        refreshOverlay.classList.remove('hidden');
        closeRefresh.classList.add('hidden');
        refreshTerminal.textContent = '>> 正在建立連線...\n';

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
            etaContainer.classList.remove('opacity-0', 'translate-x-3');
        }
        renderETA();

        const updateStage = (step: number) => {
            const line = document.getElementById('stage-progress-line');
            if (line) line.style.width = `${(step - 1) * 25}%`;

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
                    label?.classList.remove('text-white/30');
                    label?.classList.add('text-accent');
                } else if (s === step) {
                    icon?.classList.remove(
                        'grayscale',
                        'opacity-40',
                        'border-border/50',
                        'bg-surface'
                    );
                    icon?.classList.add('border-accent', 'bg-accent/20');
                    label?.classList.remove('text-white/30');
                    label?.classList.add('text-white', 'font-black');
                } else {
                    icon?.classList.add(
                        'grayscale',
                        'opacity-40',
                        'border-border/50',
                        'bg-surface'
                    );
                    icon?.classList.remove('border-accent', 'bg-accent/20', 'text-accent');
                    label?.classList.add('text-white/30');
                    label?.classList.remove('text-white', 'font-black', 'text-accent');
                }
            });
        };
        updateStage(1);

        try {
            const res = await fetch('/api/db/refresh', { method: 'POST' });
            if (!res.body) throw new Error('伺服器未返回可讀取的串流(ReadableStream)。');

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let currentText = '';
            const triggeredStages = new Set<number>();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                for (const char of chunk) {
                    if (char === '\r') {
                        const lastNewline = currentText.lastIndexOf('\n');
                        if (lastNewline !== -1) {
                            currentText = currentText.slice(0, lastNewline + 1);
                        } else {
                            currentText = '';
                        }
                    } else {
                        currentText += char;
                    }
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
                        if (eta !== undefined) forceETA(eta);
                    }
                };
                checkStage('[1/4]', 1);
                checkStage('[2/4]', 2);
                checkStage('[3/4]', 3, 60);
                checkStage('[4/4]', 4, 30);
                checkStage('[完成]', 5, 0);
            }
        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            refreshTerminal.textContent += `\n[中斷] 發生未預期的錯誤: ${msg}\n`;
        } finally {
            if (etaTimerId) clearInterval(etaTimerId);
            if (refreshBtn) refreshBtn.disabled = false;
            if (mobileRefreshBtn) mobileRefreshBtn.disabled = false;
            closeRefresh.classList.remove('hidden');
            refreshTerminal.scrollTop = refreshTerminal.scrollHeight;
        }
    };

    if (refreshBtn) {
        refreshBtn.removeEventListener('click', startRefresh);
        refreshBtn.addEventListener('click', startRefresh);
    }

    if (mobileRefreshBtn) {
        mobileRefreshBtn.removeEventListener('click', startRefresh);
        mobileRefreshBtn.addEventListener('click', startRefresh);
    }

    const reloadPage = () => window.location.reload();
    closeRefresh.removeEventListener('click', reloadPage);
    closeRefresh.addEventListener('click', reloadPage);
}

let refreshTerminalInitialized = false;
// Bind to event
document.addEventListener('astro:page-load', () => {
    if (!document.getElementById('refresh-terminal')) return;
    if (refreshTerminalInitialized) return;
    refreshTerminalInitialized = true;
    initRefreshTerminal();
});
