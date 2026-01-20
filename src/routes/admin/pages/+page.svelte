<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Input from '$lib/components/Input.svelte';
  import PrimaryButton from '$lib/components/PrimaryButton.svelte';

  let { data } = $props();

  let newPageId = $state('');

  function openBuilder(e) {
    e.preventDefault();
    const pageId = newPageId.trim();
    if (!pageId) return;
    goto(resolve('/builder/[pageId]', { pageId }));
  }
</script>

<h1 class="text-2xl font-bold pb-4">Pages</h1>

<div class="pb-8">
  <div class="text-sm text-gray-500 pb-2">Create or open page</div>
  <form class="flex items-center gap-2" onsubmit={openBuilder}>
    <Input placeholder="my-new-page" bind:value={newPageId} />
    <PrimaryButton type="submit" disabled={!newPageId.trim()}>Open builder</PrimaryButton>
  </form>
</div>

{#if data.pages.length === 0}
  <p class="text-gray-600">No pages found.</p>
{:else}
  <ul class="space-y-2">
    {#each data.pages as pageId (pageId)}
      <li>
        <a class="underline" href={resolve('/admin/pages/[pageId]', { pageId })}>{pageId}</a>
      </li>
    {/each}
  </ul>
{/if}
