/**
 * Core engine for CyberCalendar
 */

export function initCyberCalendar(id: string, initialValue: string) {
    const wrapper = document.getElementById(`${id}-wrapper`);
    const trigger = document.getElementById(`${id}-trigger`);
    const popover = document.getElementById(`${id}-popover`) as HTMLElement;
    const input = document.getElementById(id) as HTMLInputElement;
    const label = document.getElementById(`${id}-label`) as HTMLElement;
    const daysGrid = document.getElementById(`${id}-days`) as HTMLElement;

    if (!wrapper || !trigger || !popover || !input || !label || !daysGrid) return;

    const monthYearTxt = popover.querySelector('.month-year') as HTMLElement;
    if (!monthYearTxt) return;

    // ═══ Ratio Cache (per-month, avoids redundant API calls) ═══
    const ratioCache: Record<string, Record<string, number>> = {};

    async function fetchMonthlyRatios(year: number, month: number) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (ratioCache[key]) return ratioCache[key];
        try {
            const res = await fetch(`/api/market/monthly-ratios?year=${year}&month=${month + 1}`);
            if (res.ok) {
                const data = await res.json();
                ratioCache[key] = data.ratios || {};
                return ratioCache[key];
            }
        } catch (err) {
            console.warn('[CyberCalendar] Failed to fetch ratios:', err);
        }
        return {};
    }

    function parseDate(dateStr: string | null) {
        if (!dateStr) return new Date();
        const parts = dateStr.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2] || 1);
    }

    let currentDate = parseDate(initialValue || label.textContent);
    let displayMonth = currentDate.getMonth();
    let displayYear = currentDate.getFullYear();

    // ═══ Atomic CSS Generator (戳戳樂 Style with REAL Ratios) ═══
    function createDayNode(content: string | number, type: string, ratio: number | null | undefined) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(content);

        let classes =
            'aspect-square flex flex-col items-center justify-center text-[13px] font-mono font-black rounded-xl transition-all duration-300 border-b-4 overflow-hidden relative group/day ';

        // 1. 決定背景底色 (Strict: Blue / Red / Green)
        if (type === 'other') {
            classes +=
                'opacity-[0.02] cursor-default pointer-events-none border-transparent bg-white/5 ';
        } else if (ratio === null || ratio === undefined) {
            // ═══ 沒開市 → 藍色 ═══
            classes += 'bg-[#1e40af]/50 text-blue-200/70 border-[#1e3a5f] ';
        } else {
            // ═══ 有開市 → 紅色 (Ratio >= 1) 或 綠色 (Ratio < 1) ═══
            if (ratio >= 1.0) {
                // 紅色系 (多頭/平盤)
                classes +=
                    ratio >= 1.2
                        ? 'bg-[#ef4444] text-white border-[#b91c1c] '
                        : 'bg-[#ef4444]/60 text-white/90 border-[#b91c1c]/40 ';
            } else {
                // 綠色系 (空頭)
                classes +=
                    ratio <= 0.8
                        ? 'bg-[#22c55e] text-white border-[#15803d] '
                        : 'bg-[#22c55e]/60 text-white/90 border-[#15803d]/40 ';
            }
        }

        // 2. 決定狀態疊加 (Selected/Today)
        if (type === 'selected') {
            // 選中：白色發光外框標示，不改變背景色
            classes +=
                'ring-4 ring-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10 scale-105 -translate-y-1 ';
        } else if (type === 'today') {
            // 今日：底部指示線
            classes += 'border-b-[#fbbf24] ';
        }

        // 3. 互動效果
        if (type !== 'other') {
            classes += 'cursor-pointer hover:scale-110 hover:-translate-y-1.5 hover:shadow-xl ';
        }

        // Gloss overlay
        const gloss = document.createElement('div');
        gloss.className =
            'absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none';
        btn.appendChild(gloss);

        // Ratio tooltip on hover
        if (type !== 'other' && ratio !== null && ratio !== undefined) {
            const tip = document.createElement('div');
            tip.className =
                'absolute bottom-0.5 right-0.5 text-[6px] opacity-0 group-hover/day:opacity-50 transition-opacity pointer-events-none text-white font-black';
            tip.textContent = ratio.toFixed(1);
            btn.appendChild(tip);
        }

        btn.className = classes;
        return btn;
    }

    // ═══ Async Render Calendar (fetches real data) ═══
    async function renderCalendar() {
        if (!daysGrid || !monthYearTxt) return;
        daysGrid.innerHTML = '';
        monthYearTxt.textContent = `${displayYear} / ${String(displayMonth + 1).padStart(2, '0')}`;

        const firstDay = new Date(displayYear, displayMonth, 1).getDay();
        const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
        const prevMonthDays = new Date(displayYear, displayMonth, 0).getDate();
        const today = new Date();
        const isMatch = (d: number, m: number, y: number, date: Date) =>
            d === date.getDate() && m === date.getMonth() && y === date.getFullYear();

        // Show loading skeleton
        for (let i = 0; i < 35; i++) {
            const sk = document.createElement('div');
            sk.className = 'aspect-square rounded-xl bg-white/5 animate-pulse';
            daysGrid.appendChild(sk);
        }

        // Fetch ACTUAL ratios from API
        const ratios = await fetchMonthlyRatios(displayYear, displayMonth);
        daysGrid.innerHTML = '';

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            daysGrid.appendChild(createDayNode(prevMonthDays - i, 'other', null));
        }

        // Current month days (戳戳樂 Grid with REAL DATA)
        for (let i = 1; i <= daysInMonth; i++) {
            let state = 'normal';
            if (isMatch(i, displayMonth, displayYear, currentDate)) state = 'selected';
            else if (isMatch(i, displayMonth, displayYear, today)) state = 'today';

            const ratio = ratios[i] !== undefined ? ratios[i] : null;
            const day = createDayNode(i, state, ratio);

            day.addEventListener('click', e => {
                e.stopPropagation();
                const selected = new Date(displayYear, displayMonth, i);
                const formatted = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
                if (input && label) {
                    input.value = formatted;
                    label.textContent = formatted;
                }
                currentDate = selected;
                input?.dispatchEvent(new Event('change', { bubbles: true }));
                popover.classList.add('hidden');
                renderCalendar();
            });
            daysGrid.appendChild(day);
        }
    }

    // ═══ Event Listeners ═══
    trigger.addEventListener('click', e => {
        e.stopPropagation();
        popover.classList.toggle('hidden');
        if (!popover.classList.contains('hidden')) {
            renderCalendar();
            const rect = popover.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                popover.style.left = 'auto';
                popover.style.right = '0';
            }
            if (rect.left < 0) {
                popover.style.left = '0';
                popover.style.right = 'auto';
            }
        }
    });

    const navPrev = popover.querySelector('.nav-prev');
    if (navPrev) {
        navPrev.addEventListener('click', e => {
            e.stopPropagation();
            displayMonth--;
            if (displayMonth < 0) {
                displayMonth = 11;
                displayYear--;
            }
            renderCalendar();
        });
    }

    const navNext = popover.querySelector('.nav-next');
    if (navNext) {
        navNext.addEventListener('click', e => {
            e.stopPropagation();
            displayMonth++;
            if (displayMonth > 11) {
                displayMonth = 0;
                displayYear++;
            }
            renderCalendar();
        });
    }

    const todayBtn = popover.querySelector('.today-btn');
    if (todayBtn) {
        todayBtn.addEventListener('click', e => {
            e.stopPropagation();
            const now = new Date();
            const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (input && label) {
                input.value = formatted;
                label.textContent = formatted;
            }
            currentDate = now;
            displayMonth = now.getMonth();
            displayYear = now.getFullYear();
            input?.dispatchEvent(new Event('change', { bubbles: true }));
            renderCalendar();
            setTimeout(() => popover.classList.add('hidden'), 150);
        });
    }

    document.addEventListener('click', e => {
        if (!wrapper.contains(e.target as Node)) popover.classList.add('hidden');
    });

    renderCalendar();
}

// Since Astro islands might run this multiple times or we need to attach it to the window or listen to events
// Actually, it's simpler to just run it on DOMContentLoaded or astro:page-load.
document.addEventListener('astro:page-load', () => {
    document.querySelectorAll('.cyber-calendar-wrapper').forEach(wrapper => {
        const id = wrapper.id.replace('-wrapper', '');
        const input = document.getElementById(id) as HTMLInputElement;
        if (input && !wrapper.hasAttribute('data-initialized')) {
            wrapper.setAttribute('data-initialized', 'true');
            initCyberCalendar(id, input.value);
        }
    });
});
