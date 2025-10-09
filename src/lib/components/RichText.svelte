<script>
  import { isEditing } from '$lib/stores.js';
  let { content = $bindable(''), multiLine = false } = $props();
</script>

{#if $isEditing}
  {#await import('./RichTextEditor.svelte')}
    {@html content}
  {:then RichTextEditor}
    <RichTextEditor.default {multiLine} bind:content />
  {/await}
{:else}
  <div>
    {@html content}
  </div>
{/if}
