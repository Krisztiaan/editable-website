<script>
  import PrimaryButton from '$lib/components/PrimaryButton.svelte';
  import SecondaryButton from '$lib/components/SecondaryButton.svelte';
  import { invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { setPagePointerData, takePageLockData } from '../../../page.remote';

  let { data } = $props();

  const pointersByName = $derived.by(() => {
    const obj = {};
    for (const p of data.pointers || []) obj[p.pointer] = p;
    return obj;
  });

  const prodVersionId = $derived(pointersByName.prod?.version_id);
  const stagingVersionId = $derived(pointersByName.staging?.version_id);
  const previewVersionId = $derived(pointersByName.preview?.version_id);
  const draftPointers = $derived((data.pointers || []).filter((p) => p.pointer?.startsWith('draft:')));
  const draftVersionIds = $derived(draftPointers.map((p) => p.version_id));

  const pagePath = $derived(
    data.pageId === 'home' ? '/' : data.pageId === 'imprint' ? '/imprint' : `/pages/${data.pageId}`
  );
  const pageUrls = $derived.by(() => {
    const base = resolve(pagePath);
    return {
      base,
      prod: base + '?env=prod',
      staging: base + '?env=staging',
      preview: base + '?env=preview'
    };
  });

  let busy = $state(false);

  async function takeLock() {
    busy = true;
    try {
      await takePageLockData(data.pageId);
      await invalidateAll();
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    } finally {
      busy = false;
    }
  }

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
    <a class="underline" href={pageUrls.base}>Open page</a>
    <span class="text-gray-300 px-2">•</span>
    <a class="underline" href={pageUrls.preview}>Preview</a>
    <span class="text-gray-300 px-2">•</span>
    <a class="underline" href={pageUrls.staging}>Staging</a>
    <span class="text-gray-300 px-2">•</span>
    <a class="underline" href={pageUrls.prod}>Prod</a>
    {#if data.pageId !== 'home' && data.pageId !== 'imprint'}
      <span class="text-gray-300 px-2">•</span>
      <a class="underline" href={resolve('/builder/[pageId]', { pageId: data.pageId })}>Edit in builder</a>
    {/if}
    <span class="text-gray-500"> (uses `?env=`)</span>
  </div>
</div>

<div class="pb-8 space-y-2">
  <div class="text-sm text-gray-500">Pointers</div>
  <div class="text-sm">
    <div><span class="font-semibold">prod</span>: {prodVersionId || '—'}</div>
    <div><span class="font-semibold">staging</span>: {stagingVersionId || '—'}</div>
    <div><span class="font-semibold">preview</span>: {previewVersionId || '—'}</div>
    {#if draftPointers.length}
      <div class="pt-2 text-gray-500">draft</div>
      {#each draftPointers as p (p.pointer)}
        <div><span class="font-semibold">{p.pointer}</span>: {p.version_id}</div>
      {/each}
    {/if}
  </div>
  {#if data.lock}
    <div class="flex flex-wrap items-center gap-2">
      <div class="text-xs text-gray-500">
        Lock: {data.lock.locked_by_name} until {data.lock.locked_until}
      </div>
      {#if data.lock.locked_by !== data.currentUser?.sessionId}
        <SecondaryButton size="sm" type="button" disabled={busy} onclick={takeLock}>Take lock</SecondaryButton>
      {/if}
    </div>
  {/if}
  <div class="pt-3 flex flex-wrap items-center gap-2">
    {#if previewVersionId && previewVersionId !== stagingVersionId}
      <SecondaryButton
        type="button"
        disabled={busy}
        onclick={() => setPointer('staging', previewVersionId)}
        >Promote preview → staging</SecondaryButton
      >
    {/if}
    {#if stagingVersionId && stagingVersionId !== prodVersionId}
      <PrimaryButton type="button" disabled={busy} onclick={() => setPointer('prod', stagingVersionId)}
        >Promote staging → prod</PrimaryButton
      >
    {/if}
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
          {#if v.version_id === stagingVersionId}
            <span class="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
              >staging</span
            >
          {/if}
          {#if v.version_id === previewVersionId}
            <span class="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">preview</span>
          {/if}
          {#if draftVersionIds.includes(v.version_id)}
            <span class="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-1 rounded">draft</span>
          {/if}

          <div class="flex-1"></div>

          <SecondaryButton
            type="button"
            disabled={busy || v.version_id === previewVersionId}
            onclick={() => setPointer('preview', v.version_id)}
            >Set preview</SecondaryButton
          >
          <SecondaryButton
            type="button"
            disabled={busy || v.version_id === stagingVersionId}
            onclick={() => setPointer('staging', v.version_id)}
            >Set staging</SecondaryButton
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

<h2 class="text-xl font-bold pt-10 pb-4">History</h2>

{#if (data.events || []).length === 0}
  <p class="text-gray-600">No pointer changes recorded yet.</p>
{:else}
  <div class="space-y-3">
    {#each data.events as e (e.event_id)}
      <div class="border border-gray-100 rounded-lg p-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span class="font-semibold">{e.pointer}</span>
          <span class="text-gray-600">{e.changed_at}</span>
          <span class="text-gray-600">{e.changed_by}</span>
        </div>
        <div class="pt-1 font-mono text-xs break-all text-gray-700">
          {e.from_version_id || '—'} → {e.to_version_id}
        </div>
      </div>
      {/each}
  </div>
{/if}

{#if (data.lockEvents || []).length}
  <h2 class="text-xl font-bold pt-10 pb-4">Locks</h2>
  <div class="space-y-3">
    {#each data.lockEvents as e (e.event_id)}
      <div class="border border-gray-100 rounded-lg p-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span class="font-semibold">takeover</span>
          <span class="text-gray-600">{e.changed_at}</span>
          <span class="text-gray-600">{e.changed_by}</span>
        </div>
        <div class="pt-1 font-mono text-xs break-all text-gray-700">
          {(e.from_locked_by_name || e.from_locked_by || '—') + ' → ' + (e.to_locked_by_name || e.to_locked_by)}
        </div>
      </div>
    {/each}
  </div>
{/if}
