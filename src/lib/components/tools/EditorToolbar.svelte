<script>
  import { getContext } from 'svelte';
  let { cancel, save } = $props();
  const editing = getContext('editing');
</script>

{#if editing().on}
  {#await import('$lib/components/tools/EditorControls.svelte') then EditorToolbar}
    <EditorToolbar.default {cancel} {save} />
  {/await}
{/if}
