<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import PrimaryButton from './PrimaryButton.svelte';
  import SecondaryButton from './SecondaryButton.svelte';
  import { getContext } from 'svelte';
  const user = getContext('user');
</script>

<div>
  <div class="py-4 text-center">Signed in as {user().name}</div>
  <div class="flex flex-col space-y-2">
    <SecondaryButton onclick={() => goto(resolve('/builder/[pageId]', { pageId: 'builder' }))}>Builder</SecondaryButton>
    <SecondaryButton onclick={() => goto(resolve('/admin/pages'))}>Admin</SecondaryButton>
    <PrimaryButton onclick={() => goto(resolve('/logout'))}>Sign out</PrimaryButton>
  </div>
</div>
