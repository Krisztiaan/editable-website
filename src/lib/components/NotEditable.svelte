<script>
  import { classNames } from '$lib/util';
  import { getContext } from 'svelte';
  let { children } = $props();
  const editing = getContext('editing');
  const overlayClass = $derived(editing().on ? 'opacity-25 cursor-not-allowed relative' : '');
</script>

<div class={classNames(overlayClass)}>
  {#if editing().on}
    <div class="absolute inset-0 z-50" aria-hidden="true"></div>
  {/if}
  {@render children?.()}
</div>
