<script lang="ts">
    interface Props {
        id: string;
        placeholder?: string;
        value?: string;
        onInput?: (value: string) => void;
    }

    let { id, placeholder = '搜尋...', value = $bindable(''), onInput }: Props = $props();

    function handleInput(e: Event) {
        onInput?.(value);
    }
</script>

<div class="relative group/search shrink-0">
    <div
        class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted/30 group-focus-within/search:text-accent transition-colors"
    >
        <svg
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
        >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
        </svg>
    </div>
    <input
        type="text"
        {id}
        bind:value
        oninput={handleInput}
        {placeholder}
        class="w-[100px] h-8 pl-9 pr-2 bg-glass border border-border focus:border-accent/30 focus:bg-glass-hover rounded-full text-[10px] font-bold placeholder:text-text-muted/50 transition-all outline-none"
    />
</div>
