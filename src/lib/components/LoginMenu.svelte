<script>
  import { goto } from '$app/navigation';
  import PrimaryButton from './PrimaryButton.svelte';
  import { getContext } from 'svelte';
  const user = getContext('user');
</script>

<div>
  <div class="py-4 text-center">Signed in as {user().name}</div>
  <div class="flex flex-col">
    <PrimaryButton onclick={() => goto('/logout')}>Sign out</PrimaryButton>
  </div>
</div>
