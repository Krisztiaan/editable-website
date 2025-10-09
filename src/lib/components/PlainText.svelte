<script>
  import { getContext } from 'svelte';
  let { content = $bindable(''), multiLine = false } = $props();
  const editing = getContext('editing');
</script>

{#if editing().on}
  {#await import('./PlainTextEditor.svelte')}
    {@html content}
  {:then PlainTextEditor}
    <PlainTextEditor.default {multiLine} bind:content />
  {/await}
{:else}
  {@html content}
{/if}
