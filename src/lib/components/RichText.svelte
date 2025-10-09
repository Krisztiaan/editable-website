<script>
  import { getContext } from 'svelte';
  let { content = $bindable(''), multiLine = false } = $props();
  const editing = getContext('editing');
</script>

{#if editing().on}
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
