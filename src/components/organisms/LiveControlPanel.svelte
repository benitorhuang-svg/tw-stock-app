<script lang="ts">
    import { onMount } from 'svelte';
    import MarketBreadth from '../molecules/MarketBreadth.svelte';

    let up = 0;
    let down = 0;
    let flat = 0;
    let total = 0;

    onMount(() => {
        const handler = (e: any) => {
            const { type, payload } = e.detail;
            if (type === 'DATA' && payload.data) {
                const data = payload.data;
                let u = 0,
                    d = 0,
                    f = 0;
                for (let i = 0; i < data.length; i++) {
                    const chg = data[i]._change;
                    if (chg > 0) u++;
                    else if (chg < 0) d++;
                    else f++;
                }
                up = u;
                down = d;
                flat = f;
                total = u + d + f;
            }
        };

        window.addEventListener('tw-live-update', handler);
        return () => window.removeEventListener('tw-live-update', handler);
    });
</script>

<div class="flex items-center gap-4 shrink-0 min-w-0">
    <!-- Molecule: Visual Breadth -->
    <div class="shrink-0 min-w-0">
        <MarketBreadth {up} {down} {flat} {total} />
    </div>

    <!-- Atom: Command Trigger -->
    <div class="shrink-0">
        <button
            id="toggle-polling-btn"
            class="h-9 px-6 font-black tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all bg-accent text-white rounded-lg border-none text-[10px] uppercase shadow-[0_4px_15px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_8px_20px_rgba(var(--accent-rgb),0.5)]"
        >
            開始即時監測
        </button>
    </div>
</div>
