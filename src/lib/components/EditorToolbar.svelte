<script>
  let { currentUser, cancel, save } = $props();
</script>

{#await import('$lib/components/EditorControls.svelte') then EditorToolbar}
  <EditorToolbar.default {currentUser} {cancel} {save} />
{/await}
