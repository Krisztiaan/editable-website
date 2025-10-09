<script>
  import { classNames } from '$lib/util';
  let { noPadding = false, children } = $props();
</script>

<div class={classNames('max-w-lg mx-auto', noPadding ? '' : 'px-4')}>
  {@render children?.()}
  </div>
