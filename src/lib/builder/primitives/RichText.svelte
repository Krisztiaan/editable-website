<script>
  import RichText from '$lib/components/RichText.svelte';
  let { html = $bindable(''), align = 'left' } = $props();

  const alignClass = $derived.by(() => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  });
</script>

<div class={`prose md:prose-xl ${alignClass}`}>
  <RichText multiLine bind:content={html} />
</div>
