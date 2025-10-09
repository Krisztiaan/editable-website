<script>
  import { classNames } from '$lib/util';
  let { checked = false, size = 'default', children } = $props();
  const className = $derived(classNames(
    'relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600',
    checked ? 'bg-indigo-600' : 'bg-slate-300',
    size === 'default' ? 'h-5 w-10' : 'w-8'
  ));
  const innerClassName = $derived(classNames(
    checked ? (size === 'default' ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0',
    'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
    size === 'default' ? 'h-4 w-4' : 'h-3 w-3'
  ));
  function toggle() {
    checked = !checked;
  }
</script>

<div class="inline-flex items-center">
  <button class={className} onclick={toggle} aria-label="Toggle">
    <div class={innerClassName}></div>
  </button>
  <div class="px-2">{@render children?.()}</div>
</div>
