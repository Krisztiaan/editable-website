<script>
  let { children, gap = 'md', wrap = true, justify = 'start', align = 'center' } = $props();

  const gapClass = $derived.by(() => {
    if (gap === 'sm') return 'gap-3';
    if (gap === 'lg') return 'gap-10';
    return 'gap-6';
  });

  const justifyClass = $derived.by(() => {
    if (justify === 'center') return 'justify-center';
    if (justify === 'end') return 'justify-end';
    if (justify === 'between') return 'justify-between';
    if (justify === 'around') return 'justify-around';
    if (justify === 'evenly') return 'justify-evenly';
    return 'justify-start';
  });

  const alignClass = $derived.by(() => {
    if (align === 'start') return 'items-start';
    if (align === 'end') return 'items-end';
    if (align === 'stretch') return 'items-stretch';
    return 'items-center';
  });
</script>

<div class={`flex flex-row ${wrap ? 'flex-wrap' : ''} ${gapClass} ${justifyClass} ${alignClass}`}>
  {@render children?.()}
</div>
