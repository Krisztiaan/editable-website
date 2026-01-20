<script>
  import PrimaryButton from '$lib/components/PrimaryButton.svelte';
  import SecondaryButton from '$lib/components/SecondaryButton.svelte';
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { setPagePointerData } from '../../../page.remote';

  let { data } = $props();

  const pointersByName = $derived.by(() => {
    const obj = {};
    for (const p of data.pointers || []) obj[p.pointer] = p;
    return obj;
  });

  const prodVersionId = $derived(pointersByName.prod?.version_id);
  const previewVersionId = $derived(pointersByName.preview?.version_id);

  const pagePath = $derived(
    data.pageId === 'home' ? '/' : data.pageId === 'imprint' ? '/imprint' : `/pages/${data.pageId}`
  );

  let busy = $state(false);

  async function setPointer(pointer, versionId) {
    busy = true;
    try {
      await setPagePointerData({ pageId: data.pageId, pointer, versionId });
      await invalidateAll();
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex items-end justify-between gap-6 pb-6">
  <div>
    <div class="text-sm text-gray-500">Page</div>
    <h1 class="text-2xl font-bold">{data.pageId}</h1>
  </div>
  <div class="text-sm">
    <a class="underline" href={resolve(pagePath)}>Open page</a>
    {#if data.pageId !== 'home' && data.pageId !== 'imprint'}
      <span class="text-gray-300 px-2">•</span>
      <a class="underline" href={resolve('/builder/[pageId]', { pageId: data.pageId })}>Edit in builder</a>
    {/if}
    <span class="text-gray-500"> (prod requires logged-out view)</span>
  </div>
</div>

<div class="pb-8 space-y-2">
  <div class="text-sm text-gray-500">Pointers</div>
  <div class="text-sm">
    <div><span class="font-semibold">prod</span>: {prodVersionId || '—'}</div>
    <div><span class="font-semibold">preview</span>: {previewVersionId || '—'}</div>
  </div>
</div>

<h2 class="text-xl font-bold pb-4">Versions</h2>

{#if data.versions.length === 0}
  <p class="text-gray-600">No versions found.</p>
{:else}
  <div class="space-y-4">
    {#each data.versions as v (v.version_id)}
      <div class="border border-gray-100 rounded-lg p-4">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div class="font-mono text-xs break-all">{v.version_id}</div>
          <div class="text-sm text-gray-600">{v.created_at}</div>
          <div class="text-sm text-gray-600">{v.created_by}</div>

          {#if v.version_id === prodVersionId}
            <span class="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">prod</span>
          {/if}
          {#if v.version_id === previewVersionId}
            <span class="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">preview</span>
          {/if}

          <div class="flex-1"></div>

          <SecondaryButton
            type="button"
            disabled={busy || v.version_id === previewVersionId}
            onclick={() => setPointer('preview', v.version_id)}
            >Set preview</SecondaryButton
          >
          <div class="w-2"></div>
          <PrimaryButton
            type="button"
            disabled={busy || v.version_id === prodVersionId}
            onclick={() => setPointer('prod', v.version_id)}
            >Set prod</PrimaryButton
          >
        </div>
      </div>
    {/each}
  </div>
{/if}
