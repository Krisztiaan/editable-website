<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { classNames } from '$lib/util';

  // Only relevant for mobile
  let { position = 'bottom', close, children } = $props();
  let surface;
  onMount(async () => {
    window.document.children[0].style = 'overflow: hidden;';
  });
  onDestroy(() => {
    if (browser) {
      window.document.children[0].style = '';
    }
  });
  function onMouseUp(e) {
    if (e.target === surface) close?.();
  }
</script>

<div class="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

  <div class="fixed inset-0 z-50 overflow-y-auto" onmouseup={onMouseUp} role="presentation">
    <div
      bind:this={surface}
      class={classNames(
        'flex min-h-full justify-center p-4 text-center sm:items-center sm:p-0',
        position === 'bottom' ? 'items-end' : 'items-start'
      )}
    >
      <div
        class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl sm:my-8 w-full sm:max-w-lg"
      >
        {@render children?.()}
      </div>
    </div>
  </div>
</div>
