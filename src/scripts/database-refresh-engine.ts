/**
 * 資料同步引擎 — 結構化協定解析器
 * 協定格式：TYPE:payload\n
 * 支援 STEP / SUB / LOG / ETA / WARN / ERROR / DONE / REPORT
 */
export function initDatabaseRefreshTerminal() {
    const startBtn = document.getElementById('start-refresh-btn') as HTMLButtonElement | null;
    const refreshArea = document.getElementById('refresh-area');
    const refreshTerminal = document.getElementById('refresh-terminal');

    if (!startBtn || !refreshArea || !refreshTerminal) return;

    const STEP_NAMES: Record<number, string> = {
        1: '清單更新', 2: '數據同步', 3: '快照建置',
        4: '索引優化', 5: '延伸運算', 6: '同步完成',
    };

    interface SubStep {
        label: string;
        status: 'wait' | 'run' | 'ok' | 'warn' | 'fail';
        detail: string;
    }

    const startRefresh = async (skipConfirm = false, initialStep = 0) => {
        if (!skipConfirm && !confirm('即將執行資料庫更新，確認啟動同步？')) return;

        startBtn.disabled = true;

        // ═══ Sub-step State ═══
        const stepHistory: { step: number; subs: SubStep[] }[] = [];
        let curStep = 0;
        let curSubs: SubStep[] = [];
        let lastLogMsg = '';
        let reportText = '';

        const archiveStep = () => {
            if (curStep > 0 && curSubs.length > 0) {
                stepHistory.push({ step: curStep, subs: curSubs.map(s => ({ ...s })) });
            }
            curSubs = [];
        };

        // ═══ Terminal Rendering ═══
        const renderTerminal = () => {
            const lines: string[] = [];

            // Completed steps
            for (const hist of stepHistory) {
                lines.push(stepHeader(hist.step, true));
                for (const sub of hist.subs) lines.push(subLine(sub));
                lines.push('');
            }

            // Current step
            if (curStep > 0 && curStep <= 5) {
                lines.push(stepHeader(curStep, false));
                for (const sub of curSubs) lines.push(subLine(sub));
            }

            // Final report
            if (reportText) {
                lines.push('');
                lines.push(reportText);
            }

            refreshTerminal.innerHTML = lines.length > 0
                ? lines.join('\n')
                : '<span class="text-accent/40">&gt;&gt; 等待指令…</span>';
            refreshTerminal.scrollTop = refreshTerminal.scrollHeight;
        };

        const stepHeader = (step: number, done: boolean): string => {
            const name = STEP_NAMES[step] || '';
            const cls = done ? 'text-accent/40' : 'text-accent font-bold';
            return `<span class="${cls}">── STEP ${step}  ${name} ${'─'.repeat(36)}</span>`;
        };

        const subLine = (sub: SubStep): string => {
            switch (sub.status) {
                case 'ok':
                    return `<span class="text-emerald-400/90">  ✅ ${sub.label}</span>` +
                        (sub.detail ? `<span class="text-emerald-400/40">  ${sub.detail}</span>` : '');
                case 'warn':
                    return `<span class="text-yellow-400/90">  ⚠️ ${sub.label}</span>` +
                        (sub.detail ? `<span class="text-yellow-400/40">  ${sub.detail}</span>` : '');
                case 'fail':
                    return `<span class="text-red-400/90">  ❌ ${sub.label}</span>` +
                        (sub.detail ? `<span class="text-red-400/40">  ${sub.detail}</span>` : '');
                case 'run':
                    return `<span class="text-accent sub-running">  ⟳  ${sub.label}</span>` +
                        `<span class="text-accent/40">  ${sub.detail || '進行中…'}</span>`;
                default:
                    return `<span class="text-text-muted/30">  ◦  ${sub.label}</span>`;
            }
        };

        renderTerminal();

        // ═══ ETA 顯示 ═══
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

        /** 平滑 ETA 更新 — 避免抖動 */
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
            etaContainer.classList.remove('opacity-0', 'translate-x-3', 'no-display');
        }
        renderETA();

        // ═══ 階段進度條 ═══
        const updateStage = (step: number) => {
            const line = document.getElementById('stage-progress-line');
            if (line) line.style.width = `${(step - 1) * 20}%`;

            document.querySelectorAll('.stage-item').forEach(el => {
                const s = parseInt((el as HTMLElement).dataset.step || '0');
                const icon = el.querySelector('.stage-icon');
                const label = el.querySelector('.stage-label');

                if (s < step) {
                    icon?.classList.remove('grayscale', 'opacity-40', 'border-border/50', 'bg-surface');
                    icon?.classList.add('border-accent/40', 'bg-accent/10', 'text-accent');
                    label?.classList.remove('text-text-muted');
                    label?.classList.add('text-accent');
                } else if (s === step) {
                    icon?.classList.remove('grayscale', 'opacity-40', 'border-border/50', 'bg-surface');
                    icon?.classList.add('border-accent', 'bg-accent/20');
                    label?.classList.remove('text-text-muted');
                    label?.classList.add('text-text-primary', 'font-black');
                } else {
                    icon?.classList.add('grayscale', 'opacity-40', 'border-border/50', 'bg-surface');
                    icon?.classList.remove('border-accent', 'bg-accent/20', 'text-accent');
                    label?.classList.add('text-text-muted');
                    label?.classList.remove('text-text-primary', 'font-black', 'text-accent');
                }
            });
        };
        updateStage(initialStep > 0 ? initialStep : 1);

        // ═══ 串流處理 ═══
        const processLine = (line: string) => {
            if (!line) return;
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) return;

            const type = line.slice(0, colonIdx);
            const payload = line.slice(colonIdx + 1);

            switch (type) {
                case 'STEP': {
                    archiveStep();
                    curStep = parseInt(payload);
                    updateStage(curStep);
                    renderTerminal();
                    break;
                }
                case 'SUB': {
                    const parts = payload.split('|');
                    const label = parts[0] || '';
                    const status = (parts[1] || 'wait') as SubStep['status'];
                    const detail = parts[2] || '';
                    const existing = curSubs.find(s => s.label === label);
                    if (existing) {
                        existing.status = status;
                        if (detail) existing.detail = detail;
                    } else {
                        curSubs.push({ label, status, detail });
                    }
                    renderTerminal();
                    break;
                }
                case 'LOG':
                    lastLogMsg = payload;
                    break;
                case 'ETA':
                    handleEta(parseInt(payload));
                    break;
                case 'WARN':
                    break;
                case 'ERROR':
                    archiveStep();
                    reportText = `<span class="text-red-400 font-bold">❌ ${escapeHtml(payload)}</span>`;
                    renderTerminal();
                    break;
                case 'DONE':
                    if (etaTimerId) {
                        clearInterval(etaTimerId);
                        etaTimerId = null;
                    }
                    etaSeconds = 0;
                    renderETA();
                    break;
                case 'REPORT': {
                    archiveStep();
                    const items = payload.split(' | ');
                    reportText = `<span class="text-accent font-bold">── 更新摘要 ${'─'.repeat(40)}</span>\n`;
                    reportText += items.map(item =>
                        `<span class="text-emerald-400/70">  ${escapeHtml(item)}</span>`
                    ).join('\n');
                    if (lastLogMsg) {
                        reportText += `\n\n<span class="text-accent font-bold">${escapeHtml(lastLogMsg)}</span>`;
                    }
                    renderTerminal();
                    break;
                }
            }
        };

        const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
            reportText = `<span class="text-red-400 font-bold">❌ 連線中斷：${escapeHtml(msg)}</span>`;
            renderTerminal();
        } finally {
            if (etaTimerId) clearInterval(etaTimerId);
            startBtn.disabled = false;

            // 同步側邊欄計數
            try {
                const statsRes = await fetch('/api/db/stats');
                if (statsRes.ok) {
                    const stats = await statsRes.json();
                    stats.forEach((stat: { name: string; rows: number }) => {
                        const span = document.querySelector(
                            `span[data-table-count="${stat.name}"]`
                        );
                        if (span) {
                            span.textContent =
                                stat.rows > 1000
                                    ? (stat.rows / 1000).toFixed(1) + 'K'
                                    : String(stat.rows);
                        }
                    });
                }
            } catch {}

            startBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                執行更新
            `;
        }
    };

    if (!startBtn.dataset.bound) {
        startBtn.dataset.bound = 'true';
        startBtn.addEventListener('click', () => startRefresh(false));

        fetch('/api/db/refresh', { method: 'GET' })
            .then(res => res.json())
            .then(data => {
                if (data.isRunning) {
                    if (refreshArea) {
                        refreshArea.classList.remove('hidden');
                        refreshArea.classList.add('flex');
                    }
                    startRefresh(true, data.currentStep || 1);
                }
            })
            .catch(err => console.error('背景狀態檢查失敗', err));
    }
}

document.addEventListener('astro:page-load', () => {
    initDatabaseRefreshTerminal();
});
