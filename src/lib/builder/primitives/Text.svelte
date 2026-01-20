<script>
  import PlainText from '$lib/components/PlainText.svelte';

  let { text = $bindable(''), tag = 'p', align = 'left' } = $props();

  const alignClass = $derived.by(() => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  });
</script>

{#if tag === 'h1'}
  <h1 class={`text-4xl md:text-6xl font-bold ${alignClass}`}>
    <PlainText bind:content={text} />
  </h1>
{:else if tag === 'h2'}
  <h2 class={`text-2xl md:text-4xl font-bold ${alignClass}`}>
    <PlainText bind:content={text} />
  </h2>
{:else}
  <p class={`text-base md:text-lg ${alignClass}`}>
    <PlainText bind:content={text} />
  </p>
{/if}
