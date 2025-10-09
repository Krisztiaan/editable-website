<script>
  import WebsiteNav from '$lib/components/WebsiteNav.svelte';
  import Modal from '$lib/components/Modal.svelte';
  let { showUserMenu = $bindable(false), cancel, save, children, currentUser = null } = $props();
</script>
{#if currentUser}
  {#await import('$lib/components/tools/EditorToolbar.svelte') then EditorToolbar}
    <EditorToolbar.default {cancel} {save} />
  {/await}
{/if}
<WebsiteNav bind:showUserMenu />
{#if showUserMenu}
  <Modal close={() => (showUserMenu = false)}>
    <div class="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {@render children?.()}
    </div>
  </Modal>
{/if}
