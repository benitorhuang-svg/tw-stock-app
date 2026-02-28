<script lang="ts">
    /**
     * CyberSelect.svelte - Atom for Cyberpunk themed select dropdowns
     */
    interface Option {
        value: string;
        label: string;
    }

    interface Props {
        value?: string;
        options?: Option[];
        placeholder?: string;
        class?: string;
    }

    let {
        value = $bindable(''),
        options = [],
        placeholder = 'Select...',
        class: className = '',
    }: Props = $props();
</script>

<div class="relative flex items-center min-w-0 flex-1">
    <select
        bind:value
        class={`w-full appearance-none h-7 px-2 text-center bg-transparent text-[9px] font-bold tracking-tighter text-text-muted cursor-pointer outline-none hover:text-accent transition-all uppercase ${className}`}
    >
        {#if placeholder}
            <option value="">{placeholder}</option>
        {/if}
        {#each options as opt}
            <option value={opt.value}>{opt.label}</option>
        {/each}
    </select>
    <!-- Custom dropdown icon indicator could go here if needed -->
</div>
