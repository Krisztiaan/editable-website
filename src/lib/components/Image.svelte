<script>
  import { isEditing } from '$lib/stores.js';
  let {
    src = $bindable(''),
    alt,
    uploadPrompt = undefined,
    maxWidth,
    maxHeight,
    quality,
    class: className
  } = $props();
  let previewSrc = $state();
</script>

{#if $isEditing}
  {#await import('./ImageEditor.svelte')}
    <img class={className} src={previewSrc || src} {alt} />
  {:then ImageEditor}
    <ImageEditor.default
      class={className}
      bind:src
      bind:previewSrc
      {alt}
      {uploadPrompt}
      {maxWidth}
      {maxHeight}
      {quality}
    />
  {/await}
{:else}
  <img width={maxWidth} height={maxHeight} class={className} {src} {alt} />
{/if}
