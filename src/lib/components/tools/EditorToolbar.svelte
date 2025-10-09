<script>
  import { isEditing } from '$lib/stores.js';
  let { cancel, save } = $props();
</script>

{#if $isEditing}
  {#await import('$lib/components/tools/EditorControls.svelte') then EditorToolbar}
    <EditorToolbar.default {cancel} {save} />
  {/await}
{/if}
