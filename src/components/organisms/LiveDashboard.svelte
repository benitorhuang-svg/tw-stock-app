<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    // Sub-components would usually be here, but for this massive migration we'll keep everything in the module pattern
    // to map TWStock styling directly.
    import LiveControlPanel from './svelte/LiveControlPanel.svelte';
    import LiveFilterPanel from './svelte/LiveFilterPanel.svelte';
    import LiveDataTable from './svelte/LiveDataTable.svelte';
</script>
