<script>
  import { resolve } from '$app/paths';
  let { data } = $props();
</script>

<h1 class="text-2xl font-bold pb-4">Pages</h1>

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
