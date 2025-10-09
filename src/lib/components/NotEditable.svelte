<script>
  import { classNames } from '$lib/util';
  import { isEditing } from '$lib/stores.js';
  let { children } = $props();
  const overlayClass = $derived($isEditing ? 'opacity-25 cursor-not-allowed relative' : '');
</script>

<div class={classNames(overlayClass)}>
  {#if $isEditing}
    <div class="absolute inset-0 z-50" aria-hidden="true"></div>
  {/if}
  {@render children?.()}
</div>
