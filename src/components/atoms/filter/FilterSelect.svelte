<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    interface Props {
        id: string;
        label: string;
        options?: { value: string; label: string }[];
        value?: string;
        width?: string;
    }

    let {
        id,
        label,
        options = [],
        value = $bindable(''),
        width = 'min-w-[50px]'
    }: Props = $props();

    function handleChange(e: Event) {
        dispatch('change', value);
    }
</script>

<select
    {id}
    bind:value
    onchange={handleChange}
    class="appearance-none h-7 px-2 bg-transparent text-[10px] font-black tracking-tighter text-text-primary/60 cursor-pointer outline-none hover:text-accent transition-all uppercase {width}"
>
    <option value="">{label}</option>
    {#each options as opt}
        <option value={opt.value}>{opt.label}</option>
    {/each}
</select>
