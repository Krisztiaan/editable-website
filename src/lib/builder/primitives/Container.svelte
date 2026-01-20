<script>
  let { children, maxWidth = 'md', padding = 'md' } = $props();

  const maxWidthClass = $derived.by(() => {
    if (maxWidth === 'sm') return 'max-w-screen-sm';
    if (maxWidth === 'lg') return 'max-w-screen-lg';
    if (maxWidth === 'xl') return 'max-w-screen-xl';
    if (maxWidth === 'full') return 'max-w-none';
    return 'max-w-screen-md';
  });

  const paddingClass = $derived.by(() => {
    if (padding === 'sm') return 'px-4';
    if (padding === 'lg') return 'px-8';
    return 'px-6';
  });
</script>

<div class={`${maxWidthClass} mx-auto ${paddingClass}`}>
  {@render children?.()}
</div>
