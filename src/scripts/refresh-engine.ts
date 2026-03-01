/**
 * 資料同步覆蓋層引擎 — 結構化協定解析器
 * 與 database-refresh-engine.ts 共用同一後端協定 (STEP/LOG/ETA/WARN/ERROR/DONE/REPORT)
 * 此版本為全螢幕覆蓋層，5 階段視覺（對應後端 6 步驟）
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
        if (!confirm('即將執行資料庫更新，確認啟動同步？')) return;

        if (refreshBtn) refreshBtn.disabled = true;
        if (mobileRefreshBtn) mobileRefreshBtn.disabled = true;
        refreshOverlay.classList.remove('hidden');
        closeRefresh.classList.add('hidden');
        refreshTerminal.textContent = '正在建立連線…';

        const etaEl = document.getElementById('refresh-eta');
        const etaContainer = document.getElementById('refresh-eta-container');
        let etaSeconds = 660;
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

        const handleEta = (serverSec: number) => {
            if (serverSec <= 0) {
                etaSeconds = 0;
            } else if (Math.abs(etaSeconds - serverSec) <= 5) {
                return;
            } else {
                etaSeconds = Math.round(etaSeconds * 0.6 + serverSec * 0.4);
            }
            renderETA();
        };

        if (etaContainer) {
            etaContainer.classList.remove('opacity-0', 'translate-x-3');
        }
        renderETA();

        // 後端 6 步驟 → 覆蓋層 5 步驟映射
        const mapStep = (backendStep: number) => Math.min(backendStep, 5);

        const updateStage = (step: number) => {
            const line = document.getElementById('stage-progress-line');
            if (line) line.style.width = `${(step - 1) * 25}%`;

            document.querySelectorAll('.stage-item').forEach(el => {
                const s = parseInt((el as HTMLElement).dataset.step || '0');
                const icon = el.querySelector('.stage-icon');
                const label = el.querySelector('.stage-label');

                if (s < step) {
                    icon?.classList.remove('grayscale', 'opacity-40', 'border-border/50', 'bg-surface');
                    icon?.classList.add('border-accent/40', 'bg-accent/10', 'text-accent');
                    label?.classList.remove('text-text-muted/70');
                    label?.classList.add('text-accent');
                } else if (s === step) {
                    icon?.classList.remove('grayscale', 'opacity-40', 'border-border/50', 'bg-surface');
                    icon?.classList.add('border-accent', 'bg-accent/20');
                    label?.classList.remove('text-text-muted/70');
                    label?.classList.add('text-text-primary', 'font-black');
                } else {
                    icon?.classList.add('grayscale', 'opacity-40', 'border-border/50', 'bg-surface');
                    icon?.classList.remove('border-accent', 'bg-accent/20', 'text-accent');
                    label?.classList.add('text-text-muted/70');
                    label?.classList.remove('text-text-primary', 'font-black', 'text-accent');
                }
            });
        };
        updateStage(1);

        let lastLogMsg = '';

        const processLine = (line: string) => {
            if (!line) return;
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) return;

            const type = line.slice(0, colonIdx);
            const payload = line.slice(colonIdx + 1);

            switch (type) {
                case 'STEP':
                    updateStage(mapStep(parseInt(payload)));
                    break;
                case 'LOG':
                    lastLogMsg = payload;
                    refreshTerminal.textContent = payload;
                    break;
                case 'ETA':
                    handleEta(parseInt(payload));
                    break;
                case 'ERROR':
                    refreshTerminal.textContent = `❌ ${payload}`;
                    break;
                case 'DONE':
                    if (etaTimerId) {
                        clearInterval(etaTimerId);
                        etaTimerId = null;
                    }
                    etaSeconds = 0;
                    renderETA();
                    break;
                case 'REPORT':
                    refreshTerminal.textContent = `${lastLogMsg}\n\n${payload.split(' | ').join('\n')}`;
                    break;
            }
        };

        try {
            const res = await fetch('/api/db/refresh', { method: 'POST' });
            if (!res.body) throw new Error('伺服器未返回串流');

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let nl: number;
                while ((nl = buffer.indexOf('\n')) !== -1) {
                    processLine(buffer.slice(0, nl));
                    buffer = buffer.slice(nl + 1);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '未知錯誤';
            refreshTerminal.textContent = `❌ 連線中斷：${msg}`;
        } finally {
            if (etaTimerId) clearInterval(etaTimerId);
            if (refreshBtn) refreshBtn.disabled = false;
            if (mobileRefreshBtn) mobileRefreshBtn.disabled = false;
            closeRefresh.classList.remove('hidden');
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
document.addEventListener('astro:page-load', () => {
    if (!document.getElementById('refresh-terminal')) return;
    if (refreshTerminalInitialized) return;
    refreshTerminalInitialized = true;
    initRefreshTerminal();
});
