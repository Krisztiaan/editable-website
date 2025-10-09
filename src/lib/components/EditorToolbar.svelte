<script>
  let { cancel, save } = $props();
</script>

{#await import('$lib/components/EditorControls.svelte') then EditorToolbar}
  <EditorToolbar.default {cancel} {save} />
{/await}
