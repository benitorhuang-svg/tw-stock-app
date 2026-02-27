<script lang="ts">
    /**
     * CyberDatePicker.svelte - Atomic Date Input with Cyber-Glass UI
     * Part of Atomic Design: Atoms
     */
    interface Props {
        value: string;
        onchange: (date: string) => void;
        size?: string;
    }

    let { value, onchange, size = 'w-16 h-16' }: Props = $props();
    let dateInput: HTMLInputElement;

    function handleTrigger() {
        if (dateInput) {
            try {
                // Modern browsers support showPicker() which reliably opens the native UI
                dateInput.showPicker();
            } catch (e) {
                // Fallback for older browsers
                dateInput.click();
            }
        }
    }

    function handleChange(e: Event) {
        const val = (e.target as HTMLInputElement).value;
        onchange(val);
    }
</script>

<button
    class="relative group/date {size} shrink-0 cursor-pointer block border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl"
    onclick={handleTrigger}
    onkeydown={e => (e.key === 'Enter' || e.key === ' ') && handleTrigger()}
    aria-label="選擇觀測日期"
>
    <!-- Hidden native input -->
    <input
        bind:this={dateInput}
        type="date"
        {value}
        onchange={handleChange}
        class="absolute inset-0 w-full h-full opacity-0 pointer-events-none z-0"
        tabindex="-1"
    />

    <!-- Cyber-Glass Trigger Body -->
    <div
        class="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0a0c10]/80 border border-accent/40 text-accent group-hover/date:border-accent group-hover/date:bg-accent/20 group-hover/date:shadow-[0_0_30px_rgba(var(--accent-rgb),0.4)] transition-all duration-500 overflow-hidden shadow-2xl z-10"
    >
        <!-- High-tech Grid Background Overlay -->
        <div
            class="absolute inset-0 opacity-[0.1] pointer-events-none bg-[linear-gradient(rgba(var(--accent-rgb),0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.2)_1px,transparent_1px)] bg-[size:4px_4px]"
        ></div>

        <!-- Top Trim Glow -->
        <div
            class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent"
        ></div>

        <!-- Grid-style Calendar Icon -->
        <svg
            class="w-1/2 h-1/2 drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.6)] group-hover/date:scale-110 transition-transform duration-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18" />
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <!-- Grid dots/cells -->
            <circle cx="7" cy="13" r="0.8" fill="currentColor" />
            <circle cx="11" cy="13" r="0.8" fill="currentColor" />
            <circle cx="15" cy="13" r="0.8" fill="currentColor" />
            <circle cx="7" cy="17" r="0.8" fill="currentColor" />
            <circle cx="11" cy="17" r="0.8" fill="currentColor" />
            <circle cx="15" cy="17" r="0.8" fill="currentColor" />
        </svg>

        <!-- Icon Only -->
    </div>

    <!-- Decorative Outer Ring -->
    <div
        class="absolute -inset-1 rounded-[22px] border border-accent/0 group-hover/date:border-accent/20 group-hover/date:scale-105 transition-all duration-700 opacity-0 group-hover:opacity-100 pointer-events-none z-0"
    ></div>
</button>

<style>
    /* Ensure the input is not blocking but accessible via JS */
    input[type='date']::-webkit-calendar-picker-indicator {
        position: absolute;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        cursor: pointer;
    }
</style>
