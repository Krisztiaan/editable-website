<script>
  import Limiter from '$lib/components/Limiter.svelte';
  import Renderer from '$lib/builder/Renderer.svelte';

  let { data } = $props();

  const isBuilderDoc = $derived(data.page?.doc?.kind === 'builder-doc');
</script>

<svelte:head>
  <title>{data.pageId}</title>
</svelte:head>

<Limiter>
  {#if isBuilderDoc}
    <Renderer node={data.page.doc.root} />
  {:else}
    <div class="py-12">
      <h1 class="text-2xl font-bold pb-2">Unsupported page format</h1>
      <p class="text-gray-600 pb-6">
        This route currently renders only builder pages (stored as a builder doc).
      </p>
      <pre class="text-xs whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded p-4">{JSON.stringify(
          data.page,
          null,
          2
        )}</pre>
    </div>
  {/if}
</Limiter>

