<script>
  import { classNames } from '$lib/util';
  import Modal from './Modal.svelte';
  import NotEditable from './NotEditable.svelte';
  import Search from './Search.svelte';
  import { getContext } from 'svelte';

  // TODO: Replace with a globally managed context menu implementation (only one active)
  let { showUserMenu = $bindable(false), showSearch = $bindable(false) } = $props();

  const user = getContext('user');
  const editing = getContext('editing');

  function onKeyDown(e) {
    // Close modals
    if (e.key === 'Escape') {
      showSearch = false;
      showUserMenu = false;
    }
    // Trigger the search panel
    if (e.key === 'k' && e.metaKey) {
      showSearch = true;
    }
    // Turn on editing (only if authenticated)
    if (e.key === 'e' && e.metaKey && user()) {
      editing().on = true;
      console.log('Editing enabled');
    }
  }
</script>

{#if showSearch}
  <Modal position="top" close={() => (showSearch = false)}>
    <Search bind:showSearch />
  </Modal>
{/if}

<div
  class={classNames(
    'backdrop-blur-sm bg-white bg-opacity-95 transition-colors duration-500 z-10 text-sm',
    !editing().on ? 'sticky top-0' : ''
  )}
>
  <div class="max-w-xs mx-auto py-4">
    <NotEditable>
      <div class="flex items-center relative">
        <div class="flex-1"></div>
        <button
          title="Search"
          class={classNames('mr-6 hover:text-black')}
          onclick={() => (showSearch = true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </button>
        <a class="mr-4 font-medium px-2 py-1 rounded-md hover:text-black" href="/"> About </a>
        <a class="mr-4 font-medium px-2 py-1 rounded-md hover:text-black" href="/blog"> Blog </a>
        <a class="mr-4 font-medium px-2 py-1 rounded-md hover:text-black" href="/#contact">
          Contact
        </a>
        <div class="flex-1"></div>
        {#if user()}
          <button
            onclick={() => (showUserMenu = !showUserMenu)}
            class="ml-0 hover:text-black"
            title={user().name}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>
          </button>
        {/if}
        <div class="flex-1"></div>
      </div>
    </NotEditable>
  </div>
</div>

<svelte:window on:keydown={onKeyDown} />
