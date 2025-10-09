<script>
  import WebsiteNav from '$lib/components/WebsiteNav.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import EditorToolbar from '$lib/components/tools/EditorToolbar.svelte';

  let { showUserMenu = false, cancel, save, children } = $props();
</script>

<EditorToolbar {cancel} {save} />
<WebsiteNav bind:showUserMenu />
{#if showUserMenu}
  <Modal close={() => (showUserMenu = false)}>
    <div class="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {@render children?.()}
    </div>
  </Modal>
{/if}
