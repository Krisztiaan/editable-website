<script>
  let { children, gap = 'md', align = 'stretch' } = $props();

  const gapClass = $derived.by(() => {
    if (gap === 'sm') return 'gap-3';
    if (gap === 'lg') return 'gap-10';
    return 'gap-6';
  });

  const alignClass = $derived.by(() => {
    if (align === 'start') return 'items-start';
    if (align === 'center') return 'items-center';
    if (align === 'end') return 'items-end';
    return 'items-stretch';
  });
</script>

<div class={`flex flex-col ${gapClass} ${alignClass}`}>
  {@render children?.()}
</div>
