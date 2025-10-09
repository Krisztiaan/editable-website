<script>
  import { isEditing } from '$lib/stores.js';
  let { content = $bindable(''), multiLine = false } = $props();
</script>

{#if $isEditing}
  {#await import('./PlainTextEditor.svelte')}
    {@html content}
  {:then PlainTextEditor}
    <PlainTextEditor.default {multiLine} bind:content />
  {/await}
{:else}
  {@html content}
{/if}
