/**
 * Core engine for CyberCalendar
 * EXTREME OPTIMIZATION: DocumentFragment batching, listener recycling, cached ratios
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
        } catch {}
        return {};
    }

    let currentDate = initialValue ? new Date(initialValue) : new Date();
    let displayMonth = currentDate.getMonth();
    let displayYear = currentDate.getFullYear();

    function createDayNode(content: string | number, type: string, ratio: number | null) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(content);

        let classes =
            'aspect-square flex flex-col items-center justify-center text-[13px] font-mono font-black rounded-xl transition-all duration-300 border-b-4 overflow-hidden relative group/day ';

        if (type === 'other')
            classes +=
                'opacity-[0.02] cursor-default pointer-events-none border-transparent bg-surface-hover ';
        else if (ratio === null) classes += 'bg-[#1e40af]/50 text-blue-200/70 border-[#1e3a5f] ';
        else if (ratio >= 1.0)
            classes +=
                ratio >= 1.2
                    ? 'bg-[#ef4444] text-white border-[#b91c1c] '
                    : 'bg-[#ef4444]/60 text-text-primary border-[#b91c1c]/40 ';
        else
            classes +=
                ratio <= 0.8
                    ? 'bg-[#22c55e] text-white border-[#15803d] '
                    : 'bg-[#22c55e]/60 text-text-primary border-[#15803d]/40 ';

        if (type === 'selected')
            classes += 'ring-4 ring-white shadow-xl z-10 scale-105 -translate-y-1 ';
        else if (type === 'today') classes += 'border-b-[#fbbf24] ';
        if (type !== 'other') classes += 'cursor-pointer hover:scale-110 hover:-translate-y-1 ';

        const gloss = document.createElement('div');
        gloss.className =
            'absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none';
        btn.appendChild(gloss);
        btn.className = classes;
        return btn;
    }

    async function renderCalendar() {
        if (!daysGrid) return;
        monthYearTxt.textContent = `${displayYear} / ${String(displayMonth + 1).padStart(2, '0')}`;

        const firstDay = new Date(displayYear, displayMonth, 1).getDay();
        const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
        const prevMonthDays = new Date(displayYear, displayMonth, 0).getDate();
        const today = new Date();

        const ratios = await fetchMonthlyRatios(displayYear, displayMonth);
        const frag = document.createDocumentFragment();

        for (let i = firstDay - 1; i >= 0; i--)
            frag.appendChild(createDayNode(prevMonthDays - i, 'other', null));

        for (let i = 1; i <= daysInMonth; i++) {
            let state = 'normal';
            if (
                i === currentDate.getDate() &&
                displayMonth === currentDate.getMonth() &&
                displayYear === currentDate.getFullYear()
            )
                state = 'selected';
            else if (
                i === today.getDate() &&
                displayMonth === today.getMonth() &&
                displayYear === today.getFullYear()
            )
                state = 'today';

            const day = createDayNode(i, state, ratios[i] ?? null);
            day.onclick = () => {
                const sel = new Date(displayYear, displayMonth, i);
                const iso = `${sel.getFullYear()}-${String(sel.getMonth() + 1).padStart(2, '0')}-${String(sel.getDate()).padStart(2, '0')}`;
                input.value = iso;
                label.textContent = iso;
                currentDate = sel;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                popover.classList.add('hidden');
                renderCalendar();
            };
            frag.appendChild(day);
        }

        daysGrid.innerHTML = '';
        daysGrid.appendChild(frag);
    }

    trigger.onclick = e => {
        e.stopPropagation();
        popover.classList.toggle('hidden');
        if (!popover.classList.contains('hidden')) renderCalendar();
    };

    popover.querySelectorAll('.nav-prev, .nav-next, .today-btn').forEach(btn => {
        (btn as HTMLElement).onclick = e => {
            e.stopPropagation();
            if (btn.classList.contains('nav-prev')) {
                displayMonth--;
                if (displayMonth < 0) {
                    displayMonth = 11;
                    displayYear--;
                }
            } else if (btn.classList.contains('nav-next')) {
                displayMonth++;
                if (displayMonth > 11) {
                    displayMonth = 0;
                    displayYear++;
                }
            } else {
                const n = new Date();
                displayYear = n.getFullYear();
                displayMonth = n.getMonth();
            }
            renderCalendar();
        };
    });

    document.addEventListener(
        'astro:before-preparation',
        () => {
            popover.classList.add('hidden');
        },
        { once: true }
    );
}

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
