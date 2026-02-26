<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let id: string;
    export let label: string;
    export let options: { value: string; label: string }[] = [];
    export let value: string = '';
    export let width = 'min-w-[50px]';

    function handleChange(e: Event) {
        dispatch('change', value);
    }
</script>

<select
    {id}
    bind:value
    on:change={handleChange}
    class="appearance-none h-7 px-2 bg-transparent text-[10px] font-black tracking-tighter text-text-primary/60 cursor-pointer outline-none hover:text-accent transition-all uppercase {width}"
>
    <option value="">{label}</option>
    {#each options as opt}
        <option value={opt.value}>{opt.label}</option>
    {/each}
</select>
